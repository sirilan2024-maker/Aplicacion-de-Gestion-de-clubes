"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TreasuryDashboard from "@/components/features/treasury/TreasuryDashboard";
import { createClient } from "@/lib/supabase/client";

export default function TreasuryPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error) {
        setAuthorized(false);
        return;
      }
      const roleFromJwt = (data.user as any)?.app_metadata?.role;
      if (roleFromJwt) {
        setAuthorized(roleFromJwt === "admin" || roleFromJwt === "entrenador");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user?.id)
        .single();
      const role = profile?.role;
      setAuthorized(role === "admin" || role === "entrenador");
    });
  }, []);

  useEffect(() => {
    if (authorized === false) router.replace("/dashboard");
  }, [authorized, router]);

  if (authorized === null) return <div className="p-6 text-center">Cargando...</div>;

  return <TreasuryDashboard />;
}
