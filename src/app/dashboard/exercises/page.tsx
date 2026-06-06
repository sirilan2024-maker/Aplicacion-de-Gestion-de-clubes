"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, Clock, Activity, Target } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Ejercicio } from "@/types/exercises"

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Ejercicio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchExercises()
  }, [])

  const fetchExercises = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('banco_ejercicios')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) {
      setExercises(data as Ejercicio[])
    } else if (error) {
      console.error("Error fetching exercises:", error)
    }
    setIsLoading(false)
  }

  const filteredExercises = exercises.filter(ex => 
    ex.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ex.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Banco de Ejercicios</h1>
          <p className="mt-2 text-sm text-gray-500">
            Explora y gestiona la biblioteca de tareas y ejercicios del club.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Ejercicio
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar por nombre, tipo o etiqueta..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExercises.map((exercise) => (
          <div key={exercise.id} className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:-translate-y-1">
            <div className="p-6 flex-1 space-y-4">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-semibold text-lg text-gray-900 leading-tight">{exercise.nombre}</h3>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 capitalize whitespace-nowrap">
                  {exercise.tipo}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                {exercise.objetivo_tecnico.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{exercise.objetivo_tecnico.join(", ")}</span>
                  </div>
                )}
                
                {exercise.objetivo_tactico.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Activity className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{exercise.objetivo_tactico.join(", ")}</span>
                  </div>
                )}
                
                {exercise.duracion_recomendada && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span>{exercise.duracion_recomendada} min recomendados</span>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-500 line-clamp-2 mt-4">
                {exercise.descripcion}
              </p>
              
              {/* Tags */}
              {exercise.tags && exercise.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {exercise.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      {tag}
                    </span>
                  ))}
                  {exercise.tags.length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                      +{exercise.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex justify-between items-center">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-gray-500">Dificultad:</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(level => (
                    <div 
                      key={level} 
                      className={`h-1.5 w-4 rounded-full ${level <= exercise.dificultad ? 'bg-amber-400' : 'bg-gray-200'}`} 
                    />
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 font-medium">
                Ver Detalles
              </Button>
            </div>
          </div>
        ))}

        {filteredExercises.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center text-gray-500 ring-1 ring-gray-200 rounded-xl bg-white">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No se encontraron ejercicios</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-2">
              No hay tareas que coincidan con tu búsqueda o aún no has importado el banco de datos.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="col-span-full p-12 text-center text-gray-500 ring-1 ring-gray-200 rounded-xl bg-white">
            Cargando el banco de ejercicios...
          </div>
        )}
      </div>
    </div>
  )
}
