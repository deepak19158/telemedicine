'use client'

import { useState } from 'react'
import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { 
  Settings, 
  Mail, 
  Shield, 
  DollarSign, 
  Users,
  Bell,
  Database,
  Server,
  Lock,
  Globe,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export default function AdminSettingsPage() {
  const { user, isLoading: authLoading } = useRequireRole('admin')
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  
  // Settings state
  const [generalSettings, setGeneralSettings] = useState({
    platformName: 'MediCare Pro',
    platformDescription: 'Professional Healthcare Platform',
    supportEmail: 'support@medicareplatform.com',
    maxAppointmentsPerDay: 50,
    defaultConsultationFee: 500,
    platformCommissionRate: 10
  })

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: 'noreply@medicareplatform.com',
    fromName: 'MediCare Pro'
  })

  const [paymentSettings, setPaymentSettings] = useState({
    razorpayEnabled: true,
    razorpayKeyId: '',
    razorpayKeySecret: '',
    payuEnabled: false,
    payuMerchantKey: '',
    payuMerchantSalt: '',
    cashPaymentEnabled: true,
    minimumPayment: 100
  })

  const [securitySettings, setSecuritySettings] = useState({
    enableTwoFactorAuth: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requirePasswordChange: 90,
    enableAuditLog: true
  })

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  const handleSave = async (settingsType: string) => {
    setSaving(true)
    setSaveMessage('')
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaveMessage(`${settingsType} settings saved successfully!`)
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      setSaveMessage('Error saving settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const SettingCard = ({ 
    title, 
    description, 
    children 
  }: { 
    title: string
    description: string
    children: React.ReactNode 
  }) => (
    <div className="card-medical">
      <h3 className="heading-tertiary mb-2">{title}</h3>
      <p className="text-caption text-medical-600 mb-4">{description}</p>
      {children}
    </div>
  )

  const InputField = ({ 
    label, 
    value, 
    onChange, 
    type = 'text',
    placeholder = ''
  }: {
    label: string
    value: string | number
    onChange: (value: any) => void
    type?: string
    placeholder?: string
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-medical-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? parseInt(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="input-primary w-full"
      />
    </div>
  )

  const CheckboxField = ({ 
    label, 
    checked, 
    onChange, 
    description 
  }: {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
    description?: string
  }) => (
    <div className="mb-4">
      <label className="flex items-start">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 text-primary-600 border-medical-300 rounded"
        />
        <div className="ml-3">
          <span className="text-sm font-medium text-medical-700">{label}</span>
          {description && (
            <p className="text-xs text-medical-500 mt-1">{description}</p>
          )}
        </div>
      </label>
    </div>
  )

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Platform Settings</h1>
            <p className="text-body">Configure platform settings and preferences.</p>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className={`mb-6 p-4 rounded-lg flex items-center ${
              saveMessage.includes('Error') 
                ? 'bg-error-50 text-error-700' 
                : 'bg-success-50 text-success-700'
            }`}>
              {saveMessage.includes('Error') ? (
                <AlertCircle className="w-5 h-5 mr-2" />
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              {saveMessage}
            </div>
          )}

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-medical-100 p-1 rounded-lg w-fit">
              {[
                { key: 'general', label: 'General', icon: Settings },
                { key: 'email', label: 'Email', icon: Mail },
                { key: 'payments', label: 'Payments', icon: DollarSign },
                { key: 'security', label: 'Security', icon: Shield }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                    activeTab === tab.key
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-medical-600 hover:text-medical-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <SettingCard
                  title="Platform Information"
                  description="Basic platform configuration and branding settings."
                >
                  <InputField
                    label="Platform Name"
                    value={generalSettings.platformName}
                    onChange={(value) => setGeneralSettings(prev => ({ ...prev, platformName: value }))}
                  />
                  <InputField
                    label="Platform Description"
                    value={generalSettings.platformDescription}
                    onChange={(value) => setGeneralSettings(prev => ({ ...prev, platformDescription: value }))}
                  />
                  <InputField
                    label="Support Email"
                    value={generalSettings.supportEmail}
                    onChange={(value) => setGeneralSettings(prev => ({ ...prev, supportEmail: value }))}
                    type="email"
                  />
                </SettingCard>

                <SettingCard
                  title="Appointment Settings"
                  description="Configure appointment limits and default settings."
                >
                  <InputField
                    label="Max Appointments per Day"
                    value={generalSettings.maxAppointmentsPerDay}
                    onChange={(value) => setGeneralSettings(prev => ({ ...prev, maxAppointmentsPerDay: value }))}
                    type="number"
                  />
                  <InputField
                    label="Default Consultation Fee (₹)"
                    value={generalSettings.defaultConsultationFee}
                    onChange={(value) => setGeneralSettings(prev => ({ ...prev, defaultConsultationFee: value }))}
                    type="number"
                  />
                  <InputField
                    label="Platform Commission Rate (%)"
                    value={generalSettings.platformCommissionRate}
                    onChange={(value) => setGeneralSettings(prev => ({ ...prev, platformCommissionRate: value }))}
                    type="number"
                  />
                </SettingCard>

                <button 
                  onClick={() => handleSave('General')}
                  disabled={saving}
                  className="btn-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save General Settings'}
                </button>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-6">
                <SettingCard
                  title="SMTP Configuration"
                  description="Configure email server settings for sending notifications."
                >
                  <InputField
                    label="SMTP Host"
                    value={emailSettings.smtpHost}
                    onChange={(value) => setEmailSettings(prev => ({ ...prev, smtpHost: value }))}
                  />
                  <InputField
                    label="SMTP Port"
                    value={emailSettings.smtpPort}
                    onChange={(value) => setEmailSettings(prev => ({ ...prev, smtpPort: value }))}
                    type="number"
                  />
                  <InputField
                    label="SMTP Username"
                    value={emailSettings.smtpUser}
                    onChange={(value) => setEmailSettings(prev => ({ ...prev, smtpUser: value }))}
                  />
                  <InputField
                    label="SMTP Password"
                    value={emailSettings.smtpPassword}
                    onChange={(value) => setEmailSettings(prev => ({ ...prev, smtpPassword: value }))}
                    type="password"
                  />
                </SettingCard>

                <SettingCard
                  title="Email Sender Settings"
                  description="Configure the sender information for outgoing emails."
                >
                  <InputField
                    label="From Email"
                    value={emailSettings.fromEmail}
                    onChange={(value) => setEmailSettings(prev => ({ ...prev, fromEmail: value }))}
                    type="email"
                  />
                  <InputField
                    label="From Name"
                    value={emailSettings.fromName}
                    onChange={(value) => setEmailSettings(prev => ({ ...prev, fromName: value }))}
                  />
                </SettingCard>

                <button 
                  onClick={() => handleSave('Email')}
                  disabled={saving}
                  className="btn-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </button>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <SettingCard
                  title="Razorpay Configuration"
                  description="Configure Razorpay payment gateway settings."
                >
                  <CheckboxField
                    label="Enable Razorpay"
                    checked={paymentSettings.razorpayEnabled}
                    onChange={(checked) => setPaymentSettings(prev => ({ ...prev, razorpayEnabled: checked }))}
                    description="Allow payments through Razorpay gateway"
                  />
                  {paymentSettings.razorpayEnabled && (
                    <>
                      <InputField
                        label="Razorpay Key ID"
                        value={paymentSettings.razorpayKeyId}
                        onChange={(value) => setPaymentSettings(prev => ({ ...prev, razorpayKeyId: value }))}
                      />
                      <InputField
                        label="Razorpay Key Secret"
                        value={paymentSettings.razorpayKeySecret}
                        onChange={(value) => setPaymentSettings(prev => ({ ...prev, razorpayKeySecret: value }))}
                        type="password"
                      />
                    </>
                  )}
                </SettingCard>

                <SettingCard
                  title="PayU Configuration"
                  description="Configure PayU payment gateway settings."
                >
                  <CheckboxField
                    label="Enable PayU"
                    checked={paymentSettings.payuEnabled}
                    onChange={(checked) => setPaymentSettings(prev => ({ ...prev, payuEnabled: checked }))}
                    description="Allow payments through PayU gateway"
                  />
                  {paymentSettings.payuEnabled && (
                    <>
                      <InputField
                        label="PayU Merchant Key"
                        value={paymentSettings.payuMerchantKey}
                        onChange={(value) => setPaymentSettings(prev => ({ ...prev, payuMerchantKey: value }))}
                      />
                      <InputField
                        label="PayU Merchant Salt"
                        value={paymentSettings.payuMerchantSalt}
                        onChange={(value) => setPaymentSettings(prev => ({ ...prev, payuMerchantSalt: value }))}
                        type="password"
                      />
                    </>
                  )}
                </SettingCard>

                <SettingCard
                  title="General Payment Settings"
                  description="Configure general payment options and limits."
                >
                  <CheckboxField
                    label="Enable Cash Payments via Agents"
                    checked={paymentSettings.cashPaymentEnabled}
                    onChange={(checked) => setPaymentSettings(prev => ({ ...prev, cashPaymentEnabled: checked }))}
                    description="Allow agents to collect cash payments"
                  />
                  <InputField
                    label="Minimum Payment Amount (₹)"
                    value={paymentSettings.minimumPayment}
                    onChange={(value) => setPaymentSettings(prev => ({ ...prev, minimumPayment: value }))}
                    type="number"
                  />
                </SettingCard>

                <button 
                  onClick={() => handleSave('Payment')}
                  disabled={saving}
                  className="btn-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Payment Settings'}
                </button>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <SettingCard
                  title="Authentication Settings"
                  description="Configure user authentication and security policies."
                >
                  <CheckboxField
                    label="Enable Two-Factor Authentication"
                    checked={securitySettings.enableTwoFactorAuth}
                    onChange={(checked) => setSecuritySettings(prev => ({ ...prev, enableTwoFactorAuth: checked }))}
                    description="Require 2FA for admin and doctor accounts"
                  />
                  <InputField
                    label="Session Timeout (minutes)"
                    value={securitySettings.sessionTimeout}
                    onChange={(value) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: value }))}
                    type="number"
                  />
                  <InputField
                    label="Max Login Attempts"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(value) => setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: value }))}
                    type="number"
                  />
                </SettingCard>

                <SettingCard
                  title="Password Policy"
                  description="Configure password requirements and policies."
                >
                  <InputField
                    label="Minimum Password Length"
                    value={securitySettings.passwordMinLength}
                    onChange={(value) => setSecuritySettings(prev => ({ ...prev, passwordMinLength: value }))}
                    type="number"
                  />
                  <InputField
                    label="Require Password Change (days)"
                    value={securitySettings.requirePasswordChange}
                    onChange={(value) => setSecuritySettings(prev => ({ ...prev, requirePasswordChange: value }))}
                    type="number"
                  />
                </SettingCard>

                <SettingCard
                  title="Audit & Logging"
                  description="Configure security logging and audit settings."
                >
                  <CheckboxField
                    label="Enable Audit Logging"
                    checked={securitySettings.enableAuditLog}
                    onChange={(checked) => setSecuritySettings(prev => ({ ...prev, enableAuditLog: checked }))}
                    description="Log all user actions and system events"
                  />
                </SettingCard>

                <button 
                  onClick={() => handleSave('Security')}
                  disabled={saving}
                  className="btn-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Security Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}