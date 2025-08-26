'use client'

import Image from 'next/image'
import React from 'react'

import { Loader2, X } from 'lucide-react'

import { Id } from '@/convex/_generated/dataModel'
import { UploadedFile } from '@/lib/types'

interface UploadedFileListProps {
  files: UploadedFile[]
  onRemove: (fileId: Id<'userFiles'>) => void
}

export const UploadedFileList = React.memo(function UploadedFileList({
  files,
  onRemove
}: UploadedFileListProps) {
  return (
    <div className="w-full flex p-4 max-w-3xl mx-auto">
      <div className="flex gap-6 overflow-x-auto">
        {files.map((file, index) => (
          <UploadedFileItem key={index} file={file} onRemove={onRemove} />
        ))}
      </div>
    </div>
  )
})

interface UploadedFileItemProps {
  file: UploadedFile
  onRemove: (fileId: Id<'userFiles'>) => void
}

export const UploadedFileItem = React.memo(function UploadedFileItem({
  file,
  onRemove
}: UploadedFileItemProps) {
  return (
    <div className="relative w-20 shrink-0 flex flex-col items-center">
      <div className="relative w-20 aspect-7/5 rounded-lg overflow-hidden shadow-sm border bg-muted/20 dark:bg-muted/10">
        {file.file.type.startsWith('image/') ? (
          <Image
            src={URL.createObjectURL(file.file)}
            alt={`file-${file.file.name}`}
            fill
            className="object-cover"
            sizes="112px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-semibold bg-gray-300 dark:bg-gray-700">
            {file.file.name.split('.').pop()?.toUpperCase()}
          </div>
        )}

        {/* Spinner overlay while uploading */}
        {file.id === undefined && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-white" size={20} />
          </div>
        )}

        <button
          type="button"
          disabled={file.id === undefined}
          onClick={() => file.id && onRemove(file.id)}
          className="absolute top-1 right-1 bg-black/40 hover:bg-red-600 text-white rounded-full p-1 z-20"
        >
          <X size={12} />
        </button>
      </div>

      <div className="mt-2 text-xs text-center text-foreground truncate w-full">
        {file.file.name}
      </div>
    </div>
  )
})
