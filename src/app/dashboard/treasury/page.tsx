"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TreasuryDashboard from "@/components/features/treasury/TreasuryDashboard";
import CoordinatorTreasuryView from "@/components/coordinator/CoordinatorTreasuryView";
import { createClient } from "@/lib/supabase/client";

export default function TreasuryPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [isCoordinator, setIsCoordinator] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) {
        setAuthorized(false);
        return;
      }

      const roleFromJwt = (data.user as any)?.app_metadata?.role;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, roles")
        .eq("id", data.user.id)
        .single();

      const role = profile?.role || roleFromJwt;
      const roles: string[] = profile?.roles || [];

      const isAdmin = role === "admin" || role === "superadmin" || roles.includes("admin");
      const isCoach = role === "entrenador" || role === "coach";
      const isCoord = role === "coordinador" || role === "coordinador_general" || roles.includes("coordinador") || roles.includes("coordinador_general");

      if (isAdmin || isCoach || isCoord) {
        setAuthorized(true);
        setIsCoordinator(isCoord && !isAdmin);
      } else {
        setAuthorized(false);
      }
    });
  }, []);

  useEffect(() => {
    if (authorized === false) router.replace("/dashboard");
  }, [authorized, router]);

  if (authorized === null) {
    return <div className="p-6 text-center text-xs text-slate-500 font-semibold">Cargando tesorería...</div>;
  }

  // Vista exclusiva para Coordinadores: Solo lectura de cuotas de jugadores sin contabilidad global
  if (isCoordinator) {
    return <CoordinatorTreasuryView />;
  }

  return <TreasuryDashboard />;
}
