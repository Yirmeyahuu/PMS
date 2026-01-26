import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle, Mail, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

interface LocationState {
  email: string;
  emailSent: boolean;
  companyName: string;
}

export const RegisterSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  // Redirect if no state (direct access)
  if (!state || !state.email) {
    return <Navigate to="/register" replace />;
  }

  const { email, emailSent, companyName } = state;

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleResendEmail = async () => {
    // TODO: Implement resend email functionality
    console.log('Resend email to:', email);
    // You can add a toast notification here
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">
              Account Created Successfully!
            </h1>
            <p className="text-xl text-green-50">
              Welcome to MES PMS, {companyName}! 🎉
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-10">
            
            {/* Email Sent Status */}
            {emailSent ? (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-8">
                <div className="flex items-start">
                  <Mail className="w-8 h-8 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Check Your Email Inbox
                    </h3>
                    <p className="text-base text-gray-700 mb-3">
                      We've sent your login credentials to:
                    </p>
                    <div className="bg-white rounded-lg px-4 py-3 border border-blue-200">
                      <p className="text-lg font-semibold text-blue-600">
                        {email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 mb-8">
                <div className="flex items-start">
                  <AlertCircle className="w-8 h-8 text-yellow-600 mt-1 flex-shrink-0" />
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Email Delivery Pending
                    </h3>
                    <p className="text-base text-gray-700 mb-3">
                      Your account was created, but the email is still being sent to:
                    </p>
                    <div className="bg-white rounded-lg px-4 py-3 border border-yellow-200">
                      <p className="text-lg font-semibold text-yellow-600">
                        {email}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      If you don't receive it within a few minutes, check your spam folder or contact support.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">
                📋 Next Steps:
              </h3>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start space-x-4 p-5 bg-gray-50 rounded-xl border border-gray-200 hover:border-sky-300 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-sky-600">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">Check Your Email</h4>
                    <p className="text-sm text-gray-600">
                      Open the welcome email and find your temporary password
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-4 p-5 bg-gray-50 rounded-xl border border-gray-200 hover:border-sky-300 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-sky-600">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">Login to Your Account</h4>
                    <p className="text-sm text-gray-600">
                      Use your email and the temporary password we sent you
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start space-x-4 p-5 bg-gray-50 rounded-xl border border-gray-200 hover:border-sky-300 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-sky-600">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">Change Your Password</h4>
                    <p className="text-sm text-gray-600">
                      For security, please change your password after first login
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start space-x-4 p-5 bg-gray-50 rounded-xl border border-gray-200 hover:border-sky-300 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-sky-600">4</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">Complete Setup</h4>
                    <p className="text-sm text-gray-600">
                      Set up your clinic profile, add staff members, and start managing patients
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-8 p-5 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-bold text-purple-900 mb-1">
                    🔒 Security Reminder
                  </h4>
                  <p className="text-sm text-purple-700">
                    Your temporary password is only valid for 24 hours. Please change it immediately after logging in.
                    Never share your credentials with anyone.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-10 space-y-4">
              <button
                onClick={handleGoToLogin}
                className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl text-lg font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Go to Login Page
                <ArrowRight className="ml-2 w-6 h-6" />
              </button>

              {!emailSent && (
                <button
                  onClick={handleResendEmail}
                  className="w-full flex justify-center items-center py-3 px-6 border-2 border-gray-300 rounded-xl text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  <RefreshCw className="mr-2 w-5 h-5" />
                  Resend Credentials Email
                </button>
              )}
            </div>

            {/* Help Text */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the email?{' '}
                <a href="mailto:support@mespms.com" className="font-semibold text-sky-600 hover:text-sky-700">
                  Contact Support
                </a>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Check your spam/junk folder if you can't find the email in your inbox
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
              <a href="#" className="hover:text-sky-600 font-medium transition-colors">
                Help Center
              </a>
              <span className="text-gray-300">|</span>
              <a href="#" className="hover:text-sky-600 font-medium transition-colors">
                Documentation
              </a>
              <span className="text-gray-300">|</span>
              <a href="mailto:support@mespms.com" className="hover:text-sky-600 font-medium transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};