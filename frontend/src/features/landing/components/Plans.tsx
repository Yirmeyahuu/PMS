import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';

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
    <section id="plans" className="py-20 sm:py-28 bg-trust-harbor">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-display">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-gray-400 leading-relaxed font-body">
            One plan with everything you need. Try it free for {PLAN.trialDays} days, no credit card required.
          </p>
        </div>

        {/* Horizontal Plan Card */}
        <div className="mt-20 max-w-5xl mx-auto">
          <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl border border-gray-700 overflow-hidden">
            {/* Popular Badge */}
            <div className="absolute top-4 right-4 z-10">
              <span className="bg-primary-gradient text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center font-body">
                <Sparkles className="w-4 h-4 mr-2" />
                {PLAN.trialDays}-Day Free Trial
              </span>
            </div>

            <div className="flex flex-col lg:flex-row">
              {/* Left Side - Plan Info */}
              <div className="lg:w-1/3 p-10 sm:p-12 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-gray-700">
                <h3 className="text-3xl font-bold text-white font-display">
                  {PLAN.name}
                </h3>
                <p className="mt-3 text-base text-gray-400 font-body">{PLAN.description}</p>
                
                <div className="mt-8">
                  <span className="text-5xl font-bold text-white font-display">
                    {PLAN.currency}{PLAN.price.toLocaleString('en-PH')}
                  </span>
                  <span className="text-lg text-gray-400 ml-2 font-body">
                    {PLAN.billing}
                  </span>
                </div>

                <p className="mt-3 text-sm text-gray-500 font-medium font-body">
                  Billed monthly • Cancel anytime
                </p>

                {/* CTA Button */}
                <Link
                  to="/register"
                  className="mt-8 block w-full py-4 px-6 text-center text-lg font-bold rounded-xl transition-all bg-primary-gradient text-white hover:opacity-95 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 font-body"
                  aria-label={`${PLAN.cta} - ${PLAN.trialDays} days free`}
                >
                  {PLAN.cta}
                </Link>

                <p className="mt-4 text-center text-sm text-gray-500 font-body">
                  No credit card required for trial
                </p>
              </div>

              {/* Right Side - Features List */}
              <div className="lg:w-2/3 p-10 sm:p-12">
                <h4 className="text-lg font-semibold text-white mb-6 font-display">What's Included:</h4>
                <ul className="grid sm:grid-cols-2 gap-4" role="list">
                  {PLAN.features.map((feature, index) => {
                    const colorIndex = index % 4;
                    const colorClasses = [
                      'bg-cyan-600/20 text-cyan-400',
                      'bg-purple-600/20 text-purple-400',
                      'bg-green-600/20 text-green-400',
                      'bg-blue-600/20 text-blue-400'
                    ];
                    return (
                      <li key={`feature-${index}`} className="flex items-center">
                        <div className={`w-5 h-5 ${colorClasses[colorIndex].split(' ')[0]} rounded-full flex items-center justify-center shrink-0`}>
                          <Check className={`w-3 h-3 ${colorClasses[colorIndex].split(' ')[1]}`} />
                        </div>
                        <span className="ml-3 text-base text-gray-300 font-body">{feature}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="mt-16 text-center">
          <p className="text-base text-gray-400 font-body">
            Questions about pricing?{' '}
            <a 
              href="mailto:support@mespms.com" 
              className="text-healing-mint font-semibold hover:text-gentle-renewal transition-colors font-body"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};
