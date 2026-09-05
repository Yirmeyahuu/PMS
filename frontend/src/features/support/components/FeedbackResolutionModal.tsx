import React, { useEffect, useState } from 'react';
import { supportApi } from '../support.api';
import type { UserFeedback } from '@/types/support';
import { Loader2, CheckCircle, Info, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  feedbackId: number | null;
}

export const FeedbackResolutionModal: React.FC<Props> = ({ isOpen, onClose, feedbackId }) => {
  const [feedback, setFeedback] = useState<UserFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && feedbackId) {
      loadFeedback();
    } else {
      setFeedback(null);
    }
  }, [isOpen, feedbackId]);

  const loadFeedback = async () => {
    try {
      setIsLoading(true);
      const data = await supportApi.getFeedbackDetails(feedbackId!);
      setFeedback(data);
    } catch (error: any) {
      console.error('Failed to load feedback details', error);
      toast.error('Failed to load resolution details.');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div onClick={onClose} className="absolute inset-0" />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">Feedback Resolved</h2>
              <p className="text-xs text-gray-500 font-medium tracking-wide">
                Issue #{feedbackId}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading || !feedback ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
              <p className="text-sm">Loading resolution details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Original Feedback Summary */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Original Feedback</h3>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">{feedback.title}</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {feedback.description}
                </p>
              </div>

              {/* Resolution Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-sky-500" />
                  Resolution Details
                </h3>

                <div className="space-y-5 pl-2 border-l-2 border-emerald-200">
                  
                  {feedback.resolution_summary && (
                    <div className="pl-4 relative">
                      <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <h5 className="text-sm font-medium text-gray-900 mb-1">Summary</h5>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {feedback.resolution_summary}
                      </p>
                    </div>
                  )}

                  {feedback.resolution_root_cause && (
                    <div className="pl-4 relative">
                      <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <h5 className="text-sm font-medium text-gray-900 mb-1">Root Cause</h5>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {feedback.resolution_root_cause}
                      </p>
                    </div>
                  )}

                  {feedback.resolution_details && (
                    <div className="pl-4 relative">
                      <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <h5 className="text-sm font-medium text-gray-900 mb-1">Details & Actions Taken</h5>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {feedback.resolution_details}
                      </p>
                    </div>
                  )}

                  {!feedback.resolution_summary && !feedback.resolution_root_cause && !feedback.resolution_details && (
                    <div className="pl-4 relative">
                      <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-gray-300 ring-4 ring-white" />
                      <p className="text-sm text-gray-500 italic">No detailed resolution text was provided.</p>
                    </div>
                  )}

                </div>
              </div>

              {/* Meta */}
              <div className="pt-5 mt-5 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500 bg-gray-50/50 p-4 rounded-lg">
                <div>
                  <span className="font-medium text-gray-700">Resolved By:</span>{' '}
                  {feedback.resolved_by_name || 'System Admin'}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Resolved At:</span>{' '}
                  {feedback.resolved_at ? new Date(feedback.resolved_at).toLocaleString() : 'N/A'}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Submitted At:</span>{' '}
                  {new Date(feedback.created_at).toLocaleString()}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
