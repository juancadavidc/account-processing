'use client'

import { Card, CardContent } from '@/components/ui/card'

interface AuthLoadingStateProps {
  message?: string
}

export function AuthLoadingState({ message = 'Loading...' }: AuthLoadingStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center space-y-4 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}