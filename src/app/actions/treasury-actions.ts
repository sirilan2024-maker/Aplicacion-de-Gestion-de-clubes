"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  getAuthenticatedContext,
  canUserAccessFamily,
  canUserAccessPlayer,
  canUserAccessFee,
  TREASURY_ADMIN_ROLES,
} from "@/lib/auth-helpers";


export async function getFamilyFeesAction(familyId: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || "No autenticado");
  }

  const adminSupabase = await createAdminClient();

  const access = await canUserAccessFamily(adminSupabase, context, familyId);
  if (!access.allowed) {
    throw new Error(access.reason || "No autorizado para consultar las cuotas de esta familia");
  }

  const { data, error } = await adminSupabase
    .from("fees")
    .select("id, concept, amount_cents, amount_paid_cents, estado, creado_en, tipo_cargo, payment_method, receipt_path, fee_payments(id, amount_cents, payment_method, receipt_path, created_at)")
    .eq("profile_id", familyId)
    .eq("club_id", context.profile.club_id)
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
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || "No autenticado");
  }

  const adminSupabase = await createAdminClient();

  const access = await canUserAccessPlayer(adminSupabase, context, playerId);
  if (!access.allowed) {
    throw new Error(access.reason || "No autorizado para consultar las cuotas de este jugador");
  }

  const { data, error } = await adminSupabase
    .from("fees")
    .select("id, concept, amount_cents, amount_paid_cents, estado, creado_en, tipo_cargo, payment_method, receipt_path, fee_payments(id, amount_cents, payment_method, receipt_path, created_at)")
    .eq("player_id", playerId)
    .eq("club_id", context.profile.club_id)
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
    // Calculate global next sequence number for this club across all receipts
    const targetClubId = fee.club_id || fee.players?.club_id;
    const { data: lastReceipt } = await adminSupabase
      .from("official_receipts")
      .select("sequence_number")
      .eq("club_id", targetClubId)
      .order("sequence_number", { ascending: false })
      .limit(1)
      .single();

    const { count: paidCount } = await adminSupabase
      .from("fees")
      .select("id", { count: "exact", head: true });

    const maxExistingSeq = Math.max(lastReceipt?.sequence_number || 0, paidCount || 0);
    const nextSeq = maxExistingSeq + 1;
    const seqStr = String(nextSeq).padStart(4, "0");
    receiptNumber = `${datePrefix}-${seqStr}`;

    // Record in official_receipts table
    await adminSupabase.from("official_receipts").insert({
      club_id: targetClubId,
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
    .select("*, players(first_name, last_name, tutor_id, player_tutors(tutor_id), parent1_email, parent2_email, email)")
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

  // Find all target user IDs linked to player/tutor
  const targetUserIds = new Set<string>();
  if (fee.profile_id) targetUserIds.add(fee.profile_id);
  if (fee.players?.tutor_id) targetUserIds.add(fee.players.tutor_id);
  if (Array.isArray(fee.players?.player_tutors)) {
    fee.players.player_tutors.forEach((pt: any) => {
      if (pt?.tutor_id) targetUserIds.add(pt.tutor_id);
    });
  }

  // Check matching parent emails in profiles
  const emails = [fee.players?.parent1_email, fee.players?.parent2_email, fee.players?.email].filter(Boolean);
  if (emails.length > 0) {
    const { data: matchingProfiles } = await adminSupabase
      .from("profiles")
      .select("id")
      .in("email", emails);
    (matchingProfiles || []).forEach((p: any) => {
      if (p.id) targetUserIds.add(p.id);
    });
  }

  if (method === 'internal') {
    if (targetUserIds.size === 0) {
      throw new Error("Este jugador no tiene una cuenta de familiar vinculada para recibir notificaciones.");
    }

    for (const targetUserId of targetUserIds) {
      await adminSupabase.from("notifications").insert({
        user_id: targetUserId,
        profile_id: targetUserId,
        club_id: fee.club_id,
        type: 'tesoreria',
        title: title,
        content: msg,
        is_read: false,
      });
    }

    return { success: true };
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
    .select("id, first_name, last_name, club_id, tutor_id, player_tutors(tutor_id), parent1_email, parent2_email, email")
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

  // Find all target tutor/family user IDs
  const targetUserIds = new Set<string>();
  if (player.tutor_id) targetUserIds.add(player.tutor_id);
  if (Array.isArray(player.player_tutors)) {
    player.player_tutors.forEach((pt: any) => {
      if (pt?.tutor_id) targetUserIds.add(pt.tutor_id);
    });
  }

  // Also query player_tutors table directly
  const { data: ptRows } = await adminSupabase
    .from("player_tutors")
    .select("tutor_id")
    .eq("player_id", playerId);
  (ptRows || []).forEach((pt: any) => {
    if (pt.tutor_id) targetUserIds.add(pt.tutor_id);
  });

  // Also match emails in profiles table
  const emails = [player.parent1_email, player.parent2_email, player.email].filter(Boolean);
  if (emails.length > 0) {
    const { data: matchingProfiles } = await adminSupabase
      .from("profiles")
      .select("id")
      .in("email", emails);
    (matchingProfiles || []).forEach((p: any) => {
      if (p.id) targetUserIds.add(p.id);
    });
  }

  if (method === 'internal') {
    if (targetUserIds.size === 0) {
      throw new Error("Este jugador no tiene una cuenta de familiar vinculada para recibir notificaciones en la campanita.");
    }

    for (const targetUserId of targetUserIds) {
      await adminSupabase.from("notifications").insert({
        user_id: targetUserId,
        profile_id: targetUserId,
        club_id: player.club_id,
        type: 'tesoreria',
        title,
        content,
        is_read: false,
      });
    }

    return { success: true, message: "Notificación enviada a la campanita de la familia." };
  } else {
    const whatsappText = `Hola, desde la tesorería del club te recordamos que tienes un saldo pendiente de ${amountEur}€ en el expediente de ${player.first_name} ${player.last_name}. Por favor, ponte en contacto con nosotros para regularizarlo. ¡Gracias!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    return { success: true, url: whatsappUrl };
  }
}

export async function updateFeeStatusAction(id: string, newStatus: string, paymentMethod?: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || "No autenticado");
  }

  if (!TREASURY_ADMIN_ROLES.includes(context.profile.role)) {
    throw new Error("No tienes permisos de tesorería para modificar el estado de cuotas");
  }

  const adminSupabase = await createAdminClient();

  // Validar existencia y pertenencia al club de la cuota
  const { data: fee, error: feeErr } = await adminSupabase
    .from("fees")
    .select("id, club_id, amount_cents")
    .eq("id", id)
    .single();

  if (feeErr || !fee) {
    throw new Error("Cuota no encontrada");
  }

  if (fee.club_id !== context.profile.club_id) {
    throw new Error("La cuota no pertenece a tu club");
  }
  
  const updateData: any = { estado: newStatus };
  if (paymentMethod) updateData.payment_method = paymentMethod;
  if (newStatus === 'pagado') {
    updateData.fecha_pago = new Date().toISOString();
    updateData.amount_paid_cents = fee.amount_cents;
  } else if (newStatus === 'pendiente') {
    updateData.amount_paid_cents = 0;
  }

  const { error } = await adminSupabase
    .from("fees")
    .update(updateData)
    .eq("id", id)
    .eq("club_id", context.profile.club_id);

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

export async function createAdminFeeForPlayerAction(playerId: string, wasInClub?: boolean) {
  const adminSupabase = await createAdminClient();

  const { data: player, error: playerError } = await adminSupabase
    .from("players")
    .select("id, first_name, last_name, club_id, payment_method, payment_plan, tutor_id, paid_reservation, was_in_club")
    .eq("id", playerId)
    .single();

  if (playerError || !player) {
    console.error("createAdminFeeForPlayerAction: jugador no encontrado", playerError);
    return { success: false, error: "Jugador no encontrado" };
  }

  // Comprobar si ya existen cuotas para este jugador
  const { data: existing } = await adminSupabase
    .from("fees")
    .select("id")
    .eq("player_id", player.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { success: true, message: "Cuotas ya existentes" };
  }

  const isRenewal = wasInClub !== undefined ? wasInClub : (player.was_in_club || false);
  const isReserved = player.paid_reservation || false;
  const baseAmount = isRenewal ? 195 : 250;
  const profileId = player.tutor_id || null;

  // 1. Si marcó Reserva de Plaza / Inscripción (50€):
  // Si fue por Stripe/tarjeta online se marca directamente pagada con recibo.
  // Si fue en efectivo/transferencia se crea como 'pendiente_verificacion' (0€ abonados)
  // hasta que el administrador pulse "Validar Ingreso" en Tesorería.
  if (isReserved) {
    const isInstantStripe = player.payment_method === 'Stripe' || player.payment_method === 'Tarjeta';
    const initialStatus = isInstantStripe ? 'pagado' : 'pdte_verif';
    const initialPaidCents = isInstantStripe ? 5000 : 0;

    const reservationFeeData: Record<string, any> = {
      concept: `Reserva de Plaza / Inscripción – ${player.first_name} ${player.last_name}`,
      amount_cents: 5000,
      amount_paid_cents: initialPaidCents,
      currency: "eur",
      estado: initialStatus,
      tipo_cargo: "one_time",
      fecha_pago: isInstantStripe ? new Date().toISOString() : null,
      club_id: player.club_id,
      payment_method: player.payment_method || "Pendiente Verificación",
      player_id: player.id,
    };
    if (profileId) reservationFeeData.profile_id = profileId;

    const { data: insertedReservation, error: resError } = await adminSupabase
      .from("fees")
      .insert(reservationFeeData)
      .select("id")
      .single();

    if (!resError && insertedReservation && isInstantStripe) {
      try {
        await generateAndUploadReceiptAction(insertedReservation.id);
      } catch (e) {
        console.error("Error generando recibo de reserva:", e);
      }
    }
  }

  // 2. El importe restante de la temporada a distribuir en cuotas (ej: 195€ - 50€ = 145€)
  const remainingAmount = isReserved ? Math.max(0, baseAmount - 50) : baseAmount;

  if (remainingAmount > 0) {
    const isFractional = player.payment_plan === "Fraccionado";
    const numFees = isFractional ? 2 : 1;
    const remainingCents = Math.round(remainingAmount * 100);
    const fractionCents = Math.floor(remainingCents / numFees);

    for (let i = 0; i < numFees; i++) {
      // Compensamos posibles céntimos impares en la primera cuota
      const amountCents = i === 0 ? (remainingCents - fractionCents * (numFees - 1)) : fractionCents;
      
      // La segunda cuota vence en 30 días
      const date = new Date();
      if (i === 1) date.setDate(date.getDate() + 30);

      const suffix = isFractional ? ` (${i + 1}/${numFees})` : (isReserved ? ' (Restante)' : '');

      const feeData: Record<string, any> = {
        concept: `Cuota Temporada${suffix} – ${player.first_name} ${player.last_name}`,
        amount_cents: amountCents,
        amount_paid_cents: 0,
        currency: "eur",
        estado: "pendiente",
        tipo_cargo: "one_time",
        fecha_pago: date.toISOString(),
        club_id: player.club_id,
        payment_method: player.payment_method || "Pendiente",
        player_id: player.id,
      };

      if (profileId) feeData.profile_id = profileId;

      await adminSupabase.from("fees").insert(feeData);
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

export async function verifyAndApproveReservationFeeAction(feeId: string, confirmedPaymentMethod: string = "Transferencia") {
  const adminSupabase = await createAdminClient();

  const { data: fee, error: feeErr } = await adminSupabase
    .from("fees")
    .select("id, amount_cents, estado, club_id, player_id, concept, payment_method")
    .eq("id", feeId)
    .single();

  if (feeErr || !fee) {
    return { success: false, error: "Cuota de reserva no encontrada" };
  }

  // Actualizar la cuota a pagada con el importe completo y fecha actual
  const { error: updateErr } = await adminSupabase
    .from("fees")
    .update({
      estado: "pagado",
      amount_paid_cents: fee.amount_cents,
      fecha_pago: new Date().toISOString(),
      payment_method: confirmedPaymentMethod || fee.payment_method || "Transferencia",
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", feeId);

  if (updateErr) {
    return { success: false, error: "Error actualizando cuota: " + updateErr.message };
  }

  // Generar automáticamente el recibo oficial correlativo en PDF
  let receiptResult = null;
  try {
    receiptResult = await generateAndUploadReceiptAction(feeId);
  } catch (e) {
    console.error("Error generando recibo tras verificar reserva:", e);
  }

  return { success: true, receipt: receiptResult };
}

export async function rejectReservationFeeAction(feeId: string) {
  const adminSupabase = await createAdminClient();

  const { error } = await adminSupabase
    .from("fees")
    .update({
      estado: "pendiente",
      amount_paid_cents: 0,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", feeId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}


export async function updateFeeDetailsAction(id: string, updates: { concept?: string; amount_cents?: number; due_date?: string }) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || "No autenticado");
  }

  if (!TREASURY_ADMIN_ROLES.includes(context.profile.role)) {
    throw new Error("No tienes permisos de tesorería para modificar cuotas");
  }

  const adminSupabase = await createAdminClient();

  const { data: fee, error: feeErr } = await adminSupabase
    .from("fees")
    .select("id, club_id")
    .eq("id", id)
    .single();

  if (feeErr || !fee) {
    throw new Error("Cuota no encontrada");
  }

  if (fee.club_id !== context.profile.club_id) {
    throw new Error("La cuota no pertenece a tu club");
  }

  const { error } = await adminSupabase
    .from("fees")
    .update(updates)
    .eq("id", id)
    .eq("club_id", context.profile.club_id);

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function deleteFeeAction(id: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || "No autenticado");
  }

  if (!TREASURY_ADMIN_ROLES.includes(context.profile.role)) {
    throw new Error("No tienes permisos de tesorería para eliminar cuotas");
  }

  const adminSupabase = await createAdminClient();

  const { data: fee, error: feeErr } = await adminSupabase
    .from("fees")
    .select("id, club_id")
    .eq("id", id)
    .single();

  if (feeErr || !fee) {
    throw new Error("Cuota no encontrada");
  }

  if (fee.club_id !== context.profile.club_id) {
    throw new Error("La cuota no pertenece a tu club");
  }

  // Eliminar pagos asociados primero para mantener consistencia referencial
  await adminSupabase.from("fee_payments").delete().eq("fee_id", id);

  const { error } = await adminSupabase
    .from("fees")
    .delete()
    .eq("id", id)
    .eq("club_id", context.profile.club_id);

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
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || "No autenticado");
  }

  const adminSupabase = await createAdminClient();

  const access = await canUserAccessFee(adminSupabase, context, feeId);
  if (!access.allowed) {
    throw new Error(access.reason || "No autorizado para ver los pagos de esta cuota");
  }

  const { data, error } = await adminSupabase
    .from("fee_payments")
    .select("*")
    .eq("fee_id", feeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function addPartialPaymentAction(feeId: string, amountCents: number, method: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || "No autenticado");
  }

  const adminSupabase = await createAdminClient();

  // Validar permisos sobre la cuota (aislamiento de club y relación con la cuota)
  const access = await canUserAccessFee(adminSupabase, context, feeId);
  if (!access.allowed || !access.fee) {
    throw new Error(access.reason || "No autorizado para registrar pagos en esta cuota");
  }

  // 1. Get current fee to validate
  const { data: fee, error: feeError } = await adminSupabase
    .from("fees")
    .select("id, club_id, amount_cents, amount_paid_cents")
    .eq("id", feeId)
    .single();

  if (feeError || !fee) throw new Error("Cuota no encontrada");
  if (fee.club_id !== context.profile.club_id) throw new Error("La cuota no pertenece a tu club");

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
    .eq("id", feeId)
    .eq("club_id", context.profile.club_id);

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
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || "No autenticado");
  }

  const adminSupabase = await createAdminClient();

  const { data: payment, error: paymentError } = await adminSupabase
    .from("fee_payments")
    .select("id, fee_id, receipt_path")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    throw new Error("Pago no encontrado");
  }

  const access = await canUserAccessFee(adminSupabase, context, payment.fee_id);
  if (!access.allowed) {
    throw new Error(access.reason || "No autorizado para descargar este recibo de pago");
  }

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
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || "No autenticado");
  }

  const adminSupabase = await createAdminClient();

  const access = await canUserAccessFee(adminSupabase, context, feeId);
  if (!access.allowed) {
    throw new Error(access.reason || "No autorizado para descargar este recibo de cuota");
  }

  const res = await generateAndUploadReceiptAction(feeId);

  const { data: fee } = await adminSupabase
    .from("fees")
    .select("players(first_name, last_name)")
    .eq("id", feeId)
    .single();

  const pObj: any = Array.isArray(fee?.players) ? fee?.players[0] : fee?.players;
  const playerName = pObj ? `${pObj.first_name}_${pObj.last_name}` : "Socio";
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
    let pendingVerificationCount = 0;

    playerFees.forEach((f: any) => {
      totalChargedCents += f.amount_cents || 0;
      
      let paid = f.amount_paid_cents || 0;
      if (f.estado === "pagado" && paid === 0) {
        paid = f.amount_cents || 0;
      }
      totalPaidCents += paid;

      if (f.estado === "pendiente") {
        pendingFeesCount++;
      } else if (f.estado === "pdte_verif" || f.estado === "pendiente_verificacion") {
        pendingVerificationCount++;
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
      pending_verification_count: pendingVerificationCount,
    };
  });

  // Global KPIs
  const totalCharged = memberBalances.reduce((acc, m) => acc + m.total_charged_cents, 0) / 100;
  const totalPaid = memberBalances.reduce((acc, m) => acc + m.total_paid_cents, 0) / 100;
  const totalPending = memberBalances.reduce((acc, m) => acc + Math.max(0, m.balance_cents), 0) / 100;
  const membersAlDia = memberBalances.filter(m => m.status === "al_dia" || m.status === "saldo_favor").length;
  const membersConDeuda = memberBalances.filter(m => m.status === "con_deuda").length;
  const membersPorVerificar = memberBalances.filter(m => m.pending_verification_count > 0).length;

  return {
    success: true,
    members: memberBalances,
    summary: {
      totalCharged,
      totalPaid,
      totalPending,
      membersAlDia,
      membersConDeuda,
      membersPorVerificar,
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
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) throw new Error(authError || "No autenticado");

  if (!TREASURY_ADMIN_ROLES.includes(context.profile.role)) {
    throw new Error("No tienes permisos de tesorería para consultar los recibos");
  }

  const clubId = context.profile.club_id;
  if (!clubId) throw new Error("Club no encontrado");

  const adminSupabase = await createAdminClient();

  // 1. Intentar sincronizar recibos de todas las cuotas pagadas o con entregas a cuenta
  try {
    const { data: paidFees } = await adminSupabase
      .from("fees")
      .select("id, amount_cents, amount_paid_cents, concept, payment_method, creado_en, player_id, club_id, estado, players(first_name, last_name, club_id)")
      .or("estado.eq.pagado,amount_paid_cents.gt.0");

    if (paidFees && paidFees.length > 0) {
      const clubFees = paidFees.filter((f: any) => {
        const pClub = Array.isArray(f.players) ? f.players[0]?.club_id : f.players?.club_id;
        return f.club_id === clubId || pClub === clubId;
      });

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
    return receipts.map((r: any) => {
      let playerName = "General";
      const pObj = Array.isArray(r.players) ? r.players[0] : r.players;
      if (pObj) {
        playerName = `${pObj.first_name} ${pObj.last_name}`;
      } else if (r.concept && r.concept.includes("Pagador:")) {
        const parts = r.concept.split("Pagador:");
        playerName = parts[1].trim();
      }

      return {
        id: r.id,
        receipt_number: r.receipt_number,
        sequence_number: r.sequence_number,
        created_at: r.created_at,
        player_name: playerName,
        concept: r.concept,
        amount_cents: r.amount_cents,
        payment_method: r.payment_method || "Contado",
        status: r.status || "emitido",
        pdf_path: r.pdf_path,
        fee_id: r.fee_id,
      };
    });
  }

  // Fallback de respaldo: Si la tabla no devuelve filas, construir la lista directamente desde cuotas pagadas
  const { data: fallbackFees } = await adminSupabase
    .from("fees")
    .select("id, amount_cents, amount_paid_cents, concept, payment_method, creado_en, estado, player_id, club_id, players(first_name, last_name, club_id)")
    .or("estado.eq.pagado,amount_paid_cents.gt.0")
    .order("creado_en", { ascending: false });

  const clubFallbackFees = (fallbackFees || []).filter((f: any) => {
    const pClub = Array.isArray(f.players) ? f.players[0]?.club_id : f.players?.club_id;
    return f.club_id === clubId || pClub === clubId;
  });

  return clubFallbackFees.map((f: any, idx: number) => {
    const d = new Date(f.creado_en || Date.now());
    const dayStr = String(d.getDate()).padStart(2, "0");
    const monthStr = String(d.getMonth() + 1).padStart(2, "0");
    const yearStr = String(d.getFullYear());
    const datePrefix = `${dayStr}${monthStr}${yearStr}`;
    const seqStr = String(clubFallbackFees.length - idx).padStart(4, "0");
    const receiptNumber = `${datePrefix}-${seqStr}`;

    const paidCents = f.estado === "pagado" ? f.amount_cents : (f.amount_paid_cents || 0);

    let playerName = "General";
    if (f.players) {
      playerName = `${f.players.first_name} ${f.players.last_name}`;
    } else if (f.concept && f.concept.includes("Pagador:")) {
      playerName = f.concept.split("Pagador:")[1].trim();
    }

    return {
      id: f.id,
      receipt_number: receiptNumber,
      sequence_number: clubFallbackFees.length - idx,
      created_at: f.creado_en || new Date().toISOString(),
      player_name: playerName,
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
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) throw new Error(authError || "No autenticado");

  const adminSupabase = await createAdminClient();

  const { data: receipt } = await adminSupabase
    .from("official_receipts")
    .select("*, players(id, first_name, last_name, club_id, tutor_id)")
    .eq("id", receiptId)
    .single();

  let targetFeeId = receipt?.fee_id;
  let receiptClubId = receipt?.club_id;
  let receiptPlayerTutorId = (receipt?.players as any)?.tutor_id;

  let feeData: any = null;
  if (!receipt) {
    const { data: fee } = await adminSupabase
      .from("fees")
      .select("*, players(id, first_name, last_name, club_id, tutor_id)")
      .eq("id", receiptId)
      .single();
    feeData = fee;
    if (fee) {
      targetFeeId = fee.id;
      receiptClubId = fee.club_id;
      receiptPlayerTutorId = (fee.players as any)?.tutor_id;
    }
  }

  if (!receipt && !feeData) {
    throw new Error("Recibo no encontrado");
  }

  // Comprobar autorización: Tesorería del mismo club o familia propietaria
  const isTreasury = TREASURY_ADMIN_ROLES.includes(context.profile.role) && context.profile.club_id === receiptClubId;
  const isOwner = (context.profile.role === 'familia' || context.profile.role === 'family') && (receiptPlayerTutorId === context.user.id || (feeData && feeData.profile_id === context.user.id));

  if (!isTreasury && !isOwner) {
    throw new Error("No autorizado para descargar este recibo");
  }

  let path = receipt?.pdf_path;
  let receiptNum = receipt?.receipt_number;

  // Si no se encuentra en official_receipts por ID, buscar en fees
  if (!receipt && feeData) {
    if (feeData.tipo_cargo === "manual_receipt" && feeData.receipt_path) {
      path = feeData.receipt_path;
      receiptNum = feeData.concept?.split("-")[0] || "REC";
    } else {
      const res = await generateAndUploadReceiptAction(feeData.id);
      path = res.path;
      receiptNum = res.receiptNumber;
    }
  } else if (receipt?.fee_id && !path) {
    const res = await generateAndUploadReceiptAction(receipt.fee_id);
    path = res.path;
  }

  if (path) {
    let playerName = "Pagador";
    if (receipt?.players) {
      playerName = `${(receipt.players as any).first_name}_${(receipt.players as any).last_name}`;
    } else if (receipt?.concept && receipt.concept.includes("Pagador:")) {
      playerName = receipt.concept.split("Pagador:")[1].trim().split(" ")[0];
    }

    const sanitizedName = playerName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `Recibo_${receiptNum || 'Pago'}_${sanitizedName}.pdf`;

    const { data: signedData } = await adminSupabase.storage
      .from("recibos_pagos")
      .createSignedUrl(path, 900, { download: fileName });

    if (signedData?.signedUrl) {
      return { success: true, url: signedData.signedUrl, fileName };
    }
  }

  throw new Error("No se pudo obtener el PDF del recibo");
}


export async function updateFeeAmountAction(feeId: string, newAmountCents: number, reason?: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || "No autenticado");
  }

  if (!TREASURY_ADMIN_ROLES.includes(context.profile.role)) {
    throw new Error("No tienes permisos de tesorería para modificar el importe de cuotas");
  }

  const adminSupabase = await createAdminClient();

  if (newAmountCents < 0) {
    throw new Error("El importe de la cuota no puede ser negativo.");
  }

  const { data: fee, error: feeErr } = await adminSupabase
    .from("fees")
    .select("id, club_id, amount_paid_cents, concept")
    .eq("id", feeId)
    .single();

  if (feeErr || !fee) throw new Error("Cuota no encontrada");

  if (fee.club_id !== context.profile.club_id) {
    throw new Error("La cuota no pertenece a tu club");
  }

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
    .eq("id", feeId)
    .eq("club_id", context.profile.club_id);

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

  // 1. Generate receipt number DDMMAAAA-XXXX with global consecutive sequence
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
    .order("sequence_number", { ascending: false })
    .limit(1)
    .single();

  const { count: paidCount } = await adminSupabase
    .from("fees")
    .select("id", { count: "exact", head: true });

  const maxExistingSeq = Math.max(lastReceipt?.sequence_number || 0, paidCount || 0);
  const nextSeq = maxExistingSeq + 1;
  const seqStr = String(nextSeq).padStart(4, "0");
  const receiptNumber = `${datePrefix}-${seqStr}`;

  const sanitizedName = params.payerName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const storagePath = `manual_receipts/${receiptNumber}_${sanitizedName}.pdf`;

  // 2. Insert into fees table for 100% guaranteed persistence across fallbacks
  const { data: createdFee } = await adminSupabase
    .from("fees")
    .insert({
      club_id: clubId,
      concept: `${params.concept} - Pagador: ${params.payerName}`,
      amount_cents: params.amountCents,
      amount_paid_cents: params.amountCents,
      estado: "pagado",
      payment_method: params.paymentMethod || "Contado",
      tipo_cargo: "manual_receipt",
      receipt_path: storagePath,
      creado_en: now.toISOString(),
    })
    .select("id")
    .single();

  // 3. Generate PDF
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

  const fileName = `Recibo_${receiptNumber}_${sanitizedName}.pdf`;

  await adminSupabase.storage
    .from("recibos_pagos")
    .upload(storagePath, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });

  // 4. Record in official_receipts table
  await adminSupabase.from("official_receipts").insert({
    club_id: clubId,
    fee_id: createdFee?.id || null,
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

// ─────────────────────────────────────────────────────────────────────────────
// P11-F: Generador de Remesa SEPA XML para Tesorería
// ─────────────────────────────────────────────────────────────────────────────

export interface PendingSepaFeeItem {
  id: string;
  concept: string;
  amountCents: number;
  amountFormatted: string;
  status: string;
  paymentMethod: string;
  playerId: string;
  playerName: string;
  isSenior: boolean;
  debtorName: string;
  debtorIban: string | null;
  mandateId: string | null;
  mandateDate: string | null;
  isValid: boolean;
  validationErrors: string[];
}

export interface ClubSepaStatus {
  clubId: string;
  clubName: string;
  creditorId: string | null;
  creditorIban: string | null;
  isValid: boolean;
  errors: string[];
}

interface FeeWithPlayerRow {
  id: string;
  concept: string | null;
  amount_cents: number;
  estado: string;
  payment_method: string | null;
  club_id: string;
  player_id: string;
  players: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    dni: string | null;
    is_senior: boolean | null;
    parent1_name: string | null;
    parent1_last_name: string | null;
    parent1_dni: string | null;
    iban: string | null;
    sepa_mandate_id: string | null;
    sepa_mandate_date: string | null;
  } | null;
}

/**
 * Consulta las cuotas domiciliadas pendientes de remesar para el club activo,
 * evaluando su aptitud y datos SEPA según las reglas de pagador (senior vs tutor parent1_*).
 */
export async function getPendingDirectDebitFeesAction(): Promise<{
  success: boolean;
  clubSepa?: ClubSepaStatus;
  fees?: PendingSepaFeeItem[];
  totalAmountCents?: number;
  error?: string;
}> {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || 'No autenticado' };
    }

    if (!TREASURY_ADMIN_ROLES.includes(context.profile.role)) {
      return { success: false, error: 'No tienes permisos de Tesorería para acceder a las remesas SEPA' };
    }

    const adminSupabase = await createAdminClient();

    // 1. Obtener datos SEPA del Club
    const { data: club, error: clubError } = await adminSupabase
      .from('clubs')
      .select('id, name, sepa_creditor_id, sepa_iban')
      .eq('id', context.profile.club_id)
      .single();

    if (clubError || !club) {
      return { success: false, error: 'No se pudo cargar la información del club' };
    }

    const { validateIban } = await import('@/lib/sepa/sepaGenerator');

    const clubErrors: string[] = [];
    if (!club.sepa_creditor_id?.trim()) {
      clubErrors.push('Falta el Identificador de acreedor SEPA del club');
    }
    if (!club.sepa_iban?.trim()) {
      clubErrors.push('Falta el IBAN del club');
    } else {
      const ibanCheck = validateIban(club.sepa_iban);
      if (!ibanCheck.valid) {
        clubErrors.push(`IBAN del club inválido (${ibanCheck.reason})`);
      }
    }

    const clubSepa: ClubSepaStatus = {
      clubId: club.id,
      clubName: club.name || 'Club Deportivo',
      creditorId: club.sepa_creditor_id || null,
      creditorIban: club.sepa_iban || null,
      isValid: clubErrors.length === 0,
      errors: clubErrors,
    };

    // 2. Obtener cuotas pendientes domiciliadas
    const { data: fees, error: feesError } = await adminSupabase
      .from('fees')
      .select(`
        id, concept, amount_cents, estado, payment_method, player_id,
        players (
          id, first_name, last_name, dni, is_senior,
          parent1_name, parent1_last_name, parent1_dni,
          iban, sepa_mandate_id, sepa_mandate_date
        )
      `)
      .eq('club_id', context.profile.club_id)
      .in('estado', ['pending', 'pendiente', 'pdte_verif', 'pendiente_verificacion'])
      .ilike('payment_method', '%domicilia%')
      .order('creado_en', { ascending: true });

    if (feesError) {
      console.error('[getPendingDirectDebitFeesAction] Error consultando cuotas');
      return { success: false, error: 'Error al consultar cuotas domiciliadas' };
    }

    const pendingItems: PendingSepaFeeItem[] = [];
    let totalCents = 0;

    const typedFees = (fees as unknown as FeeWithPlayerRow[]) || [];
    for (const f of typedFees) {
      const player = f.players;
      const isSenior = Boolean(player?.is_senior);

      // Regla de Pagador P11-F:
      // Si players.is_senior = true: deudor = jugador (first_name, last_name)
      // Si players.is_senior = false: deudor = parent1_* (parent1_name, parent1_last_name)
      let debtorName = '';
      if (isSenior) {
        debtorName = `${player?.first_name || ''} ${player?.last_name || ''}`.trim();
      } else {
        debtorName = `${player?.parent1_name || ''} ${player?.parent1_last_name || ''}`.trim() || player?.parent1_name || '';
      }

      const debtorIban = player?.iban || null;
      const mandateId = player?.sepa_mandate_id || null;
      const mandateDate = player?.sepa_mandate_date || null;

      const itemErrors: string[] = [];

      if (!debtorName) {
        itemErrors.push('Falta el nombre del deudor');
      }
      if (!debtorIban) {
        itemErrors.push('Falta el IBAN del deudor');
      } else {
        const ibanCheck = validateIban(debtorIban);
        if (!ibanCheck.valid) {
          itemErrors.push(`IBAN no válido (${ibanCheck.reason})`);
        }
      }
      if (!mandateId) {
        itemErrors.push('Falta la referencia de mandato SEPA');
      }
      if (!mandateDate) {
        itemErrors.push('Falta la fecha de mandato SEPA');
      }
      if (!f.amount_cents || f.amount_cents <= 0) {
        itemErrors.push('Importe de la cuota debe ser mayor que cero');
      }

      const isValid = itemErrors.length === 0;

      pendingItems.push({
        id: f.id,
        concept: f.concept || 'Cuota club',
        amountCents: f.amount_cents,
        amountFormatted: (f.amount_cents / 100).toFixed(2),
        status: f.estado,
        paymentMethod: f.payment_method || 'domiciliacion',
        playerId: f.player_id,
        playerName: `${player?.first_name || ''} ${player?.last_name || ''}`.trim() || 'Jugador sin nombre',
        isSenior,
        debtorName: debtorName || 'Sin pagador asignado',
        debtorIban,
        mandateId,
        mandateDate,
        isValid,
        validationErrors: itemErrors,
      });

      totalCents += f.amount_cents;
    }

    return {
      success: true,
      clubSepa,
      fees: pendingItems,
      totalAmountCents: totalCents,
    };
  } catch {
    return { success: false, error: 'Error al recuperar cuotas domiciliadas pendientes' };
  }
}

/**
 * Genera el archivo SEPA XML (ISO 20022 / pain.008.001.02) a partir de cuotas existentes.
 * Realiza todas las validaciones obligatorias sin efectos destructivos sobre las cuotas.
 */
export async function generateSepaRemittanceAction(params?: {
  feeIds?: string[];
  collectionDate?: string;
}): Promise<{
  success: boolean;
  xml?: string;
  filename?: string;
  totalAmount?: number;
  txCount?: number;
  error?: string;
}> {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || 'No autenticado' };
    }

    if (!TREASURY_ADMIN_ROLES.includes(context.profile.role)) {
      return { success: false, error: 'No tienes permisos de Tesorería para generar remesas SEPA' };
    }

    const adminSupabase = await createAdminClient();

    // 1. Validar datos del Club (Acreedor)
    const { data: club, error: clubError } = await adminSupabase
      .from('clubs')
      .select('id, name, sepa_creditor_id, sepa_iban')
      .eq('id', context.profile.club_id)
      .single();

    if (clubError || !club) {
      return { success: false, error: 'Club no encontrado' };
    }

    if (!club.sepa_creditor_id?.trim()) {
      return {
        success: false,
        error: 'No se puede generar la remesa: Falta el Identificador de acreedor SEPA del club. Configúralo en Configuración del Club.',
      };
    }

    if (!club.sepa_iban?.trim()) {
      return {
        success: false,
        error: 'No se puede generar la remesa: Falta el IBAN del club. Configúralo en Configuración del Club.',
      };
    }

    const { validateIban, generateSepaXml } = await import('@/lib/sepa/sepaGenerator');

    const clubIbanCheck = validateIban(club.sepa_iban);
    if (!clubIbanCheck.valid) {
      return {
        success: false,
        error: `No se puede generar la remesa: El IBAN del club no es válido (${clubIbanCheck.reason}).`,
      };
    }

    // 2. Consultar cuotas a incluir
    let query = adminSupabase
      .from('fees')
      .select(`
        id, concept, amount_cents, estado, payment_method, club_id, player_id,
        players (
          id, first_name, last_name, dni, is_senior,
          parent1_name, parent1_last_name, parent1_dni,
          iban, sepa_mandate_id, sepa_mandate_date
        )
      `)
      .eq('club_id', context.profile.club_id)
      .in('estado', ['pending', 'pendiente', 'pdte_verif', 'pendiente_verificacion'])
      .ilike('payment_method', '%domicilia%');

    if (params?.feeIds && params.feeIds.length > 0) {
      query = query.in('id', params.feeIds);
    }

    const { data: fees, error: feesError } = await query;

    if (feesError || !fees || fees.length === 0) {
      return {
        success: false,
        error: 'No se encontraron cuotas domiciliadas pendientes válidas para generar la remesa.',
      };
    }

    // 3. Validaciones Obligatorias de cada cuota
    const transactions = [];

    const typedFees = (fees as unknown as FeeWithPlayerRow[]) || [];
    for (const f of typedFees) {
      // Verificación de aislamiento multi-tenant
      if (f.club_id !== context.profile.club_id) {
        return {
          success: false,
          error: 'Violación de seguridad: Una o más cuotas no pertenecen a tu club.',
        };
      }

      const player = f.players;
      const isSenior = Boolean(player?.is_senior);
      const playerName = `${player?.first_name || ''} ${player?.last_name || ''}`.trim() || 'Jugador';

      // Validación de importe
      if (!f.amount_cents || f.amount_cents <= 0) {
        return {
          success: false,
          error: `No se puede generar la remesa: La cuota de "${playerName}" tiene un importe igual o inferior a cero.`,
        };
      }

      // Regla de Pagador P11-F
      let debtorName = '';
      if (isSenior) {
        debtorName = `${player?.first_name || ''} ${player?.last_name || ''}`.trim();
      } else {
        debtorName = `${player?.parent1_name || ''} ${player?.parent1_last_name || ''}`.trim() || player?.parent1_name || '';
      }

      if (!debtorName) {
        return {
          success: false,
          error: `No se puede generar la remesa: Falta el nombre del deudor para la cuota de "${playerName}".`,
        };
      }

      // Validación de IBAN deudor
      const debtorIban = player?.iban?.trim();
      if (!debtorIban) {
        return {
          success: false,
          error: `No se puede generar la remesa: Falta el IBAN para la cuota de "${playerName}".`,
        };
      }

      const debtorIbanCheck = validateIban(debtorIban);
      if (!debtorIbanCheck.valid) {
        return {
          success: false,
          error: `No se puede generar la remesa: El IBAN de "${playerName}" no es válido (${debtorIbanCheck.reason}).`,
        };
      }

      // Validación de mandato SEPA
      const mandateId = player?.sepa_mandate_id?.trim();
      if (!mandateId) {
        return {
          success: false,
          error: `No se puede generar la remesa: Falta la referencia de mandato SEPA para "${playerName}".`,
        };
      }

      const mandateDate = player?.sepa_mandate_date ? String(player.sepa_mandate_date).trim() : '';
      if (!mandateDate) {
        return {
          success: false,
          error: `No se puede generar la remesa: Falta la fecha de mandato SEPA para "${playerName}".`,
        };
      }

      transactions.push({
        feeId: f.id,
        amountCents: f.amount_cents,
        concept: f.concept || 'Cuota deportiva',
        debtorIban,
        debtorName,
        mandateId,
        mandateDate,
        endToEndId: `FEE-${f.id.replace(/-/g, '').slice(0, 20)}`,
      });
    }

    // 4. Generar XML SEPA
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const messageId = `MSG-${club.id.replace(/-/g, '').slice(0, 8)}-${dateStr}-${Date.now().toString().slice(-6)}`;

    const xml = generateSepaXml({
      header: {
        messageId,
        creditorName: club.name || 'Club Deportivo',
        creditorIban: club.sepa_iban,
        creditorId: club.sepa_creditor_id,
        collectionDate: params?.collectionDate,
      },
      transactions,
    });

    const totalAmount = transactions.reduce((acc, t) => acc + t.amountCents, 0) / 100;
    const filename = `remesa_sepa_${dateStr}_${transactions.length}recibos.xml`;

    return {
      success: true,
      xml,
      filename,
      totalAmount,
      txCount: transactions.length,
    };
  } catch {
    return {
      success: false,
      error: 'Error al generar el archivo XML de la remesa SEPA',
    };
  }
}



