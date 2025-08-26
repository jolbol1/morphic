import { Doc, Id } from '@/convex/_generated/dataModel'
import type { UIMessage } from '@/lib/types/ai'

export interface StreamContext {
  chatId: Id<'chats'>
  modelId: string
  messageId?: string
  trigger?: string
  initialChat: (Doc<'chats'> & { messages: UIMessage[] }) | null
  abortSignal?: AbortSignal
  parentTraceId?: string
  isNewChat?: boolean
}
