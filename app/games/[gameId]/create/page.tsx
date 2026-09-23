import { redirect } from "next/navigation"

interface CreateMatchPageProps {
  params: Promise<{ gameId: string }>
}

/** Stake is chosen on the queue page. Hosting happens there. */
export default async function CreateMatchPage({ params }: CreateMatchPageProps) {
  const { gameId } = await params
  redirect(`/games/${gameId}`)
}
