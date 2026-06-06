"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deletePlayer } from "@/lib/players-actions"

export function DeletePlayerButton({ id, name }: { id: string, name: string }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar al jugador ${name}? Esta acción no se puede deshacer.`)) {
      setIsDeleting(true)
      await deletePlayer(id)
      setIsDeleting(false)
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      disabled={isDeleting}
      className="h-8 w-8 text-gray-400 hover:text-red-600"
      onClick={handleDelete}
      title="Eliminar jugador"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
