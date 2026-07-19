import React, { useState } from 'react';
import { Account } from '../types';

interface LoginScreenProps {
  accounts: Account[];
  onLoginSuccess: (account: Account) => void;
}

export default function LoginScreen({ accounts, onLoginSuccess }: LoginScreenProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = userId.trim();
    const cleanPw = password;

    if (!cleanId || !cleanPw) {
      setErrorMsg('Please enter both Employee ID and password.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cleanId, password: cleanPw })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setErrorMsg('');
          onLoginSuccess(data.user);
        } else {
          setErrorMsg('Authentication failed.');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Incorrect credentials. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to connect to server.');
    }
  };

  return (
    <div className="screen active flex items-center justify-center min-h-screen bg-neutral-50" id="screenLogin">
      <div className="loginWrap flex w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden glass-panel shadow-2xl border border-white/50">
        <div className="loginLeft flex-1 flex flex-col justify-center px-12 md:px-20 bg-white/45 backdrop-blur-md">
          <div className="logoMark flex items-center gap-3 mb-10 group cursor-pointer">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" className="transition-transform duration-500 group-hover:rotate-12">
              <rect x="1" y="1" width="38" height="38" stroke="#0a0a0a" strokeWidth="2.5" rx="8" />
              <rect x="9" y="22" width="4" height="9" fill="#0a0a0a" rx="1" />
              <rect x="18" y="15" width="4" height="16" fill="#0a0a0a" rx="1" />
              <rect x="27" y="9" width="4" height="22" fill="#0a0a0a" rx="1" />
            </svg>
            <div className="logoText font-bold text-base tracking-widest text-neutral-900 font-sans">INDUS BRAIN</div>
          </div>

          <div id="paneLogin" className="w-full max-w-sm">
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 mb-2 font-sans">Sign in</h1>
            <p className="lede text-sm text-neutral-500 mb-8 font-sans">Unified Asset &amp; Operations Brain</p>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="loginId" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-sans">Employee ID</label>
                <input
                  type="text"
                  id="loginId"
                  className="input-glass w-full focus:outline-none focus:ring-2 focus:ring-black/5"
                  placeholder="Enter your ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="loginPw" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-sans">Password</label>
                <input
                  type="password"
                  id="loginPw"
                  className="input-glass w-full focus:outline-none focus:ring-2 focus:ring-black/5"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <button type="submit" className="btn-glass-primary w-full py-3.5 mt-2 text-xs uppercase tracking-widest font-bold">
                Sign In
              </button>
            </form>

            {errorMsg && (
              <div className="loginErr show text-xs text-red-500 font-medium mt-4 p-3 bg-red-50/50 border border-red-100 rounded-xl" id="loginErr">
                ⚠️ {errorMsg}
              </div>
            )}
          </div>
        </div>
        
        <div className="loginRight hidden md:flex flex-1 bg-neutral-950 items-center justify-center relative overflow-hidden px-16">
          {/* Subtle noise grid or ambient glow shapes behind */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-neutral-800 rounded-full blur-3xl opacity-30 animate-pulse"></div>
          
          <div className="bigNum text-[160px] font-black text-white/5 tracking-tighter select-none absolute bottom-0 right-10">IB</div>
          
          <div className="quoteBlock relative z-10 w-full max-w-sm">
            <div className="brandName text-[10px] font-bold tracking-widest text-neutral-400 mb-3 uppercase">INDUS GROUP</div>
            <div className="lines text-2xl font-semibold text-white leading-relaxed tracking-tight font-sans">
              Autonomous Operations.
              <br />
              Enterprise Industrial Intelligence.
            </div>
            <div className="tagRow flex gap-2 mt-8">
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 border border-neutral-800 px-3 py-1.5 bg-neutral-900/50 rounded-md">Safety</span>
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 border border-neutral-800 px-3 py-1.5 bg-neutral-900/50 rounded-md">Maintenance</span>
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 border border-neutral-800 px-3 py-1.5 bg-neutral-900/50 rounded-md">Compliance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
