'use client'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu
} from '@/components/ui/sidebar'

import { api } from '@/convex/_generated/api'
import { Doc } from '@/convex/_generated/dataModel'
import { useUser } from '@clerk/nextjs'
import { usePaginatedQuery } from 'convex/react'
import { useEffect, useRef } from 'react'
import { ChatHistorySkeleton } from './chat-history-skeleton'
import { ChatMenuItem } from './chat-menu-item'
import { ClearHistoryAction } from './clear-history-action'

export function ChatHistoryClient() {
  const { user } = useUser()
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const { results, status, loadMore } = usePaginatedQuery(
    api.chat.getChatsPaginated,
    { userId: user?.id ?? '' },
    { initialNumItems: 2 }
  )

  const isLoading = status === 'LoadingFirstPage' || status === 'LoadingMore'

  useEffect(() => {
    const observerRefValue = loadMoreRef.current
    if (
      !observerRefValue ||
      status === 'Exhausted' ||
      status === 'LoadingFirstPage' ||
      status === 'LoadingMore'
    )
      return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading) {
          loadMore(2)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(observerRefValue)

    return () => {
      if (observerRefValue) {
        observer.unobserve(observerRefValue)
      }
    }
  }, [isLoading, status, loadMore])

  const isHistoryEmpty = status === 'Exhausted' && results.length === 0

  return (
    <div className="flex flex-col flex-1 h-full">
      <SidebarGroup>
        <div className="flex items-center justify-between w-full">
          <SidebarGroupLabel className="p-0">History</SidebarGroupLabel>
          <ClearHistoryAction empty={isHistoryEmpty} />
        </div>
      </SidebarGroup>
      <div className="flex-1 overflow-y-auto mb-2 relative">
        {isHistoryEmpty && (
          <div className="px-2 text-foreground/30 text-sm text-center py-4">
            No search history
          </div>
        )}
        <SidebarMenu>
          {results.map(
            (chat: Doc<'chats'>) =>
              chat && <ChatMenuItem key={chat.chatId} chat={chat} />
          )}
        </SidebarMenu>
        <div ref={loadMoreRef} style={{ height: '1px' }} />
        {status === 'LoadingFirstPage' && (
          <div className="py-2">
            <ChatHistorySkeleton />
          </div>
        )}
      </div>
    </div>
  )
}
