import React from 'react';
import { Calendar, FileText, DollarSign, Settings } from 'lucide-react';

export const DashboardContent: React.FC = () => {
  const quickActions = [
    {
      id: 'book-appointment',
      title: 'Book Appointment',
      description: 'Use the Diary to book a client for an appointment',
      icon: Calendar,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      id: 'clinical-notes',
      title: 'Clinical Notes',
      description: 'Writing clinical notes for consultations',
      icon: FileText,
      color: 'bg-green-50 text-green-600'
    },
    {
      id: 'invoicing',
      title: 'Invoicing',
      description: 'Create an invoice and take payment',
      icon: DollarSign,
      color: 'bg-purple-50 text-purple-600'
    },
    {
      id: 'setup',
      title: 'Start Setting Up',
      description: 'Start Setting up your Practice',
      icon: Settings,
      color: 'bg-orange-50 text-orange-600'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Welcome back, Dr. Juan! 👋</h1>
        <p className="text-lg text-sky-100">
          Here's what's happening with your practice today
        </p>
      </div>

      {/* Learn Section */}
      <div className="bg-gray-100 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Learn how to use MES PMS
        </h2>
        <p className="text-base text-gray-600">
          Get started with these quick guides and tutorials
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid sm:grid-cols-2 gap-6">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 text-left border-2 border-gray-200 hover:border-sky-500 group"
            >
              <div className={`w-14 h-14 ${action.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <Icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {action.title}
              </h3>
              <p className="text-base text-gray-600">
                {action.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Subscription Banner */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div className="text-white">
              <h3 className="text-2xl font-bold mb-1">Subscribe to your account</h3>
              <p className="text-lg text-purple-100">
                Your Trial has 21 days remaining
              </p>
            </div>
          </div>
          <button className="px-8 py-4 bg-white text-purple-600 rounded-xl font-bold text-lg hover:bg-purple-50 transition-colors shadow-lg hover:shadow-xl">
            Subscribe
          </button>
        </div>
      </div>

      {/* Messages Widget */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="flex items-center space-x-3 px-6 py-4 bg-white rounded-full shadow-xl hover:shadow-2xl transition-all border border-gray-200 hover:scale-105">
          <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="text-base font-semibold text-gray-900">Messages</span>
        </button>
      </div>
    </div>
  );
};