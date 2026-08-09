import React from 'react';
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
  ChevronDown
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

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  const insertVariable = (id: string, label: string) => {
    editor.chain().focus().insertMergeField({ id, label }).run();
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
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
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
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
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded ${editor.isActive('underline') ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded ${editor.isActive('strike') ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-1.5 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-1.5 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-1.5 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`p-1.5 rounded ${editor.isActive({ textAlign: 'justify' }) ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>

      {/* Lists */}
      <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      {/* Insert Elements */}
      <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
        <button
          onClick={addTable}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>
        <button
          onClick={addImage}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
          title="Horizontal Line"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

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
                      <button
                        type="button"
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
