CREATE OR REPLACE FUNCTION public.play_minigame(_game text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _price bigint;
  _opts int[];
  _pct int;
  _base bigint;
  _win bigint;
  _p public.profiles%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF _game = 'wheel' THEN
    _price := 30000; _opts := ARRAY[2,4,6,8,10,12,15,18,20,22,25,30];
  ELSIF _game = 'cards' THEN
    _price := 20000; _opts := ARRAY[2,4,6,8,10,12,15,18,20];
  ELSE
    RETURN json_build_object('ok', false, 'error', 'bad_game');
  END IF;

  SELECT * INTO _p FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'no_profile');
  END IF;
  IF _p.banned THEN
    RETURN json_build_object('ok', false, 'error', 'banned');
  END IF;
  IF _p.balance < _price THEN
    RETURN json_build_object('ok', false, 'error', 'insufficient', 'need', _price);
  END IF;

  _base := _p.balance;
  _pct := _opts[1 + floor(random() * array_length(_opts, 1))::int];
  _win := floor(_base * _pct / 100.0)::bigint;

  UPDATE public.profiles
     SET balance = balance - _price,
         withdraw_balance = withdraw_balance + _win,
         updated_at = now()
   WHERE id = _uid;

  INSERT INTO public.transactions (user_id, type, amount, note)
  VALUES (_uid, 'ticket', -_price, CASE WHEN _game = 'wheel' THEN 'Wheel aylantirish' ELSE 'Karta ochish' END);

  IF _win > 0 THEN
    INSERT INTO public.transactions (user_id, type, amount, note)
    VALUES (_uid, 'win', _win, (CASE WHEN _game = 'wheel' THEN 'Wheel yutuq ' ELSE 'Karta yutuq ' END) || _pct || '%');
  END IF;

  RETURN json_build_object('ok', true, 'percent', _pct, 'amount', _win, 'price', _price, 'base', _base);
END;
$$;

REVOKE ALL ON FUNCTION public.play_minigame(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.play_minigame(text) TO authenticated;