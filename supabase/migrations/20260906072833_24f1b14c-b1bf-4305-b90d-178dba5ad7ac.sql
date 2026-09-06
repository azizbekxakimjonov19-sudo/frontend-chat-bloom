CREATE OR REPLACE FUNCTION public.admin_set_x2_promo(_enabled boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _now timestamptz := now();
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  INSERT INTO public.app_settings(key, value, updated_at)
  VALUES ('x2_promo', jsonb_build_object('enabled', _enabled, 'started_at', _now, 'ends_at', _now + interval '24 hours'), _now)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = _now;
  RETURN jsonb_build_object('ok', true, 'enabled', _enabled, 'ends_at', _now + interval '24 hours');
END;
$$;