'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Clock, CheckCircle, AlertCircle, Mail, Phone } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

export default function PendingApprovalPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Redirect if not logged in or not a doctor
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    // If user is approved, redirect to doctor dashboard
    if (session?.user?.isActive && session?.user?.role === 'doctor') {
      router.push('/doctor')
      return
    }

    // If not a doctor, redirect to appropriate dashboard
    if (session?.user?.role && session.user.role !== 'doctor') {
      router.push(`/${session.user.role}`)
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-medical-gradient-soft flex items-center justify-center">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  if (!session?.user || session.user.role !== 'doctor') {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-medical-gradient-soft flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="card-medical text-center">
          <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-warning-600" />
          </div>
          
          <h1 className="heading-primary mb-4">Application Under Review</h1>
          
          <p className="text-body mb-6">
            Thank you for registering as a doctor on our telemedicine platform, 
            <strong> Dr. {session.user.name}</strong>. 
            Your application is currently being reviewed by our admin team.
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-start space-x-3 text-left">
              <CheckCircle className="w-5 h-5 text-success-500 mt-0.5" />
              <div>
                <div className="font-medium text-medical-900">Account Created</div>
                <div className="text-sm text-medical-600">Your doctor account has been successfully created</div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 text-left">
              <Clock className="w-5 h-5 text-warning-500 mt-0.5" />
              <div>
                <div className="font-medium text-medical-900">Verification In Progress</div>
                <div className="text-sm text-medical-600">Our team is reviewing your credentials and license</div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 text-left">
              <AlertCircle className="w-5 h-5 text-medical-400 mt-0.5" />
              <div>
                <div className="font-medium text-medical-900">Approval Pending</div>
                <div className="text-sm text-medical-600">You'll receive access once approved</div>
              </div>
            </div>
          </div>

          <div className="bg-medical-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-medical-900 mb-2">What happens next?</h3>
            <ul className="text-sm text-medical-600 space-y-1">
              <li>• Our admin team will verify your medical license</li>
              <li>• We'll review your specialization and credentials</li>
              <li>• You'll receive an email notification upon approval</li>
              <li>• Processing typically takes 24-48 hours</li>
            </ul>
          </div>

          <div className="border-t border-medical-200 pt-4">
            <h3 className="font-medium text-medical-900 mb-3">Need assistance?</h3>
            <div className="space-y-2">
              <a 
                href="mailto:support@telemedicine.com" 
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                support@telemedicine.com
              </a>
              <br />
              <a 
                href="tel:+1234567890" 
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
              >
                <Phone className="w-4 h-4 mr-2" />
                +1 (234) 567-890
              </a>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-medical-200">
            <Link 
              href="/api/auth/signout"
              className="btn-outline w-full"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}