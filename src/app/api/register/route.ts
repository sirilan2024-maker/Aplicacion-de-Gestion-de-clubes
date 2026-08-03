import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createAdminFeeForPlayerAction } from '@/app/actions/treasury-actions';

// Inicializar Stripe solo si existe la clave (para evitar fallos si no está configurada)
import Stripe from 'stripe';
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_123';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // Usamos admin client para ignorar RLS ya que es un endpoint público
    const supabaseAdmin = await createAdminClient();

    // 1. Obtener el club_id base
    const { data: clubData } = await supabaseAdmin.from('clubs').select('id').eq('slug', 'club-sporting-saladar').single();
    let clubId = clubData?.id;
    
    if (!clubId) {
      const { data: fallbackClub } = await supabaseAdmin.from('clubs').select('id').limit(1).single();
      clubId = fallbackClub?.id;
    }

    if (!clubId) {
      return NextResponse.json({ error: 'Club no encontrado' }, { status: 400 });
    }

    // 2. Extraer parámetros base
    const { teamId, paymentMethod, paymentPlan, password, confirmPassword, ...formData } = data;

    const email = formData.tutor1Email;
    if (!email) {
      return NextResponse.json({ error: 'El email de contacto es obligatorio' }, { status: 400 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FASE 1: Creación de usuario Auth y vinculación RLS
    // ──────────────────────────────────────────────────────────────────────────
    let authUserId: string | null = null;
    if (password) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: 'tutor',
          rol: 'familia',
          first_name: formData.tutor1Name || formData.playerFirstName || email.split('@')[0],
          last_name: formData.tutor1LastName || formData.playerLastName || "-",
        }
      });

      if (authError) {
        console.error('Error creando usuario Auth:', authError);
        const errorStr = authError.message.toLowerCase();
        if (errorStr.includes('already registered') || errorStr.includes('already been registered') || errorStr.includes('already exists')) {
          return NextResponse.json({ 
            error: 'Este email ya está registrado. Por favor, inicia sesión con tu cuenta y usa la opción "Inscribir a otro jugador" desde el Portal de Familia.' 
          }, { status: 409 });
        }
        return NextResponse.json({ error: 'No se pudo crear la cuenta de usuario. Detalle: ' + authError.message }, { status: 500 });
      }

      authUserId = authData.user?.id ?? null;

      if (authUserId) {
        // Perfil con rol 'familia' para acceder al dashboard familiar
        await supabaseAdmin.from('profiles').upsert({
          id: authUserId,
          email: email,
          role: 'familia',
          club_id: clubId,
          first_name: formData.tutor1Name || formData.playerFirstName || email.split('@')[0],
          last_name: formData.tutor1LastName || formData.playerLastName || "-",
        });
      }
    } else {
      // Obtener el usuario de la sesión actual (flujo interno)
      const supabaseServer = await createClient();
      const { data: authData } = await supabaseServer.auth.getUser();
      authUserId = authData?.user?.id || null;
    }

    // Stripe processing moved to the end of the file so we have the player ID

    // ──────────────────────────────────────────────────────────────────────────
    // FASE 3: Subir documentos al bucket privado expedientes-doc
    // Devuelve ruta relativa para usar createSignedUrl después
    // ──────────────────────────────────────────────────────────────────────────
    const uploadBase64 = async (base64Data: string, label: string): Promise<string | null> => {
      try {
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;
        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
        const folderPath = authUserId ? `${authUserId}/` : 'public/';
        
        const normalizedLabel = label.toLowerCase().replace(/[\s/()]+/g, '_').replace(/_+$/, '');
        const finalName = `${folderPath}${normalizedLabel}_${formData.playerFirstName}_${formData.playerLastName}.${ext}`;
        
        const { error } = await supabaseAdmin.storage.from('expedientes-doc').upload(finalName, buffer, {
          contentType: type,
          upsert: false
        });
        if (error) throw error;
        
        // Devolvemos la ruta relativa — se usará con createSignedUrl en el frontend
        return finalName;
      } catch (e) {
        console.error(`Error uploading ${label}:`, e);
        return null;
      }
    };

    // Subir documentos del formulario
    let dniJugadorUrl: string | null = null;
    let dniTutorUrl: string | null = null;
    let photoCarnetUrl: string | null = null;
    
    // Objeto para guardar las URLs de todos los documentos extra subidos
    const uploadedFileUrls: { type: string; url: string }[] = [];

    // Mantener la lógica antigua de las variables para retrocompatibilidad
    if (formData.dniFileBase64) {
      dniJugadorUrl = await uploadBase64(
        formData.dniFileBase64,
        'DNI_NIE_del_Jugador_Anverso'
      );
    }
    if (formData.dniTutorFileBase64) {
      dniTutorUrl = await uploadBase64(
        formData.dniTutorFileBase64,
        'DNI_NIE_del_Tutor_Anverso'
      );
    }
    if (formData.photoFileBase64) {
      photoCarnetUrl = await uploadBase64(
        formData.photoFileBase64,
        'Foto_Carnet'
      );
    }

    // Subir todos los archivos que vengan en el nuevo formato dinámico
    if (formData.uploadedFiles && Array.isArray(formData.uploadedFiles)) {
      for (const file of formData.uploadedFiles) {
        if (!file.base64 || !file.label) continue;
        
        // Evitar duplicar la foto y el DNI si ya se procesaron por la lógica antigua
        if (file.label === 'DNI_NIE_del_Jugador_Anverso' && dniJugadorUrl) continue;
        if (file.label === 'DNI_NIE_del_Tutor_Anverso' && dniTutorUrl) continue;
        if (file.label === 'Foto_Carnet' && photoCarnetUrl) continue;

        const url = await uploadBase64(
          file.base64,
          file.label
        );
        
        if (url) {
          uploadedFileUrls.push({ type: file.label, url });
        }
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FASE 3 (cont.): Crear/Actualizar registro de Familia
    // El DNI del tutor va a families.tutor_1_dni_url
    // ──────────────────────────────────────────────────────────────────────────
    let familyId: string | null = null;
    if (authUserId) {
      const { data: existingFamily } = await supabaseAdmin
        .from('families')
        .select('id')
        .eq('tutor_1_profile_id', authUserId)
        .single();

      if (existingFamily) {
        familyId = existingFamily.id;
        // Actualizar el DNI del tutor si se subió
        if (dniTutorUrl) {
          await supabaseAdmin
            .from('families')
            .update({ tutor_1_dni_url: dniTutorUrl })
            .eq('id', familyId);
        }
      } else {
        const { data: newFamily } = await supabaseAdmin.from('families').insert({
          tutor_1_profile_id: authUserId,
          tutor_1_dni_url: dniTutorUrl || null,
          tutor_2_name: formData.tutor2Name
            ? `${formData.tutor2Name} ${formData.tutor2LastName || ''}`.trim()
            : null
        }).select('id').single();
        if (newFamily) familyId = newFamily.id;
      }

      // Actualizar el perfil del tutor
      const profileUpdates: any = { club_id: clubId, role: 'familia' };
      if (formData.tutor1Name) profileUpdates.first_name = formData.tutor1Name;
      if (formData.tutor1LastName) profileUpdates.last_name = formData.tutor1LastName;
      if (formData.tutor1Email) profileUpdates.email = formData.tutor1Email;
      
      // Intentar actualizar el teléfono en profiles por si existe la columna
      try {
        await supabaseAdmin.from('profiles').update({ ...profileUpdates, phone: formData.tutor1Phone }).eq('id', authUserId);
      } catch (e) {
        await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', authUserId);
      }

      // IMPORTANTE: Actualizar el DNI y Teléfono del tutor en todos sus jugadores existentes
      if (formData.tutor1Phone || formData.tutor1Dni || formData.tutor1Name || formData.tutor1LastName) {
        const playerUpdates: any = {};
        if (formData.tutor1Phone) playerUpdates.parent1_phone = formData.tutor1Phone;
        if (formData.tutor1Dni) playerUpdates.parent1_dni = formData.tutor1Dni;
        if (formData.tutor1Name) playerUpdates.parent1_name = formData.tutor1Name;
        if (formData.tutor1LastName) playerUpdates.parent1_last_name = formData.tutor1LastName;
        
        await supabaseAdmin.from('players').update(playerUpdates).eq('tutor_id', authUserId);
      }
    }

    const isSenior = formData.isSeniorTeam === true || formData.isSeniorTeam === "true" || formData.isSeniorSelection === "senior";

    // ──────────────────────────────────────────────────────────────────────────
    // FASE 1 (cont.): Inserción directa en players con TODOS los campos
    // tutor_id = auth.uid() para que el RLS funcione desde el minuto 0
    // ──────────────────────────────────────────────────────────────────────────
    const { data: player, error: playerError } = await supabaseAdmin.from('players').insert({
      // Datos personales del jugador
      first_name: formData.playerFirstName || formData.tutor1Name || email.split('@')[0],
      last_name: formData.playerLastName || formData.tutor1LastName || "-",
      birth_date: formData.birthDate || null,
      dni: formData.playerDni || null,
      sip: formData.playerSip || null,
      nationality: formData.nationality || null,
      address: formData.address || null,
      city: formData.city || null,
      postal_code: formData.postalCode || null,
      
      // Identificación del club y equipo
      club_id: clubId,
      team_id: teamId || null,
      is_senior: isSenior,
      
      // Datos del tutor/padre (desnormalizados para acceso rápido)
      parent1_name: formData.tutor1Name || null,
      parent1_last_name: formData.tutor1LastName || null,
      parent1_phone: formData.tutor1Phone || null,
      parent1_email: formData.tutor1Email || null,
      parent1_dni: formData.tutor1Dni || null,
      family_id: familyId,
      
      // ── CLAVE RLS: tutor_id y user_auth_id para que el padre pueda ver a su hijo ──
      tutor_id: authUserId,
      user_auth_id: authUserId,
      
      // Estado de inscripción (Pendiente de revisión documental, pero financieramente formalizado)
      registration_status: 'pending_revision',
      status: 'activo',
      
      // Datos médicos (directamente en players, sin tabla fichas_medicas)
      allergies: formData.medAlergias || null,
      enfermedades: formData.medEnfermedades || null,
      medicacion: formData.medMedicacion || null,
      lesiones: formData.medLesiones || null,
      operaciones: formData.medOperaciones || null,
      medical_info: formData.medRelevante || null,
      observaciones_medicas: formData.medObservaciones || null,
      
      // Datos físicos
      altura: formData.fisicoAltura || null,
      peso: formData.fisicoPeso || null,
      talla_pie: formData.fisicoTallaPie || null,
      
      // Perfil deportivo
      posicion_principal: formData.sportPosicionPrincipal || null,
      posicion_secundaria: formData.sportPosicionSecundaria || null,
      posicion_gustaria: formData.sportPosicionGustaria || null,
      pie_dominante: formData.sportPieDominante || null,
      anos_jugando: formData.sportAnosJugando || null,
      objetivo_temporada: formData.sportObjetivo || null,
      clubes_anteriores: formData.sportClubesAnteriores || null,
      is_foreign: formData.isForeign || false,
      never_federated: formData.neverFederated || false,
      
      // Método y plan de pago (se usarán al formalizar para generar la cuota)
      payment_method: paymentMethod || null,
      payment_plan: paymentPlan || null,
      paid_reservation: formData.paidReservation || false,
      
      // Consentimientos RGPD con firma electrónica (IP + timestamp)
      consent_rgpd_at: formData.consentRgpd ? new Date().toISOString() : null,
      consent_tutela_at: formData.consentTutela ? new Date().toISOString() : null,
      consent_medical_at: formData.consentMedical ? new Date().toISOString() : null,
      consent_image_at: formData.consentImage ? new Date().toISOString() : null,
      consent_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0',
      consent_user_agent: request.headers.get('user-agent') || 'Unknown',
    }).select('id').single();

    if (playerError) {
      console.error('Error insertando player:', playerError);
      return NextResponse.json({ error: playerError.message }, { status: 500 });
    }

    // Enlazar el tutor explícitamente en player_tutors para las relaciones del dashboard familiar
    if (authUserId && player?.id) {
      const { error: tutorError } = await supabaseAdmin.from('player_tutors').insert({
        player_id: player.id,
        tutor_id: authUserId
      });
      if (tutorError) console.error('Error linking player_tutor:', tutorError);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FASE 3 (cont.): Insertar documentos en player_documents vinculados al player_id
    // Solo usamos document_type válidos según el CHECK constraint de la BD
    // ──────────────────────────────────────────────────────────────────────────
    if (player?.id) {
      const documentsToInsert: { player_id: string; document_type: string; file_url: string; status: string }[] = [];

      if (dniJugadorUrl) {
        documentsToInsert.push({
          player_id: player.id,
          document_type: 'pasaporte', // DNI/NIE del jugador
          file_url: dniJugadorUrl,
          status: 'pendiente',
        });
      }
      if (photoCarnetUrl) {
        documentsToInsert.push({
          player_id: player.id,
          document_type: 'foto_carnet',
          file_url: photoCarnetUrl,
          status: 'pendiente',
        });
      }
      
      for (const extraFile of uploadedFileUrls) {
        documentsToInsert.push({
          player_id: player.id,
          document_type: extraFile.type,
          file_url: extraFile.url,
          status: 'pendiente',
        });
      }

      if (documentsToInsert.length > 0) {
        // upsert para evitar duplicados si se re-registra
        await supabaseAdmin.from('player_documents').upsert(documentsToInsert, {
          onConflict: 'player_id,document_type',
          ignoreDuplicates: false,
        });
      }

      // ────────────────────────────────────────────────────────────────────────
      // FASE 2: Insertar tallas de utillería en player_apparel
      // Artículos exactos según el catálogo del club
      // ────────────────────────────────────────────────────────────────────────
      const apparelItems: { item: string; size: string | undefined }[] = [
        // Ropa de competición
        { item: 'Camiseta de Juego', size: formData.sizeCamisetaJuego },
        { item: 'Pantalón de Juego', size: formData.sizePantalonJuego },
        // Ropa de entrenamiento (misma talla que juego, control independiente en Utillería)
        { item: 'Camiseta de Entrenamiento (1/2)', size: formData.sizeCamisetaJuego },
        { item: 'Camiseta de Entrenamiento (2/2)', size: formData.sizeCamisetaJuego },
        { item: 'Pantalón de Entrenamiento (1/2)', size: formData.sizePantalonJuego },
        { item: 'Pantalón de Entrenamiento (2/2)', size: formData.sizePantalonJuego },
        // Resto de equipación
        { item: 'Chándal Oficial', size: formData.sizeChandal },
        { item: 'Sudadera', size: formData.sizeSudadera },
        { item: 'Camiseta de paseo', size: formData.sizeCamisetaPaseo },
        { item: 'Pantalón de paseo', size: formData.sizePantalonPaseo },
        { item: 'Medias', size: formData.sizeMedias },
      ];

      for (const { item, size } of apparelItems) {
        if (size) {
          await supabaseAdmin.from('player_apparel').insert({
            player_id: player.id,
            item_name: item,
            size: size,
            delivered: false,
          });
        }
      }

    }

    // ──────────────────────────────────────────────────────────────────────────
    // FASE 6: Generación de Cuotas y Stripe PaymentIntent
    // ──────────────────────────────────────────────────────────────────────────
    
    // 1. Crear las cuotas contables automáticamente (Omitir si es Senior)
    if (player && !isSenior) {
      try {
        await createAdminFeeForPlayerAction(player.id, formData.wasInClub || false);
      } catch (err) {
        console.error("Error generando cuotas:", err);
      }
    }

    // 2. Crear Stripe PaymentIntent si eligió Stripe (Omitir si es Senior)
    let clientSecret = null;
    let stripeIntentId = null;

    if (paymentMethod === 'Stripe' && player && !isSenior) {
      const isFraccionado = paymentPlan === 'Fraccionado';
      const isRenewal = formData.wasInClub;
      const isReserved = formData.paidReservation;
      
      let baseAmount = isRenewal ? 195 : 250;
      let firstFraction = isFraccionado ? Math.round(baseAmount / 2) : baseAmount;
      if (isReserved) {
        firstFraction = firstFraction - 50;
      }
      
      const chargeAmount = firstFraction * 100;

      if (process.env.STRIPE_SECRET_KEY) {
        const intent = await stripe.paymentIntents.create({
          amount: chargeAmount,
          currency: 'eur',
          setup_future_usage: isFraccionado ? 'off_session' : undefined,
          metadata: {
            player_id: player.id,
            player: `${formData.playerFirstName} ${formData.playerLastName}`,
            type: isFraccionado ? 'inscripcion_fraccionada_1' : 'inscripcion_total',
          },
        });
        stripeIntentId = intent.id;
        clientSecret = intent.client_secret;
      } else {
        stripeIntentId = `pi_mock_${Date.now()}`;
        clientSecret = `${stripeIntentId}_secret_mock`;
      }
    }

    // 3. Revalidar cachés para que Secretaría y Tesorería se actualicen al instante
    revalidatePath('/dashboard/inscripciones');
    revalidatePath('/dashboard/treasury');
    revalidatePath('/dashboard/equipos');

    return NextResponse.json({
      success: true,
      playerId: player?.id,
      clientSecret: clientSecret,
      message: 'Inscripción guardada y formalizada correctamente.',
    });
  } catch (err: any) {
    console.error('API /register error:', err);
    return NextResponse.json({ error: 'Error interno del servidor: ' + (err.message || 'Desconocido') }, { status: 500 });
  }
}
