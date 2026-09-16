import React from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNavigation } from "@/components/layout/MobileNavigation"
import { redirect } from "next/navigation"
import { signOut } from "@/lib/auth-actions"
import { getAuthenticatedContext, ADMIN_ROLES } from "@/lib/auth-helpers"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { context: ctx, error: authErr } = await getAuthenticatedContext()

  if (authErr || !ctx) {
    redirect("/login")
  }

  const effectiveRole = ctx.realAdminRole || ctx.profile.role
  const userRoles = ctx.profile.roles || []

  const isAllowed = (effectiveRole && ADMIN_ROLES.includes(effectiveRole)) || userRoles.some((r: string) => ADMIN_ROLES.includes(r))

  if (!isAllowed) {
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
