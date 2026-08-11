const fs = require('fs');

let content = fs.readFileSync('src/features/manage/pages/clinical/components/editor/EditorToolbar.tsx', 'utf8');

// 1. Add useState
content = content.replace("import React from 'react';", "import React, { useState } from 'react';");

// 2. Add TableGridSelector Component
const tableGridSelector = `
const TableGridSelector = ({ onSelect }: { onSelect: (rows: number, cols: number) => void }) => {
  const [hovered, setHovered] = useState({ r: 0, c: 0 });
  const maxRows = 6;
  const maxCols = 6;

  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="text-xs text-gray-500 text-center font-medium">
        {hovered.r > 0 && hovered.c > 0 ? \`\${hovered.c} × \${hovered.r}\` : 'Insert Table'}
      </div>
      <div 
        className="grid gap-1 mx-auto" 
        style={{ gridTemplateColumns: \`repeat(\${maxCols}, minmax(0, 1fr))\` }}
        onMouseLeave={() => setHovered({ r: 0, c: 0 })}
      >
        {Array.from({ length: maxRows }).map((_, r) =>
          Array.from({ length: maxCols }).map((_, c) => (
            <div
              key={\`\${r}-\${c}\`}
              className={\`w-4 h-4 border rounded-sm cursor-pointer transition-colors duration-75 \${
                r < hovered.r && c < hovered.c
                  ? 'bg-sky-200 border-sky-400'
                  : 'bg-gray-50 border-gray-200 hover:border-sky-300'
              }\`}
              onMouseEnter={() => setHovered({ r: r + 1, c: c + 1 })}
              onClick={() => onSelect(r + 1, c + 1)}
            />
          ))
        )}
      </div>
    </div>
  );
};
`;

content = content.replace("export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {", tableGridSelector + "\nexport const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {");

// 3. Remove addTable
content = content.replace(/  const addTable = \(\) => \{\n    editor\.chain\(\)\.focus\(\)\.insertTable\(\{ rows: 3, cols: 3, withHeaderRow: true \}\)\.run\(\);\n  \};\n/, '');

// 4. Update the Table insertion button
const oldTableButton = `<button type="button" onMouseDown={(e) => e.preventDefault()}
          onClick={addTable}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>`;

const newTableButton = `<Menu as="div" className="relative">
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
        </Menu>`;

content = content.replace(oldTableButton, newTableButton);

// 5. Add Contextual Table Tools next to Insert Elements
const contextualTableTools = `{editor.isActive('table') && (
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
                  <div key={\`divider-\${index}\`} className="w-full h-px bg-gray-100 my-1"></div>
                ) : (
                  <Menu.Item key={item.label}>
                    {({ active }) => (
                      <button type="button" onMouseDown={(e) => e.preventDefault()}
                        onClick={item.action}
                        className={\`w-full text-left px-4 py-1.5 text-sm \${active ? (item.danger ? 'bg-red-50 text-red-700' : 'bg-sky-50 text-sky-700') : (item.danger ? 'text-red-600' : 'text-gray-700')}\`}
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
      )}`;

content = content.replace('{/* Dynamic Fields Dropdowns */}', contextualTableTools + '\\n\\n      {/* Dynamic Fields Dropdowns */}');

fs.writeFileSync('src/features/manage/pages/clinical/components/editor/EditorToolbar.tsx', content);

