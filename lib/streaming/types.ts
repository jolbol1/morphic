import { UIMessage } from '@ai-sdk/react'

import { Id } from '@/convex/_generated/dataModel'
import { Model } from '../types/models'

export interface BaseStreamConfig {
  message: UIMessage | null
  model: Model
  chatId: Id<'chats'>
  trigger?: 'submit-user-message' | 'regenerate-assistant-message'
  messageId?: string
  abortSignal?: AbortSignal
  isNewChat?: boolean
}
