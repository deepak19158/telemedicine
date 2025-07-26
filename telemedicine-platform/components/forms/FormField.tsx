'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '../ui'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  required?: boolean
  helperText?: string
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, required, helperText, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <Input
          ref={ref}
          className={cn(
            error && "border-red-300 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
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

FormField.displayName = "FormField"

export { FormField }