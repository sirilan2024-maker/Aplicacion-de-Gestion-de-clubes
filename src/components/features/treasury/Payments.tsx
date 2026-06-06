// src/components/features/treasury/Payments.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Badge helper for estados
function EstadoBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    pagado: "bg-green-100 text-green-800",
    pendiente: "bg-yellow-100 text-yellow-800",
    fallido: "bg-red-100 text-red-800",
  };
  const className = colors[estado] ?? "bg-gray-100 text-gray-800";
  const label = estado.charAt(0).toUpperCase() + estado.slice(1);
  return <span className={`px-2 py-1 text-xs font-medium rounded ${className}`}>{label}</span>;
}

export default function Payments() {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>("todos");

  // Form state
  const [selectedFamily, setSelectedFamily] = useState<string>("");
  const [concepto, setConcepto] = useState<string>("");
  const [importe, setImporte] = useState<number>(0);
  const [tipo, setTipo] = useState<string>("one_time");
  const [families, setFamilies] = useState<any[]>([]);

  const fetchFees = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("fees")
      .select("id, concepto, amount_cents, currency, estado, payment_date, charge_type")
      .order("created_at", { ascending: false });
    if (error) console.error(error.message || error.hint || error);
    else setFees(data || []);
    setLoading(false);
  };

  const fetchFamilies = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("role", "familia");
    if (error) console.error("Error fetching families:", error);
    else setFamilies(data || []);
  };

  useEffect(() => {
    fetchFees();
    fetchFamilies();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("fees").insert({
      family_id: selectedFamily,
      concepto,
      amount_cents: Math.round(importe * 100),
      currency: "eur",
      estado: "pendiente",
      charge_type: tipo,
    });
    if (error) {
      console.error("Error inserting fee:", error);
      return;
    }
    // Refresh list
    fetchFees();
    setShowModal(false);
    // Reset form
    setSelectedFamily("");
    setConcepto("");
    setImporte(0);
    setTipo("one_time");
  };

  const filteredFees = fees.filter((fee) => {
    if (filter === "todos") return true;
    return fee.estado === filter;
  });

  if (loading) return <div className="p-6 text-center">Cargando cuotas...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <h2 className="text-xl font-semibold flex items-center justify-between">
        Gestión de Cuotas
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          + Nueva Cuota
        </button>
      </h2>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("todos")}
          className={`px-3 py-1 rounded ${filter === "todos" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter("pendiente")}
          className={`px-3 py-1 rounded ${filter === "pendiente" ? "bg-yellow-600 text-white" : "bg-gray-200"}`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFilter("pagado")}
          className={`px-3 py-1 rounded ${filter === "pagado" ? "bg-green-600 text-white" : "bg-gray-200"}`}
        >
          Pagados
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Importe</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha pago</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFees.map((fee) => (
              <tr key={fee.id}>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{fee.concepto}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                  {(fee.amount_cents / 100).toFixed(2)} {fee.currency?.toUpperCase()}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm"><EstadoBadge estado={fee.estado} /></td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                  {fee.payment_date ? new Date(fee.payment_date).toLocaleDateString() : "-"}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                  {fee.charge_type === "one_time" ? "Una vez" : "Suscripción"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Crear nueva cuota</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Familia / Jugador</label>
                <select
                  required
                  value={selectedFamily}
                  onChange={(e) => setSelectedFamily(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white"
                >
                  <option value="" disabled>Selecciona un jugador / equipo...</option>
                  {families.map((fam) => (
                    <option key={fam.id} value={fam.id}>{fam.name || fam.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Concepto</label>
                <input
                  type="text"
                  required
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Importe (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={importe}
                  onChange={(e) => setImporte(parseFloat(e.target.value))}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  required
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white"
                >
                  <option value="one_time">Una vez</option>
                  <option value="subscription">Suscripción</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
