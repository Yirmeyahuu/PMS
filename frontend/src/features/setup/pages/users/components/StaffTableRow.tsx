import React from 'react';
import { Edit2, Trash2, Mail, Phone, ToggleLeft, ToggleRight } from 'lucide-react';
import type { StaffMember } from '../../../types/staff.types';
import { DISCIPLINE_OPTIONS } from '../../../types/staff.types';

interface Props {
  staff:          StaffMember;
  onEdit:         (s: StaffMember) => void;
  onDelete:       (id: number) => void;
  onToggleStatus: (id: number, isActive: boolean) => void;
}

const ROLE_BADGE: Record<string, string> = {
  PRACTITIONER: 'bg-purple-50 text-purple-700 border-purple-200',
  STAFF:        'bg-cyan-50   text-cyan-700   border-cyan-200',
};

const DISCIPLINE_BADGE: Record<string, string> = {
  default: 'bg-slate-50 text-slate-600 border-slate-200',
};

export const StaffTableRow: React.FC<Props> = ({
  staff, onEdit, onDelete, onToggleStatus,
}) => {
  const disciplineLabel =
    DISCIPLINE_OPTIONS.find(d => d.value === staff.discipline)?.label ?? staff.discipline;

  const initials = `${staff.first_name[0] ?? ''}${staff.last_name[0] ?? ''}`.toUpperCase();

  return (
    <tr className="hover:bg-cyan-50/40 transition-colors">

      {/* Name + Avatar */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-100 border border-cyan-200 flex items-center justify-center text-xs font-bold text-cyan-700 flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm leading-tight">
              {staff.title} {staff.first_name} {staff.last_name}
            </p>
            {staff.nickname && (
              <p className="text-xs text-gray-400">"{staff.nickname}"</p>
            )}
          </div>
        </div>
      </td>

      {/* Position */}
      <td className="px-4 py-3 text-gray-600 text-sm">
        {staff.position || '—'}
      </td>

      {/* Discipline */}
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${DISCIPLINE_BADGE['default']}`}>
          {disciplineLabel}
        </span>
      </td>

      {/* Contact */}
      <td className="px-4 py-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="truncate max-w-[180px]">{staff.email}</span>
          </div>
          {staff.phone && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span>{staff.phone}</span>
            </div>
          )}
        </div>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_BADGE[staff.role] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
          {staff.role}
        </span>
      </td>

      {/* Status toggle */}
      <td className="px-4 py-3">
        <button
          onClick={() => onToggleStatus(staff.id, !staff.is_active)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
            staff.is_active
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-gray-50   text-gray-500   border-gray-200   hover:bg-gray-100'
          }`}
        >
          {staff.is_active
            ? <><ToggleRight className="w-3.5 h-3.5" /> Active</>
            : <><ToggleLeft  className="w-3.5 h-3.5" /> Inactive</>}
        </button>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(staff)}
            className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${staff.first_name} ${staff.last_name}"? This cannot be undone.`))
                onDelete(staff.id);
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};