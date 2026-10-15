"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SeasonProvider } from "@/components/providers/SeasonProvider";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { Toaster } from "react-hot-toast";

/**
 * RootProviders: Gestiona los proveedores y banners globales de la aplicación.
 * 
 * Aislamiento estricto de Modo Demo:
 * Para la ruta `/wellness/demo`, se omite deliberadamente el montaje de `SeasonProvider`
 * e `ImpersonationBanner`. Esto garantiza que no se inicialice el cliente Supabase
 * ni se disparen peticiones de red (como `supabase.auth.getUser()` o chequeos de impersonación),
 * permitiendo una visualización 100% aislada en memoria.
 */
export function RootProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isIsolatedDemo = pathname?.startsWith("/wellness/demo");

  if (isIsolatedDemo) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <>
      <ImpersonationBanner />
      <SeasonProvider>
        {children}
        <Toaster />
      </SeasonProvider>
    </>
  );
}
