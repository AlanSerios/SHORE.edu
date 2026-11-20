import React, { useEffect, useRef, useState } from 'react';
import { Check, CircleCheck, Clock3, Edit2, GraduationCap, Loader2, Plus, Search, Trash2, UsersRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, PageShell } from './ui/page';

const normalize = value => String(value || '').trim().toLocaleLowerCase();

const inputStyle = 'min-h-11 min-w-0 w-full rounded-lg border border-border bg-white px-3 text-base text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm';

const iconStyle = 'grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50';

export default function RosterManager({ title, description, rosterKey, role, person, heading, actions, children }) {
  const [roster, setRoster] = useState([]);
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const busy = useRef(false);
  const editInput = useRef(null);
  const sequence = useRef(0);
  const endpoint = `/api/allowed_${rosterKey}`;

  const load = async () => {
    const id = ++sequence.current;
    setLoading(true);
    setLoadError('');

    try {
      const [response, accountResponse] = await Promise.all([fetch(endpoint), fetch('/api/users').catch(() => null)]);
      const data = await response.json();

      // Validate the roster API's string-array contract before using names in controls.
      // eslint-disable-next-line anti-slop/no-runtime-typeof
      if (!response.ok || !Array.isArray(data[rosterKey]) || data[rosterKey].some(item => typeof item !== 'string')) {
        throw new Error(data.error || 'Could not load the roster. Try again.');
      }

      const accounts = accountResponse?.ok ? await accountResponse.json().catch(() => null) : null;

      if (id !== sequence.current) return;

      setRoster(data[rosterKey]);
      setUsers(Array.isArray(accounts?.users) ? accounts.users.filter(user => user.role === role) : null);

      if (!Array.isArray(accounts?.users)) setFilter('all');
    } catch (error) {
      if (id === sequence.current) setLoadError(error.message || 'Could not load the roster. Try again.');
    } finally {
      if (id === sequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();

    return () => { sequence.current += 1; };
  }, [endpoint, role]);

  useEffect(() => {
    if (editing !== null) editInput.current?.focus({ preventScroll: true });
  }, [editing]);

  const save = async next => {
    if (busy.current) return false;

    busy.current = true;
    setSaving(true);
    setSaveError('');

    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [rosterKey]: next }) });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success !== true) throw new Error(data.error || 'Could not save the roster. Your changes have not been applied. Try again.');

      setRoster(next);

      return true;
    } catch (error) {
      setSaveError(error.message || 'Could not save the roster. Try again.');

      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const submitName = async event => {
    event.preventDefault();
    const value = (editing === null ? name : editName).trim();

    if (!value) {
      setSaveError('Enter a full name.');

      return;
    }

    if (roster.some((item, index) => index !== editing && normalize(item) === normalize(value))) {
      setSaveError('This name is already on the roster.');

      return;
    }

    const next = editing === null ? [...roster, value] : roster.map((item, index) => index === editing ? value : item);

    if (await save(next)) {
      setName('');
      setAdding(false);
      setEditing(null);
      toast.success('Roster saved.');
    }
  };

  const remove = async (value, index) => {
    if (!window.confirm(`Remove ${value} from the ${person} registration roster? Their existing account will not be deleted.`)) return;

    if (await save(roster.filter((_, itemIndex) => itemIndex !== index))) toast.success('Name removed from roster.');
  };

  const registeredNames = new Set((users || []).map(user => normalize(user.name)));
  const joinedCount = roster.filter(item => registeredNames.has(normalize(item))).length;

  const visible = roster.map((value, index) => ({ value, index, joined: registeredNames.has(normalize(value)) }))
    .filter(item => normalize(item.value).includes(normalize(query)) && (filter === 'all' || (filter === 'joined' ? item.joined : !item.joined)));

  const disabled = loading || Boolean(loadError) || saving;
  const rosterLabel = role === 'student' ? 'students' : 'volunteers';

  const countSummary = query.trim() || filter !== 'all'
    ? `${visible.length} shown · ${roster.length} total`
    : `${roster.length} ${rosterLabel}${users === null ? '' : ` · ${joinedCount} registered`}`;

  const RosterIcon = role === 'student' ? GraduationCap : UsersRound;
  const rosterTone = role === 'student' ? 'bg-[#15345b]' : 'bg-teal-900';
  const nameTone = role === 'student' ? 'bg-blue-50 text-blue-800' : 'bg-teal-50 text-teal-800';

  return (
    <PageShell width="wide" contentClassName="space-y-4 sm:space-y-6">
      <PageHeader title={title} description={<span className="hidden lg:inline">{description}</span>} actions={actions} className="flex-row items-start justify-between lg:items-end" />
      {!loading && !loadError && roster.length > 0 && <p className="text-sm text-muted" aria-live="polite">{countSummary}</p>}
      {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-sm text-red-800"><p>{loadError}</p><button type="button" onClick={load} className="min-h-11 rounded-md px-3 font-semibold underline focus-visible:ring-2 focus-visible:ring-primary">Retry</button></div>}
      {!loading && users === null && !loadError && <div role="status" className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted"><p>Registration status is unavailable. You can still edit the roster.</p><button type="button" onClick={load} disabled={saving || editing !== null} className="min-h-11 px-3 font-semibold text-primary underline">Retry</button></div>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <aside aria-label={`Add ${person} to roster`} className="lg:col-start-2 lg:row-start-1">
      <button type="button" aria-expanded={adding} aria-controls={`${rosterKey}-add-panel`} disabled={disabled || editing !== null} onClick={() => setAdding(open => !open)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primaryHover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 lg:hidden">{adding ? <X aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />}{adding ? 'Cancel' : `Add ${person === 'student' ? 'Student' : 'Volunteer'}`}</button>
      <div id={`${rosterKey}-add-panel`} className={`${adding ? 'block' : 'hidden'} mt-3 rounded-xl border border-border bg-white p-4 lg:mt-0 lg:block lg:p-5`}>
      <form onSubmit={submitName} className="space-y-3">
        <label htmlFor={`${rosterKey}-name`} className="block text-sm font-semibold text-fg">{person === 'student' ? 'Student' : 'Volunteer'} Name</label>
        <div className="flex items-start gap-2 lg:flex-col lg:gap-3">
          <input id={`${rosterKey}-name`} name="roster-name" autoComplete="off" value={name} onChange={event => setName(event.target.value)} disabled={disabled || editing !== null} className={inputStyle} />
          <button type="submit" disabled={disabled || editing !== null} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 lg:w-full"><Plus aria-hidden="true" className="h-4 w-4" />Add</button>
        </div>
      </form>
      {children && <div className="mt-5 hidden border-t border-border pt-4 text-xs leading-5 text-muted lg:block">{children}</div>}
      </div>
      <p className="mt-4 hidden text-xs leading-5 text-muted lg:block"><a href="#accounts" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">Manage Accounts</a></p>
      </aside>
      <section aria-labelledby={`${rosterKey}-heading`} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white lg:col-start-1 lg:row-start-1">
        {saveError && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 lg:m-4">{saveError}</p>}
        <header className="border-b border-border">
          <div className={`flex items-center gap-2.5 px-4 py-4 text-white lg:px-5 ${rosterTone}`}><RosterIcon aria-hidden="true" className="h-5 w-5" /><h2 id={`${rosterKey}-heading`} className="text-base font-semibold">{heading}</h2></div>
          <div className="flex flex-wrap gap-2 p-3 lg:p-4">
            <label className="relative min-w-0 flex-1"><span className="sr-only">Search roster</span><Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-muted" /><input type="search" name="roster-search" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} disabled={editing !== null} placeholder="Search names" className={`${inputStyle} pl-9`} /></label>
            {users !== null && <select aria-label="Registration status" value={filter} onChange={event => setFilter(event.target.value)} disabled={editing !== null} className="min-h-11 max-w-full rounded-lg border border-border bg-white px-2 text-sm text-fg focus-visible:ring-2 focus-visible:ring-primary"><option value="all">All names</option><option value="joined">Registered</option><option value="waiting">Not registered</option></select>}
          </div>
        </header>
        <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_120px_96px] gap-3 border-b border-border bg-canvas px-5 py-3 text-xs font-medium text-muted lg:grid"><span>Full Name</span><span>Registration</span><span className="text-right">Actions</span></div>
        {loading ? <p role="status" className="flex items-center justify-center gap-2 p-8 text-sm text-muted"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Loading roster…</p> : loadError ? <p className="p-6 text-sm text-muted">The roster could not be displayed. Retry above.</p> : !visible.length ? <div className="p-6 text-sm text-muted"><p>{roster.length ? 'No names match these filters.' : `No ${person}s on roster.`}</p>{roster.length > 0 && <button type="button" onClick={() => { setQuery(''); setFilter('all'); }} className="mt-2 min-h-11 font-semibold text-primary underline">Clear filters</button>}</div> : <ul className="divide-y divide-border">
          {visible.map(item => <li key={normalize(item.value)} className="px-3 py-3 transition-colors hover:bg-canvas/70 focus-within:bg-canvas/70 lg:px-5 lg:py-3">
            {editing === item.index ? <form onSubmit={submitName} className="space-y-2 py-1"><label htmlFor={`${rosterKey}-edit`} className="text-xs font-medium text-muted">Edit full name</label><div className="flex gap-1"><input ref={editInput} id={`${rosterKey}-edit`} name="edit-roster-name" autoComplete="off" value={editName} onChange={event => setEditName(event.target.value)} disabled={saving} className={inputStyle} /><button type="submit" aria-label="Save name" disabled={saving} className={iconStyle}><Check aria-hidden="true" className="h-4 w-4" /></button><button type="button" aria-label="Cancel editing" disabled={saving} onClick={() => { setEditing(null); setSaveError(''); }} className={iconStyle}><X aria-hidden="true" className="h-4 w-4" /></button></div></form> : <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[minmax(0,1fr)_120px_96px]"><div className="min-w-0 lg:contents"><div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold min-[360px]:inline-flex ${nameTone}`}>{item.value.trim().charAt(0).toUpperCase()}</span><p className="min-w-0 break-words text-sm font-semibold leading-5 text-fg">{item.value}</p></div><p className={`mt-1.5 flex items-center gap-1.5 text-xs min-[360px]:pl-12 lg:mt-0 lg:pl-0 ${item.joined ? 'text-emerald-800' : 'text-muted'}`}>{item.joined ? <CircleCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> : <Clock3 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}{users === null ? 'Status unavailable' : item.joined ? 'Registered' : 'Not registered'}</p></div><div className="flex items-center justify-end gap-1"><button type="button" aria-label={`Edit ${item.value}`} onClick={() => { setEditing(item.index); setEditName(item.value); setSaveError(''); }} disabled={disabled || editing !== null} className={iconStyle}><Edit2 aria-hidden="true" className="h-4 w-4" /></button><button type="button" aria-label={`Remove ${item.value} from roster`} onClick={() => remove(item.value, item.index)} disabled={disabled || editing !== null} className={`${iconStyle} hover:text-red-700`}><Trash2 aria-hidden="true" className="h-4 w-4" /></button></div></div>}
          </li>)}
        </ul>}
      </section>
      </div>
      <p className="text-xs text-muted lg:hidden"><a href="#accounts" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">Manage Accounts</a></p>
      <span role="status" className="sr-only">{saving ? 'Saving roster…' : ''}</span>
    </PageShell>
  );
}
