import { redirect } from 'next/navigation'

import { generateUUID } from '@/lib/utils'

import { Chat } from '@/components/chat'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'

export const maxDuration = 60

export default async function SearchPage(props: {
  searchParams: Promise<{ q: string }>
}) {
  const { q } = await props.searchParams
  if (!q) {
    redirect('/')
  }

  const id = generateUUID()
  const models = await fetchQuery(api.models.getModelsForAPI)
  return <Chat id={id} query={q} models={models} />
}
