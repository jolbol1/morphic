'use client'

// import Link from 'next/link' // No longer needed directly here for Sign In button
import React from 'react'

// import { Button } from './ui/button' // No longer needed directly here for Sign In button
import { useUser } from '@clerk/nextjs'

import { cn } from '@/lib/utils'

import { useSidebar } from '@/components/ui/sidebar'

import GuestMenu from './guest-menu' // Import the new GuestMenu component
import UserMenu from './user-menu'

export const Header: React.FC = () => {
  const { user } = useUser()
  const { open } = useSidebar()
  return (
    <header
      className={cn(
        'absolute top-0 right-0 p-2 flex justify-between items-center z-10 backdrop-blur-sm lg:backdrop-blur-none bg-background/80 lg:bg-transparent transition-[width] duration-200 ease-linear',
        open ? 'md:w-[calc(100%-var(--sidebar-width))]' : 'md:w-full',
        'w-full'
      )}
    >
      {/* This div can be used for a logo or title on the left if needed */}
      <div></div>

      <div className="flex items-center gap-2">
        {user ? <UserMenu /> : <GuestMenu />}
      </div>
    </header>
  )
}

export default Header
