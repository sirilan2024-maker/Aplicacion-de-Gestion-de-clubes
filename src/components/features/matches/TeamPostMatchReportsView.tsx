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
  Printer
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
  const [activePreviewMatch, setActivePreviewMatch] = useState<any | null>(null)

  // 1. Filtrar partidos válidos de la temporada activa (excluir temporada 25/26)
  const validMatches = useMemo(() => {
    return (matches || []).filter(m => 
      m.season_id !== '584f508a-fc1a-4339-b5b2-4296ffde2f4c'
    )
  }, [matches])

  // 2. Extraer lista de jornadas disponibles
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

  // 3. Filtrar partidos según controles
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
        const hasReport = m.coach_rating || m.coach_summary || m.positive_aspects || m.coach_report
        if (!hasReport) return false
      }

      return true
    }).sort((a, b) => {
      const dateA = a.fecha_hora ? new Date(a.fecha_hora).getTime() : 0
      const dateB = b.fecha_hora ? new Date(b.fecha_hora).getTime() : 0
      return dateB - dateA // Más recientes primero
    })
  }, [validMatches, selectedJornada, searchRival, onlyWithReport])

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

  // Generación y descarga directa en PDF / Imprimir informe completo
  const handlePrintPdf = (match: any) => {
    const coachRep = getCoachReportData(match)
    const matchConvs = convocatorias.filter(c => c.partido_id === match.id)
    
    // Titulares y suplentes
    const matchPlayers = matchConvs.map(c => {
      const p = players.find(pl => pl.id === c.player_id)
      return {
        number: p?.dorsal || c.dorsal || '-',
        name: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Jugador',
        pos: c.slotLabel || p?.posicion || 'JUG',
        titular: c.titular || false,
        minutes: c.minutes_played ?? c.minutos_jugados ?? 0,
        rating: c.coach_rating || 0,
        actitud: c.actitud || 0,
        goals: c.goals || 0,
        assists: c.assists || 0,
        yellows: c.yellow_cards || 0,
        reds: c.red_cards || 0,
        status: c.estado_asistencia || (c.status === 'no_convocado' ? 'No Convocado' : 'Presente')
      }
    })

    const starters = matchPlayers.filter(p => p.titular)
    const bench = matchPlayers.filter(p => !p.titular)

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
            font-size: 11px;
            line-height: 1.4;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .title-area h1 {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
            margin: 0 0 2px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .title-area p {
            margin: 0;
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
          }
          .score-badge {
            background: #0f172a;
            color: #fff;
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 900;
            letter-spacing: 1px;
          }
          .match-details-bar {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
            margin-bottom: 14px;
          }
          .match-details-bar div {
            font-size: 10px;
          }
          .match-details-bar strong {
            display: block;
            font-size: 11px;
            color: #0f172a;
          }
          .photo-container {
            text-align: center;
            margin-bottom: 14px;
          }
          .photo-container img {
            max-width: 100%;
            max-height: 220px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            object-fit: cover;
          }
          .section {
            margin-bottom: 14px;
            page-break-inside: avoid;
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

        ${coachRep.rival_analysis && Object.values(coachRep.rival_analysis).some(Boolean) ? `
          <div class="section">
            <div class="section-title">2. Análisis Táctico del Rival</div>
            <div class="grid-2">
              <div class="card-box">
                <h4>Sistema del Rival</h4>
                <p>${coachRep.rival_analysis.system || 'No especificado'}</p>
              </div>
              <div class="card-box">
                <h4>Jugadores Clave</h4>
                <p>${coachRep.rival_analysis.key_players || 'No especificados'}</p>
              </div>
            </div>
            <div class="grid-2" style="margin-top: 8px;">
              <div class="card-box">
                <h4>Goles y Acciones Clave</h4>
                <p>${coachRep.rival_analysis.goals_description || 'Sin notas'}</p>
              </div>
              <div class="card-box">
                <h4>Datos Destacados</h4>
                <p>${coachRep.rival_analysis.notable_data || 'Sin datos adicionales'}</p>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">3. Alineación y Rendimiento Individual</div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th>Jugador</th>
                <th class="center" style="width: 45px;">Rol</th>
                <th class="center" style="width: 40px;">Min</th>
                <th class="center" style="width: 40px;">Nota</th>
                <th class="center" style="width: 40px;">Actitud</th>
                <th class="center" style="width: 35px;">Goles</th>
                <th class="center" style="width: 35px;">Asist</th>
                <th class="center" style="width: 35px;">🟨</th>
                <th class="center" style="width: 35px;">🟥</th>
              </tr>
            </thead>
            <tbody>
              ${matchPlayers.map(p => `
                <tr>
                  <td class="center"><strong>${p.number}</strong></td>
                  <td>${p.name}</td>
                  <td class="center">${p.titular ? 'TITULAR' : 'SUPLENTE'}</td>
                  <td class="center">${p.minutes}'</td>
                  <td class="center"><strong>${p.rating > 0 ? p.rating : '-'}</strong></td>
                  <td class="center">${p.actitud > 0 ? p.actitud : '-'}</td>
                  <td class="center">${p.goals || 0}</td>
                  <td class="center">${p.assists || 0}</td>
                  <td class="center">${p.yellows || 0}</td>
                  <td class="center">${p.reds || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer-note">
          Documento oficial generado por la Plataforma de Gestión Integral del Club Sporting Saladar &bull; ${new Date().toLocaleDateString('es-ES')}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

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
              Consulta las valoraciones del entrenador, análisis del rival y descarga el informe PDF por jornada.
            </p>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            Total partidos: <span className="text-slate-800 font-black">{filteredMatches.length}</span>
          </div>
        </div>

        {/* Filtros: Selector de Jornada + Buscador de Rival + Checkbox */}
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
          <div className="sm:col-span-5">
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

          {/* Solo con informe completado */}
          <div className="sm:col-span-3 sm:pt-4 flex items-center">
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
          </div>
        </div>
      </div>

      {/* ── Listado de Tarjetas de Informe Post-Partido ── */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMatches.map(match => {
            const coachRep = getCoachReportData(match)
            const hasReport = Boolean(match.coach_rating || match.coach_summary || match.positive_aspects)
            const hasRivalData = Boolean(coachRep.rival_analysis && Object.values(coachRep.rival_analysis).some(Boolean))
            const dateStr = match.fecha_hora 
              ? new Date(match.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Fecha sin asignar'

            return (
              <div 
                key={match.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Cabecera de la Tarjeta */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                      Jornada {match.jornada || 'N/A'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {dateStr}
                    </span>
                  </div>

                  {/* Rival y Resultado */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                        vs {match.rival_nombre || 'Rival no definido'}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        Condición: <strong className="text-slate-700">{match.lugar || 'Campo'}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      {match.resultado_propio != null && match.resultado_rival != null ? (
                        <span className="inline-block px-3 py-1 bg-slate-900 text-white font-black text-sm rounded-xl tracking-wider shadow-2xs">
                          {match.resultado_propio} - {match.resultado_rival}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resumen del Informe o Foto si existe */}
                <div className="space-y-2.5 bg-slate-50/80 border border-slate-150 rounded-xl p-3">
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
                  <button
                    type="button"
                    onClick={() => handlePrintPdf(match)}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
                    title="Descargar informe completo en formato PDF oficial"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar PDF</span>
                  </button>

                  <Link
                    href={`/dashboard/equipos/${teamId}/partidos/${match.id}?tab=post-partido`}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                    title="Ir a la pestaña post-partido para editar notas y datos"
                  >
                    <span>Editar</span>
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
            Prueba a seleccionar "Todas las Jornadas" o borra el término de búsqueda de rival.
          </p>
          {(selectedJornada !== "all" || searchRival || onlyWithReport) && (
            <button
              onClick={() => {
                setSelectedJornada("all")
                setSearchRival("")
                setOnlyWithReport(false)
              }}
              className="text-xs font-bold text-blue-600 hover:underline pt-1"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}
