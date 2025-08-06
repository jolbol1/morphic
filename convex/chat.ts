import { createId } from '@paralleldrive/cuid2'
import { ToolCallPart, UIMessage } from 'ai'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { mutation, query, QueryCtx } from './_generated/server'
import { buildUIMessageFromDB, mapUIMessagePartsToDBParts } from './mappings'
import schema from './schema'

export const createChat = mutation({
  args: v.object({
    title: v.string(),
    chatId: v.optional(v.string()),
    userId: v.string(),
    visibility: v.optional(v.union(v.literal('public'), v.literal('private')))
  }),
  handler: async (ctx, args) => {
    const { title, userId, visibility } = args
    const chatId = args.chatId ?? createId()
    const id = await ctx.db.insert('chats', {
      title,
      userId,
      visibility: visibility ?? 'private',
      chatId: chatId
    })
    const chat = await ctx.db.get(id)
    return chat
  }
})

export const getChat = query({
  args: v.object({
    chatId: v.string(),
    userId: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    const { chatId, userId } = args
    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chatId))
      .first()

    if (!chat) {
      return null
    }

    // Permission check
    if (chat.visibility === 'public') {
      return chat
    }

    if (chat.visibility === 'private' && userId && chat.userId === userId) {
      return chat
    }

    return null
  }
})

function isToolCallPart(part: any): part is ToolCallPart {
  return (
    part.type === 'tool-call' &&
    typeof part.toolCallId === 'string' &&
    typeof part.toolName === 'string' &&
    part.args !== undefined
  )
}

function getToolNameFromType(toolName: string): string {
  // Map original tool names to DB column names
  const toolNameMap: Record<string, string> = {
    search: 'search',
    fetch: 'fetch',
    askQuestion: 'question',
    question: 'question',
    todoWrite: 'todoWrite',
    todoRead: 'todoRead'
  }

  // For dynamic tools (MCP and others)
  if (toolName.startsWith('mcp__') || toolName.startsWith('dynamic__')) {
    return 'dynamic'
  }

  return toolNameMap[toolName] || toolName
}

export const upsertMessage = mutation({
  args: v.object({
    chatId: v.string(),
    id: v.string(),
    message: v.any()
  }),
  handler: async (ctx, args) => {
    //TODO: Real validation here. But good luck with that...
    const message = args.message as UIMessage
    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', args.chatId))
      .first()

    if (!chat) {
      throw new Error('Chat not found')
    }

    const messageData = {
      id: args.id,
      chatId: chat._id,
      role: args.message.role
    }
    console.log('[UpsertMessage] messageData', messageData)
    const messageId = await ctx.db.insert('messages', messageData)

    const parts = await ctx.db
      .query('parts')
      .withIndex('by_message_id', q => q.eq('messageId', messageId))
      .collect()

    parts.forEach(part => {
      ctx.db.delete(part._id)
    })

    if (args.message.parts && args.message.parts.length > 0) {
      // 3. Insert new parts
      if (message.parts && message.parts.length > 0) {
        const dbParts = mapUIMessagePartsToDBParts(message.parts, args.id)
        if (dbParts.length > 0) {
          await Promise.all(
            dbParts.map((part: any) => {
              console.log('[UpsertMessage] part', part)
              return ctx.db.insert('parts', part)
            })
          )
        }
      }
    }

    return await ctx.db.get(messageId)
  }
})

export const deleteChat = mutation({
  args: v.object({
    chatId: v.string(),
    userId: v.string()
  }),
  handler: async (ctx, args) => {
    // Could index this by chatId and userId
    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', args.chatId))
      .unique()

    if (!chat) {
      throw new Error('Chat not found')
    }

    if (chat.userId !== args.userId) {
      throw new Error('Unauthorized')
    }

    await ctx.db.delete(chat._id)

    return { success: true }
  }
})

export const getChats = query({
  args: v.object({
    userId: v.string()
  }),
  handler: async (ctx, args) => {
    const chats = await ctx.db
      .query('chats')
      .withIndex('by_user_id', q => q.eq('userId', args.userId))
      .collect()
    return chats
  }
})

//TODO: Use pagination from convex. https://docs.convex.dev/database/pagination
export const getChatsPage = query({
  args: v.object({
    userId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number())
  }),
  handler: async (ctx, args) => {
    const { userId, limit = 20, offset = 0 } = args

    // Collect all chats for the user, ordered by creation time (most recent first)
    const allChats = await ctx.db
      .query('chats')
      .withIndex('by_user_id', q => q.eq('userId', userId))
      .order('desc')
      .collect()

    // Manual offset pagination
    const startIndex = offset
    const endIndex = startIndex + limit
    const chats = allChats.slice(startIndex, endIndex)

    const nextOffset = endIndex < allChats.length ? endIndex : null

    return {
      chats,
      nextOffset
    }
  }
})

export const updateChat = mutation({
  args: v.object({
    chatId: v.string(),
    data: v.object({
      title: v.optional(v.string()),
      visibility: v.optional(v.union(v.literal('public'), v.literal('private')))
    })
  }),
  handler: async (ctx, args) => {
    const { chatId, data } = args
    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chatId))
      .unique()

    if (!chat) {
      throw new Error('Chat not found')
    }

    await ctx.db.patch(chat._id, {
      title: data.title,
      visibility: data.visibility
    })

    return await ctx.db.get(chat._id)
  }
})

export const addMessage = mutation({
  args: v.object({
    id: v.optional(v.string()),
    chatId: v.string(),
    role: v.string(),
    parts: v.any()
  }),
  handler: async (ctx, args) => {
    const { chatId: chatIdString, id, role, parts } = args

    //TODO: I need to check how I am handling Ids, this seems silly.
    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chatIdString))
      .unique()

    if (!chat) {
      throw new Error('Chat not found')
    }

    const attachments = Array.isArray(parts)
      ? parts
          .filter(part => part.type === 'file')
          .map(part => ({
            name: part.filename,
            url: part.url,
            contentType: part.mediaType
          }))
      : []

    const valuesToInsert: {
      id: string
      chatId: Id<'chats'>
      role: string
      parts: any
      attachments: any
    } = {
      id: id ?? createId(),
      chatId: chat._id,
      role,
      parts,
      attachments
    }

    console.log('[AddMessage] valuesToInsert', valuesToInsert)
    const messageId = await ctx.db.insert('messages', valuesToInsert)

    return await ctx.db.get(messageId)
  }
})

const convertChatIdtoChat_id = async (ctx: QueryCtx, chatId: string) => {
  const convertChatIdtoChat_id = await ctx.db
    .query('chats')
    .withIndex('by_chat_id', q => q.eq('chatId', chatId))
    .unique()

  if (!convertChatIdtoChat_id) {
    throw Error(`Could not find chat with chatId ${chatId}`)
  }

  return convertChatIdtoChat_id._id
}

export const getChatMessages = query({
  args: v.object({
    chatId: v.string()
  }),
  handler: async (ctx, args) => {
    const { chatId } = args

    // This is getting silly.
    const chat_id = await convertChatIdtoChat_id(ctx, chatId)

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat_id', q => q.eq('chatId', chat_id))
      .collect()
    return messages
  }
})

export const deleteMessagesByChatIdAfterTimestamp = mutation({
  args: v.object({
    chatId: v.string(),
    timestamp: v.string()
  }),
  handler: async (ctx, args) => {
    const { chatId, timestamp } = args
    const chat_id = await convertChatIdtoChat_id(ctx, chatId)

    const timestampToUnixMs = new Date(timestamp).getTime()

    const messagesToDelete = await ctx.db
      .query('messages')
      .withIndex('by_chat_id', q => q.eq('chatId', chat_id))
      .filter(q => q.gte(q.field('_creationTime'), timestampToUnixMs))
      .collect()

    if (messagesToDelete.length === 0) {
      return { count: 0 }
    }

    await Promise.all(
      messagesToDelete.map(message => {
        return ctx.db.delete(message._id)
      })
    )

    return { count: messagesToDelete.length }
  }
})

export const clearChats = mutation({
  args: v.object({
    userId: v.string()
  }),
  handler: async (ctx, args) => {
    const { userId } = args
    const userChats = await ctx.db
      .query('chats')
      .withIndex('by_user_id', q => q.eq('userId', userId))
      .collect()

    if (!userChats.length) {
      return { error: 'No chats to clear' }
    }

    await Promise.all(userChats.map(chat => ctx.db.delete(chat._id)))

    return { success: true }
  }
})

export const saveChat = mutation({
  args: v.object({
    chat: schema.tables.chats.validator,
    userId: v.string()
  }),
  handler: async (ctx, args) => {
    const { chat, userId } = args

    const existingChat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chat.chatId))
      .unique()

    if (existingChat) {
      await ctx.db.patch(existingChat._id, {
        title: chat.title,
        visibility: chat.visibility
      })
      return await ctx.db.get(existingChat._id)
    } else {
      const chatId = await ctx.db.insert('chats', chat)
      return await ctx.db.get(chatId)
    }
  }
})

export const getSharedChat = query({
  args: v.object({
    chatId: v.string()
  }),
  handler: async (ctx, args) => {
    const { chatId } = args

    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chatId))
      .unique()

    if (!chat || chat.visibility !== 'public') {
      return null
    }

    return chat
  }
})

export const shareChat = mutation({
  args: v.object({
    chatId: v.string(),
    userId: v.string()
  }),
  handler: async (ctx, args) => {
    const { chatId, userId } = args

    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chatId))
      .unique()

    if (!chat || chat.userId !== userId) {
      return null
    }

    await ctx.db.patch(chat._id, {
      visibility: 'public'
    })

    const updatedChat = await ctx.db.get(chat._id)

    return {
      ...updatedChat,
      sharePath: `/share/${chatId}`
    }
  }
})

export const loadChat = query({
  args: v.object({
    chatId: v.string()
  }),
  handler: async (ctx, args) => {
    const realChatId = await convertChatIdtoChat_id(ctx, args.chatId)

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat_id', q => q.eq('chatId', realChatId))
      .order('asc')
      .collect()

    const messagesWithParts = await Promise.all(
      messages.map(async message => {
        const parts = await ctx.db
          .query('parts')
          .withIndex('by_message_id', q => q.eq('messageId', message.id))
          .collect()

        const sortedOrderParts = parts.sort((a, b) => a.order - b.order)

        return buildUIMessageFromDB(message, sortedOrderParts)
      })
    )

    console.log('[LoadChat] messagesWithParts', messagesWithParts)
    return messagesWithParts
  }
})

export const loadChatWithMessages = query({
  args: v.object({
    chatId: v.string(),
    userId: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    const { chatId, userId } = args

    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chatId))
      .unique()

    if (!chat) {
      return null
    }

    // Permission check
    if (chat.visibility === 'private' && (!userId || chat.userId !== userId)) {
      return null
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat_id', q => q.eq('chatId', chat._id))
      .order('asc')
      .collect()

    const messagesWithParts = await Promise.all(
      messages.map(async message => {
        const parts = await ctx.db
          .query('parts')
          .withIndex('by_message_id', q => q.eq('messageId', message.id))
          .collect()

        const sortedOrderParts = parts.sort((a, b) => a.order - b.order)

        return buildUIMessageFromDB(message, sortedOrderParts)
      })
    )

    console.log('[LoadChatWithMessages] messagesWithParts', messagesWithParts)
    const result = { ...chat, messages: messagesWithParts }
    return result
  }
})

export const deleteMessagesAfter = mutation({
  args: v.object({
    chatId: v.string(),
    messageId: v.string()
  }),
  handler: async (ctx, args) => {
    const { chatId, messageId } = args

    const realChatID = await convertChatIdtoChat_id(ctx, chatId)

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat_id', q => q.eq('chatId', realChatID))
      .collect()

    const targetMessage = messages.find(m => m.id === messageId)

    if (!targetMessage) {
      return { count: 0 }
    }

    const messagesToDelete = await ctx.db
      .query('messages')
      .withIndex('by_chat_id', q => q.eq('chatId', realChatID))
      .filter(q => q.gte(q.field('_creationTime'), targetMessage._creationTime))
      .collect()

    const messageIds = messagesToDelete.map(m => m._id)

    if (messageIds.length > 0) {
      await Promise.all(messageIds.map(id => ctx.db.delete(id)))
    }

    return { count: messageIds.length }
  }
})

export const deleteMessagesFromIndex = mutation({
  args: v.object({
    chatId: v.string(),
    messageId: v.string()
  }),
  handler: async (ctx, args) => {
    const { chatId, messageId } = args

    const realChatID = await convertChatIdtoChat_id(ctx, chatId)

    const allMessages = await ctx.db
      .query('messages')
      .withIndex('by_chat_id', q => q.eq('chatId', realChatID))
      .collect()

    const messageIndex = allMessages.findIndex(m => m.id === messageId)

    if (messageIndex === -1) {
      return { count: 0 }
    }

    // Get messages to delete (from index onwards)
    const messagesToDelete = allMessages.slice(messageIndex)
    const messageIds = messagesToDelete.map(m => m._id)

    if (messageIds.length > 0) {
      await Promise.all(messageIds.map(id => ctx.db.delete(id)))
    }

    return { count: messageIds.length }
  }
})

export const updateChatVisibility = mutation({
  args: v.object({
    chatId: v.string(),
    userId: v.string(),
    visibility: v.union(v.literal('public'), v.literal('private'))
  }),
  handler: async (ctx, args) => {
    const { chatId, userId, visibility } = args

    const realChatID = await convertChatIdtoChat_id(ctx, chatId)

    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', realChatID))
      .unique()

    if (!chat || chat.userId !== userId) {
      return null
    }

    await ctx.db.patch(chat._id, {
      visibility: visibility
    })

    return await ctx.db.get(chat._id)
  }
})

export const updateChatTitle = mutation({
  args: v.object({
    chatId: v.string(),
    title: v.string()
  }),
  handler: async (ctx, args) => {
    const { chatId, title } = args

    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chatId))
      .unique()

    if (!chat) {
      return null
    }

    await ctx.db.patch(chat._id, {
      title: title
    })

    return await ctx.db.get(chat._id)
  }
})
