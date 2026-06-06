"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createTeam } from "@/lib/teams-actions"

export function CreateTeamButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    
    const formData = new FormData(e.currentTarget)
    const result = await createTeam(formData)

    if (result?.error) {
      alert(result.error)
    } else {
      setIsModalOpen(false)
    }
    setIsSaving(false)
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
        <Plus className="h-4 w-4" />
        Nuevo Equipo
      </Button>

      <Dialog 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Equipo"
        description="Completa los detalles para añadir un nuevo equipo al club."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Equipo</label>
            <Input name="name" placeholder="Ej. Alevín B" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select name="category" className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-all">
              <option value="Prebenjamín">Prebenjamín</option>
              <option value="Benjamín">Benjamín</option>
              <option value="Alevín">Alevín</option>
              <option value="Infantil">Infantil</option>
              <option value="Cadete">Cadete</option>
              <option value="Juvenil">Juvenil</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color del Equipo</label>
            <div className="flex gap-2">
              <Input type="color" name="color" defaultValue="#1E40AF" className="w-12 h-10 p-1" />
              <Input name="color_hex" value="#1E40AF" disabled className="flex-1 bg-gray-50" />
            </div>
          </div>
          <div className="pt-4 flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar Equipo"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
