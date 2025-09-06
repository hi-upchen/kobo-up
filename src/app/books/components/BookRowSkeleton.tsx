import React from 'react'

interface BookRowSkeletonProps {
  count?: number
}

// Skeleton loading component that matches the CSS Grid layout of BookGridRow
// Used to maintain page height during loading states for scroll restoration
// Provides animated placeholders with same responsive breakpoints as actual book rows
export function BookRowSkeleton({ count = 5 }: BookRowSkeletonProps) {
  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg bg-white dark:bg-zinc-900">
      {/* Header - Desktop */}
      <div className="hidden lg:grid lg:grid-cols-[auto_1fr_120px_120px_80px] gap-4 items-center p-2 md:p-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-center">
          <div className="h-4 w-4 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse"></div>
        </div>
        <div>
          <div className="h-3 w-12 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse"></div>
        </div>
        <div>
          <div className="h-3 w-16 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse"></div>
        </div>
        <div className="text-center">
          <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse mx-auto"></div>
        </div>
        <div className="text-center">
          <div className="h-3 w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
        </div>
      </div>

      {/* Header - Medium */}
      <div className="hidden md:grid md:grid-cols-[auto_1fr_120px_80px] lg:hidden gap-4 items-center p-2 md:p-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-center">
          <div className="h-4 w-4 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse"></div>
        </div>
        <div>
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="text-center">
          <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse mx-auto"></div>
        </div>
        <div className="text-center">
          <div className="h-3 w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
        </div>
      </div>

      {/* Header - Small */}
      <div className="md:hidden grid grid-cols-[auto_1fr_80px] gap-4 items-center p-2 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-center">
          <div className="h-4 w-4 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse"></div>
        </div>
        <div>
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="text-center">
          <div className="h-3 w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
        </div>
      </div>
      
      {/* Skeleton Book Rows */}
      <div>
        {Array.from({ length: count }, (_, index) => (
          <div 
            key={index}
            className="grid 
              grid-cols-[auto_1fr_80px] 
              md:grid-cols-[auto_1fr_120px_80px] 
              lg:grid-cols-[auto_1fr_120px_120px_80px] 
              gap-4 
              items-center 
              p-2 
              md:p-4 
              border-b 
              border-gray-200
              dark:border-zinc-700
              hover:bg-gray-50 
              dark:hover:bg-zinc-800 
              cursor-pointer 
              transition-colors"
          >
            {/* Checkbox */}
            <div className="flex items-center justify-center">
              <div className="h-4 w-4 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse"></div>
            </div>
            
            {/* Book Info - responsive stacking */}
            <div className="flex flex-col space-y-1 min-w-0">
              <div className="h-4 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse w-1/2"></div>
              <div className="h-3 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse w-2/3 lg:hidden"></div>
            </div>
            
            {/* Author - hidden on medium and below */}
            <div className="hidden lg:block min-w-0">
              <div className="h-4 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse w-3/4"></div>
            </div>
            
            {/* Last Read - hidden on small */}
            <div className="hidden md:block">
              <div className="h-4 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse w-16 mx-auto"></div>
            </div>
            
            {/* Notes Count */}
            <div className="flex justify-center">
              <div className="h-6 w-10 bg-gray-200 dark:bg-zinc-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}