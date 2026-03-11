import { useState, useMemo } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import type { Participant } from '../types/messages.types';

interface Props {
  contacts:  Participant[];
  isLoading: boolean;
  onSelect:  (contact: Participant) => void;
  onBack:    () => void;
}

const Avatar = ({ name, src }: { name: string; src: string | null }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return src ? (
    <img src={src} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
      {initials}
    </div>
  );
};

export const ContactList = ({ contacts, isLoading, onSelect, onBack }: Props) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    contacts.filter(c =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    ),
    [contacts, search]
  );

  /* Group by branch → then by role inside each branch */
  const groupedByBranch = useMemo(() =>
    filtered.reduce<Record<string, Participant[]>>((acc, c) => {
      const branch = (c as any).clinic_branch_name || 'Main Branch';
      if (!acc[branch]) acc[branch] = [];
      acc[branch].push(c);
      return acc;
    }, {}),
    [filtered]
  );

  const branches = Object.keys(groupedByBranch).sort((a, b) =>
    a === 'Main Branch' ? -1 : b === 'Main Branch' ? 1 : a.localeCompare(b)
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-700">New Message</span>
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-white border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search staff..."
            autoFocus
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Contacts */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">No staff found</p>
        ) : (
          branches.map(branch => (
            <div key={branch}>
              {/* Branch label */}
              <div className="flex items-center gap-2 px-4 py-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {branch}
                </span>
              </div>

              {groupedByBranch[branch].map(contact => (
                <button
                  key={contact.id}
                  onClick={() => onSelect(contact)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white transition-colors"
                >
                  <Avatar name={contact.full_name} src={contact.avatar} />
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{contact.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {contact.role.charAt(0) + contact.role.slice(1).toLowerCase()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};