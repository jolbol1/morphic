import { api } from '@/convex/_generated/api'
import { UploadedFile } from '@/lib/types'
import { useUser } from '@clerk/nextjs'
import { useMutation } from 'convex/react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

type UseFileDropzoneProps = {
  uploadedFiles: UploadedFile[]
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  maxFiles?: number
  allowedTypes?: string[]
  chatId: string
}

export function useFileDropzone({
  uploadedFiles,
  setUploadedFiles,
  chatId,
  maxFiles = 3,
  allowedTypes = ['image/png', 'image/jpeg', 'application/pdf']
}: UseFileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const storeFile = useMutation(api.files.storeFile)
  const { user } = useUser()

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const rawFiles = Array.from(e.dataTransfer.files)

      const allowed = rawFiles.filter(file => allowedTypes.includes(file.type))
      const rejected = rawFiles.filter(file => !allowed.includes(file))

      if (rejected.length > 0) {
        toast.error(
          'Some files were not accepted: ' +
            rejected.map(f => f.name).join(', ')
        )
      }

      const total = uploadedFiles.length + allowed.length
      if (total > maxFiles) {
        toast.error(`You can upload a maximum of ${maxFiles} files.`)
        return
      }

      const initialFiles: UploadedFile[] = allowed.map(file => ({
        file
      }))

      setUploadedFiles(prev => [...prev, ...initialFiles].slice(0, maxFiles))

      await Promise.all(
        initialFiles.map(async uf => {
          try {
            const postUrl = await generateUploadUrl()

            const res = await fetch(postUrl, {
              method: 'POST',
              headers: { 'Content-Type': uf.file.type },
              body: uf.file
            })

            if (!res.ok) {
              throw new Error('Upload failed')
            }

            const { storageId } = await res.json()

            const { userFileId, url } = await storeFile({
              storageId,
              userId: user?.id,
              chatId: chatId,
              filename: uf.file.name,
              mediaType: uf.file.type
            })

            if (!userFileId) {
              throw new Error('Failed to store image')
            }

            setUploadedFiles(prev =>
              prev.map(f =>
                f.file === uf.file
                  ? {
                      ...f,
                      id: userFileId,
                      url
                    }
                  : f
              )
            )
          } catch (err) {
            toast.error(`Failed to upload ${uf.file.name}`)
            setUploadedFiles(prev =>
              prev.map(f =>
                f.file === uf.file ? { ...f, status: 'error' } : f
              )
            )
          }
        })
      )
    },
    [
      uploadedFiles.length,
      maxFiles,
      setUploadedFiles,
      allowedTypes,
      generateUploadUrl,
      storeFile,
      user?.id,
      chatId
    ]
  )

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop
  }
}
