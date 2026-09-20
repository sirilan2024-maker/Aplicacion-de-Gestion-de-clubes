import React, { useState, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { User, Users, Stethoscope, Trophy, Activity, CreditCard, KeyRound, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { RegistrationFormData } from "../schema";
import toast from "react-hot-toast";

export function Step1PersonalData({ isAdult = false }: { isAdult?: boolean }) {
  const { register, formState: { errors }, control, setValue } = useFormContext<RegistrationFormData>();
  
  const [pinInput, setPinInput] = useState("");
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [verifiedPinData, setVerifiedPinData] = useState<{
    name: string;
    teamName: string;
    pin: string;
  } | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  const birthDate = useWatch({ control, name: "birthDate" });
  
  // Comprobar si viene ?pin= en la URL al cargar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pinParam = urlParams.get('pin');
      if (pinParam && !verifiedPinData) {
        setPinInput(pinParam.toUpperCase());
        handleVerifyPin(pinParam.toUpperCase());
      }
    }
  }, []);

  const handleVerifyPin = async (codeToVerify?: string) => {
    const code = (codeToVerify || pinInput).trim().toUpperCase();
    if (!code || code.length < 4) {
      setPinError("Introduce un código PIN válido (mínimo 4 caracteres)");
      return;
    }

    setVerifyingPin(true);
    setPinError(null);

    try {
      const res = await fetch(`/api/players/verify-pin?pin=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setPinError(data.error || "No se encontró ningún jugador con ese código PIN");
        toast.error(data.error || "PIN no válido");
        return;
      }

      const p = data.player;
      setValue("pinCode", code);
      setValue("existingPlayerId", p.id);
      if (p.firstName) setValue("playerFirstName", p.firstName);
      if (p.lastName) setValue("playerLastName", p.lastName);
      if (p.dni) setValue("playerDni", p.dni);
      if (p.birthDate) setValue("birthDate", p.birthDate);
      if (p.phone) setValue("tutor1Phone", p.phone);
      if (p.email) setValue("tutor1Email", p.email);
      if (p.isSenior) {
        setValue("isSeniorTeam", true);
        setValue("isSeniorSelection", "senior");
      }

      setVerifiedPinData({
        name: `${p.firstName} ${p.lastName}`.trim(),
        teamName: p.teamName || 'Equipo Asignado',
        pin: code
      });

      toast.success(`Ficha de ${p.firstName} cargada con éxito`);
    } catch (err: any) {
      setPinError("Error de conexión al verificar el PIN");
    } finally {
      setVerifyingPin(false);
    }
  };
  
  let category = "";
  
  if (birthDate) {
    const year = new Date(birthDate).getFullYear();
    if (year <= 2007) {
      category = "Senior";
    } else if (year >= 2008 && year <= 2010) {
      category = "Juvenil";
    } else if (year >= 2011 && year <= 2012) {
      category = "Cadete";
    } else if (year >= 2013 && year <= 2014) {
      category = "Infantil";
    } else if (year > 2014) {
      category = "Fútbol 8 (Alevín, Benjamín, Prebenjamín)";
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* BANNER DE VINCULACIÓN CON PIN */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <KeyRound size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-bold text-blue-950">
              ¿El club te ha facilitado un PIN de jugador?
            </h4>
            <p className="text-xs text-blue-700 mt-0.5">
              Introduce el PIN para rellenar automáticamente la ficha de tu jugador y completar su equipación, documentos y autorizaciones.
            </p>

            {verifiedPinData ? (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-600 w-5 h-5 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">
                      Jugador Verificado: {verifiedPinData.name}
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Equipo: {verifiedPinData.teamName} (PIN: {verifiedPinData.pin})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVerifiedPinData(null);
                    setPinInput("");
                    setValue("pinCode", undefined);
                    setValue("existingPlayerId", undefined);
                  }}
                  className="text-xs font-semibold text-emerald-800 hover:text-red-600 hover:underline ml-3"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                    placeholder="Ej: PNVJNG"
                    maxLength={10}
                    className="w-full bg-white border border-blue-300 rounded-lg px-3.5 py-2 text-sm uppercase font-mono tracking-wider font-bold text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleVerifyPin()}
                  disabled={verifyingPin || !pinInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {verifyingPin ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Cargar Ficha con PIN</span>
                  )}
                </button>
              </div>
            )}

            {pinError && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium">
                <AlertCircle size={14} />
                <span>{pinError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 border-b pb-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          Datos Personales del Jugador
        </h3>
        <p className="text-sm text-gray-500 mt-1">Información principal de quien se inscribe.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Nombre</label>
          <Input {...register("playerFirstName")} placeholder="Nombre del jugador" className={errors.playerFirstName ? "border-red-500" : ""} />
          {errors.playerFirstName && <p className="text-xs text-red-500">{errors.playerFirstName.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Apellidos</label>
          <Input {...register("playerLastName")} placeholder="Apellidos" className={errors.playerLastName ? "border-red-500" : ""} />
          {errors.playerLastName && <p className="text-xs text-red-500">{errors.playerLastName.message}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">DNI/NIE del Jugador</label>
          <Input {...register("playerDni")} placeholder="12345678A" className={errors.playerDni ? "border-red-500" : ""} />
          {errors.playerDni && <p className="text-xs text-red-500">{errors.playerDni.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Tarjeta SIP (Opcional)</label>
          <p className="text-[10px] text-gray-500 -mt-1 mb-1 leading-tight">En caso de urgencia médica</p>
          <Input {...register("playerSip")} placeholder="Número SIP" />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Fecha de Nacimiento {!isAdult && <span className="text-red-500">*</span>}</label>
          <Input type="date" {...register("birthDate")} className={errors.birthDate ? "border-red-500" : ""} />
          {errors.birthDate && <p className="text-xs text-red-500">{errors.birthDate.message}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Categoría Asignada</label>
          <div className="flex h-10 w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 items-center font-semibold">
            {category || "Introduce fecha para calcular"}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Nacionalidad</label>
          <Input {...register("nationality")} placeholder="Ej. Española" defaultValue="Española" className={errors.nationality ? "border-red-500" : ""} />
          {errors.nationality && <p className="text-xs text-red-500">{errors.nationality.message}</p>}
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-gray-700">Domicilio Completo</label>
          <Input {...register("address")} placeholder="Calle, número, piso..." className={errors.address ? "border-red-500" : ""} />
          {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Localidad</label>
          <Input {...register("city")} placeholder="Ej. Almoradí" className={errors.city ? "border-red-500" : ""} />
          {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Código Postal</label>
          <Input {...register("postalCode")} placeholder="03160" className={errors.postalCode ? "border-red-500" : ""} />
          {errors.postalCode && <p className="text-xs text-red-500">{errors.postalCode.message}</p>}
        </div>
      </div>

      {/* Conditional Parent Section */}
      {!isAdult ? (
        <div className="mt-10 pt-8 border-t">
          <div className="mb-6 border-b pb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Ficha Familiar (Tutor Legal)
            </h3>
            <p className="text-sm text-gray-500 mt-1">Al ser menor de edad, es obligatorio vincular a un tutor legal.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Nombre del Tutor</label>
              <Input {...register("tutor1Name")} placeholder="Nombre" className={errors.tutor1Name ? "border-red-500" : ""} />
              {errors.tutor1Name && <p className="text-xs text-red-500">{errors.tutor1Name.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Apellidos del Tutor</label>
              <Input {...register("tutor1LastName")} placeholder="Apellidos" className={errors.tutor1LastName ? "border-red-500" : ""} />
              {errors.tutor1LastName && <p className="text-xs text-red-500">{errors.tutor1LastName.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">DNI/NIE del Tutor</label>
              <Input {...register("tutor1Dni")} placeholder="12345678A" className={errors.tutor1Dni ? "border-red-500" : ""} />
              {errors.tutor1Dni && <p className="text-xs text-red-500">{errors.tutor1Dni.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email <span className="text-red-500">*</span></label>
              <Input type="email" {...register("tutor1Email")} placeholder="correo@ejemplo.com" className={errors.tutor1Email ? "border-red-500" : ""} />
              {errors.tutor1Email && <p className="text-xs text-red-500">{errors.tutor1Email.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Teléfono</label>
              <Input type="tel" {...register("tutor1Phone")} placeholder="+34 600..." className={errors.tutor1Phone ? "border-red-500" : ""} />
              {errors.tutor1Phone && <p className="text-xs text-red-500">{errors.tutor1Phone.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Relación</label>
              <select {...register("tutorRelation")} className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                <option value="padre">Padre</option>
                <option value="madre">Madre</option>
                <option value="tutor">Tutor Legal</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-10 pt-8 border-t">
          <div className="mb-6 border-b pb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Datos de Contacto
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email <span className="text-red-500">*</span></label>
              <Input type="email" {...register("tutor1Email")} placeholder="correo@ejemplo.com" className={errors.tutor1Email ? "border-red-500" : ""} />
              {errors.tutor1Email && <p className="text-xs text-red-500">{errors.tutor1Email.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Teléfono</label>
              <Input type="tel" {...register("tutor1Phone")} placeholder="+34 600..." className={errors.tutor1Phone ? "border-red-500" : ""} />
              {errors.tutor1Phone && <p className="text-xs text-red-500">{errors.tutor1Phone.message}</p>}
            </div>
          </div>
        </div>
      )}      {/* BLOQUE ADICIONAL: INFORMACIÓN MÉDICA */}
      <div className="mt-10 pt-8 border-t">
        <div className="mb-6 border-b pb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-red-600" />
            Información Médica (Opcional)
          </h3>
          <p className="text-sm text-gray-500 mt-1">Esta información es confidencial y ayudará al cuerpo técnico a garantizar el bienestar del jugador.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-red-50/30 p-6 rounded-xl border border-red-100">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Alergias</label>
            <Input {...register("medAlergias")} placeholder="Ej. Penicilina, polen..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Enfermedades crónicas o relevantes</label>
            <Input {...register("medEnfermedades")} placeholder="Ej. Asma, diabetes..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Medicación habitual</label>
            <Input {...register("medMedicacion")} placeholder="Especificar si necesita tomar algo" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Lesiones importantes previas</label>
            <Input {...register("medLesiones")} placeholder="Esguinces, roturas..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Operaciones quirúrgicas</label>
            <Input {...register("medOperaciones")} placeholder="Intervenciones relevantes" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Otra información médica relevante</label>
            <Input {...register("medRelevante")} placeholder="Cualquier otro detalle de salud" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Observaciones</label>
            <textarea 
              {...register("medObservaciones")} 
              className="flex min-h-[80px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              placeholder="Anotaciones adicionales..."
            />
          </div>
        </div>
      </div>

      {/* BLOQUE ADICIONAL: PERFIL DEPORTIVO */}
      <div className="mt-10 pt-8 border-t">
        <div className="mb-6 border-b pb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-600" />
            Perfil Deportivo (Opcional)
          </h3>
          <p className="text-sm text-gray-500 mt-1">Conocer la trayectoria del jugador nos ayuda a integrarlo mejor en el equipo.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-yellow-50/30 p-6 rounded-xl border border-yellow-100">
          <div className="md:col-span-2 bg-white p-4 rounded-lg border border-yellow-200 flex items-start gap-3">
            <div className="mt-1">
              <input 
                type="checkbox" 
                id="neverFederated" 
                className="w-5 h-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-600 cursor-pointer"
                {...register("neverFederated")} 
              />
            </div>
            <div>
              <label htmlFor="neverFederated" className="text-sm font-bold text-gray-900 cursor-pointer">
                Nunca ha estado federado (Primera inscripción en un club oficial)
              </label>
              <p className="text-xs text-gray-500 mt-1">Marca esta casilla si el jugador nunca ha tenido ficha federativa oficial en fútbol.</p>
            </div>
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Clubes anteriores</label>
            <Input {...register("sportClubesAnteriores")} placeholder="Dónde ha jugado antes (si aplica)" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Posición principal</label>
            <select {...register("sportPosicionPrincipal")} className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              <option value="">Seleccionar...</option>
              <option value="Portero">Portero</option>
              <option value="Defensa Central">Defensa Central</option>
              <option value="Lateral">Lateral</option>
              <option value="Mediocentro">Mediocentro</option>
              <option value="Interior / Extremo">Interior / Extremo</option>
              <option value="Delantero / Punta">Delantero / Punta</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Posición secundaria</label>
            <select {...register("sportPosicionSecundaria")} className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              <option value="">Seleccionar...</option>
              <option value="Portero">Portero</option>
              <option value="Defensa Central">Defensa Central</option>
              <option value="Lateral">Lateral</option>
              <option value="Mediocentro">Mediocentro</option>
              <option value="Interior / Extremo">Interior / Extremo</option>
              <option value="Delantero / Punta">Delantero / Punta</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Posición en la que le gustaría jugar</label>
            <select {...register("sportPosicionGustaria")} className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              <option value="">Seleccionar...</option>
              <option value="Portero">Portero</option>
              <option value="Defensa Central">Defensa Central</option>
              <option value="Lateral">Lateral</option>
              <option value="Mediocentro">Mediocentro</option>
              <option value="Interior / Extremo">Interior / Extremo</option>
              <option value="Delantero / Punta">Delantero / Punta</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Pie dominante</label>
            <select {...register("sportPieDominante")} className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              <option value="">Seleccionar...</option>
              <option value="Diestro">Diestro</option>
              <option value="Zurdo">Zurdo</option>
              <option value="Ambidiestro">Ambidiestro</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Años jugando a fútbol</label>
            <Input type="number" {...register("sportAnosJugando")} placeholder="Ej. 3" min="0" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Objetivo deportivo principal</label>
            <Input {...register("sportObjetivo")} placeholder="Ej. Aprender, competir, divertirse..." />
          </div>
        </div>
      </div>

      {/* BLOQUE ADICIONAL: DATOS FÍSICOS */}
      <div className="mt-10 pt-8 border-t">
        <div className="mb-6 border-b pb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-600" />
            Datos Físicos (Opcional)
          </h3>
          <p className="text-sm text-gray-500 mt-1">Útil para el control de crecimiento y gestión de utillería especial.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-green-50/30 p-6 rounded-xl border border-green-100">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Altura (cm)</label>
            <Input type="number" {...register("fisicoAltura")} placeholder="Ej. 165" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Peso (kg)</label>
            <Input type="number" step="0.1" {...register("fisicoPeso")} placeholder="Ej. 55.5" />
          </div>

        </div>
      </div>

    </div>
  );
}
