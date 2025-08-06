export interface Model {
  id: string
  name: string
  provider: string
  providerId: string
  enabled: boolean
  toolCallType: 'native' | 'manual'
  overallRank?: number
  reasoning?: boolean
  toolCallType: 'native' | 'manual'
  overallRank?: number
  reasoning?: boolean
}
