-- 1) Reklama limiti: 24 soatda 3 ta
UPDATE app_settings SET value = to_jsonb(3) WHERE key = 'ad_reward_daily_limit';

-- 2) Pul yechish: minimal 15 000, shanba-yakshanba (Toshkent vaqti) bloklash
CREATE OR REPLACE FUNCTION public.request_withdraw(_amount bigint, _method text, _details text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_p public.profiles%ROWTYPE;
  v_dup INT;
  v_new BIGINT;
  v_dow INT;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Auth required'); END IF;
  IF _amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Miqdor noto''g''ri'); END IF;

  v_dow := EXTRACT(ISODOW FROM now() AT TIME ZONE 'Asia/Tashkent');
  IF v_dow IN (6, 7) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dam olish kunlari (shanba-yakshanba) pul yechish vaqtincha ishlamaydi. Dushanbadan urinib ko''ring.');
  END IF;
  IF _amount < 15000 THEN RETURN jsonb_build_object('ok', false, 'error', 'Minimal yechish: 15 000 so''m'); END IF;

  SELECT * INTO v_p FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Profile topilmadi'); END IF;
  IF v_p.banned THEN RETURN jsonb_build_object('ok', false, 'error', 'Hisobingiz bloklangan'); END IF;

  SELECT count(*) INTO v_dup FROM public.withdraw_requests
   WHERE user_id = v_user AND amount = _amount AND status = 'pending'
     AND created_at > now() - interval '30 seconds';
  IF v_dup > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'So''rovingiz allaqachon yuborilgan. Iltimos kuting.');
  END IF;

  UPDATE public.profiles
     SET withdraw_balance = withdraw_balance - _amount, updated_at = now()
   WHERE id = v_user AND withdraw_balance >= _amount
  RETURNING withdraw_balance INTO v_new;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Yechish balansi yetarli emas');
  END IF;

  INSERT INTO public.withdraw_requests (user_id, telegram_id, amount, method, payment_details)
  VALUES (v_user, v_p.telegram_id, _amount, _method, _details);
  INSERT INTO public.transactions (user_id, type, amount, note) VALUES (v_user, 'withdraw', -_amount, 'Yechish so''rovi: ' || _method);
  INSERT INTO public.audit_log (user_id, actor, action, details) VALUES (v_user, 'user', 'Yechish so''rovi', _method || ' — ' || _amount::text);
  RETURN jsonb_build_object('ok', true, 'withdraw_balance', v_new);
END $function$;

-- 3) Yangi xabar matnlari: yechish tasdiqlandi / rad etildi
CREATE OR REPLACE FUNCTION public.admin_resolve_withdraw(_id uuid, _approve boolean, _note text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_user UUID := auth.uid(); v_r public.withdraw_requests%ROWTYPE; v_tid BIGINT;
BEGIN
  IF NOT public.has_role(v_user, 'admin') THEN RETURN jsonb_build_object('ok', false, 'error', 'Forbidden'); END IF;
  SELECT * INTO v_r FROM public.withdraw_requests WHERE id = _id FOR UPDATE;
  IF v_r.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'error', 'Allaqachon hal qilingan'); END IF;
  SELECT telegram_id INTO v_tid FROM public.profiles WHERE id=v_r.user_id;
  IF _approve THEN
    UPDATE public.withdraw_requests SET status='approved', admin_note=_note, resolved_by=v_user, resolved_at=now() WHERE id=_id;
    IF v_tid IS NOT NULL THEN
      PERFORM public.enqueue_bot_notification(v_tid,
        '💳 So''rovingiz tasdiqlandi. Ushbu <b>' || v_r.amount::text || ' so''m</b> to''lovingiz hozir o''tkazish jarayonida.' || E'\n' ||
        '💰 Mablag'' tez orada hisobingizga tushadi.');
    END IF;
  ELSE
    UPDATE public.profiles SET withdraw_balance = withdraw_balance + v_r.amount, updated_at = now() WHERE id = v_r.user_id;
    INSERT INTO public.transactions (user_id, type, amount, note) VALUES (v_r.user_id, 'refund', v_r.amount, 'Yechish rad etildi, qaytarildi');
    UPDATE public.withdraw_requests SET status='rejected', admin_note=_note, resolved_by=v_user, resolved_at=now() WHERE id=_id;
    IF v_tid IS NOT NULL THEN
      PERFORM public.enqueue_bot_notification(v_tid,
        '❌ Sizning so''rovingiz rad etildi.' || E'\n' ||
        'Sabab: ' || COALESCE(NULLIF(_note,''), 'ko''rsatilmagan'));
    END IF;
  END IF;
  INSERT INTO public.audit_log (user_id, actor, action, details) VALUES (v_r.user_id, 'admin', CASE WHEN _approve THEN 'Yechish tasdiqlandi' ELSE 'Yechish rad etildi' END, COALESCE(_note,''));
  RETURN jsonb_build_object('ok', true);
END $function$;

-- 4) To'landi xabari
CREATE OR REPLACE FUNCTION public.admin_mark_withdraw_paid(_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
      '🎉 To''lovingiz amalga oshirildi! ✅' || E'\n\n' ||
      '💰 Mablag'' hisobingizga muvaffaqiyatli o''tkazildi.' || E'\n\n' ||
      '📢 @LumoWin rasmiy kanalimizga obuna bo''ling va kommentariyada «To''landi» deb yozib qoldiring. Bu LumoWin''ga bo''lgan ishonchni oshiradi va sizga kelajakda bonuslar taqdim etishimizga yordam beradi. 🎁');
  END IF;
  INSERT INTO public.audit_log(user_id,actor,action,details) VALUES (v_r.user_id,'admin','To''landi belgilandi', v_r.amount::text);
  RETURN jsonb_build_object('ok',true);
END $function$;

-- 5) Deposit tasdiqlandi / rad etildi xabarlari
CREATE OR REPLACE FUNCTION public.admin_resolve_deposit(_id uuid, _approve boolean, _note text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_user UUID := auth.uid(); v_r public.deposit_requests%ROWTYPE; v_tid BIGINT;
BEGIN
  IF NOT public.has_role(v_user, 'admin') THEN RETURN jsonb_build_object('ok', false, 'error', 'Forbidden'); END IF;
  SELECT * INTO v_r FROM public.deposit_requests WHERE id = _id FOR UPDATE;
  IF v_r.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'error', 'Allaqachon hal qilingan'); END IF;
  SELECT telegram_id INTO v_tid FROM public.profiles WHERE id=v_r.user_id;
  IF _approve THEN
    UPDATE public.profiles SET balance = balance + v_r.amount, updated_at = now() WHERE id = v_r.user_id;
    INSERT INTO public.transactions (user_id, type, amount, note) VALUES (v_r.user_id, 'deposit', v_r.amount, 'Deposit tasdiqlandi: ' || v_r.method);
    UPDATE public.deposit_requests SET status='approved', admin_note=_note, resolved_by=v_user, resolved_at=now() WHERE id=_id;
    IF v_tid IS NOT NULL THEN
      PERFORM public.enqueue_bot_notification(v_tid,
        '📥 Hisobingizni to''ldirganingiz uchun raxmat. Bizni tanlab adashmadingiz! Kuningiz hayrli o''tsin. 🤍');
    END IF;
  ELSE
    UPDATE public.deposit_requests SET status='rejected', admin_note=_note, resolved_by=v_user, resolved_at=now() WHERE id=_id;
    IF v_tid IS NOT NULL THEN
      PERFORM public.enqueue_bot_notification(v_tid,
        '❌ Sizning so''rovingiz rad etildi.' || E'\n' ||
        'Sabab: ' || COALESCE(NULLIF(_note,''), 'ko''rsatilmagan'));
    END IF;
  END IF;
  INSERT INTO public.audit_log (user_id, actor, action, details) VALUES (v_r.user_id, 'admin', CASE WHEN _approve THEN 'Deposit tasdiqlandi' ELSE 'Deposit rad etildi' END, COALESCE(_note,''));
  RETURN jsonb_build_object('ok', true);
END $function$;

-- 6) Admin balans qo'shganda xabar
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user_id uuid, _delta bigint, _note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_user UUID := auth.uid(); v_tid BIGINT; v_new BIGINT;
BEGIN
  IF NOT public.has_role(v_user, 'admin') THEN RETURN jsonb_build_object('ok', false, 'error', 'Forbidden'); END IF;
  UPDATE public.profiles SET balance = GREATEST(0, balance + _delta), updated_at = now() WHERE id = _user_id
    RETURNING telegram_id, balance INTO v_tid, v_new;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Foydalanuvchi topilmadi'); END IF;
  INSERT INTO public.transactions (user_id, type, amount, note)
    VALUES (_user_id, (CASE WHEN _delta>0 THEN 'admin_add' ELSE 'admin_sub' END)::tx_type, _delta, _note);
  INSERT INTO public.audit_log (user_id, actor, action, details)
    VALUES (_user_id, 'admin', CASE WHEN _delta>0 THEN 'Balans qo''shildi' ELSE 'Balansdan ayirildi' END, _delta::text || ' — ' || _note);
  IF v_tid IS NOT NULL THEN
    IF _delta > 0 THEN
      PERFORM public.enqueue_bot_notification(v_tid,
        '📥 Hisobingizni to''ldirganingiz uchun raxmat. Bizni tanlab adashmadingiz! Kuningiz hayrli o''tsin. 🤍');
    ELSE
      PERFORM public.enqueue_bot_notification(v_tid,
        '➖ <b>Balansingizdan pul ayirildi</b>' || E'\n\n' ||
        'O''zgarish: <b>' || _delta::text || ' so''m</b>' || E'\n' ||
        'Yangi balans: <b>' || v_new::text || ' so''m</b>' ||
        COALESCE(E'\n📝 ' || _note, ''));
    END IF;
  END IF;
  RETURN jsonb_build_object('ok', true);
END $function$;

-- 7) Konvertatsiya: yechish balansi -> o'yin balansi (24 soatdan keyin)
CREATE TABLE public.conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  execute_at timestamptz NOT NULL,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.conversions TO authenticated;
GRANT ALL ON public.conversions TO service_role;
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own conversions" ON public.conversions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.request_conversion()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_user UUID := auth.uid(); v_p public.profiles%ROWTYPE; v_pending INT;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Auth required'); END IF;
  SELECT count(*) INTO v_pending FROM public.conversions WHERE user_id = v_user AND status = 'pending';
  IF v_pending > 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Faol konvertatsiya allaqachon mavjud. Tugashini kuting.'); END IF;
  SELECT * INTO v_p FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Profile topilmadi'); END IF;
  IF v_p.banned THEN RETURN jsonb_build_object('ok', false, 'error', 'Hisobingiz bloklangan'); END IF;
  IF v_p.withdraw_balance <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Yechish balansida mablag'' yo''q'); END IF;
  UPDATE public.profiles SET withdraw_balance = 0, updated_at = now() WHERE id = v_user;
  INSERT INTO public.conversions (user_id, amount, execute_at) VALUES (v_user, v_p.withdraw_balance, now() + interval '24 hours');
  INSERT INTO public.transactions (user_id, type, amount, note) VALUES (v_user, 'withdraw', -v_p.withdraw_balance, 'Konvertatsiya boshlandi (24 soat)');
  INSERT INTO public.audit_log (user_id, actor, action, details) VALUES (v_user, 'user', 'Konvertatsiya so''rovi', v_p.withdraw_balance::text);
  RETURN jsonb_build_object('ok', true, 'amount', v_p.withdraw_balance, 'execute_at', now() + interval '24 hours');
END $function$;

CREATE OR REPLACE FUNCTION public.get_conversion_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_user UUID := auth.uid(); v_c public.conversions%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Auth required'); END IF;
  SELECT * INTO v_c FROM public.conversions WHERE user_id = v_user AND status = 'pending' ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', true, 'pending', false); END IF;
  RETURN jsonb_build_object('ok', true, 'pending', true, 'amount', v_c.amount, 'execute_at', v_c.execute_at);
END $function$;

CREATE OR REPLACE FUNCTION public.process_conversions()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_c RECORD; v_tid BIGINT; v_n INT := 0;
BEGIN
  FOR v_c IN SELECT * FROM public.conversions WHERE status = 'pending' AND execute_at <= now() FOR UPDATE SKIP LOCKED LOOP
    UPDATE public.profiles SET balance = balance + v_c.amount, updated_at = now() WHERE id = v_c.user_id;
    UPDATE public.conversions SET status = 'done', done_at = now() WHERE id = v_c.id;
    INSERT INTO public.transactions (user_id, type, amount, note) VALUES (v_c.user_id, 'admin_add', v_c.amount, 'Konvertatsiya yakunlandi');
    SELECT telegram_id INTO v_tid FROM public.profiles WHERE id = v_c.user_id;
    IF v_tid IS NOT NULL THEN
      PERFORM public.enqueue_bot_notification(v_tid,
        '🔄 Konvertatsiya yakunlandi! <b>' || v_c.amount::text || ' so''m</b> o''yin balansingizga o''tkazildi. 🎮');
    END IF;
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $function$;

-- 8) Har daqiqada: bot xabarlari navbatini yuborish + konvertatsiyalarni bajarish
CREATE OR REPLACE FUNCTION public.cron_tick()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.process_conversions();
  PERFORM net.http_post(
    url := 'https://frontend-chat-bloom.lovable.app/api/public/cron/notify',
    headers := jsonb_build_object('apikey', 'sb_publishable_ExRtnj4MNirZYU2kzZYbGA__SfYL6_w', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
END $function$;

SELECT cron.schedule('notify-and-convert-tick', '* * * * *', $$SELECT public.cron_tick();$$);