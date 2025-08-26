import { UIMessage } from 'ai'

import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { fetchMutationWithToken } from '@/lib/hooks/convex'
import { perfTime } from '@/lib/utils/perf-logging'
import { retryDatabaseOperation } from '@/lib/utils/retry'

const DEFAULT_CHAT_TITLE = 'Untitled'

export async function persistStreamResults(
  responseMessage: UIMessage,
  chatId: Id<'chats'>,
  titlePromise?: Promise<string>,
  parentTraceId?: string,
  modelId?: string
) {
  // Attach metadata to the response message
  responseMessage.metadata = {
    ...(responseMessage.metadata || {}),
    ...(parentTraceId && { traceId: parentTraceId }),
    ...(modelId && { modelId })
  }

  // Wait for title generation if it was started
  const chatTitle = titlePromise ? await titlePromise : undefined

  // Save message with retry logic
  const saveStart = performance.now()
  try {
    await fetchMutationWithToken(api.chat.upsertMessage, {
      id: responseMessage.id,
      chatId,
      message: responseMessage
    })
    perfTime('upsertMessage (AI response) completed', saveStart)
  } catch (error) {
    console.error('Error saving message:', error)
    try {
      await retryDatabaseOperation(
        () =>
          fetchMutationWithToken(api.chat.upsertMessage, {
            id: responseMessage.id,
            chatId,
            message: responseMessage
          }),
        'save message'
      )
      perfTime('upsertMessage (AI response) completed after retry', saveStart)
    } catch (retryError) {
      console.error('Failed to save after retries:', retryError)
      // Don't throw here to avoid breaking the stream
    }
  }

  // Update title after message is saved
  if (chatTitle && chatTitle !== DEFAULT_CHAT_TITLE) {
    try {
      await fetchMutationWithToken(api.chat.updateChatTitle, {
        chatId,
        title: chatTitle
      })
    } catch (error) {
      console.error('Error updating title:', error)
      // Don't throw here as title update is not critical
    }
  }
}
