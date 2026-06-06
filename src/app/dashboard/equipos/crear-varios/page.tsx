"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { Dialog } from '@headlessui/react';
import ColorSelect from '@/components/ColorSelect';
import { SPORTS, GENDERS, AGE_GROUPS, FORMATS, COLORS, getContrastColor } from '@/lib/constants';

// Define a team row type
interface TeamRow {
  id: number; // unique client id
  name: string;
  category: string; // CSS or categoría
  sport: string;
  gender: string;
  ageGroup: string;
  format: string;
  color: string;
}

export default function CrearVariosEquiposPage() {
  const router = useRouter();
  // Modal state
  const [showModal, setShowModal] = useState(true);
  const [teamCount, setTeamCount] = useState<string>("");
  // Rows will be generated after modal validation
  const [rows, setRows] = useState<TeamRow[]>([]);

  const handleChange = (id: number, field: keyof TeamRow, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: Date.now(), name: "", category: "", sport: "", gender: "", ageGroup: "", format: "", color: "#1E40AF" }]);
  };

  const validateRows = (): string | null => {
    const names = rows.map((r) => r.name.trim().toLowerCase()).filter(Boolean);
    if (names.length === 0) return "Añade al menos un equipo con nombre.";
    const duplicate = names.find((n, i) => names.indexOf(n) !== i);
    if (duplicate) return "Los nombres de los equipos deben ser únicos.";
    for (const r of rows) {
      if (!r.name.trim() || !r.category.trim() || !r.sport.trim() || !r.gender.trim() || !r.ageGroup.trim() || !r.format.trim())
        return "Todos los equipos deben tener todos los campos rellenados.";
    }
    return null;
  };

  // Modal handlers
  const handleCancel = () => {
    router.push('/dashboard/equipos');
  };

  const handleValidate = () => {
    const count = parseInt(teamCount, 10);
    if (isNaN(count) || count <= 0) {
      toast.error('Introduce un número válido de equipos');
      return;
    }
    const initialRows = Array.from({ length: count }, (_, i) => ({ id: i, name: "", category: "", sport: "", gender: "", ageGroup: "", format: "", color: "#1E40AF" }));
    setRows(initialRows);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateRows();
    if (error) {
      toast.error(String(error));
      return;
    }
    try {
      const response = await fetch('/api/equipos/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: rows }),
      });
      const rawText = await response.text();
      let result: any = {};
      try {
        result = JSON.parse(rawText);
      } catch {
        result.error = rawText || 'Respuesta no válida del servidor';
      }
      if (response.ok && result?.success) {
        toast.success('Equipos creados con éxito');
        router.push('/dashboard/equipos');
      } else {
        const errMsg = typeof result?.error === 'string' && result.error.trim()
          ? result.error
          : `Error ${response.status}: No se pudieron crear los equipos`;
        console.error(`Batch creation failed: status=${response.status}, result=${JSON.stringify(result)}`);
        toast.error(errMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Submission exception: ${msg}`);
      toast.error(msg || 'Error de conexión al intentar crear los equipos');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Initial Modal */}
      {showModal && (
        <Dialog open={showModal} onClose={handleCancel} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
              <Dialog.Title className="flex justify-between items-center text-lg font-medium text-gray-900">
                Creación de equipos
                <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </Dialog.Title>
              <div className="mt-4 text-center text-gray-600">
                ¿Cuántos equipos quieres crear?
              </div>
              <div className="mt-4 flex justify-center">
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded border border-gray-300 p-1 text-center"
                  value={teamCount}
                  onChange={(e) => setTeamCount(e.target.value)}
                />
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleValidate}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Validar
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
      {/* Main Content */}
      <h1 className="text-3xl font-bold text-blue-900">Equipos</h1>
      <h2 className="text-xl text-gray-600 text-center">Creación de varios equipos</h2>
      <p className="text-center text-gray-500">El nombre de cada equipo irá precedido del nombre del club</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-2xl font-semibold mt-4">Crear un nuevo equipo</h3>
        <table className="w-full table-auto border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Nombre *</th>
              <th className="p-2 text-left">CSS *</th>
              <th className="p-2 text-left">Deporte *</th>
              <th className="p-2 text-left">Género *</th>
              <th className="p-2 text-left">Grupo de edad *</th>
              <th className="p-2 text-left">Formato</th>
              <th className="p-2 text-left">Color del equipo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">
                  <input
                    required
                    className="w-full rounded border border-gray-300 p-1 text-gray-900 bg-white"
                    placeholder="Nombre"
                    value={row.name}
                    onChange={(e) => handleChange(row.id, "name", e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    required
                    className="w-full rounded border border-gray-300 p-1 text-gray-900 bg-white"
                    placeholder="ex : Senior"
                    value={row.category}
                    onChange={(e) => handleChange(row.id, "category", e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <select
                    required
                    className="w-full text-black font-medium bg-white border border-gray-300 rounded px-3 py-2 outline-none"
                    value={row.sport}
                    onChange={(e) => handleChange(row.id, "sport", e.target.value)}
                  >
                    {SPORTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    required
                    className="w-full text-black font-medium bg-white border border-gray-300 rounded px-3 py-2 outline-none"
                    value={row.gender}
                    onChange={(e) => handleChange(row.id, "gender", e.target.value)}
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    required
                    className="w-full text-black font-medium bg-white border border-gray-300 rounded px-3 py-2 outline-none"
                    value={row.ageGroup}
                    onChange={(e) => handleChange(row.id, "ageGroup", e.target.value)}
                  >
                    {AGE_GROUPS.map((ag) => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    required
                    className="w-full text-black font-medium bg-white border border-gray-300 rounded px-3 py-2 outline-none"
                    value={row.format}
                    onChange={(e) => handleChange(row.id, "format", e.target.value)}
                  >
                    {FORMATS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <ColorSelect
                    value={row.color}
                    onChange={(val) => handleChange(row.id, "color", val)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
          >
            + Añadir equipo
          </button>
          <button
            type="submit"
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Crear equipos
          </button>
        </div>
      </form>
      <Toaster />
    </div>
  );
}
