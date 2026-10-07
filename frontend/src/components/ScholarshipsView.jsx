import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ExternalLink, GraduationCap, MapPin, CheckCircle2, Sparkles, RefreshCw, Clock, ShieldCheck, BookmarkPlus, Check, Calendar, FileText, AlertCircle, Search, X } from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';
import anime from 'animejs';
import { getAllVaultDocuments, findVaultDocForReq } from '../utils/vaultStorage';
import { PageHeader, PageShell } from './ui/page';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'verified' | 'closing'
  const [isLoadingScholarships, setIsLoadingScholarships] = useState(true);
  const [scholarshipLoadError, setScholarshipLoadError] = useState('');

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
    verified: true
  });

  useEffect(() => {
    fetchScholarships();

    if (userEmail) {
      fetchUserTrackedScholarships();
    }
  }, [userEmail]);



  const fetchScholarships = async () => {
    setIsLoadingScholarships(true);
    setScholarshipLoadError('');

    try {
      const res = await fetch('/api/scholarships');

      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setScholarships(data.scholarships || []);
    } catch {
      setScholarshipLoadError('Scholarships could not be loaded. Check your connection and try again.');
    } finally {
      setIsLoadingScholarships(false);
    }
  };

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

  const handleSyncOfficialPortals = async (e) => {
    setIsSyncing(true);

    if (e) {
      anime({
        targets: e.currentTarget.querySelector('svg'),
        rotate: '+=720deg',
        duration: 1000,
        easing: 'easeInOutQuad'
      });
    }

    try {
      const res = await fetch('/api/scholarships/seed', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setScholarships(data.scholarships || []);
        toast.success("Successfully synchronized verified scholarships from official portals!");
      } else {
        toast.error("Failed to sync scholarships");
      }
    } catch {
      toast.error("Network error during sync");
    } finally {
      setIsSyncing(false);
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
          verified: data.parsed.verified ?? false
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
      applyLink: scholarship.applyLink || '',
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

  const openModal = (scholarship = null) => {
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
        requirements: [''],
        applyLink: '',
        officialDomain: '',
        verified: true
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
      toast.error("Please fill in the title, provider, and apply link.");

      return;
    }

    const payload = {
      ...currentScholarship,
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
        toast.success(isEditing ? 'Scholarship updated!' : 'Scholarship added!');
        fetchScholarships();
        setIsModalOpen(false);
      } else {
        toast.error('Failed to save scholarship');
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

  const filteredScholarships = scholarships.filter(s => {
    const q = searchQuery.toLowerCase();

    const matchesQuery = (
      s.title?.toLowerCase().includes(q) ||
      s.provider?.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
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

  const verifiedCount = scholarships.filter(s => s.verified === true).length;

  const closingSoonCount = scholarships.filter(s => {
    const badge = getDeadlineBadge(s.deadline);

    return badge && badge.days >= 0 && badge.days <= 14;
  }).length;

  const formatDeadline = (deadline) => {
    if (!deadline) return '';
    const parsed = new Date(`${deadline}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) return deadline;

    return parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <PageShell width="wide">
      <PageHeader
        title="Scholarships"
        description="Compare verified programs, prepare documents, and track application deadlines."
        actions={(
          <>
            <button
              onClick={() => setIsChecklistModalOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold text-fg shadow-sm transition-colors hover:bg-slate-50"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Document kit
            </button>
            {userRole === 'admin' && (
              <button
                onClick={handleSyncOfficialPortals}
                disabled={isSyncing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold text-fg shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 text-primary ${isSyncing ? 'animate-spin' : ''}`} />
                Sync
              </button>
            )}
            {userRole === 'admin' && (
              <button
                onClick={() => openModal()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primaryHover"
              >
                <Plus className="h-4 w-4" />
                Add scholarship
              </button>
            )}
          </>
        )}
      />

      <section className="mt-7 overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-label="Scholarship search and filters">
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search scholarships</span>
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search programs, providers, or locations"
              className="h-11 w-full rounded-xl border border-border bg-canvas pl-10 pr-4 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <div className="flex overflow-x-auto rounded-xl bg-canvas p-1" role="tablist" aria-label="Scholarship filters">
            {[
              { id: 'all', label: 'All', count: scholarships.length },
              { id: 'verified', label: 'Verified', count: verifiedCount },
              { id: 'closing', label: 'Closing soon', count: closingSoonCount },
            ].map(filter => (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  'h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors sm:text-sm',
                  activeFilter === filter.id
                    ? 'bg-card text-primary shadow-sm ring-1 ring-border'
                    : 'text-muted hover:text-fg'
                )}
              >
                {filter.label} <span className="ml-1 text-[11px] opacity-70">{filter.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-4 mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="font-semibold text-fg">{filteredScholarships.length}</span>{' '}
          {filteredScholarships.length === 1 ? 'program' : 'programs'} available
        </p>
        <p className="hidden text-xs text-muted sm:block">Deadlines use Philippine time</p>
      </div>

      {isLoadingScholarships && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading scholarships">
          {[0, 1, 2, 3, 4, 5].map(item => (
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
          <h2 className="mt-3 font-bold text-fg">Unable to load scholarships</h2>
          <p className="mt-1 text-sm text-muted">{scholarshipLoadError}</p>
          <button onClick={fetchScholarships} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primaryHover">Try again</button>
        </div>
      )}

      {!isLoadingScholarships && !scholarshipLoadError && (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 items-stretch">
        {filteredScholarships.map((scholarship) => {
          const deadlineBadge = getDeadlineBadge(scholarship.deadline);

          const isTracked = trackedScholarships.some(item => {
            const title = item?.title ?? item;

            return title?.toLowerCase() === scholarship.title.toLowerCase();
          });

          const reqCount = scholarship.requirements?.length || 0;

          return (
            <article
              key={scholarship.id} 
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex flex-1 flex-col p-5">
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

                {userRole === 'admin' && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button 
                      onClick={() => openModal(scholarship)} 
                      className="rounded-lg p-2 text-muted transition-colors hover:bg-canvas hover:text-fg"
                      aria-label={`Edit ${scholarship.title}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(scholarship.id)} 
                      className="rounded-lg p-2 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${scholarship.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

                <p className="mt-4 line-clamp-2 text-sm font-semibold leading-5 text-primary">{scholarship.provider}</p>
              <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-fg">
                {scholarship.title}
              </h3>
              
              {scholarship.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                  {scholarship.description}
                </p>
              )}

                <dl className="mt-5 grid grid-cols-1 gap-2 text-sm text-muted sm:grid-cols-2">
                  {scholarship.location && (
                    <div className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <dd className="truncate">{scholarship.location}</dd>
                    </div>
                  )}
                {scholarship.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-primary" />
                      <dd>{formatDeadline(scholarship.deadline)}</dd>
                  </div>
                )}
                </dl>

              {scholarship.benefits && (
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-xs font-bold text-muted">Benefits and coverage</p>
                    <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-fg">
                    {scholarship.benefits}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedScholarshipDetail(scholarship)}
                  className="mt-4 flex w-full items-center justify-between rounded-xl bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Required documents
                </span>
                  <span>{reqCount}</span>
              </button>
              </div>

              <div className="flex items-center gap-2 border-t border-border bg-canvas/50 p-4">
                <button
                  onClick={() => handleTrackScholarship(scholarship)}
                  disabled={isTracked}
                  className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors ${
                    isTracked 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                      : 'bg-primary text-white hover:bg-primaryHover shadow-sm'
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

                <a 
                  href={scholarship.applyLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold text-fg transition-colors hover:bg-slate-50"
                  aria-label={`Open official application for ${scholarship.title}`}
                >
                  Apply <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </article>
          );
        })}

        {filteredScholarships.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
            <div className="bg-canvas p-4 rounded-full mb-3 border border-border">
              <GraduationCap className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-base font-bold text-fg mb-1">No Matching Scholarships</h3>
            <p className="text-muted text-xs max-w-sm mb-4">Try adjusting your search query or reset the filter.</p>
            {userRole === 'admin' && (
              <button
                onClick={handleSyncOfficialPortals}
                className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-sync Official Portals
              </button>
            )}
          </div>
        )}
      </div>
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
              className="bg-card border border-border rounded-3xl w-full max-w-xl p-5 sm:p-6 relative z-10 shadow-2xl max-h-[82vh] flex flex-col my-auto overflow-hidden"
            >
              <div className="flex justify-between items-start mb-3 pb-2 border-b border-border/60 shrink-0">
                <div>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md mb-1.5 inline-block">
                    {selectedScholarshipDetail.provider}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-fg leading-snug">{selectedScholarshipDetail.title}</h2>
                </div>
                <button 
                  onClick={() => setSelectedScholarshipDetail(null)} 
                  className="p-1.5 text-muted hover:text-fg rounded-xl hover:bg-canvas transition-colors text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
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

              <div className="flex items-center gap-3 pt-3 border-t border-border shrink-0 mt-3">
                <button
                  onClick={() => {
                    handleTrackScholarship(selectedScholarshipDetail);
                    setSelectedScholarshipDetail(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-primaryHover transition-colors"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Track to My Dashboard</span>
                </button>
                <a
                  href={selectedScholarshipDetail.applyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-xl bg-fg text-canvas font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-fg/90 transition-colors"
                >
                  <span>Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
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
                      {isEditing ? 'Edit Scholarship Program' : 'Add Scholarship Program'}
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      {isEditing 
                        ? 'Update program details, eligibility criteria, and requirements.' 
                        : 'Publish a new financial aid program with requirement checklist.'}
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
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-semibold text-fg mb-1.5">
                        Scholarship Title <span className="text-primary">*</span>
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
                          Official Portal Link <span className="text-primary">*</span>
                        </label>
                        <input 
                          type="url" 
                          value={currentScholarship.applyLink} 
                          onChange={e => setCurrentScholarship({ ...currentScholarship, applyLink: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-canvas/60 text-xs sm:text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
                        />
                      </div>
                    </div>

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
                              className="flex-1 px-3 py-1.5 rounded-xl border border-border/80 bg-canvas/60 text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
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
                  ) : (isEditing ? 'Save Changes' : 'Publish Scholarship')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
