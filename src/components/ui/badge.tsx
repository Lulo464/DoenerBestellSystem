import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200',
    secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    destructive: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
    success: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    warning: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
