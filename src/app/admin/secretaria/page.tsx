"use client";

import React, { useState, useEffect } from "react";
import { Search, FolderOpen, Users, Filter, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { DocumentManager } from "@/components/features/admin/DocumentManager";

interface PlayerBrief {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  category: string;
}

export default function DocumentManagementPage() {
  const [players, setPlayers] = useState<PlayerBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerBrief | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, last_name, status')
        .neq('status', 'inactive')
        .order('first_name', { ascending: true });

      if (error) throw error;
      
      // Mapeo básico (en un sistema real 'category' podría venir de un join con team)
      setPlayers((data || []).map(p => ({
        ...p,
        category: p.status === 'pending_revision' ? 'Inscripción Pdte' : 'Jugador Oficial'
      })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-blue-600" />
            Gestor Documental Centralizado
          </h1>
          <p className="text-gray-500">Consulta y descarga de expedientes completos (Fichas, DNIs, FFCV)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Izquierdo: Lista de Jugadores */}
        <Card className="lg:col-span-1 shadow-sm border border-gray-200 h-[calc(100vh-180px)] flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Buscar jugador..." 
                className="pl-9 bg-white" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-400 animate-pulse">Cargando base de datos...</div>
            ) : filteredPlayers.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No se encontraron jugadores</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredPlayers.map(player => (
                  <li key={player.id}>
                    <button 
                      onClick={() => setSelectedPlayer(player)}
                      className={`w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center gap-3 ${selectedPlayer?.id === player.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="bg-gray-100 p-2 rounded-full text-gray-500 shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-semibold text-gray-900 truncate">{player.first_name} {player.last_name}</p>
                        <p className={`text-xs mt-0.5 ${player.status === 'pending_revision' ? 'text-yellow-600' : 'text-green-600'}`}>
                          {player.category}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Lado Derecho: Visor del Expediente */}
        <div className="lg:col-span-2 h-[calc(100vh-180px)]">
          {selectedPlayer ? (
            <Card className="h-full shadow-sm border border-gray-200 flex flex-col">
              <div className="p-6 border-b flex justify-between items-center bg-white rounded-t-xl">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedPlayer.first_name} {selectedPlayer.last_name}</h2>
                  <p className="text-sm text-gray-500">Expediente del jugador</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPlayer(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto bg-slate-50 rounded-b-xl">
                <DocumentManager 
                  playerId={selectedPlayer.id} 
                  playerName={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`} 
                />
              </div>
            </Card>
          ) : (
            <Card className="h-full shadow-sm border border-gray-200 border-dashed flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
              <FolderOpen className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">Ningún expediente seleccionado</p>
              <p className="text-sm text-center max-w-sm mt-2">
                Selecciona un jugador del listado de la izquierda para explorar y descargar masivamente toda su documentación legal y certificados.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
