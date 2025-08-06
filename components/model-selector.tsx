'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

import {
  Brain,
  Check,
  ChevronsUpDown,
  WrenchIcon,
  XCircleIcon
} from 'lucide-react'

import { Model } from '@/lib/types/models'
import { getCookie, setCookie } from '@/lib/utils/cookies'

import { cn, createModelId } from '../lib/utils'

import { Button } from './ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from './ui/command'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export const providerImages = {
  openrouter: '/providers/logos/openrouter.svg',
  anthropic: '/providers/logos/anthropic.svg',
  'x-ai': '/providers/logos/xai.svg',
  google: '/providers/logos/google.svg',
  openai: '/providers/logos/openai.svg',
  deepseek: '/providers/logos/deepseek.svg',
  qwen: '/providers/logos/qwen.svg',
  kimi: '/providers/logos/kimi.png',
  gateway: '/providers/logos/gateway.svg'
}

function groupModelsByProvider(models: Model[]) {
  return models
    .sort((a, b) => (a.overallRank ?? 0) - (b.overallRank ?? 0))
    .reduce(
      (groups, model) => {
        const provider = model.provider
        if (!groups[provider]) {
          groups[provider] = []
        }
        groups[provider].push(model)
        return groups
      },
      {} as Record<string, Model[]>
    )
}

interface ModelSelectorProps {
  models: Model[]
}

export function ModelSelector({ models }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    const savedModel = getCookie('selectedModel')
    if (savedModel) {
      try {
        const model = JSON.parse(savedModel) as Model
        setValue(createModelId(model))
      } catch (e) {
        console.error('Failed to parse saved model:', e)
      }
    }
  }, [])

  const handleModelSelect = (id: string) => {
    const newValue = id === value ? '' : id
    setValue(newValue)

    const selectedModel = models.find(
      model => createModelId(model) === newValue
    )
    if (selectedModel) {
      setCookie('selectedModel', JSON.stringify(selectedModel))
    } else {
      setCookie('selectedModel', '')
    }

    setOpen(false)
  }

  const selectedModel = models.find(model => createModelId(model) === value)
  const groupedModels = groupModelsByProvider(models)
  const topRankedModels = models
    .sort((a, b) => (a.overallRank ?? 0) - (b.overallRank ?? 0))
    .slice(0, 10)

  const topRankedGroup = ['Top Ranked', topRankedModels] as [string, Model[]]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="text-sm rounded-full shadow-none focus:ring-0"
        >
          {selectedModel ? (
            <div className="flex items-center space-x-1">
              <Image
                src={
                  providerImages[
                    selectedModel.provider as keyof typeof providerImages
                  ] ?? '/providers/logos/openrouter.svg'
                }
                alt={selectedModel.provider}
                width={18}
                height={18}
                className="bg-white rounded-full border"
              />
              <span className="text-xs font-medium">{selectedModel.name}</span>
            </div>
          ) : (
            'Select model'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            {[topRankedGroup, ...Object.entries(groupedModels)].map(
              ([provider, models]) => (
                <CommandGroup key={provider} heading={provider}>
                  {models.map(model => {
                    let modelId = createModelId(model)
                    let modelId2
                    if (
                      topRankedGroup[1].includes(model) &&
                      provider === 'Top Ranked'
                    ) {
                      modelId2 = modelId + '-second'
                    }

                    return (
                      <CommandItem
                        key={modelId2 ?? modelId}
                        value={modelId}
                        onSelect={handleModelSelect}
                        className={cn(
                          'flex justify-between',
                          model.toolCallType !== 'native' && 'opacity-75'
                        )}
                      >
                        <Image
                          src={
                            providerImages[
                              model.provider as keyof typeof providerImages
                            ] ?? '/providers/logos/openrouter.svg'
                          }
                          alt={model.provider}
                          width={18}
                          height={18}
                          className="bg-white rounded-full border"
                        />
                        <div className="flex flex-col gap-1 w-full">
                          <span
                            className={cn(
                              'text-xs font-medium',
                              model.toolCallType !== 'native' &&
                                'text-destructive'
                            )}
                          >
                            {model.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <>
                              {model.reasoning && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div
                                      className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-md text-[var(--color)] dark:text-[var(--color-dark)]"
                                      style={
                                        {
                                          '--color-dark': 'hsl(237 75% 77%)',
                                          '--color': 'hsl(237 55% 57%)'
                                        } as React.CSSProperties
                                      }
                                    >
                                      <div className="absolute inset-0 bg-current opacity-20 dark:opacity-15" />
                                      <Brain className="h-4 w-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Supports Reasoning</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {model.toolCallType === 'native' ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div
                                      className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-md text-[var(--color)] dark:text-[var(--color-dark)]"
                                      style={
                                        {
                                          '--color-dark': 'hsl(168 54% 74%)',
                                          '--color': 'hsl(168 54% 52%)'
                                        } as React.CSSProperties
                                      }
                                    >
                                      <div className="absolute inset-0 bg-current opacity-20 dark:opacity-15" />
                                      <WrenchIcon className="h-4 w-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Supports Tool Calls</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div
                                      className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-md text-[var(--color)] dark:text-[var(--color-dark)]"
                                      style={
                                        {
                                          '--color-dark': 'hsl(0 54% 74%)',
                                          '--color': 'hsl(0 54% 52%)'
                                        } as React.CSSProperties
                                      }
                                    >
                                      <div className="absolute inset-0 bg-current opacity-20 dark:opacity-15" />
                                      <XCircleIcon className="h-4 w-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>
                                      This model cannot make tool calls but you
                                      can still use it for chatting. You can
                                      also use another model for the tool call,
                                      and the results will be in the context
                                      when you chat with it.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              <Tooltip>
                                <TooltipTrigger>
                                  <div
                                    className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-md text-[var(--color)] dark:text-[var(--color-dark)]"
                                    style={
                                      {
                                        '--color-dark': 'hsl(0 0% 100%)',
                                        '--color': 'hsl(0 0% 100%)'
                                      } as React.CSSProperties
                                    }
                                  >
                                    <div className="absolute inset-0 bg-current opacity-80 dark:opacity-75" />
                                    <Image
                                      src={
                                        model.providerId === 'gateway'
                                          ? '/providers/logos/gateway.svg'
                                          : '/providers/logos/openrouter.svg'
                                      }
                                      alt={'Gateway'}
                                      width={18}
                                      height={18}
                                      className="z-10"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Model provided by {model.providerId}</p>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          </div>
                        </div>
                        <Check
                          className={`h-4 w-4 ${
                            value === modelId ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
