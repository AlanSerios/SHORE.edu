import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, X, Users, GraduationCap, Search } from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';

const ManageClassView = () => {
  const [roster, setRoster] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('roster');
  const [newName, setNewName] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => { fetchData(); }, []);

  const saveRoster = async (newRoster) => {
    try {
      const res = await fetch('/api/allowed_students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: newRoster })
      });
      const data = await res.json();
      if (data.success) { setRoster(newRoster); return true; }
      toast.error("Failed to save roster.");
      return false;
    } catch { toast.error("Network error."); return false; }
  };

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (roster.includes(trimmed)) { toast.error(`"${trimmed}" is already on the roster.`); return; }
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
    if (roster[idx] !== trimmed && roster.includes(trimmed)) { toast.error("That name already exists on the roster."); return; }
    const updated = [...roster];
    updated[idx] = trimmed;
    const success = await saveRoster(updated);
    if (success) { setEditingIdx(null); toast.success("Name updated."); }
  };

  const filteredRoster = roster.filter(n => n.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers  = users.filter(u =>
    (u.name  || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const TABS = [
    { id: 'roster',   label: 'Class Roster',       icon: GraduationCap },
    { id: 'accounts', label: 'Registered Accounts', icon: Users         },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto pb-32 px-4 sm:px-6 space-y-8">

        {/* HEADER */}
        <div className="pt-12 pb-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-canvas border border-border/50 text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
            Administration Mode
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-fg mb-2">Manage Class</h1>
          <p className="text-sm text-muted max-w-lg">
            Manage the class roster of students allowed to register, and view all registered accounts.
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-border/60 p-5 shadow-sm">
            <p className="text-3xl font-black text-primary">{roster.length}</p>
            <p className="text-xs text-muted mt-1 font-medium">Names on Roster</p>
            <p className="text-[11px] text-muted mt-0.5">Students allowed to register</p>
          </div>
          <div className="bg-white rounded-2xl border border-border/60 p-5 shadow-sm">
            <p className="text-3xl font-black text-green-600">{users.length}</p>
            <p className="text-xs text-muted mt-1 font-medium">Registered Accounts</p>
            <p className="text-[11px] text-muted mt-0.5">
              {users.filter(u => roster.includes(u.name)).length} matched to roster
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 p-1.5 bg-canvas border border-border/50 rounded-full w-fit shadow-sm">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setActiveTab(id); setSearchQuery(''); setEditingIdx(null); }}
              className={cn("relative flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-full transition-colors",
                activeTab === id ? "text-fg" : "text-muted hover:text-fg/80")}>
              {activeTab === id && (
                <motion.div layoutId="classTabPill"
                  className="absolute inset-0 bg-white rounded-full shadow-sm border border-black/5"
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
                <div className="flex gap-3">
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

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:outline-none focus:border-primary text-sm bg-white transition-colors" />
              </div>

              <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">Registered Students &amp; Volunteers</span>
                  <span className="text-xs font-bold text-muted">{filteredUsers.length} accounts</span>
                </div>
                {loading ? (
                  <div className="p-12 flex justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-12 text-center text-muted text-sm">
                    {searchQuery ? 'No accounts match your search.' : 'No registered accounts yet.'}
                  </div>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {filteredUsers.map(user => {
                      const onRoster = roster.includes(user.name);
                      const roleLabel = user.role === 'volunteer' ? 'Volunteer' : 'Student';
                      const roleColor = user.role === 'volunteer' ? 'bg-purple-100 text-purple-700' : 'bg-primary/10 text-primary';
                      return (
                        <li key={user.email} className="flex items-center gap-4 px-5 py-3.5 hover:bg-canvas/30 transition-colors">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="font-semibold text-fg text-sm">{user.name || '—'}</span>
                              <span className={cn("px-1.5 py-0.5 text-[10px] font-bold rounded", roleColor)}>{roleLabel}</span>
                              {onRoster
                                ? <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">✓ On Roster</span>
                                : <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded">⚠ Not on Roster</span>
                              }
                            </div>
                            <div className="text-xs text-muted mt-0.5">{user.email}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ManageClassView;
