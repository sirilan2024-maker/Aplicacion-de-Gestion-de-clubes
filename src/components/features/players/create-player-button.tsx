"use client"

import { useState } from "react"
import { Plus, User, Users, FileHeart, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createPlayer } from "@/lib/players-actions"

export function CreatePlayerButton({ teamsList }: { teamsList: { id: string, name: string }[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'jugador' | 'familia' | 'medica' | 'autorizaciones'>('jugador')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    
    const formData = new FormData(e.currentTarget)
    
    // Validación manual
    const requiredFields = [
      { name: 'firstName', label: 'Nombre del Jugador' },
      { name: 'lastName', label: 'Apellidos del Jugador' },
      { name: 'birthDate', label: 'Fecha de Nacimiento' },
      { name: 'tutor1_nombre', label: 'Nombre del Tutor 1' },
      { name: 'tutor1_telefono', label: 'Teléfono del Tutor 1' }
    ]

    for (const field of requiredFields) {
      if (!formData.get(field.name)) {
        setErrorMessage(`Por favor, rellena el campo obligatorio: ${field.label}`)
        // Cambiar a la pestaña correspondiente si es posible
        if (['firstName', 'lastName', 'birthDate'].includes(field.name)) setActiveTab('jugador')
        else if (['tutor1_nombre', 'tutor1_telefono'].includes(field.name)) setActiveTab('familia')
        return
      }
    }

    setIsSaving(true)

    // Agregamos checkboxes que pueden no estar presentes si no se marcan
    if (!formData.has('authImagen')) formData.append('authImagen', 'false')
    if (!formData.has('authMedica')) formData.append('authMedica', 'false')
    if (!formData.has('authDesplazamiento')) formData.append('authDesplazamiento', 'false')
    if (!formData.has('descuentoHermanos')) formData.append('descuentoHermanos', 'false')

    const result = await createPlayer(formData)

    if (result?.error) {
      setErrorMessage(result.error)
    } else {
      setIsModalOpen(false)
    }
    setIsSaving(false)
  }

  const tabs = [
    { id: 'jugador', label: 'Jugador', icon: User },
    { id: 'familia', label: 'Familia', icon: Users },
    { id: 'medica', label: 'Ficha Médica', icon: FileHeart },
    { id: 'autorizaciones', label: 'Legal', icon: ShieldCheck },
  ] as const;

  return (
    <>
      <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
        <Plus className="h-4 w-4" />
        Nuevo Jugador
      </Button>

      <Dialog 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Añadir Jugador"
        description="Completa todos los datos del nuevo jugador."
      >
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm font-medium">
            {errorMessage}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          
          {/* TABS NAVEGACIÓN */}
          <div className="flex space-x-1 border-b border-gray-200 pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors
                    ${activeTab === tab.id 
                      ? 'border-blue-600 text-blue-600 bg-blue-50' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="py-2 h-[45vh] overflow-y-auto px-1">
            {/* TAB JUGADOR */}
            <div className={activeTab === 'jugador' ? 'space-y-4 block' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <Input name="firstName" placeholder="Ej. Leo" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                  <Input name="lastName" placeholder="Ej. Messi" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DNI / NIE</label>
                  <Input name="dni" placeholder="12345678A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                  <Input name="birthDate" type="date" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posición Principal</label>
                  <select name="posicion_principal" className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                    <option value="">Seleccionar posición...</option>
                    <option value="Portero">Portero</option>
                    <option value="Defensa">Defensa</option>
                    <option value="Centrocampista">Centrocampista</option>
                    <option value="Delantero">Delantero</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Licencia Federativa</label>
                  <Input name="num_licencia_fed" placeholder="Número de licencia" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipo Asignado</label>
                <select name="teamId" className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-all">
                  <option value="none">Sin equipo</option>
                  {teamsList.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* TAB FAMILIA */}
            <div className={activeTab === 'familia' ? 'space-y-4 block' : 'hidden'}>
              <h4 className="font-semibold text-sm text-gray-900 border-b pb-1">Tutor Legal 1</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                  <Input name="tutor1_nombre" placeholder="Ej. Jorge Messi" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <Input name="tutor1_telefono" type="tel" placeholder="Ej. 600 000 000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input name="tutor1_email" type="email" placeholder="jorge@ejemplo.com" />
              </div>

              <h4 className="font-semibold text-sm text-gray-900 border-b pb-1 mt-4">Tutor Legal 2 (Opcional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                  <Input name="tutor2_nombre" placeholder="Ej. Celia Cuccittini" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <Input name="tutor2_telefono" type="tel" placeholder="Ej. 611 111 111" />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id="descuentoHermanos" name="descuentoHermanos" value="true" className="rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
                <label htmlFor="descuentoHermanos" className="text-sm font-medium text-gray-700">Aplica descuento por hermanos</label>
              </div>
            </div>

            {/* TAB FICHA MÉDICA */}
            <div className={activeTab === 'medica' ? 'space-y-4 block' : 'hidden'}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grupo Sanguíneo</label>
                <select name="grupo_sanguineo" className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                  <option value="">Desconocido</option>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
                <textarea name="alergias" className="flex min-h-[60px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" placeholder="Ej. Penicilina, polen... (Dejar vacío si no aplica)"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enfermedades o Condiciones Crónicas</label>
                <textarea name="enfermedades" className="flex min-h-[60px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" placeholder="Ej. Asma, diabetes..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicación Habitual</label>
                <textarea name="medicacion" className="flex min-h-[60px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" placeholder="Ej. Inhalador preventivo..."></textarea>
              </div>
            </div>

            {/* TAB AUTORIZACIONES */}
            <div className={activeTab === 'autorizaciones' ? 'space-y-4 block' : 'hidden'}>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-md mb-4">
                <p className="text-sm text-blue-800">
                  Marca las casillas si los tutores legales han firmado los consentimientos correspondientes.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="authImagen" name="authImagen" value="true" className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
                  <label htmlFor="authImagen" className="text-sm text-gray-700">
                    <span className="font-medium block">Derechos de Imagen</span>
                    Autoriza la toma de fotografías y vídeos para uso del club.
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="authMedica" name="authMedica" value="true" className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
                  <label htmlFor="authMedica" className="text-sm text-gray-700">
                    <span className="font-medium block">Intervención Médica</span>
                    Autoriza la atención médica de urgencia en caso de accidente.
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="authDesplazamiento" name="authDesplazamiento" value="true" className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
                  <label htmlFor="authDesplazamiento" className="text-sm text-gray-700">
                    <span className="font-medium block">Desplazamientos</span>
                    Autoriza los desplazamientos en vehículos del club o de otros tutores.
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex gap-3 justify-between border-t border-gray-100">
            <div>
              {activeTab !== 'jugador' && (
                <Button variant="outline" type="button" onClick={() => {
                  const currentIndex = tabs.findIndex(t => t.id === activeTab);
                  setActiveTab(tabs[currentIndex - 1].id);
                }}>
                  Anterior
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {activeTab !== 'autorizaciones' ? (
                <Button type="button" onClick={() => {
                  const currentIndex = tabs.findIndex(t => t.id === activeTab);
                  setActiveTab(tabs[currentIndex + 1].id);
                }}>
                  Siguiente
                </Button>
              ) : (
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Finalizar y Guardar Jugador"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Dialog>
    </>
  )
}

