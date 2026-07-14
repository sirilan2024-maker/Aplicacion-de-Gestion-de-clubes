import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { User, Users } from "lucide-react";
import { RegistrationFormData } from "../schema";

export function Step1PersonalData() {
  const { register, formState: { errors }, control } = useFormContext<RegistrationFormData>();
  
  const birthDate = useWatch({ control, name: "birthDate" });
  
  let category = "";
  let isSenior = false;
  
  if (birthDate) {
    const year = new Date(birthDate).getFullYear();
    if (year <= 2007) {
      category = "Senior";
      isSenior = true;
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
      <div className="mb-6 border-b pb-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          Datos Personales del Jugador
        </h3>
        <p className="text-sm text-gray-500 mt-1">Información principal de quien se inscribe.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Nombre <span className="text-red-500">*</span></label>
          <Input {...register("playerFirstName")} placeholder="Nombre del jugador" className={errors.playerFirstName ? "border-red-500" : ""} />
          {errors.playerFirstName && <p className="text-xs text-red-500">{errors.playerFirstName.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Apellidos <span className="text-red-500">*</span></label>
          <Input {...register("playerLastName")} placeholder="Apellidos" className={errors.playerLastName ? "border-red-500" : ""} />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">DNI/NIE del Jugador <span className="text-red-500">*</span></label>
          <Input {...register("playerDni")} placeholder="12345678A" className={errors.playerDni ? "border-red-500" : ""} />
          {errors.playerDni && <p className="text-xs text-red-500">{errors.playerDni.message}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Fecha de Nacimiento <span className="text-red-500">*</span></label>
          <Input type="date" {...register("birthDate")} className={errors.birthDate ? "border-red-500" : ""} />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Categoría Asignada</label>
          <div className="flex h-10 w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 items-center font-semibold">
            {category || "Introduce fecha para calcular"}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Nacionalidad <span className="text-red-500">*</span></label>
          <Input {...register("nationality")} placeholder="Ej. Española" defaultValue="Española" />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-gray-700">Domicilio Completo <span className="text-red-500">*</span></label>
          <Input {...register("address")} placeholder="Calle, número, piso..." />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Localidad <span className="text-red-500">*</span></label>
          <Input {...register("city")} placeholder="Ej. Almoradí" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Código Postal <span className="text-red-500">*</span></label>
          <Input {...register("postalCode")} placeholder="03160" />
        </div>
      </div>

      {/* Conditional Parent Section */}
      {!isSenior && (
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
              <label className="text-sm font-semibold text-gray-700">Nombre del Tutor <span className="text-red-500">*</span></label>
              <Input {...register("tutor1Name")} placeholder="Nombre completo" className={errors.tutor1Name ? "border-red-500" : ""} />
              {errors.tutor1Name && <p className="text-xs text-red-500">{errors.tutor1Name.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">DNI/NIE del Tutor <span className="text-red-500">*</span></label>
              <Input {...register("tutor1Dni")} placeholder="12345678A" className={errors.tutor1Dni ? "border-red-500" : ""} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email <span className="text-red-500">*</span></label>
              <Input type="email" {...register("tutor1Email")} placeholder="correo@ejemplo.com" className={errors.tutor1Email ? "border-red-500" : ""} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Teléfono</label>
              <Input type="tel" {...register("tutor1Phone")} placeholder="+34 600..." />
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
      )}
    </div>
  );
}
