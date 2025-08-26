import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const persistableMessage = v.object({
  id: v.string(),
  chatId: v.optional(v.string())
})

export default defineSchema({
  // User files table - stores user files
  userFiles: defineTable({
    body: v.id('_storage'),
    userId: v.string(),
    chatId: v.string(),
    filename: v.string(),
    url: v.string(),
    mediaType: v.string()
  })
    .index('by_user_id', ['userId'])
    .index('by_chat_id', ['chatId']),

  // Chats table - stores chat sessions
  chats: defineTable({
    title: v.string(),
    userId: v.string(),
    chatId: v.string(),
    visibility: v.union(v.literal('public'), v.literal('private'))
  })
    .index('by_user_id', ['userId'])
    .index('by_chat_id', ['chatId']),

  // Messages table - stores individual messages within chats
  messages: defineTable({
    id: v.string(),
    chatId: v.id('chats'),
    role: v.string()
  }).index('by_chat_id', ['chatId']),

  // Parts table - stores different types of message parts with union type structure
  parts: defineTable(
    v.union(
      // Text parts
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('text'),
        text_text: v.string(),
        providerMetadata: v.optional(v.any())
      }),

      // Reasoning parts
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('reasoning'),
        reasoning_text: v.string(),
        providerMetadata: v.optional(v.any())
      }),

      // File parts
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('file'),
        file_mediaType: v.string(),
        file_filename: v.string(),
        file_url: v.string(),
        providerMetadata: v.optional(v.any())
      }),

      // Source URL parts
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('source-url'),
        source_url_sourceId: v.optional(v.string()),
        source_url_url: v.string(),
        source_url_title: v.optional(v.string()),
        providerMetadata: v.optional(v.any())
      }),

      // Source document parts
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('source-document'),
        source_document_sourceId: v.optional(v.string()),
        source_document_mediaType: v.optional(v.string()),
        source_document_title: v.optional(v.string()),
        source_document_filename: v.optional(v.string()),
        source_document_url: v.optional(v.string()),
        source_document_snippet: v.optional(v.string()),
        providerMetadata: v.optional(v.any())
      }),

      // Tool search parts
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('tool-search'),
        tool_toolCallId: v.string(),
        tool_state: v.union(
          v.literal('input-streaming'),
          v.literal('input-available'),
          v.literal('output-available'),
          v.literal('output-error')
        ),
        tool_errorText: v.optional(v.string()),
        tool_search_input: v.optional(v.any()),
        tool_search_output: v.optional(v.any()),
        providerMetadata: v.optional(v.any())
      }),

      // Tool fetch parts
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('tool-fetch'),
        tool_toolCallId: v.string(),
        tool_state: v.union(
          v.literal('input-streaming'),
          v.literal('input-available'),
          v.literal('output-available'),
          v.literal('output-error')
        ),
        tool_errorText: v.optional(v.string()),
        tool_fetch_input: v.optional(v.any()),
        tool_fetch_output: v.optional(v.any()),
        providerMetadata: v.optional(v.any())
      }),

      // Tool question parts
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('tool-question'),
        tool_toolCallId: v.string(),
        tool_state: v.union(
          v.literal('input-streaming'),
          v.literal('input-available'),
          v.literal('output-available'),
          v.literal('output-error')
        ),
        tool_errorText: v.optional(v.string()),
        tool_question_input: v.optional(v.any()),
        tool_question_output: v.optional(v.any()),
        providerMetadata: v.optional(v.any())
      }),

      // Tool todoWrite parts
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('tool-todoWrite'),
        tool_toolCallId: v.string(),
        tool_state: v.union(
          v.literal('input-streaming'),
          v.literal('input-available'),
          v.literal('output-available'),
          v.literal('output-error')
        ),
        tool_errorText: v.optional(v.string()),
        tool_todoWrite_input: v.optional(v.any()),
        tool_todoWrite_output: v.optional(v.any()),
        providerMetadata: v.optional(v.any())
      }),

      // Tool todoRead parts
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('tool-todoRead'),
        tool_toolCallId: v.string(),
        tool_state: v.union(
          v.literal('input-streaming'),
          v.literal('input-available'),
          v.literal('output-available'),
          v.literal('output-error')
        ),
        tool_errorText: v.optional(v.string()),
        tool_todoRead_input: v.optional(v.any()),
        tool_todoRead_output: v.optional(v.any()),
        providerMetadata: v.optional(v.any())
      }),

      // Dynamic tool parts (for MCP and runtime-defined tools)
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('tool-dynamic'),
        tool_toolCallId: v.string(),
        tool_state: v.union(
          v.literal('input-streaming'),
          v.literal('input-available'),
          v.literal('output-available'),
          v.literal('output-error')
        ),
        tool_errorText: v.optional(v.string()),
        tool_dynamic_input: v.optional(v.any()),
        tool_dynamic_output: v.optional(v.any()),
        tool_dynamic_name: v.string(),
        tool_dynamic_type: v.string(),
        providerMetadata: v.optional(v.any())
      }),

      // Dynamic tool parts (alternative format)
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('dynamic-tool'),
        tool_toolCallId: v.string(),
        tool_state: v.union(
          v.literal('input-streaming'),
          v.literal('input-available'),
          v.literal('output-available'),
          v.literal('output-error')
        ),
        tool_errorText: v.optional(v.string()),
        tool_dynamic_input: v.optional(v.any()),
        tool_dynamic_output: v.optional(v.any()),
        tool_dynamic_name: v.string(),
        tool_dynamic_type: v.string(),
        providerMetadata: v.optional(v.any())
      }),

      // Data parts (generic support)
      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('data'),
        data_prefix: v.optional(v.string()),
        data_content: v.optional(v.any()),
        data_id: v.optional(v.string()),
        providerMetadata: v.optional(v.any())
      }),

      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('step-start')
      }),

      v.object({
        messageId: v.string(),
        order: v.number(),
        type: v.literal('data-relatedQuestions'),
        data_prefix: v.optional(v.string()),
        data_content: v.optional(v.any()),
        data_id: v.optional(v.string()),
        providerMetadata: v.optional(v.any())
      })
    )
  )
    .index('by_message_id', ['messageId'])
    .index('by_message_id_and_order', ['messageId', 'order']),
  models: defineTable({
    openrouterId: v.optional(v.string()),
    name: v.string(),
    description: v.string(),
    inputModalities: v.array(v.string()),
    outputModalities: v.array(v.string()),
    gatewayId: v.optional(v.string()),
    pricing: v.object({
      prompt: v.string(),
      completion: v.string(),
      image: v.string(),
      request: v.string()
    }),
    contextLength: v.optional(v.number()),
    supportedParameters: v.array(v.string()),
    lastUpdated: v.number(),
    programmingRanking: v.optional(v.number()),
    marketingRanking: v.optional(v.number()),
    seoRanking: v.optional(v.number()),
    overallRanking: v.optional(v.number())
  })
    .index('by_openrouter_id', ['openrouterId'])
    .index('by_supported_parameters', ['supportedParameters'])
    .index('by_supported_parameters_openrouter_id', [
      'supportedParameters',
      'openrouterId'
    ])
    .index('by_gateway_id', ['gatewayId'])
    .index('by_supported_parameters_gateway_id', [
      'supportedParameters',
      'gatewayId'
    ])
    .index('by_overall_ranking', ['overallRanking'])
    .index('by_programming_ranking', ['programmingRanking'])
    .index('by_marketing_ranking', ['marketingRanking'])
    .index('by_seo_ranking', ['seoRanking'])
})
