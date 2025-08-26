import { UIMessage } from 'ai'

import { perfLog, perfTime } from '@/lib/utils/perf-logging'

import { api } from '@/convex/_generated/api'
import { fetchMutationWithToken, fetchQueryWithToken } from '@/lib/hooks/convex'
import { createId } from '@paralleldrive/cuid2'
import type { StreamContext } from './types'

export async function prepareMessages(
  context: StreamContext,
  message: UIMessage | null
): Promise<UIMessage[]> {
  const { chatId, trigger, messageId, initialChat, isNewChat } = context
  const startTime = performance.now()
  perfLog(`prepareMessages - Start: trigger=${trigger}, isNewChat=${isNewChat}`)

  if (trigger === 'regenerate-message' && messageId) {
    // Handle regeneration - use initialChat if available to avoid DB call
    let currentChat = initialChat
    if (!currentChat) {
      currentChat = await fetchQueryWithToken(api.chat.loadChatWithMessages, {
        chatId
      })
    }
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

    // // Optimize for new chats: create chat and save message together
    // if (isNewChat) {
    //   // Use createChatWithFirstMessage for atomic operation
    //   const createStart = performance.now()
    //   await fetchMutationWithToken(api.chat.createChatWithFirstMessage, {
    //     message: messageWithId,
    //     title: DEFAULT_CHAT_TITLE
    //   })
    //   perfTime('createChatWithFirstMessage completed', createStart)
    //   perfTime('prepareMessages - Total', startTime)
    //   return [messageWithId]
    // }

    // For existing chats
    // if (!initialChat) {
    //   const createStart = performance.now()
    //   await fetchMutationWithToken(api.chat.createChat, {
    //     title: DEFAULT_CHAT_TITLE
    //   })
    //   perfTime('createChat completed', createStart)
    // }

    const upsertStart = performance.now()
    await fetchMutationWithToken(api.chat.upsertMessage, {
      chatId,
      message: messageWithId
    })
    perfTime('upsertMessage completed', upsertStart)

    // If we have initialChat, append the new message instead of fetching all messages
    if (initialChat && initialChat.messages) {
      perfTime('prepareMessages - Total (using cached chat)', startTime)
      return [...initialChat.messages, messageWithId]
    }

    // Fallback to fetching if no initialChat
    const loadStart = performance.now()
    const updatedChat = await fetchQueryWithToken(
      api.chat.loadChatWithMessages,
      {
        chatId
      }
    )
    perfTime('loadChat (fallback) completed', loadStart)
    perfTime('prepareMessages - Total', startTime)
    return updatedChat?.messages || [messageWithId]
  }
}
