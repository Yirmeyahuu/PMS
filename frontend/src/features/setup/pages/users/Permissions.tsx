import React, { useState } from 'react';
import { Shield, Crown, Stethoscope, UserCog } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Access = 'full' | 'limited' | 'none';

interface Permission {
  label: string;
  admin: Access;
  staff: Access;
  practitioner: Access;
  note?: string;
}

interface PermissionGroup {
  label: string;
  items: Permission[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const GROUPS: PermissionGroup[] = [
  {
    label: 'Dashboard',
    items: [
      { label: 'View dashboard',         admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'View clinic statistics', admin: 'full', staff: 'full', practitioner: 'limited', note: 'Own stats only' },
    ],
  },
  {
    label: 'Diary & Appointments',
    items: [
      { label: 'View appointment diary',        admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Create appointments',            admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Edit & reschedule appointments', admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Cancel appointments',            admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Add block appointments',         admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Compare practitioners',          admin: 'full', staff: 'none', practitioner: 'none' },
      { label: 'View all clinic branches',       admin: 'full', staff: 'full', practitioner: 'full' },
    ],
  },
  {
    label: 'Patients & Clients',
    items: [
      { label: 'View patient list',         admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Create patients',            admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Edit patient details',       admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Archive / delete patients', admin: 'full', staff: 'full', practitioner: 'none' },
    ],
  },
  {
    label: 'Clinical Notes',
    items: [
      { label: 'View clinical notes',   admin: 'full', staff: 'full',    practitioner: 'full' },
      { label: 'Create clinical notes', admin: 'full', staff: 'limited', practitioner: 'full', note: 'Staff: view only' },
      { label: 'Edit clinical notes',   admin: 'full', staff: 'limited', practitioner: 'full', note: 'Own notes only' },
      { label: 'Delete clinical notes', admin: 'full', staff: 'none',    practitioner: 'none' },
    ],
  },
  {
    label: 'Billing & Invoicing',
    items: [
      { label: 'View invoices',       admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Create invoices',      admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Process payments',     admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Bulk invoicing',       admin: 'full', staff: 'full', practitioner: 'none' },
      { label: 'View billing reports', admin: 'full', staff: 'full', practitioner: 'limited', note: 'Own patients only' },
    ],
  },
  {
    label: 'Contacts',
    items: [
      { label: 'View contacts',          admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Create / edit contacts', admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Delete contacts',        admin: 'full', staff: 'full', practitioner: 'none' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'View reports',       admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Export report data', admin: 'full', staff: 'full', practitioner: 'limited', note: 'Own data only' },
    ],
  },
  {
    label: 'Setup & Administration',
    items: [
      { label: 'Manage clinic locations', admin: 'full', staff: 'full', practitioner: 'none' },
      { label: 'Invoicing settings',       admin: 'full', staff: 'full', practitioner: 'none' },
      { label: 'Manage inventory',         admin: 'full', staff: 'full', practitioner: 'full' },
      { label: 'Manage staff accounts',    admin: 'full', staff: 'full', practitioner: 'none' },
      { label: 'View permissions',         admin: 'full', staff: 'full', practitioner: 'none' },
      { label: 'Manage subscription',      admin: 'full', staff: 'full', practitioner: 'none' },
    ],
  },
];

// ─── Role config ──────────────────────────────────────────────────────────────

type RoleKey = 'admin' | 'staff' | 'practitioner';

const ROLES: {
  key:    RoleKey;
  label:  string;
  icon:   React.ElementType;
  desc:   string;
  accent: { ring: string; header: string; iconBg: string; iconText: string };
}[] = [
  {
    key:    'admin',
    label:  'Administrator',
    icon:   Crown,
    desc:   'Full system access — manage all settings, staff, and clinic data.',
    accent: {
      ring:     'border-amber-200',
      header:   'bg-amber-50 border-amber-200',
      iconBg:   'bg-amber-100',
      iconText: 'text-amber-600',
    },
  },
  {
    key:    'staff',
    label:  'Staff',
    icon:   UserCog,
    desc:   'Full operational access — manage settings, schedules, and staff accounts.',
    accent: {
      ring:     'border-sky-200',
      header:   'bg-sky-50 border-sky-200',
      iconBg:   'bg-sky-100',
      iconText: 'text-sky-600',
    },
  },
  {
    key:    'practitioner',
    label:  'Practitioner',
    icon:   Stethoscope,
    desc:   'Clinical access only — restricted from administrative and financial modules.',
    accent: {
      ring:     'border-violet-200',
      header:   'bg-violet-50 border-violet-200',
      iconBg:   'bg-violet-100',
      iconText: 'text-violet-600',
    },
  },
];

// ─── Toggle pill ──────────────────────────────────────────────────────────────

const TogglePill: React.FC<{ label: string; access: Access; note?: string }> = ({
  label,
  access,
  note,
}) => {
  const isOn      = access === 'full';
  const isLimited = access === 'limited';

  const pillStyle = isOn
    ? 'bg-green-50 border-green-200 text-green-800'
    : isLimited
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-gray-100 border-gray-200 text-gray-400';

  const trackStyle = isOn
    ? 'bg-green-500'
    : isLimited
    ? 'bg-amber-400'
    : 'bg-gray-300';

  const knobOffset = isOn || isLimited ? 'translate-x-3' : 'translate-x-0.5';

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${pillStyle}`}
      title={note ? `${isLimited ? 'Limited — ' : ''}${note}` : undefined}
    >
      {/* Mini toggle switch */}
      <div className={`relative w-6 h-3.5 rounded-full shrink-0 transition-colors ${trackStyle}`}>
        <div
          className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform ${knobOffset}`}
        />
      </div>
      <span className="leading-none">{label}</span>
      {isLimited && <span className="opacity-60 text-[10px]">(limited)</span>}
    </div>
  );
};

// ─── Role row ─────────────────────────────────────────────────────────────────

const RoleRow: React.FC<{ role: typeof ROLES[number] }> = ({ role }) => {
  const Icon = role.icon;
  const { accent } = role;

  const allItems = GROUPS.flatMap((g) => g.items);
  const onCount      = allItems.filter((p) => p[role.key] === 'full').length;
  const limitedCount = allItems.filter((p) => p[role.key] === 'limited').length;
  const offCount     = allItems.filter((p) => p[role.key] === 'none').length;

  return (
    <div className={`border ${accent.ring} rounded-2xl overflow-hidden`}>
      {/* Role header */}
      <div className={`${accent.header} border-b px-5 py-4 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 ${accent.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
            <Icon className={`w-4.5 h-4.5 ${accent.iconText}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">{role.label}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{role.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
          <span className="text-green-600">{onCount} on</span>
          {limitedCount > 0 && <span className="text-amber-600">{limitedCount} limited</span>}
          <span className="text-gray-400">{offCount} off</span>
        </div>
      </div>

      {/* Permission groups */}
      <div className="divide-y divide-gray-100 bg-white">
        {GROUPS.map((group) => (
          <div key={group.label} className="px-5 py-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <TogglePill
                  key={item.label}
                  label={item.label}
                  access={item[role.key]}
                  note={item.note}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const Permissions: React.FC = () => {
  const [activeRole, setActiveRole] = useState<RoleKey | 'all'>('all');

  const visibleRoles = activeRole === 'all'
    ? ROLES
    : ROLES.filter((r) => r.key === activeRole);

  return (
    <div className="p-6 space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Permissions</h1>
            <p className="text-xs text-gray-400">Role-based access control across the system</p>
          </div>
        </div>

        {/* Role filter tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', ...ROLES.map((r) => r.key)] as const).map((key) => {
            const label = key === 'all' ? 'All Roles' : ROLES.find((r) => r.key === key)!.label;
            return (
              <button
                key={key}
                onClick={() => setActiveRole(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeRole === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 px-1">
        {[
          { track: 'bg-green-500', knob: 'translate-x-3',   label: 'Full Access' },
          { track: 'bg-amber-400', knob: 'translate-x-3',   label: 'Limited Access' },
          { track: 'bg-gray-300',  knob: 'translate-x-0.5', label: 'No Access' },
        ].map(({ track, knob, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`relative w-6 h-3.5 rounded-full ${track}`}>
              <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm ${knob}`} />
            </div>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Role rows ── */}
      <div className="space-y-4">
        {visibleRoles.map((role) => (
          <RoleRow key={role.key} role={role} />
        ))}
      </div>
    </div>
  );
};