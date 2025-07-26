'use client'

import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Toast, ToastProps } from './Toast'

interface ToastContextType {
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

type ToastAction = 
  | { type: 'ADD_TOAST'; toast: ToastProps }
  | { type: 'REMOVE_TOAST'; id: string }
  | { type: 'CLEAR_TOASTS' }

function toastReducer(state: ToastProps[], action: ToastAction): ToastProps[] {
  switch (action.type) {
    case 'ADD_TOAST':
      return [...state, action.toast]
    case 'REMOVE_TOAST':
      return state.filter(toast => toast.id !== action.id)
    case 'CLEAR_TOASTS':
      return []
    default:
      return state
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, [])

  const addToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    dispatch({
      type: 'ADD_TOAST',
      toast: {
        ...toast,
        id,
        onClose: () => removeToast(id)
      }
    })
  }, [])

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', id })
  }, [])

  const clearToasts = useCallback(() => {
    dispatch({ type: 'CLEAR_TOASTS' })
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts }: { toasts: ToastProps[] }) {
  if (typeof window === 'undefined') return null

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-start sm:justify-end sm:p-6">
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </div>,
    document.body
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastProvider