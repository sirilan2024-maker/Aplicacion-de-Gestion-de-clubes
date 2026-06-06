import { Metadata } from "next"
import Link from "next/link"
import { Users, LayoutDashboard, Calendar, ClipboardList, Settings, LogOut, Trophy } from "lucide-react"
import { signOut } from "@/lib/auth-actions"
import { Sidebar } from "@/components/layout/sidebar"

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
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex">
        <Sidebar signOutAction={signOut} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Mobile Header (simplified) */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-8 justify-between md:justify-end">
          <div className="md:hidden flex items-center gap-2 font-bold text-lg">
            <Trophy className="w-6 h-6 text-blue-600" />
            <span>Sporting</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
