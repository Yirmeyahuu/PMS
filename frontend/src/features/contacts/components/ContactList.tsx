import React from 'react';
import { Eye, Edit, ChevronLeft, ChevronRight, Star, StarOff } from 'lucide-react';
import type { Contact } from '@/types';

interface ContactListProps {
  contacts: Contact[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onView: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onTogglePreferred?: (contact: Contact) => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  currentPage,
  totalPages,
  onPageChange,
  onView,
  onEdit,
  onTogglePreferred,
}) => {
  const getContactTypeColor = (type: string) => {
    const colors = {
      DOCTOR: 'bg-blue-100 text-blue-700',
      PRACTITIONER: 'bg-green-100 text-green-700',
      CLINIC: 'bg-purple-100 text-purple-700',
      LABORATORY: 'bg-yellow-100 text-yellow-700',
      PHARMACY: 'bg-pink-100 text-pink-700',
      OTHER: 'bg-gray-100 text-gray-700',
    };
    return colors[type as keyof typeof colors] || colors.OTHER;
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 3;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 2) {
        pages.push(1, 2, 3);
      } else if (currentPage >= totalPages - 1) {
        pages.push(totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(currentPage - 1, currentPage, currentPage + 1);
      }
    }

    return pages;
  };

  if (contacts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No contacts found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-xl border border-gray-200 m-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Company ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Full Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.contact_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold relative">
                          {contact.first_name.charAt(0)}
                          {contact.last_name.charAt(0)}
                          {contact.is_preferred && (
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 absolute -top-1 -right-1" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            {contact.full_name}
                          </div>
                          {contact.organization_name && (
                            <div className="text-xs text-gray-500">
                              {contact.organization_name}
                            </div>
                          )}
                          {contact.specialty && (
                            <div className="text-xs text-gray-500">
                              {contact.specialty}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getContactTypeColor(
                          contact.contact_type
                        )}`}
                      >
                        {contact.contact_type_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.email || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.phone}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {onTogglePreferred && (
                          <button
                            onClick={() => onTogglePreferred(contact)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              contact.is_preferred
                                ? 'text-yellow-600 hover:bg-yellow-50'
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            title={contact.is_preferred ? 'Remove from preferred' : 'Mark as preferred'}
                          >
                            {contact.is_preferred ? (
                              <Star className="w-4 h-4 fill-yellow-600" />
                            ) : (
                              <StarOff className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => onView(contact)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => onEdit(contact)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-purple-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center text-sm text-gray-600 mt-2">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
    </div>
  );
};