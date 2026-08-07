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
      className="bg-white border border-sky-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-4 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full -z-0 opacity-50" />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">
              {invoice.case_name || 'Master Invoice'}
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-700">
              {invoice.package_name || 'Package'}
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            ₱{parseFloat(invoice.total_amount).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 font-medium">Package Total</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Total Paid</div>
          <div className="font-semibold text-emerald-600">
            ₱{parseFloat(invoice.amount_paid).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Outstanding</div>
          <div className={`font-semibold ${isFullyPaid ? 'text-gray-900' : 'text-rose-600'}`}>
            ₱{parseFloat(invoice.balance_due).toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-100 relative z-10">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Created {invoice.invoice_date}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
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
