import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export const metadata = {
  title: 'Tutorial de Inscripción Oficial | Club Sporting Saladar',
  description: 'Guía paso a paso ilustrada con capturas reales y resolución de errores para inscribirse en el Club Sporting Saladar.'
};

export default function TutorialInscripcionPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Cabecera Principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <img
            src="/images/sporting-saladar-shield.jpg"
            alt="Escudo Oficial Club Sporting Saladar"
            className="w-24 h-auto object-contain shrink-0 drop-shadow-md"
          />
          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Guía Visual Oficial
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              Cómo Rellenar el Formulario de Inscripción
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Tutorial paso a paso con capturas de pantalla reales y guía de solución a los errores más frecuentes.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 justify-center sm:justify-start">
              <a
                href="/inscripcion"
                target="_blank"
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow transition-colors inline-flex items-center gap-2"
              >
                Abrir Formulario Oficial ↗
              </a>
              <Link
                href="/dashboard"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Volver
              </Link>
            </div>
          </div>
        </div>

        {/* Resumen de Pasos */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { num: '1', title: 'Datos Personales', desc: 'Jugador y Tutor' },
            { num: '2', title: 'Documentación', desc: 'DNI y Foto Carnet' },
            { num: '3', title: 'Cuotas y Pagos', desc: '250€ / 195€' },
            { num: '4', title: 'Utillería', desc: 'Tallas Hummel' },
            { num: '5', title: 'Consentimientos', desc: 'RGPD y Contraseña' },
          ].map((step) => (
            <div key={step.num} className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs inline-flex items-center justify-center">
                {step.num}
              </span>
              <p className="text-xs font-bold text-slate-800 mt-1.5 leading-tight">{step.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* PASO 1 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between">
            <h2 className="text-lg font-black flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-white text-blue-700 font-black text-xs inline-flex items-center justify-center">1</span>
              Paso 1: Datos Personales, Ficha Familiar y Médica
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-slate-700 text-sm leading-relaxed">
              En este primer paso se introduce la información básica del jugador y de su tutor legal. Si ya dispones de un PIN facilitado por el club, puedes introducirlo arriba y pulsar <strong>"Cargar Ficha con PIN"</strong> para que se autorrellene al instante.
            </p>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <img
                src="/tutorial/captura_real_paso1.png"
                alt="Paso 1 Formulario Real"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <img
                src="/tutorial/captura_real_paso1_familiar.png"
                alt="Paso 1 Tutor y Ficha Familiar Real"
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Caja de Errores Paso 1 */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4">
              <h3 className="text-red-900 font-bold text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                Errores que pueden surgir en el Paso 1:
              </h3>
              
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <img
                  src="/tutorial/captura_error_paso1.png"
                  alt="Error en Paso 1"
                  className="w-full h-auto"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs text-red-800">
                <div className="bg-white p-3 rounded-lg border border-red-100">
                  <p className="font-bold text-red-900">❌ Error: La fecha de nacimiento es requerida</p>
                  <p className="mt-1 text-slate-600">
                    Ocurre si pulsas "Siguiente" con la fecha vacía. Abre el selector de fecha y marca el día, mes y año. Esto calcula automáticamente la categoría asignada.
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-red-100">
                  <p className="font-bold text-red-900">❌ Error: El email de contacto es requerido</p>
                  <p className="mt-1 text-slate-600">
                    En menores de edad es obligatorio indicar el correo del padre/madre/tutor para poder remitir convocatorias y avisos oficiales.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PASO 2 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between">
            <h2 className="text-lg font-black flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-white text-blue-700 font-black text-xs inline-flex items-center justify-center">2</span>
              Paso 2: Subida de Documentación Oficial
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-slate-700 text-sm leading-relaxed">
              Sube las fotos o archivos de la documentación. Puedes pulsar <strong>"Subir Archivo"</strong> o <strong>"Hacer Foto"</strong> directamente desde tu teléfono móvil. La web comprime las imágenes a menos de 200 KB para que suban al instante.
            </p>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <img
                src="/tutorial/captura_real_paso2.png"
                alt="Paso 2 Documentación Real"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-700" />
                Consejo sobre los documentos:
              </p>
              <p>• Si el menor de edad no dispone de DNI todavía, puedes adjuntar la hoja correspondiente del <strong>Libro de Familia</strong>.</p>
              <p>• Si el jugador es extranjero, pulsa el botón <strong>"Desplegar"</strong> en el apartado naranja para adjuntar el padrón o certificado escolar según la normativa federativa FFCV / FIFA.</p>
            </div>
          </div>
        </section>

        {/* PASO 3 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between">
            <h2 className="text-lg font-black flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-white text-blue-700 font-black text-xs inline-flex items-center justify-center">3</span>
              Paso 3: Determinación de Cuotas y Pagos
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-slate-700 text-sm leading-relaxed">
              El formulario calcula la cuota según tu condición. La cuota estándar es de <strong>250 €</strong>. Si perteneciste al club la temporada anterior, marca la casilla correspondiente y se reducirá automáticamente a <strong>195 €</strong>. Si además ya pagaste los 50 € de reserva, se te descontarán al instante.
            </p>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <img
                src="/tutorial/captura_real_paso3.png"
                alt="Paso 3 Cuotas y Pagos Real"
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Caja de Errores Paso 3 */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4">
              <h3 className="text-red-900 font-bold text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                Error frecuente en el Paso 3:
              </h3>
              
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <img
                  src="/tutorial/captura_error_paso3.png"
                  alt="Error en Paso 3 Método de Pago"
                  className="w-full h-auto"
                />
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-red-100 text-xs text-slate-700 space-y-1">
                <p className="font-bold text-red-800">❌ Error: paymentMethod: Debe seleccionar un método de pago</p>
                <p>
                  No puedes continuar sin elegir cómo abonarás la cuota. Haz clic sobre <strong>Transferencia Bancaria</strong> (verás el IBAN oficial del club <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-blue-900">ES53 3005 0012 0820 9032 5016</code>) o sobre <strong>Al Contado (Secretaría)</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PASO 4 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between">
            <h2 className="text-lg font-black flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-white text-blue-700 font-black text-xs inline-flex items-center justify-center">4</span>
              Paso 4: Utillería Oficial Hummel
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-slate-700 text-sm leading-relaxed">
              Selecciona en cada menú desplegable las tallas oficiales para la ropa deportiva de competición y paseo del Club Sporting Saladar.
            </p>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <img
                src="/tutorial/captura_real_paso4.png"
                alt="Paso 4 Tallas Hummel Oficial Real"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900">
              <p className="font-bold mb-1">Prendas incluidas:</p>
              <p>• Camiseta y Pantalón de Juego/Entrenamiento (Tallas infantiles 116 a 176 o adultos XS a 3XL).</p>
              <p>• Medias oficiales (por rango de pie de 28-32 hasta 43-46).</p>
              <p>• Chándal oficial, Sudadera, Camiseta de paseo y Pantalón de paseo.</p>
              <p>• Mochila deportiva oficial (Talla única, incluida en la inscripción).</p>
            </div>
          </div>
        </section>

        {/* PASO 5 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between">
            <h2 className="text-lg font-black flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-white text-blue-700 font-black text-xs inline-flex items-center justify-center">5</span>
              Paso 5: Consentimientos Legales y Clave de Acceso
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-slate-700 text-sm leading-relaxed">
              Último paso para validar la inscripción con firma electrónica simple y crear la contraseña privada del portal de familias.
            </p>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <img
                src="/tutorial/captura_real_paso5.png"
                alt="Paso 5 Consentimientos y Errores Reales"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3 text-xs text-slate-700">
              <h3 className="text-red-900 font-bold text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                Errores que impiden finalizar el Paso 5:
              </h3>
              <p className="text-slate-700">
                1. <strong>Aviso: "Revisa los campos requeridos en el Paso 5":</strong> Debes marcar las <strong>4 casillas obligatorias</strong> (Política de Privacidad, Declaración de Tutela, Tratamiento Médico y Derechos de Imagen). Si alguna queda desmarcada, aparecerá en recuadro rojo.
              </p>
              <p className="text-slate-700">
                2. <strong>Contraseña del Portal:</strong> Debe tener un <strong>mínimo de 6 caracteres</strong> y debes escribir exactamente la misma clave en el segundo campo de confirmación.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-xs text-green-900 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-green-950">¡Inscripción Completada con Éxito!</p>
                <p className="mt-1 text-slate-700">
                  Al pulsar el botón final de envío, la ficha quedará registrada en el sistema del club. Si seleccionaste Transferencia Bancaria, se mostrará en pantalla tu código de referencia bancaria para indicar en el justificante de pago.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
