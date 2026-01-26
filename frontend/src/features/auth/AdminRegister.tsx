import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { 
  validateEmail, 
  validatePhone,
  validateName,
  validateCompanyName,
  sanitizeInput,
  formatPhoneNumber
} from '@/utils/validation';
import { Mail, User, Building2, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import type { AdminRegisterData, AuthError } from '@/types/auth';
import toast from 'react-hot-toast';

export const AdminRegister: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<AdminRegisterData>({
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>('');

  /**
   * Handle input change with sanitization
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Sanitize input
    const sanitized = sanitizeInput(value);
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitized
    }));

    // Clear validation error for this field
    setValidationErrors(prev => ({
      ...prev,
      [name]: ''
    }));
    
    setServerError('');
  };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // First name validation
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    } else if (!validateName(formData.first_name)) {
      errors.first_name = 'Invalid first name format';
    }

    // Last name validation
    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    } else if (!validateName(formData.last_name)) {
      errors.last_name = 'Invalid last name format';
    }

    // Company name validation
    if (!formData.company_name.trim()) {
      errors.company_name = 'Company/Clinic name is required';
    } else if (!validateCompanyName(formData.company_name)) {
      errors.company_name = 'Company name must be 2-255 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Phone validation (optional)
    if (formData.phone && !validatePhone(formData.phone)) {
      errors.phone = 'Invalid phone format. Use 09XXXXXXXXX or +639XXXXXXXXX';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

    /**
     * Handle form submission
     */
    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm() || isLoading) {
        return;
    }

    setIsLoading(true);

    try {
        const response = await authService.registerAdmin(formData);
        
        // Show success message
        if (response.email_sent) {
        toast.success('Account created! Check your email for login credentials.', {
            duration: 5000,
            icon: '📧',
        });
        } else {
        toast.success('Account created! Email delivery pending.', {
            duration: 5000,
        });
        }

        // Redirect to success page WITHOUT storing tokens
        // User must login manually with emailed credentials
        navigate('/register/success', { 
        state: { 
            email: formData.email,
            emailSent: response.email_sent,
            companyName: response.clinic.name
        } 
        });
        
    } catch (error: any) {
        console.error('Registration error:', error);
        
        // Handle specific field errors
        const authError = error as AuthError;
        
        if (authError.email) {
        setValidationErrors(prev => ({ ...prev, email: authError.email![0] }));
        }
        if (authError.phone) {
        setValidationErrors(prev => ({ ...prev, phone: authError.phone![0] }));
        }
        if (authError.first_name) {
        setValidationErrors(prev => ({ ...prev, first_name: authError.first_name![0] }));
        }
        if (authError.last_name) {
        setValidationErrors(prev => ({ ...prev, last_name: authError.last_name![0] }));
        }
        if (authError.company_name) {
        setValidationErrors(prev => ({ ...prev, company_name: authError.company_name![0] }));
        }
        
        // General error
        const errorMessage = 
        authError.detail || 
        authError.non_field_errors?.[0] || 
        'Registration failed. Please try again.';
        
        setServerError(errorMessage);
        toast.error(errorMessage);
        
    } finally {
        setIsLoading(false);
    }
    };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-4xl font-bold text-gray-900">
            Start Your Free Trial
          </h2>
          <p className="mt-3 text-lg text-gray-600">
            Create your admin account and clinic profile
          </p>
          <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span>14-day free trial</span>
            <span>•</span>
            <span>No credit card required</span>
          </div>
        </div>

        {/* Form */}
        <form className="mt-10 space-y-6 bg-white rounded-2xl shadow-xl p-8" onSubmit={handleSubmit}>
          
          {/* Server Error Display */}
          {serverError && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {serverError}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-5">
            
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border ${
                      validationErrors.first_name ? 'border-red-300' : 'border-gray-300'
                    } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-base`}
                    placeholder="Juan"
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.first_name && (
                  <p className="mt-2 text-sm text-red-600">{validationErrors.first_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border ${
                      validationErrors.last_name ? 'border-red-300' : 'border-gray-300'
                    } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-base`}
                    placeholder="Dela Cruz"
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.last_name && (
                  <p className="mt-2 text-sm text-red-600">{validationErrors.last_name}</p>
                )}
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="company_name" className="block text-sm font-semibold text-gray-700 mb-2">
                Company/Clinic Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="company_name"
                  name="company_name"
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    validationErrors.company_name ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-base`}
                  placeholder="My Medical Clinic"
                  disabled={isLoading}
                />
              </div>
              {validationErrors.company_name && (
                <p className="mt-2 text-sm text-red-600">{validationErrors.company_name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    validationErrors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-base`}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>
              {validationErrors.email && (
                <p className="mt-2 text-sm text-red-600">{validationErrors.email}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                📧 Your login credentials will be sent to this email
              </p>
            </div>

            {/* Phone (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    validationErrors.phone ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-base`}
                  placeholder="09XXXXXXXXX"
                  disabled={isLoading}
                />
              </div>
              {validationErrors.phone && (
                <p className="mt-2 text-sm text-red-600">{validationErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl text-lg font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <CheckCircle className="ml-2 w-6 h-6" />
                </>
              )}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-sky-600 hover:text-sky-700 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Terms Notice */}
          <p className="text-xs text-center text-gray-500 pt-4 border-t border-gray-200">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-sky-600 hover:text-sky-700 font-medium">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-sky-600 hover:text-sky-700 font-medium">
              Privacy Policy
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};