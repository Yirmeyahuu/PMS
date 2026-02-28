import React from 'react';
import { Edit2, Trash2, ToggleLeft, ToggleRight, Mail, Phone } from 'lucide-react';
import type { StaffMember } from '../../../types/staff.types';
import { DISCIPLINE_OPTIONS } from '../../../types/staff.types';

interface StaffTableRowProps {
  staff: StaffMember;
  onEdit: (staff: StaffMember) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, isActive: boolean) => void;
}

export const StaffTableRow: React.FC<StaffTableRowProps> = ({
  staff,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const getDisciplineLabel = (discipline: string) => {
    return DISCIPLINE_OPTIONS.find((d) => d.value === discipline)?.label || discipline;
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Avatar & Name */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
            {staff.first_name[0]}
            {staff.last_name[0]}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {staff.title} {staff.first_name} {staff.last_name}
            </div>
            {staff.nickname && (
              <div className="text-xs text-gray-500">"{staff.nickname}"</div>
            )}
          </div>
        </div>
      </td>

      {/* Position */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{staff.position}</div>
      </td>

      {/* Discipline */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {getDisciplineLabel(staff.discipline)}
        </span>
      </td>

      {/* Contact */}
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Mail className="w-3 h-3 text-gray-400" />
            <span className="truncate max-w-xs">{staff.email}</span>
          </div>
          {staff.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-3 h-3 text-gray-400" />
              <span>{staff.phone}</span>
            </div>
          )}
        </div>
      </td>

      {/* Role */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            staff.role === 'PRACTITIONER'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {staff.role}
        </span>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={() => onToggleStatus(staff.id, !staff.is_active)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            staff.is_active
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          {staff.is_active ? (
            <>
              <ToggleRight className="w-4 h-4" />
              Active
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4" />
              Inactive
            </>
          )}
        </button>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(staff)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit staff member"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this staff member?')) {
                onDelete(staff.id);
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete staff member"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};