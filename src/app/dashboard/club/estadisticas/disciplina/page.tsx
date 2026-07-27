// Redirect to the unified discipline view in /dashboard/matches
import { redirect } from "next/navigation"

export default async function DisciplinaRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string }>
}) {
  const params = await searchParams
  const teamId = params?.teamId
  
  if (teamId) {
    redirect(`/dashboard/equipos/${teamId}/partidos?view=disciplina`)
  } else {
    redirect('/dashboard/matches?view=disciplina')
  }
}
