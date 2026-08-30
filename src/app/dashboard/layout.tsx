import { Metadata } from "next"
import { signOut } from "@/lib/auth-actions"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNavigation } from "@/components/layout/MobileNavigation"
import { GlobalAdminNotifications } from "@/components/features/admin/GlobalAdminNotifications"
import { RgpdGuard } from "@/components/layout/RgpdGuard"
import { EmailVerificationGuard } from "@/components/layout/EmailVerificationGuard"

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
    <div className="flex min-h-screen md:h-screen flex-col md:flex-row bg-slate-50 md:bg-gray-50 md:overflow-hidden">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex md:h-full md:shrink-0">
        <Sidebar signOutAction={signOut} />
      </div>

      {/* Mobile Navigation (App-like) */}
      <MobileNavigation signOutAction={signOut} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:h-full md:overflow-hidden overflow-x-hidden relative pb-16 md:pb-0">
        <EmailVerificationGuard />
        <GlobalAdminNotifications />
        <RgpdGuard />
        {/* Page Content */}
        <div className="flex-1 p-2 sm:p-4 md:p-8 md:overflow-y-auto w-full md:h-full no-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
