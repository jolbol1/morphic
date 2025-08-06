import { revalidatePath } from 'next/cache'

import { api } from '@/convex/_generated/api'
import { Doc } from '@/convex/_generated/dataModel'
import { fetchMutation, fetchQuery } from 'convex/nextjs'

// Create a new chat
// CONVERTED TO CONVEX
export async function createChat({
  title,
  userId,
  visibility = 'private'
}: {
  title: string
  userId: string
  visibility?: 'public' | 'private'
}): Promise<Doc<'chats'>> {
  console.log('Creating chat', title, userId, visibility)
  const convexChat = await fetchMutation(api.chat.createChat, {
    title,
    userId,
    visibility
  })

  if (!convexChat) {
    throw new Error('Failed to create convex chat')
  }

  // const [chat] = await db
  //   .insert(chats)
  //   .values({
  //     id: convexChat?.chatId,
  //     title,
  //     userId,
  //     visibility
  //   })
  //   .returning()

  return convexChat
}

// Get a chat by ID
// CONVERTED TO CONVEX
export async function getChat(
  id: string,
  userId: string
): Promise<Doc<'chats'> | null> {
  const convexChat = await fetchQuery(api.chat.getChat, {
    chatId: id,
    userId
  })

  return convexChat || null
}

// Get all chats for a user
// CONVERTED TO CONVEX
export async function getChats(userId: string): Promise<Doc<'chats'>[]> {
  const convexChats = await fetchQuery(api.chat.getChats, {
    userId
  })

  return convexChats || []
}

// Get chats with pagination
// CONVERTED TO CONVEX
export async function getChatsPage(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ chats: Doc<'chats'>[]; nextOffset: number | null }> {
  const convexChats = await fetchQuery(api.chat.getChatsPage, {
    userId,
    limit,
    offset
  })

  return convexChats || { chats: [], nextOffset: null }
  // try {
  //   const results = await db
  //     .select()
  //     .from(chats)
  //     .where(eq(chats.userId, userId))
  //     .orderBy(desc(chats.createdAt))
  //     .limit(limit)
  //     .offset(offset)

  //   const nextOffset = results.length === limit ? offset + limit : null

  //   return {
  //     chats: results,
  //     nextOffset
  //   }
  // } catch (error) {
  //   console.error('Error fetching chat page:', error)
  //   return { chats: [], nextOffset: null }
  // }
}

// Update a chat
// CONVERTED TO CONVEX
export async function updateChat(
  id: string,
  data: Partial<Pick<Doc<'chats'>, 'title' | 'visibility'>>
): Promise<Doc<'chats'> | null> {
  const convexChat = await fetchMutation(api.chat.updateChat, {
    chatId: id,
    data
  })

  if (!convexChat) {
    throw new Error('Failed to update chat')
  }

  // const [chat] = await db
  //   .update(chats)
  //   .set({
  //     ...data
  //   })
  //   .where(eq(chats.id, id))
  //   .returning()

  return convexChat
}

// Delete a chat and its messages
// CONVERTED TO CONVEX
export async function deleteChat(
  id: string,
  userId: string
): Promise<{ error?: string }> {
  try {
    // First verify the chat exists and belongs to the user
    const chat = await getChat(id, userId)

    if (!chat) {
      console.warn(`Attempted to delete non-existent chat: ${id}`)
      return { error: 'Chat not found' }
    }

    // Check if the chat belongs to the user
    if (chat.userId !== userId) {
      return { error: 'Unauthorized' }
    }

    // Delete the chat
    // await db.delete(chats).where(eq(chats.id, id))
    // Converted to convex.
    await fetchMutation(api.chat.deleteChat, {
      chatId: id,
      userId
    })

    // Revalidate the root path where the chat history is displayed
    revalidatePath('/')

    return {}
  } catch (error) {
    console.error(`Error deleting chat ${id}:`, error)
    return { error: 'Failed to delete chat' }
  }
}

// Add a message to a chat
// CONVERTED TO CONVEX
export async function addMessage({
  id,
  chatId,
  role,
  parts
}: {
  id?: string
  chatId: string
  role: string
  parts: any
}): Promise<Doc<'messages'>> {
  const convexMessage = await fetchMutation(api.chat.addMessage, {
    id,
    chatId,
    role,
    parts
  })

  if (!convexMessage) {
    throw new Error('Failed to add message')
  }

  return convexMessage

  // const attachments = Array.isArray(parts)
  //   ? parts
  //       .filter(part => part.type === 'file')
  //       .map(part => ({
  //         name: part.filename,
  //         url: part.url,
  //         contentType: part.mediaType
  //       }))
  //   : []

  // const valuesToInsert: {
  //   id?: string
  //   chatId: string
  //   role: string
  //   parts: any
  //   attachments: any
  // } = {
  //   chatId,
  //   role,
  //   parts,
  //   attachments
  // }

  // if (id) {
  //   valuesToInsert.id = id
  // }

  // const [message] = await db.insert(messages).values(valuesToInsert).returning()

  // return message
}

// Get all messages for a chat
// CONVERTED TO CONVEX
export async function getChatMessages(
  chatId: string
): Promise<Doc<'messages'>[]> {
  const convexMessages = await fetchQuery(api.chat.getChatMessages, {
    chatId
  })

  return convexMessages || []

  // return db
  //   .select()
  //   .from(messages)
  //   .where(eq(messages.chatId, chatId))
  //   .orderBy(messages.createdAt)
}

// Delete all messages created at or after the given timestamp in the same chat.
// This will include the message whose createdAt matches the timestamp.
//CONVERTED TO CONVEX
export async function deleteMessagesByChatIdAfterTimestamp(
  chatId: string,
  timestamp: number // Expecting ISO 8601 string
): Promise<{ count: number; error?: string }> {
  const convexMessages = await fetchMutation(
    api.chat.deleteMessagesByChatIdAfterTimestamp,
    {
      chatId,
      timestamp
    }
  )

  return convexMessages || { count: 0 }
  // try {
  //   // Select IDs of messages to delete
  //   const messagesToDelete = await db
  //     .select({ id: messages.id })
  //     .from(messages)
  //     .where(
  //       and(
  //         eq(messages.chatId, chatId),
  //         gte(messages.createdAt, new Date(timestamp)) // Convert string to Date
  //       )
  //     )

  //   const messageIds = messagesToDelete.map(message => message.id)

  //   if (messageIds.length === 0) {
  //     return { count: 0 } // No messages to delete
  //   }

  //   // Delete the actual messages
  //   const result = await db
  //     .delete(messages)
  //     .where(and(eq(messages.chatId, chatId), inArray(messages.id, messageIds)))
  //     .returning({ id: messages.id })

  //   return { count: result.length }
  // } catch (error) {
  //   console.error(
  //     `Error deleting messages for chat ${chatId} at or after ${timestamp}:`,
  //     error
  //   )
  //   return { count: 0, error: 'Failed to delete messages' }
  // }
}

// Clear all chats for a user
// CONVERTED TO CONVEX
export async function clearChats(userId: string) {
  const convexChats = await fetchMutation(api.chat.clearChats, {
    userId
  })

  return convexChats

  // try {
  //   // Get all chat IDs for this user
  //   const userChats = await getChats(userId)

  //   if (!userChats.length) {
  //     return { error: 'No chats to clear' }
  //   }

  //   // Delete all chats for this user
  //   // Message deletion happens automatically due to ON DELETE CASCADE
  //   await db.delete(chats).where(eq(chats.userId, userId))

  //   revalidatePath('/')

  //   return { error: undefined }
  // } catch (error) {
  //   console.error('Error clearing chats:', error)
  //   return { error: 'Failed to clear chats' }
  // }
}

// Save a chat (create or update)
// CONVERTED TO CONVEX
export async function saveChat(chat: Doc<'chats'>, userId: string) {
  const convexChat = await fetchMutation(api.chat.saveChat, {
    chat,
    userId
  })

  return convexChat

  // try {
  //   // Check if the chat exists
  //   const existingChat = await getChat(chat.id, userId)

  //   if (existingChat) {
  //     // Update existing chat
  //     return await db
  //       .update(chats)
  //       .set({
  //         title: chat.title,
  //         visibility: chat.visibility
  //       })
  //       .where(eq(chats.id, chat.id))
  //       .returning()
  //   } else {
  //     // Create new chat
  //     return await db
  //       .insert(chats)
  //       .values({
  //         id: chat.id,
  //         title: chat.title,
  //         userId,
  //         visibility: chat.visibility || 'private'
  //       })
  //       .returning()
  //   }
  // } catch (error) {
  //   console.error('Error saving chat:', error)
  //   throw error
  // }
}

// Get a shared chat
// CONVERTED TO CONVEX
export async function getSharedChat(id: string) {
  const convexChat = await fetchQuery(api.chat.getSharedChat, {
    chatId: id
  })

  return convexChat

  // try {
  //   // For shared chats, we bypass the userId check and directly query the database
  //   const [chat] = await db
  //     .select()
  //     .from(chats)
  //     .where(eq(chats.id, id))
  //     .limit(1)

  //   if (!chat || chat.visibility !== 'public') {
  //     return null
  //   }

  //   return chat
  // } catch (error) {
  //   console.error('Error getting shared chat:', error)
  //   return null
  // }
}

// Share a chat (make it public)
//CONVERTED TO CONVEX
export async function shareChat(id: string, userId: string) {
  const convexChat = await fetchMutation(api.chat.shareChat, {
    chatId: id,
    userId
  })

  if (!convexChat) {
    throw new Error('Failed to share chat')
  }

  return convexChat
  // try {
  //   const chat = await getChat(id, userId)

  //   if (!chat || chat.userId !== userId) {
  //     return null
  //   }

  //   // Update the chat to be public
  //   const [updatedChat] = await db
  //     .update(chats)
  //     .set({
  //       visibility: 'public'
  //     })
  //     .where(eq(chats.id, id))
  //     .returning()

  //   if (updatedChat) {
  //     return {
  //       ...updatedChat,
  //       sharePath: `/share/${id}`
  //     }
  //   }

  //   return null
  // } catch (error) {
  //   console.error('Error sharing chat:', error)
  //   return null
  // }
}
