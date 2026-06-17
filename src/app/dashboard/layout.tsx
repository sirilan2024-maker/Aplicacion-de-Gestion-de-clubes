import { Metadata } from "next"
import { signOut } from "@/lib/auth-actions"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNavigation } from "@/components/layout/MobileNavigation"

export const metadata: Metadata = {
  title: "Dashboard | Gestión Club Deportivo",
  description: "Panel principal de administración",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-slate-50 md:bg-gray-50">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex">
        <Sidebar signOutAction={signOut} />
      </div>

      {/* Mobile Navigation (App-like) */}
      <MobileNavigation signOutAction={signOut} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:overflow-hidden relative pb-16 md:pb-0">
        {/* Page Content */}
        <div className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
