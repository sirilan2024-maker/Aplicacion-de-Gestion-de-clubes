"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface LiveAd {
  id: string;
  text: string;
  description?: string;
  textLayout?: 'overlay' | 'below';
  url: string;
  imageUrl: string;
  isActive: boolean;
}

export async function getLiveAds(): Promise<LiveAd[]> {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .download('live-ad.json')
    
    if (error) return [];
    
    const text = await data.text();
    const parsed = JSON.parse(text);
    
    if (Array.isArray(parsed)) {
      return parsed as LiveAd[];
    } else if (parsed && typeof parsed === 'object') {
      // Migrate old single object
      return [{ ...parsed, id: '1', description: '', textLayout: 'overlay' } as LiveAd];
    }
    return [];
  } catch (e) {
    return [];
  }
}

export async function uploadAdImage(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== 'admin') return { success: false, error: 'Sin permisos' }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  const file = formData.get('logo') as File | null;
  if (!file || file.size === 0) return { success: false, error: 'No se envió archivo' };

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
  return { success: true, url: publicUrl };
}

export async function saveLiveAds(ads: LiveAd[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== 'admin') return { success: false, error: 'Sin permisos' }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  const jsonStr = JSON.stringify(ads);
  const jsonFile = new File([jsonStr], 'live-ad.json', { type: 'application/json' })
  
  const { error } = await adminClient.storage
    .from('avatars')
    .upload('live-ad.json', jsonFile, { upsert: true, contentType: 'application/json' })

  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath('/live')
  
  return { success: true, ads }
}
