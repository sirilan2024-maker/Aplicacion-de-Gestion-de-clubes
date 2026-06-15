"use client";
import { ForumTab } from "./ForumTab";

export type TabType =
  | "resumen"
  | "convocatoria"
  | "estadisticas"
  | "alineacion"
  | "post-partido"
  | "foro"
  | "live";

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
      <div className="sticky top-0 bg-white z-20 shadow-sm border-b border-slate-150 -mx-4 md:-mx-8 px-4 md:px-8">
        <div className="flex overflow-x-auto no-scrollbar max-w-6xl mx-auto">
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
