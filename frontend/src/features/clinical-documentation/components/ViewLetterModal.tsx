import React, { useState, useEffect } from 'react';
import { X, FileText, Clock, Edit2, Save, Loader2 } from 'lucide-react';
import { updateLetter, type Letter } from '../api/letters.api';
import toast from 'react-hot-toast';

interface ViewLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  letter: Letter;
  onUpdate?: () => void;
}

export const ViewLetterModal: React.FC<ViewLetterModalProps> = ({ isOpen, onClose, letter, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && letter) {
      setEditedContent(letter.content_html || '');
      setEditedSubject(letter.subject || '');
      setIsEditing(false);
    }
  }, [isOpen, letter]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateLetter(letter.id, {
        subject: editedSubject,
        content_html: editedContent
      });
      toast.success('Letter updated successfully');
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to update letter');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50 shrink-0">
          <div className="flex-1">
            {isEditing ? (
              <input 
                type="text" 
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="text-xl font-heading text-slate-900 border border-indigo-300 rounded px-2 py-1 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <h2 className="text-xl font-heading text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                {letter.subject || 'Letter'}
              </h2>
            )}
            <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(letter.created_at).toLocaleString()}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                letter.status === 'FINAL' || letter.status === 'SENT' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {letter.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {letter.status === 'DRAFT' && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Draft
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {isEditing ? (
            <textarea
              className="w-full h-full min-h-[400px] p-4 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y whitespace-pre-wrap font-mono text-sm"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
            />
          ) : (
            <div className="prose prose-slate max-w-none whitespace-pre-wrap">
              <div dangerouslySetInnerHTML={{ __html: (letter as any).content_html || 'No content.' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
