"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Subscriptions from "@/components/features/treasury/Subscriptions"
import { createClient } from "@/lib/supabase/client"

export default function FamilyPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error) {
        setAuthorized(false)
        return
      }
      // Try JWT claim first
      const roleFromJwt = (data.user as any)?.app_metadata?.role
      if (roleFromJwt) {
        setAuthorized(roleFromJwt === "familia" || roleFromJwt === "padre" || roleFromJwt === "family")
        return
      }
      // Fallback: fetch from profiles table
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user?.id)
        .single()
      const role = profile?.role
      setAuthorized(role === "familia" || role === "padre" || role === "family")
    })
  }, [])

  useEffect(() => {
    if (authorized === false) {
      router.replace("/dashboard")
    }
  }, [authorized, router])

  if (authorized === null) {
    return <div className="p-6 text-center">Cargando...</div>
  }

  return <Subscriptions />
}
