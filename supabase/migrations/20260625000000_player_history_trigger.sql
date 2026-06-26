CREATE OR REPLACE FUNCTION sync_player_season_history()
RETURNS TRIGGER AS $$
DECLARE
  v_active_season_id UUID;
BEGIN
  -- Get the active season for this club
  SELECT id INTO v_active_season_id 
  FROM seasons 
  WHERE club_id = NEW.club_id AND is_active = true 
  LIMIT 1;

  IF v_active_season_id IS NOT NULL THEN
    -- Upsert the player_season_history record for this season
    INSERT INTO player_season_history (player_id, club_id, season_id, team_id, status)
    VALUES (NEW.id, NEW.club_id, v_active_season_id, NEW.team_id, NEW.status)
    ON CONFLICT (player_id, season_id)
    DO UPDATE SET 
      team_id = EXCLUDED.team_id,
      status = EXCLUDED.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_player_season_history ON players;

CREATE TRIGGER trigger_sync_player_season_history
AFTER INSERT OR UPDATE OF team_id, status ON players
FOR EACH ROW
EXECUTE FUNCTION sync_player_season_history();
