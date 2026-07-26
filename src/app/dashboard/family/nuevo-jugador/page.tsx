import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegistrationWizard } from "@/components/features/registration/RegistrationWizard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Añadir Nuevo Jugador | Portal Familia",
  description: "Inscripción de un nuevo jugador en la familia",
};

export default async function NuevoJugadorPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch the parent's profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  // Fetch the latest player's data to get the parent's phone and DNI (since they are stored there)
  // We also fetch address, city, and postal_code to pre-fill them
  const { data: existingPlayer } = await supabase
    .from("players")
    .select("parent1_phone, parent1_dni, address, city, postal_code")
    .eq("tutor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Pre-fill the initial data for the parent
  const initialData = {
    tutor1Name: profile.first_name || "",
    tutor1LastName: profile.last_name || "",
    tutor1Email: profile.email || "",
    tutor1Phone: existingPlayer?.parent1_phone || "",
    tutor1Dni: existingPlayer?.parent1_dni || "",
    address: existingPlayer?.address || "",
    city: existingPlayer?.city || "",
    postalCode: existingPlayer?.postal_code || "",
    tutorRelation: "Padre/Madre/Tutor", // Default value
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 -mt-6 -mx-6">
      <div className="max-w-4xl mx-auto mb-8 text-center pt-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Añadir Nuevo Jugador
        </h1>
        <p className="text-gray-500 mt-2">
          Completa el formulario para inscribir a otro jugador bajo tu tutela.
        </p>
      </div>
      
      <Suspense fallback={<div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>}>
        <RegistrationWizard isInternalForm={true} initialData={initialData as any} />
      </Suspense>
    </div>
  );
}
