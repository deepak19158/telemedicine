'use client'

import { useForm as useHookForm, UseFormProps, FieldValues, Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface UseFormOptions<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  schema: z.ZodSchema<T>
}

export function useForm<T extends FieldValues>({
  schema,
  ...options
}: UseFormOptions<T>) {
  const form = useHookForm<T>({
    resolver: zodResolver(schema),
    ...options
  })

  const getFieldError = (fieldName: Path<T>) => {
    const error = form.formState.errors[fieldName]
    return error?.message as string | undefined
  }

  const isFieldInvalid = (fieldName: Path<T>) => {
    return !!form.formState.errors[fieldName]
  }

  const isFieldTouched = (fieldName: Path<T>) => {
    return !!form.formState.touchedFields[fieldName]
  }

  const isFieldDirty = (fieldName: Path<T>) => {
    return !!form.formState.dirtyFields[fieldName]
  }

  const resetField = (fieldName: Path<T>) => {
    form.resetField(fieldName)
  }

  const setFieldValue = (fieldName: Path<T>, value: any) => {
    form.setValue(fieldName, value, { shouldValidate: true, shouldDirty: true })
  }

  const clearErrors = () => {
    form.clearErrors()
  }

  const validate = async () => {
    return await form.trigger()
  }

  const validateField = async (fieldName: Path<T>) => {
    return await form.trigger(fieldName)
  }

  return {
    ...form,
    getFieldError,
    isFieldInvalid,
    isFieldTouched,
    isFieldDirty,
    resetField,
    setFieldValue,
    clearErrors,
    validate,
    validateField
  }
}

export default useForm