'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CheckboxFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  required?: boolean
  helperText?: string
}

const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ label, error, required, helperText, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <input
            ref={ref}
            type="checkbox"
            className={cn(
              "h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500",
              error && "border-red-300 focus:ring-red-500",
              className
            )}
            {...props}
          />
          <label className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    )
  }
)

CheckboxField.displayName = "CheckboxField"

export { CheckboxField }