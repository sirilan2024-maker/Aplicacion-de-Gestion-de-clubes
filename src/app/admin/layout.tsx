import React from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNavigation } from "@/components/layout/MobileNavigation"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { signOut } from "@/lib/auth-actions"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Security Check: Only Admin and Metodologo can access the ERP
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin" && profile?.role !== "metodologo") {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen md:h-screen flex-col md:flex-row bg-slate-50 md:bg-gray-50 md:overflow-hidden font-sans">
      <div className="hidden md:flex md:h-full md:shrink-0">
        <Sidebar signOutAction={signOut} />
      </div>

      {/* Mobile Navigation (App-like) */}
      <MobileNavigation signOutAction={signOut} />

      <main className="flex-1 md:overflow-y-auto relative pb-16 md:pb-0 w-full md:h-full no-scrollbar">
        {/* We can add a top navbar here if needed later */}
        {children}
      </main>
    </div>
  )
}
