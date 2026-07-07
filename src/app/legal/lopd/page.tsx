import { ShieldCheck } from "lucide-react"

export default function LOPDGDDPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 p-6 flex items-center gap-4 text-white">
          <ShieldCheck size={32} />
          <div>
            <h1 className="text-2xl font-bold">Protección de Datos (LOPDGDD)</h1>
            <p className="text-blue-100 text-sm">Información sobre el tratamiento de sus datos personales</p>
          </div>
        </div>
        
        <div className="p-8 prose prose-blue max-w-none text-gray-700 space-y-6">
          <p>
            En cumplimiento de lo establecido en el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales y a la libre circulación de estos datos (RGPD), y en la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), le informamos sobre el tratamiento de sus datos.
          </p>
          
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mt-8">1. Responsable del Tratamiento</h2>
          <p>
            El responsable del tratamiento de los datos recogidos a través de esta plataforma es el Club Deportivo Sporting Saladar.
          </p>

          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mt-8">2. Finalidad del Tratamiento</h2>
          <p>
            Los datos personales facilitados serán tratados con las siguientes finalidades:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Gestión deportiva y administrativa de los jugadores y equipos del club.</li>
            <li>Comunicación de horarios, convocatorias, partidos y eventos a través de nuestra plataforma y sistema de mensajería interna.</li>
            <li>Gestión de cuotas, seguros deportivos y licencias federativas necesarias para la competición.</li>
            <li>En el caso de menores de 14 años, los datos son proporcionados y gestionados por su padre, madre o tutor legal.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mt-8">3. Derechos de los Interesados</h2>
          <p>
            Usted tiene derecho a obtener confirmación sobre si el Club está tratando sus datos personales, por tanto, tiene derecho a:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Acceder</strong> a sus datos personales.</li>
            <li>Solicitar la <strong>rectificación</strong> de los datos inexactos.</li>
            <li>Solicitar su <strong>supresión</strong> cuando, entre otros motivos, los datos ya no sean necesarios para los fines que fueron recogidos.</li>
            <li>Solicitar la <strong>limitación</strong> del tratamiento de sus datos.</li>
            <li><strong>Oponerse</strong> al tratamiento.</li>
          </ul>
          
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mt-8 rounded-r-lg">
            <p className="text-sm text-blue-900 m-0">
              Para ejercer cualquiera de estos derechos, o si tiene alguna duda sobre nuestra política de privacidad, puede contactar con la administración del club en cualquier momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
