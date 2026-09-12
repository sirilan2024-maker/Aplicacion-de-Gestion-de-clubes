import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createAdminFeeForPlayerAction } from '@/app/actions/treasury-actions';
import { sendEmail, getPlayerRegistrationEmailHtml } from '@/lib/email-service';
import { getOrCreateStripeCustomer } from '@/lib/payments/stripe-customer-service';
import { ADMIN_ROLES, STAFF_ROLES } from '@/lib/auth-helpers';
import { isAuthorizedE2ETestRequest, getE2EDeliveryEmailRecipient } from '@/lib/e2e-safety';

import Stripe from 'stripe';

function getStripeClient(): Stripe {
  const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_123';
  return new Stripe(stripeKey, {
    apiVersion: '2023-10-16' as any,
  });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // Usamos admin client para ignorar RLS ya que es un endpoint público
    const supabaseAdmin = await createAdminClient();

    // 1. Obtener el club_id base y su configuración bancaria
    const { data: clubData } = await supabaseAdmin.from('clubs').select('id, sepa_iban, name').eq('slug', 'club-sporting-saladar').maybeSingle();
    let clubId = clubData?.id;
    let clubIban = clubData?.sepa_iban || null;
    
    if (!clubId) {
      const { data: fallbackClub } = await supabaseAdmin.from('clubs').select('id, sepa_iban, name').limit(1).maybeSingle();
      clubId = fallbackClub?.id;
      clubIban = fallbackClub?.sepa_iban || null;
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
    let existingProfile: any = null;
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

      // Consultar el perfil actual para proteger roles administrativos y de staff de degradación o modificación accidental
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id, role, rol, roles, first_name, last_name, club_id')
        .eq('id', authUserId)
        .maybeSingle();

      existingProfile = profileData;

      const isStaffOrAdmin = existingProfile && (
        (existingProfile.role && (ADMIN_ROLES.includes(existingProfile.role) || STAFF_ROLES.includes(existingProfile.role))) ||
        (existingProfile.rol && (ADMIN_ROLES.includes(existingProfile.rol) || STAFF_ROLES.includes(existingProfile.rol))) ||
        (Array.isArray(existingProfile.roles) && existingProfile.roles.some((r: string) => ADMIN_ROLES.includes(r) || STAFF_ROLES.includes(r)))
      );

      // Si no es staff ni admin, actualizar datos del perfil de familia/tutor con normalidad
      if (!isStaffOrAdmin) {
        const profileUpdates: any = {
          club_id: clubId || existingProfile?.club_id,
          role: 'familia',
          rol: 'familia',
        };
        if (formData.tutor1Name) profileUpdates.first_name = formData.tutor1Name;
        if (formData.tutor1LastName) profileUpdates.last_name = formData.tutor1LastName;
        if (formData.tutor1Email) profileUpdates.email = formData.tutor1Email;
        if (formData.tutor1Phone) profileUpdates.phone = formData.tutor1Phone;
        
        // Intentar actualizar en profiles
        try {
          await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', authUserId);
        } catch (e) {
          const { phone, ...updatesWithoutPhone } = profileUpdates;
          await supabaseAdmin.from('profiles').update(updatesWithoutPhone).eq('id', authUserId);
        }
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
      was_in_club: formData.wasInClub || false,
      
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
    
    // Validar autorización estricta para modo de prueba E2E (1,00 €) mediante ticket de sesión o cabecera
    const incomingE2ETicket = request.headers.get('x-e2e-ticket') || data.e2eTicket || data.e2e_ticket || null;
    const isE2EAuthorized = await isAuthorizedE2ETestRequest(request, email, existingProfile, incomingE2ETicket, supabaseAdmin);

    // 1. Crear las cuotas contables automáticamente (Omitir si es Senior)
    if (player && !isSenior) {
      try {
        if (isE2EAuthorized) {
          // En modo E2E autorizado: crear exactamente UNA única cuota de prueba de 1,00 € (100 céntimos)
          const currentYear = new Date().getFullYear();
          const e2ePaymentRef = `PAY-${currentYear}-${player.id.substring(0, 8).toUpperCase()}`;
          await supabaseAdmin.from('fees').insert({
            player_id: player.id,
            profile_id: authUserId || null,
            club_id: clubId,
            concept: `Cuota Temporada (E2E Test) – 1.00 €`,
            amount_cents: 100,
            amount_paid_cents: 0,
            currency: 'eur',
            estado: 'pendiente',
            tipo_cargo: 'one_time',
            payment_reference: e2ePaymentRef,
          });
        } else {
          await createAdminFeeForPlayerAction(player.id, formData.wasInClub || false);
        }
      } catch (err) {
        console.error("Error generando cuotas:", err);
      }
    }

    // 2. Localizar la cuota exacta a cobrar y generar referencia única
    let clientSecret = null;
    let stripeIntentId = null;
    let targetFeeId = null;
    const currentYear = new Date().getFullYear();
    const paymentReference = player ? `PAY-${currentYear}-${player.id.substring(0, 8).toUpperCase()}` : `PAY-${currentYear}-${Date.now()}`;

    if (player && !isSenior) {
      const { data: targetFee } = await supabaseAdmin
        .from('fees')
        .select('id, amount_cents, club_id, stripe_payment_intent_id')
        .eq('player_id', player.id)
        .eq('estado', 'pendiente')
        .order('creado_en', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (targetFee) {
        targetFeeId = targetFee.id;

        // Actualizar referencia única de pago en la cuota
        await supabaseAdmin
          .from('fees')
          .update({ payment_reference: paymentReference })
          .eq('id', targetFee.id);

        // 3. Crear Stripe PaymentIntent si eligió Stripe
        if (paymentMethod === 'Stripe') {
          const isFraccionado = paymentPlan === 'Fraccionado';
          const chargeAmount = isE2EAuthorized ? 100 : targetFee.amount_cents;
          let stripeCustomerId: string | undefined = undefined;

          if (!process.env.STRIPE_SECRET_KEY) {
            console.error('[register/route] STRIPE_SECRET_KEY no configurada en el servidor');
            return NextResponse.json({
              error: 'La pasarela de pago seguro Stripe no está disponible en el servidor en este momento. Por favor, contacta con el club.',
            }, { status: 500 });
          }

          const stripe = getStripeClient();
          // Obtener o crear Stripe Customer para el tutor garantizando aislamiento por club
          try {
            const customerEmail = formData.tutor1Email || email;
            const customerName = formData.tutor1Name
              ? `${formData.tutor1Name} ${formData.tutor1LastName || ''}`.trim()
              : `${formData.playerFirstName || ''} ${formData.playerLastName || ''}`.trim();

            const customerRes = await getOrCreateStripeCustomer({
              email: customerEmail,
              name: customerName,
              clubId: targetFee.club_id || clubId,
              profileId: authUserId || undefined,
              phone: formData.tutor1Phone || undefined,
            });
            stripeCustomerId = customerRes.customerId;
          } catch (custErr) {
            console.error('[register/route] Error resolving Stripe customer:', custErr);
          }

          const intentMetadata: Record<string, string> = {
            player_id: player.id,
            fee_id: targetFee.id,
            club_id: targetFee.club_id || clubId,
            customer_id: stripeCustomerId || '',
            payment_reference: paymentReference,
            player: `${formData.playerFirstName || ''} ${formData.playerLastName || ''}`.trim(),
            type: isE2EAuthorized
              ? 'e2e_test_registration'
              : (isFraccionado ? 'inscripcion_fraccionada_1' : 'inscripcion_total'),
          };

          if (isE2EAuthorized) {
            intentMetadata.e2e_test = 'true';
          }

          const deliveryEmailRecipient = isE2EAuthorized
            ? getE2EDeliveryEmailRecipient()
            : (email && !email.includes('@example.invalid') ? email : null);

          const intent = await stripe.paymentIntents.create({
            amount: chargeAmount,
            currency: 'eur',
            customer: stripeCustomerId,
            description: isE2EAuthorized
              ? 'CUOTA INSCRIPCIÓN E2E TEST (1.00 €) - CLUB SPORTING SALADAR'
              : 'CUOTA INSCRIPCIÓN TEMPORADA 26/27 - CLUB SPORTING SALADAR',
            payment_method_types: ['card'],
            setup_future_usage: isFraccionado && !isE2EAuthorized ? 'off_session' : undefined,
            metadata: intentMetadata,
            receipt_email: deliveryEmailRecipient || undefined,
          });
          stripeIntentId = intent.id;
          clientSecret = intent.client_secret;

          if (!clientSecret) {
            return NextResponse.json({
              error: 'Error generando la pasarela de pago seguro en Stripe.',
            }, { status: 500 });
          }

          // Guardar el stripe_payment_intent_id en la cuota
          if (stripeIntentId) {
            await supabaseAdmin
              .from('fees')
              .update({ stripe_payment_intent_id: stripeIntentId })
              .eq('id', targetFee.id);
          }
        }
      }
    }

    // 4. Enviar correo electrónico de confirmación / bienvenida automático con estado económico real
    if (email && player) {
      try {
        // Consultar las cuotas reales generadas para este jugador en la BD
        const { data: dbFees } = await supabaseAdmin
          .from('fees')
          .select('id, concept, amount_cents, amount_paid_cents, estado, fecha_pago, payment_method, payment_reference')
          .eq('player_id', player.id)
          .order('creado_en', { ascending: true });

        const rawFees = dbFees || [];
        const feeItems = rawFees.map((f: any, idx: number) => ({
          id: f.id,
          concept: f.concept,
          amountCents: f.amount_cents || 0,
          amountPaidCents: f.amount_paid_cents || 0,
          status: f.estado || 'pendiente',
          dueDate: f.fecha_pago || null,
          installmentNumber: idx + 1,
          totalInstallments: rawFees.length,
        }));

        const totalAmountCents = feeItems.reduce((acc, f) => acc + f.amountCents, 0);
        const totalPaidCents = feeItems.reduce((acc, f) => acc + f.amountPaidCents, 0);
        const totalPendingCents = Math.max(0, totalAmountCents - totalPaidCents);

        const paymentSummary = {
          totalAmountCents,
          totalPaidCents,
          totalPendingCents,
          paymentMethod: paymentMethod === 'Stripe' ? 'Tarjeta' : (paymentMethod || 'No especificado'),
          paymentPlan: paymentPlan || (feeItems.length > 1 ? 'Fraccionado' : 'Pago Único'),
          fees: feeItems,
          paymentReference: paymentReference,
          clubIban: clubIban || null,
        };

        const emailHtml = getPlayerRegistrationEmailHtml({
          playerName: `${formData.playerFirstName || ''} ${formData.playerLastName || ''}`.trim() || 'Jugador/a',
          tutorName: formData.tutor1Name ? `${formData.tutor1Name} ${formData.tutor1LastName || ''}`.trim() : undefined,
          category: (formData as any).category || undefined,
          dorsal: (formData as any).dorsal || undefined,
          loginUrl: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/login` : 'https://app.clubsportingsaladar.com/login',
          paymentSummary,
        });

        // En modo E2E, si existe E2E_EMAIL_RECIPIENT en el servidor, se envía el correo al destinatario real
        // sin alterar la identidad del usuario en BD ni sus registros. Si es @example.invalid sin destinatario, se omite de forma segura.
        const targetEmail = isE2EAuthorized
          ? getE2EDeliveryEmailRecipient()
          : (!email.includes('@example.invalid') ? email : null);

        if (targetEmail) {
          await sendEmail({
            to: targetEmail,
            subject: `⚽ Inscripción Registrada: ${formData.playerFirstName || ''} ${formData.playerLastName || ''}`.trim() + ' - Sporting Saladar',
            html: emailHtml,
            replyTo: 'csportingsaladar@gmail.com',
          });
        }
      } catch (emailErr) {
        console.error('Error disparando email automático de bienvenida:', emailErr);
      }
    }

    // 5. Revalidar cachés para que Centro de Control, Secretaría y Tesorería se actualicen al instante
    try {
      revalidatePath('/admin/inicio');
      revalidatePath('/admin');
      revalidatePath('/dashboard/inscripciones');
      revalidatePath('/dashboard/treasury');
      revalidatePath('/dashboard/equipos');
    } catch (revalErr) {
      // Ignorar si se ejecuta fuera de contexto estático
    }

    const finalPlayerName = `${formData.playerFirstName || ''} ${formData.playerLastName || ''}`.trim() || `${formData.tutor1Name || ''} ${formData.tutor1LastName || ''}`.trim() || 'Jugador';

    return NextResponse.json({
      success: true,
      playerId: player?.id,
      playerFirstName: formData.playerFirstName || '',
      playerLastName: formData.playerLastName || '',
      playerName: finalPlayerName,
      clubIban: clubIban,
      feeId: targetFeeId,
      clientSecret: clientSecret,
      paymentIntentId: stripeIntentId,
      paymentReference: paymentReference,
      amountFormatted: isE2EAuthorized ? '1,00 €' : undefined,
      message: 'Inscripción guardada y formalizada correctamente.',
    });
  } catch (err: any) {
    console.error('API /register error:', err);
    return NextResponse.json({ error: 'Error interno del servidor: ' + (err.message || 'Desconocido') }, { status: 500 });
  }
}
