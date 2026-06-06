import RoleGuard from '@/components/RoleGuard'

export default function MiPerfilPage() {
  return (
    <RoleGuard allowedRoles={['jugador', 'familia']}>
      <section className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-8 flex items-center justify-center">
        <div className="max-w-3xl w-full bg-white rounded-xl shadow-xl p-10 space-y-6">
          <h1 className="text-4xl font-extrabold text-gray-800 text-center mb-4">
            Mi Perfil
          </h1>
          <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-600">
            Bienvenido a tu portal. Próximamente podrás ver aquí tus horarios de entrenamiento, próximos partidos y el estado de tus cuotas.
          </div>
        </div>
      </section>
    </RoleGuard>
  )
}
