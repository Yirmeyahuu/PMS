import React from 'react';
import {
  X, Star, Phone, Mail, MapPin, Briefcase,
  Building2, Globe, Hash, Archive, CheckCircle, Edit,
  Send,
} from 'lucide-react';
import type { Contact } from '@/types';

interface ViewContactModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  contact:  Contact | null;
  onEdit:   (contact: Contact) => void;
  onTogglePreferred?: (contact: Contact) => void;
  onToggleActive?:    (contact: Contact) => void;
  onSendEmail?:        (contact: Contact) => void;
}

const TYPE_COLORS: Record<string, string> = {
  DOCTOR:       'bg-blue-100   text-blue-700',
  PRACTITIONER: 'bg-green-100  text-green-700',
  CLINIC:       'bg-sky-100 text-sky-700',
  LABORATORY:   'bg-yellow-100 text-yellow-700',
  PHARMACY:     'bg-pink-100   text-pink-700',
  SUPPLIER:     'bg-orange-100 text-orange-700',
  OTHER:        'bg-gray-100   text-gray-700',
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | null }> = ({
  icon, label, value,
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex-shrink-0 text-sky-400">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-gray-800 font-medium">{value}</p>
      </div>
    </div>
  );
};

export const ViewContactModal: React.FC<ViewContactModalProps> = ({
  isOpen, onClose, contact, onEdit, onTogglePreferred, onToggleActive, onSendEmail,
}) => {
  if (!isOpen || !contact) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Top accent */}
          <div className="h-1.5 w-full bg-sky-500 rounded-t-2xl" />

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-lg">
                  {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                </div>
                {contact.is_preferred && (
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 absolute -top-1 -right-1" />
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">{contact.full_name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_COLORS[contact.contact_type] ?? TYPE_COLORS.OTHER}`}>
                    {contact.contact_type_display}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${contact.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                    {contact.is_active
                      ? <><CheckCircle className="w-3 h-3" />Active</>
                      : <><Archive className="w-3 h-3" />Archived</>
                    }
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Contact Number */}
            <div className="flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">
              <Hash className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
              <span className="text-xs text-sky-600 font-semibold tracking-widest">
                {contact.contact_number}
              </span>
            </div>

            {/* Professional */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Professional
              </p>
              <div className="space-y-3">
                <InfoRow icon={<Building2 className="w-3.5 h-3.5" />}  label="Organization"    value={contact.organization_name} />
                <InfoRow icon={<Briefcase  className="w-3.5 h-3.5" />} label="Specialty"       value={contact.specialty}         />
                <InfoRow icon={<Hash       className="w-3.5 h-3.5" />} label="License Number"  value={contact.license_number}    />
                <InfoRow icon={<Globe      className="w-3.5 h-3.5" />} label="Website"         value={contact.website}           />
              </div>
            </div>

            {/* Contact Details */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Contact Details
              </p>
              <div className="space-y-3">
                <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone"             value={contact.phone}             />
                <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Alternative Phone" value={contact.alternative_phone} />
                <InfoRow icon={<Mail  className="w-3.5 h-3.5" />} label="Email"             value={contact.email}             />
              </div>
            </div>

            {/* Address */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Address
              </p>
              <div className="space-y-3">
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Street"      value={contact.address}     />
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="City"        value={contact.city}        />
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Province"    value={contact.province}    />
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Postal Code" value={contact.postal_code} />
              </div>
            </div>

            {/* Notes */}
            {contact.notes && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Notes</p>
                <p className="text-sm text-gray-700 leading-relaxed">{contact.notes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80">
            <div className="grid grid-cols-2 gap-3">
              {/* Left side - Action buttons */}
              <div className="flex flex-wrap gap-2">
                {onToggleActive && (
                  <button
                    type="button"
                    onClick={() => onToggleActive(contact)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors min-w-[100px] ${
                      contact.is_active
                        ? 'border-gray-200 text-gray-500 hover:bg-gray-100'
                        : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    {contact.is_active
                      ? <><Archive     className="w-3.5 h-3.5" />Archive</>
                      : <><CheckCircle className="w-3.5 h-3.5" />Restore</>
                    }
                  </button>
                )}
                {onTogglePreferred && (
                  <button
                    type="button"
                    onClick={() => onTogglePreferred(contact)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors min-w-[100px] ${
                      contact.is_preferred
                        ? 'border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${contact.is_preferred ? 'fill-yellow-500' : ''}`} />
                    {contact.is_preferred ? 'Preferred' : 'Mark Pref'}
                  </button>
                )}
                {onSendEmail && contact.email && (
                  <button
                    type="button"
                    onClick={() => onSendEmail(contact)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors min-w-[100px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Email
                  </button>
                )}
              </div>

              {/* Right side - Edit button */}
              <button
                type="button"
                onClick={() => onEdit(contact)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700
                           text-white rounded-lg text-sm font-semibold transition-colors shadow-sm h-10"
              >
                <Edit className="w-4 h-4" />
                Edit Contact
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};