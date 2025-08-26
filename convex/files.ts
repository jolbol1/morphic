import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const generateUploadUrl = mutation({
  handler: async ctx => {
    return await ctx.storage.generateUploadUrl()
  }
})

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase()
}

export const storeFile = mutation({
  args: {
    storageId: v.id('_storage'),
    userId: v.optional(v.string()),
    chatId: v.string(),
    filename: v.string(),
    mediaType: v.string()
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new Error('User ID is required')
    }

    const sanitizedFilename = sanitizeFilename(args.filename)

    const url = await ctx.storage.getUrl(args.storageId)

    if (!url) {
      throw new Error('Failed to get URL for storage ID')
    }

    const userFileId = await ctx.db.insert('userFiles', {
      body: args.storageId,
      userId: args.userId,
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
    const file = await ctx.db.get(args.fileId)
    if (!file) {
      throw new Error('File not found')
    }

    await ctx.storage.delete(file.body)
    await ctx.db.delete(args.fileId)

    return true
  }
})
