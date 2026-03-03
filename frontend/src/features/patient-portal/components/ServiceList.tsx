import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ServiceCard } from './ServiceCard';
import type { PortalCategory, PortalService } from '@/types/portal';

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
  // Default expand first category
  const [expandedCategory, setExpandedCategory] = useState<number | null | 'all'>(
    categories.length > 0 ? (categories[0].id ?? 'all') : 'all',
  );

  if (categories.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">No services available.</div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((cat) => (
        <div
          key={cat.id ?? 'other'}
          className="bg-gray-200 rounded-xl overflow-hidden"
        >
          {/* Category header */}
          <button
            onClick={() =>
              setExpandedCategory(
                expandedCategory === cat.id ? null : cat.id,
              )
            }
            className="w-full flex items-center justify-between px-5 py-3 font-semibold text-gray-800"
          >
            <span>{cat.name}</span>
            <ChevronLeft
              className={`w-5 h-5 transition-transform ${
                expandedCategory === cat.id ? '-rotate-90' : ''
              }`}
            />
          </button>

          {/* Service cards */}
          {expandedCategory === cat.id && (
            <div className="space-y-2 px-3 pb-3">
              {cat.services.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  isSelected={selectedService?.id === svc.id}
                  onBook={() => onSelectService(svc)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};