import { anthropic } from '@ai-sdk/anthropic'
import { createGateway } from '@ai-sdk/gateway'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { xai } from '@ai-sdk/xai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createProviderRegistry, LanguageModel } from 'ai'

export const registry = createProviderRegistry({
  openai,
  anthropic,
  google,
  xai,
  // Add AI Gateway provider
  gateway: createGateway({
    apiKey: process.env.AI_GATEWAY_API_KEY
  }),
  openrouter: {
    ...openai,
    ...createOpenRouter({
      compatibility: 'strict',
      extraBody: {
        reasoning: {
          effort: 'high'
        }
      },
      apiKey: process.env.OPENROUTER_API_KEY
    })
  }
})

export function getModel(model: string): LanguageModel {
  registry.languageModel()
  return registry.languageModel(
    model as Parameters<typeof registry.languageModel>[0]
  )
}

export function isProviderEnabled(providerId: string): boolean {
  switch (providerId) {
    case 'openrouter':
      // Check for openAI here as needed for images and embeddings
      return !!process.env.OPENROUTER_API_KEY && !!process.env.OPENAI_API_KEY
    case 'openai':
      return !!process.env.OPENAI_API_KEY
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY
    case 'google':
      return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    case 'openai-compatible':
      return (
        !!process.env.OPENAI_COMPATIBLE_API_KEY &&
        !!process.env.OPENAI_COMPATIBLE_API_BASE_URL
      )
    case 'gateway':
      return !!process.env.AI_GATEWAY_API_KEY
    default:
      return false
  }
}
