'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'
import { Button } from './Button'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  type?: 'warning' | 'danger' | 'success' | 'info'
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

const iconMap = {
  warning: AlertTriangle,
  danger: XCircle,
  success: CheckCircle,
  info: Info
}

const iconColorMap = {
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  success: 'text-green-600',
  info: 'text-blue-600'
}

const iconBgMap = {
  warning: 'bg-yellow-100',
  danger: 'bg-red-100',
  success: 'bg-green-100',
  info: 'bg-blue-100'
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false
}: ConfirmationDialogProps) {
  const Icon = iconMap[type]

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 mx-auto rounded-full ${iconBgMap[type]}`}>
                    <Icon className={`w-6 h-6 ${iconColorMap[type]}`} />
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {title}
                  </Dialog.Title>
                  {description && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{description}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1"
                  >
                    {cancelText}
                  </Button>
                  <Button
                    variant={type === 'danger' ? 'destructive' : 'default'}
                    onClick={onConfirm}
                    loading={loading}
                    className="flex-1"
                  >
                    {confirmText}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default ConfirmationDialog