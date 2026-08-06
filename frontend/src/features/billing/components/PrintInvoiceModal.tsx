import React, { useEffect, useState, useRef } from 'react';
import { X, Printer, Loader2, AlertCircle } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import type { Invoice } from '@/types/billing';

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen && invoice) {
      const fetchPrintHtml = async () => {
        setIsLoading(true);
        setError('');
        try {
          // Fetch the HTML content that the backend generates for printing
          const response = await axiosInstance.get(`/invoices/${invoice.id}/print/`);
          setHtml(response.data);
        } catch (err: any) {
          console.error('Failed to load print preview:', err);
          setError('Failed to load print preview. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchPrintHtml();
    } else {
      setHtml('');
      setError('');
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        
        {/* Modal */}
        <div className="relative w-full max-w-4xl bg-slate-50 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 rounded-t-2xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Printer className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Print Preview</h2>
                <p className="text-sm text-slate-500">Invoice {invoice.invoice_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                disabled={isLoading || !!error}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                Print Invoice
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-5 bg-slate-100/50">
            <div className="max-w-[210mm] mx-auto bg-white shadow-sm ring-1 ring-slate-200 min-h-[297mm] rounded-sm relative">
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                  <p className="text-slate-600 font-medium">Generating preview...</p>
                </div>
              )}
              
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10 p-5 text-center">
                  <div>
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <p className="text-slate-900 font-medium">{error}</p>
                    <button
                      onClick={onClose}
                      className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {html && (
                <iframe
                  ref={iframeRef}
                  srcDoc={html}
                  title="Print Preview"
                  className="w-full h-[1000px] border-0"
                  style={{ minHeight: '297mm' }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
