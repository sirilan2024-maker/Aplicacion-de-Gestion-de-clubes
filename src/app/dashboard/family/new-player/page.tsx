import { createClient } from "@/lib/supabase/server"
import { RegistrationWizard } from "@/components/features/registration/RegistrationWizard"
import { redirect } from "next/navigation"

export default async function NewPlayerPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  // Obtenemos la última inscripción de este usuario para pre-rellenar los datos del tutor y dirección
  const { data: latestReg } = await supabase
    .from("registrations")
    .select("form_data")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const initialData: any = {}
  
  if (latestReg && latestReg.form_data) {
    const fd = latestReg.form_data
    // Pre-rellenamos datos del Tutor
    if (fd.tutor1Name) initialData.tutor1Name = fd.tutor1Name
    if (fd.tutor1LastName) initialData.tutor1LastName = fd.tutor1LastName
    if (fd.tutor1Dni) initialData.tutor1Dni = fd.tutor1Dni
    if (fd.tutor1Email) initialData.tutor1Email = fd.tutor1Email
    if (fd.tutor1Phone) initialData.tutor1Phone = fd.tutor1Phone
    if (fd.tutorRelation) initialData.tutorRelation = fd.tutorRelation

    // Pre-rellenamos Dirección
    if (fd.address) initialData.address = fd.address
    if (fd.city) initialData.city = fd.city
    if (fd.postalCode) initialData.postalCode = fd.postalCode
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inscribir a otro jugador</h1>
        <p className="text-gray-500 mt-2">
          Hemos pre-rellenado tus datos de contacto y dirección para que sea más rápido.
          Solo tienes que introducir los datos del nuevo jugador y firmar los consentimientos legales correspondientes.
        </p>
      </div>

      <RegistrationWizard isInternalForm={true} initialData={initialData} />
    </div>
  )
}
