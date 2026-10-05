import React, { useState } from 'react';
import { Lock, ShieldCheck, CheckCircle2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function SecurityCard({ userEmail }) {
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPasswordInput) {
      toast.error('Please enter your current password.');
      return;
    }
    if (newPasswordInput.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      toast.error('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          current_password: currentPasswordInput,
          new_password: newPasswordInput
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Password updated successfully!');
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
      } else {
        toast.error(data.error || 'Failed to update password.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error updating password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-fg">Security & Password</h3>
            <p className="text-xs text-muted mt-0.5">Update your SHORE account password and manage sign-in credentials</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-canvas/60 px-3 py-1.5 rounded-xl border border-border/60 text-xs font-semibold text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-[11px] font-bold text-fg">SHA-256 Auth</span>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-fg mb-1.5 uppercase tracking-wider">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPasswordInput}
                onChange={e => setCurrentPasswordInput(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-canvas border border-border hover:border-borderHover rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-10 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg p-0.5 cursor-pointer"
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-fg mb-1.5 uppercase tracking-wider">New Password</label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPasswordInput}
                onChange={e => setNewPasswordInput(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="w-full bg-canvas border border-border hover:border-borderHover rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-10 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg p-0.5 cursor-pointer"
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-fg mb-1.5 uppercase tracking-wider">Confirm Password</label>
            <input
              type="password"
              value={confirmPasswordInput}
              onChange={e => setConfirmPasswordInput(e.target.value)}
              placeholder="Repeat new password"
              required
              className="w-full bg-canvas border border-border hover:border-borderHover rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
            />
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-border/50">
          <p className="text-[11px] text-muted flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Must be at least 6 characters. Do not share your password with anyone.</span>
          </p>
          <button
            type="submit"
            disabled={isChangingPassword || !currentPasswordInput || !newPasswordInput}
            className="w-full sm:w-auto bg-primary hover:bg-primaryHover disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {isChangingPassword && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>Update Password</span>
          </button>
        </div>
      </form>
    </div>
  );
}
