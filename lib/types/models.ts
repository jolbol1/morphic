export interface Model {
  id: string
  name: string
  provider: string
  providerId: string
  overallRank?: number
  reasoning?: boolean
  toolCallType: 'native' | 'manual' | 'unknown'
  providerOptions?: Record<string, any>
}
