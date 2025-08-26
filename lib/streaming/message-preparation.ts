import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import type { UIMessage } from 'ai'
import { fetchMutationWithToken, fetchQueryWithToken } from '../hooks/convex'

/**
 * Prepares messages for regeneration by handling message deletion and retrieval
 * @param chatId The chat ID
 * @param userId The user ID for authorization
 * @param messageId The message ID to regenerate from
 * @param message The new message (if any)
 * @returns Array of UIMessages to send to the model
 */
export async function prepareMessagesForRegeneration(
  chatId: Id<'chats'>,
  userId: string,
  messageId: string,
  message: UIMessage | null
): Promise<UIMessage[]> {
  const currentChat = await fetchQueryWithToken(api.chat.loadChatWithMessages, {
    chatId
  })
  if (!currentChat || !currentChat.messages.length) {
    throw new Error('No messages found')
  }

  const messageIndex = currentChat.messages.findIndex(m => m.id === messageId)
  if (messageIndex === -1) {
    throw new Error(`Message ${messageId} not found`)
  }

  const targetMessage = currentChat.messages[messageIndex]

  if (targetMessage.role === 'assistant') {
    // Delete from this assistant message onwards
    await fetchMutationWithToken(api.chat.deleteMessagesFromIndex, {
      chatId,
      messageId
    }) // Use messages up to (but not including) this assistant message
    return currentChat.messages.slice(0, messageIndex)
  } else {
    // If it's a user message that was edited, save the updated message first
    if (message && message.id === messageId) {
      await fetchMutationWithToken(api.chat.upsertMessage, {
        chatId,
        message
      })
    }
    // Delete everything after this user message
    const messagesToDelete = currentChat.messages.slice(messageIndex + 1)
    if (messagesToDelete.length > 0) {
      await fetchMutationWithToken(api.chat.deleteMessagesFromIndex, {
        chatId,
        messageId: messagesToDelete[0].id
      })
    }
    // Get updated messages including the edited one
    const updatedChat = await fetchQueryWithToken(
      api.chat.loadChatWithMessages,
      {
        chatId
      }
    )
    if (updatedChat?.messages) {
      return updatedChat.messages
    } else {
      // Fallback: use current messages up to and including the edited message
      return currentChat.messages.slice(0, messageIndex + 1)
    }
  }
}
