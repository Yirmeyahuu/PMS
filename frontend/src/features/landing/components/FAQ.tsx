import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { faqs } from '../data/faqs';

export const FAQ: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-20 sm:py-28 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed">
            Everything you need to know about MES PMS
          </p>
        </div>

        {/* FAQ List */}
        <div className="mt-16 space-y-5">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-gray-50 rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-sky-500 transition-colors"
            >
              <button
                onClick={() => toggleFAQ(faq.id)}
                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg font-semibold text-gray-900 pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-6 h-6 text-gray-500 shrink-0 transition-transform duration-300 ${
                    openId === faq.id ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {openId === faq.id && (
                <div className="px-8 pb-6">
                  <p className="text-base text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-16 text-center">
          <p className="text-base text-gray-600">
            Still have questions?{' '}
            <a href="mailto:support@mespms.com" className="text-sky-600 font-semibold hover:text-sky-700 transition-colors">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};