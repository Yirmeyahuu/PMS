import React, { useState } from 'react';
import { ChevronDown, MessageCircle, HelpCircle } from 'lucide-react';
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
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 font-display">
            Frequently Asked Questions
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed font-body">
            Everything you need to know about MES PMS
          </p>
        </div>

        {/* FAQ List */}
        <div className="mt-16 space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-gray-50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-100"
            >
              <button
                onClick={() => toggleFAQ(faq.id)}
                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <HelpCircle className="w-6 h-6 text-cyan-600 mr-4 shrink-0" />
                  <span className="text-lg font-semibold text-gray-900 pr-4 font-display">
                    {faq.question}
                  </span>
                </div>
                <ChevronDown
                  className={`w-6 h-6 text-cyan-600 shrink-0 transition-transform duration-300 ${
                    openId === faq.id ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {openId === faq.id && (
                <div className="px-8 pb-6 border-t border-gray-200">
                  <p className="text-base text-gray-600 leading-relaxed pt-6 font-body">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center justify-center bg-cyan-600 text-white px-8 py-4 rounded-2xl shadow-lg">
            <MessageCircle className="w-5 h-5 mr-3" />
            <p className="text-base font-medium font-body">
              Still have questions?{' '}
              <a href="mailto:support@mespms.com" className="font-semibold hover:underline font-body">
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
