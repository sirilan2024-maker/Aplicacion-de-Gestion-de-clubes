"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";

/**
 * Types that match the Supabase `exercises` table.
 */
interface Exercise {
  id: string;
  title: string;
  category: string;
  duration: string;
  age_group: string;
  organization: string;
  process: string;
}

/**
 * Shape of the raw JSON received from the club.
 */
interface ExerciseInput {
  ejercicio_id: string;
  titulo: string;
  categoria_objetivo: string[]; // e.g. ["U12","U13","Senior"]
  tipo_tarea: string;
  descripcion: string;
  dimensiones_campo: string;
  duracion_recomendada: string;
  url_grafico_o_animacion: string;
}

/**
 * Helper that maps a raw ExerciseInput to the shape expected by Supabase
 * and performs the INSERT.
 */
export async function insertExercise(input: ExerciseInput): Promise<void> {
  const supabase = createClient();

  // Mapping according to the user‑specified rules
  const category = input.categoria_objetivo.join(" / "); // barra cruzada
  const age_group = input.categoria_objetivo.join(", "); // coma separada
  const organization = input.tipo_tarea; // materiales / preparación
  const process = `${input.descripcion}\n${input.dimensiones_campo}\n${input.url_grafico_o_animacion}`;

  const payload: Exercise = {
    id: input.ejercicio_id,
    title: input.titulo,
    category,
    duration: input.duracion_recomendada,
    age_group,
    organization,
    process,
  };

  const { error } = await supabase.from("exercises").insert([payload]);
  if (error) {
    console.error("Error inserting exercise:", error);
    throw error;
  }
}

/**
 * Entrenamientos dashboard page.
 */
export default function EntrenamientosPage() {
  const supabase = createClient();

  // ------- Data & Loading -------
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // ------- Filters -------
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("");

  // Dropdown visibility state
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [ageOpen, setAgeOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);
  // Import state (no longer used)
  const [importing, setImporting] = useState(false);

  // Modal state for creating new exercise
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Modal state for bulk import
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState("");

  // Form fields for new exercise
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newAgeGroup, setNewAgeGroup] = useState("");
  const [newOrganization, setNewOrganization] = useState("");
  const [newProcess, setNewProcess] = useState("");

  // Fetch exercises from Supabase
  const fetchExercises = async () => {
    const { data, error } = await supabase.from("exercises").select("*");
    if (error) console.error(error);
    else setExercises(data as Exercise[]);
    setLoading(false);
  };

  // Placeholder function kept for compatibility; not used in UI now
  const importExercises = async () => {
    setImporting(true);
    // No operation – original import demo removed from UI
    setImporting(false);
  };

  // Load exercises on mount
  useEffect(() => {
    fetchExercises();
  }, []);

  // Unique filter options
  const categories = Array.from(new Set(exercises.map((e) => e.category))).filter(
    Boolean
  );
  const ageGroups = Array.from(new Set(exercises.map((e) => e.age_group))).filter(
    Boolean
  );

  // Apply all filters
  const filtered = exercises.filter((e) => {
    const matchesSearch = e.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory
      ? e.category.includes(selectedCategory)
      : true;
    const matchesAge = selectedAgeGroup
      ? e.age_group.includes(selectedAgeGroup)
      : true;
    return matchesSearch && matchesCategory && matchesAge;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 bg-slate-50">
      <div className="flex flex-row justify-between items-center w-full mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Biblioteca de Entrenamientos
        </h1>
        <div className="flex space-x-2">
          <Button onClick={() => setShowCreateModal(true)} disabled={importing} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
            ➕ Nuevo Ejercicio
          </Button>
          <Button onClick={() => setIsBulkModalOpen(true)} disabled={importing} className="border border-gray-600 text-gray-600 hover:bg-gray-100 font-bold py-2 px-4 rounded">
            📂 Importar Masivo
          </Button>
        </div>
      </div>
      {/* ---------- Filters ---------- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Buscar por título…"
            className="w-full rounded-md border-2 border-gray-300 bg-white pl-10 pr-4 py-2 text-black placeholder:text-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
        </div>

        {/* Category filter */}
        <div className="relative inline-block w-48">
          <button
            type="button"
            className="inline-flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
            onClick={() => setCategoryOpen((o) => !o)}
          >
            {selectedCategory || "Filtrar por categoría"}
            <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.147l3.71-3.915a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {categoryOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg max-h-60 overflow-auto border border-gray-200">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-black bg-white border-2 border-gray-300 font-medium"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCategoryOpen(false);
                  }}
                >
                  {cat}
                </div>
              ))}
              <div
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-gray-500"
                onClick={() => {
                  setSelectedCategory("");
                  setCategoryOpen(false);
                }}
              >
                Mostrar todas
              </div>
            </div>
          )}
        </div>

        {/* Age‑group filter */}
        <div className="relative inline-block w-48">
          <button
            type="button"
            className="inline-flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
            onClick={() => setAgeOpen((o) => !o)}
          >
            {selectedAgeGroup || "Filtrar por edad"}
            <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.147l3.71-3.915a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {ageOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg max-h-60 overflow-auto border border-gray-200">
              {ageGroups.map((age) => (
                <div
                  key={age}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-black bg-white border-2 border-gray-300 font-medium"
                  onClick={() => {
                    setSelectedAgeGroup(age);
                    setAgeOpen(false);
                  }}
                >
                  {age}
                </div>
              ))}
              <div
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-gray-500"
                onClick={() => {
                  setSelectedAgeGroup("");
                  setAgeOpen(false);
                }}
              >
                Mostrar todas
              </div>
            </div>
          )}
        </div>
      </div>
        {(!loading && exercises.length === 0) && (
          <p className="text-center text-gray-700 text-lg mt-8">
            No hay ejercicios en la base de datos.
          </p>
        )}

      {/* ---------- Cards Grid ---------- */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="p-4 bg-white rounded-xl shadow-sm space-y-3 animate-pulse"
              >
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))
          : filtered.map((ex) => (
              <div key={ex.id} className="relative flex flex-col p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setSelectedExercise(ex)} role="button" tabIndex={0}>
                <div className="w-full text-left">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {ex.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Categoría: {ex.category}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Duración: {ex.duration}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Edad: {ex.age_group}
                  </p>
                </div>
                <button
                  className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (window.confirm("¿Seguro que quieres borrar este ejercicio?")) {
                      const { error } = await supabase.from('exercises').delete().eq('id', ex.id);
                      if (error) {
                        alert("Error al borrar: " + error.message);
                      } else {
                        await fetchExercises();
                      }
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
      </div>

      {/* ---------- Detail Modal ---------- */}
        {selectedExercise && (                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
  <div className="bg-white rounded-xl max-w-5xl w-full mx-4 p-6 relative shadow-lg animate-in zoom-in-95 duration-200">
    <button
      className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      onClick={() => setSelectedExercise(null)}
    >
      <X className="w-5 h-5" />
    </button>
    <h2 className="text-3xl font-bold text-gray-900 mb-4">
      {selectedExercise.title}
    </h2>
    <button
      className="border border-gray-300 text-gray-600 hover:bg-gray-100 px-3 py-1 rounded-md mb-4"
      onClick={() => setSelectedExercise(null)}
    >
      Volver a buscar
    </button>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
      {/* Left column - spans 2 columns */}
      <div className="md:col-span-2">
        <div className="w-full aspect-[4/3] bg-green-600 rounded-md mb-6 relative">
          {/* optional field markings */}
        </div>
        <h3 className="text-xl font-bold mb-2">Organización</h3>
        <p className="text-gray-800 mb-4">{selectedExercise.organization}</p>
        <h3 className="text-xl font-bold mb-2">Proceso</h3>
        <p className="text-gray-800 whitespace-pre-line">{selectedExercise.process}</p>
      </div>
      {/* Right column */}
      <div className="md:col-span-1">
        <div className="border-b border-gray-200 pb-3 mb-3">
          <p className="text-gray-500 text-sm">Categoría</p>
          <p className="text-lg text-gray-900">{selectedExercise.category}</p>
        </div>
        <div className="border-b border-gray-200 pb-3 mb-3">
          <p className="text-gray-500 text-sm">Duración</p>
          <p className="text-lg text-gray-900">{selectedExercise.duration}</p>
        </div>
        <div className="border-b border-gray-200 pb-3 mb-3">
          <p className="text-gray-500 text-sm">Edad</p>
          <p className="text-lg text-gray-900">{selectedExercise.age_group}</p>
        </div>
      </div>
    </div>
  </div>
</div>
        
      )}

      {/* Create Exercise Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 p-6 relative shadow-lg animate-in zoom-in-95 duration-200">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setShowCreateModal(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Crear Nuevo Ejercicio</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Título"
                className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 font-medium"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <input
                type="text"
                placeholder="Categoría"
                className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 font-medium"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <input
                type="text"
                placeholder="Duración"
                className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 font-medium"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
              />
              <input
                type="text"
                placeholder="Edades (separadas por comas)"
                className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 font-medium"
                value={newAgeGroup}
                onChange={(e) => setNewAgeGroup(e.target.value)}
              />
              <input
                type="text"
                placeholder="Organización"
                className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 font-medium"
                value={newOrganization}
                onChange={(e) => setNewOrganization(e.target.value)}
              />
              <textarea
                placeholder="Proceso"
                className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 font-medium"
                rows={4}
                value={newProcess}
                onChange={(e) => setNewProcess(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  // Simple validation
                  if (!newTitle) { alert('El título es obligatorio'); return; }
                  const payload = {
                    title: newTitle,
                    category: newCategory,
                    duration: newDuration,
                    age_group: newAgeGroup,
                    organization: newOrganization,
                    process: newProcess,
                  };
                  const { error } = await supabase.from('exercises').insert([payload]);
                  if (error) {
                    alert('Error al crear: ' + error.message);
                  } else {
                    await fetchExercises();
                    // Reset form
                    setNewTitle('');
                    setNewCategory('');
                    setNewDuration('');
                    setNewAgeGroup('');
                    setNewOrganization('');
                    setNewProcess('');
                    setShowCreateModal(false);
                  }
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 p-6 relative shadow-lg animate-in zoom-in-95 duration-200">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setIsBulkModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Importación Masiva de Ejercicios</h2>
            <textarea
              className="w-full h-48 rounded-md border-2 border-gray-300 bg-white p-2 text-black placeholder:text-gray-500 font-medium"
              placeholder="Pega aquí tu array de ejercicios en formato JSON..."
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
            />
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsBulkModalOpen(false)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  try {
                    const parsed = JSON.parse(bulkInput);
                    if (!Array.isArray(parsed)) {
                      alert('El JSON debe ser un array de ejercicios');
                      return;
                    }
                    const cleanData = parsed.map((ex:any) => ({
                      title: ex.titulo || ex.title || "Sin título",
                      category: ex.categoria || ex.category || "Sin categoría",
                      duration: ex.duracion || ex.duration || "",
                      age_group: ex.edades || ex.age_group || "",
                      organization: ex.organizacion || ex.organization || "",
                      process: ex.desarrollo || ex.process || ""
                    }));
                    const { error } = await supabase.from('exercises').insert(cleanData);
                    if (error) {
                      alert('Error al guardar: ' + error.message);
                    } else {
                      await fetchExercises();
                      setBulkInput('');
                      setIsBulkModalOpen(false);
                    }
                  } catch (e: any) {
                    alert('Error al parsear JSON: ' + e.message);
                  }
                }}
              >
                Procesar y Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/*  Note: the `insertExercise` helper above can be used wherever you need to
    push a new JSON payload into Supabase, e.g.:

    await insertExercise(myJson);
*/
/* -------------------------------------------------------------------------- */