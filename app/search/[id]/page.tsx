import { notFound } from 'next/navigation'

import { UIMessage } from 'ai'

import { Chat } from '@/components/chat'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { fetchQueryWithToken } from '@/lib/hooks/convex'
import { fetchQuery } from 'convex/nextjs'

export const maxDuration = 60

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  const chat = await fetchQueryWithToken(api.chat.getChat, {
    chatId: id as Id<'chats'>
  })

  if (!chat) {
    return { title: 'Search' }
  }

  return {
    title: chat.title.toString().slice(0, 50) || 'Search'
  }
}

export default async function SearchPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  const chat = await fetchQueryWithToken(api.chat.loadChatWithMessages, {
    chatId: id as Id<'chats'>
  })

  if (!chat) {
    notFound()
  }

  const messages: UIMessage[] = chat.messages

  const models = await fetchQuery(api.models.getModelsForAPI)
  return <Chat id={chat._id} savedMessages={messages} models={models} />
}
