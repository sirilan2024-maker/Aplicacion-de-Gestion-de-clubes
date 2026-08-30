"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  FileText,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowRight,
  Search,
  Loader2,
  ShieldCheck,
  Info,
} from "lucide-react";
import { getFfcvIntegrationStatusAction, type FfcvIntegrationData } from "@/app/actions/club-actions";

export default function FfcvApiPage() {
  const [data, setData] = useState<FfcvIntegrationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scraperUrl, setScraperUrl] = useState("https://competiciones.ffcv.es");
  const [isScraping, setIsScraping] = useState(false);
  const [standings, setStandings] = useState<any[] | null>(null);
  const [scraperError, setScraperError] = useState<string | null>(null);
  const [scraperSuccess, setScraperSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await getFfcvIntegrationStatusAction();
        if (!res.success || !res.data) {
          setError(res.error || "No se pudo cargar la información de integración FFCV.");
        } else {
          setData(res.data);
        }
      } catch (err: any) {
        setError(err.message || "Error al conectar con el servidor.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleFetchStandings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scraperUrl.trim()) {
      setScraperError("Introduce una URL pública de la FFCV.");
      return;
    }

    try {
      const parsed = new URL(scraperUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        setScraperError("Protocolo no permitido. Solo se admite https://");
        return;
      }
      const allowed = ["ffcv.es", "competiciones.ffcv.es", "novanet.es"];
      const host = parsed.hostname.toLowerCase();
      const isDomainAllowed = allowed.some((d) => host === d || host.endsWith(`.${d}`));
      if (!isDomainAllowed) {
        setScraperError(
          "Dominio no permitido. Por seguridad, solo se admiten fuentes de ffcv.es, competiciones.ffcv.es y novanet.es."
        );
        return;
      }
    } catch {
      setScraperError("La URL introducida no es válida.");
      return;
    }

    setIsScraping(true);
    setScraperError(null);
    setScraperSuccess(null);
    setStandings(null);

    try {
      const res = await fetch(`/api/ffcv-scraper?url=${encodeURIComponent(scraperUrl)}`);
      const resData = await res.json();

      if (!res.ok) {
        setScraperError(resData.error || "No se pudo obtener la clasificación de la URL especificada.");
        return;
      }

      if (!resData.data || resData.data.length === 0) {
        setScraperError("No se encontraron filas de clasificación en la página solicitada.");
        return;
      }

      setStandings(resData.data);
      setScraperSuccess(`Se han extraído con éxito ${resData.data.length} posiciones de la clasificación.`);
    } catch (err: any) {
      setScraperError(err.message || "Error al conectar con el servicio de scraping.");
    } finally {
      setIsScraping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Cargando estado de integración FFCV...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-rose-900">Error de Acceso</h3>
            <p className="text-sm text-rose-700 mt-1">
              {error || "No se pudo cargar la información de integración FFCV."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { club, sources, teams } = data;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  Integración FFCV / Novanet
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Fuentes Públicas
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Estado federativo del club <strong className="text-slate-800">{club.name}</strong> y sincronización deportiva oficial.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/calendario-ffcv"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            Importador PDF
          </Link>
        </div>
      </div>

      {/* BANNER OFICIAL DE TRANSPARENCIA FFCV */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <XCircle className="w-3.5 h-3.5" />
              API oficial FFCV: NO DISPONIBLE
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              La Federación no dispone actualmente de API pública
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              La aplicación utiliza actualmente fuentes públicas disponibles. Por motivos de seguridad e integridad técnica, no se simulan falsas APIs federativas, no se almacenan credenciales ni se automatizan accesos que infrinjan los términos de servicio.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs text-slate-300 font-medium">Partidos en el Club</p>
              <p className="text-2xl font-black text-white">{sources.calendarPdf.matchesCount}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs text-slate-300 font-medium">Equipos Registrados</p>
              <p className="text-2xl font-black text-white">{sources.calendarPdf.teamsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ESTADO DE INTEGRACIÓN - 3 TARJETAS */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
          Estado de Integración de Fuentes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* TARJETA 1: API OFICIAL */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                <Globe className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                NO DISPONIBLE
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">API Oficial Pública</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Sin soporte oficial de API para clubes. No se crean mocks ni accesos simulados.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Arquitectura lista para futura API oficial
            </div>
          </div>

          {/* TARJETA 2: CALENDARIO OFICIAL PDF */}
          <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 space-y-4 shadow-sm hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <FileText className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                DISPONIBLE
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Calendario Oficial PDF</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Importación y generación automática de partidos a partir del documento PDF oficial.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700">
                {sources.calendarPdf.matchesCount} partidos registrados
              </span>
              <Link
                href="/admin/calendario-ffcv"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Importar <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* TARJETA 3: CLASIFICACIONES PÚBLICAS */}
          <div className="bg-white border border-blue-200/80 rounded-2xl p-5 space-y-4 shadow-sm hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                DISPONIBLE
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Clasificaciones Públicas</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Consulta y renderizado de tablas oficiales mediante el scraper con aislamiento SSRF.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">ffcv.es & novanet.es</span>
              <a
                href="#seccion-clasificaciones"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Consultar <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: CALENDARIO OFICIAL FFCV (PDF) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">
                1. Calendario Oficial FFCV (PDF)
              </h2>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Estado de partidos federativos vinculados a los equipos de <strong>{club.name}</strong>.
            </p>
          </div>
          <Link
            href="/admin/calendario-ffcv"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
          >
            Abrir Importador Oficial de Calendarios
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* TABLA DE EQUIPOS DEL CLUB */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-center">Partidos Cargados</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-xs">
                    No hay equipos registrados en este club.
                  </td>
                </tr>
              ) : (
                teams.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{t.name}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">{t.category}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          t.matchesCount > 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {t.matchesCount} partidos
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href="/admin/calendario-ffcv"
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Importar PDF &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <strong>Instrucciones para el club:</strong> Descarga el PDF del calendario oficial desde la web de la FFCV para cada categoría. A continuación, accede al importador, selecciona el equipo destino e introduce el nombre tal y como figura en el documento oficial para poblar el calendario deportivo.
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: CLASIFICACIONES PÚBLICAS (SCRAPER) */}
      <div id="seccion-clasificaciones" className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">
              2. Consulta de Clasificaciones Públicas
            </h2>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Consulta en directo la tabla de clasificación pública de cualquier grupo oficial mediante el extractor seguro.
          </p>
        </div>

        {/* FORMULARIO DE CONSULTA */}
        <form onSubmit={handleFetchStandings} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              URL Pública de la Competición en FFCV / Novanet
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={scraperUrl}
                  onChange={(e) => setScraperUrl(e.target.value)}
                  placeholder="https://competiciones.ffcv.es/..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={isScraping}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm"
              >
                {isScraping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Consultar Clasificación
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Dominios admitidos: <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">ffcv.es</code>, <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">competiciones.ffcv.es</code>, <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">novanet.es</code>.
            </p>
          </div>
        </form>

        {/* FEEDBACK STATUS */}
        {scraperError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900">No se pudo obtener la clasificación</p>
              <p className="text-xs text-rose-700 mt-0.5">{scraperError}</p>
            </div>
          </div>
        )}

        {scraperSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-900">Datos obtenidos correctamente</p>
              <p className="text-xs text-emerald-700 mt-0.5">{scraperSuccess}</p>
            </div>
          </div>
        )}

        {/* TABLA DE CLASIFICACIÓN */}
        {standings && standings.length > 0 && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">
                Tabla Oficial de Clasificación
              </span>
              <span className="text-xs text-slate-300">
                {standings.length} equipos clasificados
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12">#</th>
                    <th className="px-3 py-2.5">Equipo</th>
                    <th className="px-3 py-2.5 text-center font-black">Ptos</th>
                    <th className="px-3 py-2.5 text-center">PJ</th>
                    <th className="px-3 py-2.5 text-center">PG</th>
                    <th className="px-3 py-2.5 text-center">PE</th>
                    <th className="px-3 py-2.5 text-center">PP</th>
                    <th className="px-3 py-2.5 text-center">GF</th>
                    <th className="px-3 py-2.5 text-center">GC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {standings.map((row: any, idx: number) => {
                    const pos = row.position || idx + 1;
                    const teamName = row.team || row.col_1 || row.col_2 || "Equipo";
                    const pts = row.points ?? row.col_2 ?? "-";
                    const played = row.played ?? row.col_3 ?? "-";
                    const won = row.won ?? row.col_4 ?? "-";
                    const drawn = row.drawn ?? row.col_5 ?? "-";
                    const lost = row.lost ?? row.col_6 ?? "-";
                    const gf = row.gf ?? row.col_7 ?? "-";
                    const gc = row.gc ?? row.col_8 ?? "-";

                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          idx < 3 ? "bg-amber-50/20" : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-center font-bold text-slate-700">
                          {pos}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900 flex items-center gap-2">
                          {row.logo && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={row.logo}
                              alt=""
                              className="w-4 h-4 object-contain rounded"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          )}
                          <span>{teamName}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-black text-indigo-700">
                          {pts}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600">{played}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{won}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{drawn}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{lost}</td>
                        <td className="px-3 py-2 text-center text-emerald-600">{gf}</td>
                        <td className="px-3 py-2 text-center text-rose-600">{gc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER INFORMATIVO */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs text-slate-500">
        <span>Gestión de fuentes federativas públicas para el club deportivo.</span>
        <a
          href="https://ffcv.es"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
        >
          Portal FFCV Oficial <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

