import { Calendar, Users, FileText, BarChart3, Shield, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Feature {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export const features: Feature[] = [
  {
    id: 'appointments',
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Intelligent appointment management with automated reminders and real-time availability.'
  },
  {
    id: 'patients',
    icon: Users,
    title: 'Patient Management',
    description: 'Comprehensive patient records with secure data storage and instant access.'
  },
  {
    id: 'records',
    icon: FileText,
    title: 'Digital Records',
    description: 'Paperless documentation with intake forms, prescriptions, and treatment notes.'
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Actionable insights with custom reports and practice performance metrics.'
  },
  {
    id: 'security',
    icon: Shield,
    title: 'OWASP Compliant',
    description: 'Bank-level encryption and compliance with healthcare data protection standards.'
  },
  {
    id: 'support',
    icon: Clock,
    title: '24/7 Support',
    description: 'Round-the-clock technical support and onboarding assistance for your team.'
  }
];