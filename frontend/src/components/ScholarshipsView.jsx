import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ExternalLink, GraduationCap, MapPin, CheckCircle2, Sparkles, Clock, ShieldCheck, BookmarkPlus, Check, Calendar, FileText, AlertCircle, Search, X } from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';
import { getAllVaultDocuments, findVaultDocForReq } from '../utils/vaultStorage';
import { PageHeader, PageShell } from './ui/page';

const TIMELINE_DATES = [
  ['opensOn', 'Registration opens'],
  ['deadline', 'Registration closes'],
  ['examDate', 'Entrance or qualifying exam'],
  ['resultsDate', 'Results'],
  ['enrollmentDate', 'Enrollment'],
];

const ADMISSION_PORTALS = [
  ['USTP', 'Application form', 'https://prisms.ustp.edu.ph/padmission'],
  ['Central Mindanao University (CMU)', 'CMUCAT registration', 'https://sis.cmu.edu.ph/doorstep/user/cmucat_admission_application'],
  ['Bukidnon State University (BukSU)', 'Admissions portal', 'https://admissions.buksu.edu.ph/'],
  ['Mindanao State University (MSU)', 'SASE advisory', 'https://msunaawan.edu.ph/your-msun-jouney-starts-here/'],
  ['Xavier University', 'Admissions page', 'https://www.xu.edu.ph/admissions'],
  ['Liceo de Cagayan University', 'Admissions page', 'https://www.liceo.edu.ph/UserPanel/Admission'],
  ['PHINMA Cagayan de Oro College', 'Admissions page', 'https://coc.phinma.edu.ph/admission/'],
  ['City College of Cagayan de Oro', 'Admissions page', 'https://citycollegecdo.edu.ph/apply'],
  ['Lourdes College', 'Enrollment portal', 'https://enroll.lccdo.edu.ph/'],
];

function registrationLink(listing) {
  return listing.registrationVerified === true && listing.verified === true ? httpsLink(listing.registrationUrl) : '';
}

function httpsLink(value) {
  try {
    const url = new URL(value);

    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') ? url.href : '';
  } catch {
    return '';
  }
}

export default function ScholarshipsView({ userEmail, userRole }) {
  const [scholarships, setScholarships] = useState([]);
  const [trackedScholarships, setTrackedScholarships] = useState([]);
  const [vaultDocs, setVaultDocs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('manual'); // 'manual' | 'bot'
  const [botInput, setBotInput] = useState('');
  const [isParsingBot, setIsParsingBot] = useState(false);
  const [parseError, setParseError] = useState('');
  const [autoFillSummary, setAutoFillSummary] = useState(null);
  const [listingKind, setListingKind] = useState('scholarship');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'verified' | 'closing'
  const [isLoadingScholarships, setIsLoadingScholarships] = useState(true);
  const [scholarshipLoadError, setScholarshipLoadError] = useState('');
  const [syncState, setSyncState] = useState({ status: 'not_run', lastSuccessAt: '' });

  const [currentScholarship, setCurrentScholarship] = useState({
    id: '',
    title: '',
    provider: '',
    location: 'Mindanao, Philippines',
    deadline: '',
    description: '',
    benefits: '',
    requirements: [''],
    applyLink: '',
    officialDomain: '',
    kind: 'scholarship',
    verified: false
  });

  const fetchScholarships = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) {
      setIsLoadingScholarships(true);
      setScholarshipLoadError('');
    }

    try {
      const res = await fetch('/api/scholarships');

      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setScholarships(data.scholarships || []);
      setSyncState(data.sync || { status: 'not_run', lastSuccessAt: '' });
    } catch {
      setScholarshipLoadError('Scholarships could not be loaded. Check your connection and try again.');
    } finally {
      if (!quiet) setIsLoadingScholarships(false);
    }
  }, []);

  useEffect(() => {
    fetchScholarships();

    if (userEmail) {
      fetchUserTrackedScholarships();
    }
  }, [userEmail, fetchScholarships]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchScholarships({ quiet: true });
    };

    const isFirstCheckPending = !syncState.lastSuccessAt && ['not_run', 'running'].includes(syncState.status);
    const interval = window.setInterval(refreshWhenVisible, isFirstCheckPending ? 45 * 1000 : 15 * 60 * 1000);

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchScholarships, syncState.status, syncState.lastSuccessAt]);

  const fetchUserTrackedScholarships = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      const currentUser = (data.users || []).find(u => u.email === userEmail);

      if (currentUser && currentUser.appliedScholarships) {
        setTrackedScholarships(currentUser.appliedScholarships || []);
      }

      if (userEmail) {
        const vDocs = await getAllVaultDocuments(userEmail);
        setVaultDocs(vDocs || []);
      }
    } catch (e) {
      console.error("Failed to load user tracked scholarships or vault docs", e);
    }
  };

  const handleAutoParseBot = async () => {
    if (!botInput.trim()) {
      setParseError('Paste an official URL or announcement text first.');

      return;
    }

    setIsParsingBot(true);
    setParseError('');

    try {
      const res = await fetch('/api/scholarships/auto-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: botInput.trim() })
      });

      const data = await res.json();

      if (res.ok && data.parsed) {
        setCurrentScholarship({
          ...currentScholarship,
          title: data.parsed.title || currentScholarship.title,
          provider: data.parsed.provider || currentScholarship.provider,
          location: data.parsed.location || currentScholarship.location,
          deadline: data.parsed.deadline || currentScholarship.deadline,
          applyLink: data.parsed.applyLink || currentScholarship.applyLink,
          description: data.parsed.description || currentScholarship.description,
          benefits: data.parsed.benefits || currentScholarship.benefits,
          officialDomain: data.parsed.officialDomain || currentScholarship.officialDomain,
          requirements: data.parsed.requirements?.length ? data.parsed.requirements : [''],
          verified: false
        });
        setAutoFillSummary({
          fields: data.meta?.fieldsDetected || [],
          warnings: data.meta?.warnings || [],
        });
        setActiveModalTab('manual');
        toast.success('Details extracted. Review them before publishing.');
      } else {
        setParseError(data.error || 'Could not extract scholarship details.');
      }
    } catch {
      setParseError('Could not reach the parser. Check your connection and try again.');
    } finally {
      setIsParsingBot(false);
    }
  };

  const handleTrackScholarship = async (scholarship) => {
    if (!userEmail) {
      toast.error("Please log in to track scholarships!");

      return;
    }



    const isAlreadyTracked = trackedScholarships.some(item => {
      const title = item?.title ?? item;

      return title?.toLowerCase() === scholarship.title.toLowerCase();
    });

    if (isAlreadyTracked) {
      toast.info(`"${scholarship.title}" is already in your tracker!`);

      return;
    }

    const defaultReqs = (scholarship.requirements && scholarship.requirements.length > 0)
      ? scholarship.requirements.map(r => ({ name: r?.name ?? r, status: 'missing' }))
      : [
          { name: "Accomplished Application Form", status: "missing" },
          { name: "Grade 12 Report Card (Form 137 / 138)", status: "missing" },
          { name: "PSA Birth Certificate", status: "missing" },
          { name: "Parents' Proof of Income (ITR / Indigency)", status: "missing" },
          { name: "Certificate of Residency", status: "missing" },
          { name: "2x2 ID Picture", status: "missing" }
        ];

    const newTrackedItem = {
      id: scholarship.id || `sch-${Date.now()}`,
      title: scholarship.title,
      provider: scholarship.provider,
      deadline: scholarship.deadline || '',
      applyLink: registrationLink(scholarship) || scholarship.applyLink || '',
      requirements: defaultReqs
    };

    const updatedTracked = [newTrackedItem, ...trackedScholarships];
    setTrackedScholarships(updatedTracked);

    try {
      const res = await fetch(`/api/users/${userEmail}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appliedScholarships: updatedTracked })
      });

      if (res.ok) {
        toast.success(`Added "${scholarship.title}" to your Scholarship Tracker!`);
      } else {
        toast.error("Failed to save to tracker");
      }
    } catch {
      toast.error("Network error saving to tracker");
    }
  };

  const openModal = (scholarship = null, draft = null) => {
    if (scholarship) {
      setCurrentScholarship({
        ...scholarship,
        requirements: scholarship.requirements?.length ? scholarship.requirements : ['']
      });
      setIsEditing(true);
      setActiveModalTab('manual');
      setAutoFillSummary(null);
      setParseError('');
    } else {
      setCurrentScholarship({
        id: crypto.randomUUID(),
        title: '',
        provider: '',
        location: 'Mindanao, Philippines',
        deadline: '',
        description: '',
        benefits: '',
        applyLink: '',
        officialDomain: '',
        kind: listingKind,
        ...draft,
        requirements: draft?.requirements?.length ? draft.requirements : [''],
        verified: false
      });
      setIsEditing(false);
      setActiveModalTab('manual');
      setBotInput('');
      setAutoFillSummary(null);
      setParseError('');
    }

    setIsModalOpen(true);
  };

  const handleRequirementChange = (index, value) => {
    const newReqs = [...currentScholarship.requirements];
    newReqs[index] = value;
    setCurrentScholarship({ ...currentScholarship, requirements: newReqs });
  };

  const addRequirement = () => {
    setCurrentScholarship({
      ...currentScholarship,
      requirements: [...currentScholarship.requirements, '']
    });
  };

  const removeRequirement = (index) => {
    const newReqs = currentScholarship.requirements.filter((_, i) => i !== index);
    setCurrentScholarship({ ...currentScholarship, requirements: newReqs });
  };

  const handleSave = async () => {
    if (!currentScholarship.title || !currentScholarship.provider || !currentScholarship.applyLink) {
      toast.error('Enter the title, school or provider, and source link.');

      return;
    }

    if (currentScholarship.sourceUrl && !currentScholarship.verified) {
      toast.error('Check the source announcement and confirm it before publishing.');

      return;
    }

    const payload = {
      ...currentScholarship,
      registrationUrl: currentScholarship.registrationUrl?.trim() || '',
      requirements: currentScholarship.requirements.filter(r => (r?.name ? r.name.trim() : String(r || '').trim()) !== '')
    };

    try {
      const url = isEditing ? `/api/scholarships/${payload.id}` : '/api/scholarships';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setListingKind(payload.kind === 'admission' ? 'admission' : 'scholarship');
        setActiveFilter('all');
        toast.success(isEditing ? 'Listing updated.' : 'Listing published.');
        fetchScholarships();
        setIsModalOpen(false);
      } else {
        const data = await res.json().catch(() => ({}));

        toast.error(data.error || 'Could not save the listing.');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this scholarship?')) return;

    try {
      const res = await fetch(`/api/scholarships/${id}`, { method: 'DELETE' });

      if (res.ok) {
        toast.success('Scholarship deleted');
        fetchScholarships();
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [selectedScholarshipDetail, setSelectedScholarshipDetail] = useState(null);
  const closeDetailsRef = useRef(null);

  useEffect(() => {
    if (!selectedScholarshipDetail) return undefined;

    const trigger = document.activeElement;
    closeDetailsRef.current?.focus();

    return () => { if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus(); };
  }, [selectedScholarshipDetail]);

  const universalDocuments = [
    { name: "Grade 12 Report Card (Form 137 / 138)", note: "General Weighted Average (GWA) typically 85%+" },
    { name: "PSA Authenticated Birth Certificate", note: "Original copy issued by PSA" },
    { name: "Certificate of Residency / Indigency", note: "From your local Barangay Captain" },
    { name: "Parents' ITR or BIR Tax Exemption", note: "Proof of family annual gross income" },
    { name: "Certificate of Good Moral Character", note: "Signed by School Principal or Guidance Counselor" },
    { name: "2x2 Recent ID Photos (White Background)", note: "With name tag & formal attire" },
    { name: "Proof of Income / 4Ps / Solo Parent ID", note: "If applying under low-income criteria" },
    { name: "Principal or Teacher Recommendation Letter", note: "Attesting to academic standing & character" },
    { name: "Barangay Sketch of Residence Map", note: "Required for field validation" }
  ];

  const getDeadlineBadge = (deadlineStr) => {
    if (!deadlineStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Closed', color: 'bg-slate-100 text-slate-500 border-slate-200', days: diffDays };
    }

    if (diffDays === 0) {
      return { label: 'Closes Today', color: 'bg-red-50 text-red-700 border-red-200 font-bold', days: diffDays };
    }

    if (diffDays <= 7) {
      return { label: `${diffDays}d left`, color: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold', days: diffDays };
    }

    return { label: `${diffDays}d remaining`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold', days: diffDays };
  };

  const isAdmissions = listingKind === 'admission';
  const query = searchQuery.trim().toLowerCase();

  const visiblePortals = isAdmissions && activeFilter === 'all'
    ? ADMISSION_PORTALS.filter(([school, label]) => `${school} ${label}`.toLowerCase().includes(query))
    : [];

  const categoryListings = scholarships.filter(s => (s.kind === 'admission' ? 'admission' : 'scholarship') === listingKind);

  const filteredScholarships = categoryListings.filter(s => {
    const matchesQuery = (
      s.title?.toLowerCase().includes(query) ||
      s.provider?.toLowerCase().includes(query) ||
      s.location?.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query)
    );

    if (!matchesQuery) return false;

    if (activeFilter === 'verified') {
      return s.verified === true;
    }

    if (activeFilter === 'closing') {
      const badge = getDeadlineBadge(s.deadline);

      return badge && badge.days >= 0 && badge.days <= 14;
    }

    return true;
  });

  const formatDeadline = (deadline) => {
    if (!deadline) return '';
    const parsed = new Date(`${deadline}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) return deadline;

    return parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const syncStatusLabel = syncState.status === 'running'
    ? 'Checking official sources now'
    : syncState.status === 'error'
    ? 'Automatic check failed. Showing saved listings.'
    : syncState.lastSuccessAt
      ? 'Last checked ' + new Date(syncState.lastSuccessAt).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
      : 'First automatic check is pending';

  return (
    <PageShell width="wide">
      <PageHeader
        title="College Admissions & Scholarships"
        className="sm:flex-col sm:items-start lg:flex-row lg:items-center"
        actions={userRole === 'admin' && (
          <>
            <button
              type="button"
              onClick={() => openModal()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-[13px] font-semibold text-white hover:bg-primaryHover sm:gap-2 sm:px-3 sm:text-sm"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {isAdmissions ? 'Add admission' : 'Add scholarship'}
            </button>
          </>
        )}
      />

      <p className="mt-1 text-xs text-muted" role="status">
        SHORE checks official school sources after sign-in, at most once every 24 hours. {syncStatusLabel} · Philippine time
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-2 border-b border-border sm:mt-5 sm:gap-x-4">
        <div role="group" aria-label="Opportunity type" className="flex gap-3 sm:gap-6">
          {[['scholarship', 'Scholarships'], ['admission', 'Admissions']].map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={listingKind === kind}
              onClick={() => {
                if (kind === listingKind) return;
                setListingKind(kind);
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className={cn(
                'min-h-12 border-b-2 px-1 text-sm font-semibold outline-offset-[-3px] transition-colors focus-visible:outline-2 focus-visible:outline-primary sm:text-base',
                listingKind === kind ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIsChecklistModalOpen(true)}
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-muted underline-offset-4 hover:text-fg hover:underline sm:text-sm"
        >
          <FileText aria-hidden="true" className="hidden size-4 sm:block" />
          Document kit
        </button>
      </div>

      <div className="mb-4 mt-4 flex flex-wrap items-center gap-2 sm:mb-5">
        <label className="relative min-w-0 flex-1 max-[359px]:basis-full">
          <span className="sr-only">{isAdmissions ? 'Find a school' : 'Find a scholarship'}</span>
          <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="opportunity-search"
            autoComplete="off"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder={isAdmissions ? 'Find a school' : 'Find a scholarship'}
            className="min-h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-base text-fg focus-visible:outline-2 focus-visible:outline-primary sm:text-sm"
          />
        </label>
        {categoryListings.length > 0 && (
          <select
            aria-label="Filter listings"
            value={activeFilter}
            onChange={event => setActiveFilter(event.target.value)}
            className="min-h-11 max-w-full rounded-lg border border-border bg-card px-3 text-sm font-medium text-fg focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="all">All listings</option>
            <option value="verified">Verified</option>
            <option value="closing">Closing soon</option>
          </select>
        )}
      </div>

      {isLoadingScholarships && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading listings">
          {[0, 1, 2].map(item => (
            <div key={item} className="h-80 animate-pulse rounded-2xl border border-border bg-card p-5">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="mt-6 h-6 w-4/5 rounded bg-slate-200" />
              <div className="mt-3 h-4 w-full rounded bg-slate-100" />
              <div className="mt-2 h-4 w-2/3 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {!isLoadingScholarships && scholarshipLoadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-red-600" />
          <h2 className="mt-3 font-bold text-fg">Unable to load {isAdmissions ? 'admissions' : 'scholarships'}</h2>
          <p role="alert" className="mt-1 text-sm text-red-800">{scholarshipLoadError}</p>
          <button onClick={fetchScholarships} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primaryHover">Try again</button>
        </div>
      )}

      {!isLoadingScholarships && !scholarshipLoadError && (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 items-stretch">
        {filteredScholarships.map((scholarship) => {
          const deadlineBadge = getDeadlineBadge(scholarship.deadline);
          const directLink = registrationLink(scholarship);
          const canRegister = directLink && !(deadlineBadge?.days < 0) && !(getDeadlineBadge(scholarship.opensOn)?.days > 0);

          const isTracked = trackedScholarships.some(item => {
            const title = item?.title ?? item;

            return title?.toLowerCase() === scholarship.title.toLowerCase();
          });

          return (
            <article
              key={scholarship.id} 
              className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card"
            >
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                <div className="flex min-h-8 items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {scholarship.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    )}
                  {deadlineBadge && (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${deadlineBadge.color}`}>
                      <Clock className="h-3 w-3" />
                      {deadlineBadge.label}
                    </span>
                  )}
                  </div>

                {userRole === 'admin' && !scholarship.builtIn && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button 
                      onClick={() => openModal(scholarship)} 
                      className="grid size-11 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-fg sm:size-9"
                      aria-label={`Edit ${scholarship.title}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(scholarship.id)} 
                      className="grid size-11 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600 sm:size-9"
                      aria-label={`Delete ${scholarship.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

                <p className="mt-3 line-clamp-2 [overflow-wrap:anywhere] text-sm font-semibold leading-5 text-primary">{scholarship.provider}</p>
              <h2 className="mt-2 break-words text-lg font-bold leading-snug text-fg">
                <button type="button" className="max-w-full [overflow-wrap:anywhere] text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => setSelectedScholarshipDetail(scholarship)}>{scholarship.title}</button>
              </h2>
              
              {scholarship.description && (
                  <p className="mt-2 line-clamp-3 [overflow-wrap:anywhere] text-sm leading-6 text-muted">
                  {scholarship.description}
                </p>
              )}

                <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-muted sm:grid-cols-2">
                  {scholarship.location && (
                    <div className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <dd className="truncate">{scholarship.location}</dd>
                    </div>
                  )}
                {scholarship.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-primary" />
                      <dd>Closes {formatDeadline(scholarship.deadline)}</dd>
                  </div>
                )}
                </dl>

              {scholarship.benefits && (
                  <div className="mt-4 border-t border-border pt-3">
                    <p className="text-xs font-bold text-muted">Benefits and Coverage</p>
                    <p className="mt-1 line-clamp-2 [overflow-wrap:anywhere] text-sm font-medium leading-6 text-fg">
                    {scholarship.benefits}
                  </p>
                </div>
              )}

              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2">
                {canRegister && (
                  <a href={directLink} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-primaryHover">
                    Register <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedScholarshipDetail(scholarship)}
                  className={cn('inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold', canRegister ? 'text-primary hover:bg-canvas' : 'bg-primary text-white hover:bg-primaryHover')}
                >
                  View details
                </button>
                <button
                  onClick={() => handleTrackScholarship(scholarship)}
                  disabled={isTracked}
                  className={`ml-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors ${
                    isTracked 
                      ? 'cursor-default text-emerald-700'
                      : 'text-muted hover:bg-canvas hover:text-fg'
                  }`}
                >
                  {isTracked ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Tracked</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="h-4 w-4" />
                      <span>Track</span>
                    </>
                  )}
                </button>
              </div>
            </article>
          );
        })}

        {filteredScholarships.length === 0 && visiblePortals.length === 0 && (
          <div className="col-span-full rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-semibold text-fg">
              {query || activeFilter !== 'all' ? 'No Matches' : isAdmissions ? 'No Admission Notices Yet' : 'No Scholarships Yet'}
            </h2>
            {(query || activeFilter !== 'all') && (
              <button type="button" onClick={() => { setSearchQuery(''); setActiveFilter('all'); }} className="mt-1 min-h-11 text-sm font-semibold text-primary underline underline-offset-4">
                Clear search and filters
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {visiblePortals.length > 0 && (
        <section aria-labelledby="official-portal-heading" className={cn('overflow-hidden rounded-xl border border-border bg-card', filteredScholarships.length > 0 || scholarshipLoadError ? 'mt-6' : '')}>
          <header className="border-b border-border px-4 py-3.5 sm:px-5">
            <h2 id="official-portal-heading" className="font-semibold text-fg">Official School Portals</h2>
            <p className="mt-0.5 text-sm text-muted">Check each school for its current application dates.</p>
          </header>
          <ul className="grid xl:grid-cols-2">
            {visiblePortals.map(([school, label, url]) => (
              <li key={url} className="min-w-0 border-b border-border xl:odd:border-r xl:last:odd:col-span-2 xl:last:odd:border-r-0">
                <a href={url} target="_blank" rel="noreferrer" className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary hover:bg-canvas sm:px-5">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-fg">{school}</p>
                    <p className="text-xs leading-5 text-muted">{label}</p>
                  </div>
                  <ExternalLink aria-hidden="true" className="size-4 shrink-0 text-primary" />
                </a>
              </li>
            ))}
          </ul>
          <a href="https://sites.google.com/ched.gov.ph/ro10/directory/directory-of-heis" target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 px-4 text-sm font-semibold text-primary underline-offset-4 hover:underline sm:px-5">
            CHED school directory <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </section>
      )}

      {/* Universal Standard Document Kit Modal */}
      <AnimatePresence>
        {isChecklistModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pb-[max(1.5rem,calc(1rem+env(safe-area-inset-bottom,0px)))] sm:pb-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsChecklistModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-card border border-border rounded-3xl w-full max-w-2xl p-5 sm:p-6 relative z-10 shadow-2xl max-h-[80vh] flex flex-col my-auto overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-border/60 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-fg">Universal Document Readiness Kit</h2>
                    <p className="text-xs text-muted">Standard papers required by 90%+ of Philippine scholarship providers.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChecklistModalOpen(false)} 
                  className="p-1.5 text-muted hover:text-fg rounded-xl hover:bg-canvas transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 my-2 flex-1 overflow-y-auto pr-1">
                {universalDocuments.map((doc, idx) => {
                  const vaultDoc = findVaultDocForReq(doc.name, vaultDocs);
                  const isInVault = Boolean(vaultDoc);

                  return (
                    <div 
                      key={idx} 
                      className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-xs transition-colors ${
                        isInVault 
                          ? 'bg-emerald-500/[0.06] border-emerald-500/30' 
                          : 'bg-canvas border-border/70'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          isInVault 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-muted/20 text-muted'
                        }`}>
                          {isInVault ? <Check className="w-3 h-3 stroke-[3]" /> : <Clock className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-fg flex items-center gap-1.5 flex-wrap">
                            <span>{doc.name}</span>
                            {isInVault && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/15 text-emerald-700 border border-emerald-500/20 rounded">
                                In Vault
                              </span>
                            )}
                          </div>
                          <div className="text-muted text-[11px] mt-0.5">{doc.note}</div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        {isInVault ? (
                          <span className="text-[10px] font-bold text-emerald-700 font-mono">
                            Ready
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded">
                            Missing
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center shrink-0">
                <a
                  href="#settings"
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
                >
                  <span>Open Document Vault</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow-sm hover:bg-primaryHover transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scholarship Detail & Requirements Modal */}
      <AnimatePresence>
        {selectedScholarshipDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pb-[max(1.5rem,calc(1rem+env(safe-area-inset-bottom,0px)))] sm:pb-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedScholarshipDetail(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-card border border-border rounded-2xl w-full max-w-xl p-4 sm:p-6 relative z-10 shadow-2xl max-h-[82dvh] flex flex-col my-auto overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="opportunity-details-heading"
              onKeyDown={event => {
                if (event.key === 'Escape') setSelectedScholarshipDetail(null);

                if (event.key !== 'Tab') return;

                const controls = [...event.currentTarget.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')];
                const first = controls[0];
                const last = controls.at(-1);

                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }}
            >
              <div className="mb-3 flex shrink-0 items-start justify-between gap-2 border-b border-border/60 pb-3">
                <div className="min-w-0 [overflow-wrap:anywhere]">
                  <span className="mb-1.5 block text-xs font-bold text-primary">
                    {selectedScholarshipDetail.provider}
                  </span>
                  <h2 id="opportunity-details-heading" className="text-base sm:text-lg font-bold text-fg leading-snug">{selectedScholarshipDetail.title}</h2>
                </div>
                <button ref={closeDetailsRef} type="button" aria-label="Close application details"
                  onClick={() => setSelectedScholarshipDetail(null)} 
                  className="grid size-11 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-fg"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>

              <div tabIndex={0} role="region" aria-label="Application timeline and requirements" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain rounded-md [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">
                <section aria-label="Application timeline" className="rounded-xl border border-border bg-canvas p-3 sm:p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-fg"><Calendar className="h-4 w-4 text-primary" aria-hidden="true" /> Application Timeline</h3>
                  <ol className="mt-2 divide-y divide-border">
                    {TIMELINE_DATES.map(([key, label]) => (
                      <li key={key} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                        <span className="text-fg">{label}</span>
                        {selectedScholarshipDetail[key] ? <time dateTime={selectedScholarshipDetail[key]} className="font-semibold">{formatDeadline(selectedScholarshipDetail[key])}</time> : <span className="text-muted">{key === 'examDate' && selectedScholarshipDetail.examDetails ? 'See schedule below' : 'No date listed'}</span>}
                      </li>
                    ))}
                  </ol>
                  {selectedScholarshipDetail.examDetails && <p className="mt-2 whitespace-pre-line text-sm text-muted">{selectedScholarshipDetail.examDetails}</p>}
                </section>
                {selectedScholarshipDetail.benefits && (
                  <div className="bg-canvas border border-border/80 rounded-2xl p-3 text-xs">
                    <span className="font-bold text-primary block text-[10px] uppercase tracking-wider mb-1">Benefits & Financial Coverage</span>
                    <p className="text-fg leading-relaxed">{selectedScholarshipDetail.benefits}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold text-fg uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>Required Checklist & Criteria</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedScholarshipDetail.requirements?.map((req, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-canvas border border-border/60 text-xs text-fg font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{req?.name ?? req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border shrink-0 mt-3">
                <button
                  onClick={() => {
                    handleTrackScholarship(selectedScholarshipDetail);
                    setSelectedScholarshipDetail(null);
                  }}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-white transition-colors hover:bg-primaryHover"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Track</span>
                </button>
                <a
                  href={selectedScholarshipDetail.sourceUrl || selectedScholarshipDetail.applyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold text-fg transition-colors hover:bg-canvas"
                >
                  <span>Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {registrationLink(selectedScholarshipDetail) && <a href={registrationLink(selectedScholarshipDetail)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/30 px-3 text-sm font-semibold text-primary">Registration portal <ExternalLink className="h-4 w-4" /></a>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Add/Edit Modal with AI Bot Tab */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pb-28 sm:pb-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.96, opacity: 0, y: 8 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card border border-border rounded-3xl w-full max-w-2xl p-5 sm:p-7 relative z-10 shadow-2xl max-h-[82vh] flex flex-col my-auto overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-fg tracking-tight">
                      {isEditing ? 'Edit Listing' : currentScholarship.kind === 'admission' ? 'Add Admission Notice' : 'Add Scholarship'}
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      {isEditing 
                        ? 'Update program details, eligibility criteria, and requirements.' 
                        : 'Review the details before publishing.'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-fg hover:bg-canvas transition-colors shrink-0"
                  title="Close modal"
                  aria-label="Close scholarship editor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segmented Tab Switcher */}
              {!isEditing && (
                <div className="pt-4 pb-1 shrink-0">
                  <div role="tablist" aria-label="Scholarship entry method" className="bg-canvas p-1 rounded-xl border border-border/70 flex gap-1">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeModalTab === 'manual'}
                      onClick={() => setActiveModalTab('manual')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        activeModalTab === 'manual'
                          ? 'bg-card text-fg shadow-xs border border-border/50'
                          : 'text-muted hover:text-fg'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Manual Details</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeModalTab === 'bot'}
                      onClick={() => setActiveModalTab('bot')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        activeModalTab === 'bot'
                          ? 'bg-card text-primary shadow-xs border border-border/50 font-bold'
                          : 'text-muted hover:text-fg'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>Auto-Fill from URL or Memo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Scrollable Form Body */}
              <div className="overflow-y-auto py-3 space-y-4 pr-1 flex-1">
                {activeModalTab === 'bot' && !isEditing ? (
                  <div className="space-y-3.5">
                    {/* Header Banner */}
                    <div className="bg-primary/5 border border-primary/15 rounded-2xl p-3.5 sm:p-4 text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 font-bold text-primary text-xs sm:text-sm">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span>Scholarship Auto-Fill</span>
                        </div>
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Review required
                        </span>
                      </div>
                      <p className="text-muted text-[11px] sm:text-xs leading-relaxed">
                        Paste an official link or announcement. We will extract available details, then take you to a review form before anything is published.
                      </p>
                    </div>

                    {/* Quick Preset Chips */}
                    <div>
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">
                        Try an official source
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { label: 'DOST-SEI Merit', url: 'https://sei.dost.gov.ph/index.php/programs-and-projects/scholarships/undergraduate-scholarships' },
                          { label: 'CHED CMSP', url: 'https://ched.gov.ph/ched-merit-scholarship-program-cmsp/' },
                          { label: 'SM Foundation', url: 'https://www.sm-foundation.org/what-we-do/education/scholarship/' },
                          { label: 'Aboitiz College', url: 'https://aboitizfoundation.org/our-programs/education/' }
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setBotInput(preset.url);
                            }}
                            className="text-[11px] px-2.5 py-1 bg-canvas hover:bg-primary/10 hover:border-primary/30 border border-border rounded-lg text-fg font-medium transition-all flex items-center gap-1 active:scale-95"
                          >
                            <Sparkles className="w-3 h-3 text-primary" />
                            <span>{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Input Area */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-fg">
                          Official URL or Announcement Text <span className="text-primary">*</span>
                        </label>
                        {botInput && !isParsingBot && (
                          <button
                            type="button"
                            onClick={() => { setBotInput(''); setParseError(''); }}
                            className="min-h-8 px-2 text-[10px] font-bold text-muted hover:text-accentRedFg"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={4}
                        value={botInput}
                        onChange={e => { setBotInput(e.target.value); setParseError(''); }}
                        placeholder="Paste link (https://...) or paste memo text / guidelines here..."
                        aria-describedby="autofill-help"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-canvas/60 text-xs sm:text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all resize-none font-sans"
                      />
                      <div id="autofill-help" className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-muted">
                        <span>{botInput.trim().startsWith('http') ? 'Official link detected' : 'Announcement text'}</span>
                        <span>{botInput.length.toLocaleString()} characters</span>
                      </div>
                      {parseError && (
                        <div role="alert" className="mt-2 flex items-start gap-2 rounded-lg border border-accentRedFg/20 bg-accentRed px-3 py-2 text-xs font-semibold text-accentRedFg">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{parseError}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed text-muted">
                      Auto-fill only uses details found in the source. Missing fields stay blank instead of being guessed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {autoFillSummary && !isEditing && (
                      <div className="rounded-xl border border-accentGreenFg/20 bg-accentGreen px-3.5 py-3 text-xs text-accentGreenFg">
                        <div className="flex items-center gap-2 font-bold">
                          <CheckCircle2 className="h-4 w-4" /> Auto-fill complete — review before publishing
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed">
                          {autoFillSummary.fields.length} fields found.
                          {autoFillSummary.warnings.length > 0 && ` ${autoFillSummary.warnings.join(' ')}`}
                        </p>
                      </div>
                    )}
                    {currentScholarship.sourceUrl && (
                      <p className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-muted">
                        Check the <a href={currentScholarship.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-4">source announcement</a> before publishing this draft.
                      </p>
                    )}
                    <label className="block text-xs font-semibold text-fg">
                      Opportunity type
                      <select value={currentScholarship.kind || 'scholarship'} onChange={e => setCurrentScholarship({ ...currentScholarship, kind: e.target.value })} className="mt-1.5 block min-h-11 w-full rounded-lg border border-border bg-canvas px-3 text-sm">
                        <option value="scholarship">Scholarship</option>
                        <option value="admission">Admission</option>
                      </select>
                    </label>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-fg">
                      <input type="checkbox" checked={currentScholarship.verified === true} onChange={e => setCurrentScholarship({ ...currentScholarship, verified: e.target.checked, registrationVerified: e.target.checked && currentScholarship.registrationVerified === true })} className="h-4 w-4 accent-primary" />
                      I checked the official announcement.
                    </label>
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-semibold text-fg mb-1.5">
                        Listing title <span className="text-primary">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={currentScholarship.title} 
                        onChange={e => setCurrentScholarship({ ...currentScholarship, title: e.target.value })}
                        placeholder="e.g. DOST-SEI S&T Undergraduate Scholarship"
                        className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-canvas/60 text-xs sm:text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
                      />
                    </div>

                    {/* Provider & Deadline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-fg mb-1.5">
                          Provider or Foundation <span className="text-primary">*</span>
                        </label>
                        <input 
                          type="text" 
                          value={currentScholarship.provider} 
                          onChange={e => setCurrentScholarship({ ...currentScholarship, provider: e.target.value })}
                          placeholder="e.g. DOST-SEI"
                          className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-canvas/60 text-xs sm:text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-fg mb-1.5">
                          Application Deadline
                        </label>
                        <input 
                          type="date" 
                          value={currentScholarship.deadline || ''} 
                          onChange={e => setCurrentScholarship({ ...currentScholarship, deadline: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-canvas/60 text-xs sm:text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    {/* Location & Portal URL */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-fg mb-1.5">
                          Location Scope
                        </label>
                        <input 
                          type="text" 
                          value={currentScholarship.location} 
                          onChange={e => setCurrentScholarship({ ...currentScholarship, location: e.target.value })}
                          placeholder="e.g. Mindanao, Philippines"
                          className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-canvas/60 text-xs sm:text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-fg mb-1.5">
                          Official announcement or information link <span className="text-primary">*</span>
                        </label>
                        <input 
                          type="url" 
                          value={currentScholarship.applyLink} 
                          onChange={e => setCurrentScholarship({
                            ...currentScholarship,
                            applyLink: e.target.value,
                            sourceUrl: e.target.value,
                            verified: false,
                            registrationVerified: false,
                          })}
                          placeholder="https://..."
                          className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-canvas/60 text-xs sm:text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    <fieldset className="min-w-0 rounded-xl border border-border p-3">
                      <legend className="px-1 text-sm font-semibold">Registration and Schedule</legend>
                      <label className="block text-xs font-semibold text-fg">
                        Direct registration URL
                        <input type="url" value={currentScholarship.registrationUrl || ''} onChange={e => setCurrentScholarship({ ...currentScholarship, registrationUrl: e.target.value, registrationVerified: false })} placeholder="https://…" className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-canvas px-3 text-sm" />
                      </label>
                      {httpsLink(currentScholarship.registrationUrl) && (
                        <a href={httpsLink(currentScholarship.registrationUrl)} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline underline-offset-4">Open registration form to check it</a>
                      )}
                      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                        <input type="checkbox" checked={currentScholarship.registrationVerified === true} disabled={!currentScholarship.verified || !currentScholarship.registrationUrl?.trim()} onChange={e => setCurrentScholarship({ ...currentScholarship, registrationVerified: e.target.checked })} className="h-4 w-4 accent-primary" />
                        I opened this link and confirmed it is the official registration form.
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {TIMELINE_DATES.map(([key, label]) => key === 'deadline' ? null : (
                          <label key={key} className="block text-xs font-semibold text-fg">
                            {label}
                            <input type="date" value={currentScholarship[key] || ''} onChange={e => setCurrentScholarship({ ...currentScholarship, [key]: e.target.value })} className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-border bg-canvas px-3 text-sm" />
                          </label>
                        ))}
                      </div>
                      <label className="mt-3 block text-xs font-semibold text-fg">
                        Exam schedule or next steps
                        <textarea rows={2} value={currentScholarship.examDetails || ''} onChange={e => setCurrentScholarship({ ...currentScholarship, examDetails: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-canvas p-2.5 text-sm" />
                      </label>
                    </fieldset>

                    {/* Benefits & Financial Coverage */}
                    <div>
                      <label className="block text-xs font-semibold text-fg mb-1.5">
                        Benefits & Financial Coverage
                      </label>
                      <input 
                        type="text" 
                        value={currentScholarship.benefits || ''} 
                        onChange={e => setCurrentScholarship({ ...currentScholarship, benefits: e.target.value })}
                        placeholder="e.g. ₱7,000/month stipend, ₱40,000/yr tuition subsidy, book allowance"
                        className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-canvas/60 text-xs sm:text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-fg mb-1.5">
                        Program Description
                      </label>
                      <textarea
                        rows={3}
                        value={currentScholarship.description || ''}
                        onChange={e => setCurrentScholarship({ ...currentScholarship, description: e.target.value })}
                        placeholder="Who is eligible and what the scholarship supports"
                        className="w-full resize-none rounded-xl border border-border/80 bg-canvas/60 px-3.5 py-2 text-xs text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 sm:text-sm"
                      />
                    </div>

                    {/* Requirements Checklist */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-semibold text-fg">
                          Required Documents Checklist ({currentScholarship.requirements.length})
                        </label>
                        <button 
                          type="button" 
                          onClick={addRequirement}
                          className="text-xs text-primary hover:text-primaryHover font-bold flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Add Document</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto p-0.5">
                        {currentScholarship.requirements.map((req, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-canvas border border-border text-[10px] font-bold text-muted flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            <input 
                              type="text" 
                              value={req?.name ?? req} 
                              onChange={e => handleRequirementChange(index, e.target.value)}
                              placeholder="e.g. PSA Authenticated Birth Certificate"
                              className="min-h-11 min-w-0 flex-1 rounded-xl border border-border/80 bg-canvas/60 px-3 text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                            />
                            {currentScholarship.requirements.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeRequirement(index)}
                                className="w-7 h-7 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
                                title="Remove document requirement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/80 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-fg hover:bg-canvas font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button" 
                  onClick={activeModalTab === 'bot' && !isEditing ? handleAutoParseBot : handleSave}
                  disabled={isParsingBot || (activeModalTab === 'bot' && !botInput.trim())}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activeModalTab === 'bot' && !isEditing ? (
                    <><Sparkles className={cn('h-4 w-4', isParsingBot && 'animate-spin')} />{isParsingBot ? 'Extracting details…' : 'Extract details'}</>
                  ) : (isEditing ? 'Save changes' : 'Publish listing')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
