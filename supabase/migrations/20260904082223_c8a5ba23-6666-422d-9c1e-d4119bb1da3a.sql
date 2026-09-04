
UPDATE app_settings SET value = to_jsonb(4), updated_at = now() WHERE key = 'ad_reward_daily_limit';

CREATE OR REPLACE FUNCTION public.bot_mark_channel_verified(_telegram_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bu public.bot_users%ROWTYPE;
  v_ref_profile public.profiles%ROWTYPE;
  v_ref_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.deleted_accounts WHERE telegram_id = _telegram_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'deleted');
  END IF;
  SELECT * INTO v_bu FROM public.bot_users WHERE telegram_id=_telegram_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not found'); END IF;

  UPDATE public.bot_users SET channel_verified=true, state='ready', updated_at=now() WHERE telegram_id=_telegram_id;

  IF v_bu.referrer_telegram_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.referrals WHERE referee_telegram_id=_telegram_id) THEN
      SELECT * INTO v_ref_profile FROM public.profiles WHERE telegram_id=v_bu.referrer_telegram_id;
      IF FOUND THEN
        INSERT INTO public.referrals (referrer_telegram_id, referee_telegram_id, amount)
          VALUES (v_bu.referrer_telegram_id, _telegram_id, 555);
        UPDATE public.profiles SET balance=balance+555, updated_at=now() WHERE id=v_ref_profile.id;
        INSERT INTO public.transactions (user_id, type, amount, note)
          VALUES (v_ref_profile.id, 'admin_add', 555, 'Referal bonusi (' || _telegram_id::text || ')');
        SELECT COALESCE(NULLIF(first_name,''), 'Do''st') INTO v_ref_name FROM public.bot_users WHERE telegram_id=_telegram_id;
        PERFORM public.enqueue_bot_notification(
          v_bu.referrer_telegram_id,
          '🎉 <b>Referal bonusi!</b>' || E'\n\n' ||
          '👤 ' || COALESCE(v_ref_name, 'Do''st') || ' kanalga obuna bo''ldi.' || E'\n' ||
          '💰 Sizga <b>+555 so''m</b> qo''shildi.' || E'\n\n' ||
          'Yangi balans: <b>' || (v_ref_profile.balance+555)::text || ' so''m</b>'
        );
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('ok', true);
END $function$;

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  reward BIGINT NOT NULL CHECK (reward > 0),
  max_uses INT NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promo_id, user_id)
);

GRANT SELECT ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
GRANT SELECT ON public.promo_redemptions TO authenticated;
GRANT ALL ON public.promo_redemptions TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read promo codes" ON public.promo_codes;
CREATE POLICY "admins read promo codes" ON public.promo_codes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "own redemptions" ON public.promo_redemptions;
CREATE POLICY "own redemptions" ON public.promo_redemptions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.redeem_promo_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_p public.promo_codes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Avtorizatsiya kerak'); END IF;
  _code := upper(btrim(COALESCE(_code, '')));
  IF _code = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'Promokodni kiriting'); END IF;

  SELECT * INTO v_p FROM promo_codes WHERE upper(code) = _code FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Bunday promokod topilmadi'); END IF;
  IF NOT v_p.active THEN RETURN jsonb_build_object('ok', false, 'error', 'Promokod faol emas'); END IF;
  IF v_p.expires_at IS NOT NULL AND v_p.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Promokod muddati o''tgan');
  END IF;
  IF v_p.used_count >= v_p.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Promokod ishlatilgan yoki muddati o''tgan');
  END IF;
  IF EXISTS (SELECT 1 FROM promo_redemptions WHERE promo_id = v_p.id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Siz bu promokoddan allaqachon foydalangansiz');
  END IF;

  INSERT INTO promo_redemptions (promo_id, user_id, amount) VALUES (v_p.id, v_uid, v_p.reward);
  UPDATE promo_codes SET used_count = used_count + 1 WHERE id = v_p.id;
  UPDATE profiles SET balance = balance + v_p.reward, last_seen_at = now(), updated_at = now() WHERE id = v_uid;
  INSERT INTO transactions (user_id, type, amount, note)
    VALUES (v_uid, 'admin_add', v_p.reward, 'Promokod: ' || v_p.code);

  RETURN jsonb_build_object('ok', true, 'amount', v_p.reward, 'code', v_p.code);
END $function$;

CREATE OR REPLACE FUNCTION public.admin_create_promo_code(_code text, _reward bigint, _max_uses int, _hours int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_code TEXT; v_exp TIMESTAMPTZ;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN jsonb_build_object('ok', false, 'error', 'Forbidden'); END IF;
  v_code := upper(btrim(COALESCE(_code, '')));
  IF v_code = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'Kod bo''sh'); END IF;
  IF COALESCE(_reward,0) <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Mukofot noto''g''ri'); END IF;
  IF COALESCE(_max_uses,0) <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Limit noto''g''ri'); END IF;
  IF EXISTS (SELECT 1 FROM promo_codes WHERE upper(code) = v_code) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bunday kod mavjud');
  END IF;
  IF COALESCE(_hours, 0) > 0 THEN v_exp := now() + (_hours || ' hours')::interval; END IF;
  INSERT INTO promo_codes (code, reward, max_uses, expires_at) VALUES (v_code, _reward, _max_uses, v_exp);
  INSERT INTO audit_log(actor, action, details) VALUES ('admin', 'Promokod yaratildi', v_code);
  RETURN jsonb_build_object('ok', true);
END $function$;

CREATE OR REPLACE FUNCTION public.admin_set_promo_active(_id uuid, _active boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN jsonb_build_object('ok', false, 'error', 'Forbidden'); END IF;
  UPDATE promo_codes SET active = _active WHERE id = _id;
  RETURN jsonb_build_object('ok', true);
END $function$;

CREATE OR REPLACE FUNCTION public.admin_delete_promo_code(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN jsonb_build_object('ok', false, 'error', 'Forbidden'); END IF;
  DELETE FROM promo_codes WHERE id = _id;
  RETURN jsonb_build_object('ok', true);
END $function$;
