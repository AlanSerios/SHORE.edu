import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, X, Users, GraduationCap, Search, Upload, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';
import { PageHeader, PageShell } from './ui/page';

const ManageClassView = ({ onUploadTracker, trackerFile }) => {
  const [roster, setRoster] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('roster');
  const [accountFilter, setAccountFilter] = useState('all');
  const [deletingEmail, setDeletingEmail] = useState(null);
  const [newName, setNewName] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    try {
      const [rosterRes, usersRes] = await Promise.all([
        fetch('/api/allowed_students').then(r => r.json()),
        fetch('/api/users').then(r => r.json())
      ]);

      setRoster(rosterRes.students || []);
      setUsers((usersRes.users || []).filter(u => u.role === 'student'));
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const handleImportTracker = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;
    setIsUploading(true);

    try {
      if (onUploadTracker) {
        const result = await onUploadTracker(e);

        if (result?.success && result?.students) {
          setRoster(result.students);
        } else {
          await fetchData();
        }
      }
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => { fetchData(); }, []);

  const saveRoster = async (newRoster) => {
    try {
      const res = await fetch('/api/allowed_students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: newRoster })
      });

      const data = await res.json();

      if (data.success) { setRoster(newRoster);

 return true; }

      toast.error("Failed to save roster.");

      return false;
    } catch { toast.error("Network error.");

 return false; }
  };

  const handleAdd = async () => {
    const trimmed = newName.trim();

    if (!trimmed) return;

    if (roster.includes(trimmed)) { toast.error(`"${trimmed}" is already on the roster.`);

 return; }

    const success = await saveRoster([...roster, trimmed]);

    if (success) { setNewName(''); toast.success(`"${trimmed}" added to roster.`); }
  };

  const handleDelete = async (name) => {
    const success = await saveRoster(roster.filter(n => n !== name));

    if (success) toast.success(`"${name}" removed from roster.`);
  };

  const handleSaveEdit = async (idx) => {
    const trimmed = editValue.trim();

    if (!trimmed) return;

    if (roster[idx] !== trimmed && roster.includes(trimmed)) { toast.error("That name already exists on the roster.");

 return; }

    const updated = [...roster];
    updated[idx] = trimmed;
    const success = await saveRoster(updated);

    if (success) { setEditingIdx(null); toast.success("Name updated."); }
  };

  const handleDeleteAccount = async (user) => {
    const displayName = user.name || user.email;

    if (!window.confirm(`Permanently delete account for "${displayName}" (${user.email})?\n\nThis user will be deleted immediately and will lose access to SHORE.`)) {
      return;
    }

    setDeletingEmail(user.email);

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.email)}`, {
        method: 'DELETE'
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setUsers(prev => prev.filter(u => u.email !== user.email));
        toast.success(`Account for "${displayName}" deleted.`);
      } else {
        toast.error(data.error || 'Failed to delete account.');
      }
    } catch {
      toast.error('Network error while deleting account.');
    } finally {
      setDeletingEmail(null);
    }
  };

  const isRostered = (user) => {
    const uName = (user.name || '').trim().toLowerCase();

    return roster.some(r => (r || '').trim().toLowerCase() === uName);
  };

  const notOnRosterCount = users.filter(u => !isRostered(u)).length;
  const onRosterCount = users.filter(u => isRostered(u)).length;

  const filteredRoster = roster.filter(n => n.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredUsers  = users.filter(u => {
    const matchesSearch =
      (u.name  || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    const rostered = isRostered(u);

    if (accountFilter === 'unrostered') return !rostered;

    if (accountFilter === 'rostered') return rostered;

    return true;
  });

  const TABS = [
    { id: 'roster',   label: 'Class Roster',       icon: GraduationCap },
    { id: 'accounts', label: 'Registered Accounts', icon: Users         },
  ];

  return (
    <PageShell width="narrow" contentClassName="space-y-6">
        <PageHeader
          title="Manage Class"
          description="Class roster enrollment and registered student directory."
          actions={
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportTracker}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                aria-label="Import student tracker Excel file"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-fg shadow-sm transition-all hover:bg-slate-50 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-primary" />
                <span>{isUploading ? 'Importing…' : trackerFile ? 'Update Tracker (Excel)' : 'Import Tracker (Excel)'}</span>
              </button>
            </div>
          }
        />

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-border/60 p-5 shadow-sm">
            <p className="text-3xl font-black text-primary">{roster.length}</p>
            <p className="text-xs text-muted mt-1 font-medium">Names on Roster</p>
            <p className="text-[11px] text-muted mt-0.5">Students allowed to register</p>
          </div>
          <div className="bg-white rounded-2xl border border-border/60 p-5 shadow-sm">
            <p className="text-3xl font-black text-green-600">{users.length}</p>
            <p className="text-xs text-muted mt-1 font-medium">Registered Accounts</p>
            <p className="text-[11px] text-muted mt-0.5">
              {onRosterCount} matched to roster {notOnRosterCount > 0 && <span className="text-amber-600 font-semibold">• {notOnRosterCount} not on roster</span>}
            </p>
          </div>
        </div>

        {/* TABS */}
        <div role="tablist" aria-label="Class management views" className="flex w-full gap-1 rounded-xl border border-border bg-white p-1 shadow-sm sm:w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => { setActiveTab(id); setSearchQuery(''); setEditingIdx(null); }}
              className={cn("relative min-h-11 flex flex-1 items-center justify-center gap-2 rounded-lg px-5 py-2 text-xs font-bold transition-colors sm:flex-initial",
                activeTab === id ? "text-fg" : "text-muted hover:text-fg/80")}>
              {activeTab === id && (
                <motion.div layoutId="classTabPill"
                  className="absolute inset-0 bg-primary/10 rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ zIndex: -1 }} />
              )}
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ══════ CLASS ROSTER TAB ══════ */}
          {activeTab === 'roster' && (
            <motion.div key="roster" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-4">

              {/* Add student */}
              <div className="bg-white rounded-2xl border border-border/60 p-5 shadow-sm">
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Add Student to Roster</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="Full name (must match exactly at registration)"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border focus:outline-none focus:border-primary text-sm transition-colors bg-canvas/30"
                  />
                  <button onClick={handleAdd}
                    className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 shrink-0">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
                <p className="text-[11px] text-muted mt-2">⚠️ The name must exactly match what the student will enter during registration.</p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search roster..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:outline-none focus:border-primary text-sm bg-white transition-colors" />
              </div>

              {/* Roster list */}
              <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">Students</span>
                  <span className="text-xs font-bold text-muted">{filteredRoster.length} / {roster.length}</span>
                </div>
                {loading ? (
                  <div className="p-12 flex justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
                ) : filteredRoster.length === 0 ? (
                  <div className="p-12 text-center text-muted text-sm">
                    {searchQuery ? 'No names match your search.' : 'The roster is empty. Add a student above.'}
                  </div>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {filteredRoster.map((name) => {
                      const realIdx = roster.indexOf(name);
                      const isRegistered = users.some(u => u.name === name);

                      return (
                        <li key={name} className="flex items-center gap-4 px-5 py-3.5 hover:bg-canvas/30 transition-colors group">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>

                          {editingIdx === realIdx ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEdit(realIdx);

                                  if (e.key === 'Escape') setEditingIdx(null);
                                }}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-primary text-sm focus:outline-none bg-white"
                                autoFocus
                              />
                              <button onClick={() => handleSaveEdit(realIdx)}
                                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingIdx(null)}
                                className="p-1.5 rounded-lg bg-canvas text-muted hover:bg-border/50 transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-fg text-sm">{name}</span>
                                {isRegistered && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">
                                    ✓ Registered
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => { setEditingIdx(realIdx); setEditValue(name); }}
                                  className="p-1.5 rounded-lg hover:bg-canvas text-muted hover:text-fg transition-all"
                                  title="Edit name">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(name)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 transition-all"
                                  title="Remove from roster">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════ REGISTERED ACCOUNTS TAB ══════ */}
          {activeTab === 'accounts' && (
            <motion.div key="accounts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-4">

              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:outline-none focus:border-primary text-sm bg-white transition-colors" />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setAccountFilter('all')}
                    className={cn(
                      "px-3 py-2 rounded-xl font-semibold transition-all shrink-0",
                      accountFilter === 'all'
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white text-muted hover:text-fg border border-border"
                    )}
                  >
                    All ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountFilter('unrostered')}
                    className={cn(
                      "px-3 py-2 rounded-xl font-semibold transition-all shrink-0 flex items-center gap-1.5",
                      accountFilter === 'unrostered'
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
                    )}
                  >
                    <span>⚠ Not on Roster</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                      accountFilter === 'unrostered' ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                    )}>
                      {notOnRosterCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountFilter('rostered')}
                    className={cn(
                      "px-3 py-2 rounded-xl font-semibold transition-all shrink-0 flex items-center gap-1.5",
                      accountFilter === 'rostered'
                        ? "bg-green-600 text-white shadow-sm"
                        : "bg-white text-green-700 hover:bg-green-50 border border-green-200"
                    )}
                  >
                    <span>✓ On Roster</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                      accountFilter === 'rostered' ? "bg-white/20 text-white" : "bg-green-100 text-green-800"
                    )}>
                      {onRosterCount}
                    </span>
                  </button>
                </div>
              </div>

              {notOnRosterCount > 0 && accountFilter !== 'rostered' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-amber-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>{notOnRosterCount} account{notOnRosterCount > 1 ? 's are' : ' is'} not on the class roster.</strong> You can delete them below so they can no longer access SHORE.
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">Registered Student Accounts</span>
                  <span className="text-xs font-bold text-muted">{filteredUsers.length} accounts</span>
                </div>
                {loading ? (
                  <div className="p-12 flex justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-12 text-center text-muted text-sm">
                    {searchQuery ? 'No account found with this name.' : accountFilter === 'unrostered' ? 'No unrostered accounts.' : 'No registered accounts yet.'}
                  </div>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {filteredUsers.map(user => {
                      const onRoster = isRostered(user);
                      const roleLabel = user.role === 'volunteer' ? 'Volunteer' : 'Student';
                      const roleColor = user.role === 'volunteer' ? 'bg-purple-100 text-purple-700' : 'bg-primary/10 text-primary';
                      const isDeleting = deletingEmail === user.email;

                      return (
                        <li key={user.email} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-canvas/30 transition-colors">
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">
                              {(user.name || user.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="font-semibold text-fg text-sm">{user.name || '—'}</span>
                                <span className={cn("px-1.5 py-0.5 text-[10px] font-bold rounded", roleColor)}>{roleLabel}</span>
                                {onRoster
                                  ? <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">✓ On Roster</span>
                                  : <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded border border-orange-200">⚠ Not on Roster</span>
                                }
                              </div>
                              <div className="text-xs text-muted mt-0.5 truncate">{user.email}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(user)}
                            disabled={isDeleting}
                            className="inline-flex min-h-9 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accentRedFg bg-accentRed/10 hover:bg-accentRed/20 rounded-xl transition-all border border-accentRed/20 disabled:opacity-50 disabled:cursor-wait shrink-0 active:scale-95 touch-manipulation"
                            title={`Delete account for ${user.name || user.email}`}
                            aria-label={`Delete account for ${user.name || user.email}`}
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">{isDeleting ? 'Deleting…' : 'Delete Account'}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </PageShell>
  );
};

export default ManageClassView;
