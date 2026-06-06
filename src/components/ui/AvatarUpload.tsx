"use client"

import React, { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Camera, Loader2, User } from "lucide-react"

interface AvatarUploadProps {
  url: string | null | undefined
  onUpload: (url: string) => void
  fallbackInitials?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClasses = {
  sm: "w-10 h-10 text-sm",
  md: "w-16 h-16 text-xl",
  lg: "w-24 h-24 text-3xl",
  xl: "w-32 h-32 text-4xl"
}

export function AvatarUpload({ url, onUpload, fallbackInitials, size = "lg", className = "" }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleContainerClick = () => {
    if (!uploading) {
      fileInputRef.current?.click()
    }
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Debes seleccionar una imagen para subir.")
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      onUpload(publicUrl)
    } catch (error) {
      console.error("Error uploading avatar:", error)
      alert("Error al subir la foto.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div 
      className={`relative rounded-full overflow-hidden flex items-center justify-center bg-slate-100 border-2 border-slate-200 cursor-pointer group ${sizeClasses[size]} ${className}`}
      onClick={handleContainerClick}
    >
      {url ? (
        <img 
          src={url} 
          alt="Avatar" 
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-bold text-slate-400">
          {fallbackInitials ? fallbackInitials : <User className="w-1/2 h-1/2 text-slate-300" />}
        </span>
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {uploading ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
          <Camera className="w-6 h-6 text-white" />
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={uploadAvatar}
        accept="image/*"
        className="hidden"
      />
    </div>
  )
}
