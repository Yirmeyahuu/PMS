import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, File as FileIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadCaseDocument } from '../api/caseDocuments.api';
import type { PatientCase } from '@/types/patient';

interface UploadDocumentModalProps {
  patientId: string | number;
  cases: PatientCase[];
  preSelectedCaseId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 'CLINICAL_NOTE', label: 'Clinical Note' },
  { value: 'LETTER', label: 'Letter' },
  { value: 'REPORT', label: 'Report' },
  { value: 'LAB_RESULT', label: 'Lab Result' },
  { value: 'IMAGING', label: 'Imaging' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'ATTACHMENT', label: 'Attachment' },
  { value: 'OTHER', label: 'Other' },
];

export const UploadDocumentModal = ({ patientId, cases, preSelectedCaseId, onClose, onSuccess }: UploadDocumentModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus trap / escape listener
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      
      // Validation
      const ext = selected.name.split('.').pop()?.toLowerCase();
      const validExts = ['pdf', 'doc', 'docx'];
      if (!validExts.includes(ext || '')) {
        setFileError(`Unsupported file type. Only PDF, DOC, and DOCX files are allowed.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        setFileError(`File is too large. The maximum allowed file size is 5 MB.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setFile(selected);
      if (!title) {
        setTitle(selected.name.split('.')[0]); // Default title to filename without extension
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!title) {
      toast.error('Please provide a title');
      return;
    }

    try {
      setIsSubmitting(true);
      await uploadCaseDocument(
        patientId,
        preSelectedCaseId || null,
        file,
        title,
        'OTHER',
        ''
      );
      toast.success('Document uploaded successfully');
      onSuccess();
    } catch (error: any) {
      let errorMessage = 'Failed to upload document';
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'object') {
          // DRF sends errors like { file: ["Error message"], patient: ["Error message"] }
          const firstKey = Object.keys(data)[0];
          if (firstKey && Array.isArray(data[firstKey])) {
            errorMessage = `${firstKey}: ${data[firstKey][0]}`;
          } else if (data.error) {
            errorMessage = data.error;
          }
        }
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Upload Document</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* File Upload Area */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  file ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'
                }`}
              >
                <div className="space-y-1 text-center">
                  {file ? (
                    <FileIcon className="mx-auto h-12 w-12 text-indigo-500" />
                  ) : (
                    <Upload className="mx-auto h-12 w-12 text-slate-400" />
                  )}
                  <div className="flex text-sm text-slate-600 justify-center">
                    <span className="relative font-medium text-indigo-600 hover:text-indigo-500">
                      {file ? file.name : 'Upload a file'}
                    </span>
                  </div>
                  {!file && <p className="text-xs text-slate-500">PDF, DOC, DOCX up to 5MB</p>}
                  {file && <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            
            {fileError && (
              <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {fileError}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Document Title"
                required
              />
            </div>

          </div>
        </form>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !file || !title}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
