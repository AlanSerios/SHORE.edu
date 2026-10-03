import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ExternalLink, GraduationCap, MapPin, CheckCircle2, Sparkles, RefreshCw, Clock, ShieldCheck, BookmarkPlus, Check, ChevronDown, Calendar, FileText, AlertCircle, Search, Filter, X } from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';
import anime from 'animejs';
import { getAllVaultDocuments, findVaultDocForReq } from '../utils/vaultStorage';

export default function ScholarshipsView({ userEmail, userRole }) {
  const [scholarships, setScholarships] = useState([]);
  const [trackedScholarships, setTrackedScholarships] = useState([]);
  const [vaultDocs, setVaultDocs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('manual'); // 'manual' | 'bot'
  const [botInput, setBotInput] = useState('');
  const [isParsingBot, setIsParsingBot] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCardIds, setExpandedCardIds] = useState({});
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'verified' | 'closing'
  const [isChecklistOpen, setIsChecklistOpen] = useState(true);

  const toggleCardExpanded = (id) => {
    setExpandedCardIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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

  useEffect(() => {
    anime({
      targets: '.scholarship-card-anim',
      translateY: [14, 0],
      opacity: [0, 1],
      delay: anime.stagger(35),
      easing: 'easeOutCubic',
      duration: 350
    });
  }, [activeFilter, searchQuery, scholarships.length]);

  const fetchScholarships = async () => {
    try {
      const res = await fetch('/api/scholarships');
      const data = await res.json();
      setScholarships(data.scholarships || []);
    } catch (error) {
      toast.error('Failed to load scholarships');
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
      toast.warning("Please paste a scholarship URL or announcement text!");
      return;
    }

    setIsParsingBot(true);
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
          requirements: data.parsed.requirements?.length ? data.parsed.requirements : [''],
          verified: data.parsed.verified ?? true
        });
        setActiveModalTab('manual');
        toast.success("Bot successfully extracted scholarship details and requirements checklist!");
      } else {
        toast.error(data.error || "Failed to extract details");
      }
    } catch {
      toast.error("Bot extraction network error");
    } finally {
      setIsParsingBot(false);
    }
  };

  const handleTrackScholarship = async (scholarship, e) => {
    if (!userEmail) {
      toast.error("Please log in to track scholarships!");
      return;
    }

    if (e) {
      anime({
        targets: e.currentTarget,
        scale: [0.9, 1.1, 1],
        duration: 350,
        easing: 'easeOutElastic(1, .7)'
      });
    }

    const isAlreadyTracked = trackedScholarships.some(item => {
      const title = typeof item === 'string' ? item : item.title;
      return title?.toLowerCase() === scholarship.title.toLowerCase();
    });

    if (isAlreadyTracked) {
      toast.info(`"${scholarship.title}" is already in your tracker!`);
      return;
    }

    const defaultReqs = (scholarship.requirements && scholarship.requirements.length > 0)
      ? scholarship.requirements.map(r => ({ name: typeof r === 'string' ? r : r.name, status: 'missing' }))
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
      requirements: currentScholarship.requirements.filter(r => (typeof r === 'string' ? r.trim() : r.name?.trim()) !== '')
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
    } catch (error) {
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
    } catch (error) {
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">Available Scholarships</h1>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-primary/20">
              {scholarships.length} Verified
            </span>
          </div>
          <p className="text-muted text-xs sm:text-sm max-w-2xl">
            Verified financial aid programs and grant opportunities for Filipino students.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => setIsChecklistModalOpen(true)}
            className="flex-1 sm:flex-initial bg-canvas border border-border hover:bg-slate-100 text-fg px-3.5 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm text-xs sm:text-sm active:scale-95"
            title="View standard documents needed across most scholarships"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Standard Document Kit</span>
          </button>

          {userRole === 'admin' && (
            <button
              onClick={handleSyncOfficialPortals}
              disabled={isSyncing}
              className="bg-canvas border border-border hover:bg-slate-100 text-fg px-3.5 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm text-xs sm:text-sm active:scale-95"
              title="Re-synchronize official government listings"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-primary ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          )}

          {userRole === 'admin' && (
            <button 
              onClick={() => openModal()}
              className="bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary/20 text-xs sm:text-sm active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Program</span>
            </button>
          )}
        </div>
      </div>

      {/* Clean Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-card border border-border p-2 sm:p-2.5 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, provider, or region (e.g. DOST, CHED, SM, Davao)..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs sm:text-sm bg-transparent focus:outline-none placeholder:text-muted"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted hover:text-fg hover:bg-canvas'
            }`}
          >
            All ({scholarships.length})
          </button>
          <button
            onClick={() => setActiveFilter('verified')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'verified'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted hover:text-fg hover:bg-canvas'
            }`}
          >
            Verified Only
          </button>
          <button
            onClick={() => setActiveFilter('closing')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'closing'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted hover:text-fg hover:bg-canvas'
            }`}
          >
            Closing Soon
          </button>
        </div>
      </div>

      {/* Scholarships Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        {filteredScholarships.map((scholarship) => {
          const deadlineBadge = getDeadlineBadge(scholarship.deadline);
          const isTracked = trackedScholarships.some(item => {
            const title = typeof item === 'string' ? item : item.title;
            return title?.toLowerCase() === scholarship.title.toLowerCase();
          });
          const reqCount = scholarship.requirements?.length || 0;

          return (
            <div 
              key={scholarship.id} 
              className="scholarship-card-anim bg-card border border-border hover:border-primary/40 rounded-2xl p-5 flex flex-col shadow-sm hover:shadow-md transition-all h-full"
            >
              {/* Card Header: Provider & Badges */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md truncate max-w-[160px]">
                    {scholarship.provider}
                  </span>
                  {deadlineBadge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${deadlineBadge.color}`}>
                      <Clock className="w-2.5 h-2.5" />
                      {deadlineBadge.label}
                    </span>
                  )}
                </div>

                {userRole === 'admin' && (
                  <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-1">
                    <button 
                      onClick={() => openModal(scholarship)} 
                      className="text-muted hover:text-fg p-1.5 rounded-lg hover:bg-canvas transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(scholarship.id)} 
                      className="text-muted hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-bold text-fg leading-snug mb-1.5 line-clamp-2">
                {scholarship.title}
              </h3>
              
              {scholarship.description && (
                <p className="text-xs text-muted mb-3 line-clamp-2 leading-relaxed">
                  {scholarship.description}
                </p>
              )}

              {/* Meta tags (Location & Deadline) */}
              <div className="flex flex-wrap gap-2 text-[11px] text-muted mb-3.5">
                <div className="flex items-center gap-1 bg-canvas border border-border/60 px-2 py-0.5 rounded-md">
                  <MapPin className="w-3 h-3 text-primary/70 shrink-0" />
                  <span className="truncate max-w-[130px]">{scholarship.location}</span>
                </div>
                {scholarship.deadline && (
                  <div className="flex items-center gap-1 bg-canvas border border-border/60 px-2 py-0.5 rounded-md">
                    <Calendar className="w-3 h-3 text-primary/70 shrink-0" />
                    <span>Due: {scholarship.deadline}</span>
                  </div>
                )}
              </div>

              {/* Benefits Highlight */}
              {scholarship.benefits && (
                <div className="bg-canvas/80 border border-border/70 rounded-xl p-2.5 mb-3 text-xs">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Benefits & Coverage</div>
                  <p className="text-fg text-xs line-clamp-2 leading-relaxed font-medium">
                    {scholarship.benefits}
                  </p>
                </div>
              )}

              {/* Requirements summary trigger button */}
              <button
                type="button"
                onClick={() => setSelectedScholarshipDetail(scholarship)}
                className="text-xs font-semibold text-primary hover:text-primaryHover flex items-center justify-between p-2 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-colors mb-4"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Required Documents</span>
                </span>
                <span className="text-[10px] font-bold bg-white/80 dark:bg-card px-1.5 py-0.5 rounded border border-primary/20">
                  {reqCount} items
                </span>
              </button>

              {/* Actions Footer */}
              <div className="mt-auto pt-3 border-t border-border flex items-center gap-2">
                <button
                  onClick={(e) => handleTrackScholarship(scholarship, e)}
                  disabled={isTracked}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    isTracked 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                      : 'bg-primary text-white hover:bg-primaryHover active:scale-95 shadow-sm shadow-primary/20'
                  }`}
                >
                  {isTracked ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Tracked</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>Track Checklist</span>
                    </>
                  )}
                </button>

                <a 
                  href={scholarship.applyLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-canvas hover:bg-slate-100 border border-border text-fg rounded-xl font-semibold text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
                  title="Open Official Application Portal"
                >
                  <ExternalLink className="w-4 h-4 text-muted hover:text-fg" />
                </a>
              </div>
            </div>
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

      {/* Universal Standard Document Kit Modal */}
      <AnimatePresence>
        {isChecklistModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pb-28 sm:pb-6 overflow-y-auto">
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pb-28 sm:pb-6 overflow-y-auto">
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
                        <span className="leading-snug">{typeof req === 'string' ? req : req.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-border shrink-0 mt-3">
                <button
                  onClick={(e) => {
                    handleTrackScholarship(selectedScholarshipDetail, e);
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
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segmented Tab Switcher */}
              {!isEditing && (
                <div className="pt-4 pb-1 shrink-0">
                  <div className="bg-canvas p-1 rounded-xl border border-border/70 flex gap-1">
                    <button
                      type="button"
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
                          <span>AI Scholarship Auto-Fill</span>
                        </div>
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Instant Parser
                        </span>
                      </div>
                      <p className="text-muted text-[11px] sm:text-xs leading-relaxed">
                        Paste any official scholarship link or raw announcement text below. Our parser automatically fills out the title, provider, deadline, coverage, and required documents.
                      </p>
                    </div>

                    {/* Quick Preset Chips */}
                    <div>
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">
                        Quick Example Portals (Click to test):
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
                              toast.info(`Loaded ${preset.label} URL`);
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
                        {botInput && (
                          <button
                            type="button"
                            onClick={() => setBotInput('')}
                            className="text-[10px] font-bold text-muted hover:text-red-500"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={4}
                        value={botInput}
                        onChange={e => setBotInput(e.target.value)}
                        placeholder="Paste link (https://...) or paste memo text / guidelines here..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-canvas/60 text-xs sm:text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all resize-none font-sans"
                      />
                    </div>

                    {/* What AI Detects Badge Bar */}
                    <div className="bg-canvas p-2.5 rounded-xl border border-border/60">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">
                        Fields Extracted Automatically:
                      </span>
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-medium text-muted">
                        <span className="bg-card border border-border px-2 py-0.5 rounded-md text-fg">✓ Program Title</span>
                        <span className="bg-card border border-border px-2 py-0.5 rounded-md text-fg">✓ Provider Agency</span>
                        <span className="bg-card border border-border px-2 py-0.5 rounded-md text-fg">✓ Application Deadline</span>
                        <span className="bg-card border border-border px-2 py-0.5 rounded-md text-fg">✓ Benefits & Stipends</span>
                        <span className="bg-card border border-border px-2 py-0.5 rounded-md text-fg">✓ Complete Checklist</span>
                      </div>
                    </div>

                    {/* Extract Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        anime({
                          targets: e.currentTarget,
                          scale: [0.97, 1.02, 1],
                          duration: 300,
                          easing: 'easeOutElastic(1, .8)'
                        });
                        handleAutoParseBot();
                      }}
                      disabled={isParsingBot}
                      className="w-full bg-primary hover:bg-primaryHover text-white py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20 text-xs sm:text-sm active:scale-98"
                    >
                      <Sparkles className={`w-4 h-4 ${isParsingBot ? 'animate-spin' : ''}`} />
                      <span>{isParsingBot ? 'Parsing and Extracting Details...' : 'Extract & Auto-Fill Scholarship Form'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
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
                              value={typeof req === 'string' ? req : req.name} 
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
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primaryHover text-white font-bold text-xs transition-all shadow-sm shadow-primary/20 active:scale-98"
                >
                  {isEditing ? 'Save Changes' : 'Publish Scholarship'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
