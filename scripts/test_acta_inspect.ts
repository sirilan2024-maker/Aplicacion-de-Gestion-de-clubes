import { fetchMatchdayResults, fetchMatchDetails } from '../src/lib/ffcv/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('--- 1. Checking Cadete B (Group 29509514, J1) matches in DB ---');
  const { data: dbMatches } = await supabase
    .from('ffcv_matches')
    .select('*')
    .eq('ffcv_group_id', '29509514')
    .eq('matchday', 1);

  console.log('DB Matches count for J1:', dbMatches?.length);
  for (const m of dbMatches || []) {
    console.log(`Match: ${m.home_team_name} (${m.home_score}) vs ${m.away_team_name} (${m.away_score}) | ffcv_match_id: ${m.ffcv_match_id} | codacta: ${m.codacta}`);
  }

  console.log('\n--- 2. Direct API call to FFCV for Group 29509514, J1 ---');
  const res = await fetchMatchdayResults({
    seasonId: '21',
    competitionId: '29509507',
    groupId: '29509514',
    matchday: 1
  });

  const saladarMatch = res.partidos?.find(p => p.local?.includes('Saladar') || p.visitante?.includes('Saladar'));
  console.log('Raw Saladar Match from FFCV API:', saladarMatch);

  if (saladarMatch) {
    const cod = saladarMatch.codacta;
    console.log('\n--- 3. Testing fetchMatchDetails (ficha_partido_ajax.php) with matchId:', cod);
    try {
      const details = await fetchMatchDetails({ matchId: String(cod) });
      console.log('fetchMatchDetails result top keys:', Object.keys(details || {}));
      console.log('details:', JSON.stringify(details, null, 2));
    } catch (err: any) {
      console.error('fetchMatchDetails error:', err.message);
    }
  }
}

test().catch(console.error);
