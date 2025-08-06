import { Model } from '@/lib/types/models'

import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import defaultModels from './default-models.json'

export function validateModel(model: any): model is Model {
  return (
    typeof model.id === 'string' &&
    typeof model.name === 'string' &&
    typeof model.provider === 'string' &&
    typeof model.providerId === 'string'
  )
}

const getModelsUncached = async function (): Promise<Model[]> {
  try {
    // Construct the models.json URL using the provided baseUrl
    const models = await fetchQuery(api.models.getModelsForAPI)

    if (Array.isArray(models) && models.every(validateModel)) {
      console.log('Successfully loaded models from URL')
      return models
    }
  } catch (error: any) {
    // Fallback to default models if fetch fails
    console.warn(
      'Fetch failed, falling back to default models:',
      error.message || 'Unknown error'
    )

    if (
      Array.isArray(defaultModels.models) &&
      defaultModels.models.every(validateModel)
    ) {
      console.log('Successfully loaded default models')
      return defaultModels.models
    }
  }

  // Last resort: return empty array
  console.warn('All attempts to load models failed, returning empty array')
  return []
}

// Wrapper function that handles the dynamic baseUrl
export async function getModels(): Promise<Model[]> {
  return getModelsUncached()
}
