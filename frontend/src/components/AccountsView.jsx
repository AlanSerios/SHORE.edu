import React, { useState, useEffect } from 'react';
import { Users, Edit2, Trash2, Check, X, Loader2, Shield } from 'lucide-react';
import { cn } from '../utils';

export default function AccountsView() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEmail, setEditingEmail] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (email) => {
    if (!window.confirm(`Are you sure you want to delete the account for ${email}?`)) return;
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setUsers(users.filter(u => u.email !== email));
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete user.');
      }
    } catch (err) {
      setError('Failed to delete user.');
    }
  };

  const handleEdit = (user) => {
    setEditingEmail(user.email);
    setEditForm({ ...user });
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(editingEmail)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      const data = await res.json();
      if (res.ok) {
        setUsers(users.map(u => u.email === editingEmail ? data.user : u));
        setEditingEmail(null);
        setError('');
      } else {
        setError(data.error || 'Failed to update user.');
      }
    } catch (err) {
      setError('Failed to update user.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-10 bg-canvas h-full relative">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-fg tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Account Management
            </h1>
            <p className="text-muted mt-2 text-sm">
              View, modify, or remove student accounts registered in the system.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-accentRed/20 text-accentRedFg px-4 py-3 rounded-lg text-sm font-medium border border-accentRed/30">
            {error}
          </div>
        )}

        {/* Data Table */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-white flex justify-between items-center">
            <h3 className="text-base font-bold text-fg">Registered Users</h3>
            <div className="text-xs font-semibold text-muted bg-canvas px-3 py-1 rounded-full border border-border">
              {users.length} Total
            </div>
          </div>
          
          <div className="w-full">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-canvas/50">
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider w-[25%]">Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider w-[25%]">Email</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider w-[20%]">Password</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider w-[15%]">Role</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-right w-[15%]">Actions</th>
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
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-muted">
                        No accounts found in the database.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
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
                            <input 
                              type="text" 
                              className="w-full border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                              value={editForm.password}
                              onChange={e => setEditForm({...editForm, password: e.target.value})}
                            />
                          ) : (
                            <span className="font-mono text-muted text-sm px-2 py-1 bg-canvas rounded-md">{user.password}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-accentBlue/20 text-accentBlueFg">
                            <Shield className="w-3 h-3" /> {user.role}
                          </span>
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
                                onClick={() => handleDelete(user.email)}
                                className="p-1.5 text-muted hover:text-accentRedFg hover:bg-accentRed/10 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
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
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-muted">
                  No accounts found in the database.
                </div>
              ) : (
                users.map((user) => (
                  <div key={user.email} className="p-4 flex flex-col gap-4">
                    {editingEmail === user.email ? (
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1 block">Name</label>
                          <input 
                            type="text" 
                            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary bg-canvas"
                            value={editForm.name}
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1 block">Email</label>
                          <input 
                            type="email" 
                            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary bg-canvas"
                            value={editForm.email}
                            onChange={e => setEditForm({...editForm, email: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1 block">Password</label>
                          <input 
                            type="text" 
                            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary bg-canvas"
                            value={editForm.password}
                            onChange={e => setEditForm({...editForm, password: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-border">
                          <button 
                            onClick={() => { setEditingEmail(null); setError(''); }}
                            className="flex-1 py-2 bg-canvas text-muted font-bold hover:text-fg hover:bg-border rounded-lg transition-colors text-sm"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleSaveEdit}
                            className="flex-1 py-2 bg-primary text-white font-bold hover:bg-primary/90 rounded-lg transition-colors text-sm"
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
                          <span className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-accentBlue/20 text-accentBlueFg uppercase tracking-wider">
                            <Shield className="w-3 h-3" /> {user.role}
                          </span>
                        </div>
                        
                        <div className="mt-2">
                          <span className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1 block">Password</span>
                          <span className="font-mono text-muted text-sm">{user.password}</span>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <button 
                            onClick={() => handleEdit(user)}
                            className="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors border border-primary/10"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(user.email)}
                            className="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold text-accentRedFg bg-accentRed/10 hover:bg-accentRed/20 rounded-lg transition-colors border border-accentRed/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
