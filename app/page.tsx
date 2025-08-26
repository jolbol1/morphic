import { Chat } from '@/components/chat'
import { api } from '@/convex/_generated/api'
import { createId } from '@paralleldrive/cuid2'
import { fetchQuery } from 'convex/nextjs'

export default async function Page() {
  const id = createId()
  const models = await fetchQuery(api.models.getModelsForAPI)
  return <Chat id={id} models={models} />
}
