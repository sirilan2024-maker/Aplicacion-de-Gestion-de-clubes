"use client";

import React, { useState, useEffect } from "react";
import { Search, FolderOpen, Users, Filter, X, Archive, Download, Loader2, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { DocumentManager } from "@/components/features/admin/DocumentManager";
import toast from "react-hot-toast";

interface PlayerBrief {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  category: string;
  team_name?: string;
  team_id?: string;
}

export default function DocumentManagementPage() {
  const [players, setPlayers] = useState<PlayerBrief[]>([]);
  const [teams, setTeams] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerBrief | null>(null);

  // Mass download state
  const [massDownloadTeam, setMassDownloadTeam] = useState<string>("all");
  const [massDownloading, setMassDownloading] = useState(false);

  useEffect(() => {
    fetchPlayersAndTeams();
  }, []);

  const fetchPlayersAndTeams = async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          id, 
          first_name, 
          last_name, 
          status,
          teams (id, name)
        `)
        .neq('status', 'inactive')
        .order('first_name', { ascending: true });

      if (error) throw error;
      
      const parsedPlayers = (data || []).map(p => {
        const teamObj = Array.isArray(p.teams) ? p.teams[0] : p.teams;
        return {
          ...p,
          category: p.status === 'pending_revision' ? 'Inscripción Pdte' : 'Jugador Oficial',
          team_name: (teamObj as any)?.name || 'Sin equipo',
          team_id: (teamObj as any)?.id || 'none'
        };
      });

      setPlayers(parsedPlayers);

      const uniqueTeams = new Map<string, string>();
      parsedPlayers.forEach(p => {
        if (p.team_id !== 'none' && p.team_name) {
          uniqueTeams.set(p.team_id, p.team_name);
        }
      });
      setTeams(Array.from(uniqueTeams.entries()).map(([id, name]) => ({ id, name })));

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(p => {
    const matchesSearch = `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = selectedTeam === "all" || p.team_id === selectedTeam;
    return matchesSearch && matchesTeam;
  });

  /** Trigger mass ZIP download via the API route */
  const handleMassDownload = async () => {
    setMassDownloading(true);
    const scope = massDownloadTeam === "all" ? "todo el club" : teams.find(t => t.id === massDownloadTeam)?.name || "equipo";
    const toastId = toast.loading(`Generando ZIP de ${scope}... Esto puede tardar unos segundos.`);

    try {
      const url = massDownloadTeam === "all"
        ? "/api/admin/export-documents"
        : `/api/admin/export-documents?team_id=${massDownloadTeam}`;

      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }

      // Trigger browser download from the blob response
      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") || "";
      const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
      const fileName = fileNameMatch?.[1] || `Expedientes_${scope}.zip`;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);

      toast.success(`✅ Descarga completada: ${fileName}`, { id: toastId, duration: 5000 });
    } catch (err: any) {
      toast.error(`Error al generar el ZIP: ${err.message}`, { id: toastId });
    } finally {
      setMassDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-5 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-blue-600" />
            Gestor Documental Centralizado
          </h1>
          <p className="text-gray-500">Consulta y descarga de expedientes completos (Fichas, DNIs, FFCV)</p>
        </div>
      </div>

      {/* ====== MASS DOWNLOAD PANEL ====== */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 shadow-lg border border-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <Archive className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Exportación Masiva de Expedientes</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Descarga todos los documentos de un equipo o del club entero en un único archivo ZIP
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Team selector for mass download */}
            <div className="relative flex items-center">
              <Building2 className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={massDownloadTeam}
                onChange={e => setMassDownloadTeam(e.target.value)}
                disabled={massDownloading}
                className="pl-9 pr-4 py-2.5 bg-slate-700 border border-slate-600 text-white text-sm rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 min-w-[200px]"
              >
                <option value="all">🏟️ Todo el club</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>⚽ {t.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleMassDownload}
              disabled={massDownloading || loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {massDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando ZIP...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Descargar ZIP
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs bg-slate-700/60 text-slate-300 px-2.5 py-1 rounded-full border border-slate-600/50">
            📁 Estructura: Equipo / Jugador / Archivo
          </span>
          <span className="text-xs bg-slate-700/60 text-slate-300 px-2.5 py-1 rounded-full border border-slate-600/50">
            🔒 Acceso seguro con Service Role
          </span>
          <span className="text-xs bg-amber-600/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30">
            ⏳ Puede tardar 30-60 s si hay muchos archivos
          </span>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Player list */}
        <Card className="lg:col-span-1 shadow-sm border border-gray-200 h-[calc(100vh-380px)] lg:h-[calc(100vh-300px)] flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-gray-50 space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Buscar jugador..." 
                className="pl-9 bg-white" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative flex items-center">
              <Filter className="absolute left-3 w-4 h-4 text-gray-400" />
              <select
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="all">Todos los equipos</option>
                <option value="none">Sin equipo asignado</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400 text-right">{filteredPlayers.length} jugadores</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-400 animate-pulse">Cargando base de datos...</div>
            ) : filteredPlayers.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No se encontraron jugadores</div>
            ) : (
              <ul className="divide-y divide-gray-100 pb-4">
                {filteredPlayers.map(player => (
                  <li key={player.id}>
                    <button 
                      onClick={() => setSelectedPlayer(player)}
                      className={`w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center gap-3 ${selectedPlayer?.id === player.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="bg-gray-100 p-2 rounded-full text-gray-500 shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden w-full">
                        <p className="font-semibold text-gray-900 truncate">{player.first_name} {player.last_name}</p>
                        <div className="flex justify-between items-center mt-0.5">
                          <p className={`text-xs ${player.status === 'pending_revision' ? 'text-yellow-600' : 'text-green-600'}`}>
                            {player.category}
                          </p>
                          <p className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {player.team_name}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Right: Document viewer */}
        <div className={`
          lg:col-span-2 lg:h-[calc(100vh-300px)] lg:block lg:static lg:bg-transparent lg:z-auto lg:p-0
          ${selectedPlayer ? 'fixed inset-0 z-[100] bg-slate-900/60 p-4 flex flex-col items-center justify-center animate-in fade-in duration-200' : 'hidden'}
        `}>
          {selectedPlayer ? (
            <Card className="w-full max-w-4xl h-full max-h-[90vh] lg:max-h-full shadow-2xl lg:shadow-sm border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 lg:animate-none">
              <div className="p-4 md:p-6 border-b flex justify-between items-center bg-white shrink-0">
                <div className="overflow-hidden pr-4">
                  <h2 className="text-xl font-bold text-gray-900 truncate">{selectedPlayer.first_name} {selectedPlayer.last_name}</h2>
                  <p className="text-sm text-gray-500 truncate">{selectedPlayer.team_name}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedPlayer(null)} className="shrink-0 rounded-full w-10 h-10 p-0 flex items-center justify-center">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-slate-50">
                <DocumentManager 
                  playerId={selectedPlayer.id} 
                  playerName={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`} 
                />
              </div>
            </Card>
          ) : (
            <Card className="h-full shadow-sm border border-gray-200 border-dashed hidden lg:flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
              <FolderOpen className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">Ningún expediente seleccionado</p>
              <p className="text-sm text-center max-w-sm mt-2">
                Selecciona un jugador del listado de la izquierda para explorar y descargar su documentación.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
