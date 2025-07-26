import Link from 'next/link'
import { Navigation } from '../components/shared/Navigation'
import { Shield, Users, Clock, Award, CheckCircle, Heart } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen medical-gradient-soft">
      <Navigation />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            {/* Trust Indicators */}
            <div className="flex justify-center items-center space-x-6 mb-8">
              <div className="trust-badge">
                <Shield className="w-3 h-3 mr-1" />
                HIPAA Compliant
              </div>
              <div className="trust-badge">
                <Award className="w-3 h-3 mr-1" />
                Licensed Doctors
              </div>
              <div className="trust-badge">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified Platform
              </div>
            </div>

            <h1 className="heading-primary text-center mb-6">
              Professional Healthcare{' '}
              <span className="text-medical-accent">Made Accessible</span>
            </h1>
            <p className="text-body text-center max-w-4xl mx-auto mb-10">
              Connect with board-certified physicians through our secure platform. 
              Experience quality healthcare with verified doctors, secure consultations, 
              and community-supported affordable care through our trusted agent network.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Link
                href="/register"
                className="btn-primary text-lg"
              >
                <Heart className="w-5 h-5 mr-2" />
                Schedule Consultation
              </Link>
              <Link
                href="/register?role=agent"
                className="btn-secondary text-lg"
              >
                <Users className="w-5 h-5 mr-2" />
                Join as Healthcare Agent
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">1000+</div>
                <div className="text-caption">Successful Consultations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">50+</div>
                <div className="text-caption">Verified Doctors</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">24/7</div>
                <div className="text-caption">Healthcare Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="heading-secondary mb-4">
              Why Choose Our Platform?
            </h2>
            <p className="text-body max-w-2xl mx-auto">
              Experience healthcare excellence with our comprehensive platform designed for patients, doctors, and community health agents.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-medical text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="heading-tertiary mb-4">
                Board-Certified Doctors
              </h3>
              <p className="text-body">
                Connect with licensed, experienced healthcare professionals who are verified and committed to providing quality care.
              </p>
              <div className="trust-indicator mt-4 justify-center">
                <CheckCircle className="w-4 h-4 text-success-600" />
                <span>100% Verified</span>
              </div>
            </div>

            <div className="card-medical text-center">
              <div className="w-16 h-16 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 text-accent-600" />
              </div>
              <h3 className="heading-tertiary mb-4">
                Community Care Network
              </h3>
              <p className="text-body">
                Affordable healthcare through our trusted agent referral system. Local agents help reduce costs while earning commissions.
              </p>
              <div className="trust-indicator mt-4 justify-center">
                <Award className="w-4 h-4 text-accent-600" />
                <span>Community Supported</span>
              </div>
            </div>

            <div className="card-medical text-center">
              <div className="w-16 h-16 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-success-600" />
              </div>
              <h3 className="heading-tertiary mb-4">
                Secure & Compliant
              </h3>
              <p className="text-body">
                Your health data is protected with enterprise-grade security, HIPAA compliance, and encrypted communications.
              </p>
              <div className="trust-indicator mt-4 justify-center">
                <Shield className="w-4 h-4 text-success-600" />
                <span>HIPAA Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="medical-gradient py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Experience Better Healthcare?
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            Join thousands of patients, doctors, and healthcare agents who trust our platform for quality care.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Link
              href="/register?role=patient"
              className="bg-white text-primary-700 font-semibold px-8 py-4 rounded-xl hover:bg-primary-50 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Heart className="w-5 h-5 mx-auto mb-2" />
              For Patients
            </Link>
            <Link
              href="/register?role=agent"
              className="bg-accent-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-accent-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Users className="w-5 h-5 mx-auto mb-2" />
              For Agents
            </Link>
            <Link
              href="/register?role=doctor"
              className="bg-primary-800 text-white font-semibold px-8 py-4 rounded-xl hover:bg-primary-900 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Award className="w-5 h-5 mx-auto mb-2" />
              For Doctors
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}