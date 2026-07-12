import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Shirt } from "lucide-react";
import { RegistrationFormData } from "../schema";
import { Button } from "@/components/ui/button";
import { SizeGuideModal } from "@/components/ui/SizeGuideModal";

const CLOTHING_SIZES = ["116", "128", "140", "152", "164", "176", "XS", "S", "M", "L", "XL", "2XL", "3XL"];

const APPAREL_FIELDS = [
  { name: "sizeCamisetaJuego", label: "Camiseta Juego/Entrenamiento" },
  { name: "sizePantalonJuego", label: "Pantalón Juego/Entrenamiento" },
  { name: "sizeChandal", label: "Chándal Oficial" },
  { name: "sizeSudadera", label: "Sudadera" },
  { name: "sizeCamisetaPaseo", label: "Camiseta de Paseo" },
  { name: "sizePantalonPaseo", label: "Pantalón de Paseo" },
] as const;

export function Step4Apparel() {
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const { register, formState: { errors } } = useFormContext<RegistrationFormData>();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white rounded-xl sm:flex sm:items-center sm:justify-between shadow-md">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Shirt className="w-6 h-6" />
            Utillería Oficial
          </h3>
          <p className="text-blue-100 text-sm mt-1 mb-4 sm:mb-0 max-w-lg">
            Selecciona la talla para cada prenda. Consulta la guía de tallas para Hummel.
          </p>
        </div>
        <div className="shrink-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsSizeGuideOpen(true)}
            className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
          >
            Ver Guía de Tallas
          </Button>
          <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-blue-50/30 p-6 rounded-xl border border-blue-100">
        {APPAREL_FIELDS.map((item) => (
          <div key={item.name} className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">{item.label} <span className="text-red-500">*</span></label>
            <select 
              {...register(item.name)}
              className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shadow-sm transition-colors ${errors[item.name as keyof RegistrationFormData] ? 'border-red-500' : 'border-gray-300 hover:border-blue-400'}`}
            >
              <option value="">Seleccionar Talla...</option>
              {CLOTHING_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
            </select>
            {errors[item.name as keyof RegistrationFormData] && (
              <p className="text-xs text-red-500">Requerido</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
