import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table as TableIcon,
  Minus,
  Undo,
  Redo,
  ChevronDown,
  Indent,
  Outdent
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';

interface EditorToolbarProps {
  editor: Editor | null;
}



const TableGridSelector = ({ onSelect }: { onSelect: (rows: number, cols: number) => void }) => {
  const [hovered, setHovered] = useState({ r: 0, c: 0 });
  const maxRows = 6;
  const maxCols = 6;

  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="text-xs text-gray-500 text-center font-medium">
        {hovered.r > 0 && hovered.c > 0 ? `${hovered.c} × ${hovered.r}` : 'Insert Table'}
      </div>
      <div 
        className="grid gap-1 mx-auto" 
        style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
        onMouseLeave={() => setHovered({ r: 0, c: 0 })}
      >
        {Array.from({ length: maxRows }).map((_, r) =>
          Array.from({ length: maxCols }).map((_, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-4 h-4 border rounded-sm cursor-pointer transition-colors duration-75 ${
                r < hovered.r && c < hovered.c
                  ? 'bg-sky-200 border-sky-400'
                  : 'bg-gray-50 border-gray-200 hover:border-sky-300'
              }`}
              onMouseEnter={() => setHovered({ r: r + 1, c: c + 1 })}
              onClick={() => onSelect(r + 1, c + 1)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', 
  '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6',
  '#fca5a5', '#fdba74', '#fcd34d', '#fef08a', '#d9f99d', '#bbf7d0', '#a7f3d0', '#99f6e4',
  '#67e8f9', '#7dd3fc', '#93c5fd', '#a5b4fc', '#c4b5fd', '#d8b4fe', '#f0abfc', '#f9a8d4',
  '#991b1b', '#9a3412', '#92400e', '#854d0e', '#3f6212', '#166534', '#065f46', '#115e59',
  '#155e75', '#075985', '#1e40af', '#3730a3', '#5b21b6', '#6b21a8', '#86198f', '#9d174d',
  '#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#1f2937'
];

const ColorPaletteSelector = ({ onSelect, onClear }: { onSelect: (color: string) => void, onClear: () => void }) => {
  return (
    <div className="flex flex-col gap-2 p-2 w-56">
      <div className="grid grid-cols-8 gap-1">
        {COLORS.map((color) => (
          <div
            key={color}
            className="w-5 h-5 rounded-sm cursor-pointer border border-gray-200 hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
            onClick={(e) => { e.preventDefault(); onSelect(color); }}
            title={color}
          />
        ))}
      </div>
      <button 
        type="button" 
        onClick={(e) => { e.preventDefault(); onClear(); }}
        className="w-full text-center px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 border border-gray-200 rounded"
      >
        No Color
      </button>
    </div>
  );
};

const TableToolsDropdown = ({ editor }: { editor: Editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
        className={`p-1.5 rounded flex items-center gap-1 ${editor.can().deleteTable() ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Table Tools"
      >
        <TableIcon className="w-4 h-4" />
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute z-10 left-0 mt-1 origin-top-left bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-56">
          
          {/* Add Table Submenu */}
          <div className="relative group">
            <button type="button" onMouseDown={(e) => e.preventDefault()}
              className="w-full text-left px-4 py-1.5 text-sm flex justify-between items-center text-gray-700 hover:bg-sky-50 hover:text-sky-700"
            >
              <span>Add table</span>
              <span>›</span>
            </button>
            <div className="absolute left-full top-0 hidden group-hover:block ml-0.5 z-50">
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-max" onMouseDown={(e) => e.preventDefault()}>
                <TableGridSelector onSelect={(r, c) => {
                  editor.chain().focus().insertTable({rows: r, cols: c, withHeaderRow: true}).run();
                  setIsOpen(false);
                }} />
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gray-100 my-1"></div>

          {/* Add Row Submenu */}
          <div className="relative group">
            <div className={`w-full text-left px-4 py-1.5 text-sm flex justify-between items-center ${!editor.can().addRowBefore() ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-sky-50 hover:text-sky-700 cursor-default'}`}>
              <span>Add row</span>
              <span>›</span>
            </div>
            {editor.can().addRowBefore() && (
              <div className="absolute left-full top-0 hidden group-hover:block ml-0.5 z-50">
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-32">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().addRowBefore().run(); setIsOpen(false); }}
                    className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-700"
                  >
                    Above
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().addRowAfter().run(); setIsOpen(false); }}
                    className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-700"
                  >
                    Below
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add Column Submenu */}
          <div className="relative group">
            <div className={`w-full text-left px-4 py-1.5 text-sm flex justify-between items-center ${!editor.can().addColumnBefore() ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-sky-50 hover:text-sky-700 cursor-default'}`}>
              <span>Add column</span>
              <span>›</span>
            </div>
            {editor.can().addColumnBefore() && (
              <div className="absolute left-full top-0 hidden group-hover:block ml-0.5 z-50">
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-32">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().addColumnBefore().run(); setIsOpen(false); }}
                    className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-700"
                  >
                    Left
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().addColumnAfter().run(); setIsOpen(false); }}
                    className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-700"
                  >
                    Right
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Remove Row */}
          <button type="button" disabled={!editor.can().deleteRow()} onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().deleteRow().run(); setIsOpen(false); }}
            className={`w-full text-left px-4 py-1.5 text-sm ${!editor.can().deleteRow() ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-50 hover:text-red-700'}`}
          >
            Remove row
          </button>

          {/* Remove Column */}
          <button type="button" disabled={!editor.can().deleteColumn()} onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().deleteColumn().run(); setIsOpen(false); }}
            className={`w-full text-left px-4 py-1.5 text-sm ${!editor.can().deleteColumn() ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-50 hover:text-red-700'}`}
          >
            Remove column
          </button>
          
          <div className="w-full h-px bg-gray-100 my-1"></div>

          {/* Cell Background Color Submenu */}
          <div className="relative group">
            <div className={`w-full text-left px-4 py-1.5 text-sm flex justify-between items-center ${!editor.can().deleteTable() ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-sky-50 hover:text-sky-700 cursor-default'}`}>
              <span>Cell background color</span>
              <span>›</span>
            </div>
            {editor.can().deleteTable() && (
              <div className="absolute left-full top-0 hidden group-hover:block ml-0.5 z-50">
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg w-max" onMouseDown={(e) => e.preventDefault()}>
                  <ColorPaletteSelector 
                    onSelect={(c) => { editor.chain().focus().updateAttributes('tableCell', { backgroundColor: c }).updateAttributes('tableHeader', { backgroundColor: c }).run(); setIsOpen(false); }}
                    onClear={() => { editor.chain().focus().updateAttributes('tableCell', { backgroundColor: null }).updateAttributes('tableHeader', { backgroundColor: null }).run(); setIsOpen(false); }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cell Border Color Submenu */}
          <div className="relative group">
            <div className={`w-full text-left px-4 py-1.5 text-sm flex justify-between items-center ${!editor.can().deleteTable() ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-sky-50 hover:text-sky-700 cursor-default'}`}>
              <span>Border color</span>
              <span>›</span>
            </div>
            {editor.can().deleteTable() && (
              <div className="absolute left-full top-0 hidden group-hover:block ml-0.5 z-50">
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg w-max" onMouseDown={(e) => e.preventDefault()}>
                  <ColorPaletteSelector 
                    onSelect={(c) => { editor.chain().focus().updateAttributes('tableCell', { borderColor: c }).updateAttributes('tableHeader', { borderColor: c }).run(); setIsOpen(false); }}
                    onClear={() => { editor.chain().focus().updateAttributes('tableCell', { borderColor: null }).updateAttributes('tableHeader', { borderColor: null }).run(); setIsOpen(false); }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Delete Table */}
          <div className="w-full h-px bg-gray-100 my-1"></div>
          <button type="button" disabled={!editor.can().deleteTable()} onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().deleteTable().run(); setIsOpen(false); }}
            className={`w-full text-left px-4 py-1.5 text-sm ${!editor.can().deleteTable() ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-50 hover:text-red-700'}`}
          >
            Delete Table
          </button>

        </div>
      )}
    </div>
  );
};

const LetterDropdown = ({ insertVariable }: { insertVariable: (id: string, label: string) => void }) => {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (menu: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveSubMenu(menu);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveSubMenu(null);
    }, 300);
  };

  const addresseeItems = [
    { label: 'Automatic', value: '{{addressee.automatic}}' },
    { label: 'Company', value: '{{addressee.company}}' },
    { label: 'Title', value: '{{addressee.title}}' },
    { label: 'First Name', value: '{{addressee.first_name}}' },
    { label: 'Last Name', value: '{{addressee.last_name}}' },
    { label: 'Email', value: '{{addressee.email}}' },
    { label: 'Work', value: '{{addressee.work}}' },
    { label: 'Mobile', value: '{{addressee.mobile}}' },
    { label: 'Home', value: '{{addressee.home}}' },
  ];

  const senderItems = [
    { label: 'Automatic', value: '{{sender.automatic}}' },
    { label: 'Title', value: '{{sender.title}}' },
    { label: 'First Name', value: '{{sender.first_name}}' },
    { label: 'Last Name', value: '{{sender.last_name}}' },
    { label: 'Discipline', value: '{{sender.discipline}}' },
    { label: 'Signature', value: '{{sender.signature}}' },
  ];

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20">
        Letter
        <ChevronDown className="w-3 h-3 text-gray-500" />
      </Menu.Button>
      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute z-10 left-0 mt-1 w-48 origin-top-left bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('addressee')}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-sky-50 cursor-default">
              Addressee
              <span className="text-gray-400">&gt;</span>
            </div>
            {activeSubMenu === 'addressee' && (
              <div className="absolute left-full top-0 mt-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
                {addresseeItems.map((v) => (
                  <Menu.Item key={v.value}>
                    {({ active }) => (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertVariable(v.value, v.label)}
                        className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-sky-50 text-sky-700' : 'text-gray-700'}`}
                      >
                        {v.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            )}
          </div>

          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('sender')}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-sky-50 cursor-default">
              Sender
              <span className="text-gray-400">&gt;</span>
            </div>
            {activeSubMenu === 'sender' && (
              <div className="absolute left-full top-0 mt-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
                {senderItems.map((v) => (
                  <Menu.Item key={v.value}>
                    {({ active }) => (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertVariable(v.value, v.label)}
                        className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-sky-50 text-sky-700' : 'text-gray-700'}`}
                      >
                        {v.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

const ClientDropdown = ({ insertVariable }: { insertVariable: (id: string, label: string) => void }) => {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [activeThirdLevel, setActiveThirdLevel] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thirdLevelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (menu: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveSubMenu(menu);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveSubMenu(null);
      setActiveThirdLevel(null);
    }, 300);
  };

  const handleThirdLevelEnter = (menu: string) => {
    if (thirdLevelTimeoutRef.current) clearTimeout(thirdLevelTimeoutRef.current);
    setActiveThirdLevel(menu);
  };

  const handleThirdLevelLeave = () => {
    thirdLevelTimeoutRef.current = setTimeout(() => {
      setActiveThirdLevel(null);
    }, 300);
  };

  const profileItems = [
    { label: 'Title', value: '{{patient.title}}' },
    { label: 'First Name', value: '{{patient.first_name}}' },
    { label: 'Middle Initial', value: '{{patient.middle_initial}}' },
    { label: 'Last Name', value: '{{patient.last_name}}' },
    { divider: true, id: 'd1' },
    { label: 'Sex', value: '{{patient.sex}}' },
    { label: 'Gender', value: '{{patient.gender}}' },
    { label: 'Date of Birth', value: '{{patient.dob}}' },
    { divider: true, id: 'd2' },
    { label: 'Email', value: '{{patient.email}}' },
    { label: 'Phone', value: '{{patient.phone}}' },
    { label: 'Address', value: '{{patient.address}}' },
  ];

  const doctorItems = [
    { label: 'Automatic', value: '{{patient.doctor.automatic}}' },
    { label: 'Company', value: '{{patient.doctor.company}}' },
    { label: 'Title', value: '{{patient.doctor.title}}' },
    { label: 'First Name', value: '{{patient.doctor.first_name}}' },
    { label: 'Last Name', value: '{{patient.doctor.last_name}}' },
  ];

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20">
        Client
        <ChevronDown className="w-3 h-3 text-gray-500" />
      </Menu.Button>
      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute z-10 left-0 mt-1 w-48 origin-top-left bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
          {/* Profile Submenu */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('profile')}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-sky-50 cursor-default">
              Profile
              <span className="text-gray-400">&gt;</span>
            </div>
            {activeSubMenu === 'profile' && (
              <div className="absolute left-full top-0 mt-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1 overflow-visible">
                {profileItems.map((v, i) => 
                  v.divider ? (
                    <div key={v.id || `div-${i}`} className="my-1 border-t border-gray-200" />
                  ) : (
                    <Menu.Item key={v.value}>
                      {({ active }) => (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => insertVariable(v.value!, v.label!)}
                          className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-sky-50 text-sky-700' : 'text-gray-700'}`}
                        >
                          {v.label}
                        </button>
                      )}
                    </Menu.Item>
                  )
                )}
              </div>
            )}
          </div>

          {/* Health Submenu */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('health')}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-sky-50 cursor-default">
              Health
              <span className="text-gray-400">&gt;</span>
            </div>
            {activeSubMenu === 'health' && (
              <div className="absolute left-full top-0 mt-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1 overflow-visible">
                {/* Doctor Third-Level Submenu */}
                <div
                  className="relative"
                  onMouseEnter={() => handleThirdLevelEnter('doctor')}
                  onMouseLeave={handleThirdLevelLeave}
                >
                  <div className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-sky-50 cursor-default">
                    Doctor
                    <span className="text-gray-400">&gt;</span>
                  </div>
                  {activeThirdLevel === 'doctor' && (
                    <div className="absolute left-full top-0 mt-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
                      {doctorItems.map((v) => (
                        <Menu.Item key={v.value}>
                          {({ active }) => (
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => insertVariable(v.value, v.label)}
                              className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-sky-50 text-sky-700' : 'text-gray-700'}`}
                            >
                              {v.label}
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

const CaseDropdown = ({ insertVariable }: { insertVariable: (id: string, label: string) => void }) => {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (menu: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveSubMenu(menu);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveSubMenu(null);
    }, 300);
  };

  const caseItems = [
    { label: 'Title', value: '{{case.title}}' },
    { label: 'Status', value: '{{case.status}}' },
    { label: 'Date Created', value: '{{case.date_created}}' },
    { label: 'Notes', value: '{{case.notes}}' },
  ];

  const sessionItems = [
    { label: 'Approved Sessions', value: '{{case.sessions.approved_sessions}}' },
    { label: 'Package Sessions', value: '{{case.sessions.package_sessions}}' },
    { label: 'Sessions Used', value: '{{case.sessions.sessions_used}}' },
    { label: 'Sessions Remaining', value: '{{case.sessions.sessions_remaining}}' },
    { label: 'Session Allocation', value: '{{case.sessions.session_allocation}}' },
  ];

  const referralItems = [
    { label: 'Doctor', value: '{{case.referral.doctor}}' },
    { label: 'Referral Date', value: '{{case.referral.date}}' },
    { label: 'Reference', value: '{{case.referral.reference}}' },
  ];

  const payerItems = [
    { label: 'Name', value: '{{case.payer.name}}' },
    { label: 'Reference', value: '{{case.payer.reference}}' },
  ];

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20">
        Case
        <ChevronDown className="w-3 h-3 text-gray-500" />
      </Menu.Button>
      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute z-10 left-0 mt-1 w-48 origin-top-left bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
          {/* Case Submenu */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('case')}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-sky-50 cursor-default">
              Case
              <span className="text-gray-400">&gt;</span>
            </div>
            {activeSubMenu === 'case' && (
              <div className="absolute left-full top-0 mt-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
                {caseItems.map((v) => (
                  <Menu.Item key={v.value}>
                    {({ active }) => (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertVariable(v.value, v.label)}
                        className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-sky-50 text-sky-700' : 'text-gray-700'}`}
                      >
                        {v.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            )}
          </div>

          {/* Sessions Submenu */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('sessions')}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-sky-50 cursor-default">
              Sessions
              <span className="text-gray-400">&gt;</span>
            </div>
            {activeSubMenu === 'sessions' && (
              <div className="absolute left-full top-0 mt-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
                {sessionItems.map((v) => (
                  <Menu.Item key={v.value}>
                    {({ active }) => (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertVariable(v.value, v.label)}
                        className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-sky-50 text-sky-700' : 'text-gray-700'}`}
                      >
                        {v.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            )}
          </div>

          {/* Referral Submenu */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('referral')}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-sky-50 cursor-default">
              Referral
              <span className="text-gray-400">&gt;</span>
            </div>
            {activeSubMenu === 'referral' && (
              <div className="absolute left-full top-0 mt-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
                {referralItems.map((v) => (
                  <Menu.Item key={v.value}>
                    {({ active }) => (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertVariable(v.value, v.label)}
                        className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-sky-50 text-sky-700' : 'text-gray-700'}`}
                      >
                        {v.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            )}
          </div>

          {/* Payer Submenu */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('payer')}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-sky-50 cursor-default">
              Payer
              <span className="text-gray-400">&gt;</span>
            </div>
            {activeSubMenu === 'payer' && (
              <div className="absolute left-full top-0 mt-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
                {payerItems.map((v) => (
                  <Menu.Item key={v.value}>
                    {({ active }) => (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertVariable(v.value, v.label)}
                        className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-sky-50 text-sky-700' : 'text-gray-700'}`}
                      >
                        {v.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  const insertVariable = (id: string, label: string) => {
    editor.chain().focus().insertMergeField({ id, label }).run();
  };





  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
      {/* History */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200">
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Formatting */}
      <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded ${editor.isActive('underline') ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded ${editor.isActive('strike') ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
      </div>

      {/* Font Size */}
      <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded" title="Font Size">
            Size
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </Menu.Button>
          <Transition
            as={React.Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute z-10 left-0 mt-1 w-24 origin-top-left bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
              {['10px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px'].map((size) => (
                <Menu.Item key={size}>
                  {({ active }) => (
                    <button type="button" onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().setFontSize(size).run()}
                      className={`w-full text-left px-4 py-1.5 text-sm ${active ? 'bg-sky-50 text-sky-700' : 'text-gray-700'} ${editor.isActive('textStyle', { fontSize: size }) ? 'bg-sky-100 font-semibold' : ''}`}
                    >
                      {size}
                    </button>
                  )}
                </Menu.Item>
              ))}
              <div className="w-full h-px bg-gray-100 my-1"></div>
              <Menu.Item>
                {({ active }) => (
                  <button type="button" onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.chain().focus().unsetFontSize().run()}
                    className={`w-full text-left px-4 py-1 text-xs ${active ? 'bg-gray-100 text-gray-700' : 'text-gray-500'}`}
                  >
                    Default
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-1.5 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-1.5 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-1.5 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`p-1.5 rounded ${editor.isActive({ textAlign: 'justify' }) ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>

      {/* Lists */}
      <div className="flex items-center gap-1 px-2 border-r border-gray-200">
        
        {/* Bullet List Menu */}
        <Menu as="div" className="relative">
          <div className="flex items-center">
            <button type="button" onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded-l ${editor.isActive('bulletList') ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <Menu.Button className={`p-1.5 rounded-r border-l border-gray-300 ${editor.isActive('bulletList') ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'text-gray-600 hover:bg-gray-200 bg-gray-50'}`}>
              <ChevronDown className="w-3 h-3" />
            </Menu.Button>
          </div>
          <Transition
              as={React.Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute z-10 left-0 mt-1 w-32 origin-top-left bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
                {[
                  { label: 'Disc', value: 'disc' },
                  { label: 'Circle', value: 'circle' },
                  { label: 'Square', value: 'square' },
                ].map((style) => (
                  <Menu.Item key={style.value}>
                    {({ active }) => (
                      <button type="button" onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (!editor.isActive('bulletList')) {
                            editor.commands.toggleBulletList();
                          }
                          editor.chain().focus().updateAttributes('bulletList', { listStyleType: style.value }).run();
                        }}
                        className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-sky-50 text-sky-700' : 'text-gray-700'}`}
                      >
                        {style.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
        </Menu>

        {/* Numbered List Menu */}
        <Menu as="div" className="relative">
          <div className="flex items-center">
            <button type="button" onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded-l ${editor.isActive('orderedList') ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <Menu.Button className={`p-1.5 rounded-r border-l border-gray-300 ${editor.isActive('orderedList') ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'text-gray-600 hover:bg-gray-200 bg-gray-50'}`}>
              <ChevronDown className="w-3 h-3" />
            </Menu.Button>
          </div>
          <Transition
              as={React.Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute z-10 left-0 mt-1 w-48 origin-top-left bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
                {[
                  { label: 'Decimal (1, 2, 3)', value: 'decimal' },
                  { label: 'Lower Alpha (a, b, c)', value: 'lower-alpha' },
                  { label: 'Upper Alpha (A, B, C)', value: 'upper-alpha' },
                  { label: 'Lower Roman (i, ii, iii)', value: 'lower-roman' },
                  { label: 'Upper Roman (I, II, III)', value: 'upper-roman' },
                ].map((style) => (
                  <Menu.Item key={style.value}>
                    {({ active }) => (
                      <button type="button" onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (!editor.isActive('orderedList')) {
                            editor.commands.toggleOrderedList();
                          }
                          editor.chain().focus().updateAttributes('orderedList', { listStyleType: style.value }).run();
                        }}
                        className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-sky-50 text-sky-700' : 'text-gray-700'}`}
                      >
                        {style.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
        </Menu>

        <div className="w-px h-4 bg-gray-200 mx-0.5"></div>

        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().outdent().run()}
          disabled={!editor.can().outdent()}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
          title="Decrease Indent"
        >
          <Outdent className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().indent().run()}
          disabled={!editor.can().indent()}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
          title="Increase Indent"
        >
          <Indent className="w-4 h-4" />
        </button>
      </div>
      {/* Unified Table Tools */}
      <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
        <TableToolsDropdown editor={editor} />
        
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
          title="Horizontal Line"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Dynamic Fields Dropdowns */}
      <div className="flex items-center gap-2 px-2">
        <LetterDropdown insertVariable={insertVariable} />
        <ClientDropdown insertVariable={insertVariable} />
        <CaseDropdown insertVariable={insertVariable} />
      </div>
    </div>
  );
};
