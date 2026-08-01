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

export async function updateLiveAd(formData: FormData) {
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

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  const text = formData.get('text') as string;
  const url = formData.get('url') as string;
  const isActive = formData.get('isActive') === 'true';
  let imageUrl = formData.get('imageUrl') as string;

  const file = formData.get('logo') as File | null;
  if (file && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `live-ad-${Date.now()}.${fileExt}`;
    const filePath = `ads/${fileName}`;
    
    const { error: uploadError } = await adminClient.storage
      .from('avatars')
      .upload(filePath, buffer, { contentType: file.type, upsert: true });
      
    if (uploadError) return { success: false, error: 'Error subiendo imagen: ' + uploadError.message };
    
    const { data: { publicUrl } } = adminClient.storage.from('avatars').getPublicUrl(filePath);
    imageUrl = publicUrl;
  }

  const ad: LiveAd = { text, url, imageUrl, isActive };
  const jsonStr = JSON.stringify(ad);
  const jsonFile = new File([jsonStr], 'live-ad.json', { type: 'application/json' })
  
  const { error } = await supabase.storage
    .from('avatars')
    .upload('live-ad.json', jsonFile, { upsert: true, contentType: 'application/json' })

  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath('/live')
  
  return { success: true, ad }
}
