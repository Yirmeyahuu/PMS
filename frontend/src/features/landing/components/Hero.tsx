import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pt-50 lg:pb-32 bg-gradient-to-b from-sky-50 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <h1 className="text-3xl sm:text-3xl md:text-3xl lg:text-3xl xl:text-6xl font-bold text-gray-900 leading-tight">
              Empowering Filipino{' '}
              <span className="text-sky-500">Health Providers</span>
            </h1>
            
            <p className="mt-6 sm:mt-8 text-lg sm:text-xl lg:text-2xl text-gray-600/80 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Streamline your clinic operations with our all-in-one platform. Manage appointments, 
              patient records, and billing effortlessly.
            </p>
            
            {/* Trust Indicators */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-5 sm:gap-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-base sm:text-md text-gray-600 font-medium">HIPAA Compliant</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-base sm:text-md text-gray-600 font-medium">14-Day Free Trial</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-base sm:text-md text-gray-600 font-medium">No Credit Card</span>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start max-w-xl mx-auto lg:mx-0">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-sky-500 rounded-xl hover:bg-sky-600 active:bg-sky-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight className="ml-3 w-6 h-6" />
              </Link>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
              >
                Watch Demo
              </button>
            </div>
          </div>
          
          {/* Right Content - Hero Image/Illustration */}
          <div className="relative order-1 lg:order-2">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80"
                alt="Clinic Management Dashboard"
                className="w-full h-auto object-cover"
                loading="eager"
              />
              
              {/* Overlay Card */}
              <div className="absolute bottom-6 left-6 right-6 bg-white rounded-xl shadow-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Today's Appointments</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">24</p>
                  </div>
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="hidden lg:block absolute -top-10 -right-10 w-40 h-40 bg-sky-100 rounded-full opacity-50 blur-3xl"></div>
            <div className="hidden lg:block absolute -bottom-10 -left-10 w-48 h-48 bg-blue-100 rounded-full opacity-50 blur-3xl"></div>
          </div>
          
        </div>
      </div>
      
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-20 right-0 w-96 h-96 lg:w-[500px] lg:h-[500px] bg-sky-100 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 lg:w-[500px] lg:h-[500px] bg-blue-100 rounded-full opacity-20 blur-3xl"></div>
      </div>
    </section>
  );
};