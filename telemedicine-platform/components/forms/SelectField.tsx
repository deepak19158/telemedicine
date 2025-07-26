'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  required?: boolean
  helperText?: string
  options: Array<{ value: string; label: string }>
}

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, required, helperText, options, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          ref={ref}
          className={cn(
            "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            error && "border-red-300 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

SelectField.displayName = "SelectField"

export { SelectField }