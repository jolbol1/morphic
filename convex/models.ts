import { Model } from '@/lib/types/models'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import {
  internalAction,
  internalMutation,
  internalQuery,
  query
} from './_generated/server'

export const fetchAndUpdateModels = internalAction({
  args: {},
  handler: async ctx => {
    try {
      const allResponse = await fetch('https://openrouter.ai/api/v1/models')
      if (!allResponse.ok) {
        throw new Error(`Failed to fetch models: ${allResponse.status}`)
      }

      const programmingRankedResponse = await fetch(
        'https://openrouter.ai/api/v1/models?category=programming'
      )
      if (!programmingRankedResponse.ok) {
        throw new Error(
          `Failed to fetch programming ranked models: ${programmingRankedResponse.status}`
        )
      }

      const marketingRankedResponse = await fetch(
        'https://openrouter.ai/api/v1/models?category=marketing'
      )
      if (!marketingRankedResponse.ok) {
        throw new Error(
          `Failed to fetch marketing ranked models: ${marketingRankedResponse.status}`
        )
      }

      const seoRankedResponse = await fetch(
        'https://openrouter.ai/api/v1/models?category=marketing/seo'
      )
      if (!seoRankedResponse.ok) {
        throw new Error(
          `Failed to fetch seo ranked models: ${seoRankedResponse.status}`
        )
      }

      const allData = await allResponse.json()
      const programmingRankedData = await programmingRankedResponse.json()
      const marketingRankedData = await marketingRankedResponse.json()
      const seoRankedData = await seoRankedResponse.json()

      const allModels = allData.data
      const programmingRankedModels = programmingRankedData.data
      const marketingRankedModels = marketingRankedData.data
      const seoRankedModels = seoRankedData.data

      // Delete all existing models before adding new ones
      console.log('Deleting all existing models...')
      await ctx.runMutation(internal.models.deleteAllModels)

      // Create ranking maps for efficient lookup
      const programmingRankingMap = new Map<string, number>()
      programmingRankedModels.forEach((model: any, index: number) => {
        programmingRankingMap.set(model.id, index + 1)
      })

      const marketingRankingMap = new Map<string, number>()
      marketingRankedModels.forEach((model: any, index: number) => {
        marketingRankingMap.set(model.id, index + 1)
      })

      const seoRankingMap = new Map<string, number>()
      seoRankedModels.forEach((model: any, index: number) => {
        seoRankingMap.set(model.id, index + 1)
      })

      // First, collect all models with their calculated base rankings
      const modelsWithRankings = []

      for (const model of allModels) {
        const programmingRank =
          programmingRankingMap.get(model.id) ?? programmingRankingMap.size + 1
        const marketingRank =
          marketingRankingMap.get(model.id) ?? marketingRankingMap.size + 1
        const seoRank = seoRankingMap.get(model.id) ?? seoRankingMap.size + 1

        // Calculate base overall ranking if we have at least one category rank
        // SEO rank is removed because it's not a good indicator of overall quality
        const ranks = [programmingRank, marketingRank].filter(
          rank => rank !== undefined
        ) as number[]

        let baseOverallRank: number | undefined = undefined
        if (ranks.length > 0) {
          baseOverallRank = Math.round(
            ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length
          )
        }

        modelsWithRankings.push({
          model,
          programmingRank,
          marketingRank,
          seoRank,
          baseOverallRank
        })
      }

      // Sort models by base overall rank, then by programming rank for tiebreaking
      modelsWithRankings.sort((a, b) => {
        // Models without overall rank go to the end
        if (a.baseOverallRank === undefined && b.baseOverallRank === undefined)
          return 0
        if (a.baseOverallRank === undefined) return 1
        if (b.baseOverallRank === undefined) return -1

        // Primary sort: base overall rank (lower is better)
        if (a.baseOverallRank !== b.baseOverallRank) {
          return a.baseOverallRank - b.baseOverallRank
        }

        // Tiebreaker 1: programming rank (lower is better, undefined ranks last)
        if (
          a.programmingRank !== undefined &&
          b.programmingRank !== undefined
        ) {
          if (a.programmingRank !== b.programmingRank) {
            return a.programmingRank - b.programmingRank
          }
        } else if (a.programmingRank !== undefined) {
          return -1
        } else if (b.programmingRank !== undefined) {
          return 1
        }

        // Tiebreaker 2: marketing rank (lower is better, undefined ranks last)
        if (a.marketingRank !== undefined && b.marketingRank !== undefined) {
          if (a.marketingRank !== b.marketingRank) {
            return a.marketingRank - b.marketingRank
          }
        } else if (a.marketingRank !== undefined) {
          return -1
        } else if (b.marketingRank !== undefined) {
          return 1
        }

        // Tiebreaker 3: seo rank (lower is better, undefined ranks last)
        if (a.seoRank !== undefined && b.seoRank !== undefined) {
          if (a.seoRank !== b.seoRank) {
            return a.seoRank - b.seoRank
          }
        } else if (a.seoRank !== undefined) {
          return -1
        } else if (b.seoRank !== undefined) {
          return 1
        }

        return 0
      })

      // Assign final unique overall rankings
      for (let i = 0; i < modelsWithRankings.length; i++) {
        const { model, programmingRank, marketingRank, seoRank } =
          modelsWithRankings[i]
        const finalOverallRank =
          modelsWithRankings[i].baseOverallRank !== undefined
            ? i + 1
            : undefined

        await ctx.runMutation(internal.models.insertModel, {
          openrouterId: model.id,
          name: model.name,
          description: model.description || '',
          inputModalities: model.architecture?.input_modalities || [],
          outputModalities: model.architecture?.output_modalities || [],
          pricing: {
            prompt: model.pricing?.prompt || '0',
            completion: model.pricing?.completion || '0',
            image: model.pricing?.image || '0',
            request: model.pricing?.request || '0'
          },
          contextLength: model.context_length,
          supportedParameters: model.supported_parameters || [],
          programmingRanking: programmingRank,
          marketingRanking: marketingRank,
          seoRanking: seoRank,
          overallRanking: finalOverallRank
        })
      }

      return { success: true, count: allModels.length }
    } catch (error) {
      console.error('Error fetching models:', error)
      throw error
    }
  }
})

export const insertModel = internalMutation({
  args: {
    openrouterId: v.string(),
    name: v.string(),
    description: v.string(),
    inputModalities: v.array(v.string()),
    outputModalities: v.array(v.string()),
    pricing: v.object({
      prompt: v.string(),
      completion: v.string(),
      image: v.string(),
      request: v.string()
    }),
    gatewayId: v.optional(v.string()),
    contextLength: v.optional(v.number()),
    supportedParameters: v.array(v.string()),
    programmingRanking: v.optional(v.number()),
    marketingRanking: v.optional(v.number()),
    seoRanking: v.optional(v.number()),
    overallRanking: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('models', {
      openrouterId: args.openrouterId,
      name: args.name,
      gatewayId: args.gatewayId,
      description: args.description,
      inputModalities: args.inputModalities,
      outputModalities: args.outputModalities,
      pricing: args.pricing,
      contextLength: args.contextLength,
      supportedParameters: args.supportedParameters,
      programmingRanking: args.programmingRanking,
      marketingRanking: args.marketingRanking,
      seoRanking: args.seoRanking,
      overallRanking: args.overallRanking,
      lastUpdated: Date.now()
    })
  }
})

export const getAllModels = internalQuery({
  args: {},
  handler: async ctx => {
    return await ctx.db.query('models').collect()
  }
})

export const searchModels = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const allModels = await ctx.db.query('models').collect()

    if (!args.searchTerm) {
      return allModels
    }

    const searchLower = args.searchTerm.toLowerCase()
    return allModels.filter(
      model =>
        model.name.toLowerCase().includes(searchLower) ||
        model.description.toLowerCase().includes(searchLower) ||
        model.openrouterId.toLowerCase().includes(searchLower)
    )
  }
})

export const getModelsForAPI = query({
  handler: async ctx => {
    const models = await ctx.db
      .query('models')
      .withIndex('by_overall_ranking')
      .order('asc')
      .collect()

    const modelsForAPI = models.map(model => ({
      id: model.gatewayId ?? model.openrouterId,
      name: model.name,
      provider: model.openrouterId.split('/')[0],
      providerId: model.gatewayId ? 'gateway' : 'openrouter',
      enabled: true,
      overallRank: model.overallRanking,
      toolCallType: model.supportedParameters.includes('tools')
        ? 'native'
        : 'manual',
      reasoning: model.supportedParameters.includes('reasoning')
    })) as Model[]

    return modelsForAPI
  }
})

export const updateGatewayModels = internalAction({
  args: {},
  handler: async ctx => {
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/vercel/ai/refs/heads/main/packages/gateway/src/gateway-language-model-settings.ts'
      )
      if (!response.ok) {
        throw new Error(`Failed to fetch Gateway types: ${response.status}`)
      }

      const typeContent = await response.text()

      // Extract GatewayModelId type definition
      const gatewayModelIdMatch = typeContent.match(
        /export type GatewayModelId\s*=\s*([\s\S]*?)(?:\s*\|\s*\(string\s*&\s*\{\}\);?|;)/m
      )

      if (!gatewayModelIdMatch) {
        console.error('Could not find GatewayModelId type in fetched content')
        return { success: false, error: 'Type not found' }
      }

      // Extract all string literals from the type
      const stringLiterals = gatewayModelIdMatch[1].match(/'([^']+)'/g)
      if (!stringLiterals) {
        console.error('Could not extract model IDs from type')
        return { success: false, error: 'No model IDs found' }
      }

      const gatewayModelIds = stringLiterals.map(s => s.slice(1, -1)) // Remove quotes
      console.log(`Found ${gatewayModelIds.length} Gateway model IDs`)

      // Gateway ID to OpenRouter ID mapping
      const gatewayToOpenRouterMapping: Record<string, string[]> = {
        // Anthropic Claude mappings
        // Vercel... there has to be a better way to do this...
        'anthropic/claude-4-opus': ['anthropic/claude-opus-4'],
        'anthropic/claude-4-sonnet': ['anthropic/claude-sonnet-4'],
        'anthropic/claude-4.1-opus': ['anthropic/claude-opus-4.1'],

        // Qwen/Alibaba mappings
        'alibaba/qwen-3-14b': ['qwen/qwen3-14b'],
        'alibaba/qwen-3-235b': ['qwen/qwen3-235b-a22b-2507'],
        'alibaba/qwen-3-30b': ['qwen/qwen3-30b-a3b'],
        'alibaba/qwen-3-32b': ['qwen/qwen3-32b'],
        'alibaba/qwen3-coder': ['qwen/qwen3-coder'],

        // Amazon Nova mappings
        'amazon/nova-lite': ['amazon/nova-lite-v1'],
        'amazon/nova-micro': ['amazon/nova-micro-v1'],
        'amazon/nova-pro': ['amazon/nova-pro-v1'],

        // DeepSeek mappings
        'deepseek/deepseek-v3': ['deepseek/deepseek-chat-v3-0324'],

        // Google mappings
        'google/gemini-2.0-flash': ['google/gemini-2.0-flash-001'],
        'google/gemini-2.0-flash-lite': ['google/gemini-2.0-flash-lite-001'],
        'google/gemma-2-9b': ['google/gemma-2-9b-it'],

        // Meta LLaMA mappings
        'meta/llama-3-70b': ['meta-llama/llama-3-70b-instruct'],
        'meta/llama-3-8b': ['meta-llama/llama-3-8b-instruct'],
        'meta/llama-3.1-70b': ['meta-llama/llama-3.1-70b-instruct'],
        'meta/llama-3.1-8b': ['meta-llama/llama-3.1-8b-instruct'],
        'meta/llama-4-maverick': ['meta-llama/llama-4-maverick'],
        'meta/llama-4-scout': ['meta-llama/llama-4-scout']
      }

      // Get all database models
      const dbModels = await ctx.runQuery(internal.models.getAllModels)
      console.log('dbModels', dbModels)
      const dbModelMap = new Map(
        dbModels.map(model => [model.openrouterId, model])
      )

      let matchedCount = 0
      let notFoundInDb = []

      // Reset all gatewayId fields to null first
      for (const dbModel of dbModels) {
        if (dbModel.gatewayId) {
          await ctx.runMutation(internal.models.updateModelGatewayStatus, {
            openrouterId: dbModel.openrouterId,
            gatewayId: undefined
          })
        }
      }

      // Check each gateway model ID against database
      for (const gatewayModelId of gatewayModelIds) {
        let foundMatch = false

        // First try direct match
        let dbModel = dbModelMap.get(gatewayModelId)
        if (dbModel) {
          await ctx.runMutation(internal.models.updateModelGatewayStatus, {
            openrouterId: gatewayModelId,
            gatewayId: gatewayModelId
          })
          matchedCount++
          foundMatch = true
        } else {
          // Try mapped alternatives
          const mappedIds = gatewayToOpenRouterMapping[gatewayModelId] || []
          for (const mappedId of mappedIds) {
            dbModel = dbModelMap.get(mappedId)
            if (dbModel) {
              await ctx.runMutation(internal.models.updateModelGatewayStatus, {
                openrouterId: mappedId,
                gatewayId: gatewayModelId
              })
              matchedCount++
              foundMatch = true
              console.log(`Mapped ${gatewayModelId} -> ${mappedId}`)
              break // Found a match, stop looking
            }
          }
        }

        if (!foundMatch) {
          notFoundInDb.push(gatewayModelId)
        }
      }

      console.log('Gateway model update results:', {
        totalGatewayModels: gatewayModelIds.length,
        matchedInDb: matchedCount,
        notFoundInDb: notFoundInDb.length,
        notFoundList: notFoundInDb.slice(0, 20) // Limit logging
      })
    } catch (error) {
      console.error('Error updating Gateway models:', error)
      throw error
    }
  }
})

export const updateModelGatewayStatus = internalMutation({
  args: {
    openrouterId: v.string(),
    gatewayId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('models')
      .withIndex('by_openrouter_id', q =>
        q.eq('openrouterId', args.openrouterId)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        gatewayId: args.gatewayId,
        lastUpdated: Date.now()
      })
    }
  }
})

export const deleteAllModels = internalMutation({
  args: {},
  handler: async ctx => {
    const allModels = await ctx.db.query('models').collect()

    for (const model of allModels) {
      await ctx.db.delete(model._id)
    }

    console.log(`Deleted ${allModels.length} models from database`)
  }
})
