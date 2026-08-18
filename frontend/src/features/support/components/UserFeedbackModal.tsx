import React, { useState, useRef } from 'react';
import { supportApi } from '../support.api';
import type { CreateFeedbackPayload, FeedbackType, FeedbackPriority } from '@/types/support';
import toast from 'react-hot-toast';

interface UserFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultModule?: string;
}

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const UserFeedbackModal: React.FC<UserFeedbackModalProps> = ({ isOpen, onClose, defaultModule = 'OTHER' }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateFeedbackPayload>>({
    type: 'BUG',
    priority: 'MEDIUM',
    module: defaultModule,
    title: '',
    description: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update formData when defaultModule changes (e.g., URL changes while modal is closed)
  React.useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, module: defaultModule }));
    }
  }, [isOpen, defaultModule]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      if (files.length + selectedFiles.length > MAX_ATTACHMENTS) {
        toast.error(`You can only attach a maximum of ${MAX_ATTACHMENTS} files.`);
        return;
      }

      const validFiles = selectedFiles.filter(file => {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`File ${file.name} is too large. Max size is 5MB.`);
          return false;
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          toast.error(`File ${file.name} is not a valid image format (JPG, PNG, WEBP).`);
          return false;
        }
        return true;
      });

      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getBrowserInfo = () => {
    return {
      browser: navigator.appName,
      os: navigator.platform,
      user_agent: navigator.userAgent,
      page_url: window.location.href,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error('Title and description are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateFeedbackPayload = {
        ...formData,
        ...getBrowserInfo(),
      } as CreateFeedbackPayload;

      // 1. Submit the feedback report
      const feedback = await supportApi.createFeedback(payload);

      // 2. Upload attachments if any exist
      if (files.length > 0) {
        toast.loading('Uploading attachments...', { id: 'upload' });
        for (const file of files) {
          await supportApi.uploadAttachment(feedback.id, file);
        }
        toast.success('Attachments uploaded!', { id: 'upload' });
      }

      toast.success('Report submitted successfully! Thank you for your feedback.');
      onClose();
      setFormData({ type: 'BUG', priority: 'MEDIUM', module: defaultModule, title: '', description: '' });
      setFiles([]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm lg:justify-end lg:pr-12">
      <div onClick={onClose} className="absolute inset-0" />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Submit Feedback & Reports</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                className="w-full border rounded-md p-2 focus:ring-healing-mint focus:border-healing-mint"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as FeedbackType })}
                required
              >
                <option value="BUG">Bug Report</option>
                <option value="FEATURE_REQUEST">Feature Request</option>
                <option value="GENERAL_FEEDBACK">General Feedback</option>
                <option value="SUPPORT">Support Request</option>
                <option value="PRIVACY">Privacy Concern</option>
                <option value="SECURITY">Security Concern</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                className="w-full border rounded-md p-2 focus:ring-healing-mint focus:border-healing-mint"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as FeedbackPriority })}
                required
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              className="w-full border rounded-md p-2 focus:ring-healing-mint focus:border-healing-mint"
              placeholder="Brief summary of the issue"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border rounded-md p-2 h-32 focus:ring-healing-mint focus:border-healing-mint"
              placeholder="Please describe the issue in detail. Steps to reproduce are highly appreciated."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Privacy Warning:</strong> Please avoid including unnecessary patient or clinical information in screenshots. Only attach information necessary to describe the issue.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachments (Optional)</label>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
            />
            
            <div className="flex flex-wrap gap-4">
              {files.map((file, index) => (
                <div key={index} className="relative group border rounded p-2 flex flex-col items-center justify-center w-24 h-24 bg-gray-50">
                  <span className="text-xs text-center truncate w-full" title={file.name}>{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}

              {files.length < MAX_ATTACHMENTS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center w-24 h-24 text-gray-500 hover:border-healing-mint hover:text-healing-mint transition-colors"
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  <span className="text-xs">Add File</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-healing-mint text-white rounded-md hover:bg-healing-mint/90 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
