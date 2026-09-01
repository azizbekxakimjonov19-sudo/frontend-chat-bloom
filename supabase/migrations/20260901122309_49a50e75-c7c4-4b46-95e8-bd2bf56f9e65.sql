CREATE OR REPLACE FUNCTION public.last_activity_at(_user_id uuid, _telegram_id bigint)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT GREATEST(
    (SELECT p.last_seen_at FROM public.profiles p WHERE p.id = _user_id),
    COALESCE((SELECT max(t.created_at) FROM public.transactions t WHERE t.user_id = _user_id), 'epoch'::timestamptz),
    COALESCE((SELECT max(t.created_at) FROM public.tickets t WHERE t.user_id = _user_id), 'epoch'::timestamptz),
    COALESCE((SELECT max(d.created_at) FROM public.deposit_requests d WHERE d.user_id = _user_id), 'epoch'::timestamptz),
    COALESCE((SELECT max(w.created_at) FROM public.withdraw_requests w WHERE w.user_id = _user_id), 'epoch'::timestamptz),
    COALESCE((SELECT max(c.created_at) FROM public.conversions c WHERE c.user_id = _user_id), 'epoch'::timestamptz),
    COALESCE((SELECT b.updated_at FROM public.bot_users b WHERE b.telegram_id = _telegram_id), 'epoch'::timestamptz),
    COALESCE((SELECT p.ad_reward_cycle_start FROM public.profiles p WHERE p.id = _user_id), 'epoch'::timestamptz)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.last_activity_at(uuid, bigint) FROM anon, authenticated;