import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useParams, useNavigate } from 'react-router-dom';
import { ClipboardList, Check, ChevronRight } from 'lucide-react';
import { usePatientProfileContext } from '../context/PatientProfileContext';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';

export const ClinicalNoteNavItem = () => {
  const { cases, patient } = usePatientProfileContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { caseId } = useParams();
  
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'right-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(10), flip(), shift({ padding: 8 })],
  });

  const hover = useHover(context, {
    enabled: window.matchMedia('(hover: hover)').matches,
    delay: { open: 0, close: 300 },
  });
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    dismiss,
    role,
  ]);

  const activeCases = cases.filter(c => !c.is_archived);
  const isCustomActive = new RegExp('/clinical(/|-documentation)').test(location.pathname);

  const handleClick = (e: React.MouseEvent) => {
    // On mobile/touch devices, toggle the menu explicitly since hover isn't reliable
    if (!window.matchMedia('(hover: hover)').matches) {
      e.preventDefault(); 
      setIsOpen(!isOpen);
    }
  };

  const handleCaseSelect = (selectedCaseId: number) => {
    setIsOpen(false);
    navigate(`/patients/${patient?.id}/cases/${selectedCaseId}/clinical-documentation`);
  };

  return (
    <>
      <NavLink
        ref={refs.setReference}
        {...getReferenceProps({
          onClick: handleClick
        })}
        to={`/patients/${patient?.id}/clinical`}
        className={({ isActive }) => {
          const active = isCustomActive !== undefined ? isCustomActive : isActive;
          return `flex items-center justify-between rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
            active
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-sky-50 hover:text-sky-700'
          }`;
        }}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <ClipboardList className="w-4 h-4" />
          <span>Clinical note</span>
        </div>
        {isOpen && <ChevronRight className="w-4 h-4 opacity-70 pointer-events-none" />}
      </NavLink>

      {/* Floating Panel in Portal to escape overflow:hidden on sidebar */}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 "
          >
            <div className="bg-sky-600 text-white rounded-xl shadow-xl overflow-hidden py-2 border border-sky-700/50 w-64">
              <div className="px-4 py-2 border-b border-sky-500/30">
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-100">Select Case</h3>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {activeCases.length === 0 ? (
                  <div className="px-4 py-4 text-center">
                    <p className="text-sm font-medium text-sky-100">No Cases found.</p>
                    <p className="text-xs text-sky-200 mt-1">Create a Case first.</p>
                  </div>
                ) : (
                  <ul className="py-1">
                    {activeCases.map((c) => {
                      const isSelected = String(c.id) === String(caseId);
                      return (
                        <li key={c.id}>
                          <button
                            onClick={() => handleCaseSelect(c.id)}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-start justify-between transition-colors hover:bg-sky-500 ${
                              isSelected ? 'bg-sky-700/50 font-medium' : ''
                            }`}
                          >
                            <div className="flex-1 pr-3">
                              <div className="flex items-center gap-2">
                                {isSelected && <Check className="w-3.5 h-3.5 text-sky-200 shrink-0" />}
                                <span className="truncate">{c.title}</span>
                              </div>
                              {c.approved_sessions && (
                                <div className="text-[11px] text-sky-200 mt-0.5 ml-5">
                                  Completed {c.completed_sessions} / {c.approved_sessions}
                                </div>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-sky-500/30 bg-sky-700/30 hover:bg-sky-700/50 transition-colors">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate(`/patients/${patient?.id}/cases`);
                  }}
                  className="text-xs font-semibold text-sky-100 w-full text-center flex items-center justify-center gap-1"
                >
                  View All Cases <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
