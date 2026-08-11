import React from 'react';
import { LayoutTemplate } from 'lucide-react';

interface LetterDocumentLayoutPanelProps {
  layoutLetterHead: boolean;
  setLayoutLetterHead: (v: boolean) => void;
  layoutRemoveTopSpace: boolean;
  setLayoutRemoveTopSpace: (v: boolean) => void;
  layoutDate: boolean;
  setLayoutDate: (v: boolean) => void;
  layoutAddressee: boolean;
  setLayoutAddressee: (v: boolean) => void;
}

const LayoutToggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (c: boolean) => void }) => (
  <label className="flex items-center justify-between cursor-pointer group">
    <span className="text-xs font-semibold text-gray-600 tracking-wider group-hover:text-gray-900 transition-colors">{label}</span>
    <div 
      className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${checked ? 'bg-sky-500' : 'bg-gray-300'}`}
      onClick={(e) => { e.preventDefault(); onChange(!checked); }}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </label>
);

export const LetterDocumentLayoutPanel: React.FC<LetterDocumentLayoutPanelProps> = ({
  layoutLetterHead,
  setLayoutLetterHead,
  layoutRemoveTopSpace,
  setLayoutRemoveTopSpace,
  layoutDate,
  setLayoutDate,
  layoutAddressee,
  setLayoutAddressee,
}) => {
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 overflow-hidden">
      <div className="pt-5 pb-5 pl-5 pr-14 border-b border-gray-100 bg-gray-50/80 backdrop-blur">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2 uppercase tracking-wide">
          <LayoutTemplate className="w-4 h-4 text-sky-600" />
          Document Layout
        </h3>
        <p className="text-xs text-gray-500 mt-1">Configure standard elements</p>
      </div>
      <div className="pt-5 pb-5 pl-5 pr-14 flex flex-col gap-5">
        <LayoutToggle label="LETTER HEAD" checked={layoutLetterHead} onChange={setLayoutLetterHead} />
        <div className="h-px bg-gray-100 w-full" />
        <LayoutToggle label="REMOVE TOP SPACE" checked={layoutRemoveTopSpace} onChange={setLayoutRemoveTopSpace} />
        <div className="h-px bg-gray-100 w-full" />
        <LayoutToggle label="DATE" checked={layoutDate} onChange={setLayoutDate} />
        <div className="h-px bg-gray-100 w-full" />
        <LayoutToggle label="ADDRESSEE" checked={layoutAddressee} onChange={setLayoutAddressee} />
      </div>
      <div className="mt-auto pt-5 pb-5 pl-5 pr-14 bg-sky-50/50 text-xs text-sky-700 leading-relaxed border-t border-sky-100">
        <strong>Tip:</strong> Checked elements will be automatically injected into the final generated letter PDF.
      </div>
    </div>
  );
};
