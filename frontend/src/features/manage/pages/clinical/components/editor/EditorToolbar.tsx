import React, { useState } from 'react';
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
  Image as ImageIcon,
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

const VARIABLE_GROUPS = [
  {
    label: 'Patient',
    variables: [
      { label: 'Patient First Name', value: '{{patient.first_name}}' },
      { label: 'Patient Last Name', value: '{{patient.last_name}}' },
      { label: 'Patient Full Name', value: '{{patient.full_name}}' },
      { label: 'Patient DOB', value: '{{patient.dob}}' },
      { label: 'Patient Email', value: '{{patient.email}}' },
      { label: 'Patient Phone', value: '{{patient.phone}}' },
      { label: 'Patient Address', value: '{{patient.address}}' },
    ]
  },
  {
    label: 'Practitioner',
    variables: [
      { label: 'Practitioner First Name', value: '{{practitioner.first_name}}' },
      { label: 'Practitioner Last Name', value: '{{practitioner.last_name}}' },
      { label: 'Practitioner Full Name', value: '{{practitioner.full_name}}' },
      { label: 'Practitioner Title', value: '{{practitioner.title}}' },
    ]
  },
  {
    label: 'Clinic',
    variables: [
      { label: 'Clinic Name', value: '{{clinic.name}}' },
      { label: 'Clinic Address', value: '{{clinic.address}}' },
      { label: 'Clinic Phone', value: '{{clinic.phone}}' },
      { label: 'Clinic Email', value: '{{clinic.email}}' },
    ]
  },
  {
    label: 'Appointment',
    variables: [
      { label: 'Appointment Date', value: '{{appointment.date}}' },
      { label: 'Appointment Time', value: '{{appointment.time}}' },
      { label: 'Appointment Type', value: '{{appointment.type}}' },
    ]
  },
  {
    label: 'Case',
    variables: [
      { label: 'Case Name', value: '{{case.name}}' },
      { label: 'Case Number', value: '{{case.number}}' },
      { label: 'Case Start Date', value: '{{case.start_date}}' },
    ]
  },
  {
    label: 'Date & Time',
    variables: [
      { label: 'Current Date', value: '{{date.today}}' },
      { label: 'Current Time', value: '{{time.now}}' },
    ]
  }
];

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

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  const insertVariable = (id: string, label: string) => {
    editor.chain().focus().insertMergeField({ id, label }).run();
  };



  const addImage = () => {
    const url = window.prompt('Enter Image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
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

      {/* Insert Elements */}
      <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
        <Menu as="div" className="relative">
          <Menu.Button className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Insert Table">
            <TableIcon className="w-4 h-4" />
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
            <Menu.Items className="absolute z-10 left-0 mt-1 origin-top-left bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none p-2 w-48">
              <Menu.Item>
                {({ close }) => (
                  <div onMouseDown={(e) => e.preventDefault()}>
                    <TableGridSelector onSelect={(r, c) => {
                      editor.chain().focus().insertTable({rows: r, cols: c, withHeaderRow: true}).run();
                      close();
                    }} />
                  </div>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={addImage}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
          title="Horizontal Line"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Contextual Table Tools */}
      {editor.isActive('table') && (
        <Menu as="div" className="relative ml-2">
          <Menu.Button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded hover:bg-sky-100 focus:outline-none">
            Table Tools
            <ChevronDown className="w-3 h-3 text-sky-700" />
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
              {[
                { label: 'Add Row Above', action: () => editor.chain().focus().addRowBefore().run() },
                { label: 'Add Row Below', action: () => editor.chain().focus().addRowAfter().run() },
                { label: 'Delete Row', action: () => editor.chain().focus().deleteRow().run(), danger: true },
                { divider: true },
                { label: 'Add Column Before', action: () => editor.chain().focus().addColumnBefore().run() },
                { label: 'Add Column After', action: () => editor.chain().focus().addColumnAfter().run() },
                { label: 'Delete Column', action: () => editor.chain().focus().deleteColumn().run(), danger: true },
                { divider: true },
                { label: 'Delete Table', action: () => editor.chain().focus().deleteTable().run(), danger: true },
              ].map((item, index) => (
                item.divider ? (
                  <div key={`divider-${index}`} className="w-full h-px bg-gray-100 my-1"></div>
                ) : (
                  <Menu.Item key={item.label}>
                    {({ active }) => (
                      <button type="button" onMouseDown={(e) => e.preventDefault()}
                        onClick={item.action}
                        className={`w-full text-left px-4 py-1.5 text-sm ${active ? (item.danger ? 'bg-red-50 text-red-700' : 'bg-sky-50 text-sky-700') : (item.danger ? 'text-red-600' : 'text-gray-700')}`}
                      >
                        {item.label}
                      </button>
                    )}
                  </Menu.Item>
                )
              ))}
            </Menu.Items>
          </Transition>
        </Menu>
      )}

      {/* Dynamic Fields Dropdowns */}
      <div className="flex items-center gap-2 px-2">
        {VARIABLE_GROUPS.map((group) => (
          <Menu as="div" className="relative" key={group.label}>
            <Menu.Button className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20">
              {group.label}
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
              <Menu.Items className="absolute z-10 left-0 mt-1 w-56 origin-top-left bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none py-1">
                {group.variables.map((v) => (
                  <Menu.Item key={v.value}>
                    {({ active }) => (
                      <button type="button" onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertVariable(v.value, v.label)}
                        className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-sky-50 text-sky-700' : 'text-gray-700'}`}
                      >
                        {v.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>
        ))}
      </div>
    </div>
  );
};
