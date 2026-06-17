"use client";
import { ForumTab } from "./ForumTab";

export type TabType =
  | "resumen"
  | "convocatoria"
  | "estadisticas"
  | "alineacion"
  | "post-partido"
  | "foro"
  | "live"
  | "tareas";

interface TabOption {
  id: TabType;
  label: string;
  hasPulse?: boolean;
}

const TAB_OPTIONS: TabOption[] = [
  { id: "resumen", label: "Resumen" },
  { id: "convocatoria", label: "Convocatoria" },
  { id: "estadisticas", label: "Estadísticas" },
  { id: "alineacion", label: "Alineación" },
  { id: "post-partido", label: "Post-Partido" },
  { id: "foro", label: "Foro" },
  { id: "live", label: "En Directo", hasPulse: true },
];

interface MatchTabsProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  matchId: string;
}

export function MatchTabs({ activeTab, onChangeTab, matchId }: MatchTabsProps) {
  return (
    <>
      <div className="sticky top-0 bg-white z-20 shadow-sm border-b border-slate-150 -mx-4 md:-mx-8 px-4 md:px-8 mb-4 md:mb-0">
        
        {/* Mobile Dropdown */}
        <div className="md:hidden py-3">
          <select
            value={activeTab}
            onChange={(e) => onChangeTab(e.target.value as TabType)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-xl px-4 py-3 outline-none appearance-none shadow-sm focus:ring-2 focus:ring-blue-500"
          >
            {TAB_OPTIONS.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label} {tab.hasPulse ? "🔴 (En Directo)" : ""}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center px-2 text-slate-500">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:flex overflow-x-auto no-scrollbar max-w-6xl mx-auto">
          <div className="flex whitespace-nowrap min-w-full">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={[
                  "px-5 py-4 text-xs font-bold transition-all relative flex items-center gap-1.5 border-b-2 uppercase tracking-wider",
                  activeTab === tab.id
                    ? "text-blue-600 border-blue-600 font-extrabold bg-blue-50/20"
                    : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50/50",
                ].join(" ")}
              >
                {tab.hasPulse && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {activeTab === "foro" && <ForumTab matchId={matchId} />}
    </>
  );
}
