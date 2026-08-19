/**
 * Motor Determinista de Validación Metodológica y Control de Calidad v1.0
 * Antigravity Methodology OS - Fase 6.7
 *
 * CALIDAD DEL DATO ≠ CALIDAD DE LA DECISIÓN ≠ RESULTADO
 */

function assessDataQuality(params) {
  const { sessions = [], evaluations = [], teamCount = 0, clubId } = params;

  if (!clubId) {
    throw new Error("clubId obligatorio para auditar calidad de datos.");
  }

  const alerts = [];
  let totalSessions = sessions.length;
  let evaluatedSessions = evaluations.length;

  // 1. Completitud
  const completenessRate = totalSessions > 0 ? Number(((evaluatedSessions / totalSessions) * 100).toFixed(1)) : 100;
  if (completenessRate < 60) {
    alerts.push({
      alert_id: "alt-completeness-low",
      tipo: "DATOS_INCOMPLETOS",
      severidad: "ALTA",
      descripcion: `Completitud de evaluaciones (${completenessRate}%) por debajo del umbral óptimo.`,
      recomendacion: "Auditar registro post-sesión de cuerpos técnicos."
    });
  }

  // 2. Consistencia y Validez
  let invalidScoresCount = 0;
  evaluations.forEach((ev) => {
    if (ev.objective_achievement !== undefined && (ev.objective_achievement < 1 || ev.objective_achievement > 4)) {
      invalidScoresCount++;
    }
  });

  if (invalidScoresCount > 0) {
    alerts.push({
      alert_id: "alt-invalid-scores",
      tipo: "DATOS_INCONSISTENTES",
      severidad: "CRITICA",
      descripcion: `Se detectaron ${invalidScoresCount} evaluaciones con notas fuera de rango [1-4].`,
      recomendacion: "Corregir registros en base de datos."
    });
  }

  // 3. Suficiencia de Evidencia (Regla N < 3)
  if (evaluatedSessions < 3) {
    alerts.push({
      alert_id: "alt-insufficient-evidence",
      tipo: "EVIDENCIA_INSUFICIENTE",
      severidad: "MEDIA",
      descripcion: `Muestra N=${evaluatedSessions} < 3. Bloqueada inferencia estadística robusta.`,
      recomendacion: "Acumular más sesiones evaluadas antes de proyectar conclusiones."
    });
  }

  // 4. Perfil de Calidad Global
  let qualityProfile = "ALTA";
  if (alerts.some((a) => a.severidad === "CRITICA")) qualityProfile = "MUY_BAJA";
  else if (completenessRate < 50 || evaluatedSessions < 3) qualityProfile = "BAJA";
  else if (completenessRate < 75) qualityProfile = "MEDIA";

  return {
    club_id: clubId,
    metrics: {
      totalSessions,
      evaluatedSessions,
      completenessRate,
      invalidScoresCount,
      teamCount
    },
    qualityProfile,
    confidenceLevel: qualityProfile === "ALTA" ? "CONFIANZA_ALTA" : qualityProfile === "MEDIA" ? "CONFIANZA_MEDIA" : "CONFIANZA_BAJA",
    alerts,
    audited_at: "DETERMINISTIC_TIMESTAMP"
  };
}

module.exports = {
  assessDataQuality
};
