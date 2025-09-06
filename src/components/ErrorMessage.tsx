import React from 'react'
import { Button } from './button'
import { Text, Strong } from './text'

interface ErrorMessageProps {
  message: string
  title?: string
  onDismiss?: () => void
  onRetry?: () => void
}

export function ErrorMessage({ 
  message, 
  title = 'Error', 
  onDismiss, 
  onRetry 
}: ErrorMessageProps) {
  return (
    <div className="rounded-md bg-red-50 p-4 border border-red-200">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <Strong className="text-sm font-medium text-red-800">{title}</Strong>
          <div className="mt-2">
            <Text className="text-sm text-red-700">{message}</Text>
          </div>
          
          {(onDismiss || onRetry) && (
            <div className="mt-4 flex space-x-3">
              {onRetry && (
                <Button color="red" onClick={onRetry} className="text-xs">
                  Try Again
                </Button>
              )}
              {onDismiss && (
                <Button plain onClick={onDismiss} className="text-xs">
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}