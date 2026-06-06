"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Calendar, Plus, Clock, MapPin } from "lucide-react"

export default function TrainingPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('training_sessions')
      .select(`
        id,
        date_time,
        duration_minutes,
        location,
        team:teams(name),
        sesiones_ejercicios(
          orden,
          duracion_bloque,
          ejercicio:banco_ejercicios(nombre, tipo)
        )
      `)
      .order('date_time', { ascending: false })
    
    if (data) {
      const formattedSessions = data.map(s => {
        // Ordenar ejercicios por la columna 'orden'
        const rawExercises = s.sesiones_ejercicios || [];
        const sortedExercises = [...rawExercises].sort((a: any, b: any) => a.orden - b.orden);

        return {
          id: s.id,
          team: s.team ? (s.team as any).name : 'Sin equipo',
          date: s.date_time,
          duration: s.duration_minutes,
          location: s.location,
          exercises: sortedExercises
        }
      })
      setSessions(formattedSessions)
    } else if (error) {
      console.error("Error fetching sessions:", error)
    }
    setIsLoading(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Entrenamientos</h1>
          <p className="mt-2 text-sm text-gray-500">
            Planifica las sesiones de entrenamiento para los equipos.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Sesión
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <div key={session.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:-translate-y-1">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
              <h3 className="font-semibold text-gray-900">{session.team}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="mr-3 h-5 w-5 text-amber-500" />
                {new Date(session.date).toLocaleDateString()} a las {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="mr-3 h-5 w-5 text-amber-500" />
                {session.duration} minutos
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="mr-3 h-5 w-5 text-amber-500" />
                {session.location}
              </div>
              
              {/* Tareas / Ejercicios Asignados */}
              {session.exercises && session.exercises.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Planificación ({session.exercises.length} tareas)
                  </h4>
                  <div className="space-y-2">
                    {session.exercises.map((ex: any, index: number) => (
                      <div key={index} className="flex items-start text-sm bg-gray-50 rounded-md p-2 border border-gray-100">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">
                          {ex.orden}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 leading-tight">
                            {ex.ejercicio?.nombre || 'Ejercicio desconocido'}
                          </p>
                          <div className="flex gap-2 text-xs text-gray-500 mt-1">
                            <span className="capitalize">{ex.ejercicio?.tipo || 'N/A'}</span>
                            {ex.duracion_bloque && (
                              <>
                                <span>•</span>
                                <span>{ex.duracion_bloque} min</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-2">
                <Button variant="outline" className="w-full">Editar</Button>
                <Button variant="destructive" className="w-full">Cancelar</Button>
              </div>
            </div>
          </div>
        ))}
        {sessions.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center text-gray-500 ring-1 ring-gray-200 rounded-xl">
            No hay entrenamientos planificados.
          </div>
        )}
        {isLoading && (
          <div className="col-span-full p-12 text-center text-gray-500 ring-1 ring-gray-200 rounded-xl">
            Cargando entrenamientos...
          </div>
        )}
      </div>
    </div>
  )
}
