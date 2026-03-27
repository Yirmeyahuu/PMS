import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pt-40 lg:pb-32 bg-cyan-600 overflow-hidden">
      {/* Grainy Texture Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight font-display">
            Empowering Filipino{' '}
            <span className="text-cyan-200">Health Providers</span>
          </h1>
          
          <p className="mt-6 sm:mt-8 text-lg sm:text-xl lg:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed font-body">
            Streamline your clinic operations with our all-in-one platform. Manage appointments, 
            patient records, and billing effortlessly.
          </p>
          
          {/* Trust Indicators */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-5 sm:gap-8">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-cyan-200 flex-shrink-0" />
              <span className="text-base sm:text-lg text-white font-medium font-body">OWASP Top 10</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-cyan-200 flex-shrink-0" />
              <span className="text-base sm:text-lg text-white font-medium font-body">14-Day Free Trial</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-cyan-200 flex-shrink-0" />
              <span className="text-base sm:text-lg text-white font-medium font-body">Hipaa Aligned</span>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-cyan-600 bg-white rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 font-body"
            >
              Start Free Trial
              <ArrowRight className="ml-3 w-6 h-6" />
            </Link>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-cyan-700 border-2 border-cyan-500 rounded-xl hover:bg-cyan-800 active:bg-cyan-900 transition-all shadow-lg hover:shadow-xl font-body"
            >
              Watch Demo
            </button>
          </div>
        </div>
      </div>
      
      {/* Hero Image at Bottom */}
      <div className="relative mt-12 sm:mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80"
              alt=""
              className="w-full h-auto object-cover"
              loading="eager"
            />
            
            {/* Overlay Card */}
            <div className="absolute bottom-6 left-6 right-6 bg-white rounded-xl shadow-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium font-body">Today's Appointments</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1 font-display">24</p>
                </div>
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background Decorative Elements - Floating Gradient Lights */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        {/* Floating Light 1 - Top Right */}
        <div className="absolute top-20 right-20 w-64 h-64 lg:w-80 lg:h-80 bg-cyan-400 rounded-full opacity-30 blur-3xl animate-pulse"></div>
        {/* Floating Light 2 - Bottom Left */}
        <div className="absolute bottom-20 left-20 w-64 h-64 lg:w-80 lg:h-80 bg-cyan-400 rounded-full opacity-30 blur-3xl animate-pulse"></div>
        <div className="absolute top-20 right-0 w-96 h-96 lg:w-[500px] lg:h-[500px] bg-cyan-500 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 lg:w-[500px] lg:h-[500px] bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
      </div>
    </section>
  );
};
