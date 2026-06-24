import React from "react"
import { Sidebar } from "@/components/layout/sidebar"
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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <div className="hidden md:flex">
        <Sidebar signOutAction={signOut} />
      </div>
      <main className="flex-1 overflow-y-auto relative">
        {/* We can add a top navbar here if needed later */}
        {children}
      </main>
    </div>
  )
}
