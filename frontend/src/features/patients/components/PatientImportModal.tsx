import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Loader2, FileType, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { importPatients } from '../patient.api';

interface PatientImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  onDownloadTemplate: (format: 'csv' | 'xlsx') => void;
}

export const PatientImportModal: React.FC<PatientImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onDownloadTemplate,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<{row: number, details: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validTypes.includes(selected.type) && !selected.name.endsWith('.csv') && !selected.name.endsWith('.xlsx')) {
        toast.error('Invalid file format. Please upload a .csv or .xlsx file.');
        return;
      }
      setFile(selected);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected = e.dataTransfer.files[0];
      if (selected.name.endsWith('.csv') || selected.name.endsWith('.xlsx')) {
        setFile(selected);
      } else {
        toast.error('Invalid file format. Please upload a .csv or .xlsx file.');
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setIsUploading(true);
    setErrors([]);
    try {
      const response = await importPatients(file);
      toast.success(response.detail || 'Clients imported successfully');
      onImportSuccess();
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        toast.error('Validation failed. No clients were imported.');
      } else {
        toast.error(error.response?.data?.detail || 'Import failed');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Import Clients</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {/* Step 1: Download Template */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">1. Download Template</h3>
              <p className="text-sm text-gray-500 mb-4">
                To ensure correct data formatting, please use our standardized template.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => onDownloadTemplate('csv')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileType className="w-4 h-4 text-green-600" />
                  Download CSV
                </button>
                <button
                  onClick={() => onDownloadTemplate('xlsx')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  Download XLSX
                </button>
              </div>
            </div>

            {/* Step 2: Upload File */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">2. Upload File</h3>
              
              {!file ? (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-sky-500 hover:bg-sky-50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900 mb-1">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">CSV or XLSX up to 10MB</p>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef}
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px] sm:max-w-xs">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setFile(null)}
                    disabled={isUploading}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Validation Errors */}
            {errors.length > 0 && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-red-100 border-b border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h4 className="text-sm font-semibold text-red-900">Validation Errors ({errors.length})</h4>
                </div>
                <div className="p-4 max-h-48 overflow-y-auto">
                  <ul className="space-y-2">
                    {errors.map((err, idx) => (
                      <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                        <span className="font-mono bg-red-200 px-1.5 py-0.5 rounded text-xs mt-0.5 shrink-0">Row {err.row}</span>
                        <span>{err.details}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || isUploading}
              className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Validate & Import
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
