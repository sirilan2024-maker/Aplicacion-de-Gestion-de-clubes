"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  FileText, 
  Download, 
  Search, 
  Calendar, 
  Trophy, 
  Camera, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ChevronRight,
  Shield, 
  Eye, 
  X, 
  Printer,
  ArrowUpDown,
  Clock,
  User,
  Users
} from "lucide-react"

interface TeamPostMatchReportsViewProps {
  teamId: string
  teamName: string
  matches: any[]
  players: any[]
  convocatorias: any[]
}

export function TeamPostMatchReportsView({
  teamId,
  teamName,
  matches = [],
  players = [],
  convocatorias = []
}: TeamPostMatchReportsViewProps) {
  const [selectedJornada, setSelectedJornada] = useState<string>("all")
  const [searchRival, setSearchRival] = useState<string>("")
  const [onlyWithReport, setOnlyWithReport] = useState<boolean>(false)
  const [filterPlayedOnly, setFilterPlayedOnly] = useState<boolean>(false)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc') // Por defecto 'asc': Cronológico (Jornada 1 -> 30)
  const [activePreviewMatch, setActivePreviewMatch] = useState<any | null>(null)

  // 1. Filtrar partidos válidos de la temporada activa (excluir permanentemente temporada 25/26)
  // y garantizar que todos los partidos tengan su jornada asignada
  const validMatches = useMemo(() => {
    const rawFiltered = (matches || []).filter(m => 
      m.season_id !== '584f508a-fc1a-4339-b5b2-4296ffde2f4c'
    )

    // Ordenar por fecha cronológica para fallback de jornadas
    const sorted = [...rawFiltered].sort((a, b) => {
      const dA = a.fecha_hora ? new Date(a.fecha_hora).getTime() : 0
      const dB = b.fecha_hora ? new Date(b.fecha_hora).getTime() : 0
      return dA - dB
    })

    return sorted.map((m, idx) => {
      let j = m.jornada
      if (!j && m.acta_oficial_url) {
        const jMatch = m.acta_oficial_url.match(/jornada=(\d+)/i) || m.acta_oficial_url.match(/Jornada%20(\d+)/i)
        if (jMatch) j = parseInt(jMatch[1], 10)
      }
      if (!j) {
        j = idx + 1
      }
      return {
        ...m,
        jornada: j
      }
    })
  }, [matches])

  // 2. Extraer lista de jornadas disponibles en orden ascendente
  const availableJornadas = useMemo(() => {
    const jSet = new Set<string>()
    validMatches.forEach(m => {
      if (m.jornada != null && m.jornada !== '') {
        jSet.add(m.jornada.toString())
      }
    })
    return Array.from(jSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, "")) || 0
      const numB = parseInt(b.replace(/\D/g, "")) || 0
      return numA - numB
    })
  }, [validMatches])

  // Función para parsear de forma segura coach_report
  const getCoachReportData = (match: any) => {
    if (!match?.coach_report) return {}
    if (typeof match.coach_report === 'object') return match.coach_report
    try {
      return JSON.parse(match.coach_report)
    } catch {
      return {}
    }
  }

  // Comprobar si un partido tiene algún informe o análisis registrado
  const checkHasReport = (m: any) => {
    if (m.coach_rating || m.coach_summary || m.positive_aspects || m.improvement_aspects || m.attitude_notes) {
      return true
    }
    const rep = getCoachReportData(m)
    if (rep.team_photo_url) return true
    if (rep.rival_analysis && Object.values(rep.rival_analysis).some(v => Boolean(v && String(v).trim()))) {
      return true
    }
    return false
  }

  // Extraer rendimiento de jugadores convocados y no convocados
  const getMatchPlayersPerformance = (match: any) => {
    const matchConvs = convocatorias.filter(c => c.partido_id === match.id)
    
    // 1. Jugadores en la convocatoria del partido
    const convocados = matchConvs.map(c => {
      const p = players.find(pl => pl.id === c.player_id)
      const rawMinutes = c.minutes_played ?? c.minutos_jugados ?? 0
      const isAusente = c.estado_asistencia === 'Ausente' || c.estado_asistencia === 'Justificado' || c.status === 'no_convocado'
      const minutes = isAusente ? 0 : rawMinutes
      const noJugo = isAusente || minutes === 0

      let statusLabel = 'Jugó'
      if (c.status === 'no_convocado' || c.estado_asistencia === 'No Convocado') {
        statusLabel = 'No Convocado'
      } else if (c.estado_asistencia === 'Ausente' || c.estado_asistencia === 'Justificado') {
        statusLabel = c.estado_asistencia === 'Justificado' ? 'Ausente (Justificado)' : 'Ausente'
      } else if (noJugo) {
        statusLabel = 'No jugó (Sin minutos)'
      }

      return {
        id: c.player_id || c.id,
        number: p?.dorsal || c.dorsal || '-',
        name: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Jugador',
        pos: c.slotLabel || p?.posicion || 'JUG',
        titular: Boolean(c.titular) && !noJugo,
        avatarUrl: p?.avatar_url || null,
        avatar: p ? `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase() || 'J' : 'J',
        minutes: minutes,
        noJugo: noJugo,
        rating: noJugo ? 0 : (c.coach_rating || 0),
        actitud: noJugo ? 0 : (c.actitud || 0),
        goals: c.goals || 0,
        assists: c.assists || 0,
        yellows: c.yellow_cards || 0,
        reds: c.red_cards || 0,
        status: statusLabel
      }
    })

    // 2. Jugadores del equipo no convocados para este partido
    const convPlayerIds = new Set(matchConvs.map(c => c.player_id))
    const noConvocados = (players || [])
      .filter(p => !convPlayerIds.has(p.id) && !(p.posicion || '').toLowerCase().includes('entrenador') && !(p.posicion || '').toLowerCase().includes('delegado'))
      .map(p => ({
        id: p.id,
        number: p.dorsal || '-',
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        pos: p.posicion || 'JUG',
        titular: false,
        avatarUrl: p.avatar_url || null,
        avatar: `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase() || 'J',
        minutes: 0,
        noJugo: true,
        rating: 0,
        actitud: 0,
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0,
        status: 'No Convocado'
      }))

    return [...convocados, ...noConvocados]
  }

  // 3. Filtrar y ordenar partidos según controles
  // POR DEFECTO: Cronológico ascendente (Jornada 1 -> 30, o fechas tempranas primero)
  const filteredMatches = useMemo(() => {
    return validMatches.filter(m => {
      if (selectedJornada !== "all") {
        if (m.jornada?.toString() !== selectedJornada) return false
      }

      if (searchRival.trim()) {
        const query = searchRival.toLowerCase().trim()
        const rival = (m.rival_nombre || "").toLowerCase()
        if (!rival.includes(query)) return false
      }

      if (onlyWithReport) {
        if (!checkHasReport(m)) return false
      }

      if (filterPlayedOnly) {
        const isPlayed = m.estado === 'Finalizado' || (m.fecha_hora && new Date(m.fecha_hora).getTime() <= Date.now())
        if (!isPlayed) return false
      }

      return true
    }).sort((a, b) => {
      // 1. Priorizar orden numérico de jornada si existe
      const numA = parseInt(String(a.jornada || '').replace(/\D/g, '')) || 0
      const numB = parseInt(String(b.jornada || '').replace(/\D/g, '')) || 0
      if (numA > 0 && numB > 0 && numA !== numB) {
        return sortOrder === 'asc' ? numA - numB : numB - numA
      }

      // 2. Orden cronológico por fecha_hora
      const dateA = a.fecha_hora ? new Date(a.fecha_hora).getTime() : 0
      const dateB = b.fecha_hora ? new Date(b.fecha_hora).getTime() : 0
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })
  }, [validMatches, selectedJornada, searchRival, onlyWithReport, filterPlayedOnly, sortOrder])

  // Generación y descarga directa en PDF / Imprimir informe completo
  const handlePrintPdf = (match: any) => {
    const coachRep = getCoachReportData(match)
    const matchPlayers = getMatchPlayersPerformance(match)
    const starters = matchPlayers.filter(p => p.titular && !p.noJugo)
    const bench = matchPlayers.filter(p => !p.titular && !p.noJugo && p.minutes > 0)
    const unplayed = matchPlayers.filter(p => p.noJugo || p.minutes === 0)

    const dateFormatted = match.fecha_hora 
      ? new Date(match.fecha_hora).toLocaleDateString('es-ES', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Fecha pendiente'

    const printWindow = window.open('', '_blank', 'width=900,height=1000')
    if (!printWindow) {
      alert("Por favor permite las ventanas emergentes para generar el PDF.")
      return
    }

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Informe Post-Partido - ${match.rival_nombre || 'Rival'} - Sporting Saladar</title>
        <style>
          @page {
            size: A4;
            margin: 14mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #fff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .title-area h1 {
            font-size: 20px;
            font-weight: 900;
            margin: 0;
            text-transform: uppercase;
            color: #1e3a8a;
            letter-spacing: 0.5px;
          }
          .title-area p {
            font-size: 11px;
            margin: 3px 0 0 0;
            color: #64748b;
            font-weight: 600;
          }
          .score-badge {
            font-size: 22px;
            font-weight: 900;
            background: #0f172a;
            color: #fff;
            padding: 6px 16px;
            border-radius: 8px;
            letter-spacing: 2px;
          }
          .match-details-bar {
            display: flex;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
            margin-bottom: 16px;
            font-size: 11px;
            justify-content: space-between;
          }
          .match-details-bar div {
            display: flex;
            flex-direction: column;
          }
          .match-details-bar span {
            font-size: 9px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
          }
          .match-details-bar strong {
            font-size: 12px;
            color: #0f172a;
          }
          .photo-container {
            text-align: center;
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 6px;
            background: #fafafa;
          }
          .photo-container img {
            max-width: 100%;
            max-height: 240px;
            border-radius: 6px;
            object-fit: cover;
          }
          .section {
            margin-bottom: 16px;
          }
          .section-title {
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
            color: #1e3a8a;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .card-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 10px;
          }
          .card-box h4 {
            margin: 0 0 4px 0;
            font-size: 10px;
            text-transform: uppercase;
            color: #475569;
          }
          .card-box p {
            margin: 0;
            font-size: 10.5px;
            color: #1e293b;
            white-space: pre-wrap;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
            margin-top: 6px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
            text-align: left;
          }
          th {
            background: #f1f5f9;
            font-weight: 800;
            text-transform: uppercase;
            color: #475569;
          }
          .center { text-align: center; }
          .footer-note {
            margin-top: 18px;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <h1>Sporting Saladar - Informe Post-Partido</h1>
            <p>${teamName} &bull; Jornada ${match.jornada || '-'} &bull; ${match.competicion_nombre || 'Competición Oficial'}</p>
          </div>
          <div class="score-badge">
            ${match.resultado_propio != null && match.resultado_rival != null 
              ? `${match.resultado_propio} - ${match.resultado_rival}` 
              : 'FINALIZADO'}
          </div>
        </div>

        <div class="match-details-bar">
          <div>
            <span>Fecha y Hora</span>
            <strong>${dateFormatted}</strong>
          </div>
          <div>
            <span>Rival</span>
            <strong>${match.rival_nombre || 'Rival no definido'}</strong>
          </div>
          <div>
            <span>Condición</span>
            <strong>${match.lugar || 'Campo'}</strong>
          </div>
          <div>
            <span>Nota del Partido</span>
            <strong>★ ${match.coach_rating || '-'} / 10</strong>
          </div>
        </div>

        ${coachRep.team_photo_url ? `
          <div class="photo-container">
            <img src="${coachRep.team_photo_url}" alt="Foto oficial del equipo" />
            <p style="font-size: 9px; color: #64748b; margin-top: 4px;">Foto oficial del encuentro</p>
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">1. Valoración del Cuerpo Técnico</div>
          <div class="grid-2">
            <div class="card-box">
              <h4>Resumen General</h4>
              <p>${match.coach_summary || 'Sin valoración redactada.'}</p>
            </div>
            <div class="card-box">
              <h4>Actitud y Observaciones</h4>
              <p>${match.attitude_notes || 'Sin observaciones de actitud.'}</p>
            </div>
          </div>
          <div class="grid-2" style="margin-top: 8px;">
            <div class="card-box" style="border-left: 3px solid #16a34a;">
              <h4 style="color: #16a34a;">Aspectos Positivos</h4>
              <p>${match.positive_aspects || 'No especificados.'}</p>
            </div>
            <div class="card-box" style="border-left: 3px solid #ea580c;">
              <h4 style="color: #ea580c;">Aspectos a Mejorar</h4>
              <p>${match.improvement_aspects || 'No especificados.'}</p>
            </div>
          </div>
        </div>

        ${coachRep.rival_analysis ? `
          <div class="section">
            <div class="section-title">2. Informe del Rival (${match.rival_nombre || 'Rival'})</div>
            <div class="grid-2">
              <div class="card-box">
                <h4>Sistema Táctico</h4>
                <p><strong>${coachRep.rival_analysis.system || 'No definido'}</strong></p>
              </div>
              <div class="card-box">
                <h4>Jugadores Clave</h4>
                <p>${coachRep.rival_analysis.key_players || 'Sin jugadores destacados señalados.'}</p>
              </div>
            </div>
            <div class="grid-2" style="margin-top: 8px;">
              <div class="card-box">
                <h4>Análisis de Goles</h4>
                <p>${coachRep.rival_analysis.goals_description || 'Sin notas de goles.'}</p>
              </div>
              <div class="card-box">
                <h4>Puntos Fuertes / Datos Relevantes</h4>
                <p>${coachRep.rival_analysis.notable_data || 'Sin datos adicionales.'}</p>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">3. Rendimiento de Jugadores (Once Titular y Convocatoria)</div>
          <table>
            <thead>
              <tr>
                <th class="center" style="width: 25px;">#</th>
                <th>Jugador</th>
                <th class="center" style="width: 45px;">Pos</th>
                <th class="center" style="width: 50px;">Minutos</th>
                <th class="center" style="width: 40px;">Nota</th>
                <th class="center" style="width: 45px;">Actitud</th>
                <th class="center" style="width: 35px;">G</th>
                <th class="center" style="width: 35px;">A</th>
                <th class="center" style="width: 45px;">Tarjetas</th>
              </tr>
            </thead>
            <tbody>
              ${starters.length > 0 ? starters.map(p => `
                <tr>
                  <td class="center"><strong>${p.number}</strong></td>
                  <td><strong>${p.name}</strong> <span style="font-size: 8px; color: #2563eb;">(Titular)</span></td>
                  <td class="center">${p.pos}</td>
                  <td class="center">${p.minutes}'</td>
                  <td class="center" style="font-weight: bold; color: ${p.rating >= 7 ? '#15803d' : p.rating >= 5 ? '#b45309' : '#b91c1c'}">${p.rating > 0 ? p.rating : '-'}</td>
                  <td class="center">${p.actitud > 0 ? p.actitud : '-'}</td>
                  <td class="center" style="font-weight: bold;">${p.goals > 0 ? p.goals : '-'}</td>
                  <td class="center">${p.assists > 0 ? p.assists : '-'}</td>
                  <td class="center">
                    ${p.yellows > 0 ? `<span style="background: #fef08a; padding: 1px 4px; border-radius: 3px; font-weight: bold;">🟨 ${p.yellows}</span>` : ''}
                    ${p.reds > 0 ? `<span style="background: #fecaca; padding: 1px 4px; border-radius: 3px; font-weight: bold;">🟥 ${p.reds}</span>` : ''}
                    ${p.yellows === 0 && p.reds === 0 ? '-' : ''}
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="9" class="center" style="color: #94a3b8; padding: 10px;">No se registraron titulares convocados en este encuentro.</td>
                </tr>
              `}
              ${bench.length > 0 ? `
                <tr style="background: #f8fafc;">
                  <td colspan="9" style="font-weight: 800; font-size: 8.5px; text-transform: uppercase; color: #64748b; padding-left: 8px;">
                    Banquillo de Suplentes (${bench.length})
                  </td>
                </tr>
                ${bench.map(p => `
                  <tr>
                    <td class="center">${p.number}</td>
                    <td>${p.name}</td>
                    <td class="center">${p.pos}</td>
                    <td class="center">${p.minutes}'</td>
                    <td class="center" style="font-weight: bold; color: ${p.rating >= 7 ? '#15803d' : p.rating >= 5 ? '#b45309' : '#b91c1c'}">${p.rating > 0 ? p.rating : '-'}</td>
                    <td class="center">${p.actitud > 0 ? p.actitud : '-'}</td>
                    <td class="center" style="font-weight: bold;">${p.goals > 0 ? p.goals : '-'}</td>
                    <td class="center">${p.assists > 0 ? p.assists : '-'}</td>
                    <td class="center">
                      ${p.yellows > 0 ? `🟨 ${p.yellows}` : ''}
                      ${p.reds > 0 ? `🟥 ${p.reds}` : ''}
                      ${p.yellows === 0 && p.reds === 0 ? '-' : ''}
                    </td>
                  </tr>
                `).join('')}
              ` : ''}
              ${unplayed.length > 0 ? `
                <tr style="background: #fef2f2;">
                  <td colspan="9" style="font-weight: 800; font-size: 8.5px; text-transform: uppercase; color: #b91c1c; padding-left: 8px;">
                    Sin Minutos / No Convocados (${unplayed.length})
                  </td>
                </tr>
                ${unplayed.map(p => `
                  <tr style="opacity: 0.85;">
                    <td class="center" style="color: #94a3b8;">${p.number}</td>
                    <td><strong>${p.name}</strong> <span style="font-size: 8px; color: #dc2626; margin-left: 4px;">(${p.status})</span></td>
                    <td class="center" style="color: #94a3b8;">${p.pos}</td>
                    <td class="center" style="color: #94a3b8;">-</td>
                    <td class="center" style="color: #94a3b8;">-</td>
                    <td class="center" style="color: #94a3b8;">-</td>
                    <td class="center" style="color: #94a3b8;">-</td>
                    <td class="center" style="color: #94a3b8;">-</td>
                    <td class="center" style="color: #94a3b8;">-</td>
                  </tr>
                `).join('')}
              ` : ''}
            </tbody>
          </table>
        </div>

        <div class="footer-note">
          Documento generado automáticamente por Gestión Integral Sporting Saladar &bull; Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  // Previsualización interactiva: datos del partido activo
  const previewCoachRep = activePreviewMatch ? getCoachReportData(activePreviewMatch) : {}
  const previewPlayers = activePreviewMatch ? getMatchPlayersPerformance(activePreviewMatch) : []
  const previewStarters = previewPlayers.filter(p => p.titular && !p.noJugo)
  const previewBench = previewPlayers.filter(p => !p.titular && !p.noJugo && p.minutes > 0)
  const previewUnplayed = previewPlayers.filter(p => p.noJugo || p.minutes === 0)

  return (
    <div className="space-y-6 pt-2">
      {/* ── Barra Superior de Controles y Filtros ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Informes Técnicos Post-Partido
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Previsualiza las valoraciones del entrenador, análisis del rival y descarga el informe PDF por jornada.
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Selector de orden cronológico */}
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
              title="Cambiar orden de partidos"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
              <span>{sortOrder === 'asc' ? 'Cronológico (J1 → J30)' : 'Inverso (J30 → J1)'}</span>
            </button>

            <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              Partidos: <span className="text-slate-800 font-black">{filteredMatches.length}</span>
            </div>
          </div>
        </div>

        {/* Filtros: Selector de Jornada + Buscador de Rival + Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Selector de Jornada */}
          <div className="sm:col-span-4">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
              Filtrar por Jornada
            </label>
            <div className="relative">
              <select
                value={selectedJornada}
                onChange={e => setSelectedJornada(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las Jornadas ({validMatches.length})</option>
                {availableJornadas.map(j => (
                  <option key={j} value={j}>
                    Jornada {j}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Buscador de Rival */}
          <div className="sm:col-span-4">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
              Buscar Rival
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchRival}
                onChange={e => setSearchRival(e.target.value)}
                placeholder="Nombre del rival..."
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchRival && (
                <button
                  type="button"
                  onClick={() => setSearchRival("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Checkboxes de filtrado */}
          <div className="sm:col-span-4 sm:pt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyWithReport}
                onChange={e => setOnlyWithReport(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-600">
                Solo con informe
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterPlayedOnly}
                onChange={e => setFilterPlayedOnly(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-600">
                Solo disputados
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Listado de Tarjetas de Informe Post-Partido ── */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMatches.map(match => {
            const coachRep = getCoachReportData(match)
            const hasReport = checkHasReport(match)
            const hasRivalData = Boolean(coachRep.rival_analysis && Object.values(coachRep.rival_analysis).some(v => Boolean(v && String(v).trim())))
            const dateStr = match.fecha_hora 
              ? new Date(match.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Fecha sin asignar'

            return (
              <div 
                key={match.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Cabecera de la Tarjeta */}
                <div 
                  className="space-y-2 cursor-pointer"
                  onClick={() => setActivePreviewMatch(match)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg shrink-0">
                      Jornada {match.jornada}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      {dateStr}
                    </span>
                  </div>

                  {/* Rival y Resultado */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors truncate">
                        vs {match.rival_nombre || 'Rival no definido'}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
                        Condición: <strong className="text-slate-700">{match.lugar || 'Campo'}</strong>
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center justify-end pl-2">
                      {match.resultado_propio != null && match.resultado_rival != null ? (
                        <div className="inline-flex items-center justify-center px-3 py-1 bg-slate-950 text-white font-mono font-black text-sm rounded-xl tracking-wider shadow-2xs whitespace-nowrap tabular-nums">
                          <span>{match.resultado_propio}</span>
                          <span className="text-slate-400 mx-1.5">-</span>
                          <span>{match.resultado_rival}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl shrink-0 whitespace-nowrap">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resumen del Informe o Foto si existe */}
                <div 
                  className="space-y-2.5 bg-slate-50/80 border border-slate-150 rounded-xl p-3 cursor-pointer"
                  onClick={() => setActivePreviewMatch(match)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className={`w-4 h-4 ${match.coach_rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                      <span className="text-xs font-extrabold text-slate-800">
                        {match.coach_rating ? `Nota: ${match.coach_rating}/10` : 'Sin calificación'}
                      </span>
                    </div>

                    {coachRep.team_photo_url && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Camera className="w-3 h-3" /> Foto subida
                      </span>
                    )}
                  </div>

                  {match.coach_summary ? (
                    <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                      "{match.coach_summary}"
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Aún no se ha redactado la valoración técnica de este encuentro.
                    </p>
                  )}

                  {hasRivalData && (
                    <div className="pt-1 border-t border-slate-200/60 flex items-center gap-2 text-[11px] text-slate-600 font-semibold">
                      <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">
                        Sistema Rival: <strong>{coachRep.rival_analysis.system || 'Registrado'}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Botones de Acción */}
                <div className="flex items-center gap-2 pt-1">
                  {/* Botón Principal: Ver Informe (Previsualizar sin descargar) */}
                  <button
                    type="button"
                    onClick={() => setActivePreviewMatch(match)}
                    className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
                    title="Previsualizar informe completo en pantalla"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ver Informe</span>
                  </button>

                  {/* Botón Descargar PDF */}
                  <button
                    type="button"
                    onClick={() => handlePrintPdf(match)}
                    className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                    title="Descargar informe en formato PDF oficial"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>

                  {/* Enlace para editar en pestaña post-partido */}
                  <Link
                    href={`/dashboard/equipos/${teamId}/partidos/${match.id}?tab=post-partido`}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                    title="Editar notas del partido"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">No se encontraron informes para este filtro</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Prueba a seleccionar "Todas las Jornadas", desactivar los filtros de informe o borrar la búsqueda de rival.
          </p>
          {(selectedJornada !== "all" || searchRival || onlyWithReport || filterPlayedOnly) && (
            <button
              onClick={() => {
                setSelectedJornada("all")
                setSearchRival("")
                setOnlyWithReport(false)
                setFilterPlayedOnly(false)
              }}
              className="text-xs font-bold text-blue-600 hover:underline pt-1"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      )}

      {/* ── Modal de Previsualización Interactiva del Informe Completo ── */}
      {activePreviewMatch && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setActivePreviewMatch(null)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div className="bg-slate-900 text-white px-4 py-3.5 sm:px-7 sm:py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-md">
                      Jornada {activePreviewMatch.jornada || '1'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {activePreviewMatch.competicion_nombre || 'Competición Oficial'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mt-0.5 leading-tight">
                    Informe vs {activePreviewMatch.rival_nombre || 'Rival'}
                  </h3>
                </div>
              </div>

              {/* Acciones de Cabecera */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintPdf(activePreviewMatch)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  title="Descargar informe oficial en PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Descargar PDF</span>
                </button>

                <Link
                  href={`/dashboard/equipos/${teamId}/partidos/${activePreviewMatch.id}?tab=post-partido`}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                  title="Editar notas del partido"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Editar</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setActivePreviewMatch(null)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido scrolleable del informe */}
            <div className="overflow-y-auto p-4 sm:p-7 space-y-6 flex-1">
              {/* Barra de Datos Clave del Encuentro */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Fecha y Hora</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {activePreviewMatch.fecha_hora 
                      ? new Date(activePreviewMatch.fecha_hora).toLocaleDateString('es-ES', { 
                          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })
                      : 'Pendiente'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Condición</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {activePreviewMatch.lugar || 'Campo Oficial'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Resultado</span>
                  <p className="text-xs font-black text-slate-900 mt-0.5">
                    {activePreviewMatch.resultado_propio != null && activePreviewMatch.resultado_rival != null 
                      ? `${activePreviewMatch.resultado_propio} - ${activePreviewMatch.resultado_rival}`
                      : 'Pendiente'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nota Míster</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-black text-slate-800">
                      {activePreviewMatch.coach_rating ? `${activePreviewMatch.coach_rating} / 10` : 'Sin nota'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Foto de Equipo si existe */}
              {previewCoachRep.team_photo_url && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" /> Foto Oficial del Encuentro
                  </h4>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm max-h-[360px]">
                    <img 
                      src={previewCoachRep.team_photo_url} 
                      alt="Foto de equipo oficial" 
                      className="w-full h-full max-h-[360px] object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Sección 1: Valoración del Cuerpo Técnico */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <FileText className="w-4 h-4 text-blue-600" /> 1. Valoración del Cuerpo Técnico
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Resumen General</span>
                    <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {activePreviewMatch.coach_summary || 'Sin valoración redactada.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Actitud y Observaciones</span>
                    <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {activePreviewMatch.attitude_notes || 'Sin observaciones de actitud.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aspectos Positivos
                    </span>
                    <p className="text-xs text-emerald-950 font-medium whitespace-pre-wrap leading-relaxed">
                      {activePreviewMatch.positive_aspects || 'No especificados.'}
                    </p>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Aspectos a Mejorar
                    </span>
                    <p className="text-xs text-amber-950 font-medium whitespace-pre-wrap leading-relaxed">
                      {activePreviewMatch.improvement_aspects || 'No especificados.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección 2: Análisis del Rival */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Shield className="w-4 h-4 text-blue-600" /> 2. Informe del Rival ({activePreviewMatch.rival_nombre || 'Rival'})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sistema Táctico</span>
                    <p className="text-xs font-black text-blue-700">
                      {previewCoachRep.rival_analysis?.system || 'No definido'}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jugadores Clave</span>
                    <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {previewCoachRep.rival_analysis?.key_players || 'Sin jugadores destacados señalados.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Análisis de Goles</span>
                    <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {previewCoachRep.rival_analysis?.goals_description || 'Sin notas de goles.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Puntos Fuertes / Observaciones</span>
                    <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {previewCoachRep.rival_analysis?.notable_data || 'Sin datos adicionales.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección 3: Convocatoria y Rendimiento de Jugadores */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" /> 3. Rendimiento de Jugadores ({previewPlayers.length})
                  </h4>
                  <span className="text-xs text-slate-400 font-semibold">
                    Titulares: {previewStarters.length} &bull; Suplentes: {previewBench.length} &bull; Sin Minutos / No Convocados: {previewUnplayed.length}
                  </span>
                </div>

                {/* Vista Móvil: Tarjetas individuales sin scroll horizontal (md:hidden) */}
                <div className="md:hidden space-y-4">
                  {/* Titulares en móvil */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        Once Titular ({previewStarters.length})
                      </span>
                    </div>

                    {previewStarters.length > 0 ? (
                      <div className="space-y-2">
                        {previewStarters.map(p => (
                          <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono font-black text-amber-500 text-xs shrink-0">
                                  #{p.number}
                                </span>
                                <div className="w-6 h-6 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center text-[9px] font-black text-blue-700 shrink-0">
                                  {p.avatarUrl ? (
                                    <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{p.avatar}</span>
                                  )}
                                </div>
                                <span className="font-bold text-slate-800 text-xs truncate">{p.name}</span>
                                <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded shrink-0">
                                  {p.pos}
                                </span>
                              </div>

                              {p.rating > 0 ? (
                                <span className={`font-black text-xs px-2 py-0.5 rounded shrink-0 ${
                                  p.rating >= 7 ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : p.rating >= 5 ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-rose-700 bg-rose-50 border border-rose-200'
                                }`}>
                                  ★ {p.rating}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs font-bold shrink-0">-</span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] pt-1.5 border-t border-slate-200/60 text-slate-600">
                              <span className="font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                ⏱️ {p.minutes}'
                              </span>
                              {p.actitud > 0 && (
                                <span className="font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                  🤝 Actitud: {p.actitud}
                                </span>
                              )}
                              {p.goals > 0 && (
                                <span className="font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                  ⚽ {p.goals} {p.goals > 1 ? 'goles' : 'gol'}
                                </span>
                              )}
                              {p.assists > 0 && (
                                <span className="font-semibold text-blue-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                  🎯 {p.assists} {p.assists > 1 ? 'asists' : 'asist'}
                                </span>
                              )}
                              {p.yellows > 0 && (
                                <span className="font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                  🟨 {p.yellows}
                                </span>
                              )}
                              {p.reds > 0 && (
                                <span className="font-black text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded">
                                  🟥 {p.reds}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2">No hay titulares convocados registrados.</p>
                    )}
                  </div>

                  {/* Suplentes en móvil */}
                  {previewBench.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          Banquillo de Suplentes ({previewBench.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {previewBench.map(p => (
                          <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono font-bold text-slate-500 text-xs shrink-0">
                                  #{p.number}
                                </span>
                                <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[9px] font-black text-slate-600 shrink-0">
                                  {p.avatarUrl ? (
                                    <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{p.avatar}</span>
                                  )}
                                </div>
                                <span className="font-semibold text-slate-700 text-xs truncate">{p.name}</span>
                                <span className="text-[9px] font-medium text-slate-400 bg-white border border-slate-200 px-1.5 py-0.2 rounded shrink-0">
                                  {p.pos}
                                </span>
                              </div>

                              {p.rating > 0 ? (
                                <span className={`font-black text-xs px-2 py-0.5 rounded shrink-0 ${
                                  p.rating >= 7 ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : p.rating >= 5 ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-rose-700 bg-rose-50 border border-rose-200'
                                }`}>
                                  ★ {p.rating}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs font-bold shrink-0">-</span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] pt-1.5 border-t border-slate-200/60 text-slate-600">
                              <span className="font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                ⏱️ {p.minutes}'
                              </span>
                              {p.actitud > 0 && (
                                <span className="font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                  🤝 Actitud: {p.actitud}
                                </span>
                              )}
                              {p.goals > 0 && (
                                <span className="font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                  ⚽ {p.goals}
                                </span>
                              )}
                              {p.assists > 0 && (
                                <span className="font-semibold text-blue-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                  🎯 {p.assists}
                                </span>
                              )}
                              {p.yellows > 0 && (
                                <span className="font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                  🟨 {p.yellows}
                                </span>
                              )}
                              {p.reds > 0 && (
                                <span className="font-black text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded">
                                  🟥 {p.reds}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sin Minutos / No Convocados en móvil */}
                  {previewUnplayed.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          Sin Minutos / No Convocados ({previewUnplayed.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {previewUnplayed.map(p => (
                          <div key={p.id} className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-1.5 opacity-90">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono font-bold text-slate-400 text-xs shrink-0">
                                  #{p.number}
                                </span>
                                <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[9px] font-black text-slate-500 shrink-0">
                                  {p.avatarUrl ? (
                                    <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{p.avatar}</span>
                                  )}
                                </div>
                                <span className="font-bold text-slate-700 text-xs truncate">{p.name}</span>
                                <span className="text-[9px] font-medium text-slate-400 bg-white border border-slate-200 px-1.5 py-0.2 rounded shrink-0">
                                  {p.pos}
                                </span>
                              </div>

                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                                p.status.includes('No Convocado') 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                  : p.status.includes('Ausente')
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {p.status}
                              </span>
                            </div>

                            <div className="text-[10px] text-slate-500 font-semibold italic pt-1 border-t border-slate-200/50 flex items-center gap-1.5">
                              <span>🚫 No disputó minutos en este encuentro</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Vista Escritorio: Tabla completa de 9 columnas (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-black text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10">#</th>
                        <th className="py-2.5 px-3">Jugador</th>
                        <th className="py-2.5 px-3 text-center">Pos</th>
                        <th className="py-2.5 px-3 text-center">Min</th>
                        <th className="py-2.5 px-3 text-center">Nota</th>
                        <th className="py-2.5 px-3 text-center">Actitud</th>
                        <th className="py-2.5 px-3 text-center">Goles</th>
                        <th className="py-2.5 px-3 text-center">Asist</th>
                        <th className="py-2.5 px-3 text-center">Tarjetas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewStarters.length > 0 ? (
                        previewStarters.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono font-black text-amber-500">
                              #{p.number}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center text-[9px] font-black text-blue-700 shrink-0">
                                  {p.avatarUrl ? (
                                    <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{p.avatar}</span>
                                  )}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800">{p.name}</span>
                                  <span className="ml-1.5 text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">Titular</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-600">
                              {p.pos}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                              {p.minutes}'
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {p.rating > 0 ? (
                                <span className={`font-black text-xs px-1.5 py-0.5 rounded ${
                                  p.rating >= 7 ? 'text-emerald-700 bg-emerald-50' : p.rating >= 5 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'
                                }`}>
                                  ★ {p.rating}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                              {p.actitud > 0 ? p.actitud : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-black text-slate-900">
                              {p.goals > 0 ? `⚽ ${p.goals}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                              {p.assists > 0 ? `🎯 ${p.assists}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {p.yellows > 0 && <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded mr-1">🟨 {p.yellows}</span>}
                              {p.reds > 0 && <span className="inline-block bg-rose-100 text-rose-800 text-[10px] font-black px-1.5 py-0.5 rounded">🟥 {p.reds}</span>}
                              {p.yellows === 0 && p.reds === 0 && <span className="text-slate-300">-</span>}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-4 text-center text-xs text-slate-400 italic">
                            No hay jugadores titulares registrados en este informe.
                          </td>
                        </tr>
                      )}

                      {/* Fila separadora del banquillo */}
                      {previewBench.length > 0 && (
                        <>
                          <tr className="bg-slate-100/80">
                            <td colSpan={9} className="py-2 px-3 font-black text-[10px] text-slate-600 uppercase tracking-wider">
                              Banquillo de Suplentes ({previewBench.length})
                            </td>
                          </tr>
                          {previewBench.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                                #{p.number}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[9px] font-black text-slate-600 shrink-0">
                                    {p.avatarUrl ? (
                                      <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span>{p.avatar}</span>
                                    )}
                                  </div>
                                  <span className="font-semibold text-slate-700">{p.name}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-semibold text-slate-500">
                                {p.pos}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                {p.minutes}'
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {p.rating > 0 ? (
                                  <span className={`font-black text-xs px-1.5 py-0.5 rounded ${
                                    p.rating >= 7 ? 'text-emerald-700 bg-emerald-50' : p.rating >= 5 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'
                                  }`}>
                                    ★ {p.rating}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                {p.actitud > 0 ? p.actitud : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-black text-slate-900">
                                {p.goals > 0 ? `⚽ ${p.goals}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                                {p.assists > 0 ? `🎯 ${p.assists}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {p.yellows > 0 && <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded mr-1">🟨 {p.yellows}</span>}
                                {p.reds > 0 && <span className="inline-block bg-rose-100 text-rose-800 text-[10px] font-black px-1.5 py-0.5 rounded">🟥 {p.reds}</span>}
                                {p.yellows === 0 && p.reds === 0 && <span className="text-slate-300">-</span>}
                              </td>
                            </tr>
                          ))}
                        </>
                      )}

                      {/* Fila separadora para jugadores sin minutos / no convocados */}
                      {previewUnplayed.length > 0 && (
                        <>
                          <tr className="bg-rose-50/60">
                            <td colSpan={9} className="py-2 px-3 font-black text-[10px] text-rose-700 uppercase tracking-wider">
                              Sin Minutos / No Convocados ({previewUnplayed.length})
                            </td>
                          </tr>
                          {previewUnplayed.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors opacity-85">
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                                #{p.number}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[9px] font-black text-slate-500 shrink-0">
                                    {p.avatarUrl ? (
                                      <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span>{p.avatar}</span>
                                    )}
                                  </div>
                                  <span className="font-semibold text-slate-700">{p.name}</span>
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    {p.status}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-semibold text-slate-400">
                                {p.pos}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                                -
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-300">-</td>
                              <td className="py-2.5 px-3 text-center text-slate-300">-</td>
                              <td className="py-2.5 px-3 text-center text-slate-300">-</td>
                              <td className="py-2.5 px-3 text-center text-slate-300">-</td>
                              <td className="py-2.5 px-3 text-center text-slate-300">-</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pie del Modal */}
            <div className="bg-slate-50 px-5 sm:px-7 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-400 font-medium text-center sm:text-left">
                Puedes editar cualquier detalle o calificación accediendo a la pestaña de edición Post-Partido.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handlePrintPdf(activePreviewMatch)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePreviewMatch(null)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
