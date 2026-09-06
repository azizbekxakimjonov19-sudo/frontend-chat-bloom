CREATE OR REPLACE FUNCTION public.cron_cleanup_inactive()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r RECORD; v_warned int := 0; v_deleted int := 0;
BEGIN
  FOR r IN
    SELECT p.id, p.telegram_id, public.last_activity_at(p.id, p.telegram_id) AS act
    FROM public.profiles p
    WHERE NOT public.has_role(p.id, 'admin')
      AND p.inactive_warned_at IS NULL
      AND (p.photo_url IS NULL OR p.photo_url NOT LIKE '/photos/%')
  LOOP
    IF r.act < now() - interval '2 days' AND r.act >= now() - interval '3 days' THEN
      PERFORM public.enqueue_bot_notification(r.telegram_id,
        '⚠️ <b>Diqqat!</b>' || E'\n\n' ||
        'Siz 2 kundan beri LumoWin ilovasida hech qanday harakat qilmadingiz.' || E'\n' ||
        'Yana <b>1 kun</b> harakatsiz qolsangiz hisobingiz avtomatik o''chiriladi va tiklanmaydi.' || E'\n\n' ||
        'Ilovaga kiring va balansingizni saqlab qoling! 🍋');
      UPDATE public.profiles SET inactive_warned_at = now() WHERE id = r.id;
      v_warned := v_warned + 1;
    END IF;
  END LOOP;

  FOR r IN
    SELECT p.id, p.telegram_id, public.last_activity_at(p.id, p.telegram_id) AS act
    FROM public.profiles p
    WHERE NOT public.has_role(p.id, 'admin')
      AND (p.photo_url IS NULL OR p.photo_url NOT LIKE '/photos/%')
  LOOP
    CONTINUE WHEN r.act >= now() - interval '3 days';
    IF EXISTS (SELECT 1 FROM public.withdraw_requests w WHERE w.user_id = r.id AND w.status = 'pending')
       OR EXISTS (SELECT 1 FROM public.deposit_requests d WHERE d.user_id = r.id AND d.status = 'pending')
       OR EXISTS (SELECT 1 FROM public.conversions c WHERE c.user_id = r.id AND c.status = 'pending') THEN
      CONTINUE;
    END IF;

    INSERT INTO public.deleted_accounts (telegram_id, reason)
      VALUES (r.telegram_id, 'inactive_3_days') ON CONFLICT DO NOTHING;
    DELETE FROM public.tickets WHERE user_id = r.id;
    DELETE FROM public.transactions WHERE user_id = r.id;
    DELETE FROM public.conversions WHERE user_id = r.id;
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