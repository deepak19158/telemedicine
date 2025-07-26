'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardHeader, CardTitle, CardContent } from '../ui'
import { FormField, SelectField, CheckboxField } from './'
import { useForm } from '@/lib/hooks/useForm'
import { userRegistrationSchema, UserRegistration } from '@/lib/validations/forms'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

interface RegistrationFormProps {
  onSuccess?: (data: UserRegistration) => void
}

export function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const form = useForm<UserRegistration>({
    schema: userRegistrationSchema,
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: '',
      role: '' as any,
      termsAccepted: false
    }
  })

  const roleOptions = [
    { value: 'patient', label: 'Patient' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'agent', label: 'Agent' }
  ]

  const handleSubmit = async (data: UserRegistration) => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed')
      }

      if (onSuccess) {
        onSuccess(data)
      } else {
        router.push('/verify-email?email=' + encodeURIComponent(data.email))
      }
    } catch (error) {
      console.error('Registration error:', error)
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Registration failed'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
            </div>
          )}

          <FormField
            label="Full Name"
            placeholder="Enter your full name"
            required
            {...form.register('name')}
            error={form.getFieldError('name')}
          />

          <FormField
            label="Email Address"
            type="email"
            placeholder="Enter your email"
            required
            {...form.register('email')}
            error={form.getFieldError('email')}
          />

          <FormField
            label="Phone Number"
            type="tel"
            placeholder="Enter your phone number"
            required
            {...form.register('phone')}
            error={form.getFieldError('phone')}
          />

          <SelectField
            label="Role"
            required
            options={roleOptions}
            {...form.register('role')}
            error={form.getFieldError('role')}
          />

          <div className="relative">
            <FormField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              required
              {...form.register('password')}
              error={form.getFieldError('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <FormField
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              required
              {...form.register('confirmPassword')}
              error={form.getFieldError('confirmPassword')}
            />
            <button
              type="button"
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <CheckboxField
            label="I accept the Terms and Conditions"
            required
            {...form.register('termsAccepted')}
            error={form.getFieldError('termsAccepted')}
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default RegistrationForm