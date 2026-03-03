import React, { useEffect, useState } from 'react';
import { Link2, Copy, Check, ExternalLink, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { axiosInstance as apiClient } from '@/lib/axios';

interface PortalLink {
  id:          number;
  clinic:      number;
  token:       string;
  heading:     string;
  description: string;
  is_active:   boolean;
  portal_url:  string;
  created_at:  string;
}

export const ClinicalMenu1: React.FC = () => {
  const [portalLink, setPortalLink] = useState<PortalLink | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(false);
  const [copied,     setCopied]     = useState(false);

  // ── Fetch existing portal link ───────────────────────────────────────────
  // Reads token directly from localStorage — no need to wait for Zustand hydration
  const fetchPortalLink = async () => {
    try {
      const res = await apiClient.get<PortalLink[]>('/portal-links/');
      setPortalLink(res.data.length > 0 ? res.data[0] : null);
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Failed to load portal link.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Fire immediately on mount — axiosInstance interceptor already attaches
  // the token from localStorage synchronously before the request goes out
  useEffect(() => {
    fetchPortalLink();
  }, []);

  // ── Create portal link (one-time, permanent) ─────────────────────────────
  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await apiClient.post<PortalLink>('/portal-links/', {});
      setPortalLink(res.data);
      toast.success('Patient portal link created!');
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ??
        JSON.stringify(err.response?.data) ??
        'Failed to create portal link.';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  // ── Copy to clipboard ────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!portalLink) return;
    const fullUrl = `${window.location.origin}/portal/${portalLink.token}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  // ── Toggle active ────────────────────────────────────────────────────────
  const handleToggleActive = async () => {
    if (!portalLink) return;
    try {
      const res = await apiClient.patch<PortalLink>(
        `/portal-links/${portalLink.id}/`,
        { is_active: !portalLink.is_active },
      );
      setPortalLink(res.data);
      toast.success(
        res.data.is_active
          ? 'Portal is now active.'
          : 'Portal has been deactivated.',
      );
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to update portal status.');
    }
  };

  // ── Derived frontend URL ─────────────────────────────────────────────────
  const frontendUrl = portalLink
    ? `${window.location.origin}/portal/${portalLink.token}`
    : null;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {/* Skeleton header card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-56 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse ml-auto" />
          </div>
        </div>
        {/* Skeleton link card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="h-12 w-full bg-gray-100 rounded-xl animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-9 w-28 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── No portal link yet ───────────────────────────────────────────────────
  if (!portalLink) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Portal</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            No booking portal has been set up yet. Generate a permanent link to
            let patients book appointments online.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {creating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            Generate Portal Link
          </button>
        </div>
      </div>
    );
  }

  // ── Portal link exists ───────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4">

      {/* Header card */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Globe className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Patient Portal</h2>
            <p className="text-sm text-gray-500">
              Share this link so patients can book appointments online.
            </p>
          </div>

          {/* Active badge */}
          <div className="ml-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                portalLink.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                portalLink.is_active ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {portalLink.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Link card */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
        <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Booking URL
        </p>

        {/* URL display */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="flex-1 text-sm text-gray-700 font-mono break-all select-all">
            {frontendUrl}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            {copied ? (
              <><Check className="w-4 h-4" /> Copied!</>
            ) : (
              <><Copy className="w-4 h-4" /> Copy Link</>
            )}
          </button>

          {/* Open */}
          <a
            href={frontendUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Portal
          </a>
        </div>

        <p className="text-xs text-gray-400">
          🔒 This link is permanent. Share it with patients to let them book appointments.
        </p>
      </div>

      {/* Status toggle card */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">Portal Visibility</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {portalLink.is_active
                ? 'The portal is publicly accessible. Patients can book appointments.'
                : 'The portal is hidden. Patients cannot access the booking page.'}
            </p>
          </div>
          <button
            onClick={handleToggleActive}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              portalLink.is_active ? 'bg-teal-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                portalLink.is_active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Meta info */}
      <p className="text-xs text-gray-400 px-1">
        Created {new Date(portalLink.created_at).toLocaleDateString('en-PH', {
          year: 'numeric', month: 'long', day: 'numeric',
        })}
      </p>
    </div>
  );
};