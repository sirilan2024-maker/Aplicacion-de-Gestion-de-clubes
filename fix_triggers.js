const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');

const lines = env.split('\n');
let key = '', url = '', collecting = false;
for(const line of lines) {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.replace('NEXT_PUBLIC_SUPABASE_URL=', '').trim();
  if(line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) { key = line.replace('SUPABASE_SERVICE_ROLE_KEY=', '').trim(); collecting = true; }
  else if(collecting && !line.includes('=') && line.trim() && !line.startsWith('#')) key += line.trim();
  else if(collecting && (line.includes('=') || line.startsWith('#'))) collecting = false;
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const sql = `
    CREATE OR REPLACE FUNCTION public.update_equipos_members_count()
    RETURNS trigger AS $$
    BEGIN
      IF TG_OP = 'INSERT' AND NEW.team_id IS NOT NULL THEN
        UPDATE public.teams SET members = members + 1 WHERE id = NEW.team_id;
      ELSIF TG_OP = 'DELETE' AND OLD.team_id IS NOT NULL THEN
        UPDATE public.teams SET members = members - 1 WHERE id = OLD.team_id;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
          IF OLD.team_id IS NOT NULL THEN
            UPDATE public.teams SET members = members - 1 WHERE id = OLD.team_id;
          END IF;
          IF NEW.team_id IS NOT NULL THEN
            UPDATE public.teams SET members = members + 1 WHERE id = NEW.team_id;
          END IF;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION public.update_equipos_coaches_count()
    RETURNS trigger AS $$
    BEGIN
      IF TG_OP = 'INSERT' AND NEW.team_id IS NOT NULL THEN
        UPDATE public.teams SET coaches = coaches + 1 WHERE id = NEW.team_id;
      ELSIF TG_OP = 'DELETE' AND OLD.team_id IS NOT NULL THEN
        UPDATE public.teams SET coaches = coaches - 1 WHERE id = OLD.team_id;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
          IF OLD.team_id IS NOT NULL THEN
            UPDATE public.teams SET coaches = coaches - 1 WHERE id = OLD.team_id;
          END IF;
          IF NEW.team_id IS NOT NULL THEN
            UPDATE public.teams SET coaches = coaches + 1 WHERE id = NEW.team_id;
          END IF;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  // We can't execute raw SQL easily with standard client unless we use a custom endpoint or the user executes it.
  // Wait, I can try writing this SQL to a file and tell the user to execute it!
}
run();
