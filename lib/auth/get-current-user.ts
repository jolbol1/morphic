import { currentUser } from '@clerk/nextjs/server'

export async function getCurrentUser() {
  return await currentUser()
}

export async function getCurrentUserId() {
  const user = await currentUser()
  return user?.id
}
