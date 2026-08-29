import { useState } from 'react';
import { X, Download, FileText, Trash2, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { deleteCaseDocument, type CaseDocument } from '../api/caseDocuments.api';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface DocumentPreviewModalProps {
  document: CaseDocument;
  onClose: () => void;
  onDeleteSuccess?: () => void;
}

export const DocumentPreviewModal = ({ document: doc, onClose, onDeleteSuccess }: DocumentPreviewModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const isPdf = doc.mime_type === 'application/pdf' || (doc.file_name && doc.file_name.toLowerCase().endsWith('.pdf'));
  
  const handleDownload = () => {
    // Open the file in a new tab which usually triggers a download for non-PDFs
    window.open(doc.file, '_blank');
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteCaseDocument(doc.id);
      toast.success('Document deleted successfully');
      setShowConfirmDelete(false);
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (error) {
      toast.error('Failed to delete document');
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 truncate" title={doc.file_name}>
                {doc.title || doc.file_name}
              </h2>
              <p className="text-xs text-slate-500">
                Uploaded by {doc.uploaded_by_name} • {new Date(doc.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button 
              onClick={() => setShowConfirmDelete(true)}
              disabled={isDeleting}
              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Delete Document"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-slate-100 overflow-hidden relative flex flex-col items-center justify-center">
          {isPdf ? (
            <iframe 
              src={`${doc.file}#view=FitH`} 
              title={doc.file_name}
              className="w-full h-full border-none"
            />
          ) : (
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center mx-4">
              <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Preview Unavailable</h3>
              <p className="text-slate-600 text-sm mb-6">
                The uploaded document is in DOCX or DOC format, which disables the inline preview. Please download the file to view its contents.
              </p>
              
              <div className="bg-slate-50 rounded-lg p-4 text-left mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Filename:</span>
                  <span className="font-medium text-slate-700 truncate ml-4" title={doc.file_name}>{doc.file_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Size:</span>
                  <span className="font-medium text-slate-700">{(doc.file_size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmDeleteModal 
        isOpen={showConfirmDelete}
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirmDelete(false)}
        isDeleting={isDeleting}
      />
    </div>,
    document.body
  );
};
