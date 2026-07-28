import React from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DuplicateToastProps {
  t: any;
  duplicatePatientId: number;
}

export const DuplicateToast: React.FC<DuplicateToastProps> = ({ t, duplicatePatientId }) => {
  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-white shadow-xl rounded-lg pointer-events-auto flex flex-col ring-1 ring-black ring-opacity-5 overflow-hidden`}
    >
      <div className="p-4 flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-6 w-6 text-yellow-500" />
        </div>
        <div className="ml-3 w-0 flex-1 pt-0.5">
          <p className="text-sm font-bold text-gray-900">
            Possible Duplicate Patient
          </p>
          <p className="mt-1 text-sm text-gray-500">
            A patient with similar demographic information already exists. A new profile was created, but please review if they are the same person.
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-row-reverse gap-2 border-t border-gray-100">
        <Link
          to="/patients"
          onClick={() => toast.dismiss(t.id)}
          className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-sky-600 text-base font-medium text-white hover:bg-sky-700 focus:outline-none sm:text-sm"
        >
          Merge Clients
        </Link>
        <Link
          to={`/patients/${duplicatePatientId}`}
          onClick={() => toast.dismiss(t.id)}
          className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
        >
          View Existing
        </Link>
      </div>
    </div>
  );
};
