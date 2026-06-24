"use server";

import { createClient } from "@supabase/supabase-js";

export async function submitTrainingFeedback(eventId: string, playerId: string, rpe: number, minutes: number) {
  // Use Service Role to bypass RLS since this is a public form
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Get the club_id for the team this event belongs to
    const { data: eventData, error: evError } = await supabase
      .from('team_events')
      .select('team_id')
      .eq('id', eventId)
      .single();

    if (evError || !eventData) throw new Error("Evento no encontrado");

    const { data: teamData } = await supabase
      .from('teams')
      .select('club_id')
      .eq('id', eventData.team_id)
      .single();
      
    if (!teamData) throw new Error("Equipo no encontrado");

    // 2. Find the Metric IDs for RPE and Minutos de Sesión
    // First, try exact matches
    let { data: metrics } = await supabase
      .from('club_metrics')
      .select('id, name')
      .eq('club_id', teamData.club_id)
      .in('name', ['RPE', 'Minutos de Sesión']);

    let rpeMetricId = metrics?.find(m => m.name === 'RPE')?.id;
    let minMetricId = metrics?.find(m => m.name === 'Minutos de Sesión')?.id;

    // If RPE not found, try to search for it, or create it
    if (!rpeMetricId) {
      const { data: rpeSearch } = await supabase.from('club_metrics').select('id').eq('club_id', teamData.club_id).ilike('name', '%RPE%').limit(1).maybeSingle();
      if (rpeSearch) {
        rpeMetricId = rpeSearch.id;
      } else {
        const { data: newRpe } = await supabase.from('club_metrics').insert({
          club_id: teamData.club_id, name: 'RPE', category: 'Carga Interna', module_type: 'rendimiento', type: 'number', unit: '1-10'
        }).select('id').single();
        if (newRpe) rpeMetricId = newRpe.id;
      }
    }

    // If Minutos not found, try to search for it, or create it
    if (!minMetricId) {
      const { data: minSearch } = await supabase.from('club_metrics').select('id').eq('club_id', teamData.club_id).ilike('name', '%Minutos%').limit(1).maybeSingle();
      if (minSearch) {
        minMetricId = minSearch.id;
      } else {
        const { data: newMin } = await supabase.from('club_metrics').insert({
          club_id: teamData.club_id, name: 'Minutos de Sesión', category: 'Carga Externa', module_type: 'rendimiento', type: 'number', unit: 'min'
        }).select('id').single();
        if (newMin) minMetricId = newMin.id;
      }
    }

    if (!rpeMetricId || !minMetricId) {
      throw new Error("No se pudieron crear las métricas base automáticamente.");
    }

    // 3. Upsert RPE
    const { data: existingRpe } = await supabase
      .from('player_training_metrics')
      .select('id')
      .eq('event_id', eventId)
      .eq('player_id', playerId)
      .eq('metric_id', rpeMetricId)
      .maybeSingle();

    if (existingRpe) {
      await supabase.from('player_training_metrics').update({ value_number: rpe }).eq('id', existingRpe.id);
    } else {
      await supabase.from('player_training_metrics').insert({
        event_id: eventId,
        player_id: playerId,
        metric_id: rpeMetricId,
        value_number: rpe
      });
    }

    // 4. Upsert Minutes
    const { data: existingMin } = await supabase
      .from('player_training_metrics')
      .select('id')
      .eq('event_id', eventId)
      .eq('player_id', playerId)
      .eq('metric_id', minMetricId)
      .maybeSingle();

    if (existingMin) {
      await supabase.from('player_training_metrics').update({ value_number: minutes }).eq('id', existingMin.id);
    } else {
      await supabase.from('player_training_metrics').insert({
        event_id: eventId,
        player_id: playerId,
        metric_id: minMetricId,
        value_number: minutes
      });
    }

    // 5. Mark as Presente in attendance
    const { data: existingAtt } = await supabase
      .from('attendance')
      .select('id')
      .eq('event_id', eventId)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingAtt) {
      await supabase.from('attendance').update({ status: 'Presente' }).eq('id', existingAtt.id);
    } else {
      await supabase.from('attendance').insert({
        team_id: eventData.team_id,
        event_id: eventId,
        player_id: playerId,
        date: new Date().toISOString().split('T')[0],
        status: 'Presente'
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error submitting feedback:", error);
    return { success: false, error: error.message };
  }
}
