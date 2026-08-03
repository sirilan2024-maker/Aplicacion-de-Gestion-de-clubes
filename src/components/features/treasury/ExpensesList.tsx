"use client";

import { useEffect, useState } from "react";
import { getClubExpensesAction, createClubExpenseAction, updateClubExpenseAction, deleteClubExpenseAction } from "@/app/actions/treasury-actions";
import { Plus, Euro, Calendar, Tag, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ExpensesList({ refreshBalances }: { refreshBalances: () => void }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState("Material");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      const data = await getClubExpensesAction();
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleEditClick = (expense: any) => {
    setEditingExpenseId(expense.id);
    setConcept(expense.concept);
    setAmount(expense.amount_cents / 100);
    setCategory(expense.category || "Material");
    setDate(expense.date ? new Date(expense.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este gasto?")) return;
    try {
      await deleteClubExpenseAction(id);
      toast.success("Gasto eliminado");
      fetchExpenses();
      refreshBalances();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept || amount <= 0) return;
    try {
      if (editingExpenseId) {
        await updateClubExpenseAction(editingExpenseId, {
          concept,
          amount_cents: Math.round(amount * 100),
          category,
          date
        });
        toast.success("Gasto actualizado correctamente");
      } else {
        await createClubExpenseAction({
          concept,
          amount_cents: Math.round(amount * 100),
          category,
          date
        });
        toast.success("Gasto registrado correctamente");
      }
      setShowModal(false);
      setConcept("");
      setAmount(0);
      setEditingExpenseId(null);
      fetchExpenses();
      refreshBalances();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleExportCSV = () => {
    const header = ["Concepto", "Estado", "Importe", "Fecha"];
    const rows = expenses.map(expense => [
      `"${expense.concept}"`, 
      expense.status, 
      (expense.amount_cents / 100).toFixed(2), 
      new Date(expense.created_at).toLocaleDateString('es-ES')
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + header.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "gastos.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) return <div className="text-center p-8">Cargando gastos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Euro className="w-5 h-5 text-red-500" /> Historial de Gastos
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
          >
            Exportar CSV
          </button>
          <button 
            onClick={() => {
              setEditingExpenseId(null);
              setConcept("");
              setAmount(0);
              setShowModal(true);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Registrar Gasto
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="p-4 font-semibold">Fecha</th>
                <th className="p-4 font-semibold">Concepto</th>
                <th className="p-4 font-semibold">Categoría</th>
                <th className="p-4 font-semibold text-right">Importe</th>
                <th className="p-4 font-semibold text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">No hay gastos registrados</td></tr>
              ) : expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-600">{new Date(exp.date).toLocaleDateString('es-ES')}</td>
                  <td className="p-4 font-medium text-gray-800 truncate max-w-[150px]">{exp.concept}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <Tag className="w-3 h-3" /> {exp.category}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-red-600">
                    -{(exp.amount_cents / 100).toFixed(2)} €
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2 flex-col md:flex-row">
                      <button onClick={() => handleEditClick(exp)} className="text-gray-400 hover:text-blue-600 transition" title="Editar">
                        <Pencil className="w-4 h-4 mx-auto" />
                      </button>
                      <button onClick={() => handleDelete(exp.id)} className="text-gray-400 hover:text-red-600 transition" title="Eliminar">
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingExpenseId ? "Editar Gasto" : "Registrar Nuevo Gasto"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleCreateExpense} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                <input type="text" required value={concept} onChange={e => setConcept(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ej: Fichas FFCV Alevín A" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importe (€)</label>
                  <input type="number" step="0.01" required value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="Arbitrajes">Arbitrajes</option>
                  <option value="Material">Material (Balones, Ropa)</option>
                  <option value="Instalaciones">Instalaciones</option>
                  <option value="FFCV">Fichas / FFCV</option>
                  <option value="Suministros">Suministros</option>
                  <option value="Otros">Otros Gastos</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">Guardar Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
