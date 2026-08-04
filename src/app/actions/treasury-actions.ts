"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function getFamilyFeesAction(familyId: string) {
  const adminSupabase = await createAdminClient();
  const { data, error } = await adminSupabase
    .from("fees")
    .select("id, concept, amount_cents, amount_paid_cents, estado, creado_en, tipo_cargo, payment_method, receipt_path, fee_payments(id, amount_cents, payment_method, receipt_path, created_at)")
    .eq("profile_id", familyId)
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error fetching family fees via admin:", error);
    throw new Error(error.message);
  }
  
  return data.map(f => ({
    id: f.id,
    concept: f.concept,
    amount_cents: f.amount_cents,
    amount_paid_cents: f.amount_paid_cents || 0,
    currency: 'eur',
    estado: f.estado || 'pending',
    fecha_pago: f.creado_en,
    tipo_cargo: f.tipo_cargo || 'one_time',
    payment_method: f.payment_method,
    receipt_path: f.receipt_path,
    payments: f.fee_payments || []
  }));
}

export async function getPlayerFeesAction(playerId: string) {
  const adminSupabase = await createAdminClient();
  const { data, error } = await adminSupabase
    .from("fees")
    .select("id, concept, amount_cents, amount_paid_cents, estado, creado_en, tipo_cargo, payment_method, receipt_path, fee_payments(id, amount_cents, payment_method, receipt_path, created_at)")
    .eq("player_id", playerId)
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error fetching player fees via admin:", error);
    throw new Error(error.message);
  }
  
  return data.map(f => ({
    id: f.id,
    concept: f.concept,
    amount_cents: f.amount_cents,
    amount_paid_cents: f.amount_paid_cents || 0,
    currency: 'eur',
    estado: f.estado || 'pending',
    fecha_pago: f.creado_en,
    tipo_cargo: f.tipo_cargo || 'one_time',
    payment_method: f.payment_method,
    receipt_path: f.receipt_path,
    payments: f.fee_payments || []
  }));
}

export async function getClubFeesAction() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) throw new Error("Club no encontrado");

  // Include players to get player_name, amount_paid_cents and fee_payments
  const { data, error } = await adminSupabase
    .from("fees")
    .select("id, concept, amount_cents, amount_paid_cents, estado, creado_en, tipo_cargo, payment_method, receipt_path, players(first_name, last_name), fee_payments(id, amount_cents, payment_method, receipt_path, created_at)")
    .eq("club_id", profile.club_id)
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error fetching club fees via admin:", error);
    throw new Error(error.message);
  }
  
  return data.map((f: any) => {
    let paidCents = f.amount_paid_cents || 0;
    // Si la cuota figura como pagada pero amount_paid_cents es 0, asignarle el total de la cuota
    if (f.estado === 'pagado' && paidCents === 0) {
      paidCents = f.amount_cents;
    }

    return {
      id: f.id,
      concept: f.concept,
      amount_cents: f.amount_cents,
      amount_paid_cents: paidCents,
      currency: 'eur',
      estado: f.estado || 'pendiente',
      fecha_pago: f.creado_en,
      tipo_cargo: f.tipo_cargo || 'one_time',
      player_name: f.players ? `${f.players.first_name} ${f.players.last_name}` : "–",
      payment_method: f.payment_method,
      receipt_path: f.receipt_path,
      payments: f.fee_payments || []
    };
  });
}

export async function getClubPlayersAction() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) throw new Error("Club no encontrado");

  const { data, error } = await adminSupabase
    .from("players")
    .select("id, first_name, last_name, team_id")
    .eq("club_id", profile.club_id);

  if (error) {
    console.error("Error fetching players:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function getClubFamiliesAction() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) throw new Error("Club no encontrado");

  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("club_id", profile.club_id)
    .in("role", ["tutor", "familia"]);

  if (error) {
    console.error("Error fetching families:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function createFeeAction(feeData: any) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) throw new Error("Club no encontrado");

  let profile_id = null;
  if (feeData.player_id) {
    const { data: playerInfo } = await adminSupabase
      .from("players")
      .select("tutor_id")
      .eq("id", feeData.player_id)
      .single();
    if (playerInfo?.tutor_id) profile_id = playerInfo.tutor_id;
  } else if (feeData.family_id) {
    profile_id = feeData.family_id;
  }

  const { data, error } = await adminSupabase.from("fees").insert({
    profile_id,
    player_id: feeData.player_id || null,
    concept: feeData.concept,
    amount_cents: feeData.amount_cents,
    amount_paid_cents: feeData.estado === 'pagado' ? feeData.amount_cents : 0,
    estado: feeData.estado || 'pendiente',
    fecha_pago: feeData.estado === 'pagado' ? (feeData.fecha_pago || new Date().toISOString()) : null,
    tipo_cargo: feeData.tipo_cargo || 'one_time',
    club_id: profile.club_id,
    payment_method: feeData.payment_method || null
  }).select().single();

  if (error) throw new Error(error.message);
  
  if (feeData.estado === 'pagado') {
    await generateAndUploadReceiptAction(data.id);
  }
  
  return data;
}

async function generateOfficialReceiptPdfBuffer({
  title = "RECIBO DE PAGO",
  dateStr,
  receiptNo,
  recibiDe,
  amountFormatted,
  concept,
  paymentMethod = "",
  clubLogoUrl = null,
}: {
  title?: string;
  dateStr: string;
  receiptNo: string;
  recibiDe: string;
  amountFormatted: string;
  concept: string;
  paymentMethod?: string;
  clubLogoUrl?: string | null;
}) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([620, 360]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 1. Marco rectangular de contorno negro
  page.drawRectangle({
    x: 10,
    y: 10,
    width: 600,
    height: 340,
    borderWidth: 1.5,
    borderColor: rgb(0, 0, 0),
  });

  // 2. Encabezado principal: "RECIBO DE PAGO" en azul oscuro y negrita
  page.drawText(title, {
    x: 25,
    y: 310,
    size: 22,
    font: boldFont,
    color: rgb(0.18, 0.32, 0.58),
  });

  // Fecha: ..............
  page.drawText("Fecha:", { x: 260, y: 315, size: 11, font });
  page.drawLine({
    start: { x: 300, y: 313 },
    end: { x: 420, y: 313 },
    thickness: 0.8,
    color: rgb(0, 0, 0),
  });
  page.drawText(dateStr, { x: 305, y: 315, size: 11, font: boldFont });

  // Nº: ..............
  page.drawText("Nº:", { x: 450, y: 315, size: 11, font });
  page.drawLine({
    start: { x: 470, y: 313 },
    end: { x: 590, y: 313 },
    thickness: 0.8,
    color: rgb(0, 0, 0),
  });
  page.drawText(receiptNo, { x: 475, y: 315, size: 11, font: boldFont });

  // Cantidad box superior derecha:  Cantidad: [   50,00 €   ]
  page.drawText("Cantidad:", { x: 400, y: 275, size: 11, font });
  page.drawRectangle({
    x: 460,
    y: 265,
    width: 130,
    height: 26,
    borderWidth: 1,
    borderColor: rgb(0, 0, 0),
  });
  page.drawText(amountFormatted, {
    x: 468,
    y: 273,
    size: 12,
    font: boldFont,
  });

  // 3. Líneas del cuerpo con subrayado continuo largo:
  // Linea 1: Recibí de: _____________________________________________
  page.drawText("Recibí de:", { x: 35, y: 260, size: 11, font });
  page.drawLine({
    start: { x: 95, y: 258 },
    end: { x: 385, y: 258 },
    thickness: 0.8,
    color: rgb(0, 0, 0),
  });
  page.drawText(recibiDe, { x: 100, y: 260, size: 11, font: boldFont });

  // Linea 2: Cantidad: _____________________________________________
  page.drawText("Cantidad:", { x: 35, y: 220, size: 11, font });
  page.drawLine({
    start: { x: 95, y: 218 },
    end: { x: 540, y: 218 },
    thickness: 0.8,
    color: rgb(0, 0, 0),
  });
  page.drawText(amountFormatted, { x: 100, y: 220, size: 11, font: boldFont });

  // Linea 3: Concepto: _____________________________________________
  page.drawText("Concepto:", { x: 35, y: 180, size: 11, font });
  page.drawLine({
    start: { x: 95, y: 178 },
    end: { x: 540, y: 178 },
    thickness: 0.8,
    color: rgb(0, 0, 0),
  });
  page.drawText(concept, { x: 100, y: 180, size: 11, font: boldFont });

  // 4. Bloque Inferior Izquierdo:
  // "Recibo generado automaticamente"
  // "después de comprobar el pago en tesorería"
  page.drawText("Recibo generado automaticamente", {
    x: 40,
    y: 130,
    size: 9,
    font: boldFont,
  });
  page.drawText("después de comprobar el pago en tesoreria", {
    x: 25,
    y: 116,
    size: 9,
    font: boldFont,
  });

  // Texto "PAGADO" en grande
  page.drawText("PAGADO", {
    x: 100,
    y: 40,
    size: 32,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  // 5. Bloque Inferior Derecho:
  // Forma de pago [X] Efectivo / [X] Transferencia / [X] Tarjeta
  const m = (paymentMethod || "").toLowerCase();
  const isEf = m.includes("efectivo") || m.includes("contado");
  const isTr = m.includes("transferencia");
  const isTa = m.includes("tarjeta") || m.includes("stripe");

  page.drawText("Forma de pago", { x: 360, y: 145, size: 10, font });
  page.drawText(`[${isEf ? "X" : " "}] Efectivo`, { x: 440, y: 145, size: 10, font });
  page.drawText(`[${isTr ? "X" : " "}] Transferencia`, { x: 440, y: 130, size: 10, font });
  page.drawText(`[${isTa ? "X" : " "}] Tarjeta`, { x: 440, y: 115, size: 10, font });

  // Escudo del Club en la esquina inferior derecha
  if (clubLogoUrl) {
    try {
      const imgRes = await fetch(clubLogoUrl);
      const imgBytes = await imgRes.arrayBuffer();
      let image;
      if (clubLogoUrl.toLowerCase().includes(".png")) {
        image = await pdfDoc.embedPng(imgBytes);
      } else {
        image = await pdfDoc.embedJpg(imgBytes);
      }
      const dims = image.scaleToFit(110, 90);
      page.drawImage(image, {
        x: 480 + (110 - dims.width) / 2,
        y: 20 + (90 - dims.height) / 2,
        width: dims.width,
        height: dims.height,
      });
    } catch (e) {
      console.error("Error cargando escudo en PDF:", e);
    }
  }

  return await pdfDoc.save();
}

export async function generateAndUploadReceiptAction(feeId: string) {
  const adminSupabase = await createAdminClient();
  
  const { data: fee, error: feeError } = await adminSupabase
    .from("fees")
    .select("*, players(first_name, last_name, parent1_name, club_id)")
    .eq("id", feeId)
    .single();

  if (feeError || !fee) throw new Error("Cuota no encontrada");

  // RESTRICCIÓN DE SEGURIDAD CONTABLE: Solo se emite recibo si está pagada o tiene abonos
  const paidCents = fee.amount_paid_cents || 0;
  if (fee.estado !== "pagado" && paidCents === 0) {
    throw new Error("No se puede generar un recibo oficial para una cuota pendiente de pago.");
  }

  const tutorName = fee.players?.parent1_name;
  const playerName = fee.players ? `${fee.players.first_name} ${fee.players.last_name}` : "Desconocido";
  const recibiDe = tutorName ? `${tutorName} (Tutor de ${playerName})` : playerName;

  let clubLogoUrl = null;
  let clubName = "REC";
  if (fee.players?.club_id) {
    const { data: club } = await adminSupabase.from('clubs').select('name, logo_url').eq('id', fee.players.club_id).single();
    if (club) {
      clubLogoUrl = club.logo_url;
      if (club.name) {
        clubName = club.name.replace(/[^a border-zA-Z]/g, '').slice(0, 7).toUpperCase() || "REC";
      }
    }
  }

  // Generar o consultar número correlativo de recibo oficial (formato DDMMAAAA-0001)
  const now = new Date(fee.creado_en || Date.now());
  const dayStr = String(now.getDate()).padStart(2, "0");
  const monthStr = String(now.getMonth() + 1).padStart(2, "0");
  const yearStr = String(now.getFullYear());
  const datePrefix = `${dayStr}${monthStr}${yearStr}`; // ej. 04082026
  const currentYear = now.getFullYear();

  let receiptNumber = "";

  // Check if official receipt record exists
  const { data: existingReceipt } = await adminSupabase
    .from("official_receipts")
    .select("receipt_number")
    .eq("fee_id", feeId)
    .single();

  if (existingReceipt?.receipt_number) {
    receiptNumber = existingReceipt.receipt_number;
  } else {
    // Calculate next sequence number for this club & year
    const { data: lastReceipt } = await adminSupabase
      .from("official_receipts")
      .select("sequence_number")
      .eq("club_id", fee.club_id || fee.players?.club_id)
      .eq("year", currentYear)
      .order("sequence_number", { ascending: false })
      .limit(1)
      .single();

    const nextSeq = (lastReceipt?.sequence_number || 0) + 1;
    const seqStr = String(nextSeq).padStart(4, "0");
    receiptNumber = `${datePrefix}-${seqStr}`;

    // Record in official_receipts table
    await adminSupabase.from("official_receipts").insert({
      club_id: fee.club_id || fee.players?.club_id,
      fee_id: feeId,
      player_id: fee.player_id,
      receipt_number: receiptNumber,
      sequence_number: nextSeq,
      series_prefix: datePrefix,
      year: currentYear,
      amount_cents: fee.estado === "pagado" ? fee.amount_cents : paidCents,
      concept: fee.concept || "Cuota Oficial",
      payment_method: fee.payment_method || "Contado",
      status: "emitido",
    });
  }

  const pdfBytes = await generateOfficialReceiptPdfBuffer({
    title: "RECIBO DE PAGO",
    dateStr: new Date(fee.creado_en || Date.now()).toLocaleDateString("es-ES"),
    receiptNo: receiptNumber,
    recibiDe: recibiDe,
    amountFormatted: `${((fee.estado === "pagado" ? fee.amount_cents : paidCents) / 100).toFixed(2)} €`,
    concept: fee.concept || "Cuota Oficial",
    paymentMethod: fee.payment_method || "Contado",
    clubLogoUrl: clubLogoUrl,
  });

  const folder = fee.profile_id || 'general';
  const path = `${folder}/receipt_${receiptNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  
  const { error: uploadError } = await adminSupabase.storage
    .from('recibos_pagos')
    .upload(path, Buffer.from(pdfBytes), { contentType: 'application/pdf', upsert: true });

  if (uploadError) throw new Error("Error subiendo PDF: " + uploadError.message);

  await adminSupabase
    .from("fees")
    .update({ receipt_path: path })
    .eq("id", feeId);

  await adminSupabase
    .from("official_receipts")
    .update({ pdf_path: path })
    .eq("receipt_number", receiptNumber);

  return { success: true, path, receiptNumber };
}

export async function getReceiptSignedUrlAction(feeId: string) {
  const res = await generateAndUploadReceiptAction(feeId);
  const adminSupabase = await createAdminClient();

  const { data, error } = await adminSupabase.storage
    .from('recibos_pagos')
    .createSignedUrl(res.path, 900, { download: 'Recibo_Pago.pdf' });

  if (error || !data) throw new Error("Error creando signed URL");
  
  return data.signedUrl;
}

export async function sendPaymentNotificationAction(feeId: string, method: 'internal' | 'whatsapp') {
  const adminSupabase = await createAdminClient();
  const { data: fee } = await adminSupabase
    .from("fees")
    .select("*, players(first_name, last_name, tutor_id)")
    .eq("id", feeId)
    .single();

  if (!fee) throw new Error("Cuota no encontrada");

  const amount = (fee.amount_cents / 100).toFixed(2);
  let msg = '';
  let title = '';
  
  if (fee.estado === 'pendiente') {
    msg = `Tienes un recibo pendiente de pago por importe de ${amount}€ en concepto de ${fee.concept}. Por favor, abónalo lo antes posible.`;
    title = "Pago Pendiente";
  } else {
    msg = `Se ha registrado el pago de ${amount}€ en concepto de ${fee.concept}. ¡Gracias!`;
    title = "Pago Confirmado";
  }

  let targetUserId = fee.profile_id;
  if (!targetUserId && fee.players?.tutor_id) {
    targetUserId = fee.players.tutor_id;
    // Fix the fee record while we are at it
    await adminSupabase.from("fees").update({ profile_id: targetUserId }).eq("id", feeId);
  }

  if (method === 'internal') {
    if (targetUserId) {
      await adminSupabase.from("notifications").insert({
        user_id: targetUserId,
        profile_id: targetUserId,
        club_id: fee.club_id,
        type: 'tesoreria',
        title: title,
        content: msg,
        is_read: false,
        link: fee.player_id ? `/dashboard/family/e/${fee.player_id}/perfil` : '/dashboard/treasury',
      });
      return { success: true };
    } else {
      throw new Error("Este jugador no tiene una cuenta de familiar vinculada para recibir notificaciones.");
    }
  } else if (method === 'whatsapp') {
    return { success: true, url: `https://wa.me/?text=${encodeURIComponent(msg)}` };
  }
  return { success: false };
}

export async function sendMemberBalanceNotificationAction(playerId: string, method: 'internal' | 'whatsapp') {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Get player, tutor & fees
  const { data: player } = await adminSupabase
    .from("players")
    .select("id, first_name, last_name, club_id, tutor_id, player_tutors(tutor_id)")
    .eq("id", playerId)
    .single();

  if (!player) throw new Error("Jugador no encontrado");

  // Calculate pending balance
  const { data: fees } = await adminSupabase
    .from("fees")
    .select("amount_cents, amount_paid_cents, estado")
    .eq("player_id", playerId)
    .eq("estado", "pendiente");

  let pendingCents = 0;
  (fees || []).forEach((f: any) => {
    const paid = f.amount_paid_cents || 0;
    pendingCents += Math.max(0, f.amount_cents - paid);
  });

  const amountEur = (pendingCents / 100).toFixed(2);
  const title = "Aviso de Saldo Pendiente de Pago";
  const content = `Hola, te recordamos que tienes un saldo pendiente de ${amountEur}€ en concepto de cuotas del club para ${player.first_name} ${player.last_name}. Por favor, revisa tu saldo en la aplicación.`;

  // Find target tutor ID
  let targetUserId = player.tutor_id;
  if (!targetUserId && Array.isArray(player.player_tutors) && player.player_tutors[0]?.tutor_id) {
    targetUserId = player.player_tutors[0].tutor_id;
  }

  if (method === 'internal') {
    if (!targetUserId) {
      throw new Error("Este jugador no tiene una cuenta de familiar vinculada para recibir notificaciones en la campanita.");
    }

    await adminSupabase.from("notifications").insert({
      user_id: targetUserId,
      profile_id: targetUserId,
      club_id: player.club_id,
      type: 'tesoreria',
      title,
      content,
      is_read: false,
      link: `/dashboard/family/e/${playerId}/perfil`,
    });

    return { success: true, message: "Notificación enviada a la campanita de la familia." };
  } else {
    const whatsappText = `Hola, desde la tesorería del club te recordamos que tienes un saldo pendiente de ${amountEur}€ en el expediente de ${player.first_name} ${player.last_name}. Por favor, ponte en contacto con nosotros para regularizarlo. ¡Gracias!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    return { success: true, url: whatsappUrl };
  }
}

export async function updateFeeStatusAction(id: string, newStatus: string, paymentMethod?: string) {
  const adminSupabase = await createAdminClient();
  
  const updateData: any = { estado: newStatus };
  if (paymentMethod) updateData.payment_method = paymentMethod;
  if (newStatus === 'pagado') {
    updateData.fecha_pago = new Date().toISOString();
    const { data: fee } = await adminSupabase.from("fees").select("amount_cents").eq("id", id).single();
    if (fee) updateData.amount_paid_cents = fee.amount_cents;
  } else if (newStatus === 'pendiente') {
    updateData.amount_paid_cents = 0;
  }

  const { error } = await adminSupabase
    .from("fees")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error updating fee status:", error);
    throw new Error(error.message);
  }
  
  if (newStatus === 'pagado') {
    await generateAndUploadReceiptAction(id).catch(e => console.error("Error generating receipt", e));
  }

  return { success: true };
}

export async function getRegistrationPaymentsAction() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) throw new Error("Club no encontrado");

  const { data, error } = await adminSupabase
    .from("registrations")
    .select("id, form_data, payment_method, payment_plan, payment_status, status, created_at, stripe_payment_intent_id")
    .eq("club_id", profile.club_id)
    .neq("status", "REJECTED")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching registration payments:", error);
    throw new Error(error.message);
  }

  return data.map(reg => {
    const formData = reg.form_data || {};
    let feeTotal = 250;
    if (formData.wasInClub) {
      feeTotal = 195;
      if (formData.paidReservation) feeTotal -= 50;
    }
    
    return {
      id: reg.id,
      concept: `Inscripción: ${formData.playerFirstName || ''} ${formData.playerLastName || ''}`,
      amount_cents: feeTotal * 100,
      currency: 'eur',
      estado: reg.payment_status?.toLowerCase() === 'success' || reg.payment_status?.toLowerCase() === 'success_mock' || reg.payment_status?.toLowerCase() === 'done' ? 'pagado' : 'pendiente',
      fecha_pago: reg.created_at,
      tipo_cargo: reg.payment_plan === 'Fraccionado' ? 'subscription' : 'one_time',
      payment_method: reg.payment_method,
      registration_status: reg.status
    };
  });
}



export async function getTreasuryBalanceAction() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ingresos: 0, gastos: 0 };

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) return { ingresos: 0, gastos: 0 };

  // Sum fees where estado = 'pagado' (real income)
  const { data: feesData } = await adminSupabase
    .from("fees")
    .select("amount_cents, estado")
    .eq("club_id", profile.club_id)
    .in("estado", ['pagado', 'paid']);

  // Sum ALL expenses (they are always real costs)
  const { data: expensesData } = await adminSupabase
    .from("expenses")
    .select("amount_cents");

  const ingresos = (feesData || []).reduce((sum: number, f: any) => sum + ((f.amount_cents || 0) / 100), 0);
  const gastos = (expensesData || []).reduce((sum: number, e: any) => sum + ((e.amount_cents || 0) / 100), 0);

  return { ingresos, gastos };
}

export async function getClubExpensesAction() {
  const adminSupabase = await createAdminClient();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await adminSupabase
    .from("expenses")
    .select("id, concept, amount_cents, date, category, created_at")
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching expenses:", error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function createClubExpenseAction(expenseData: {
  concept: string;
  amount_cents: number;
  category: string;
  date: string;
}) {
  const adminSupabase = await createAdminClient();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await adminSupabase.from("expenses").insert({
    concept: expenseData.concept,
    amount_cents: expenseData.amount_cents,
    category: expenseData.category,
    date: expenseData.date,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
  return { success: true };
}
export async function updateClubExpenseAction(id: string, expenseData: {
  concept: string;
  amount_cents: number;
  category: string;
  date: string;
}) {
  const adminSupabase = await createAdminClient();
  const { error } = await adminSupabase.from("expenses").update({
    concept: expenseData.concept,
    amount_cents: expenseData.amount_cents,
    category: expenseData.category,
    date: expenseData.date,
  }).eq("id", id);

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function deleteClubExpenseAction(id: string) {
  const adminSupabase = await createAdminClient();
  const { error } = await adminSupabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}
export async function exportAccountingCsvAction() {
  const adminSupabase = await createAdminClient();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) throw new Error("Club no encontrado");

  // Fetch paid fees (ingresos cobrados)
  const { data: fees } = await adminSupabase
    .from("fees")
    .select("concept, amount_cents, estado, fecha_pago, payment_method, players(first_name, last_name)")
    .eq("club_id", profile.club_id)
    .in("estado", ['pagado', 'paid'])
    .order("fecha_pago", { ascending: true });

  // Fetch all expenses (gastos operativos)
  const { data: expenses } = await adminSupabase
    .from("expenses")
    .select("concept, amount_cents, date, category")
    .order("date", { ascending: true });

  // Build rows: [Fecha, Tipo, Concepto, Categoría, Ingreso(€), Gasto(€)]
  const rows: string[][] = [];

  for (const f of fees || []) {
    const p = (f as any).players;
    const playerName = p ? ` (${p.first_name} ${p.last_name})` : '';
    rows.push([
      f.fecha_pago ? new Date(f.fecha_pago).toLocaleDateString('es-ES') : '–',
      'Ingreso',
      `"${f.concept}${playerName}"`,
      'Cuotas',
      ((f.amount_cents || 0) / 100).toFixed(2),
      ''
    ]);
  }

  for (const e of expenses || []) {
    rows.push([
      e.date ? new Date(e.date).toLocaleDateString('es-ES') : '–',
      'Gasto',
      `"${e.concept}"`,
      e.category,
      '',
      ((e.amount_cents || 0) / 100).toFixed(2)
    ]);
  }

  // Sort combined rows by date (dd/mm/yyyy → yyyy-mm-dd for comparison)
  rows.sort((a, b) => {
    const toISO = (d: string) => d.split('/').reverse().join('-');
    return toISO(a[0]).localeCompare(toISO(b[0]));
  });

  const totalIngresos = (fees || []).reduce((s, f) => s + ((f.amount_cents || 0) / 100), 0);
  const totalGastos = (expenses || []).reduce((s, e) => s + ((e.amount_cents || 0) / 100), 0);
  
  rows.push(['', '', '"TOTAL"', '', totalIngresos.toFixed(2), totalGastos.toFixed(2)]);
  rows.push(['', '', '"BALANCE NETO"', '', (totalIngresos - totalGastos).toFixed(2), '']);

  const header = ['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Ingreso (€)', 'Gasto (€)'];
  const csv = '\uFEFF' + header.join(';') + '\n' + rows.map(r => r.join(';')).join('\n');
  const filename = `contabilidad_${new Date().toISOString().split('T')[0]}.csv`;

  return { csv, filename };
}

export async function createAdminFeeForPlayerAction(playerId: string, wasInClub: boolean = false) {
  const adminSupabase = await createAdminClient();

  const { data: player, error: playerError } = await adminSupabase
    .from("players")
    .select("id, first_name, last_name, club_id, payment_method, payment_plan, tutor_id, paid_reservation")
    .eq("id", playerId)
    .single();

  if (playerError || !player) {
    console.error("createAdminFeeForPlayerAction: jugador no encontrado", playerError);
    return { success: false, error: "Jugador no encontrado" };
  }

  const { data: existing } = await adminSupabase
    .from("fees")
    .select("id")
    .ilike("concept", `%Cuota Temporada%${player.first_name}%${player.last_name}%`)
    .eq("club_id", player.club_id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { success: true, message: "Cuota ya existente" };
  }

  let baseAmount = wasInClub ? 195 : 250;
  const isFractional = player.payment_plan === "Fraccionado";
  const profileId = player.tutor_id || null;

  // Si es fraccionado, creamos 2 cuotas. Si no, 1 cuota.
  const numFees = isFractional ? 2 : 1;
  const fractionAmount = Math.round(baseAmount / numFees);

  // Compensamos posibles céntimos de redondeo en la primera cuota
  const firstFeeAmount = baseAmount - (fractionAmount * (numFees - 1));

  let firstFeeId = null;

  for (let i = 0; i < numFees; i++) {
    const amount = i === 0 ? firstFeeAmount : fractionAmount;
    
    // Si es la segunda cuota (índice 1), vence en 30 días
    const date = new Date();
    if (i === 1) date.setDate(date.getDate() + 30);

    const suffix = isFractional ? ` (${i + 1}/${numFees})` : '';

    let initialStatus = "pendiente";
    let initialPaidCents = 0;
    
    // Si el método de pago es contado y estamos creando la cuota, algunos clubes lo consideran ya pagado o el admin lo validó
    if (player.payment_method === 'Contado' && i === 0) {
      initialStatus = "pagado";
      initialPaidCents = amount * 100;
    }

    const feeData: Record<string, any> = {
      concept: `Cuota Temporada${suffix} – ${player.first_name} ${player.last_name}`,
      amount_cents: amount * 100,
      amount_paid_cents: initialPaidCents,
      currency: "eur",
      estado: initialStatus,
      tipo_cargo: "one_time",
      fecha_pago: initialStatus === "pagado" ? new Date().toISOString() : date.toISOString(),
      club_id: player.club_id,
      payment_method: player.payment_method || "Pendiente",
      player_id: player.id,
    };

    if (profileId) feeData.profile_id = profileId;

    const { data: insertedFee, error: feeError } = await adminSupabase
      .from("fees")
      .insert(feeData)
      .select("id")
      .single();

    if (feeError) {
      console.warn("createAdminFeeForPlayerAction: no se pudo crear la cuota:", feeError.message);
      return { success: false, error: feeError.message };
    }

    if (i === 0) firstFeeId = insertedFee.id;
  }

  // Inyectar Reserva de Plaza si aplica
  if (player.paid_reservation && firstFeeId) {
    const reserveAmountCents = 50 * 100;
    
    // Crear el payment
    const { data: payment, error: paymentError } = await adminSupabase
      .from("fee_payments")
      .insert({
        fee_id: firstFeeId,
        amount_cents: reserveAmountCents,
        payment_method: "Reserva de Plaza",
      })
      .select("id")
      .single();

    if (!paymentError && payment) {
      // Actualizar amount_paid_cents de la primera cuota
      const { data: currentFee } = await adminSupabase.from("fees").select("amount_cents, amount_paid_cents").eq("id", firstFeeId).single();
      if (currentFee) {
        const newPaid = currentFee.amount_paid_cents + reserveAmountCents;
        const newStatus = newPaid >= currentFee.amount_cents ? "pagado" : "pendiente";
        
        await adminSupabase.from("fees")
          .update({ amount_paid_cents: newPaid, estado: newStatus })
          .eq("id", firstFeeId);
      }
      
      // Generar recibo de la reserva (silenciosamente)
      try {
        await generateAndUploadPaymentReceiptAction(payment.id);
      } catch (e) {
        console.error("Error generando recibo de reserva:", e);
      }
    }
  }

  return { success: true };
}

export async function generateAndUploadPaymentReceiptAction(paymentId: string) {
  const adminSupabase = await createAdminClient();
  
  const { data: payment, error: paymentError } = await adminSupabase
    .from("fee_payments")
    .select("*, fees(*, players(first_name, last_name, parent1_name, club_id))")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) throw new Error("Pago no encontrado");

  const fee = payment.fees;
  const tutorName = fee?.players?.parent1_name;
  const playerName = fee?.players ? `${fee.players.first_name} ${fee.players.last_name}` : "Desconocido";
  const recibiDe = tutorName ? `${tutorName} (Tutor de ${playerName})` : playerName;

  let clubLogoUrl = null;
  if (fee?.players?.club_id) {
    const { data: club } = await adminSupabase.from('clubs').select('logo_url').eq('id', fee.players.club_id).single();
    if (club) clubLogoUrl = club.logo_url;
  }

  const pdfBytes = await generateOfficialReceiptPdfBuffer({
    title: "RECIBO DE PAGO",
    dateStr: new Date(payment.created_at || Date.now()).toLocaleDateString("es-ES"),
    receiptNo: payment.id.split("-")[0].toUpperCase(),
    recibiDe: recibiDe,
    amountFormatted: `${(payment.amount_cents / 100).toFixed(2)} €`,
    concept: fee?.concept || "Pago de Cuota",
    paymentMethod: payment.payment_method || "",
    clubLogoUrl: clubLogoUrl,
  });

  const folder = fee?.profile_id || 'general';
  const path = `${folder}/payment_${paymentId}.pdf`;
  
  const { error: uploadError } = await adminSupabase.storage
    .from('recibos_pagos')
    .upload(path, Buffer.from(pdfBytes), { contentType: 'application/pdf', upsert: true });

  if (uploadError) throw new Error("Error subiendo PDF: " + uploadError.message);

  await adminSupabase.from("fee_payments").update({ receipt_path: path }).eq("id", paymentId);

  return { success: true, path };
}

export async function updateFeeDetailsAction(id: string, updates: { concept?: string; amount_cents?: number; due_date?: string }) {
  const adminSupabase = await createAdminClient();
  const { error } = await adminSupabase.from("fees").update(updates).eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function deleteFeeAction(id: string) {
  const adminSupabase = await createAdminClient();
  const { error } = await adminSupabase.from("fees").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getInscriptionFeesAction() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) throw new Error("Club no encontrado");

  const { data, error } = await adminSupabase
    .from("players")
    .select(`
      id, first_name, last_name, registration_status, payment_method, payment_plan,
      created_at, teams(name, category)
    `)
    .eq("club_id", profile.club_id)
    .in("registration_status", ["pending_revision", "approved", "formalized", "rejected"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((p: any) => {
    let feeTotal = 250;
    let paymentStatus = "pendiente";
    if (p.registration_status === "formalized") paymentStatus = "pagado";
    if (p.registration_status === "rejected") paymentStatus = "rechazado";

    return {
      id: p.id,
      concept: `Inscripción: ${p.first_name} ${p.last_name}`,
      amount_cents: feeTotal * 100,
      amount_paid_cents: paymentStatus === "pagado" ? feeTotal * 100 : 0,
      currency: "eur",
      estado: paymentStatus,
      fecha_pago: p.created_at,
      tipo_cargo: p.payment_plan === "Fraccionado" ? "subscription" : "one_time",
      payment_method: p.payment_method || "–",
      registration_status: p.registration_status,
      team_name: p.teams?.name || "–",
      team_category: p.teams?.category || "–",
    };
  });
}

export async function getFeePaymentsAction(feeId: string) {
  const adminSupabase = await createAdminClient();
  const { data, error } = await adminSupabase
    .from("fee_payments")
    .select("*")
    .eq("fee_id", feeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function addPartialPaymentAction(feeId: string, amountCents: number, method: string) {
  const adminSupabase = await createAdminClient();

  // 1. Get current fee to validate
  const { data: fee, error: feeError } = await adminSupabase
    .from("fees")
    .select("amount_cents, amount_paid_cents")
    .eq("id", feeId)
    .single();

  if (feeError || !fee) throw new Error("Cuota no encontrada");

  const pending = fee.amount_cents - (fee.amount_paid_cents || 0);
  if (amountCents > pending) {
    throw new Error("El importe entregado no puede ser mayor a la cantidad pendiente");
  }

  // 2. Insert payment
  const { data: payment, error: paymentError } = await adminSupabase
    .from("fee_payments")
    .insert({
      fee_id: feeId,
      amount_cents: amountCents,
      payment_method: method,
    })
    .select("id")
    .single();

  if (paymentError || !payment) throw new Error("Error insertando el pago");

  // 3. Update fee
  const newPaid = (fee.amount_paid_cents || 0) + amountCents;
  const newStatus = newPaid >= fee.amount_cents ? "pagado" : "pendiente";

  await adminSupabase.from("fees")
    .update({ amount_paid_cents: newPaid, estado: newStatus, payment_method: method })
    .eq("id", feeId);

  // 4. Generate receipt
  try {
    await generateAndUploadPaymentReceiptAction(payment.id);
    if (newStatus === 'pagado') {
      await generateAndUploadReceiptAction(feeId);
    }
  } catch(e) {
    console.error("Error generando recibo parcial o total:", e);
  }

  return { success: true };
}

export async function downloadPaymentReceiptAction(paymentId: string) {
  const adminSupabase = await createAdminClient();
  const res = await generateAndUploadPaymentReceiptAction(paymentId);

  const { data, error } = await adminSupabase.storage
    .from("recibos_pagos")
    .createSignedUrl(res.path, 60 * 15, { download: true });

  if (error || !data?.signedUrl) {
    throw new Error(`No se pudo obtener la URL de descarga del recibo. Detalles: ${error?.message || "URL no generada"}`);
  }

  return { success: true, url: data.signedUrl };
}

export async function downloadFeeReceiptAction(feeId: string) {
  const adminSupabase = await createAdminClient();
  const res = await generateAndUploadReceiptAction(feeId);

  const { data: fee } = await adminSupabase
    .from("fees")
    .select("players(first_name, last_name)")
    .eq("id", feeId)
    .single();

  const playerName = fee?.players ? `${fee.players.first_name}_${fee.players.last_name}` : "Socio";
  const sanitizedName = playerName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Recibo_${res.receiptNumber}_${sanitizedName}.pdf`;

  const { data, error } = await adminSupabase.storage
    .from("recibos_pagos")
    .createSignedUrl(res.path, 60 * 15, { download: fileName });

  if (error || !data?.signedUrl) {
    throw new Error(`No se pudo obtener la URL de descarga del recibo de cuota. Detalles: ${error?.message || "URL no generada"}`);
  }

  return { success: true, url: data.signedUrl, fileName };
}

export async function getMemberBalancesAction() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) throw new Error("Club no encontrado");

  // 1. Fetch players with teams
  const { data: players, error: playersError } = await adminSupabase
    .from("players")
    .select("id, first_name, last_name, team_id, teams(id, name)")
    .eq("club_id", profile.club_id)
    .neq("status", "inactive")
    .order("first_name", { ascending: true });

  if (playersError) throw new Error(playersError.message);

  // 2. Fetch fees with payments for the club
  const { data: fees, error: feesError } = await adminSupabase
    .from("fees")
    .select("id, player_id, concept, amount_cents, amount_paid_cents, estado, creado_en, fee_payments(id, amount_cents, payment_method, created_at)")
    .eq("club_id", profile.club_id);

  if (feesError) throw new Error(feesError.message);

  // Map fees by player
  const feesByPlayer: Record<string, any[]> = {};
  (fees || []).forEach((f: any) => {
    if (f.player_id) {
      if (!feesByPlayer[f.player_id]) feesByPlayer[f.player_id] = [];
      feesByPlayer[f.player_id].push(f);
    }
  });

  const memberBalances = (players || []).map((p: any) => {
    const playerFees = feesByPlayer[p.id] || [];
    
    let totalChargedCents = 0;
    let totalPaidCents = 0;
    let pendingFeesCount = 0;

    playerFees.forEach((f: any) => {
      totalChargedCents += f.amount_cents || 0;
      
      let paid = f.amount_paid_cents || 0;
      if (f.estado === "pagado" && paid === 0) {
        paid = f.amount_cents || 0;
      }
      totalPaidCents += paid;

      if (f.estado === "pendiente") {
        pendingFeesCount++;
      }
    });

    const balanceCents = totalChargedCents - totalPaidCents;
    let status: "al_dia" | "con_deuda" | "saldo_favor" = "al_dia";
    if (balanceCents > 0) status = "con_deuda";
    else if (balanceCents < 0) status = "saldo_favor";

    const teamObj = Array.isArray(p.teams) ? p.teams[0] : p.teams;

    return {
      player_id: p.id,
      player_name: `${p.first_name} ${p.last_name}`,
      team_id: (teamObj as any)?.id || "none",
      team_name: (teamObj as any)?.name || "Sin equipo",
      total_charged_cents: totalChargedCents,
      total_paid_cents: totalPaidCents,
      balance_cents: balanceCents,
      status,
      fees_count: playerFees.length,
      pending_fees_count: pendingFeesCount,
    };
  });

  // Global KPIs
  const totalCharged = memberBalances.reduce((acc, m) => acc + m.total_charged_cents, 0) / 100;
  const totalPaid = memberBalances.reduce((acc, m) => acc + m.total_paid_cents, 0) / 100;
  const totalPending = memberBalances.reduce((acc, m) => acc + Math.max(0, m.balance_cents), 0) / 100;
  const membersAlDia = memberBalances.filter(m => m.status === "al_dia" || m.status === "saldo_favor").length;
  const membersConDeuda = memberBalances.filter(m => m.status === "con_deuda").length;

  return {
    success: true,
    members: memberBalances,
    summary: {
      totalCharged,
      totalPaid,
      totalPending,
      membersAlDia,
      membersConDeuda,
      totalMembers: memberBalances.length,
    },
  };
}

export async function getMemberStatementAction(playerId: string) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Fetch player info
  const { data: player, error: pErr } = await adminSupabase
    .from("players")
    .select("id, first_name, last_name, team_id, teams(name)")
    .eq("id", playerId)
    .single();

  if (pErr || !player) throw new Error("Jugador no encontrado");

  // Fetch all fees and payments for this player
  const { data: fees, error: fErr } = await adminSupabase
    .from("fees")
    .select("id, concept, amount_cents, amount_paid_cents, estado, creado_en, tipo_cargo, payment_method, receipt_path, fee_payments(id, amount_cents, payment_method, receipt_path, created_at)")
    .eq("player_id", playerId)
    .order("creado_en", { ascending: false });

  if (fErr) throw new Error(fErr.message);

  let totalChargedCents = 0;
  let totalPaidCents = 0;

  const formattedFees = (fees || []).map((f: any) => {
    totalChargedCents += f.amount_cents || 0;

    let paidCents = f.amount_paid_cents || 0;
    if (f.estado === "pagado" && paidCents === 0) {
      paidCents = f.amount_cents || 0;
    }
    totalPaidCents += paidCents;

    return {
      id: f.id,
      concept: f.concept,
      amount_cents: f.amount_cents,
      amount_paid_cents: paidCents,
      pending_cents: Math.max(0, f.amount_cents - paidCents),
      estado: f.estado || "pendiente",
      creado_en: f.creado_en,
      payment_method: f.payment_method,
      receipt_path: f.receipt_path,
      payments: (f.fee_payments || []).map((p: any) => ({
        id: p.id,
        amount_cents: p.amount_cents,
        payment_method: p.payment_method || "Contado",
        created_at: p.created_at,
        receipt_path: p.receipt_path,
      })),
    };
  });

  const teamObj = Array.isArray(player.teams) ? player.teams[0] : player.teams;

  return {
    success: true,
    player: {
      id: player.id,
      name: `${player.first_name} ${player.last_name}`,
      team_name: (teamObj as any)?.name || "Sin equipo",
    },
    summary: {
      total_charged: totalChargedCents / 100,
      total_paid: totalPaidCents / 100,
      balance: (totalChargedCents - totalPaidCents) / 100,
      status: (totalChargedCents - totalPaidCents) > 0 ? "con_deuda" : "al_dia",
    },
    fees: formattedFees,
  };
}

export async function getOfficialReceiptsAction() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  const clubId = profile?.club_id;
  if (!clubId) throw new Error("Club no encontrado");

  // 1. Intentar sincronizar recibos de todas las cuotas pagadas o con entregas a cuenta
  try {
    const { data: paidFees } = await adminSupabase
      .from("fees")
      .select("id, amount_cents, amount_paid_cents, concept, payment_method, creado_en, player_id, club_id, estado, players(first_name, last_name, club_id)")
      .or("estado.eq.pagado,amount_paid_cents.gt.0");

    if (paidFees && paidFees.length > 0) {
      const clubFees = paidFees.filter(f => f.club_id === clubId || f.players?.club_id === clubId);

      for (const fee of clubFees) {
        const { data: existing } = await adminSupabase
          .from("official_receipts")
          .select("id")
          .eq("fee_id", fee.id)
          .single();

        if (!existing) {
          try {
            await generateAndUploadReceiptAction(fee.id);
          } catch (e) {
            console.error("Auto-sincronizando recibo error:", e);
          }
        }
      }
    }
  } catch (syncErr) {
    console.error("Error sincronizando cuotas pagadas a official_receipts:", syncErr);
  }

  // 2. Consultar la tabla official_receipts
  const { data: receipts, error } = await adminSupabase
    .from("official_receipts")
    .select("id, receipt_number, sequence_number, amount_cents, concept, payment_method, status, pdf_path, created_at, fee_id, player_id, players(first_name, last_name)")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (!error && receipts && receipts.length > 0) {
    return receipts.map((r: any) => ({
      id: r.id,
      receipt_number: r.receipt_number,
      sequence_number: r.sequence_number,
      created_at: r.created_at,
      player_name: r.players ? `${r.players.first_name} ${r.players.last_name}` : "General",
      concept: r.concept,
      amount_cents: r.amount_cents,
      payment_method: r.payment_method || "Contado",
      status: r.status || "emitido",
      pdf_path: r.pdf_path,
      fee_id: r.fee_id,
    }));
  }

  // Fallback de respaldo: Si la tabla no devuelve filas, construir la lista directamente desde cuotas pagadas
  const { data: fallbackFees } = await adminSupabase
    .from("fees")
    .select("id, amount_cents, amount_paid_cents, concept, payment_method, creado_en, estado, player_id, club_id, players(first_name, last_name, club_id)")
    .or("estado.eq.pagado,amount_paid_cents.gt.0")
    .order("creado_en", { ascending: false });

  const clubFallbackFees = (fallbackFees || []).filter(f => f.club_id === clubId || f.players?.club_id === clubId);

  return clubFallbackFees.map((f: any, idx: number) => {
    const d = new Date(f.creado_en || Date.now());
    const dayStr = String(d.getDate()).padStart(2, "0");
    const monthStr = String(d.getMonth() + 1).padStart(2, "0");
    const yearStr = String(d.getFullYear());
    const datePrefix = `${dayStr}${monthStr}${yearStr}`;
    const seqStr = String(clubFallbackFees.length - idx).padStart(4, "0");
    const receiptNumber = `${datePrefix}-${seqStr}`;

    const paidCents = f.estado === "pagado" ? f.amount_cents : (f.amount_paid_cents || 0);

    return {
      id: f.id,
      receipt_number: receiptNumber,
      sequence_number: clubFallbackFees.length - idx,
      created_at: f.creado_en || new Date().toISOString(),
      player_name: f.players ? `${f.players.first_name} ${f.players.last_name}` : "General",
      concept: f.concept || "Cuota Oficial",
      amount_cents: paidCents,
      payment_method: f.payment_method || "Contado",
      status: "emitido",
      fee_id: f.id,
    };
  });
}

export async function exportOfficialReceiptsCsvAction() {
  const receipts = await getOfficialReceiptsAction();
  let csv = "Numero Recibo;Fecha;Socio/Jugador;Concepto;Importe (EUR);Metodo;Estado\n";

  receipts.forEach((r: any) => {
    const fecha = new Date(r.created_at).toLocaleDateString("es-ES");
    const importe = (r.amount_cents / 100).toFixed(2);
    csv += `"${r.receipt_number}";"${fecha}";"${r.player_name}";"${r.concept}";"${importe}";"${r.payment_method}";"${r.status}"\n`;
  });

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { csv, filename: `Registro_Recibos_Emitidos_${dateStr}.csv` };
}

export async function downloadOfficialReceiptPdfAction(receiptId: string) {
  const adminSupabase = await createAdminClient();

  const { data: receipt, error } = await adminSupabase
    .from("official_receipts")
    .select("*, players(first_name, last_name)")
    .eq("id", receiptId)
    .single();

  if (error || !receipt) throw new Error("Recibo no encontrado");

  // If receipt has a fee_id, generate/get PDF URL
  if (receipt.fee_id) {
    const res = await generateAndUploadReceiptAction(receipt.fee_id);
    const playerName = receipt.players ? `${receipt.players.first_name}_${receipt.players.last_name}` : "Socio";
    const sanitizedName = playerName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `Recibo_${receipt.receipt_number}_${sanitizedName}.pdf`;

    const { data: signedData } = await adminSupabase.storage
      .from("recibos_pagos")
      .createSignedUrl(res.path, 900, { download: fileName });

    if (signedData?.signedUrl) {
      return { success: true, url: signedData.signedUrl, fileName };
    }
  }

  throw new Error("No se pudo obtener el PDF del recibo");
}

export async function updateFeeAmountAction(feeId: string, newAmountCents: number, reason?: string) {
  const adminSupabase = await createAdminClient();

  if (newAmountCents < 0) {
    throw new Error("El importe de la cuota no puede ser negativo.");
  }

  const { data: fee, error: feeErr } = await adminSupabase
    .from("fees")
    .select("amount_paid_cents, concept")
    .eq("id", feeId)
    .single();

  if (feeErr || !fee) throw new Error("Cuota no encontrada");

  const paidCents = fee.amount_paid_cents || 0;
  const newStatus = paidCents >= newAmountCents ? "pagado" : "pendiente";
  const updatedConcept = reason ? `${fee.concept || 'Cuota'} (Ajuste: ${reason})` : fee.concept;

  const { error: updateErr } = await adminSupabase
    .from("fees")
    .update({
      amount_cents: newAmountCents,
      estado: newStatus,
      concept: updatedConcept,
    })
    .eq("id", feeId);

  if (updateErr) throw new Error("Error al actualizar importe de cuota: " + updateErr.message);

  return { success: true };
}

export async function createManualReceiptAction(params: {
  payerName: string;
  payerDni?: string;
  concept: string;
  amountCents: number;
  paymentMethod: string;
  phone?: string;
}) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  const clubId = profile?.club_id;
  if (!clubId) throw new Error("Club no encontrado");

  if (!params.payerName || !params.concept || params.amountCents <= 0) {
    throw new Error("Por favor completa los campos obligatorios: Nombre, Concepto e Importe.");
  }

  // 1. Generate receipt number DDMMAAAA-XXXX
  const now = new Date();
  const dayStr = String(now.getDate()).padStart(2, "0");
  const monthStr = String(now.getMonth() + 1).padStart(2, "0");
  const yearStr = String(now.getFullYear());
  const datePrefix = `${dayStr}${monthStr}${yearStr}`;
  const currentYear = now.getFullYear();

  const { data: lastReceipt } = await adminSupabase
    .from("official_receipts")
    .select("sequence_number")
    .eq("club_id", clubId)
    .eq("year", currentYear)
    .order("sequence_number", { ascending: false })
    .limit(1)
    .single();

  const nextSeq = (lastReceipt?.sequence_number || 0) + 1;
  const seqStr = String(nextSeq).padStart(4, "0");
  const receiptNumber = `${datePrefix}-${seqStr}`;

  // 2. Generate PDF
  let clubLogoUrl = null;
  const { data: club } = await adminSupabase.from("clubs").select("logo_url").eq("id", clubId).single();
  if (club) clubLogoUrl = club.logo_url;

  const recibiDe = params.payerDni ? `${params.payerName} (DNI: ${params.payerDni})` : params.payerName;

  const pdfBytes = await generateOfficialReceiptPdfBuffer({
    title: "RECIBO DE PAGO",
    dateStr: now.toLocaleDateString("es-ES"),
    receiptNo: receiptNumber,
    recibiDe: recibiDe,
    amountFormatted: `${(params.amountCents / 100).toFixed(2)} €`,
    concept: params.concept,
    paymentMethod: params.paymentMethod || "Contado",
    clubLogoUrl: clubLogoUrl,
  });

  const sanitizedName = params.payerName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Recibo_${receiptNumber}_${sanitizedName}.pdf`;
  const storagePath = `manual_receipts/${receiptNumber}_${sanitizedName}.pdf`;

  await adminSupabase.storage
    .from("recibos_pagos")
    .upload(storagePath, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });

  // 3. Record in official_receipts table
  await adminSupabase.from("official_receipts").insert({
    club_id: clubId,
    receipt_number: receiptNumber,
    sequence_number: nextSeq,
    series_prefix: datePrefix,
    year: currentYear,
    amount_cents: params.amountCents,
    concept: `${params.concept} - Pagador: ${params.payerName}`,
    payment_method: params.paymentMethod || "Contado",
    status: "emitido",
    pdf_path: storagePath,
  });

  // Get Signed URL
  const { data: signedData } = await adminSupabase.storage
    .from("recibos_pagos")
    .createSignedUrl(storagePath, 60 * 60, { download: fileName });

  // Optional WhatsApp URL if phone is provided
  let whatsappUrl = null;
  if (params.phone) {
    const cleanPhone = params.phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 9 ? `34${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(`Hola ${params.payerName}, adjuntamos tu recibo de pago N.º ${receiptNumber} por concepto de "${params.concept}" por importe de ${(params.amountCents / 100).toFixed(2)} €.\nDescarga tu recibo PDF aquí: ${signedData?.signedUrl || ''}`);
    whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${msg}`;
  }

  return {
    success: true,
    receiptNumber,
    url: signedData?.signedUrl,
    whatsappUrl,
    fileName,
  };
}


