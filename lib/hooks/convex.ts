import { auth } from '@clerk/nextjs/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import type { FunctionReference, FunctionReturnType } from 'convex/server'

export const fetchMutationWithToken = async <
  Mutation extends FunctionReference<'mutation'>
>(
  mutation: Mutation,
  args: Mutation['_args']
): Promise<FunctionReturnType<Mutation>> => {
  const user = await auth()
  const token = (await user.getToken({ template: 'convex' })) ?? undefined
  return fetchMutation(mutation, args, { token })
}

export const fetchQueryWithToken = async <
  Query extends FunctionReference<'query'>
>(
  query: Query,
  args: Query['_args']
): Promise<FunctionReturnType<Query>> => {
  const user = await auth()
  const token = (await user.getToken({ template: 'convex' })) ?? undefined
  return fetchQuery(query, args, { token })
}
