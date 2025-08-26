import { redirect } from 'next/navigation'

import { Chat } from '@/components/chat'
import { api } from '@/convex/_generated/api'
import { fetchMutationWithToken } from '@/lib/hooks/convex'
import { fetchQuery } from 'convex/nextjs'

export const maxDuration = 60

export default async function SearchPage(props: {
  searchParams: Promise<{ q: string }>
}) {
  const { q } = await props.searchParams
  if (!q) {
    redirect('/')
  }

  const chatId = await fetchMutationWithToken(api.chat.createChat, {
    title: 'New Chat'
  })
  const models = await fetchQuery(api.models.getModelsForAPI)
  return <Chat id={chatId} query={q} models={models} />
}
