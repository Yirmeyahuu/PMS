import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ManageCategory } from '../types/manage.types';

interface ManageNavbarProps {
  categories: ManageCategory[];
  activeCategory: string;
  activeItem: string;
  onItemSelect: (categoryId: string, itemId: string) => void;
}

export const ManageNavbar: React.FC<ManageNavbarProps> = ({
  categories,
  activeCategory,
  activeItem,
  onItemSelect,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (categoryId: string) => {
    setOpenDropdown(openDropdown === categoryId ? null : categoryId);
  };

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div 
        className="max-w-5xl mx-auto bg-white rounded-3xl shadow-md border border-gray-200"
        ref={dropdownRef}
      >
        <div className="flex items-center justify-center px-4 py-3 gap-4">
          {categories.map((category) => (
            <div key={category.id} className="relative">
              <button
                onClick={() => toggleDropdown(category.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 text-sm font-semibold
                  rounded-2xl transition-colors
                  ${
                    activeCategory === category.id
                      ? 'bg-sky-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {category.label}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    openDropdown === category.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu - Simple Style */}
              {openDropdown === category.id && (
                <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <div className="py-2">
                    {category.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onItemSelect(category.id, item.id);
                          setOpenDropdown(null);
                        }}
                        className={`
                          w-full text-left px-4 py-3 text-sm
                          transition-colors
                          ${
                            activeItem === item.id
                              ? 'bg-sky-500 text-white font-semibold'
                              : 'text-gray-700 hover:bg-gray-100 font-medium'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span>{item.label}</span>
                          {activeItem === item.id && (
                            <svg 
                              className="w-5 h-5 text-white" 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path 
                                fillRule="evenodd" 
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                                clipRule="evenodd" 
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};