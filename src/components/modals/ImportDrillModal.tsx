'use client';

import React, { useState } from 'react';
import {
  X, Globe, Sparkles, Loader2, CheckCircle2, ArrowRight,
  Link as LinkIcon, ListChecks, Layers, CheckSquare, Square,
  AlertCircle, RefreshCw, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TacticalPitch } from '@/components/tactical/TacticalPitch';
import {
  discoverDrillsFromUrlAction,
  importDrillFromUrlAction,
  type DiscoveredDrillItem
} from '@/actions/importDrillAction';
import toast from 'react-hot-toast';
import type { FootballCategory } from '@/types/microcycle';
import type { Ejercicio } from '@/types/exercises';

interface ImportDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDrillImported?: (drill: Ejercicio) => void;
  defaultCategory?: FootballCategory;
}

export function ImportDrillModal({
  isOpen,
  onClose,
  onDrillImported,
  defaultCategory = 'senior',
}: ImportDrillModalProps) {
  // Tabs: 'scanner' (descubrir o importar masivo) | 'direct' (pegar lista)
  const [activeMode, setActiveMode] = useState<'scanner' | 'batch_list'>('scanner');
  const [url, setUrl] = useState('https://coachtruly.com/drill-database/football');
  const [batchUrlsText, setBatchUrlsText] = useState('');
  const [category, setCategory] = useState<FootballCategory>(defaultCategory);

  // Escaneo
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDrills, setDiscoveredDrills] = useState<DiscoveredDrillItem[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  // Proceso de Importación Masiva
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; currentTitle: string }>({
    current: 0,
    total: 0,
    currentTitle: '',
  });
  const [importedDrills, setImportedDrills] = useState<Ejercicio[]>([]);
  const [failedCount, setFailedCount] = useState(0);

  if (!isOpen) return null;

  // 1. Escanear enlaces de la página web
  const handleScanUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() || !url.startsWith('http')) {
      toast.error('Introduce una URL válida que empiece por https:// o http://');
      return;
    }

    setIsScanning(true);
    setDiscoveredDrills([]);
    setSelectedUrls(new Set());
    setImportedDrills([]);

    try {
      const res = await discoverDrillsFromUrlAction(url.trim());
      if (res.success && res.drills.length > 0) {
        setDiscoveredDrills(res.drills);
        // Seleccionar todos por defecto
        setSelectedUrls(new Set(res.drills.map((d) => d.url)));
        if (res.isCatalog) {
          toast.success(`🎯 ¡Se encontraron ${res.drills.length} ejercicios en la página!`);
        } else {
          toast.success('Se detectó 1 ejercicio en la página.');
        }
      } else {
        toast.error(res.error || 'No se encontraron enlaces de ejercicios en esta página.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al conectar');
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle selección de ejercicio
  const toggleSelectDrill = (drillUrl: string) => {
    const next = new Set(selectedUrls);
    if (next.has(drillUrl)) {
      next.delete(drillUrl);
    } else {
      next.add(drillUrl);
    }
    setSelectedUrls(next);
  };

  const toggleSelectAll = () => {
    if (selectedUrls.size === discoveredDrills.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(discoveredDrills.map((d) => d.url)));
    }
  };

  // 2. Ejecutar la importación masiva de los seleccionados
  const handleImportSelected = async () => {
    const targets = discoveredDrills.filter((d) => selectedUrls.has(d.url));
    if (targets.length === 0) {
      toast.error('Selecciona al menos un ejercicio para importar.');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: targets.length, currentTitle: targets[0].title });
    const successList: Ejercicio[] = [];
    let fails = 0;
    let lastError = '';

    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      setImportProgress({ current: i + 1, total: targets.length, currentTitle: item.title });

      try {
        const res = await importDrillFromUrlAction(item.url, category);
        if (res.success && (res.drills || res.drill)) {
          const items = res.drills && res.drills.length > 0 ? res.drills : [res.drill];
          items.forEach((d: any) => {
            successList.push(d);
            if (onDrillImported) onDrillImported(d);
          });
        } else {
          fails++;
          if (res.error) lastError = res.error;
        }
      } catch (err: any) {
        fails++;
        lastError = err.message || 'Error de red';
      }

      // Pequeña pausa de 350ms para evitar saturación
      if (i < targets.length - 1) {
        await new Promise((r) => setTimeout(r, 350));
      }
    }

    setImportedDrills(successList);
    setFailedCount(fails);
    setIsImporting(false);

    if (successList.length > 0) {
      toast.success(`🎉 ¡${successList.length} ejercicios digitalizados e importados con sus pizarras SVG!`);
    } else {
      toast.error(lastError || 'No se pudo importar ningún ejercicio.');
    }
  };

  // 3. Importación desde lista de URLs pegadas
  const handleImportBatchList = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = batchUrlsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http'));

    if (lines.length === 0) {
      toast.error('Pega al menos una URL válida (una por línea).');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: lines.length, currentTitle: lines[0] });
    const successList: Ejercicio[] = [];
    let fails = 0;
    let lastError = '';

    for (let i = 0; i < lines.length; i++) {
      const link = lines[i];
      setImportProgress({ current: i + 1, total: lines.length, currentTitle: link });

      try {
        const res = await importDrillFromUrlAction(link, category);
        if (res.success && (res.drills || res.drill)) {
          const items = res.drills && res.drills.length > 0 ? res.drills : [res.drill];
          items.forEach((d: any) => {
            successList.push(d);
            if (onDrillImported) onDrillImported(d);
          });
        } else {
          fails++;
          if (res.error) lastError = res.error;
        }
      } catch (err: any) {
        fails++;
        lastError = err.message || 'Error de red';
      }

      if (i < lines.length - 1) {
        await new Promise((r) => setTimeout(r, 350));
      }
    }

    setImportedDrills(successList);
    setFailedCount(fails);
    setIsImporting(false);

    if (successList.length > 0) {
      toast.success(`🎉 ¡${successList.length} ejercicios importados con éxito!`);
    } else {
      toast.error(lastError || 'No se pudo importar ningún ejercicio.');
    }
  };

  const handleReset = () => {
    setDiscoveredDrills([]);
    setSelectedUrls(new Set());
    setImportedDrills([]);
    setIsImporting(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shadow-inner">
              <Globe className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="font-black text-base leading-tight">Importación Masiva de Ejercicios Web</h2>
              <p className="text-xs text-blue-200">Escanea catálogos completos (CoachTruly, blogs) y genera pizarras SVG</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de modo y categoría */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => { setActiveMode('scanner'); handleReset(); }}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                activeMode === 'scanner' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌐 Escanear Catálogo / Web
            </button>
            <button
              type="button"
              onClick={() => { setActiveMode('batch_list'); handleReset(); }}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                activeMode === 'batch_list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Pegar Lista de Enlaces
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Categoría:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FootballCategory)}
              className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 capitalize focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {['querubin', 'prebenjamin', 'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil', 'senior'].map((c) => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* ── ESTADO 1: PROGRESO DE IMPORTACIÓN ACTIVA ──────────────── */}
          {isImporting && (
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl space-y-4 text-center animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/30">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Importando {importProgress.current} de {importProgress.total} ejercicios
                </h3>
                <p className="text-xs text-blue-700 font-semibold mt-1 truncate max-w-md mx-auto">
                  Procesando: &ldquo;{importProgress.currentTitle}&rdquo;
                </p>
              </div>

              {/* Barra de progreso */}
              <div className="w-full bg-blue-200/60 rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{
                    width: `${Math.round((importProgress.current / (importProgress.total || 1)) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-500">
                Cada ejercicio se analiza con IA para diseñar su pizarra táctica SVG con conos y jugadores.
              </p>
            </div>
          )}

          {/* ── ESTADO 2: RESUMEN DE IMPORTADOS ───────────────────────── */}
          {!isImporting && importedDrills.length > 0 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-black text-sm">
                      ¡{importedDrills.length} ejercicios importados y digitalizados!
                    </h3>
                    <p className="text-xs text-emerald-700">
                      Ya están guardados en tu biblioteca con sus pizarras tácticas SVG y vectores de búsqueda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de ejercicios importados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {importedDrills.map((drill) => (
                  <div key={drill.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div className="w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden border bg-white">
                      {drill.tactical_board_data && (
                        <TacticalPitch data={drill.tactical_board_data} className="w-full h-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{drill.nombre}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 capitalize">
                        {drill.age_category || category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" onClick={handleReset} className="text-xs">
                  Importar más ejercicios
                </Button>
                <Button type="button" onClick={onClose} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
                  Listo y Ver en Biblioteca
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── MODO 1: ESCANEAR CATÁLOGO / WEB ───────────────────────── */}
          {!isImporting && importedDrills.length === 0 && activeMode === 'scanner' && (
            <div className="space-y-4">
              <form onSubmit={handleScanUrl} className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                  URL del Catálogo o Página con Ejercicios
                </label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="Ej: https://coachtruly.com/drill-database/football..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isScanning}
                    className="bg-slate-50 border-slate-200 rounded-xl text-sm font-medium focus:bg-white"
                  />
                  <Button
                    type="submit"
                    disabled={isScanning || !url.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap gap-1.5 shadow-sm"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Escaneando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Escanear Enlaces
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Puedes poner la página principal de la base de datos de CoachTruly (o cualquier categoría) y el sistema descubrirá todos los ejercicios.
                </p>
              </form>

              {/* Lista de ejercicios encontrados para seleccionar */}
              {discoveredDrills.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-200 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900"
                    >
                      {selectedUrls.size === discoveredDrills.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Seleccionar todos ({discoveredDrills.length})</span>
                    </button>

                    <span className="text-xs font-semibold text-slate-500">
                      {selectedUrls.size} de {discoveredDrills.length} seleccionados
                    </span>
                  </div>

                  {/* Tarjetas de ejercicios descubiertos */}
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {discoveredDrills.map((item) => {
                      const isSelected = selectedUrls.has(item.url);
                      return (
                        <div
                          key={item.url}
                          onClick={() => toggleSelectDrill(item.url)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-300 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 truncate">{item.title}</p>
                              {item.description && (
                                <p className="text-[11px] text-slate-500 truncate max-w-md">{item.description}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline flex-shrink-0">
                            {new URL(item.url).pathname.split('/').pop()}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Botón de acción masiva */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleImportSelected}
                      disabled={selectedUrls.size === 0}
                      className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                    >
                      <Sparkles className="w-4 h-4" />
                      Importar Seleccionados ({selectedUrls.size})
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MODO 2: LISTA DE URLs PEGADAS ────────────────────────── */}
          {!isImporting && importedDrills.length === 0 && activeMode === 'batch_list' && (
            <form onSubmit={handleImportBatchList} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-blue-600" />
                  Pega las URLs de los ejercicios (una por línea)
                </label>
                <textarea
                  rows={6}
                  value={batchUrlsText}
                  onChange={(e) => setBatchUrlsText(e.target.value)}
                  placeholder={`https://coachtruly.com/drill-database/football/finishing-from-crosses\nhttps://coachtruly.com/drill-database/football/pass-and-break-through\nhttps://coachtruly.com/drill-database/football/deceive-your-opponent`}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400">
                  El sistema procesará cada URL una por una, extrayendo la metodología y generando su pizarra táctica SVG interactiva.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={!batchUrlsText.trim()}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  Iniciar Importación Masiva
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportDrillModal;
