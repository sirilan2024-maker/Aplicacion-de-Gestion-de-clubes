BEGIN;
  -- Set auth.uid() to Juan
  SET LOCAL role authenticated;
  SET LOCAL request.jwt.claim.sub TO 'c1184045-f383-49b3-a93e-0248257b0995';
  SET LOCAL request.jwt.claim.role TO 'authenticated';

  -- Try to insert a match_event
  INSERT INTO public.match_events (partido_id, tipo, minuto, jugador_id)
  VALUES ('a6589b9f-764f-495d-bfa4-2316be8907e1', 'gol', 15, NULL)
  RETURNING *;
ROLLBACK;
