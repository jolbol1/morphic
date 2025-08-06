import type { UIMessage } from '@/lib/types/ai'
import { DynamicToolPart } from '@/lib/types/dynamic-tools'
import type {
  DBMessagePartSelect,
  ToolState
} from '@/lib/types/message-persistence'
import { createId } from '@paralleldrive/cuid2'
import { Doc } from './_generated/dataModel'

type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never

type DBMessagePart = DistributiveOmit<UIMessagePart, '_id' | '_creationTime'>

// Define local types for message parts that are compatible with the AI SDK
type TextUIPart = { type: 'text'; text: string; providerMetadata?: any }
type ReasoningUIPart = {
  type: 'reasoning'
  text: string
  providerMetadata?: any
}
type FileUIPart = {
  type: 'file'
  mediaType: string
  filename?: string
  url: string
}
type SourceUrlUIPart = {
  type: 'source-url'
  sourceId: string
  url: string
  title: string
} // title is required
type SourceDocumentUIPart = {
  type: 'source-document'
  sourceId: string
  mediaType: string
  title: string
  filename: string
  url: string
  snippet: string
} // all fields required
type ToolCallPart = {
  type: 'tool-call'
  toolCallId: string
  toolName: string
  args: any
}
type ToolResultPart = {
  type: 'tool-result'
  toolCallId: string
  tool_dynamic_name?: string
  tool_dynamic_type?: string
  result: any
  isError?: boolean
}
type DataPart = { type: `data-${string}`; [key: string]: any }

type ToolPart = {
  type: `tool-${string}`
  [key: string]: any
}

type StepPart = {
  type: 'step-start'
  order: number
}

type StepOthers = {
  type: 'step-result' | 'step-continue' | 'step-finish'
  [key: string]: any
}

type DynamicToolPartMine = {
  type: 'dynamic-tool'
  [key: string]: any
}

type UIMessagePart =
  | TextUIPart
  | ReasoningUIPart
  | FileUIPart
  | SourceUrlUIPart
  | SourceDocumentUIPart
  | ToolCallPart
  | ToolResultPart
  | StepPart
  | StepOthers
  | DynamicToolPartMine
  | DataPart // At end
  | ToolPart // at end

// Specific DB part types based on schema
type DBTextPart = {
  messageId: string
  order: number
  type: 'text'
  text_text: string
  providerMetadata?: any
}

type DBReasoningPart = {
  messageId: string
  order: number
  type: 'reasoning'
  reasoning_text: string
  providerMetadata?: any
}

type DBFilePart = {
  messageId: string
  order: number
  type: 'file'
  file_mediaType: string
  file_filename?: string
  file_url: string
  providerMetadata?: any
}

type DBSourceUrlPart = {
  messageId: string
  order: number
  type: 'source-url'
  source_url_sourceId?: string
  source_url_url: string
  source_url_title?: string
  providerMetadata?: any
}

type DBSourceDocumentPart = {
  messageId: string
  order: number
  type: 'source-document'
  source_document_sourceId?: string
  source_document_mediaType?: string
  source_document_title?: string
  source_document_filename?: string
  source_document_url?: string
  source_document_snippet?: string
  providerMetadata?: any
}

type DBToolSearchPart = {
  messageId: string
  order: number
  type: 'tool-search'
  tool_toolCallId: string
  tool_state: ToolState
  tool_errorText?: string
  tool_search_input?: any
  tool_search_output?: any
  providerMetadata?: any
}

type DBToolFetchPart = {
  messageId: string
  order: number
  type: 'tool-fetch'
  tool_toolCallId: string
  tool_state: ToolState
  tool_errorText?: string
  tool_fetch_input?: any
  tool_fetch_output?: any
  providerMetadata?: any
}

type DBToolQuestionPart = {
  messageId: string
  order: number
  type: 'tool-question'
  tool_toolCallId: string
  tool_state: ToolState
  tool_errorText?: string
  tool_question_input?: any
  tool_question_output?: any
  providerMetadata?: any
}

type DBToolTodoWritePart = {
  messageId: string
  order: number
  type: 'tool-todoWrite'
  tool_toolCallId: string
  tool_state: ToolState
  tool_errorText?: string
  tool_todoWrite_input?: any
  tool_todoWrite_output?: any
  providerMetadata?: any
}

type DBToolTodoReadPart = {
  messageId: string
  order: number
  type: 'tool-todoRead'
  tool_toolCallId: string
  tool_state: ToolState
  tool_errorText?: string
  tool_todoRead_input?: any
  tool_todoRead_output?: any
  providerMetadata?: any
}

type DBToolDynamicPart = {
  messageId: string
  order: number
  type: 'tool-dynamic'
  tool_toolCallId: string
  tool_state: ToolState
  tool_errorText?: string
  tool_dynamic_input?: any
  tool_dynamic_output?: any
  tool_dynamic_name: string
  tool_dynamic_type: string
  providerMetadata?: any
}

type DBDynamicToolPart = {
  messageId: string
  order: number
  type: 'dynamic-tool'
  tool_toolCallId: string
  tool_state: ToolState
  tool_errorText?: string
  tool_dynamic_input?: any
  tool_dynamic_output?: any
  tool_dynamic_name: string
  tool_dynamic_type: string
  providerMetadata?: any
}

type DBDataPart = {
  messageId: string
  order: number
  type: 'data'
  data_prefix?: string
  data_content?: any
  data_id?: string
  providerMetadata?: any
}

type DBDataRelatedQuestionsPart = {
  messageId: string
  order: number
  type: 'data-relatedQuestions'
  data_prefix?: string
  data_content?: any
  data_id?: string
  providerMetadata?: any
}

type DBStepStartPart = {
  messageId: string
  order: number
  type: 'step-start'
}

// Union of all possible DB part types
type TypedDBMessagePart = 
  | DBTextPart
  | DBReasoningPart
  | DBFilePart
  | DBSourceUrlPart
  | DBSourceDocumentPart
  | DBToolSearchPart
  | DBToolFetchPart
  | DBToolQuestionPart
  | DBToolTodoWritePart
  | DBToolTodoReadPart
  | DBToolDynamicPart
  | DBDynamicToolPart
  | DBDataPart
  | DBDataRelatedQuestionsPart
  | DBStepStartPart

// Type guards
function isToolCallPart(part: any): part is ToolCallPart {
  return (
    typeof part === 'object' &&
    part !== null &&
    part.type === 'tool-call' &&
    typeof part.toolCallId === 'string' &&
    typeof part.toolName === 'string' &&
    part.args !== undefined
  )
}

function isToolResultPart(part: any): part is ToolResultPart {
  return (
    typeof part === 'object' &&
    part !== null &&
    part.type === 'tool-result' &&
    typeof part.toolCallId === 'string' &&
    part.result !== undefined
  )
}

function isDynamicToolPart(part: any): part is DynamicToolPart {
  return (
    typeof part === 'object' &&
    part !== null &&
    part.type === 'dynamic-tool' &&
    typeof part.toolCallId === 'string' &&
    typeof part.toolName === 'string'
  )
}

// Type for tool-specific parts with extended properties
type ExtendedToolPart = {
  type: string
  toolCallId?: string
  state?: ToolState
  errorText?: string
  input?: any
  output?: any
}

function isExtendedToolPart(part: any): part is ExtendedToolPart {
  return (
    typeof part === 'object' &&
    part !== null &&
    typeof part.type === 'string' &&
    part.type.startsWith('tool-')
  )
}

// Helper function to create tool part mapping
function createToolSearchPartMapping(
  basePart: { messageId: string; order: number },
  part: ExtendedToolPart
): DBToolSearchPart {
  return {
    ...basePart,
    type: 'tool-search',
    tool_toolCallId: part.toolCallId || createId(),
    tool_state: part.state || 'input-available',
    tool_errorText: part.errorText,
    tool_search_input: part.input,
    tool_search_output: part.output
  }
}

function createToolFetchPartMapping(
  basePart: { messageId: string; order: number },
  part: ExtendedToolPart
): DBToolFetchPart {
  return {
    ...basePart,
    type: 'tool-fetch',
    tool_toolCallId: part.toolCallId || createId(),
    tool_state: part.state || 'input-available',
    tool_errorText: part.errorText,
    tool_fetch_input: part.input,
    tool_fetch_output: part.output
  }
}

function createToolQuestionPartMapping(
  basePart: { messageId: string; order: number },
  part: ExtendedToolPart
): DBToolQuestionPart {
  return {
    ...basePart,
    type: 'tool-question',
    tool_toolCallId: part.toolCallId || createId(),
    tool_state: part.state || 'input-available',
    tool_errorText: part.errorText,
    tool_question_input: part.input,
    tool_question_output: part.output
  }
}

function createToolTodoWritePartMapping(
  basePart: { messageId: string; order: number },
  part: ExtendedToolPart
): DBToolTodoWritePart {
  return {
    ...basePart,
    type: 'tool-todoWrite',
    tool_toolCallId: part.toolCallId || createId(),
    tool_state: part.state || 'input-available',
    tool_errorText: part.errorText,
    tool_todoWrite_input: part.input,
    tool_todoWrite_output: part.output
  }
}

function createToolTodoReadPartMapping(
  basePart: { messageId: string; order: number },
  part: ExtendedToolPart
): DBToolTodoReadPart {
  return {
    ...basePart,
    type: 'tool-todoRead',
    tool_toolCallId: part.toolCallId || createId(),
    tool_state: part.state || 'input-available',
    tool_errorText: part.errorText,
    tool_todoRead_input: part.input,
    tool_todoRead_output: part.output
  }
}

/**
 * Convert UI message parts to DB format
 */
export function mapUIMessagePartsToDBParts(
  messageParts: UIMessagePart[],
  messageId: string
): TypedDBMessagePart[] {
  const mappedParts = messageParts.map((part, index): TypedDBMessagePart | null => {
    const basePart = {
      messageId,
      order: index
    }

    switch (part.type) {
      case 'text':
        return {
          ...basePart,
          type: 'text',
          text_text: part.text,
          providerMetadata: part.providerMetadata
        }

      case 'reasoning':
        return {
          ...basePart,
          type: 'reasoning',
          reasoning_text: part.text,
          providerMetadata: part.providerMetadata
        }

      case 'file':
        return {
          ...basePart,
          type: 'file',
          file_mediaType: part.mediaType,
          file_filename: part.filename,
          file_url: part.url
        }

      case 'source-url':
        return {
          ...basePart,
          type: 'source-url',
          source_url_sourceId: part.sourceId,
          source_url_url: part.url,
          source_url_title: part.title
        }

      case 'source-document':
        return {
          ...basePart,
          type: 'source-document',
          source_document_sourceId: part.sourceId,
          source_document_mediaType: part.mediaType,
          source_document_title: part.title,
          source_document_filename: part.filename,
          source_document_url: part.url,
          source_document_snippet: part.snippet
        }

      // Tool parts
      case 'tool-call':
        if (!isToolCallPart(part)) {
          console.error('Invalid tool-call part:', part)
          return null
        }
        const toolName = getToolNameFromType(part.toolName)

        if (toolName === 'search') {
          return {
            ...basePart,
            type: 'tool-search',
            tool_toolCallId: part.toolCallId,
            tool_state: 'input-available',
            tool_search_input: part.args
          }
        } else if (toolName === 'fetch') {
          return {
            ...basePart,
            type: 'tool-fetch',
            tool_toolCallId: part.toolCallId,
            tool_state: 'input-available',
            tool_fetch_input: part.args
          }
        } else if (toolName === 'question') {
          return {
            ...basePart,
            type: 'tool-question',
            tool_toolCallId: part.toolCallId,
            tool_state: 'input-available',
            tool_question_input: part.args
          }
        } else if (toolName === 'todoWrite') {
          return {
            ...basePart,
            type: 'tool-todoWrite',
            tool_toolCallId: part.toolCallId,
            tool_state: 'input-available',
            tool_todoWrite_input: part.args
          }
        } else if (toolName === 'todoRead') {
          return {
            ...basePart,
            type: 'tool-todoRead',
            tool_toolCallId: part.toolCallId,
            tool_state: 'input-available',
            tool_todoRead_input: part.args
          }
        } else if (toolName === 'dynamic') {
          return {
            ...basePart,
            type: 'tool-dynamic',
            tool_toolCallId: part.toolCallId,
            tool_state: 'input-available',
            tool_dynamic_input: part.args,
            tool_dynamic_name: part.toolName,
            tool_dynamic_type: part.toolName.startsWith('mcp__') ? 'mcp' : 'dynamic'
          }
        }

        // Fallback for unknown tools - shouldn't happen with proper type checking
        console.warn('Unknown tool name:', toolName)
        return null

      case 'tool-result':
        const resultToolName = getToolNameFromCallId(part.toolCallId, messageParts)
        const isError = part.isError || false

        if (resultToolName === 'search') {
          return {
            ...basePart,
            type: 'tool-search',
            tool_toolCallId: part.toolCallId,
            tool_state: isError ? 'output-error' : 'output-available',
            tool_errorText: isError ? String(part.result) : undefined,
            tool_search_output: !isError ? part.result : undefined
          }
        } else if (resultToolName === 'fetch') {
          return {
            ...basePart,
            type: 'tool-fetch',
            tool_toolCallId: part.toolCallId,
            tool_state: isError ? 'output-error' : 'output-available',
            tool_errorText: isError ? String(part.result) : undefined,
            tool_fetch_output: !isError ? part.result : undefined
          }
        } else if (resultToolName === 'question') {
          return {
            ...basePart,
            type: 'tool-question',
            tool_toolCallId: part.toolCallId,
            tool_state: isError ? 'output-error' : 'output-available',
            tool_errorText: isError ? String(part.result) : undefined,
            tool_question_output: !isError ? part.result : undefined
          }
        } else if (resultToolName === 'todoWrite') {
          return {
            ...basePart,
            type: 'tool-todoWrite',
            tool_toolCallId: part.toolCallId,
            tool_state: isError ? 'output-error' : 'output-available',
            tool_errorText: isError ? String(part.result) : undefined,
            tool_todoWrite_output: !isError ? part.result : undefined
          }
        } else if (resultToolName === 'todoRead') {
          return {
            ...basePart,
            type: 'tool-todoRead',
            tool_toolCallId: part.toolCallId,
            tool_state: isError ? 'output-error' : 'output-available',
            tool_errorText: isError ? String(part.result) : undefined,
            tool_todoRead_output: !isError ? part.result : undefined
          }
        } else if (resultToolName === 'dynamic') {
          // Preserve dynamic tool metadata from the corresponding tool-call
          const toolCallPart = messageParts.find(
            p => isToolCallPart(p) && p.toolCallId === part.toolCallId
          )

          return {
            ...basePart,
            type: 'tool-dynamic',
            tool_toolCallId: part.toolCallId,
            tool_state: isError ? 'output-error' : 'output-available',
            tool_errorText: isError ? String(part.result) : undefined,
            tool_dynamic_output: !isError ? part.result : undefined,
            tool_dynamic_name: toolCallPart?.toolName || 'unknown',
            tool_dynamic_type: toolCallPart?.toolName.startsWith('mcp__') ? 'mcp' : 'dynamic'
          }
        }

        console.warn('Unknown result tool name:', resultToolName)
        return null

      // Step parts (for UI tracking)
      case 'step-start':
        return {
          ...basePart,
          type: 'step-start'
        }

      case 'step-result':
      case 'step-continue':
      case 'step-finish':
        return null // These are not needed for message structure

      // Dynamic tool parts from AI SDK v5
      case 'dynamic-tool':
        if (!isDynamicToolPart(part)) {
          console.error('Invalid dynamic-tool part:', part)
          return null
        }
        return {
          ...basePart,
          type: 'dynamic-tool',
          tool_toolCallId: part.toolCallId || createId(),
          tool_state: part.state,
          tool_dynamic_name: part.toolName,
          tool_dynamic_type: part.toolName.startsWith('mcp__') ? 'mcp' : 'dynamic',
          tool_dynamic_input: part.input,
          tool_dynamic_output: part.state === 'output-available' ? part.output : undefined,
          tool_errorText: part.state === 'output-error' ? part.errorText : undefined
        }

      // Tool-specific parts that are not tool-call or tool-result
      case 'tool-search':
        if (!isExtendedToolPart(part)) {
          console.error('Invalid extended tool part:', part)
          return null
        }
        return createToolSearchPartMapping(basePart, part)

      case 'tool-fetch':
        if (!isExtendedToolPart(part)) {
          console.error('Invalid extended tool part:', part)
          return null
        }
        return createToolFetchPartMapping(basePart, part)

      case 'tool-question':
        if (!isExtendedToolPart(part)) {
          console.error('Invalid extended tool part:', part)
          return null
        }
        return createToolQuestionPartMapping(basePart, part)

      case 'tool-todoWrite':
        if (!isExtendedToolPart(part)) {
          console.error('Invalid extended tool part:', part)
          return null
        }
        return createToolTodoWritePartMapping(basePart, part)

      case 'tool-todoRead':
        if (!isExtendedToolPart(part)) {
          console.error('Invalid extended tool part:', part)
          return null
        }
        return createToolTodoReadPartMapping(basePart, part)

      // Data parts
      default:
        if (part.type.startsWith('data-')) {
          const dataType = part.type.substring(5) // Remove 'data-' prefix
          if (dataType === 'relatedQuestions') {
            return {
              ...basePart,
              type: 'data-relatedQuestions',
              data_prefix: dataType,
              data_content: 'data' in part ? part.data : part,
              data_id: 'id' in part ? part.id : undefined
            }
          }
          return {
            ...basePart,
            type: 'data',
            data_prefix: dataType,
            data_content: 'data' in part ? part.data : part,
            data_id: 'id' in part ? part.id : undefined
          }
        }

        // Unknown part type - store as data
        return {
          ...basePart,
          type: 'data',
          data_prefix: part.type,
          data_content: part
        }
    }
  })

  // Filter out null values and re-index
  return mappedParts
    .filter((part): part is TypedDBMessagePart => part !== null)
    .map((part, index) => ({ ...part, order: index }))
}

// Type-safe DB part accessors
function isDBTextPart(part: Doc<'parts'>): part is Doc<'parts'> & DBTextPart {
  return part.type === 'text'
}

function isDBReasoningPart(part: Doc<'parts'>): part is Doc<'parts'> & DBReasoningPart {
  return part.type === 'reasoning'
}

function isDBFilePart(part: Doc<'parts'>): part is Doc<'parts'> & DBFilePart {
  return part.type === 'file'
}

function isDBSourceUrlPart(part: Doc<'parts'>): part is Doc<'parts'> & DBSourceUrlPart {
  return part.type === 'source-url'
}

function isDBSourceDocumentPart(part: Doc<'parts'>): part is Doc<'parts'> & DBSourceDocumentPart {
  return part.type === 'source-document'
}

function isDBToolSearchPart(part: Doc<'parts'>): part is Doc<'parts'> & DBToolSearchPart {
  return part.type === 'tool-search'
}

function isDBToolFetchPart(part: Doc<'parts'>): part is Doc<'parts'> & DBToolFetchPart {
  return part.type === 'tool-fetch'
}

function isDBToolQuestionPart(part: Doc<'parts'>): part is Doc<'parts'> & DBToolQuestionPart {
  return part.type === 'tool-question'
}

function isDBToolTodoWritePart(part: Doc<'parts'>): part is Doc<'parts'> & DBToolTodoWritePart {
  return part.type === 'tool-todoWrite'
}

function isDBToolTodoReadPart(part: Doc<'parts'>): part is Doc<'parts'> & DBToolTodoReadPart {
  return part.type === 'tool-todoRead'
}

function isDBToolDynamicPart(part: Doc<'parts'>): part is Doc<'parts'> & DBToolDynamicPart {
  return part.type === 'tool-dynamic'
}

function isDBDynamicToolPart(part: Doc<'parts'>): part is Doc<'parts'> & DBDynamicToolPart {
  return part.type === 'dynamic-tool'
}

function isDBStepStartPart(part: Doc<'parts'>): part is Doc<'parts'> & DBStepStartPart {
  return part.type === 'step-start'
}

/**
 * Convert DB message parts to UI format
 */
export function mapDBPartToUIMessagePart(part: Doc<'parts'>): UIMessagePart {
  if (isDBTextPart(part)) {
    return {
      type: 'text',
      text: part.text_text || ''
    }
  }

  if (isDBReasoningPart(part)) {
    return {
      type: 'reasoning',
      text: part.reasoning_text || '',
      providerMetadata: part.providerMetadata
    }
  }

  if (isDBFilePart(part)) {
    return {
      type: 'file',
      mediaType: part.file_mediaType || '',
      filename: part.file_filename || '',
      url: part.file_url || ''
    }
  }

  if (isDBSourceUrlPart(part)) {
    return {
      type: 'source-url',
      sourceId: part.source_url_sourceId || '',
      url: part.source_url_url || '',
      title: part.source_url_title || ''
    }
  }

  if (isDBSourceDocumentPart(part)) {
    return {
      type: 'source-document',
      sourceId: part.source_document_sourceId || '',
      mediaType: part.source_document_mediaType || '',
      title: part.source_document_title || '',
      filename: part.source_document_filename || '',
      url: part.source_document_url || '',
      snippet: part.source_document_snippet || ''
    }
  }

  if (isDBStepStartPart(part)) {
    return {
      type: 'step-start',
      order: part.order
    }
  }

  // Handle tool parts
  if (isDBToolSearchPart(part)) {
    if (!part.tool_state) {
      throw new Error('tool_state is undefined for search')
    }

    switch (part.tool_state) {
      case 'input-streaming':
        return {
          type: 'tool-search',
          state: 'input-streaming',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_search_input
        }
      case 'input-available':
        return {
          type: 'tool-search',
          state: 'input-available',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_search_input
        }
      case 'output-available':
        return {
          type: 'tool-search',
          state: 'output-available',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_search_input,
          output: part.tool_search_output
        }
      case 'output-error':
        return {
          type: 'tool-search',
          state: 'output-error',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_search_input,
          errorText: part.tool_errorText || 'Unknown error'
        }
      default:
        throw new Error(`Unknown tool state: ${part.tool_state}`)
    }
  }

  if (isDBToolFetchPart(part)) {
    if (!part.tool_state) {
      throw new Error('tool_state is undefined for fetch')
    }

    switch (part.tool_state) {
      case 'input-streaming':
        return {
          type: 'tool-fetch',
          state: 'input-streaming',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_fetch_input
        }
      case 'input-available':
        return {
          type: 'tool-fetch',
          state: 'input-available',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_fetch_input
        }
      case 'output-available':
        return {
          type: 'tool-fetch',
          state: 'output-available',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_fetch_input,
          output: part.tool_fetch_output
        }
      case 'output-error':
        return {
          type: 'tool-fetch',
          state: 'output-error',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_fetch_input,
          errorText: part.tool_errorText || 'Unknown error'
        }
      default:
        throw new Error(`Unknown tool state: ${part.tool_state}`)
    }
  }

  if (isDBToolQuestionPart(part)) {
    if (!part.tool_state) {
      throw new Error('tool_state is undefined for question')
    }

    switch (part.tool_state) {
      case 'input-streaming':
        return {
          type: 'tool-question',
          state: 'input-streaming',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_question_input
        }
      case 'input-available':
        return {
          type: 'tool-question',
          state: 'input-available',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_question_input
        }
      case 'output-available':
        return {
          type: 'tool-question',
          state: 'output-available',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_question_input,
          output: part.tool_question_output
        }
      case 'output-error':
        return {
          type: 'tool-question',
          state: 'output-error',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_question_input,
          errorText: part.tool_errorText || 'Unknown error'
        }
      default:
        throw new Error(`Unknown tool state: ${part.tool_state}`)
    }
  }

  if (isDBToolTodoWritePart(part)) {
    if (!part.tool_state) {
      throw new Error('tool_state is undefined for todoWrite')
    }

    switch (part.tool_state) {
      case 'input-streaming':
        return {
          type: 'tool-todoWrite',
          state: 'input-streaming',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_todoWrite_input
        }
      case 'input-available':
        return {
          type: 'tool-todoWrite',
          state: 'input-available',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_todoWrite_input
        }
      case 'output-available':
        return {
          type: 'tool-todoWrite',
          state: 'output-available',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_todoWrite_input,
          output: part.tool_todoWrite_output
        }
      case 'output-error':
        return {
          type: 'tool-todoWrite',
          state: 'output-error',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_todoWrite_input,
          errorText: part.tool_errorText || 'Unknown error'
        }
      default:
        throw new Error(`Unknown tool state: ${part.tool_state}`)
    }
  }

  if (isDBToolTodoReadPart(part)) {
    if (!part.tool_state) {
      throw new Error('tool_state is undefined for todoRead')
    }

    switch (part.tool_state) {
      case 'input-streaming':
        return {
          type: 'tool-todoRead',
          state: 'input-streaming',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_todoRead_input
        }
      case 'input-available':
        return {
          type: 'tool-todoRead',
          state: 'input-available',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_todoRead_input
        }
      case 'output-available':
        return {
          type: 'tool-todoRead',
          state: 'output-available',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_todoRead_input,
          output: part.tool_todoRead_output
        }
      case 'output-error':
        return {
          type: 'tool-todoRead',
          state: 'output-error',
          toolCallId: part.tool_toolCallId || '',
          input: part.tool_todoRead_input,
          errorText: part.tool_errorText || 'Unknown error'
        }
      default:
        throw new Error(`Unknown tool state: ${part.tool_state}`)
    }
  }

  if (isDBDynamicToolPart(part)) {
    return {
      type: 'dynamic-tool',
      toolCallId: part.tool_toolCallId || '',
      toolName: part.tool_dynamic_name || '',
      state: part.tool_state,
      input: part.tool_dynamic_input,
      output: part.tool_dynamic_output,
      errorText: part.tool_errorText
    }
  }

  if (isDBToolDynamicPart(part)) {
    if (part.tool_state === 'input-available' || part.tool_state === 'input-streaming') {
      return {
        type: 'tool-call',
        toolCallId: part.tool_toolCallId || '',
        toolName: part.tool_dynamic_name || '',
        args: part.tool_dynamic_input
      }
    } else {
      return {
        type: 'tool-result',
        toolCallId: part.tool_toolCallId || '',
        isError: part.tool_state === 'output-error',
        result: part.tool_state === 'output-error' ? part.tool_errorText : part.tool_dynamic_output
      }
    }
  }

  // Handle data parts
  const isDataPart = part.type === 'data' || part.type === 'data-relatedQuestions'
  if (isDataPart && 'data_prefix' in part && part.data_prefix) {
    return {
      type: `data-${part.data_prefix}`,
      data: part.data_content,
      ...(part.data_id ? { id: part.data_id } : {})
    }
  }

  // Fallback - should not happen with proper typing
  throw new Error(`Unknown part type: ${part.type}`)
}

/**
 * Normalize tool name (from tool-call's toolName)
 */
function getToolNameFromType(toolName: string): string {
  // Map original tool names to DB column names
  const toolNameMap: Record<string, string> = {
    search: 'search',
    fetch: 'fetch',
    askQuestion: 'question',
    question: 'question',
    todoWrite: 'todoWrite',
    todoRead: 'todoRead'
  }

  // For dynamic tools (MCP and others)
  if (toolName.startsWith('mcp__') || toolName.startsWith('dynamic__')) {
    return 'dynamic'
  }

  return toolNameMap[toolName] || toolName
}

/**
 * Get tool name from tool-result
 */
function getToolNameFromCallId(
  toolCallId: string,
  allParts: UIMessagePart[]
): string {
  // Find tool-call part with the same toolCallId
  const toolCallPart = allParts.find(
    part => part.type === 'tool-call' && isToolCallPart(part) && part.toolCallId === toolCallId
  )

  if (toolCallPart && isToolCallPart(toolCallPart)) {
    return getToolNameFromType(toolCallPart.toolName)
  }

  // Fallback - should not happen
  return 'unknown'
}

/**
 * Convert DB column name back to original tool name
 */
function getOriginalToolName(dbToolName: string): string {
  const reverseMap: Record<string, string> = {
    search: 'search',
    fetch: 'fetch',
    question: 'askQuestion',
    todoWrite: 'todoWrite',
    todoRead: 'todoRead',
    dynamic: 'dynamic' // For dynamic tools, the actual tool name is stored separately
  }

  return reverseMap[dbToolName] || dbToolName
}

/**
 * Convert UI message to DB message (excluding parts)
 */
export function mapUIMessageToDBMessage(
  message: UIMessage & { id: string; chatId: string }
): {
  id: string
  chatId: string
  role: string
} {
  return {
    id: message.id,
    chatId: message.chatId,
    role: message.role
  }
}

/**
 * Build UI message from DB message and parts
 */
export function buildUIMessageFromDB(
  dbMessage: {
    id: string
    role: string
    createdAt?: Date | string
  },
  dbParts: Doc<'parts'>[]
): UIMessage {
  return {
    id: dbMessage.id,
    role: dbMessage.role as 'user' | 'assistant',
    parts: dbParts.map(mapDBPartToUIMessagePart),
    metadata: dbMessage.createdAt
      ? {
          createdAt:
            dbMessage.createdAt instanceof Date
              ? dbMessage.createdAt
              : new Date(dbMessage.createdAt)
        }
      : undefined
  }
}