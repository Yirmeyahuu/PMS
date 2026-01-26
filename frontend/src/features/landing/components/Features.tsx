import React from 'react';
import { features } from '../data/features';

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            Everything You Need to Run Your Practice
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed">
            Comprehensive tools designed to streamline your workflow and enhance patient care.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="relative group bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-sky-500 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Icon */}
                <div className="w-16 h-16 bg-sky-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-sky-600 transition-colors duration-300">
                  <Icon className="w-8 h-8 text-sky-600 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Effect Line */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-sky-600 rounded-b-2xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-base text-gray-600">
            Want to see it in action?{' '}
            <button
              onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sky-600 font-semibold hover:text-sky-700 transition-colors"
            >
              View pricing plans →
            </button>
          </p>
        </div>
      </div>
    </section>
  );
};