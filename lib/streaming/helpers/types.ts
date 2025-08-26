export interface StreamContext {
  chatId: string
  modelId: string
  messageId?: string
  trigger?: string
  initialChat: any
  abortSignal?: AbortSignal
}
