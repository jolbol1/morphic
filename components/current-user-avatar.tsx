'use client'

import { User2 } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import { useUser } from '@clerk/nextjs'
import { Skeleton } from './ui/skeleton'

export const CurrentUserAvatar = () => {
  const { user, isLoaded } = useUser()

  if (!isLoaded) return <Skeleton className="size-6 rounded-full" />

  const profileImage = user?.imageUrl
  const name = user?.fullName
  const initials = name
    ?.split(' ')
    ?.map(word => word[0])
    ?.join('')
    ?.toUpperCase()

  return (
    <Avatar className="size-6">
      {profileImage && <AvatarImage src={profileImage} alt={initials} />}
      <AvatarFallback>
        {initials === '?' ? (
          <User2 size={16} className="text-muted-foreground" />
        ) : (
          initials
        )}
      </AvatarFallback>
    </Avatar>
  )
}
