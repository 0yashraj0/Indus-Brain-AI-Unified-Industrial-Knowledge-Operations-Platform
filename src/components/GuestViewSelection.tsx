import React, { useState } from 'react';
import { HardHat, ShieldCheck, ArrowRight, LogOut, Check, Lock, Sparkles } from 'lucide-react';
import { Account } from '../types';

interface GuestViewSelectionProps {
  currentUser: Account;
  onSelectView: (view: 'WORKER' | 'OWNER_MANAGER') => void;
  onSignOut: () => void;
}

export default function GuestViewSelection({ currentUser, onSelectView, onSignOut }: GuestViewSelectionProps) {
  const [loadingView, setLoadingView] = useState<'WORKER' | 'OWNER_MANAGER' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChooseView = async (view: 'WORKER' | 'OWNER_MANAGER') => {
    setLoadingView(view);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/guest-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.role
        },
        credentials: 'include',
        body: JSON.stringify({ view })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onSelectView(view);
      } else {
        setErrorMsg(data.message || data.error || 'Failed to update guest view selection.');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to set guest demo view.');
    } finally {
      setLoadingView(null);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-neutral-50 text-neutral-900 flex flex-col font-sans select-none antialiased overflow-y-auto overflow-x-hidden [webkit-overflow-scrolling:touch]">
      {/* Header Bar */}
      <header className="px-4 sm:px-6 py-3 border-b border-neutral-200 bg-white/90 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none" className="shrink-0">
            <rect x="1" y="1" width="38" height="38" stroke="#171717" strokeWidth="2.5" rx="8" />
            <rect x="9" y="22" width="4" height="9" fill="#171717" rx="1" />
            <rect x="18" y="15" width="4" height="16" fill="#171717" rx="1" />
            <rect x="27" y="9" width="4" height="22" fill="#171717" rx="1" />
          </svg>
          <div className="min-w-0">
            <div className="font-extrabold text-xs tracking-widest text-neutral-900 uppercase truncate">INDUS BRAIN</div>
            <div className="text-[10px] text-neutral-500 font-mono leading-none mt-0.5 truncate">GUEST DEMO SESSION</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-700 border border-neutral-200 text-[10px] font-mono uppercase rounded-md tracking-wider">
            <Lock size={12} className="text-neutral-500" /> Read-Only Mode
          </span>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <LogOut size={13} /> Exit Demo
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start md:justify-center p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto w-full min-h-max pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
        {/* Title Block */}
        <div className="text-center py-2 sm:py-0 mb-4 sm:mb-6 lg:mb-8 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 rounded-full text-[10px] font-mono tracking-widest uppercase text-neutral-600 mb-2 sm:mb-3 shadow-xs">
            <Sparkles size={12} className="text-neutral-800" /> Operational Perspective
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight">
            Select Guest Demo Experience
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 sm:mt-2 max-w-lg mx-auto leading-relaxed">
            Choose an operational view to explore INDUS BRAIN features. All data is isolated and write operations are strictly blocked.
          </p>
        </div>

        {errorMsg && (
          <div className="w-full max-w-md mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium text-center shrink-0">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 w-full">
          {/* Worker View Card */}
          <div className="bg-white border border-neutral-200 hover:border-neutral-400 rounded-2xl p-4 sm:p-6 lg:p-7 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md group w-full min-w-0">
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-5">
                <div className="p-2.5 sm:p-3 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-900">
                  <HardHat size={22} />
                </div>
                <span className="text-[10px] font-mono tracking-wider text-neutral-700 uppercase bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-md font-semibold">
                  WORKER CONSOLE
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 mb-1">Worker View</h2>
              <p className="text-xs text-neutral-600 leading-relaxed mb-4 sm:mb-6">
                Frontline technician interface for daily tasks, machinery SOPs, safety guides, and AI assistance.
              </p>

              <div className="space-y-2.5 sm:space-y-3 mb-5 sm:mb-8 text-xs text-neutral-700 border-t border-neutral-100 pt-3.5 sm:pt-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-neutral-900" />
                  </div>
                  <span className="break-words min-w-0">Worker Dashboard & Task Overview</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-neutral-900" />
                  </div>
                  <span className="break-words min-w-0">Assigned Equipment & Machinery Manuals</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-neutral-900" />
                  </div>
                  <span className="break-words min-w-0">Approved SOPs, Safety & Emergency Contacts</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-neutral-900" />
                  </div>
                  <span className="break-words min-w-0">Ask AI Industrial Operations Assistant</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleChooseView('WORKER')}
              disabled={loadingView !== null}
              className="w-full py-2.5 sm:py-3 px-4 bg-neutral-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm mt-auto"
            >
              {loadingView === 'WORKER' ? 'Entering Worker View...' : (
                <>
                  Continue as Worker View <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>

          {/* Owner + Manager View Card */}
          <div className="bg-white border border-neutral-200 hover:border-neutral-400 rounded-2xl p-4 sm:p-6 lg:p-7 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md group w-full min-w-0">
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-5">
                <div className="p-2.5 sm:p-3 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-900">
                  <ShieldCheck size={22} />
                </div>
                <span className="text-[10px] font-mono tracking-wider text-neutral-700 uppercase bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-md font-semibold">
                  EXECUTIVE CONTROL
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 mb-1">Owner + Manager View</h2>
              <p className="text-xs text-neutral-600 leading-relaxed mb-4 sm:mb-6">
                Executive management console for plant metrics, equipment fleet, workforce directory, and document AI.
              </p>

              <div className="space-y-2.5 sm:space-y-3 mb-5 sm:mb-8 text-xs text-neutral-700 border-t border-neutral-100 pt-3.5 sm:pt-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-neutral-900" />
                  </div>
                  <span className="break-words min-w-0">Management Dashboard & Operational Analytics</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-neutral-900" />
                  </div>
                  <span className="break-words min-w-0">Equipment Fleet & Maintenance Ledger</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-neutral-900" />
                  </div>
                  <span className="break-words min-w-0">Workforce Accounts & Security Audit Logs</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-neutral-900" />
                  </div>
                  <span className="break-words min-w-0">Ask AI Multi-Document Intelligence</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleChooseView('OWNER_MANAGER')}
              disabled={loadingView !== null}
              className="w-full py-2.5 sm:py-3 px-4 bg-neutral-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm mt-auto"
            >
              {loadingView === 'OWNER_MANAGER' ? 'Entering Executive View...' : (
                <>
                  Continue as Owner + Manager View <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Security Footer */}
      <footer className="py-3 sm:py-4 border-t border-neutral-200 text-center text-[10px] sm:text-[11px] font-mono uppercase text-neutral-500 tracking-wider bg-white shrink-0">
        DEMO ENVIRONMENT • ISOLATED GUEST SESSION • READ-ONLY
      </footer>
    </div>
  );
}
