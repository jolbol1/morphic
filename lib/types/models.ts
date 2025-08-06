export interface Model {
  id: string
  name: string
  provider: string
  providerId: string
  toolCallType: 'native' | 'manual'
  overallRank?: number
  reasoning?: boolean
}
