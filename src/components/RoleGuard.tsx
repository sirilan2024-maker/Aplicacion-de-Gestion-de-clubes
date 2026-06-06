"use client";
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchRole() {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (error || !profile) {
        console.error('Failed to fetch profile', error)
        setRole(null)
      } else {
        setRole(profile.role as string)
      }
      setLoading(false)
    }
    fetchRole()
  }, [router])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><span className="text-gray-600">Cargando...</span></div>
  }

  if (!role || !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    const destination = role === 'coach' ? '/dashboard/mis-equipos' : '/dashboard/mi-perfil'
    router.replace(destination)
    return null
  }

  return <>{children}</>
}
