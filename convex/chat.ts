import { createId } from '@paralleldrive/cuid2'
import { ToolCallPart, UIMessage } from 'ai'
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { mutation, query, QueryCtx } from './_generated/server'
import { buildUIMessageFromDB, mapUIMessagePartsToDBParts } from './mappings'

import schema from './schema'
import { getUserId } from './utils'

export const createChat = mutation({
  args: v.object({
    title: v.string(),
    chatId: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal('public'), v.literal('private')))
  }),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to create a chat')
    }

    const { title, visibility } = args
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
    chatId: v.string()
  }),
  handler: async (ctx, args) => {
    const { chatId } = args

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

    const userId = await getUserId(ctx)

    if (chat.visibility === 'private' && chat.userId === userId) {
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

export const createChatWithFirstMessage = mutation({
  args: v.object({
    chatId: v.string(),
    title: v.string(),
    message: v.any()
  }),
  handler: async (ctx, args) => {
    const message = args.message as UIMessage
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to create a chat')
    }

    const chatId = args.chatId ?? createId()
    const savedChatId = await ctx.db.insert('chats', {
      title: args.title,
      userId,
      visibility: 'private',
      chatId: chatId
    })

    const messageData = {
      id: message.id || createId(),
      chatId: savedChatId,
      role: args.message.role
    }
    const savedId = await ctx.db.insert('messages', messageData)

    const parts = await ctx.db
      .query('parts')
      .withIndex('by_message_id', q => q.eq('messageId', savedId))
      .collect()

    parts.forEach(part => {
      ctx.db.delete(part._id)
    })

    if (args.message.parts && args.message.parts.length > 0) {
      // 3. Insert new parts
      if (message.parts && message.parts.length > 0) {
        const dbParts = mapUIMessagePartsToDBParts(
          message.parts,
          messageData.id
        )
        if (dbParts.length > 0) {
          await Promise.all(
            dbParts.map((part: any) => {
              return ctx.db.insert('parts', part)
            })
          )
        }
      }
    }

    return
  }
})

export const upsertMessage = mutation({
  args: v.object({
    chatId: v.string(),
    id: v.optional(v.string()),
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

    const userId = await getUserId(ctx)

    if (chat.userId !== userId) {
      throw new Error('You must be logged in to upsert a message')
    }

    const messageData = {
      id: args.id || message.id || createId(),
      chatId: chat._id,
      role: args.message.role
    }

    let messageId = messageData.id

    const existing = await ctx.db
      .query('messages')
      .withIndex('by_message_id', q => q.eq('id', messageId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.message.role
      })

      const parts = await ctx.db
        .query('parts')
        .withIndex('by_message_id', q => q.eq('messageId', messageId))
        .collect()

      parts.forEach(part => {
        ctx.db.delete(part._id)
      })
    } else {
      messageId = await ctx.db.insert('messages', messageData)
    }

    if (args.message.parts && args.message.parts.length > 0) {
      // 3. Insert new parts
      if (message.parts && message.parts.length > 0) {
        const dbParts = mapUIMessagePartsToDBParts(
          message.parts,
          messageData.id
        )
        if (dbParts.length > 0) {
          await Promise.all(
            dbParts.map((part: any) => {
              return ctx.db.insert('parts', part)
            })
          )
        }
      }
    }

    return
  }
})

export const deleteChat = mutation({
  args: v.object({
    chatId: v.string()
  }),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to delete a chat')
    }

    // Could index this by chatId and userId
    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', args.chatId))
      .unique()

    if (!chat) {
      throw new Error('Chat not found')
    }

    if (chat.userId !== userId) {
      throw new Error('You are not authorized to delete this chat')
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat_id', q => q.eq('chatId', chat._id))
      .collect()

    const messageIds = messages.map(message => message.id)

    const parts = await Promise.all(
      messageIds.map(async messageId => {
        return ctx.db
          .query('parts')
          .withIndex('by_message_id', q => q.eq('messageId', messageId))
          .collect()
      })
    )

    const partIds = parts.flatMap(part => part.map(part => part._id))

    await Promise.all(partIds.map(partId => ctx.db.delete(partId)))

    await Promise.all(
      messages.map(message => {
        return ctx.db.delete(message._id)
      })
    )

    console.log('CHAT ID: ', chat._id)

    const files = await ctx.db
      .query('userFiles')
      .withIndex('by_chat_id', q => q.eq('chatId', chat.chatId))
      .collect()

    console.log('FOUND FILES WHILE DELETING : ', files)

    const fileIds = files.map(file => file._id)

    const storageIds = files.map(file => file.body)

    await Promise.all(
      storageIds.map(storageId => ctx.storage.delete(storageId))
    )

    await Promise.all(fileIds.map(fileId => ctx.db.delete(fileId)))

    await ctx.db.delete(chat._id)

    return { success: true }
  }
})

export const getChats = query({
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to view your chats')
    }

    const chats = await ctx.db
      .query('chats')
      .withIndex('by_user_id', q => q.eq('userId', userId))
      .collect()
    return chats
  }
})

export const getChatsPaginated = query({
  args: v.object({
    paginationOpts: paginationOptsValidator
  }),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to view your chats')
    }

    // Collect all chats for the user, ordered by creation time (most recent first)
    const allChats = await ctx.db
      .query('chats')
      .withIndex('by_user_id', q => q.eq('userId', userId))
      .order('desc')
      .paginate(args.paginationOpts)

    return allChats
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
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to update a chat')
    }

    const { chatId, data } = args
    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chatId))
      .unique()

    if (!chat) {
      throw new Error('Chat not found')
    }

    if (chat.userId !== userId) {
      throw new Error('You are not authorized to update this chat')
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
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to add a message')
    }

    const { chatId: chatIdString, id, role, parts } = args

    //TODO: I need to check how I am handling Ids, this seems silly.
    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chatIdString))
      .unique()

    if (!chat) {
      throw new Error('Chat not found')
    }

    if (chat.userId !== userId) {
      throw new Error('You are not authorized to add a message to this chat')
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
    const userId = await getUserId(ctx)
    const { chatId } = args

    // This is getting silly.
    const chat_id = await convertChatIdtoChat_id(ctx, chatId)

    const chat = await ctx.db.get(chat_id)

    if (!chat) {
      throw new Error('Chat not found')
    }

    if (chat.userId !== userId && chat.visibility === 'private') {
      throw new Error('You are not authorized to view this chat')
    }

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
    timestamp: v.number()
  }),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to delete messages')
    }

    const { chatId, timestamp } = args

    const chat_id = await convertChatIdtoChat_id(ctx, chatId)

    const chat = await ctx.db.get(chat_id)

    if (!chat) {
      throw new Error('Chat not found')
    }

    if (chat.userId !== userId) {
      throw new Error(
        'You are not authorized to delete messages from this chat'
      )
    }

    const messagesToDelete = await ctx.db
      .query('messages')
      .withIndex('by_chat_id', q => q.eq('chatId', chat_id))
      .filter(q => q.gte(q.field('_creationTime'), timestamp))
      .collect()

    if (messagesToDelete.length === 0) {
      return { count: 0 }
    }

    const partsToDelete = await Promise.all(
      messagesToDelete.map(message => {
        return ctx.db
          .query('parts')
          .withIndex('by_message_id', q => q.eq('messageId', message.id))
          .collect()
      })
    )

    const partIds = partsToDelete.flatMap(part => part.map(part => part._id))

    await Promise.all(partIds.map(partId => ctx.db.delete(partId)))

    await Promise.all(
      messagesToDelete.map(message => {
        return ctx.db.delete(message._id)
      })
    )

    return { count: messagesToDelete.length }
  }
})

export const clearChats = mutation({
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to clear chats')
    }

    const userChats = await ctx.db
      .query('chats')
      .withIndex('by_user_id', q => q.eq('userId', userId))
      .collect()

    if (!userChats.length) {
      return { error: 'No chats to clear' }
    }

    const messagesToDelete = await Promise.all(
      userChats.map(chat => {
        return ctx.db
          .query('messages')
          .withIndex('by_chat_id', q => q.eq('chatId', chat._id))
          .collect()
      })
    )

    const messageRealIds = messagesToDelete.flatMap(message =>
      message.map(message => message._id)
    )

    const messageIds = messagesToDelete.flatMap(message =>
      message.map(message => message.id)
    )

    const partsToDelete = await Promise.all(
      messageIds.map(messageId => {
        return ctx.db
          .query('parts')
          .withIndex('by_message_id', q => q.eq('messageId', messageId))
          .collect()
      })
    )

    const partIds = partsToDelete.flatMap(part => part.map(part => part._id))

    const fileIds = await ctx.db
      .query('userFiles')
      .withIndex('by_user_id', q => q.eq('userId', userId))
      .collect()

    const storageIds = fileIds.map(file => file.body)

    await Promise.all(
      storageIds.map(storageId => ctx.storage.delete(storageId))
    )

    await Promise.all(fileIds.map(fileId => ctx.db.delete(fileId._id)))

    await Promise.all(partIds.map(partId => ctx.db.delete(partId)))

    await Promise.all(messageRealIds.map(messageId => ctx.db.delete(messageId)))

    await Promise.all(userChats.map(chat => ctx.db.delete(chat._id)))

    return { success: true }
  }
})

export const saveChat = mutation({
  args: v.object({
    chat: schema.tables.chats.validator
  }),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to save a chat')
    }

    const { chat } = args

    const existingChat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chat.chatId))
      .unique()

    if (existingChat?.userId !== userId) {
      throw new Error('You are not authorized to save this chat')
    }

    if (existingChat) {
      await ctx.db.patch(existingChat._id, {
        title: chat.title,
        visibility: chat.visibility
      })
      return await ctx.db.get(existingChat._id)
    } else {
      const chatId = await ctx.db.insert('chats', {
        ...chat,
        userId
      })
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
    chatId: v.string()
  }),
  handler: async (ctx, args) => {
    const { chatId } = args

    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to share a chat')
    }

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

    if (!updatedChat) {
      throw new Error('Failed to share chat')
    }

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
    const userId = await getUserId(ctx)

    const realChatId = await convertChatIdtoChat_id(ctx, args.chatId)

    const chat = await ctx.db.get(realChatId)

    if (!chat) {
      throw new Error('Chat not found')
    }

    if (chat.visibility === 'private' && chat.userId !== userId) {
      throw new Error('You are not authorized to view this chat')
    }

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

    return messagesWithParts
  }
})

export const loadChatWithMessages = query({
  args: v.object({
    chatId: v.string()
  }),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    const { chatId } = args

    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chatId))
      .unique()

    if (!chat) {
      return null
    }

    if (chat.visibility === 'private' && chat.userId !== userId) {
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
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to delete messages')
    }

    const { chatId, messageId } = args

    const realChatID = await convertChatIdtoChat_id(ctx, chatId)

    const chat = await ctx.db.get(realChatID)

    if (!chat) {
      throw new Error('Chat not found')
    }

    if (chat.userId !== userId) {
      throw new Error(
        'You are not authorized to delete messages from this chat'
      )
    }

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

    const messageRealIds = messagesToDelete.map(m => m._id)
    const messageIds = messagesToDelete.map(m => m.id)

    const partsToDelete = await Promise.all(
      messageIds.map(messageId => {
        return ctx.db
          .query('parts')
          .withIndex('by_message_id', q => q.eq('messageId', messageId))
          .collect()
      })
    )

    const partIds = partsToDelete.flatMap(part => part.map(part => part._id))

    await Promise.all(partIds.map(partId => ctx.db.delete(partId)))

    if (messageRealIds.length > 0) {
      await Promise.all(messageRealIds.map(id => ctx.db.delete(id)))
    }

    return { count: messageRealIds.length }
  }
})

export const deleteMessagesFromIndex = mutation({
  args: v.object({
    chatId: v.string(),
    messageId: v.string()
  }),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to delete messages')
    }

    const { chatId, messageId } = args

    const realChatID = await convertChatIdtoChat_id(ctx, chatId)

    const chat = await ctx.db.get(realChatID)

    if (!chat) {
      throw new Error('Chat not found')
    }

    if (chat.userId !== userId) {
      throw new Error(
        'You are not authorized to delete messages from this chat'
      )
    }

    const allMessages = await ctx.db
      .query('messages')
      .withIndex('by_chat_id', q => q.eq('chatId', realChatID))
      .collect()

    console.log('ALL MESSAGES: ', JSON.stringify(allMessages, null, 2))

    const messageIndex = allMessages.findIndex(m => m.id === messageId)

    if (messageIndex === -1) {
      return { count: 0 }
    }

    console.log('MESSAGE INDEX: ', messageIndex)
    // Get messages to delete (from index onwards)
    const messagesToDelete = allMessages.slice(messageIndex)

    console.log(
      'MESSAGES TO DELETE: ',
      JSON.stringify(messagesToDelete, null, 2)
    )
    const messageRealIds = messagesToDelete.map(m => m._id)

    const partsToDelete = await Promise.all(
      messagesToDelete.map(message => {
        return ctx.db
          .query('parts')
          .withIndex('by_message_id', q => q.eq('messageId', message.id))
          .collect()
      })
    )

    const partIds = partsToDelete.flatMap(part => part.map(part => part._id))

    await Promise.all(partIds.map(partId => ctx.db.delete(partId)))

    if (messageRealIds.length > 0) {
      await Promise.all(messageRealIds.map(id => ctx.db.delete(id)))
    }

    return { count: messageRealIds.length }
  }
})

export const updateChatVisibility = mutation({
  args: v.object({
    chatId: v.string(),
    visibility: v.union(v.literal('public'), v.literal('private'))
  }),
  handler: async (ctx, args) => {
    const { chatId, visibility } = args

    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to update chat visibility')
    }

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

    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('You must be logged in to update chat title')
    }

    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id', q => q.eq('chatId', chatId))
      .unique()

    if (!chat || chat.userId !== userId) {
      return null
    }

    await ctx.db.patch(chat._id, {
      title: title
    })

    return await ctx.db.get(chat._id)
  }
})
