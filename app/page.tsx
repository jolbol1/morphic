import { Chat } from '@/components/chat'
import { api } from '@/convex/_generated/api'
import { fetchMutationWithToken } from '@/lib/hooks/convex'
import { createId } from '@paralleldrive/cuid2'
import { fetchQuery } from 'convex/nextjs'

export default async function Page() {
  const id = createId()
  const models = await fetchQuery(api.models.getModelsForAPI)
  const chatId = await fetchMutationWithToken(api.chat.createChat, {
    title: 'New Chat'
  })
  return <Chat id={chatId} models={models} />
}
