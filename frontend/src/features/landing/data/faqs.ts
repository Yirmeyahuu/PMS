export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export const faqs: FAQ[] = [
  {
    id: 'trial',
    question: 'Is there a free trial available?',
    answer: 'Yes! We offer a 14-day free trial with full access to all features. No credit card required to start.'
  },
  {
    id: 'migration',
    question: 'Can I migrate my existing patient data?',
    answer: 'Absolutely. Our team provides free data migration assistance to help you seamlessly transfer your existing patient records, appointments, and documentation.'
  },
  {
    id: 'security',
    question: 'Is my data secure and HIPAA compliant?',
    answer: 'Yes. We use bank-level encryption (AES-256) and are fully HIPAA compliant. All data is stored in secure, redundant servers with automatic backups.'
  },
  {
    id: 'support',
    question: 'What kind of support do you provide?',
    answer: 'We offer 24/7 email support for all plans. Professional and Enterprise plans include priority phone support and dedicated account managers.'
  },
  {
    id: 'cancel',
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription at any time. No long-term contracts or cancellation fees. Your data remains accessible for 30 days after cancellation.'
  },
  {
    id: 'training',
    question: 'Do you provide training for my staff?',
    answer: 'Yes! We provide comprehensive onboarding, video tutorials, and live training sessions. Enterprise plans include personalized on-site training.'
  }
];