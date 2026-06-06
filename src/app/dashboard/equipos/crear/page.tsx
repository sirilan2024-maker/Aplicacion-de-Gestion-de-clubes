// src/app/dashboard/equipos/crear/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SPORTS, GENDERS, AGE_GROUPS, FORMATS, COLORS, getContrastColor } from "@/lib/constants";



export default function CrearEquipoPage() {
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [name, setName] = useState("");
  const [sport, setSport] = useState(SPORTS[0]);
  const [gender, setGender] = useState(GENDERS[0]);
  const [ageGroup, setAgeGroup] = useState(AGE_GROUPS[0]);
  const [format, setFormat] = useState(FORMATS[0]);
  const [color, setColor] = useState(COLORS[0].value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validación mínima
    if (!name.trim() || !sport || !gender || !ageGroup) {
      toast.error("Rellena todos los campos obligatorios");
      return;
    }

    const payload = {
      // TODO: adaptar a la estructura real de la tabla equipos
      name: name.trim(),
      sport,
      gender,
      age_group: ageGroup,
      format: format || null,
      color,
    };

    try {
      const { data, error } = await supabase.from("equipos").insert([payload]);

      if (error) throw error;
      toast.success("Equipo creado con éxito");
      router.push("/dashboard/equipos");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('Error al crear el equipo:', errMsg);
      toast.error(errMsg || "Error al crear el equipo");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <Toaster />
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-sm border border-gray-100 p-8">
        <h1 className="text-center text-2xl font-semibold text-gray-800 mb-6">
          Crear un nuevo equipo
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row: Label + Input */}
          <div className="flex items-center">
            <label className="w-48 text-gray-500" htmlFor="name">
              Nombre *
            </label>
            <div className="flex-1 flex items-center space-x-2">
              <span className="text-gray-700">CSS -</span>
              <input
                id="name"
                required
                className="flex-1 text-gray-900 bg-white border border-gray-200 rounded px-3 py-2 outline-none"
                placeholder="ex : Senior"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center">
            <label className="w-48 text-gray-500" htmlFor="sport">
              Deporte *
            </label>
            <select
              id="sport"
              required
              className="flex-1 text-black font-medium bg-white border border-gray-300 rounded px-3 py-2 outline-none"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
            >
              {SPORTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="w-48 text-gray-500" htmlFor="gender">
              Género *
            </label>
            <select
              id="gender"
              required
              className="flex-1 text-black font-medium bg-white border border-gray-300 rounded px-3 py-2 outline-none"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="w-48 text-gray-500" htmlFor="ageGroup">
              Grupo de edad *
            </label>
            <select
              id="ageGroup"
              required
              className="flex-1 text-black font-medium bg-white border border-gray-300 rounded px-3 py-2 outline-none"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
            >
              {AGE_GROUPS.map((ag) => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="w-48 text-gray-500" htmlFor="format">
              Formato
            </label>
            <div className="flex-1 flex items-center space-x-2">
              <select
                id="format"
                className="flex-1 text-black font-medium bg-white border border-gray-300 rounded px-3 py-2 outline-none"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <Info className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center">
            <label className="w-48 text-gray-500" htmlFor="color">
              Color del equipo *
            </label>
            <div className="flex-1 flex items-center gap-3">
              <select
                id="color"
                required
                className="flex-1 text-black font-medium bg-white border border-gray-300 rounded px-3 py-2 outline-none"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              >
                {COLORS.map((c) => (
                  <option key={c.value} value={c.value}>{c.name}</option>
                ))}
              </select>
              {/* Color swatch preview */}
              <div
                className="w-8 h-8 rounded-md border border-gray-200 shrink-0"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-center pt-6">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded"
            >
              Crear un nuevo equipo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
