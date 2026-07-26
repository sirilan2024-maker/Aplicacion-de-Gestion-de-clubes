"use client"

import { useEffect, useState } from "react"
import { Loader2, Search, Shirt, CheckSquare, BarChart3, AlertCircle, ShoppingBag, ClipboardList, X } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { getApparelDashboardDataAction, getApparelSummaryReportAction, toggleApparelDeliveryAction, updatePlayerApparelSizesAction } from "@/app/actions/apparel-actions"

const CLOTHING_SIZES = [
  'Talla 116',
  'Talla 128',
  'Talla 140',
  'Talla 152',
  'Talla 164',
  'Talla 176',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  '2XL',
  '3XL'
]

const SOCKS_SIZES = [
  '28-32',
  '33-35',
  '36-38',
  '39-42',
  '43-46'
]

const APPAREL_ITEMS = [
  { key: 'Camiseta de Juego', label: '👕 Cam. Juego' },
  { key: 'Pantalón de Juego', label: '🩳 Pan. Juego' },
  { key: 'Medias', label: '🧦 Medias' },
  { key: 'Chándal Oficial', label: '🧥 Chándal' },
  { key: 'Camiseta de Entrenamiento (1/2)', label: '👕 Cam. Entr. (1/2)' },
  { key: 'Camiseta de Entrenamiento (2/2)', label: '👕 Cam. Entr. (2/2)' },
  { key: 'Pantalón de Entrenamiento (1/2)', label: '🩳 Pant. Entr. (1/2)' },
  { key: 'Pantalón de Entrenamiento (2/2)', label: '🩳 Pant. Entr. (2/2)' },
  { key: 'Sudadera', label: '🧥 Sudadera' },
  { key: 'Camiseta de paseo', label: '👕 Cam. Paseo' },
  { key: 'Pantalón de paseo', label: '🩳 Pan. Paseo' },
  { key: 'Mochila', label: '🎒 Mochila' }
]

export default function UtilleriaDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [togglingMap, setTogglingMap] = useState<{ [key: string]: boolean }>({})
  const [players, setPlayers] = useState<any[]>([])
  const [report, setReport] = useState<any>({})
  const [teams, setTeams] = useState<any[]>([])
  
  // Filters
  const [search, setSearch] = useState("")
  const [selectedTeam, setSelectedTeam] = useState("")
  const [deliveryFilter, setDeliveryFilter] = useState("")
  const [activeTab, setActiveTab] = useState<'deliveries' | 'report'>('deliveries')

  // Clickable Summary Modal State
  const [summaryModal, setSummaryModal] = useState<'total' | 'delivered' | 'pending' | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadTeams()
    loadData()
  }, [selectedTeam])

  const loadTeams = async () => {
    const { data } = await supabase.from('teams').select('id, name').order('name')
    if (data) setTeams(data)
  }

  const loadData = async () => {
    setLoading(true)
    // 1. Load players and apparel grid
    const playersRes = await getApparelDashboardDataAction(selectedTeam || undefined)
    if (playersRes.success && playersRes.data) {
      setPlayers(playersRes.data)
    } else {
      toast.error('Error al cargar jugadores: ' + playersRes.error)
    }

    // 2. Load consolidated report
    const reportRes = await getApparelSummaryReportAction(selectedTeam || undefined)
    if (reportRes.success && reportRes.data) {
      setReport(reportRes.data)
    } else {
      toast.error('Error al cargar informe: ' + reportRes.error)
    }
    setLoading(false)
  }

  const handleToggleDelivery = async (playerId: string, itemName: string, currentDelivered: boolean) => {
    const toggleKey = `${playerId}-${itemName}`
    setTogglingMap(prev => ({ ...prev, [toggleKey]: true }))
    
    const nextState = !currentDelivered
    const res = await toggleApparelDeliveryAction(playerId, itemName, nextState)
    
    if (res.success) {
      toast.success(nextState ? 'Artículo marcado como entregado' : 'Entrega revertida')
      
      // Update local state immediately to keep UI highly reactive
      setPlayers(prev => prev.map(p => {
        if (p.id === playerId) {
          const updatedApparel = { ...p.apparel }
          updatedApparel[itemName] = { 
            ...updatedApparel[itemName], 
            delivered: nextState,
            delivered_at: nextState ? new Date().toISOString() : null
          }
          return { ...p, apparel: updatedApparel }
        }
        return p
      }))

      // Reload report in background
      const reportRes = await getApparelSummaryReportAction(selectedTeam || undefined)
      if (reportRes.success && reportRes.data) {
        setReport(reportRes.data)
      }
    } else {
      toast.error(res.error || 'Error al cambiar estado de entrega')
    }
    
    setTogglingMap(prev => ({ ...prev, [toggleKey]: false }))
  }

  const handleSizeChange = async (playerId: string, itemName: string, newSize: string) => {
    const res = await updatePlayerApparelSizesAction(playerId, { [itemName]: newSize })
    if (res.success) {
      toast.success('Talla actualizada correctamente')
      
      // Update local state immediately
      setPlayers(prev => prev.map(p => {
        if (p.id === playerId) {
          const updatedApparel = { ...p.apparel }
          updatedApparel[itemName] = {
            ...updatedApparel[itemName],
            size: newSize
          }
          return { ...p, apparel: updatedApparel }
        }
        return p
      }))

      // Reload report in background
      const reportRes = await getApparelSummaryReportAction(selectedTeam || undefined)
      if (reportRes.success && reportRes.data) {
        setReport(reportRes.data)
      }
    } else {
      toast.error('Error al actualizar talla: ' + res.error)
    }
  }

  const handleDorsalInputChange = (playerId: string, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '')
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return { ...p, dorsal: cleaned }
      }
      return p
    }))
  }

  const handleDorsalBlur = async (playerId: string, nextDorsal: string) => {
    const res = await updatePlayerApparelSizesAction(playerId, {}, nextDorsal)
    if (res.success) {
      toast.success('Número de dorsal actualizado')
    } else {
      toast.error('Error al actualizar dorsal: ' + res.error)
    }
  }

  const exportToExcel = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM to render Spanish accents correctly in Excel
    
    if (activeTab === 'deliveries') {
      // 1. Headers
      const headers = ["Nombre", "Apellidos", "Equipo", "Categoría", "Dorsal", ...APPAREL_ITEMS.map(i => i.label.split(' ').slice(1).join(' ') || i.key)];
      csvContent += headers.join(";") + "\n";
      
      // 2. Rows
      filteredPlayers.forEach(p => {
        const row = [
          p.first_name,
          p.last_name,
          p.team_name,
          p.category,
          p.dorsal || "-",
          ...APPAREL_ITEMS.map(item => {
            const info = p.apparel[item.key] || { size: "", delivered: false };
            if (!info.size) return "Sin talla";
            return `${info.size} (${info.delivered ? "Entregado" : "Pendiente"})`;
          })
        ];
        const cleanedRow = row.map(val => String(val).replace(/;/g, ",").replace(/\n/g, " "));
        csvContent += cleanedRow.join(";") + "\n";
      });
      
      // 3. Download trigger
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      let teamNamePart = "todos_los_equipos";
      if (selectedTeam) {
        const teamObj = teams.find(t => t.id === selectedTeam);
        teamNamePart = teamObj ? teamObj.name.toLowerCase().replace(/\s+/g, '_') : "equipo";
      }

      let filterPart = "entregas_completo";
      if (deliveryFilter === "all_delivered") {
        filterPart = "todo_entregado";
      } else if (deliveryFilter === "pending_any") {
        filterPart = "prendas_pendientes";
      } else if (deliveryFilter === "missing_all_sizes") {
        filterPart = "sin_tallas_registradas";
      } else if (deliveryFilter.startsWith("missing_")) {
        const itemKey = deliveryFilter.replace("missing_", "");
        filterPart = `falta_prenda_${itemKey.toLowerCase().replace(/\s+/g, '_')}`;
      }

      const fileName = `reporte_ropa_${teamNamePart}_${filterPart}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      let toastMsg = "Excel de entregas de ropa descargado";
      if (deliveryFilter === "all_delivered") toastMsg = "Excel de entregas (Todo entregado) descargado";
      else if (deliveryFilter === "pending_any") toastMsg = "Excel de entregas (Prendas pendientes) descargado";
      else if (deliveryFilter === "missing_all_sizes") toastMsg = "Excel de entregas (Sin tallas registradas) descargado";
      else if (deliveryFilter.startsWith("missing_")) {
        const itemKey = deliveryFilter.replace("missing_", "");
        toastMsg = `Excel de jugadores sin ${itemKey} descargado`;
      }
      toast.success(toastMsg);
      
    } else {
      // 1. Headers
      const headers = ["Prenda", "Talla", "Entregados", "Pedir (Pendiente)", "Total Solicitado"];
      csvContent += headers.join(";") + "\n";
      
      // 2. Rows
      APPAREL_ITEMS.forEach(item => {
        const sizesReport = report[item.key] || {};
        Object.entries(sizesReport).forEach(([size, stats]: any) => {
          const row = [
            item.key,
            size,
            stats.delivered,
            stats.pending,
            stats.totalNeeded
          ];
          csvContent += row.join(";") + "\n";
        });
      });
      
      // 3. Download trigger
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `informe_pedidos_ropa.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Excel de informe de pedidos descargado");
    }
  }

  const exportModalToExcel = (type: 'total' | 'delivered' | 'pending') => {
    let csvContent = "\uFEFF"; // UTF-8 BOM to render Spanish characters correctly in Excel
    
    // 1. Headers
    const headers = ["Prenda", "Talla", "Cantidad"];
    csvContent += headers.join(";") + "\n";
    
    // 2. Rows
    APPAREL_ITEMS.forEach(item => {
      const breakdown = getModalBreakdown(item.key, type);
      breakdown.forEach(b => {
        const row = [
          item.key,
          b.size,
          b.count
        ];
        csvContent += row.join(";") + "\n";
      });
    });
    
    // 3. Download
    let filename = "";
    if (type === 'total') filename = "resumen_tallas_total_solicitado.csv";
    else if (type === 'delivered') filename = "resumen_tallas_entregado.csv";
    else if (type === 'pending') filename = "resumen_tallas_pendiente_pedir.csv";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel del resumen descargado");
  }

  const filteredPlayers = players.filter(p => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
    if (!fullName.includes(search.toLowerCase())) return false

    if (deliveryFilter) {
      if (deliveryFilter === "all_delivered") {
        return APPAREL_ITEMS.every(item => {
          const info = p.apparel[item.key]
          return info && info.size && info.delivered
        })
      } else if (deliveryFilter === "pending_any") {
        return APPAREL_ITEMS.some(item => {
          const info = p.apparel[item.key]
          return info && info.size && !info.delivered
        })
      } else if (deliveryFilter === "missing_all_sizes") {
        return !Object.values(p.apparel).some((info: any) => info && info.size)
      } else if (deliveryFilter.startsWith("missing_")) {
        const itemKey = deliveryFilter.replace("missing_", "")
        const info = p.apparel[itemKey]
        return !info || !info.size || !info.delivered
      }
    }

    return true
  })

  const highlightedItemKey = deliveryFilter.startsWith('missing_') ? deliveryFilter.replace('missing_', '') : null

  // Calculate global summary stats
  const totalItemsNeeded = Object.values(report).reduce((acc: number, sizes: any) => {
    return acc + Object.values(sizes).reduce((sizeAcc: number, stats: any) => sizeAcc + stats.totalNeeded, 0)
  }, 0) as number

  const totalItemsDelivered = Object.values(report).reduce((acc: number, sizes: any) => {
    return acc + Object.values(sizes).reduce((sizeAcc: number, stats: any) => sizeAcc + stats.delivered, 0)
  }, 0) as number

  const pendingDeliveries = totalItemsNeeded - totalItemsDelivered

  // Get size breakdown for the modal
  const getModalBreakdown = (itemKey: string, type: 'total' | 'delivered' | 'pending') => {
    const itemData = report[itemKey] || {}
    return Object.entries(itemData).map(([size, stats]: any) => {
      let count = 0
      if (type === 'total') count = stats.totalNeeded
      else if (type === 'delivered') count = stats.delivered
      else if (type === 'pending') count = stats.pending
      return { size, count }
    }).filter(e => e.count > 0)
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-300 lg:max-w-none lg:w-full lg:px-6 lg:py-4 lg:space-y-4 lg:flex lg:flex-col lg:h-[calc(100vh-1rem)] lg:overflow-hidden">
      {/* CABECERA (Estática en PC) */}
      <div className="lg:flex-none flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Shirt size={22} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Gestión de Utillería y Ropa</h1>
            <p className="text-slate-500 text-xs mt-0.5">Controla la asignación de tallas, realiza el seguimiento de entregas y consulta informes de pedidos.</p>
          </div>
        </div>

        {/* CONTROLES TABS */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-lg transition-all ${
              activeTab === 'deliveries'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList size={14} /> Entrega de Ropa
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-lg transition-all ${
              activeTab === 'report'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={14} /> Informe de Pedidos
          </button>
        </div>
      </div>

      {/* METRICAS DE RESUMEN (Estáticas en PC) */}
      <div className="lg:flex-none grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setSummaryModal('total')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-slate-50/50 shadow-sm flex items-center gap-4 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
            <ShoppingBag size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Solicitado (Ver Tallas)</span>
            <span className="text-lg font-black text-slate-800">{totalItemsNeeded}</span>
          </div>
        </button>

        <button
          onClick={() => setSummaryModal('delivered')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50 shadow-sm flex items-center gap-4 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
            <CheckSquare size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prendas Entregadas (Ver Tallas)</span>
            <span className="text-lg font-black text-slate-800">{totalItemsDelivered}</span>
          </div>
        </button>

        <button
          onClick={() => setSummaryModal('pending')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-slate-50/50 shadow-sm flex items-center gap-4 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
            <AlertCircle size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prendas Pendientes (A Pedir)</span>
            <span className="text-lg font-black text-slate-800">{pendingDeliveries}</span>
          </div>
        </button>
      </div>

      {/* FILTROS GLOBAL (Estáticos en PC) */}
      <div className="lg:flex-none bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-lg w-full sm:max-w-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar jugador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full placeholder-slate-400 text-slate-700 font-semibold"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full sm:w-52 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-semibold shadow-sm"
          >
            <option value="">Todos los Equipos</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
            className="w-full sm:w-52 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-semibold shadow-sm"
          >
            <option value="">Estado entrega: Todos</option>
            <option value="all_delivered">📦 Con todo entregado</option>
            <option value="pending_any">⚠️ Con alguna prenda pendiente</option>
            <option value="missing_all_sizes">❌ Sin tallas registradas</option>
            <option disabled>─────────────────────────</option>
            {APPAREL_ITEMS.map(item => {
              const cleanLabel = item.label.split(' ').slice(1).join(' ') || item.key;
              return (
                <option key={item.key} value={`missing_${item.key}`}>
                  ❌ Falta: {cleanLabel}
                </option>
              )
            })}
          </select>

          <button
            onClick={exportToExcel}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm shrink-0"
          >
            📥 Descargar Excel
          </button>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL (Desplazable únicamente en PC) */}
      <div className="lg:flex-1 lg:overflow-hidden lg:flex lg:flex-col lg:min-h-0">
        {loading ? (
          <div className="min-h-[40vh] lg:flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : activeTab === 'deliveries' ? (
          /* SECCIÓN DE ENTREGAS */
          <>
            {/* DESKTOP VIEW: HORIZONTAL AND VERTICAL SCROLL TABLE (Fija la pantalla en PC) */}
            <div className="hidden lg:flex flex-col flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full min-h-0">
              <div className="overflow-y-auto overflow-x-auto flex-1 min-h-0">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 border-b border-slate-100 uppercase tracking-wider sticky top-0 z-20 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                      <th className="py-3 px-3 sticky top-0 left-0 bg-slate-50 z-30 w-52 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100">Jugador / Equipo</th>
                      <th className="py-3 px-2 text-center w-24 border-r border-slate-100 sticky top-0 bg-slate-50 z-20">🔢 Dorsal</th>
                      {APPAREL_ITEMS.map(item => {
                        const isHighlighted = highlightedItemKey === item.key
                        return (
                          <th 
                            key={item.key} 
                            className={`py-3 px-1 text-center sticky top-0 z-20 border-b border-slate-100 transition-colors duration-200 ${
                              isHighlighted 
                                ? 'bg-amber-100 text-amber-950 font-black shadow-[inset_0_-2.5px_0_0_rgba(245,158,11,1)]' 
                                : 'bg-slate-50 text-[9px] font-bold text-slate-500'
                            }`}
                          >
                            {item.label}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-slate-400 font-semibold">
                          No se encontraron jugadores que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            <div className="flex flex-col">
                              <span>{p.first_name} {p.last_name}</span>
                              <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">
                                🛡️ {p.team_name} ({p.category})
                              </span>
                            </div>
                          </td>

                          {/* DORSAL EDITABLE */}
                          <td className="py-2 px-2 text-center border-r border-slate-100 bg-slate-50/10">
                            <input
                              type="text"
                              maxLength={3}
                              value={p.dorsal || ''}
                              onChange={(e) => handleDorsalInputChange(p.id, e.target.value)}
                              onBlur={(e) => handleDorsalBlur(p.id, e.target.value)}
                              placeholder="-"
                              className="w-16 px-1 py-0.5 text-center bg-white border border-slate-200 rounded-lg text-xs font-black text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                            />
                          </td>
                          
                          {/* PRENDAS Y TALLAS EDITABLES */}
                          {APPAREL_ITEMS.map(item => {
                            const info = p.apparel[item.key] || { size: '', delivered: false, delivered_at: null }
                            const isDelivered = info.delivered
                            const toggleKey = `${p.id}-${item.key}`
                            const isToggling = togglingMap[toggleKey]

                            const isHighlightedColumn = highlightedItemKey === item.key
                            const isHighlightedPending = deliveryFilter === 'pending_any' && info.size && !isDelivered
                            const shouldHighlightCell = isHighlightedColumn || isHighlightedPending

                            return (
                              <td 
                                key={item.key} 
                                className={`py-1 px-1 text-center transition-all duration-300 ${
                                  shouldHighlightCell 
                                    ? 'bg-amber-100/30 border-x border-amber-250/30 shadow-[inset_0_0_4px_rgba(245,158,11,0.05)]' 
                                    : ''
                                }`}
                              >
                                <div className="flex items-center justify-center gap-1 min-w-[95px] mx-auto">
                                  {/* SELECT DE TALLAS */}
                                  {['Medias', 'Mochila'].includes(item.key) ? (
                                    <select
                                      disabled
                                      className={`px-1 py-0.5 text-[10px] font-black rounded-lg border w-16 text-center shadow-sm bg-white ${
                                        isDelivered 
                                          ? 'border-emerald-300 text-emerald-800' 
                                          : 'border-slate-200 text-slate-400'
                                      }`}
                                    >
                                      <option value="">-</option>
                                    </select>
                                  ) : (
                                    <select
                                      value={info.size || ''}
                                      onChange={(e) => handleSizeChange(p.id, item.key, e.target.value)}
                                      className={`px-1 py-0.5 text-[10px] font-black rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-16 text-center shadow-sm bg-white ${
                                        isDelivered 
                                          ? 'border-emerald-300 text-emerald-800' 
                                          : info.size 
                                            ? 'border-amber-250 text-amber-900 font-bold'
                                            : 'border-slate-200 text-slate-400'
                                      }`}
                                    >
                                      <option value="">-</option>
                                      {CLOTHING_SIZES.map(sz => (
                                        <option key={sz} value={sz}>{sz}</option>
                                      ))}
                                    </select>
                                  )}

                                  {/* CHECKBOX DE ENTREGA */}
                                  {(info.size || ['Medias', 'Mochila'].includes(item.key)) && (
                                    <button
                                      onClick={() => handleToggleDelivery(p.id, item.key, isDelivered)}
                                      disabled={isToggling}
                                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                        isDelivered 
                                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-500/20' 
                                          : 'border-amber-400 bg-white hover:bg-amber-50/50'
                                      }`}
                                    >
                                      {isToggling ? (
                                        <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-500" />
                                      ) : isDelivered ? (
                                        <span className="text-[9px] font-black">✓</span>
                                      ) : null}
                                    </button>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE VIEW: PLAYER CARDS (Se desplazan de forma natural con la página en móviles) */}
            <div className="lg:hidden space-y-4">
              {filteredPlayers.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 font-semibold shadow-sm">
                  No se encontraron jugadores que coincidan con la búsqueda.
                </div>
              ) : (
                filteredPlayers.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                    {/* Header de Ficha */}
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3 gap-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{p.first_name} {p.last_name}</h4>
                        <span className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 block">
                          🛡️ {p.team_name} ({p.category})
                        </span>
                      </div>

                      {/* Dorsal */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">🔢 Dorsal:</span>
                        <input
                          type="text"
                          maxLength={3}
                          value={p.dorsal || ''}
                          onChange={(e) => handleDorsalInputChange(p.id, e.target.value)}
                          onBlur={(e) => handleDorsalBlur(p.id, e.target.value)}
                          placeholder="-"
                          className="w-14 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Lista de prendas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {APPAREL_ITEMS.map(item => {
                        const info = p.apparel[item.key] || { size: '', delivered: false, delivered_at: null }
                        const isDelivered = info.delivered
                        const toggleKey = `${p.id}-${item.key}`
                        const isToggling = togglingMap[toggleKey]

                        const isHighlightedColumn = highlightedItemKey === item.key
                        const isHighlightedPending = deliveryFilter === 'pending_any' && info.size && !isDelivered
                        const shouldHighlightItem = isHighlightedColumn || isHighlightedPending

                        return (
                          <div 
                            key={item.key} 
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all duration-300 ${
                              shouldHighlightItem
                                ? 'bg-amber-100/40 border-amber-400 scale-[1.01] shadow-sm text-amber-950 font-medium'
                                : isDelivered 
                                  ? 'bg-emerald-50/20 border-emerald-100 text-emerald-900' 
                                  : 'bg-slate-50/50 border-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="text-xs font-bold">{item.label.split(' ').slice(1).join(' ') || item.key}</span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* SELECT TALLA */}
                              {['Medias', 'Mochila'].includes(item.key) ? (
                                <select
                                  disabled
                                  className={`px-1.5 py-1 text-[11px] font-black rounded-lg border w-20 text-center shadow-sm bg-white ${
                                    isDelivered 
                                      ? 'border-emerald-300 text-emerald-800' 
                                      : 'border-slate-200 text-slate-400'
                                  }`}
                                >
                                  <option value="">-</option>
                                </select>
                              ) : (
                                <select
                                  value={info.size || ''}
                                  onChange={(e) => handleSizeChange(p.id, item.key, e.target.value)}
                                  className={`px-1.5 py-1 text-[11px] font-black rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-20 text-center shadow-sm bg-white ${
                                    isDelivered 
                                      ? 'border-emerald-300 text-emerald-800' 
                                      : info.size 
                                        ? 'border-amber-250 text-amber-900 font-bold'
                                        : 'border-slate-200 text-slate-400'
                                  }`}
                                >
                                  <option value="">-</option>
                                  {CLOTHING_SIZES.map(sz => (
                                    <option key={sz} value={sz}>{sz}</option>
                                  ))}
                                </select>
                              )}

                              {/* CHECKBOX ENTREGA */}
                              {(info.size || ['Medias', 'Mochila'].includes(item.key)) && (
                                <button
                                  onClick={() => handleToggleDelivery(p.id, item.key, isDelivered)}
                                  disabled={isToggling}
                                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                                    isDelivered 
                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-500/20' 
                                      : 'border-amber-400 bg-white hover:bg-amber-50/50'
                                  }`}
                                >
                                  {isToggling ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                                  ) : isDelivered ? (
                                    <span className="text-xs font-black">✓</span>
                                  ) : null}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* SECCIÓN DE INFORME DE PEDIDOS */
          <div className="lg:flex-1 lg:overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
            {APPAREL_ITEMS.map(item => {
              const sizesReport = report[item.key] || {}
              const sizesList = Object.entries(sizesReport)

              return (
                <div key={item.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-fit">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
                      {item.label}
                    </h3>
                    <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-lg">
                      {sizesList.reduce((acc, [_, stats]: any) => acc + stats.totalNeeded, 0)} Solicitados
                    </span>
                  </div>

                  <div className="p-4 flex-1 space-y-2">
                    {sizesList.length === 0 ? (
                      <div className="h-full flex items-center justify-center py-6 text-slate-400 text-xs font-semibold">
                        Ningún jugador ha registrado su talla para este artículo.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {sizesList.map(([size, stats]: any) => (
                          <div key={size} className="py-2.5 flex items-center justify-between text-sm">
                            <span className="font-bold text-slate-800">Talla: {size}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500 font-medium">
                                Entregados: <strong className="text-slate-800 font-bold">{stats.delivered}</strong>
                              </span>
                              <span className="px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-700 font-extrabold text-xs rounded-lg flex items-center gap-1">
                                Pedir: {stats.pending}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL DE RESUMEN POR TALLAS AL HACER CLIC EN LAS FICHAS */}
      {summaryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/55">
              <div className="flex items-center gap-2 text-slate-900">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base md:text-lg text-slate-900">
                  {summaryModal === 'total' && 'Resumen por Tallas: Total Solicitado'}
                  {summaryModal === 'delivered' && 'Resumen por Tallas: Total Entregado'}
                  {summaryModal === 'pending' && 'Resumen por Tallas: Pendiente de Pedir (A comprar)'}
                </h3>
              </div>
              <button 
                onClick={() => setSummaryModal(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {APPAREL_ITEMS.map(item => {
                  const breakdown = getModalBreakdown(item.key, summaryModal)
                  
                  return (
                    <div key={item.key} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                      <span className="font-extrabold text-xs text-slate-800 block border-b border-slate-200 pb-1.5">
                        {item.label}
                      </span>
                      <div className="pt-2 flex-1 flex flex-col justify-center">
                        {breakdown.length === 0 ? (
                          <span className="text-[10px] text-slate-500 font-bold block py-1">
                            Ninguna unidad registrada
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {breakdown.map(b => (
                              <span key={b.size} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800 flex items-center gap-1 shadow-sm">
                                <span>Talla {b.size}:</span>
                                <span className="text-indigo-600 font-black">{b.count}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-4">
              <button
                onClick={() => exportModalToExcel(summaryModal)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
              >
                📥 Descargar Excel
              </button>
              
              <button
                onClick={() => setSummaryModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-sm transition-colors"
              >
                Cerrar Resumen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
