import React from 'react';
import { features } from '../data/features';
import { ArrowRight } from 'lucide-react';

export const Features: React.FC = () => {
  const colors = ['cyan', 'purple', 'green', 'blue', 'indigo', 'emerald'];

  const getColorClasses = (index: number) => {
    const color = colors[index % colors.length];
    switch (color) {
      case 'cyan':
        return 'bg-cyan-100 text-cyan-600';
      case 'purple':
        return 'bg-purple-100 text-purple-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'indigo':
        return 'bg-indigo-100 text-indigo-600';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <section id="features" className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 font-display">
            Powerful Features for Your Practice
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed font-body">
            Everything you need to streamline your clinic operations and deliver exceptional patient care.
          </p>
        </div>

        {/* Features Grid - Cards with different colors */}
        <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <div 
                key={feature.id}
                className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
              >
                {/* Icon with rotating colors */}
                <div className={`w-14 h-14 ${getColorClasses(index)} rounded-xl flex items-center justify-center mb-6`}>
                  <Icon className="w-7 h-7" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 font-display">
                  {feature.title}
                </h3>
                <p className="text-base text-gray-600 leading-relaxed font-body">
                  {feature.description}
                </p>
                
                {/* Learn more link */}
                <button
                  onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                  className="mt-4 inline-flex items-center text-cyan-600 font-semibold hover:text-cyan-700 transition-colors font-body"
                >
                  Learn more <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <div className="inline-block bg-white rounded-2xl shadow-lg px-8 py-6">
            <p className="text-base text-gray-600 font-body">
              Ready to transform your practice?{' '}
              <button
                onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-cyan-600 font-semibold hover:text-cyan-700 transition-colors font-body"
              >
                View pricing plans →
              </button>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
