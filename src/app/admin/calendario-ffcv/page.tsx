"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function FfcvCalendarPage() {
  const [equipos, setEquipos] = useState<any[]>([])
  const [selectedEquipo, setSelectedEquipo] = useState("")
  const [pdfTeamName, setPdfTeamName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string, details?: any } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const loadEquipos = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single()
        if (profile?.club_id) {
          const { data } = await supabase.from('teams').select('id, name, category').eq('club_id', profile.club_id).order('name')
          if (data) setEquipos(data)
        }
      }
    }
    loadEquipos()
  }, [supabase])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !selectedEquipo || !pdfTeamName) {
      setResult({ type: 'error', message: 'Selecciona un equipo, indica su nombre exacto en la FFCV y sube un archivo PDF.' })
      return
    }

    setIsUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('equipo_id', selectedEquipo)
    formData.append('pdf_team_name', pdfTeamName)

    try {
      const res = await fetch('/api/parse-ffcv', {
        method: 'POST',
        body: formData,
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setResult({ type: 'error', message: data.error || 'Error desconocido', details: data })
        setIsUploading(false)
        return
      }

      setResult({ type: 'success', message: data.message, details: data.matches })
      setFile(null) // Reset file
      // Reset input via ref could be done here if needed
    } catch (error: any) {
      setResult({ type: 'error', message: error.message })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          Importador de Calendarios FFCV
        </h1>
        <p className="text-slate-500 mt-2">
          Sube el archivo PDF oficial de la Federación para extraer y generar automáticamente los partidos de la temporada.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* FORMULARIO */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* EQUIPO SELECTOR */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                1. Selecciona el Equipo Destino
              </label>
              <select 
                value={selectedEquipo} 
                onChange={(e) => setSelectedEquipo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 text-slate-900"
                required
              >
                <option value="" disabled>-- Elige un equipo --</option>
                {equipos.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.name} ({eq.category})</option>
                ))}
              </select>
            </div>

            {/* FFCV TEAM NAME EXACT MATCH */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                2. Nombre exacto en el PDF FFCV
              </label>
              <input 
                type="text"
                placeholder='Ej: Sporting Saladar "A"'
                value={pdfTeamName}
                onChange={(e) => setPdfTeamName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 text-slate-900"
                required
              />
              <p className="text-xs text-slate-500 mt-2">
                Escribe cómo aparece literalmente el equipo en la federación para que el sistema lo pueda aislar (ej: <strong>Sporting Saladar A</strong>).
              </p>
            </div>

            {/* PDF UPLOAD */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                3. Sube el archivo PDF
              </label>
              
              <label className={cn(
                "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-colors",
                file ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
              )}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {file ? (
                    <>
                      <FileText className="w-10 h-10 text-blue-500 mb-3" />
                      <p className="mb-2 text-sm text-blue-700 font-semibold">{file.name}</p>
                      <p className="text-xs text-blue-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-slate-400 mb-3" />
                      <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
                      <p className="text-xs text-slate-400">Solo archivos PDF (Max. 10MB)</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept=".pdf,application/pdf" onChange={handleFileChange} />
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isUploading || !file || !selectedEquipo}
              className="w-full flex justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isUploading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Analizando documento con IA...</>
              ) : (
                <><Upload className="h-5 w-5" /> Importar Calendario</>
              )}
            </button>
          </form>

          {/* RESULTS */}
          {result && (
            <div className={cn(
              "mt-6 p-4 rounded-xl border flex flex-col gap-3",
              result.type === 'success' ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
            )}>
              <div className="flex items-start gap-3">
                {result.type === 'success' ? <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" /> : <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />}
                <div>
                  <h3 className="font-bold text-sm">{result.type === 'success' ? 'Operación Exitosa' : 'Error en la Importación'}</h3>
                  <p className="text-sm mt-1">{result.message}</p>
                </div>
              </div>
              
              {result.type === 'error' && result.details?.debugInfo && (
                <div className="mt-2 text-xs bg-red-100/50 p-3 rounded font-mono border border-red-200">
                  <p className="font-bold mb-1">Información de Diagnóstico:</p>
                  {result.details.debugInfo}
                </div>
              )}

              {result.type === 'error' && result.details?.preview && (
                <div className="mt-2 text-xs bg-white/50 p-3 rounded overflow-auto max-h-48 font-mono border border-red-100">
                  <p className="font-bold mb-1">Texto detectado (Primeros 500 caracteres):</p>
                  {result.details.preview}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SIDEBAR HELP */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 h-fit">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            ¿Cómo funciona?
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="font-black text-slate-400">1.</span>
              <span>Descarga el calendario oficial en PDF desde la plataforma Novanet de la FFCV.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-black text-slate-400">2.</span>
              <span>El sistema extraerá el texto e identificará los rivales.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-black text-slate-400">3.</span>
              <span>Los partidos se crearán automáticamente en estado "Programado" para que el entrenador solo tenga que ajustar el día y la hora final.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
