import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Check, X, Loader2, Shield, Search, AlertCircle, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils';
import { PageHeader, PageShell } from './ui/page';

export default function AccountsView() {
  const [users, setUsers] = useState([]);
  const [studentsRoster, setStudentsRoster] = useState([]);
  const [volunteersRoster, setVolunteersRoster] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEmail, setEditingEmail] = useState(null);
  const [deletingEmail, setDeletingEmail] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchData = async () => {
    setIsLoading(true);

    try {
      const [usersRes, studentsRes, volunteersRes] = await Promise.all([
        fetch('/api/users').then(r => r.json()).catch(() => ({ users: [] })),
        fetch('/api/allowed_students').then(r => r.json()).catch(() => ({ students: [] })),
        fetch('/api/allowed_volunteers').then(r => r.json()).catch(() => ({ volunteers: [] }))
      ]);

      setUsers(usersRes.users || []);
      setStudentsRoster(studentsRes.students || []);
      setVolunteersRoster(volunteersRes.volunteers || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getRosterStatus = (user) => {
    if (user.role === 'admin') {
      return { status: 'admin', label: 'Admin', color: 'bg-accentBlue/20 text-accentBlueFg' };
    }

    const uName = (user.name || '').trim().toLowerCase();

    if (user.role === 'student') {
      const onRoster = studentsRoster.some(s => (s || '').trim().toLowerCase() === uName);

      return onRoster
        ? { status: 'on_roster', label: '✓ On Roster', color: 'bg-green-100 text-green-700' }
        : { status: 'not_on_roster', label: '⚠ Not on Roster', color: 'bg-amber-100 text-amber-800 border border-amber-200' };
    }

    if (user.role === 'volunteer') {
      const onRoster = volunteersRoster.some(v => (v || '').trim().toLowerCase() === uName);

      return onRoster
        ? { status: 'on_roster', label: '✓ On Roster', color: 'bg-green-100 text-green-700' }
        : { status: 'not_on_roster', label: '⚠ Not on Roster', color: 'bg-amber-100 text-amber-800 border border-amber-200' };
    }

    return { status: 'unknown', label: '—', color: 'bg-canvas text-muted' };
  };

  const handleDelete = async (user) => {
    const email = user.email;
    const displayName = user.name || email;

    if (!window.confirm(`Permanently delete account for "${displayName}" (${email})?\n\nThis user will be deleted immediately and will lose access to SHORE.`)) {
      return;
    }

    setDeletingEmail(email);
    setError('');

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setUsers(currentUsers => currentUsers.filter(u => u.email !== email));
        toast.success(`Account for "${displayName}" deleted successfully.`);
      } else {
        const msg = data.error || 'Failed to delete user.';
        setError(msg);
        toast.error(msg);
      }
    } catch {
      setError('Failed to delete user.');
      toast.error('Network error while deleting user.');
    } finally {
      setDeletingEmail(null);
    }
  };

  const handleEdit = (user) => {
    setEditingEmail(user.email);
    setEditForm({ ...user, password: '' });
  };

  const handleSaveEdit = async () => {
    try {
      const payload = { ...editForm };

      if (payload.password) {
        if (
          payload.password.length < 8 ||
          !/[A-Z]/.test(payload.password) ||
          !/[a-z]/.test(payload.password) ||
          !/[0-9]/.test(payload.password) ||
          !/[^a-zA-Z0-9]/.test(payload.password)
        ) {
          setError('New password must be at least 8 characters and contain uppercase, lowercase, numbers, and symbols.');
          toast.error('New password does not meet security requirements.');

          return;
        }
      } else {
        delete payload.password;
      }

      const res = await fetch(`/api/users/${encodeURIComponent(editingEmail)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setUsers(users.map(u => u.email === editingEmail ? data.user : u));
        setEditingEmail(null);
        setError('');
        toast.success('Account updated successfully.');
      } else {
        const msg = data.error || 'Failed to update user.';
        setError(msg);
        toast.error(msg);
      }
    } catch {
      setError('Failed to update user.');
      toast.error('Network error while updating user.');
    }
  };

  const unrosteredCount = users.filter(u => getRosterStatus(u).status === 'not_on_roster').length;
  const studentsCount = users.filter(u => u.role === 'student').length;
  const volunteersCount = users.filter(u => u.role === 'volunteer').length;
  const adminsCount = users.filter(u => u.role === 'admin').length;

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.role || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const rosterInfo = getRosterStatus(user);

    if (activeFilter === 'unrostered') return rosterInfo.status === 'not_on_roster';

    if (activeFilter === 'student') return user.role === 'student';

    if (activeFilter === 'volunteer') return user.role === 'volunteer';

    if (activeFilter === 'admin') return user.role === 'admin';

    return true;
  });

  return (
    <PageShell contentClassName="space-y-6">
      <PageHeader
        title="Account Management"
        description="Master directory of user accounts, roles, roster authorizations, and account security status."
      />

      {error && (
        <div role="alert" className="bg-accentRed/20 text-accentRedFg px-4 py-3 rounded-lg text-sm font-medium border border-accentRed/30">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-border/60 p-4 shadow-sm">
          <p className="text-2xl font-black text-primary">{users.length}</p>
          <p className="text-xs text-muted mt-0.5 font-medium">Total Accounts</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 p-4 shadow-sm">
          <p className="text-2xl font-black text-amber-600">{unrosteredCount}</p>
          <p className="text-xs text-muted mt-0.5 font-medium">Not on Roster</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 p-4 shadow-sm">
          <p className="text-2xl font-black text-green-600">{studentsCount}</p>
          <p className="text-xs text-muted mt-0.5 font-medium">Students</p>
        </div>
        <div className="bg-white rounded-2xl border border-border/60 p-4 shadow-sm">
          <p className="text-2xl font-black text-purple-600">{volunteersCount}</p>
          <p className="text-xs text-muted mt-0.5 font-medium">Volunteers</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search accounts by name, email, or role..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:outline-none focus:border-primary text-sm bg-white transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={cn(
              "px-3 py-2 rounded-xl font-semibold transition-all shrink-0",
              activeFilter === 'all'
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-muted hover:text-fg border border-border"
            )}
          >
            All ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('unrostered')}
            className={cn(
              "px-3 py-2 rounded-xl font-semibold transition-all shrink-0 flex items-center gap-1.5",
              activeFilter === 'unrostered'
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
            )}
          >
            <span>⚠ Not on Roster</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
              activeFilter === 'unrostered' ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
            )}>
              {unrosteredCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('student')}
            className={cn(
              "px-3 py-2 rounded-xl font-semibold transition-all shrink-0",
              activeFilter === 'student'
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-muted hover:text-fg border border-border"
            )}
          >
            Students ({studentsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('volunteer')}
            className={cn(
              "px-3 py-2 rounded-xl font-semibold transition-all shrink-0",
              activeFilter === 'volunteer'
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white text-muted hover:text-fg border border-border"
            )}
          >
            Volunteers ({volunteersCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('admin')}
            className={cn(
              "px-3 py-2 rounded-xl font-semibold transition-all shrink-0",
              activeFilter === 'admin'
                ? "bg-slate-800 text-white shadow-sm"
                : "bg-white text-muted hover:text-fg border border-border"
            )}
          >
            Admins ({adminsCount})
          </button>
        </div>
      </div>

      {unrosteredCount > 0 && activeFilter !== 'admin' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{unrosteredCount} account{unrosteredCount > 1 ? 's are' : ' is'} not on any roster.</strong> You can permanently delete them here so they can no longer access SHORE.
            </span>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border bg-white flex justify-between items-center">
          <h3 className="text-base font-bold text-fg">Registered Users</h3>
          <div className="text-xs font-semibold text-muted bg-canvas px-3 py-1 rounded-full border border-border">
            {filteredUsers.length} of {users.length} Total
          </div>
        </div>
        
        <div className="w-full">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas/50">
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider w-[24%]">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider w-[24%]">Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider w-[18%]">Security</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider w-[20%]">Role &amp; Roster</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-right w-[14%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-muted">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-muted">
                      {searchQuery ? 'No account found with this name.' : activeFilter === 'unrostered' ? 'No unrostered accounts.' : 'No accounts found.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const rosterInfo = getRosterStatus(user);
                    const isDeleting = deletingEmail === user.email;

                    return (
                      <tr key={user.email} className="hover:bg-canvas/30 transition-colors">
                        <td className="px-6 py-4">
                          {editingEmail === user.email ? (
                            <input 
                              type="text" 
                              className="w-full border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                              value={editForm.name}
                              onChange={e => setEditForm({...editForm, name: e.target.value})}
                            />
                          ) : (
                            <span className="font-semibold text-fg">{user.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingEmail === user.email ? (
                            <input 
                              type="email" 
                              className="w-full border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                              value={editForm.email}
                              onChange={e => setEditForm({...editForm, email: e.target.value})}
                            />
                          ) : (
                            <span className="text-muted font-medium text-sm">{user.email}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingEmail === user.email ? (
                            <div className="space-y-1">
                              <input 
                                type="password" 
                                placeholder="New password (optional)"
                                className="w-full border border-border rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-primary"
                                value={editForm.password || ''}
                                onChange={e => setEditForm({...editForm, password: e.target.value})}
                              />
                              <span className="text-[10px] text-muted block">Leave blank to keep unchanged</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              {user.hasPassword !== false ? 'Secured' : 'No Password'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-accentBlue/20 text-accentBlueFg">
                              <Shield className="w-3 h-3" /> {user.role}
                            </span>
                            {rosterInfo.status !== 'admin' && (
                              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", rosterInfo.color)}>
                                {rosterInfo.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {editingEmail === user.email ? (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={handleSaveEdit}
                                className="p-1.5 bg-accentGreen/20 text-accentGreenFg hover:bg-accentGreen/30 rounded-md transition-colors"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => { setEditingEmail(null); setError(''); }}
                                className="p-1.5 bg-canvas text-muted hover:text-fg hover:bg-border rounded-md transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleEdit(user)}
                                className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                disabled={isDeleting}
                                onClick={() => handleDelete(user)}
                                className="inline-flex h-10 w-10 items-center justify-center text-muted hover:text-accentRedFg hover:bg-accentRed/10 rounded-md transition-colors disabled:cursor-wait disabled:opacity-60"
                                aria-label={`Delete account for ${user.name || user.email}`}
                                title={isDeleting ? 'Deleting account…' : 'Delete account'}
                              >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-border bg-white">
            {isLoading ? (
              <div className="p-8 text-center text-muted">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading accounts...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted">
                {searchQuery ? 'No account found with this name.' : activeFilter === 'unrostered' ? 'No unrostered accounts.' : 'No accounts found.'}
              </div>
            ) : (
              filteredUsers.map((user) => {
                const rosterInfo = getRosterStatus(user);
                const isDeleting = deletingEmail === user.email;

                return (
                  <div key={user.email} className="p-4 flex flex-col gap-4">
                    {editingEmail === user.email ? (
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1 block">Name</label>
                          <input 
                            type="text" 
                            className="w-full border border-border rounded-xl px-3.5 min-h-11 text-base sm:text-sm focus:outline-none focus:border-primary bg-canvas"
                            value={editForm.name}
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1 block">Email</label>
                          <input 
                            type="email" 
                            className="w-full border border-border rounded-xl px-3.5 min-h-11 text-base sm:text-sm focus:outline-none focus:border-primary bg-canvas"
                            value={editForm.email}
                            onChange={e => setEditForm({...editForm, email: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1 block">New Password (optional)</label>
                          <input 
                            type="password" 
                            placeholder="Leave blank to keep unchanged"
                            className="w-full border border-border rounded-xl px-3.5 min-h-11 text-base sm:text-sm focus:outline-none focus:border-primary bg-canvas"
                            value={editForm.password || ''}
                            onChange={e => setEditForm({...editForm, password: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-border">
                          <button 
                            onClick={() => { setEditingEmail(null); setError(''); }}
                            className="flex-1 min-h-11 bg-canvas text-muted font-bold hover:text-fg hover:bg-border rounded-xl transition-colors text-sm active:scale-[0.98] touch-manipulation"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleSaveEdit}
                            className="flex-1 min-h-11 bg-primary text-white font-bold hover:bg-primary/90 rounded-xl transition-colors text-sm active:scale-[0.98] touch-manipulation"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-bold text-fg text-sm break-words">{user.name}</h4>
                            <p className="text-muted text-xs mt-0.5 break-words">{user.email}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-accentBlue/20 text-accentBlueFg uppercase tracking-wider">
                              <Shield className="w-3 h-3" /> {user.role}
                            </span>
                            {rosterInfo.status !== 'admin' && (
                              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", rosterInfo.color)}>
                                {rosterInfo.label}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Security</span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <KeyRound className="w-3 h-3 text-emerald-600 shrink-0" />
                            {user.hasPassword !== false ? 'Secured' : 'No Password'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <button 
                            onClick={() => handleEdit(user)}
                            className="flex-1 min-h-11 flex items-center justify-center gap-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors border border-primary/10 active:scale-[0.98] touch-manipulation"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(user)}
                            disabled={isDeleting}
                            className="flex-1 min-h-11 flex items-center justify-center gap-2 text-xs font-bold text-accentRedFg bg-accentRed/10 hover:bg-accentRed/20 rounded-xl transition-colors border border-accentRed/20 active:scale-[0.98] touch-manipulation disabled:cursor-wait disabled:opacity-60"
                          >
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            {isDeleting ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
