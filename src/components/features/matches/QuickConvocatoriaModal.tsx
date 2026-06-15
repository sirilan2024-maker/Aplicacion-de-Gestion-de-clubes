"use client"

import { X, Users } from "lucide-react"
import { ConvocatoriaList } from "./ConvocatoriaList"

interface QuickConvocatoriaModalProps {
  matchId: string;
  matchSubtitle?: string;
  players: any[];
  convocatorias: any[];
  onClose: () => void;
}

export function QuickConvocatoriaModal({ matchId, matchSubtitle, players, convocatorias, onClose }: QuickConvocatoriaModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Convocatoria Previa Rápida</h3>
              {matchSubtitle && (
                <p className="text-slate-500 text-sm mt-1">{matchSubtitle}</p>
              )}
            </div>
          </div>
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-hidden flex flex-col p-4 sm:p-6 bg-slate-50/50 flex-1 min-h-0">
          <ConvocatoriaList players={players} matchId={matchId} convocatorias={convocatorias} onCloseModal={onClose} />
        </div>
      </div>
    </div>
  )
}
