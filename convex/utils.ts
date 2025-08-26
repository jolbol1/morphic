import { QueryCtx } from './_generated/server'

/**
 * Gets the user ID from the authentication context.
 * @param ctx - The query context containing authentication information
 * @returns The user's token identifier
 * @throws {Error} When the user is not authenticated
 */
export const getUserId = async (ctx: QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    return null
  }

  return identity.id as string
}
