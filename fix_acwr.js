const fs = require('fs');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace fetchPlayerACWR
  const oldACWR = \  const fetchPlayerACWR = async () => {
    const supabase = createClient();
    try {
      // For global profile, fetch all matches across all teams
      const { data: convocatoriasData } = await supabase
        .from('convocatorias')
        .select('*, partidos:partido_id(*)')
        .eq('player_id', playerId);

      // Fetch all attendance for global profile
      const { data: attData } = await supabase
        .from('attendance')
        .select('event_id, status, events:event_id(date, title, event_type, start_time)')
        .eq('player_id', playerId);

      // Arrays for History
      const tHistory: any[] = [];
      const mHistory: any[] = [];

      if (attData) {
        attData.forEach((a: any) => {
          if (a.events && a.events.event_type === 'Entrenamiento') {
            tHistory.push({ ...a.events, id: a.event_id, attendance: a.status });
          }
        });
        tHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      if (convocatoriasData) {
        convocatoriasData.forEach(c => {
          if (c.partidos) {
            mHistory.push({
              id: c.partido_id,
              date: c.partidos.fecha_hora,
              title: \\\s \\\ (\\\)\\\,
              attendance: c.estado_asistencia,
              minutes: c.minutes_played,
              goles: c.goals,
              asistencias: c.assists,
              coach_rating: c.coach_rating,
              actitud: c.actitud,
              amarillas: c.yellow_cards,
              rojas: c.red_cards
            });
          }
        });
        mHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      setTrainingHistory(tHistory);
      setMatchHistory(mHistory);

    } catch (err) {
      console.error("Error fetching ACWR/Stats:", err);
    }
  };\;

  const newACWR = \  const fetchPlayerACWR = async () => {
    const supabase = createClient();
    try {
      const { data: pData } = await supabase.from('players').select('team_id').eq('id', playerId).single();
      const teamId = pData?.team_id;

      // Partidos y Convocatorias
      const { data: convocatoriasData } = await supabase
        .from('convocatorias')
        .select('*, partidos:partido_id(*)')
        .eq('player_id', playerId);

      let teamMatches = [];
      if (teamId) {
        const { data: tm } = await supabase.from('partidos').select('*').eq('equipo_id', teamId);
        if (tm) teamMatches = tm;
      }

      const mHistory = [];
      const processedMatches = new Set();
      
      if (convocatoriasData) {
        convocatoriasData.forEach(c => {
          if (c.partidos) {
            mHistory.push({
              id: c.partido_id,
              date: c.partidos.fecha_hora,
              title: \\\s \\\ (\\\)\\\,
              attendance: c.estado_asistencia || 'Pendiente',
              minutes: c.minutes_played || 0,
              goles: c.goals || 0,
              asistencias: c.assists || 0,
              coach_rating: c.coach_rating || 0,
              actitud: c.actitud || 0,
              amarillas: c.yellow_cards || 0,
              rojas: c.red_cards || 0
            });
            processedMatches.add(c.partido_id);
          }
        });
      }

      teamMatches.forEach(m => {
        if (!processedMatches.has(m.id)) {
          mHistory.push({
            id: m.id,
            date: m.fecha_hora,
            title: \\\s \\\ (\\\)\\\,
            attendance: 'No convocado',
            minutes: 0,
            goles: 0,
            asistencias: 0,
            coach_rating: 0,
            actitud: 0,
            amarillas: 0,
            rojas: 0
          });
          processedMatches.add(m.id);
        }
      });
      mHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Entrenamientos y Asistencia
      const { data: attData } = await supabase
        .from('attendance')
        .select('*, events:event_id(*)')
        .eq('player_id', playerId);

      let teamEvents = [];
      if (teamId) {
        const { data: te } = await supabase.from('team_events').select('*').eq('team_id', teamId).eq('event_type', 'Entrenamiento');
        if (te) teamEvents = te;
      }

      const tHistory = [];
      const processedEvents = new Set();

      if (attData) {
        attData.forEach((a) => {
          if (a.events && a.events.event_type === 'Entrenamiento') {
            tHistory.push({ ...a.events, id: a.event_id, attendance: a.status });
            processedEvents.add(a.event_id);
          }
        });
      }

      teamEvents.forEach(e => {
        if (!processedEvents.has(e.id)) {
          tHistory.push({ ...e, id: e.id, attendance: 'Pendiente' });
          processedEvents.add(e.id);
        }
      });
      tHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTrainingHistory(tHistory);
      setMatchHistory(mHistory);

    } catch (err) {
      console.error("Error fetching ACWR/Stats:", err);
    }
  };\;

  // Replace fetchPlayerAttendance
  const oldAttendance = \  const fetchPlayerAttendance = async () => {
    setAttendanceLoading(true);
    const supabase = createClient();
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch attendance records specifically for this player
      const { data: atts } = await supabase
        .from('attendance')
        .select('*, events:event_id(*)')
        .eq('player_id', playerId);
        
      setPlayerAttendance(atts || []);

      if (atts) {
        const events = atts.map(a => a.events).filter(e => e);
        setPlayerEvents(events);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAttendanceLoading(false);
    }
  };\;

  const newAttendance = \  const fetchPlayerAttendance = async () => {
    setAttendanceLoading(true);
    const supabase = createClient();
    try {
      const { data: pData } = await supabase.from('players').select('team_id').eq('id', playerId).single();
      const teamId = pData?.team_id;

      let allEvents = [];
      if (teamId) {
        const { data: tEvents } = await supabase.from('team_events').select('*').eq('team_id', teamId);
        if (tEvents) allEvents = [...tEvents];
      }

      const { data: atts } = await supabase
        .from('attendance')
        .select('*, events:event_id(*)')
        .eq('player_id', playerId);
        
      setPlayerAttendance(atts || []);

      if (atts) {
        atts.forEach(a => {
          if (a.events && !allEvents.find(e => e.id === a.event_id)) {
            allEvents.push(a.events);
          }
        });
      }
      
      // Sort events
      allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPlayerEvents(allEvents);

    } catch (err) {
      console.error(err);
    } finally {
      setAttendanceLoading(false);
    }
  };\;

  if (content.includes('fetchPlayerACWR = async () => {')) {
    // Regex replace to handle slight formatting differences if necessary
    // But since it's exact, we'll try string replace first
    let updated = content.replace(oldACWR, newACWR);
    if (updated === content) {
       console.log('Failed to replace oldACWR in ' + filePath);
       // Try a more relaxed approach or regex
    }
    updated = updated.replace(oldAttendance, newAttendance);
    if (updated === content) {
       console.log('Failed to replace oldAttendance in ' + filePath);
    }
    fs.writeFileSync(filePath, updated);
  } else {
    console.log('fetchPlayerACWR not found in ' + filePath);
  }
}

const file1 = 'src/app/dashboard/club/jugador/[id]/page.tsx';
const file2 = 'src/app/dashboard/equipos/[teamId]/jugador/[playerId]/page.tsx';

try { processFile(file1); console.log('Processed file 1'); } catch (e) { console.error('Error file 1', e); }
try { processFile(file2); console.log('Processed file 2'); } catch (e) { console.error('Error file 2', e); }
