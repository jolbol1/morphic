import { UIMessage, UIMessageStreamWriter } from 'ai'

import { generateRelatedQuestions } from '@/lib/agents/generate-related-questions'
import { hasToolCalls } from '@/lib/utils/message-utils'

import { api } from '@/convex/_generated/api'
import { fetchMutationWithToken } from '@/lib/hooks/convex'
import { createId } from '@paralleldrive/cuid2'
import type { StreamContext } from './types'

const DEFAULT_CHAT_TITLE = 'Untitled'

export async function handleStreamFinish(
  writer: UIMessageStreamWriter,
  responseMessage: UIMessage,
  messagesToModel: UIMessage[],
  context: StreamContext,
  titlePromise?: Promise<string>
) {
  const { chatId, modelId, abortSignal } = context

  // Generate related questions if there are tool calls
  if (hasToolCalls(responseMessage as UIMessage | null)) {
    const questionPartId = createId()

    try {
      writer.write({
        type: 'data-relatedQuestions',
        id: questionPartId,
        data: { status: 'loading' }
      })

      const relatedQuestions = await generateRelatedQuestions(
        modelId,
        [...messagesToModel, responseMessage],
        abortSignal
      )

      responseMessage.parts.push({
        type: 'data-relatedQuestions',
        id: questionPartId,
        data: {
          status: 'success',
          questions: relatedQuestions.questions
        }
      })

      writer.write({
        type: 'data-relatedQuestions',
        id: questionPartId,
        data: {
          status: 'success',
          questions: relatedQuestions.questions
        }
      })
    } catch (error) {
      console.error('Error generating related questions:', error)
      writer.write({
        type: 'data-relatedQuestions',
        id: questionPartId,
        data: { status: 'error' }
      })
    }
  }

  // Wait for title generation if it was started
  const chatTitle = titlePromise ? await titlePromise : undefined

  await fetchMutationWithToken(api.chat.upsertMessage, {
    chatId,
    message: responseMessage
  })

  console.log('[HANDLE STREAM FINISH] chatTitle', chatTitle)
  // Update title after message is saved
  if (chatTitle && chatTitle !== DEFAULT_CHAT_TITLE) {
    console.log('[HANDLE STREAM FINISH] updating title', chatTitle)
    await fetchMutationWithToken(api.chat.updateChatTitle, {
      chatId,
      title: chatTitle
    })
  }
}
