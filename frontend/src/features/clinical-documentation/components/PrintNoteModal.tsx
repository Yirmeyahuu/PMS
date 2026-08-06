import React, { useState, useCallback } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { ClinicalNotePrintTemplate } from './ClinicalNotePrintTemplate';
import type { ClinicalNote, ClinicalTemplate } from '@/types/clinicalTemplate';
import type { Appointment } from '@/types';

interface PrintNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: ClinicalNote;
  template: ClinicalTemplate | null;
  appointment?: Appointment | null;
  patientName: string;
  clinicName?: string;
  clinicLogoUrl?: string;
}

export const PrintNoteModal: React.FC<PrintNoteModalProps> = ({
  isOpen,
  onClose,
  note,
  template,
  appointment,
  patientName,
  clinicName,
  clinicLogoUrl,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdfBlob = useCallback(async (): Promise<Blob | null> => {
    try {
      const A4_WIDTH_PX = 794;
      const A4_HEIGHT_PX = 1122;

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = `${A4_WIDTH_PX}px`;
      container.style.minHeight = `${A4_HEIGHT_PX}px`;
      container.style.background = 'white';
      container.style.zIndex = '-1';
      container.style.overflow = 'hidden';
      document.body.appendChild(container);

      const root = createRoot(container);
      await new Promise<void>((resolve) => {
        root.render(
            <ClinicalNotePrintTemplate
              note={note}
              template={template}
              appointment={appointment}
              patientName={patientName}
              clinicName={clinicName}
              clinicLogoUrl={clinicLogoUrl}
              className="!max-w-none"
            />
        );
        setTimeout(resolve, 1000); // Wait for render
      });

      const captureHeight = Math.max(container.scrollHeight, A4_HEIGHT_PX);
      const canvas = await html2canvas(container, {
        scale: 2, // Higher scale for better print quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: A4_WIDTH_PX,
        height: captureHeight,
        windowWidth: A4_WIDTH_PX,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const maxHeight = 297;
      if (pdfHeight > maxHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, maxHeight);
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const pdfBlob = pdf.output('blob');
      
      root.unmount();
      document.body.removeChild(container);
      
      return pdfBlob;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  }, [note, template, appointment, patientName]);

  const handlePrint = async () => {
    setIsGenerating(true);
    const pdfBlob = await generatePdfBlob();
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 1000);
        };
      }
    }
    setIsGenerating(false);
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    const pdfBlob = await generatePdfBlob();
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ClinicalNote_${patientName.replace(/ /g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setIsGenerating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-5">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-slate-100 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Printer className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Print Preview</h2>
              <p className="text-sm text-slate-500 font-medium">Patient: {patientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm shadow-indigo-600/20"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Print Note
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content (Preview) */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-100/80">
          <div className="max-w-[800px] mx-auto shadow-xl ring-1 ring-slate-900/5">
            <ClinicalNotePrintTemplate
              note={note}
              template={template}
              appointment={appointment}
              patientName={patientName}
              clinicName={clinicName}
              clinicLogoUrl={clinicLogoUrl}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
