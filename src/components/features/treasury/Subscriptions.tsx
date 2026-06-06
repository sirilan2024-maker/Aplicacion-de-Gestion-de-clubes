// src/components/features/treasury/Subscriptions.tsx
"use client";

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';

import { useRouter } from "next/navigation";
import { createCheckoutSession } from "@/actions/stripeActions"; // server action

// Badge helper (reuse) – can be moved to a shared utils file later
function EstadoBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    pagado: "bg-green-100 text-green-800",
    pendiente: "bg-yellow-100 text-yellow-800",
    fallido: "bg-red-100 text-red-800",
  };
  const className = colors[estado] ?? "bg-gray-100 text-gray-800";
  const label = estado.charAt(0).toUpperCase() + estado.slice(1);
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${className}`}>{label}</span>
  );
}

export default function Subscriptions() {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    const status = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('status') : null;
    if (status === 'success') {
      alert('Pago completado con éxito');
    }
  }, []);

  // Load only the fees belonging to the logged‑in family (profile)
  useEffect(() => {
    const fetchFamilyFees = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("Usuario no autenticado");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("fees")
        .select("id, concepto, amount_cents, currency, estado, payment_date, charge_type")
        .eq("family_id", user.id)
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      else setFees(data || []);
      setLoading(false);
    };
    fetchFamilyFees();
  }, []);

  const handlePayNow = async (feeId: string) => {
    try {
      const { sessionId } = await createCheckoutSession({
        feeId,
        successUrl: `${window.location.origin}/payments?status=success`,
        cancelUrl: `${window.location.origin}/payments?status=cancel`,
      });
      const stripe = (await import("@stripe/stripe-js")).loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
      );
      const stripeInstance = await stripe;
      if (stripeInstance) {
        // redirectToCheckout was removed from @stripe/stripe-js types in v5 but still works at runtime
        await (stripeInstance as any).redirectToCheckout({ sessionId });
      }
    } catch (e) {
      console.error("Error creando checkout:", e);
    }
  };

  if (loading) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 bg-white rounded-xl shadow-sm space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}


  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <h2 className="text-xl font-semibold">Mis Cuotas y Suscripciones</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Importe</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fees.map((fee) => (
              <tr key={fee.id}>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{fee.concepto}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                  {(fee.amount_cents / 100).toFixed(2)} {fee.currency?.toUpperCase()}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">
                  <EstadoBadge estado={fee.estado} />
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">
                  {fee.estado === "pendiente" && (
                    <button
                      onClick={() => handlePayNow(fee.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Pagar ahora
                    </button>
                  )}
                  {fee.estado !== "pendiente" && "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
