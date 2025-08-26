import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { getUserId } from './utils'

export const generateUploadUrl = mutation({
  handler: async ctx => {
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('Must be logged in to generate upload URL')
    }

    return await ctx.storage.generateUploadUrl()
  }
})

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase()
}

export const storeFile = mutation({
  args: {
    storageId: v.id('_storage'),
    chatId: v.string(),
    filename: v.string(),
    mediaType: v.string()
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('Must be logged in to store file')
    }

    const sanitizedFilename = sanitizeFilename(args.filename)

    const url = await ctx.storage.getUrl(args.storageId)

    if (!url) {
      throw new Error('Failed to get URL for storage ID')
    }

    const userFileId = await ctx.db.insert('userFiles', {
      body: args.storageId,
      userId: userId,
      chatId: args.chatId,
      filename: sanitizedFilename,
      url: url,
      mediaType: args.mediaType
    })

    return { userFileId, url }
  }
})

export const removeFile = mutation({
  args: {
    fileId: v.id('userFiles')
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)

    if (!userId) {
      throw new Error('Must be logged in to remove file')
    }

    const file = await ctx.db.get(args.fileId)
    if (!file) {
      throw new Error('File not found')
    }

    if (file.userId !== userId) {
      throw new Error('You are not authorized to remove this file')
    }

    await ctx.storage.delete(file.body)
    await ctx.db.delete(args.fileId)

    return true
  }
})
