import React from 'react';
import { EditorContent, Editor } from '@tiptap/react';
import { LayoutTemplate } from 'lucide-react';

interface LetterDocumentEditorProps {
  bodyEditor: Editor | null;
  layoutLetterHead: boolean;
  layoutRemoveTopSpace: boolean;
  layoutDate: boolean;
  layoutAddressee: boolean;
}

export const LetterDocumentEditor: React.FC<LetterDocumentEditorProps> = ({
  bodyEditor,
  layoutLetterHead,
  layoutRemoveTopSpace,
  layoutDate,
  layoutAddressee,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-gray-100">
      
      {/* 
        Visual CSS Pagination!
        This wrapper is exactly A4 width (794px).
        It uses a repeating linear gradient to draw a 24px gray gap every 1123px (A4 height).
        This visually splits the continuous white document into separate A4 pages on the gray background!
      */}
      <div 
        className={`w-[794px] min-h-[1123px] flex flex-col mb-16 shadow-md relative group ${layoutRemoveTopSpace ? 'pt-0' : 'pt-12'}`}
        style={{
          backgroundColor: 'white',
          backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 1099px, #f3f4f6 1099px, #f3f4f6 1123px)'
        }}
      >
        
        {/* Placeholders (Now back in React, but properly padded to match body) */}
        <div className="flex flex-col w-full px-12">
          {layoutLetterHead && (
            <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 select-none">
              <LayoutTemplate className="w-5 h-5 mr-2 text-gray-300" />
              <span className="font-medium tracking-wide">CLINIC LETTER HEAD</span>
            </div>
          )}

          {layoutDate && (
            <div className="mb-4 p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400 text-sm w-48 select-none">
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}

          {layoutAddressee && (
            <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400 text-sm w-72 select-none flex flex-col gap-1">
              <div className="text-gray-500 font-medium">[Patient Full Name]</div>
              <div>[Patient Address Line 1]</div>
              <div>[Patient Suburb, State, Postcode]</div>
            </div>
          )}
        </div>

        {/* 
          Body Region - Dashed border strictly around the editable text area!
          Margins match the placeholders exactly (mx-12).
        */}
        <div 
          className="mx-12 mb-12 flex-1 cursor-text border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400 transition-colors"
          onClick={() => bodyEditor?.commands.focus()}
        >
          <EditorContent editor={bodyEditor} className="prose prose-sm max-w-none focus:outline-none min-h-[400px]" />
        </div>

      </div>
    </div>
  );
};
