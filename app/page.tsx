import { getModels } from '@/lib/config/models'

import { Chat } from '@/components/chat'
import { createId } from '@paralleldrive/cuid2'

export default async function Page() {
  const id = createId()
  const models = await getModels()
  return <Chat id={id} models={models} />
}
