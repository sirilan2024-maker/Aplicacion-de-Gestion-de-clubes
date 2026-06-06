import RoleGuard from '@/components/RoleGuard'

export default function MisEquiposPage() {
  return (
    <RoleGuard allowedRoles={['coach']}>
      <section className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-8 flex items-center justify-center">
        <div className="max-w-3xl w-full bg-white rounded-xl shadow-xl p-10 space-y-6">
          <h1 className="text-4xl font-extrabold text-gray-800 text-center mb-4">
            Mis Equipos
          </h1>
          <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-600">
            Aquí aparecerán los equipos que tienes asignados. Selecciona uno para gestionar los entrenamientos, asistencia y convocatorias.
          </div>
        </div>
      </section>
    </RoleGuard>
  )
}
