import React, { useState } from 'react';
import { FileText, CheckCircle, ChevronRight, Edit2 } from 'lucide-react';
import type { Letter } from '../api/letters.api';
import { ViewLetterModal } from './ViewLetterModal';

interface LetterFeedItemProps {
  letter: Letter;
  onRefreshFeed: () => void;
}

export const LetterFeedItem: React.FC<LetterFeedItemProps> = ({
  letter,
  onRefreshFeed: _onRefreshFeed
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
      isExpanded ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-slate-200 shadow-sm hover:border-slate-300'
    }`}>
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-4 flex items-start gap-4 cursor-pointer select-none group"
      >
        <div className={`mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-indigo-500' : 'text-slate-400 group-hover:text-slate-600'}`}>
          <ChevronRight className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className={`text-base font-semibold truncate ${isExpanded ? 'text-indigo-900' : 'text-slate-900'}`}>
                {letter.subject}
              </h3>
              {letter.status === 'DRAFT' && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded uppercase tracking-wider shrink-0">
                  Draft
                </span>
              )}
              {letter.status === 'FINAL' && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded flex items-center gap-1 uppercase tracking-wider shrink-0">
                  <CheckCircle className="w-3 h-3" />
                  Final
                </span>
              )}
            </div>
            
            <div className="text-sm font-medium text-slate-500 shrink-0">
              {formatDate(letter.created_at)}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Generated Letter
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-6">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 prose prose-slate max-w-none whitespace-pre-wrap">
             <div dangerouslySetInnerHTML={{ __html: (letter as any).content_html || 'No content.' }} />
          </div>
          
          {letter.status === 'DRAFT' && (
            <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
              >
                <Edit2 className="w-4 h-4" />
                Edit Letter
              </button>
            </div>
          )}
        </div>
      )}

      <ViewLetterModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        letter={letter}
        onUpdate={_onRefreshFeed}
      />
    </div>
  );
};
