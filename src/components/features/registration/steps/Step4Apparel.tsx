import React, { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Shirt } from "lucide-react";
import { RegistrationFormData } from "../schema";
import { Button } from "@/components/ui/button";
import { SizeGuideModal } from "@/components/ui/SizeGuideModal";

const CLOTHING_SIZES = [
  "Talla 116", "Talla 128", "Talla 140", "Talla 152", "Talla 164", "Talla 176",
  "XS", "S", "M", "L", "XL", "2XL", "3XL"
];

const SOCKS_SIZES = [
  "28-32", "33-35", "36-38", "39-42", "43-46"
];

const APPAREL_FIELDS = [
  { name: "sizeCamisetaJuego", label: "Camiseta Juego/Entrenamiento" },
  { name: "sizePantalonJuego", label: "Pantalón Juego/Entrenamiento" },
  { name: "sizeMedias", label: "Medias" },
  { name: "sizeChandal", label: "Chándal Oficial" },
  { name: "sizeSudadera", label: "Sudadera" },
  { name: "sizeCamisetaPaseo", label: "Camiseta de Paseo" },
  { name: "sizePantalonPaseo", label: "Pantalón de Paseo" },
] as const;

export function Step4Apparel() {
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const { register, formState: { errors }, control, setValue } = useFormContext<RegistrationFormData>();
  
  const wasInClub = useWatch({ control, name: "wasInClub" });
  const sizeMochila = useWatch({ control, name: "sizeMochila" });

  React.useEffect(() => {
    if (!wasInClub) {
      setValue("sizeMochila", "Talla Única");
    } else {
      // Si perteneció al club el año pasado, por defecto NO pide mochila salvo que el usuario la seleccione explícitamente
      setValue("sizeMochila", "");
    }
  }, [wasInClub, setValue]);

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
          {wasInClub && (
            <div className="bg-white/10 p-3 rounded-lg border border-white/20 mt-4 text-sm font-medium">
              Al haber estado el año pasado en el club solo se te entregará la ropa de juego y de entrenamiento. Si necesitas alguna prenda más o mochila por cambio de talla o deterioro márcala (se abonará a la entrega).
            </div>
          )}
        </div>
        <div className="shrink-0 mt-4 sm:mt-0">
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
        {APPAREL_FIELDS.map((item) => {
          // Si estuvo en el club, las prendas de juego/entrenamiento no dicen "Opcional"
          // Si NO estuvo en el club, NINGUNA prenda dice "Opcional"
          const isJuego = item.name === 'sizeCamisetaJuego' || item.name === 'sizePantalonJuego';
          const showOptional = wasInClub ? !isJuego : false;

          return (
            <div key={item.name} className="space-y-2">
              <label className="text-sm font-semibold text-gray-800">
                {item.label} {showOptional && <span className="text-gray-400 text-xs font-normal">(Opcional)</span>}
              </label>
              <select 
                {...register(item.name as keyof RegistrationFormData)}
                className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shadow-sm transition-colors border-gray-300 hover:border-blue-400`}
              >
                <option value="">Seleccionar Talla...</option>
                {(item.name === 'sizeMedias' ? SOCKS_SIZES : CLOTHING_SIZES).map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
          );
        })}

        {/* Campo Mochila Oficial */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-800 flex items-center justify-between">
            <span>Mochila Oficial</span>
            {wasInClub ? (
              <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
            ) : (
              <span className="text-blue-700 bg-blue-100 text-[10px] font-bold px-1.5 py-0.5 rounded">Incluida</span>
            )}
          </label>
          <select 
            {...register("sizeMochila")}
            className="flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shadow-sm transition-colors border-gray-300 hover:border-blue-400"
          >
            {wasInClub ? (
              <>
                <option value="">No necesito mochila (conservo la anterior)</option>
                <option value="Talla Única">Sí, solicitar Mochila Oficial (Talla Única)</option>
              </>
            ) : (
              <>
                <option value="Talla Única">Talla Única (Incluida en la inscripción)</option>
              </>
            )}
          </select>
        </div>
      </div>
    </div>
  );
}
