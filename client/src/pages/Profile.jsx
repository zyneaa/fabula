import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import api from '../services/api';

const inputClass = "block w-full px-4 py-3 font-body text-base border border-outline-variant rounded-lg bg-surface text-on-surface transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_20%,transparent)]";
const labelClass = "block font-mono text-sm font-medium mb-2 text-on-surface-variant";
const btnPrimary = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-mono text-xs font-semibold border border-solid cursor-pointer transition-colors no-underline bg-primary text-on-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed";

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPwSection, setShowPwSection] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const saveName = async () => {
    setError('');
    setSuccess('');
    setSavingName(true);
    try {
      await api.put('/auth/me', { name });
      setSuccess('Name updated');
    } catch (err) {
      setError(err.response?.data?.detail || 'Update failed');
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSavingPw(true);
    try {
      await api.put('/auth/me', { current_password: currentPassword, new_password: newPassword });
      setSuccess('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setShowPwSection(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Password change failed');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-on-surface">Profile</h1>
      </div>

      {error && <div className="p-3 rounded-lg mb-4 text-sm bg-error-container text-on-error-container">{error}</div>}
      {success && <div className="p-3 rounded-lg mb-4 text-sm bg-[#d1fae5] text-[#065f46]">{success}</div>}

      <div className="bg-white rounded-lg border border-border-subtle p-6 space-y-5">
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={user?.email || ''} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
        </div>

        <div>
          <label className={labelClass}>Name</label>
          <div className="flex gap-2">
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className={`${inputClass} flex-1`} />
            <button onClick={saveName} disabled={savingName} className={btnPrimary}>{savingName ? '...' : 'Save'}</button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Role</label>
          <input type="text" value={user?.role || ''} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
        </div>

        {user?.major && (
          <div>
            <label className={labelClass}>Major</label>
            <input type="text" value={user.major} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
        )}
        {user?.year && (
          <div>
            <label className={labelClass}>Year</label>
            <input type="text" value={`Year ${user.year}`} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
        )}
        {user?.department && (
          <div>
            <label className={labelClass}>Department</label>
            <input type="text" value={user.department} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
        )}

        <hr className="border-border-subtle" />

        {!showPwSection ? (
          <button onClick={() => setShowPwSection(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-medium border border-solid cursor-pointer transition-colors bg-secondary-container text-on-secondary-container border-outline hover:bg-surface-container-high">
            <KeyRound size={14} /> Change Password
          </button>
        ) : (
          <form onSubmit={changePassword} className="space-y-4">
            <p className="font-mono text-xs font-medium text-on-surface-variant">Enter current and new password</p>
            <div>
              <label className={labelClass} htmlFor="current_password">Current Password</label>
              <div className="relative">
                <input id="current_password" type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className={`${inputClass} pr-10`} />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-on-surface-variant cursor-pointer p-1 flex items-center hover:text-on-surface" tabIndex={-1}>
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="new_password">New Password</label>
              <div className="relative">
                <input id="new_password" type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} className={`${inputClass} pr-10`} />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-on-surface-variant cursor-pointer p-1 flex items-center hover:text-on-surface" tabIndex={-1}>
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingPw} className={btnPrimary}>{savingPw ? 'Changing...' : 'Change Password'}</button>
              <button type="button" onClick={() => { setShowPwSection(false); setCurrentPassword(''); setNewPassword(''); }} className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-mono text-xs font-medium border border-solid cursor-pointer transition-colors bg-secondary-container text-on-secondary-container border-outline hover:bg-surface-container-high">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
