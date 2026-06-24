import { createAdminClient } from "@/lib/supabase/server"
import RegisterStaffForm from "./RegisterStaffForm"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function RegisterStaffPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createAdminClient()

  // Verify the token server-side before rendering the form
  const { data: invite, error } = await supabase
    .from("staff_invitations")
    .select("role, used")
    .eq("token", token)
    .single()

  if (error || !invite) {
    console.error("Token lookup error:", error, "Token:", token)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Enlace inválido</h2>
            <p className="text-gray-600 mb-6">
              El enlace de invitación que estás intentando usar no existe o es incorrecto.
            </p>
            <Link href="/" className="text-blue-600 hover:text-blue-500 font-medium">
              Volver a la página principal
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (invite.used) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Enlace ya utilizado</h2>
            <p className="text-gray-600 mb-6">
              Esta invitación ya ha sido canjeada. Cada enlace solo puede usarse una vez por seguridad. Si necesitas una nueva cuenta, contacta con tu administrador.
            </p>
            <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
              Ir a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-2">
          ¡Bienvenido al Equipo!
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100">
          <RegisterStaffForm token={token} role={invite.role} />
        </div>
      </div>
    </div>
  )
}
