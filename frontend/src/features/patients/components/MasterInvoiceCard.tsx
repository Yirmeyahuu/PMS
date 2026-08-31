import React from 'react';
import { FileText, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { Invoice } from '@/types/billing';

interface MasterInvoiceCardProps {
  invoice: Invoice;
  onClick: (invoice: Invoice) => void;
}

export const MasterInvoiceCard: React.FC<MasterInvoiceCardProps> = ({ invoice, onClick }) => {
  const isFullyPaid = invoice.balance_due === '0.00';
  
  return (
    <div 
      onClick={() => onClick(invoice)}
      className="bg-white border border-sky-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-2 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-sky-50 rounded-bl-full -z-0 opacity-50" />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-tight">
              {invoice.case_name || 'Master Invoice'}
            </h3>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-100 text-sky-700 mt-0.5">
              {invoice.package_name || 'Package'}
            </span>
          </div>
        </div>
        
        <div className="text-right ml-2 shrink-0">
          <div className="text-lg font-bold text-gray-900 leading-tight">
            ₱{parseFloat(invoice.total_amount).toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-500 font-medium">Package Total</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 relative z-10">
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
          <div className="text-[10px] text-gray-500 mb-0.5">Total Paid</div>
          <div className="font-semibold text-sm text-emerald-600 leading-tight">
            ₱{parseFloat(invoice.amount_paid).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
          <div className="text-[10px] text-gray-500 mb-0.5">Outstanding</div>
          <div className={`font-semibold text-sm leading-tight ${isFullyPaid ? 'text-gray-900' : 'text-rose-600'}`}>
            ₱{parseFloat(invoice.balance_due).toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-100 relative z-10">
        <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>Created {invoice.invoice_date}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{invoice.version_count} Versions</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          {isFullyPaid ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
              <CheckCircle className="w-3.5 h-3.5" />
              Paid
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
              <AlertCircle className="w-3.5 h-3.5" />
              Pending
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
