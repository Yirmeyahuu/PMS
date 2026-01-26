import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

// Plan interface
interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing: string;
  description: string;
  features: string[];
  cta: string;
  trialDays: number;
}

// Single plan configuration
const PLAN: Readonly<Plan> = {
  id: 'standard',
  name: 'Standard Plan',
  price: 199,
  currency: '₱',
  billing: 'per month',
  description: 'Complete patient management solution for Philippine clinics',
  features: [
    'Unlimited patients',
    'Advanced appointment scheduling',
    'Patient portal access',
    'SMS & email reminders',
    'PhilHealth & HMO integration',
    'Digital intake forms',
    'Billing and invoicing',
    'Clinic performance reports',
    'Priority support',
    'Mobile app access (iOS & Android)',
    'Secure cloud storage',
    'Multi-practitioner support'
  ],
  cta: 'Start Free Trial',
  trialDays: 14
} as const;

export const Plans: React.FC = () => {
  return (
    <section id="plans" className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed">
            One plan with everything you need. Try it free for {PLAN.trialDays} days, no credit card required.
          </p>
        </div>

        {/* Single Plan Card - Centered */}
        <div className="mt-20 max-w-2xl mx-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl ring-2 ring-sky-600 transform hover:scale-105 transition-transform duration-300">
            {/* Popular Badge */}
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
              <span className="bg-sky-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                {PLAN.trialDays}-Day Free Trial
              </span>
            </div>

            <div className="p-10 sm:p-12">
              {/* Plan Header */}
              <div className="text-center">
                <h3 className="text-3xl font-bold text-gray-900">
                  {PLAN.name}
                </h3>
                <p className="mt-3 text-base text-gray-600">{PLAN.description}</p>
                
                <div className="mt-8">
                  <span className="text-6xl font-bold text-gray-900">
                    {PLAN.currency}{PLAN.price.toLocaleString('en-PH')}
                  </span>
                  <span className="text-xl text-gray-600 ml-3">
                    {PLAN.billing}
                  </span>
                </div>

                <p className="mt-3 text-base text-gray-500 font-medium">
                  Billed monthly • Cancel anytime
                </p>
              </div>

              {/* CTA Button */}
              <Link
                to="/register"
                className="mt-10 block w-full py-5 px-8 text-center text-lg font-bold rounded-xl transition-all bg-sky-600 text-white hover:bg-sky-700 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
                aria-label={`${PLAN.cta} - ${PLAN.trialDays} days free`}
              >
                {PLAN.cta}
              </Link>

              <p className="mt-4 text-center text-sm text-gray-500">
                No credit card required for trial
              </p>

              {/* Features List */}
              <ul className="mt-10 space-y-5" role="list">
                {PLAN.features.map((feature, index) => (
                  <li key={`feature-${index}`} className="flex items-start">
                    <Check className="w-6 h-6 text-green-500 shrink-0 mt-1" aria-hidden="true" />
                    <span className="ml-4 text-base text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="mt-16 text-center">
          <p className="text-base text-gray-600">
            Questions about pricing?{' '}
            <a 
              href="#contact" 
              className="text-sky-600 font-semibold hover:text-sky-700 transition-colors"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};