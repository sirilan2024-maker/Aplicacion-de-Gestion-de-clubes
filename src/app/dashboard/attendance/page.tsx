import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/Skeleton"
import { ClipboardList, CheckCircle2, XCircle } from "lucide-react"

export default function AttendancePage() {
  const attendanceRecords = [
    { id: 1, session: "Alevín A - Campo 1", date: "Hoy, 17:30", present: 14, total: 15 },
    { id: 2, session: "Benjamín B - Pista 2", date: "Ayer, 18:00", present: 12, total: 12 },
    { id: 3, session: "Infantil C - Campo Principal", date: "Lunes, 19:00", present: 16, total: 18 },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Control de Asistencia</h1>
          <p className="mt-2 text-sm text-gray-500">
            Registra y revisa la asistencia a los entrenamientos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {attendanceRecords.map((record) => (
          <div key={record.id} className="flex flex-col md:flex-row items-start md:items-center justify-between rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="rounded-lg bg-purple-100 p-3 mr-4">
                <ClipboardList className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{record.session}</h3>
                <p className="mt-2 text-sm text-gray-800">{record.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 w-full md:w-auto">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{record.present}/{record.total}</p>
                <p className="text-xs text-gray-800 uppercase tracking-wider font-semibold">Asistencia</p>
              </div>
              <div className="h-10 w-px bg-gray-200 hidden md:block"></div>
              <Button className="w-full md:w-auto">
                Pasar Lista
              </Button>
            </div>
          </div>
        ))}
        {attendanceRecords.length === 0 && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="p-4 bg-white rounded-xl shadow-sm space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    ))}
  </div>
)}
      </div>
    </div>
  )
}
