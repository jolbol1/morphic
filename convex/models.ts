import { v } from 'convex/values'
import { internal } from './_generated/api'
import {
  action,
  internalAction,
  internalMutation,
  query
} from './_generated/server'

export const fetchAndUpdateModelsAction = action({
  args: {},
  handler: async ctx => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models')
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`)
      }

      const data = await response.json()
      const models = data.data

      for (const model of models) {
        await ctx.runMutation(internal.models.upsertModel, {
          modelId: model.id,
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
          supportedParameters: model.supported_parameters || []
        })
      }

      return { success: true, count: models.length }
    } catch (error) {
      console.error('Error fetching models:', error)
      throw error
    }
  }
})

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

        await ctx.runMutation(internal.models.upsertModel, {
          modelId: model.id,
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

export const upsertModel = internalMutation({
  args: {
    modelId: v.string(),
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
    contextLength: v.optional(v.number()),
    supportedParameters: v.array(v.string()),
    programmingRanking: v.optional(v.number()),
    marketingRanking: v.optional(v.number()),
    seoRanking: v.optional(v.number()),
    overallRanking: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('models')
      .withIndex('byModelId', q => q.eq('modelId', args.modelId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
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
    } else {
      await ctx.db.insert('models', {
        modelId: args.modelId,
        name: args.name,
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
  }
})

export const getAllModels = query({
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
        model.modelId.toLowerCase().includes(searchLower)
    )
  }
})
