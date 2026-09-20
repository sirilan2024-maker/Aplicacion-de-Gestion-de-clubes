import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get('pin')?.trim().toUpperCase();

    if (!pin || pin.length < 4) {
      return NextResponse.json({ valid: false, error: 'Código PIN no válido' }, { status: 400 });
    }

    const supabaseAdmin = await createAdminClient();

    const { data: player, error } = await supabaseAdmin
      .from('players')
      .select(`
        id, 
        first_name, 
        last_name, 
        dni, 
        birth_date, 
        phone, 
        email, 
        team_id, 
        is_senior,
        teams(id, name, category)
      `)
      .eq('link_code', pin)
      .maybeSingle();

    if (error || !player) {
      return NextResponse.json({ valid: false, error: 'No se encontró ningún jugador con ese código PIN' }, { status: 404 });
    }

    const team = Array.isArray(player.teams) ? player.teams[0] : player.teams;

    return NextResponse.json({
      valid: true,
      player: {
        id: player.id,
        firstName: player.first_name,
        lastName: player.last_name,
        dni: player.dni || '',
        birthDate: player.birth_date || '',
        phone: player.phone || '',
        email: player.email || '',
        teamId: player.team_id || '',
        teamName: team?.name || '',
        teamCategory: team?.category || '',
        isSenior: Boolean(player.is_senior)
      }
    });
  } catch (err: any) {
    console.error('Error verifying PIN:', err);
    return NextResponse.json({ valid: false, error: err.message }, { status: 500 });
  }
}
