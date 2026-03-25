import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle, Mail, ArrowRight, RefreshCw, AlertCircle, Stethoscope } from 'lucide-react';

interface LocationState {
  email: string;
  emailSent: boolean;
  companyName: string;
}

export const RegisterSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  if (!state || !state.email) {
    return <Navigate to="/register" replace />;
  }

  const { email, emailSent, companyName } = state;

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleResendEmail = async () => {
    console.log('Resend email to:', email);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-600 via-blue-600 to-cyan-500 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        {/* Logo & Brand */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">MES</span>
          </div>
        </div>

        {/* Success Message */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Account Created!
              </h1>
              <p className="text-blue-100">Welcome to MES, {companyName}</p>
            </div>
          </div>
          
          <p className="text-blue-100 text-lg max-w-md">
            Your clinic account has been successfully created. Follow the steps below to get started.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-blue-200 text-sm">
          © 2024 MES - Malasakit EMR Solutions
        </div>
      </div>

      {/* Right Side - Success Details */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">MES</span>
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Account Created Successfully!</h2>
              <p className="mt-2 text-gray-600">Welcome to MES - Malasakit EMR Solutions</p>
            </div>

            {/* Email Status */}
            <div className={`rounded-xl p-4 mb-6 ${emailSent ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-start">
                {emailSent ? (
                  <Mail className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="ml-3 flex-1">
                  <p className={`text-sm font-medium ${emailSent ? 'text-green-800' : 'text-yellow-800'}`}>
                    {emailSent ? 'Credentials sent to:' : 'Account created. Email pending:'}
                  </p>
                  <p className={`text-sm font-semibold mt-1 ${emailSent ? 'text-green-700' : 'text-yellow-700'}`}>
                    {email}
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="space-y-4 mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Next Steps
              </h3>
              
              <div className="space-y-3">
                {[
                  { num: '1', title: 'Check your email', desc: 'Find your temporary password' },
                  { num: '2', title: 'Sign in', desc: 'Use your email and temporary password' },
                  { num: '3', title: 'Change password', desc: 'Update your password for security' },
                  { num: '4', title: 'Set up clinic', desc: 'Complete your clinic profile' }
                ].map((step) => (
                  <div key={step.num} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-sky-600">{step.num}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{step.title}</p>
                      <p className="text-xs text-gray-500">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">Security Reminder</p>
                  <p className="text-xs text-purple-700 mt-1">
                    Change your password immediately after first login. Never share your credentials.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleGoToLogin}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
              >
                Go to Login
                <ArrowRight className="ml-2 w-4 h-4" />
              </button>

              {!emailSent && (
                <button
                  onClick={handleResendEmail}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  <RefreshCw className="mr-2 w-4 h-4" />
                  Resend Email
                </button>
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <a href="mailto:support@mespms.com" className="font-medium text-sky-600 hover:text-sky-700">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
