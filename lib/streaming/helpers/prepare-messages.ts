import { UIMessage } from 'ai'

import { api } from '@/convex/_generated/api'
import { fetchMutationWithToken, fetchQueryWithToken } from '@/lib/hooks/convex'
import { createId } from '@paralleldrive/cuid2'
import type { StreamContext } from './types'

const DEFAULT_CHAT_TITLE = 'Untitled'

export async function prepareMessages(
  context: StreamContext,
  message: UIMessage | null
): Promise<UIMessage[]> {
  const { chatId, trigger, messageId, initialChat } = context

  if (trigger === 'regenerate-assistant-message' && messageId) {
    // Handle regeneration
    const currentChat =
      initialChat ||
      (await fetchQueryWithToken(api.chat.loadChatWithMessages, {
        chatId
      }))
    if (!currentChat || !currentChat.messages.length) {
      throw new Error('No messages found')
    }

    let messageIndex = currentChat.messages.findIndex(
      (m: any) => m.id === messageId
    )

    // Fallback: If message not found by ID, try to find by position
    if (messageIndex === -1) {
      const lastAssistantIndex = currentChat.messages.findLastIndex(
        (m: any) => m.role === 'assistant'
      )
      const lastUserIndex = currentChat.messages.findLastIndex(
        (m: any) => m.role === 'user'
      )

      if (lastAssistantIndex >= 0 || lastUserIndex >= 0) {
        messageIndex = Math.max(lastAssistantIndex, lastUserIndex)
      } else {
        throw new Error(
          `Message ${messageId} not found and no fallback available`
        )
      }
    }

    const targetMessage = currentChat.messages[messageIndex]
    if (targetMessage.role === 'assistant') {
      await fetchMutationWithToken(api.chat.deleteMessagesFromIndex, {
        chatId,
        messageId
      })
      return currentChat.messages.slice(0, messageIndex)
    } else {
      // User message edit
      if (message && message.id === messageId) {
        await fetchMutationWithToken(api.chat.upsertMessage, {
          chatId,
          message
        })
      }
      const messagesToDelete = currentChat.messages.slice(messageIndex + 1)
      if (messagesToDelete.length > 0) {
        await fetchMutationWithToken(api.chat.deleteMessagesFromIndex, {
          chatId,
          messageId: messagesToDelete[0].id
        })
      }
      const updatedChat = await fetchQueryWithToken(
        api.chat.loadChatWithMessages,
        {
          chatId
        }
      )
      return (
        updatedChat?.messages || currentChat.messages.slice(0, messageIndex + 1)
      )
    }
  } else {
    // Handle normal message submission
    if (!message) {
      throw new Error('No message provided')
    }

    const messageWithId = {
      ...message,
      id: message.id || createId()
    }

    if (!initialChat) {
      await fetchMutationWithToken(api.chat.createChat, {
        chatId,
        title: DEFAULT_CHAT_TITLE
      })
    }

    await fetchMutationWithToken(api.chat.upsertMessage, {
      chatId,
      message: messageWithId
    })
    const updatedChat = await fetchQueryWithToken(
      api.chat.loadChatWithMessages,
      {
        chatId
      }
    )
    return updatedChat?.messages || [messageWithId]
  }
}
