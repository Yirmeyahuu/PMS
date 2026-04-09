import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ServiceCard } from './ServiceCard';
import type { PortalCategory, PortalService } from '../types/portal';

interface ServiceListProps {
  categories:      PortalCategory[];
  selectedService: PortalService | null;
  onSelectService: (service: PortalService) => void;
}

export const ServiceList: React.FC<ServiceListProps> = ({
  categories,
  selectedService,
  onSelectService,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<number | null | 'none'>(
    categories.length > 0 ? (categories[0].id ?? 'none') : 'none',
  );

  if (categories.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        No services available for this practitioner.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Select a Service</h2>
        <p className="text-sm text-gray-500 mt-1">
          Choose the type of appointment you&apos;d like to book.
        </p>
      </div>

      {categories.map((cat) => {
        const catKey     = cat.id ?? 'none';
        const isExpanded = expandedCategory === catKey;

        return (
          <div
            key={catKey}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md"
          >
            {/* Category header */}
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
              className="w-full flex items-center justify-between px-5 py-4 font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <div className="text-left">
                <span className="text-base font-medium">{cat.name}</span>
                {cat.description && (
                  <p className="text-xs text-gray-400 font-normal mt-0.5">{cat.description}</p>
                )}
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Service cards */}
            {isExpanded && (
              <div className="border-t border-gray-100 divide-y divide-gray-100">
                {cat.services.map((svc) => (
                  <ServiceCard
                    key={svc.id}
                    service={svc}
                    isSelected={selectedService?.id === svc.id}
                    onSelect={() => onSelectService(svc)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};