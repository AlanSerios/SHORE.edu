import React, { useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, CircleCheck, Edit2, FileDown, GraduationCap, KeyRound, Loader2, Search, ShieldCheck, Trash2, UsersRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { downloadBlob } from '../utils';
import { PageHeader, PageShell } from './ui/page';
import { Button } from './ui/button';

const inputClassName = 'min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-base text-fg placeholder:text-muted/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-canvas sm:text-sm';

const actionClassName = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50';

const accountFilters = [
  { value: 'all', label: 'All', marker: 'bg-primary', active: 'border-primary bg-primary text-white' },
  { value: 'student', label: 'Students', marker: 'bg-blue-600', active: 'bg-blue-100 text-blue-950' },
  { value: 'volunteer', label: 'Volunteers', marker: 'bg-teal-600', active: 'bg-teal-100 text-teal-950' },
  { value: 'admin', label: 'Admins', marker: 'bg-slate-700', active: 'bg-slate-200 text-slate-950' }
];

const roleDetails = {
  admin: { label: 'Admin', Icon: ShieldCheck, tone: 'text-slate-800', avatar: 'bg-slate-900 text-white' },
  student: { label: 'Student', Icon: GraduationCap, tone: 'text-blue-700', avatar: 'bg-blue-100 text-blue-800' },
  volunteer: { label: 'Volunteer', Icon: UsersRound, tone: 'text-teal-800', avatar: 'bg-teal-100 text-teal-900' }
};

const stageLabels = {
  exploring: 'Exploring options',
  preparing: 'Preparing requirements',
  applied: 'Already applied',
  waiting: 'Waiting for an exam or results'
};

const incomeLabels = {
  under_10k: 'Below ₱10,000',
  '10k_20k': '₱10,000–₱19,999',
  '20k_40k': '₱20,000–₱39,999',
  '40k_60k': '₱40,000–₱59,999',
  '60k_plus': '₱60,000 or more',
  prefer_not_to_say: 'Prefer not to say'
};

const getInitials = (name, email) => {
  const words = String(name || email || '?').trim().split(/[\s@._-]+/).filter(Boolean);

  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
};

const getProfileImageSrc = user => {
  const profilePicture = String(user?.profilePicture || '').trim();
  const avatarUrl = String(user?.avatar || '').trim();

  if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(profilePicture)) return profilePicture;

  return avatarUrl.startsWith('https://') ? avatarUrl : '';
};

export default function AccountsView() {
  const [users, setUsers] = useState([]);
  const [studentsRoster, setStudentsRoster] = useState(null);
  const [volunteersRoster, setVolunteersRoster] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isExportingInterests, setIsExportingInterests] = useState(false);
  const [editingEmail, setEditingEmail] = useState(null);
  const [deletingEmail, setDeletingEmail] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [usersLoadFailed, setUsersLoadFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [profileOptions, setProfileOptions] = useState({ schools: [], scholarships: [] });
  const [profileStatus, setProfileStatus] = useState('idle');
  const [profileError, setProfileError] = useState('');
  const profileDialogRef = useRef(null);
  const profileRequestSequence = useRef(0);
  const loadSequence = useRef(0);

  const fetchData = async () => {
    const requestId = ++loadSequence.current;

    setIsLoading(true);
    setLoadError('');
    setUsersLoadFailed(false);

    try {
      const [usersRes, studentsRes, volunteersRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/allowed_students').catch(() => null),
        fetch('/api/allowed_volunteers').catch(() => null)
      ]);

      const usersData = await usersRes.json().catch(() => ({}));

      if (!usersRes.ok || !Array.isArray(usersData.users)) {
        throw new Error(usersData.error || 'Could not load accounts. Try again.');
      }

      const readRoster = async (response, key) => {
        if (!response?.ok) return null;
        const data = await response.json().catch(() => null);

        return Array.isArray(data?.[key]) ? data[key] : null;
      };

      const [studentsData, volunteersData] = await Promise.all([
        readRoster(studentsRes, 'students'),
        readRoster(volunteersRes, 'volunteers')
      ]);

      if (requestId !== loadSequence.current) return;

      setUsers(usersData.users);
      setStudentsRoster(studentsData);
      setVolunteersRoster(volunteersData);

      if (!studentsData || !volunteersData) {
        setActiveFilter(current => current === 'unrostered' ? 'all' : current);
        setLoadError('Roster status is temporarily unavailable. Accounts are still shown.');
      }
    } catch (loadFailure) {
      if (requestId !== loadSequence.current) return;

      console.error(loadFailure);
      setUsersLoadFailed(true);
      setLoadError(loadFailure.message || 'Could not load accounts. Try again.');
    } finally {
      if (requestId === loadSequence.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    return () => {
      loadSequence.current += 1;
    };
  }, []);

  const getRosterStatus = (user) => {
    if (user.role === 'admin') return { status: 'admin', label: 'Admin' };
    const userName = String(user.name || '').trim().toLowerCase();

    if (user.role === 'student') {
      if (!studentsRoster) return { status: 'unknown', label: 'Roster unavailable' };
      const onRoster = studentsRoster.some(name => String(name || '').trim().toLowerCase() === userName);

      return onRoster
        ? { status: 'on_roster', label: 'On roster' }
        : { status: 'not_on_roster', label: 'Not on roster' };
    }

    if (user.role === 'volunteer') {
      if (!volunteersRoster) return { status: 'unknown', label: 'Roster unavailable' };
      const onRoster = volunteersRoster.some(name => String(name || '').trim().toLowerCase() === userName);

      return onRoster
        ? { status: 'on_roster', label: 'On roster' }
        : { status: 'not_on_roster', label: 'Not on roster' };
    }

    return { status: 'unknown', label: 'Not applicable' };
  };

  const exportStudentInterests = async () => {
    setIsExportingInterests(true);

    try {
      const response = await fetch('/api/student-onboarding/export');

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Could not export student interests.');
      }

      downloadBlob(await response.blob(), 'SHORE_Student_Interests.xlsx');
      toast.success('Student interests workbook downloaded.');
    } catch (exportFailure) {
      toast.error(exportFailure.message || 'Could not export student interests.');
    } finally {
      setIsExportingInterests(false);
    }
  };

  const handleEdit = (user) => {
    setEditingEmail(user.email);
    setEditForm({ name: user.name || '', email: user.email || '', password: '' });
    setError('');
  };

  const handleSaveEdit = async () => {
    const name = String(editForm.name || '').trim();
    const email = String(editForm.email || '').trim();
    const emailChanged = email.toLowerCase() !== String(editingEmail || '').toLowerCase();

    if (!name || !email) {
      const message = !name ? 'Enter a name before saving.' : 'Enter an email before saving.';
      setError(message);
      toast.error(message);

      return;
    }

    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      toast.error('Enter a valid email address.');

      return;
    }

    const password = String(editForm.password || '');

    if (password && (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^a-zA-Z0-9]/.test(password)
    )) {
      const message = 'New password must be at least 8 characters and contain uppercase, lowercase, a number, and a symbol.';
      setError(message);
      toast.error('New password does not meet security requirements.');

      return;
    }

    setIsSavingEdit(true);
    setError('');

    try {
      const payload = { name, email };

      if (password) payload.password = password;

      const response = await fetch(`/api/users/${encodeURIComponent(editingEmail)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error || 'Could not update this account.');

      if (!data.user) throw new Error('The server did not return the updated account. Refresh the list to confirm.');

      setUsers(current => current.map(user => user.email === editingEmail ? data.user : user));
      setEditingEmail(null);
      setEditForm({});
      toast.success('Account updated.');
    } catch (saveFailure) {
      const message = saveFailure.message || 'Could not update this account.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (user) => {
    const email = user.email;
    const displayName = user.name || email;

    if (!window.confirm(`Delete the SHORE account for ${displayName} (${email})? This removes the account and its access.`)) return;

    setDeletingEmail(email);
    setError('');

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(email)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error || 'Could not delete this account.');
      setUsers(current => current.filter(account => account.email !== email));
      toast.success('Account deleted.');
    } catch (deleteFailure) {
      const message = deleteFailure.message || 'Could not delete this account.';
      setError(message);
      toast.error(message);
    } finally {
      setDeletingEmail(null);
    }
  };

  const loadAccountProfile = async (user) => {
    const requestId = ++profileRequestSequence.current;
    setSelectedAccount(user);
    setStudentProfile(null);
    setProfileError('');
    setProfileStatus(user.role === 'student' ? 'loading' : 'ready');

    if (!profileDialogRef.current?.open) profileDialogRef.current?.showModal();

    if (user.role !== 'student') return;

    try {
      const [profileResponse, optionsResponse] = await Promise.all([
        fetch(`/api/student-onboarding?email=${encodeURIComponent(user.email)}`),
        fetch('/api/onboarding/options').catch(() => null)
      ]);

      const profileResult = await profileResponse.json().catch(() => ({}));

      if (!profileResponse.ok) throw new Error(profileResult.error || 'Could not load this student profile.');

      const optionsResult = optionsResponse?.ok ? await optionsResponse.json().catch(() => ({})) : {};

      if (requestId !== profileRequestSequence.current) return;

      setStudentProfile(profileResult.students?.[0] || null);
      setProfileOptions({
        schools: Array.isArray(optionsResult.schools) ? optionsResult.schools : [],
        scholarships: Array.isArray(optionsResult.scholarships) ? optionsResult.scholarships : []
      });
      setProfileStatus('ready');
    } catch (loadFailure) {
      if (requestId !== profileRequestSequence.current) return;

      setProfileError(loadFailure.message || 'Could not load this student profile.');
      setProfileStatus('error');
    }
  };

  const closeAccountProfile = () => {
    profileRequestSequence.current += 1;
    profileDialogRef.current?.close();
  };

  const getProfileSelections = (values, options, key, otherValue) => {
    if (!Array.isArray(values) || values.length === 0) return [];

    return values.map(value => {
      if (value === 'other') return otherValue || 'Other';

      if (value === 'undecided') return 'Still deciding';

      const option = options.find(item => item.id === value);

      return option?.[key] || option?.provider || '';
    }).filter(Boolean);
  };

  const unrosteredCount = users.filter(user => getRosterStatus(user).status === 'not_on_roster').length;
  const studentsCount = users.filter(user => user.role === 'student').length;
  const volunteersCount = users.filter(user => user.role === 'volunteer').length;
  const adminsCount = users.filter(user => user.role === 'admin').length;
  const rosterDataReady = Array.isArray(studentsRoster) && Array.isArray(volunteersRoster);
  const query = searchQuery.trim().toLowerCase();
  const hasActiveCriteria = Boolean(query) || activeFilter !== 'all';

  const filteredUsers = users.filter(user => {
    const matchesSearch = [user.name, user.email, user.role]
      .some(value => String(value || '').toLowerCase().includes(query));

    if (!matchesSearch) return false;
    const rosterStatus = getRosterStatus(user).status;

    if (activeFilter === 'unrostered') return rosterStatus === 'not_on_roster';

    if (activeFilter === 'student') return user.role === 'student';

    if (activeFilter === 'volunteer') return user.role === 'volunteer';

    if (activeFilter === 'admin') return user.role === 'admin';

    return true;
  });

  const emptyMessage = usersLoadFailed
    ? 'Could not load the account list.'
    : query
      ? `No accounts match “${searchQuery.trim()}”.`
      : activeFilter === 'unrostered'
        ? 'No accounts are missing from their roster.'
        : activeFilter === 'student'
          ? 'No student accounts.'
          : activeFilter === 'volunteer'
            ? 'No volunteer accounts.'
            : activeFilter === 'admin'
              ? 'No admin accounts.'
              : 'No accounts yet.';

  const renderEditFields = (user, compact = false) => (
    <div className={compact ? 'grid gap-3' : 'grid gap-2'}>
      <label className="grid gap-1 text-xs font-medium text-muted">
        Name
        <input type="text" aria-label={`Name for ${user.email}`} autoComplete="off" className={inputClassName} value={editForm.name || ''} onChange={event => setEditForm(current => ({ ...current, name: event.target.value }))} />
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted">
        Email
        <input type="email" aria-label={`Email for ${user.name || user.email}`} autoComplete="off" className={inputClassName} value={editForm.email || ''} onChange={event => setEditForm(current => ({ ...current, email: event.target.value }))} />
      </label>
    </div>
  );

  const renderPasswordField = () => (
    <label className="grid gap-1 text-xs font-medium text-muted">
      New password <span className="font-normal">(optional)</span>
      <input type="password" aria-label="New password, optional" autoComplete="new-password" placeholder="Leave blank to keep current password" className={inputClassName} value={editForm.password || ''} onChange={event => setEditForm(current => ({ ...current, password: event.target.value }))} />
    </label>
  );

  const renderIdentity = (user) => {
    const role = roleDetails[user.role] || roleDetails.student;
    const isEditing = editingEmail === user.email;

    return (
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-semibold ring-1 ring-inset ring-black/5 ${role.avatar}`}>
          {getInitials(user.name, user.email)}
          {getProfileImageSrc(user) && <img src={getProfileImageSrc(user)} alt="" referrerPolicy="no-referrer" onError={event => event.currentTarget.remove()} className="absolute inset-0 h-full w-full object-cover" />}
        </span>
        <div className="min-w-0 flex-1">
          {isEditing ? renderEditFields(user) : (
            <button type="button" onClick={() => loadAccountProfile(user)} disabled={Boolean(editingEmail) || Boolean(deletingEmail)} aria-haspopup="dialog" className="group block min-h-11 w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">
              <span className="sr-only">Open profile: </span>
              <span className="block break-words font-semibold leading-5 text-fg underline-offset-4 group-hover:text-primary group-hover:underline">{user.name || 'Unnamed account'}</span>
              <span className="mt-0.5 block break-all text-sm leading-5 text-muted">{user.email}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderRole = (user) => {
    const role = roleDetails[user.role] || { label: user.role || 'Unknown', Icon: UsersRound, tone: 'text-muted' };
    const RoleIcon = role.Icon;

    return (
      <span className={`inline-flex items-center gap-2 font-medium ${role.tone}`}>
        <RoleIcon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
        <span>{role.label}</span>
      </span>
    );
  };

  const renderRosterStatus = (user, rosterInfo) => {
    if (user.role === 'admin' || rosterInfo.status === 'unknown') {
      return <span className="text-sm text-muted">{user.role === 'admin' ? 'Not applicable' : rosterInfo.label}</span>;
    }

    const onRoster = rosterInfo.status === 'on_roster';
    const StatusIcon = onRoster ? CircleCheck : CircleAlert;

    return (
      <span className={`inline-flex items-center gap-2 text-sm ${onRoster ? 'text-emerald-800' : 'font-medium text-amber-800'}`}>
        <StatusIcon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
        {rosterInfo.label}
      </span>
    );
  };

  const renderActions = (user) => {
    const isDeleting = deletingEmail === user.email;

    if (editingEmail === user.email) {
      return (
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={handleSaveEdit} disabled={isSavingEdit} className={`${actionClassName} text-primary hover:bg-primary/5`} aria-label="Save account changes" title="Save changes">
            {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span className="sr-only">Save</span>
          </button>
          <button type="button" onClick={() => { setEditingEmail(null); setEditForm({}); setError(''); }} disabled={isSavingEdit} className={`${actionClassName} text-muted hover:bg-canvas hover:text-fg`} aria-label="Cancel account editing" title="Cancel editing">
            <X className="h-4 w-4" />
            <span className="sr-only">Cancel</span>
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => handleEdit(user)} disabled={Boolean(editingEmail) || Boolean(deletingEmail)} className={`${actionClassName} text-muted hover:bg-primary/5 hover:text-primary`} aria-label={`Edit account for ${user.name || user.email}`} title="Edit account">
          <Edit2 className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </button>
        <button type="button" onClick={() => handleDelete(user)} disabled={Boolean(editingEmail) || Boolean(deletingEmail)} className={`${actionClassName} text-muted hover:bg-red-50 hover:text-red-700`} aria-label={`Delete account for ${user.name || user.email}`} title={isDeleting ? 'Deleting account' : 'Delete account'}>
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span className="sr-only">Delete</span>
        </button>
      </div>
    );
  };

  const renderMobileAccount = (user, rosterInfo, isEditing) => {
    if (isEditing) {
      return (
        <article key={user.email} className="space-y-3 px-3 py-3 sm:p-5">
          {renderEditFields(user, true)}
          {renderPasswordField()}
          <div className="flex justify-end">{renderActions(user)}</div>
        </article>
      );
    }

    const rosterState = rosterInfo.status;
    const rosterIcon = rosterState === 'on_roster' ? CircleCheck : rosterState === 'not_on_roster' ? CircleAlert : null;
    const RosterIcon = rosterIcon;

    return (
      <article key={user.email} className="grid gap-2 px-3 py-3 transition-colors hover:bg-blue-50/30 sm:p-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-semibold ring-1 ring-inset ring-black/5 ${(roleDetails[user.role] || roleDetails.student).avatar}`}>
            {getInitials(user.name, user.email)}
            {getProfileImageSrc(user) && <img src={getProfileImageSrc(user)} alt="" referrerPolicy="no-referrer" onError={event => event.currentTarget.remove()} className="absolute inset-0 h-full w-full object-cover" />}
          </span>
          <button type="button" onClick={() => loadAccountProfile(user)} disabled={Boolean(editingEmail) || Boolean(deletingEmail)} aria-haspopup="dialog" className="group min-h-11 min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">
            <span className="sr-only">Open profile: </span>
            <span className="block truncate text-sm font-semibold leading-5 text-fg underline-offset-4 group-hover:text-primary group-hover:underline" title={user.name || 'Unnamed account'}>{user.name || 'Unnamed account'}</span>
            <span className="block truncate text-xs leading-5 text-muted" title={user.email}>{user.email}</span>
          </button>
          {renderActions(user)}
        </div>
        <div className="flex min-w-0 items-center gap-1.5 pl-[50px] text-xs leading-5">
          {renderRole(user)}
          {user.role !== 'admin' && <>
            <span aria-hidden="true" className="h-3.5 border-l border-border" />
            <span className={`inline-flex min-w-0 flex-1 items-center gap-1 ${rosterState === 'on_roster' ? 'text-emerald-800' : rosterState === 'not_on_roster' ? 'font-medium text-amber-800' : 'text-muted'}`}>
              {RosterIcon && <RosterIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />}
              <span className="truncate" title={rosterInfo.label}>{rosterState === 'not_on_roster' ? 'Needs roster' : rosterInfo.label}</span>
            </span>
            <span aria-hidden="true" className="hidden h-3.5 border-l border-border min-[360px]:inline-block" />
            <span className={`hidden shrink-0 items-center gap-1 min-[360px]:inline-flex ${user.hasPassword !== false ? 'text-emerald-800' : 'font-medium text-amber-800'}`}>
              <KeyRound aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
              {user.hasPassword !== false ? 'Password set' : 'No password'}
            </span>
          </>}
        </div>
      </article>
    );
  };

  const renderEmptyState = () => (
    <div className="px-5 py-10 text-center text-sm text-muted">
      <p>{emptyMessage}</p>
      {hasActiveCriteria && !usersLoadFailed && (
        <button type="button" onClick={() => { setSearchQuery(''); setActiveFilter('all'); }} className="mt-2 min-h-11 px-3 font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          Clear search and filter
        </button>
      )}
    </div>
  );

  const renderLoadingState = () => (
    <div role="status" className="px-5 py-10 text-center text-sm text-muted">
      <Loader2 aria-hidden="true" className="mx-auto mb-2 h-5 w-5 animate-spin" />
      Loading accounts
    </div>
  );

  return (
    <PageShell contentClassName="space-y-4 sm:space-y-6">
      <PageHeader
        title="Account Management"
        description="Find accounts and manage roster access."
        className="flex-row items-start justify-between gap-2 sm:items-end"
        titleClassName="whitespace-nowrap text-[22px] min-[360px]:text-2xl sm:text-3xl"
        actions={(
          <Button type="button" variant="outline" className="min-h-11 min-w-11 w-auto shrink-0 px-2.5 text-xs sm:px-3 sm:text-sm" onClick={exportStudentInterests} disabled={isExportingInterests}>
            {isExportingInterests ? <Loader2 aria-hidden="true" className="mr-0 h-4 w-4 min-[360px]:mr-2 sm:mr-2 animate-spin" /> : <FileDown aria-hidden="true" className="mr-0 h-4 w-4 min-[360px]:mr-2 sm:mr-2" />}
            <span className="sr-only min-[360px]:hidden sm:hidden">Export student interests</span>
            <span className="hidden min-[360px]:inline sm:hidden">Export</span>
            <span className="hidden sm:inline">Export student interests</span>
          </Button>
        )}
      />

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-4 py-3 text-sm text-fg">
          <span>{loadError}</span>
          <Button type="button" variant="outline" className="min-h-11" onClick={fetchData} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Retry
          </Button>
        </div>
      )}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>}

      <section aria-label="Search and filter accounts" className="grid gap-3 sm:grid-cols-[minmax(190px,0.8fr)_minmax(0,1.2fr)] sm:items-center">
        <label className="relative block">
          <span className="sr-only">Search accounts</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input type="search" name="account-search" autoComplete="off" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} disabled={Boolean(editingEmail)} placeholder="Search names or emails" className={`${inputClassName} pl-10`} />
        </label>
        <div role="group" aria-label="Filter accounts by role" className="flex flex-wrap gap-2 sm:justify-end">
          {accountFilters.map(filter => {
            const count = filter.value === 'all'
              ? users.length
              : filter.value === 'student'
                ? studentsCount
                : filter.value === 'volunteer'
                  ? volunteersCount
                  : adminsCount;

            const selected = activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveFilter(filter.value)}
                disabled={Boolean(editingEmail)}
                className={`inline-flex min-h-11 min-w-0 flex-none items-center justify-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 max-[359px]:px-1 sm:gap-1.5 sm:px-3 sm:text-sm ${selected ? filter.active : 'border-border bg-white text-fg hover:bg-canvas'}`}
              >
                <span aria-hidden="true" className={`hidden h-2 w-2 shrink-0 rounded-full sm:inline-block ${filter.marker}`} />
                <span className="truncate">{filter.label}</span>
                <span className="tabular-nums">{isLoading ? '–' : count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {rosterDataReady && unrosteredCount > 0 && (
        <aside aria-label="Roster review" className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 sm:gap-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-amber-950 sm:gap-2.5 sm:text-sm">
            <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-700" />
            <p className="truncate">
              <span className="font-semibold">{unrosteredCount}</span>
              <span className="hidden min-[360px]:inline"> {unrosteredCount === 1 ? 'account needs' : 'accounts need'} roster review.</span>
              <span className="min-[360px]:hidden"> {unrosteredCount === 1 ? 'needs' : 'need'} roster review.</span>
            </p>
          </div>
          <button
            type="button"
            aria-pressed={activeFilter === 'unrostered'}
            aria-label={activeFilter === 'unrostered' ? 'Show all accounts' : 'Review accounts without a roster match'}
            onClick={() => setActiveFilter(activeFilter === 'unrostered' ? 'all' : 'unrostered')}
            disabled={Boolean(editingEmail)}
            className="min-h-11 shrink-0 justify-self-end rounded-md px-2 text-xs font-semibold text-amber-950 underline decoration-amber-500 underline-offset-4 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:text-sm"
          >
            {activeFilter === 'unrostered' ? 'Show all' : 'Review'}
          </button>
        </aside>
      )}

      <section aria-labelledby="accounts-list-title" className="overflow-hidden rounded-xl border border-border bg-white">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-white px-3 py-2.5 sm:px-5 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <UsersRound aria-hidden="true" className="hidden h-5 w-5 shrink-0 text-primary sm:block" strokeWidth={1.8} />
            <div className="min-w-0">
              <h2 id="accounts-list-title" className="text-sm font-semibold text-fg sm:text-base">Account Directory</h2>
              <p className="mt-0.5 hidden text-xs text-muted sm:block">Open a profile to review saved student plans.</p>
            </div>
          </div>
          {!isLoading && !usersLoadFailed && (
            <span aria-label={`${filteredUsers.length} of ${users.length} accounts shown`} className="shrink-0 text-right text-xs font-medium tabular-nums text-muted sm:text-sm">
              <span className="font-semibold text-fg">{filteredUsers.length}</span> / {users.length} accounts
            </span>
          )}
        </header>
        <div className="hidden xl:block">
          <table className="w-full table-fixed text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
              <tr>
                <th scope="col" className="w-[34%] px-5 py-3">Account</th>
                <th scope="col" className="w-[16%] px-5 py-3">Sign-in</th>
                <th scope="col" className="w-[15%] px-5 py-3">Role</th>
                <th scope="col" className="w-[21%] px-5 py-3">Roster</th>
                <th scope="col" className="w-[14%] px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? <tr><td colSpan={5}>{renderLoadingState()}</td></tr> : usersLoadFailed && users.length === 0 ? <tr><td colSpan={5}>{renderEmptyState()}</td></tr> : filteredUsers.length === 0 ? <tr><td colSpan={5}>{renderEmptyState()}</td></tr> : filteredUsers.map(user => {
                const rosterInfo = getRosterStatus(user);
                const isEditing = editingEmail === user.email;

                return (
                  <tr key={user.email} className="align-middle transition-colors hover:bg-blue-50/40">
                    <td className="px-5 py-4">{renderIdentity(user)}</td>
                    <td className="px-5 py-4 text-sm">
                      {isEditing ? renderPasswordField() : (
                        <span className={`inline-flex items-center gap-2 ${user.hasPassword !== false ? 'text-emerald-800' : 'font-medium text-amber-800'}`}>
                          <KeyRound aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                          {user.hasPassword !== false ? 'Password set' : 'No password'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm">{renderRole(user)}</td>
                    <td className="px-5 py-4">{renderRosterStatus(user, rosterInfo)}</td>
                    <td className="px-3 py-3 text-right">{renderActions(user)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border xl:hidden">
          {isLoading ? renderLoadingState() : usersLoadFailed && users.length === 0 ? renderEmptyState() : filteredUsers.length === 0 ? renderEmptyState() : filteredUsers.map(user => {
            const rosterInfo = getRosterStatus(user);
            const isEditing = editingEmail === user.email;

            return renderMobileAccount(user, rosterInfo, isEditing);
          })}
        </div>
      </section>

      <div>
      <dialog
        ref={profileDialogRef}
        aria-labelledby="account-profile-title"
        onClose={() => {
          profileRequestSequence.current += 1;
          setSelectedAccount(null);
          setStudentProfile(null);
          setProfileStatus('idle');
          setProfileError('');
        }}
        onClick={event => { if (event.target === profileDialogRef.current) closeAccountProfile(); }}
        className="fixed left-1/2 top-1/2 m-0 -translate-x-1/2 -translate-y-1/2 max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-white p-0 text-fg shadow-2xl backdrop:bg-slate-950/50 sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100%-2rem)]"
      >
        {selectedAccount && (() => {
          const selectedRole = roleDetails[selectedAccount.role] || { label: selectedAccount.role || 'Unknown', Icon: UsersRound, avatar: 'bg-slate-100 text-slate-800' };
          const ProfileRoleIcon = selectedRole.Icon;
          const roster = getRosterStatus(selectedAccount);
          const preferences = studentProfile?.preferences || {};
          const schoolNames = getProfileSelections(preferences.schoolInterests, profileOptions.schools, 'name', preferences.otherSchool);
          const scholarshipNames = getProfileSelections(preferences.scholarshipInterests, profileOptions.scholarships, 'title', preferences.otherScholarship);

          const updatedAt = studentProfile?.updatedAt ? new Date(studentProfile.updatedAt) : null;

          const updatedLabel = updatedAt && !Number.isNaN(updatedAt.getTime())
            ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(updatedAt)
            : '';

          return (
            <>
              <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-white px-4 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full text-lg font-semibold ring-1 ring-inset ring-black/5 sm:h-20 sm:w-20 ${selectedRole.avatar}`}>
                    {getProfileImageSrc(selectedAccount)
                      ? <img src={getProfileImageSrc(selectedAccount)} alt={`${selectedAccount.name || 'Account'} profile picture`} referrerPolicy="no-referrer" onError={event => event.currentTarget.remove()} className="absolute inset-0 h-full w-full object-cover" />
                      : <span aria-hidden="true">{getInitials(selectedAccount.name, selectedAccount.email)}</span>}
                  </span>
                  <div className="min-w-0">
                    <h2 id="account-profile-title" className="break-words text-lg font-semibold leading-6 text-fg">{selectedAccount.name || 'Unnamed account'}</h2>
                    <p className="mt-0.5 break-all text-sm text-muted">{selectedAccount.email}</p>
                  </div>
                </div>
                <button type="button" aria-label="Close profile" onClick={closeAccountProfile} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </header>

              <div className="space-y-5 p-4 sm:p-6">
                <section aria-label="Account access" className="grid gap-x-6 gap-y-4 border-b border-border pb-5 sm:grid-cols-3">
                  <div><p className="text-xs font-medium text-muted">Account type</p><p className={`mt-1.5 inline-flex items-center gap-2 text-sm font-semibold ${selectedRole.tone}`}><ProfileRoleIcon aria-hidden="true" className="h-4 w-4" />{selectedRole.label}</p></div>
                  <div><p className="text-xs font-medium text-muted">Roster</p><div className="mt-1.5">{renderRosterStatus(selectedAccount, roster)}</div></div>
                  <div><p className="text-xs font-medium text-muted">Sign-in</p><p className={`mt-1.5 inline-flex items-center gap-2 text-sm ${selectedAccount.hasPassword !== false ? 'text-emerald-800' : 'font-medium text-amber-800'}`}><KeyRound aria-hidden="true" className="h-4 w-4" />{selectedAccount.hasPassword !== false ? 'Password set' : 'No password'}</p></div>
                </section>

                {selectedAccount.role !== 'student' ? (
                  <p className="text-sm leading-6 text-muted">Study plans are collected from student accounts. This account has no student onboarding profile.</p>
                ) : profileStatus === 'loading' ? (
                  <div role="status" className="flex items-center gap-2 py-4 text-sm text-muted"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Loading saved student plans…</div>
                ) : profileStatus === 'error' ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3">
                    <p role="alert" className="min-w-0 text-sm text-red-900">{profileError}</p>
                    <button type="button" onClick={() => loadAccountProfile(selectedAccount)} className="min-h-10 rounded-md px-3 text-sm font-semibold text-red-900 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700">Try again</button>
                  </div>
                ) : !studentProfile ? (
                  <div className="border-l-2 border-slate-300 py-1 pl-4">
                    <h3 className="text-sm font-semibold text-fg">No saved student profile yet</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">Their onboarding plans will appear here after they complete registration.</p>
                  </div>
                ) : (
                  <section aria-labelledby="student-plans-title">
                    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <h3 id="student-plans-title" className="text-base font-semibold text-fg">Student Plans</h3>
                        <p className="mt-0.5 text-sm text-muted">Saved during account setup.</p>
                      </div>
                      {updatedLabel && <p className="text-xs text-muted">Updated {updatedLabel}</p>}
                    </div>
                    <dl className="divide-y divide-border rounded-lg border border-border">
                      <div className="grid gap-1 px-3 py-3 sm:grid-cols-[155px_minmax(0,1fr)] sm:gap-4">
                        <dt className="text-xs font-medium text-muted">Schools</dt>
                        <dd className="break-words text-sm leading-5 text-fg">{schoolNames.length ? schoolNames.join(', ') : 'Not provided'}</dd>
                      </div>
                      <div className="grid gap-1 px-3 py-3 sm:grid-cols-[155px_minmax(0,1fr)] sm:gap-4">
                        <dt className="text-xs font-medium text-muted">Scholarships</dt>
                        <dd className="break-words text-sm leading-5 text-fg">{scholarshipNames.length ? scholarshipNames.join(', ') : 'Not provided'}</dd>
                      </div>
                      <div className="grid gap-1 px-3 py-3 sm:grid-cols-[155px_minmax(0,1fr)] sm:gap-4">
                        <dt className="text-xs font-medium text-muted">Planned course</dt>
                        <dd className="break-words text-sm leading-5 text-fg">{preferences.intendedProgram || 'Not provided'}</dd>
                      </div>
                      <div className="grid gap-1 px-3 py-3 sm:grid-cols-[155px_minmax(0,1fr)] sm:gap-4">
                        <dt className="text-xs font-medium text-muted">Application progress</dt>
                        <dd className="break-words text-sm leading-5 text-fg">{stageLabels[preferences.applicationStage] || 'Not provided'}</dd>
                      </div>
                      <div className="grid gap-1 px-3 py-3 sm:grid-cols-[155px_minmax(0,1fr)] sm:gap-4">
                        <dt className="text-xs font-medium text-muted">Monthly household income <span className="font-normal">· private</span></dt>
                        <dd className="break-words text-sm leading-5 text-fg">{incomeLabels[preferences.householdIncomeRange] || 'Not provided'}</dd>
                      </div>
                    </dl>
                  </section>
                )}
              </div>
            </>
          );
        })()}
      </dialog>
      </div>
    </PageShell>
  );
}
