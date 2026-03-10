import React, { useState } from 'react';
import {
  ShieldCheck, RefreshCcw, Loader2, Mail, AlertTriangle, CheckCircle2,
} from 'lucide-react';

interface ResetPasswordCardProps {
  userEmail:   string;
  isResetting: boolean;
  onReset:     () => Promise<boolean>;
}

export const ResetPasswordCard: React.FC<ResetPasswordCardProps> = ({
  userEmail, isResetting, onReset,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [done,      setDone]      = useState(false);

  const handleReset = async () => {
    if (!confirmed) { setConfirmed(true); return; }
    const ok = await onReset();
    if (ok) setDone(true);
  };

  const handleCancel = () => setConfirmed(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── Card header ── */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-800">Password &amp; Security</h3>
          <p className="text-xs text-gray-400 mt-0.5">Reset your account password securely</p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-6 py-6 space-y-5">

        {/* Info block */}
        <div className="flex gap-4 p-4 bg-cyan-50 border border-cyan-100 rounded-2xl">
          <Mail className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-cyan-800 mb-1">How password reset works</p>
            <p className="text-sm text-cyan-700 leading-relaxed">
              A new temporary password will be generated and sent to{' '}
              <span className="font-bold">{userEmail}</span>.
              Your current session will be terminated immediately and you
              will need to log in again using the new password.
            </p>
          </div>
        </div>

        {/* Confirmation warning */}
        {confirmed && !done && (
          <div className="flex gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">
                Are you sure you want to reset your password?
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                This will immediately invalidate your current session.
                You will be logged out and must use the new password sent
                to your email to log back in.
              </p>
            </div>
          </div>
        )}

        {/* Done confirmation */}
        {done && (
          <div className="flex gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-800 mb-1">Password reset successful!</p>
              <p className="text-sm text-emerald-700">
                New password sent to <span className="font-bold">{userEmail}</span>.
                Logging you out now…
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!done && (
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {confirmed && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isResetting}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6
                           border-2 border-gray-200 text-gray-600 rounded-xl text-sm
                           font-semibold hover:bg-gray-50 hover:border-gray-300
                           disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className={`flex items-center justify-center gap-2.5 py-3.5 px-6
                          rounded-xl text-sm font-semibold transition-colors shadow-sm
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${confirmed
                            ? 'flex-1 bg-red-500 hover:bg-red-600 text-white'
                            : 'w-full bg-cyan-600 hover:bg-cyan-700 text-white'
                          }`}
            >
              {isResetting ? (
                <><Loader2 className="w-5 h-5 animate-spin" />Sending new password…</>
              ) : confirmed ? (
                <><RefreshCcw className="w-5 h-5" />Yes, Reset My Password</>
              ) : (
                <><RefreshCcw className="w-5 h-5" />Reset Password</>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};