import React from 'react';
import { Target, Award, Users, TrendingUp } from 'lucide-react';

export const About: React.FC = () => {
  const values = [
    {
      icon: Target,
      title: 'Mission-Driven',
      description: 'Empowering healthcare providers with technology that simplifies practice management.'
    },
    {
      icon: Award,
      title: 'Quality First',
      description: 'Built with best practices, security, and compliance at the core of everything we do.'
    },
    {
      icon: Users,
      title: 'Customer-Centric',
      description: 'Your success is our priority. We listen, adapt, and continuously improve.'
    },
    {
      icon: TrendingUp,
      title: 'Innovation',
      description: 'Leveraging cutting-edge technology to keep your practice ahead of the curve.'
    }
  ];

  return (
    <section id="about" className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            Built for Healthcare Professionals
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed">
            We understand the challenges of running a modern practice. That's why we created 
            a platform that combines simplicity with powerful features.
          </p>
        </div>

        {/* Values Grid */}
        <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="w-16 h-16 bg-sky-100 rounded-xl flex items-center justify-center mb-6">
                  <Icon className="w-8 h-8 text-sky-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Story */}
        <div className="mt-20 bg-white rounded-2xl p-10 sm:p-14 shadow-lg">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
              Founded by healthcare professionals and technologists, MES was born from 
              firsthand experience with outdated practice management systems. We believe 
              that technology should enhance patient care, not complicate it.
            </p>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed">
              Today, we serve over 10,000 practitioners across multiple specialties, 
              helping them save time, reduce errors, and focus on what matters most—their patients.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};