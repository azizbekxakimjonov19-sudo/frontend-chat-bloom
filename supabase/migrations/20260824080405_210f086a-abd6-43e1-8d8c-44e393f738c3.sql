-- 1. Mini games: payout = stake + percent of stake
CREATE OR REPLACE FUNCTION public.play_minigame(_game text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _price bigint; _opts int[]; _pct int; _win bigint; _p public.profiles%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RETURN json_build_object('ok', false, 'error', 'unauthorized'); END IF;
  IF _game = 'wheel' THEN
    _price := 30000; _opts := ARRAY[10,12,15,18,20,25,28,30,35,40,45,50];
  ELSIF _game = 'cards' THEN
    _price := 20000; _opts := ARRAY[15,18,20,25,30,35,40,45,50];
  ELSE
    RETURN json_build_object('ok', false, 'error', 'bad_game');
  END IF;

  SELECT * INTO _p FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'no_profile'); END IF;
  IF _p.banned THEN RETURN json_build_object('ok', false, 'error', 'banned'); END IF;
  IF _p.balance < _price THEN RETURN json_build_object('ok', false, 'error', 'insufficient', 'need', _price); END IF;

  _pct := _opts[1 + floor(random() * array_length(_opts, 1))::int];
  _win := _price + floor(_price * _pct / 100.0)::bigint;

  UPDATE public.profiles
     SET balance = balance - _price,
         withdraw_balance = withdraw_balance + _win,
         last_seen_at = now(),
         updated_at = now()
   WHERE id = _uid;

  INSERT INTO public.transactions (user_id, type, amount, note)
  VALUES (_uid, 'ticket', -_price, CASE WHEN _game = 'wheel' THEN 'Omad g''ildiragi aylantirish' ELSE 'Karta ochish' END);
  INSERT INTO public.transactions (user_id, type, amount, note)
  VALUES (_uid, 'win', _win, (CASE WHEN _game = 'wheel' THEN 'G''ildirak yutuq ' ELSE 'Karta yutuq ' END) || _pct || '% (tikilgan pul bilan)');

  RETURN json_build_object('ok', true, 'percent', _pct, 'amount', _win, 'price', _price, 'base', _price);
END;
$function$;

-- 2. Activity tracking + blacklist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inactive_warned_at timestamptz;

CREATE TABLE IF NOT EXISTS public.deleted_accounts (
  telegram_id bigint PRIMARY KEY,
  reason text NOT NULL DEFAULT 'inactive_3_days',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.deleted_accounts TO authenticated;
GRANT ALL ON public.deleted_accounts TO service_role;
ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deleted accounts admin read" ON public.deleted_accounts;
CREATE POLICY "deleted accounts admin read" ON public.deleted_accounts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_last_seen()
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  UPDATE public.profiles SET last_seen_at = now(), inactive_warned_at = NULL
   WHERE id = auth.uid();
$function$;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_account_deleted(_telegram_id bigint)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.deleted_accounts WHERE telegram_id = _telegram_id);
$function$;

CREATE OR REPLACE FUNCTION public.cron_cleanup_inactive()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r RECORD; v_warned int := 0; v_deleted int := 0;
BEGIN
  -- Warn users inactive for 2+ days (once)
  FOR r IN
    SELECT p.id, p.telegram_id FROM public.profiles p
    WHERE p.last_seen_at < now() - interval '2 days'
      AND p.last_seen_at >= now() - interval '3 days'
      AND p.inactive_warned_at IS NULL
      AND NOT public.has_role(p.id, 'admin')
  LOOP
    PERFORM public.enqueue_bot_notification(r.telegram_id,
      '⚠️ <b>Diqqat!</b>' || E'\n\n' ||
      'Siz 2 kundan beri LumoWin ilovasiga kirmadingiz.' || E'\n' ||
      'Yana <b>1 kun</b> kirmasangiz hisobingiz avtomatik o''chiriladi va tiklanmaydi.' || E'\n\n' ||
      'Ilovaga kiring va balansingizni saqlab qoling! 🎰');
    UPDATE public.profiles SET inactive_warned_at = now() WHERE id = r.id;
    v_warned := v_warned + 1;
  END LOOP;

  -- Delete accounts inactive for 3+ days
  FOR r IN
    SELECT p.id, p.telegram_id FROM public.profiles p
    WHERE p.last_seen_at < now() - interval '3 days'
      AND NOT public.has_role(p.id, 'admin')
  LOOP
    INSERT INTO public.deleted_accounts (telegram_id, reason)
      VALUES (r.telegram_id, 'inactive_3_days') ON CONFLICT DO NOTHING;
    DELETE FROM public.tickets WHERE user_id = r.id;
    DELETE FROM public.transactions WHERE user_id = r.id;
    DELETE FROM public.deposit_requests WHERE user_id = r.id;
    DELETE FROM public.withdraw_requests WHERE user_id = r.id;
    DELETE FROM public.audit_log WHERE user_id = r.id;
    DELETE FROM public.bonus_claims WHERE user_id = r.id;
    DELETE FROM public.investments WHERE user_id = r.id;
    DELETE FROM public.user_roles WHERE user_id = r.id;
    DELETE FROM public.referrals WHERE referee_telegram_id = r.telegram_id OR referrer_telegram_id = r.telegram_id;
    DELETE FROM public.bot_users WHERE telegram_id = r.telegram_id;
    DELETE FROM public.profiles WHERE id = r.id;
    v_deleted := v_deleted + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'warned', v_warned, 'deleted', v_deleted);
END $function$;

-- 3. Block deleted accounts from re-registering through the bot
CREATE OR REPLACE FUNCTION public.bot_upsert_user(_telegram_id bigint, _chat_id bigint, _username text, _first_name text, _last_name text, _referrer bigint)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.deleted_accounts WHERE telegram_id = _telegram_id) THEN
    RETURN;
  END IF;
  INSERT INTO public.bot_users (telegram_id, chat_id, username, first_name, last_name, referrer_telegram_id)
  VALUES (_telegram_id, _chat_id, _username, _first_name, _last_name,
    CASE WHEN _referrer IS NOT NULL AND _referrer <> _telegram_id
      AND NOT EXISTS (SELECT 1 FROM public.deleted_accounts d WHERE d.telegram_id = _referrer)
      THEN _referrer ELSE NULL END)
  ON CONFLICT (telegram_id) DO UPDATE SET
    chat_id = EXCLUDED.chat_id,
    username = COALESCE(EXCLUDED.username, public.bot_users.username),
    first_name = COALESCE(EXCLUDED.first_name, public.bot_users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.bot_users.last_name),
    referrer_telegram_id = COALESCE(public.bot_users.referrer_telegram_id, EXCLUDED.referrer_telegram_id),
    updated_at = now();
END $function$;

-- 4. Referral bonus 450, LumoWin wording
CREATE OR REPLACE FUNCTION public.bot_mark_channel_verified(_telegram_id bigint)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
          VALUES (v_bu.referrer_telegram_id, _telegram_id, 450);
        UPDATE public.profiles SET balance=balance+450, updated_at=now() WHERE id=v_ref_profile.id;
        INSERT INTO public.transactions (user_id, type, amount, note)
          VALUES (v_ref_profile.id, 'admin_add', 450, 'Referal bonusi (' || _telegram_id::text || ')');
        SELECT COALESCE(NULLIF(first_name,''), 'Do''st') INTO v_ref_name FROM public.bot_users WHERE telegram_id=_telegram_id;
        PERFORM public.enqueue_bot_notification(
          v_bu.referrer_telegram_id,
          '🎉 <b>Referal bonusi!</b>' || E'\n\n' ||
          '👤 ' || COALESCE(v_ref_name, 'Do''st') || ' kanalga obuna bo''ldi.' || E'\n' ||
          '💰 Sizga <b>+450 so''m</b> qo''shildi.' || E'\n\n' ||
          'Yangi balans: <b>' || (v_ref_profile.balance+450)::text || ' so''m</b>'
        );
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('ok', true);
END $function$;

-- 5. Ads: rolling 24h window, 2 per cycle, 250 so'm
CREATE OR REPLACE FUNCTION public.get_ad_status()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_enabled BOOL; v_amount BIGINT; v_limit INT;
  v_count INT := 0; v_cycle TIMESTAMPTZ; v_next TIMESTAMPTZ;
BEGIN
  SELECT (value #>> '{}')::bool INTO v_enabled FROM app_settings WHERE key='earn_enabled';
  SELECT (value #>> '{}')::bigint INTO v_amount FROM app_settings WHERE key='ad_reward_amount';
  SELECT (value #>> '{}')::int INTO v_limit FROM app_settings WHERE key='ad_reward_daily_limit';
  v_enabled := COALESCE(v_enabled, true);
  v_amount := COALESCE(v_amount, 250);
  v_limit := COALESCE(v_limit, 2);

  IF v_uid IS NOT NULL THEN
    SELECT ad_reward_count, ad_reward_cycle_start INTO v_count, v_cycle FROM profiles WHERE id=v_uid;
    IF v_cycle IS NULL OR v_cycle <= now() - interval '24 hours' THEN
      v_count := 0; v_next := now() + interval '24 hours';
    ELSE
      v_next := v_cycle + interval '24 hours';
    END IF;
  ELSE
    v_next := now() + interval '24 hours';
  END IF;

  RETURN jsonb_build_object('enabled', v_enabled, 'amount', v_amount, 'limit', v_limit,
    'count', COALESCE(v_count,0), 'next_reset_at', v_next);
END $function$;

CREATE OR REPLACE FUNCTION public.claim_ad_reward()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_enabled BOOL; v_amount BIGINT; v_limit INT;
  v_count INT; v_cycle TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Auth required'); END IF;
  SELECT (value #>> '{}')::bool INTO v_enabled FROM app_settings WHERE key='earn_enabled';
  IF NOT COALESCE(v_enabled, true) THEN RETURN jsonb_build_object('ok', false, 'error', 'Bo''lim vaqtincha o''chirilgan'); END IF;
  SELECT (value #>> '{}')::bigint INTO v_amount FROM app_settings WHERE key='ad_reward_amount';
  SELECT (value #>> '{}')::int INTO v_limit FROM app_settings WHERE key='ad_reward_daily_limit';
  v_amount := COALESCE(v_amount, 250);
  v_limit := COALESCE(v_limit, 2);

  SELECT ad_reward_count, ad_reward_cycle_start INTO v_count, v_cycle FROM profiles WHERE id=v_uid FOR UPDATE;
  IF v_cycle IS NULL OR v_cycle <= now() - interval '24 hours' THEN
    v_count := 0; v_cycle := now();
  END IF;
  IF v_count >= v_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Limit tugadi', 'next_reset_at', v_cycle + interval '24 hours');
  END IF;

  UPDATE profiles SET balance = balance + v_amount, ad_reward_count = v_count + 1,
    ad_reward_cycle_start = v_cycle, last_seen_at = now(), updated_at = now() WHERE id = v_uid;
  INSERT INTO transactions (user_id, type, amount, note) VALUES (v_uid, 'admin_add', v_amount, 'Reklama ko''rish mukofoti');
  RETURN jsonb_build_object('ok', true, 'count', v_count + 1, 'limit', v_limit, 'amount', v_amount,
    'next_reset_at', v_cycle + interval '24 hours');
END $function$;

-- 6. Withdraw: min 20 000, 25 hours wording, LumoWin channel
CREATE OR REPLACE FUNCTION public.admin_mark_withdraw_paid(_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_r public.withdraw_requests%ROWTYPE; v_tid bigint; v_q int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RETURN jsonb_build_object('ok',false,'error','Forbidden'); END IF;
  SELECT * INTO v_r FROM public.withdraw_requests WHERE id=_id FOR UPDATE;
  IF v_r.status <> 'approved' THEN RETURN jsonb_build_object('ok',false,'error','Avval tasdiqlang'); END IF;
  IF v_r.paid_at IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','Allaqachon to''langan'); END IF;
  v_q := v_r.queue_number;
  UPDATE public.withdraw_requests SET paid_at=now(), queue_number=NULL WHERE id=_id;
  IF v_q IS NOT NULL THEN
    UPDATE public.withdraw_requests SET queue_number = queue_number - 1
      WHERE queue_number IS NOT NULL AND queue_number > v_q AND paid_at IS NULL;
  END IF;
  SELECT telegram_id INTO v_tid FROM public.profiles WHERE id=v_r.user_id;
  IF v_tid IS NOT NULL THEN
    PERFORM public.enqueue_bot_notification(v_tid,
      '💸 <b>To''lov amalga oshirildi!</b> 🎉' || E'\n\n' ||
      '💵 Summa: <b>' || v_r.amount::text || ' so''m</b>' || E'\n' ||
      '💳 Karta: <code>' || COALESCE(v_r.payment_details,'') || '</code>' || E'\n\n' ||
      '✅ Iltimos kartangizni tekshiring.' || E'\n\n' ||
      '📢 <b>LumoWin rasmiy kanali:</b>' || E'\n' ||
      'https://t.me/LumoWin' || E'\n\n' ||
      'Yutuqingiz haqida qisqacha izoh qoldirsangiz, boshqa foydalanuvchilar ham ilhomlanishadi. Rahmat! 🙏');
  END IF;
  INSERT INTO public.audit_log(user_id,actor,action,details) VALUES (v_r.user_id,'admin','To''landi belgilandi', v_r.amount::text);
  RETURN jsonb_build_object('ok',true);
END $function$;

INSERT INTO public.app_settings(key, value, updated_at) VALUES
  ('ad_reward_amount', to_jsonb(250), now()),
  ('ad_reward_daily_limit', to_jsonb(2), now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();