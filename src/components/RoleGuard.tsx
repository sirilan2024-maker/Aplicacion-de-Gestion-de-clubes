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
  const [redirecting, setRedirecting] = useState(false)
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
        console.error(`Failed to fetch profile for ${user.email} (${user.id}):`, error ? JSON.stringify(error) : 'No profile returned');
        setRole(null)
      } else {
        setRole(profile.role as string)
      }
      setLoading(false)
    }
    fetchRole()
  }, [router])

  useEffect(() => {
    const isAllowed = role === 'admin' || (role && allowedRoles.includes(role))
    if (!loading && !isAllowed) {
      setRedirecting(true)
      router.replace('/dashboard')
    }
  }, [loading, role, allowedRoles, router])

  if (loading || redirecting) {
    return <div className="flex items-center justify-center min-h-screen"><span className="text-gray-600">Cargando...</span></div>
  }

  const isAllowed = role === 'admin' || (role && allowedRoles.includes(role))
  if (!isAllowed) {
    return null
  }

  return <>{children}</>
}
