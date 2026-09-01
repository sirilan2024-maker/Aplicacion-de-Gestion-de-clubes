"use client"

import React from "react"
import { InjuryManagement } from "@/components/features/injuries/InjuryManagement"

interface PlayerData {
  id: string
  name: string
  number?: string | number
  position?: string
  status?: string
  avatarUrl?: string
}

interface ProfessionalInjuryModalProps {
  isOpen: boolean
  onClose: () => void
  player: PlayerData
  onInjuryCreated: () => void
}

export function ProfessionalInjuryModal({
  isOpen,
  onClose,
  player,
  onInjuryCreated
}: ProfessionalInjuryModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="w-full max-w-7xl h-full max-h-[96vh] flex items-center justify-center">
        <InjuryManagement
          player={{
            id: player.id,
            name: player.name || "Marco Sánchez",
            number: player.number || "#8",
            position: player.position || "Centrocampista",
            avatarUrl: player.avatarUrl,
            status: player.status || "Lesionado"
          }}
          onClose={onClose}
          onSaved={onInjuryCreated}
        />
      </div>
    </div>
  )
}
