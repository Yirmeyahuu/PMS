import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import MESLogo from '@/assets/MESLogo.svg';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#plans' },
      { label: 'Security', href: '#' },
      { label: 'Roadmap', href: '#' }
    ],
    company: [
      { label: 'About', href: '#about' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' }
    ],
    legal: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'HIPAA Compliance', href: '#' },
      { label: 'Cookie Policy', href: '#' }
    ]
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center space-x-3">
              <img 
                src={MESLogo} 
                alt="MES Logo" 
                className="h-14 w-auto"
              />
            </Link>
            <p className="mt-6 text-base text-gray-400 max-w-sm leading-relaxed">
              Modern practice management software designed for healthcare professionals 
              who want to focus on patient care.
            </p>

            {/* Contact Info */}
            <div className="mt-8 space-y-4">
              <a href="mailto:support@mespms.com" className="flex items-center text-base hover:text-white transition-colors">
                <Mail className="w-5 h-5 mr-3" />
                support@mespms.com
              </a>
              <a href="tel:+1234567890" className="flex items-center text-base hover:text-white transition-colors">
                <Phone className="w-5 h-5 mr-3" />
                +1 (234) 567-890
              </a>
              <div className="flex items-start text-base">
                <MapPin className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                <span>123 Healthcare Ave, Medical District, CA 90210</span>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h3 className="text-base font-bold text-white mb-6">Product</h3>
            <ul className="space-y-4">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-base hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-6">Company</h3>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-base hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-6">Legal</h3>
            <ul className="space-y-4">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-base hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-10 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-base text-gray-400">
              © {currentYear} MES PMS. All rights reserved.
            </p>
            <div className="flex items-center space-x-8">
              <a href="#" className="text-base hover:text-white transition-colors">
                Twitter
              </a>
              <a href="#" className="text-base hover:text-white transition-colors">
                LinkedIn
              </a>
              <a href="#" className="text-base hover:text-white transition-colors">
                Facebook
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};