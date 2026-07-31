"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface LiveAd {
  text: string;
  url: string;
  imageUrl: string;
  isActive: boolean;
}

export async function getLiveAd(): Promise<LiveAd | null> {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .download('live-ad.json')
    
    if (error) return null;
    
    const text = await data.text();
    return JSON.parse(text) as LiveAd;
  } catch (e) {
    return null;
  }
}

export async function updateLiveAd(ad: LiveAd) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
    
  if (profile?.role !== 'admin') {
    return { success: false, error: 'Sin permisos' }
  }

  const jsonStr = JSON.stringify(ad);
  const file = new File([jsonStr], 'live-ad.json', { type: 'application/json' })
  
  // Upsert the file in storage
  const { error } = await supabase.storage
    .from('avatars')
    .upload('live-ad.json', file, { upsert: true, contentType: 'application/json' })

  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath('/live')
  revalidatePath('/dashboard')
  
  return { success: true }
}
