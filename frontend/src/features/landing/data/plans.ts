// plans.ts - Optional separate file if you prefer external configuration

export interface Plan {
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
export const PLAN: Readonly<Plan> = {
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

// Helper function to get plan details (useful for other components)
export const getPlanDetails = (): Plan => PLAN;

// Helper to format price for display
export const formatPrice = (plan: Plan): string => {
  return `${plan.currency}${plan.price.toLocaleString('en-PH')}`;
};