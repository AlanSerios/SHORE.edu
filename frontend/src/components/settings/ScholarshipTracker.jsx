import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Check, ChevronDown, Clock, AlertTriangle, AlertCircle,
  ExternalLink, Edit2, Trash2, ShieldCheck, Eye, X, CheckCircle2
} from 'lucide-react';
import anime from 'animejs';
import { findVaultDocForReq } from '../../utils/vaultStorage';
import EditTrackedModal from './EditTrackedModal';

export const getDeadlineBadge = (deadlineStr) => {
  if (!deadlineStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineStr);
  deadline.setHours(0, 0, 0, 0);
  const diffTime = deadline - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Expired', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
  }
  if (diffDays === 0) {
    return { label: 'Due Today!', color: 'bg-red-500 text-white font-bold' };
  }
  if (diffDays <= 7) {
    return { label: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`, color: 'bg-amber-500/15 text-amber-700 border-amber-500/30 font-bold' };
  }
  return { label: `Due in ${diffDays} days`, color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold' };
};

export default function ScholarshipTracker({
  appliedScholarships,
  availableScholarships,
  vaultDocs,
  userRole,
  onAddScholarship,
  onRemoveScholarship,
  onToggleRequirementStatus,
  onAddInlineRequirement,
  onDeleteRequirement,
  onSaveTrackedItemEdits,
  onPreviewVaultDoc
}) {
  const [newScholarship, setNewScholarship] = useState('');
  const [expandedTrackerId, setExpandedTrackerId] = useState(
    appliedScholarships.length > 0 ? appliedScholarships[0].id : null
  );
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false);
  const [inlineNewReqName, setInlineNewReqName] = useState({});
  const [editingTrackedItem, setEditingTrackedItem] = useState(null);
  const [isEditingTrackedModalOpen, setIsEditingTrackedModalOpen] = useState(false);
  const inputContainerRef = useRef(null);

  // Missing requirements summary across all tracked scholarships
  const missingRequirementsSummary = appliedScholarships.map(s => {
    const missing = (s.requirements || []).filter(r => {
      const inVault = findVaultDocForReq(r.name, vaultDocs);
      const isMarkedReady = r.status === 'ready' || r.status === 'submitted';
      return !inVault && !isMarkedReady;
    });
    return {
      title: s.title,
      deadline: s.deadline,
      missingCount: missing.length,
      totalCount: (s.requirements || []).length,
      missingNames: missing.map(m => m.name)
    };
  }).filter(s => s.missingCount > 0);

  const totalMissingRequirementsCount = missingRequirementsSummary.reduce((acc, curr) => acc + curr.missingCount, 0);

  const handleAddClick = (item = null) => {
    const title = item ? item.title : newScholarship.trim();
    if (!title && inputContainerRef.current) {
      anime({
        targets: inputContainerRef.current,
        translateX: [-10, 10, -8, 8, -4, 4, 0],
        duration: 400,
        easing: 'easeInOutQuad'
      });
    }
    onAddScholarship(item, title, () => setNewScholarship(''));
  };

  const openEditModal = (scholarship) => {
    setEditingTrackedItem({
      ...scholarship,
      requirements: (scholarship.requirements || []).map(r => ({ ...r }))
    });
    setIsEditingTrackedModalOpen(true);
  };

  const handleSaveModal = () => {
    onSaveTrackedItemEdits(editingTrackedItem, () => setIsEditingTrackedModalOpen(false));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-fg">Active Tracked Scholarships</h2>
          <p className="text-xs text-muted mt-0.5">Manage checklist readiness, vault files, and deadlines for each program.</p>
        </div>
      </div>

      {/* Missing Requirements Compact Notice Banner */}
      {totalMissingRequirementsCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 sm:p-3.5 mb-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-amber-500/20 text-amber-700 rounded-lg shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-amber-950 truncate">
                  {totalMissingRequirementsCount} Missing Document{totalMissingRequirementsCount > 1 ? 's' : ''} across {missingRequirementsSummary.length} Tracked Program{missingRequirementsSummary.length > 1 ? 's' : ''}
                </h3>
                <p className="text-[11px] text-amber-800/90 truncate hidden sm:block">
                  Upload to Document Vault or mark as on-hand to complete your readiness checklist.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsNoticeExpanded(!isNoticeExpanded)}
              className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{isNoticeExpanded ? 'Hide' : 'View Details'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isNoticeExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isNoticeExpanded && (
            <div className="mt-3 pt-2.5 border-t border-amber-500/20 space-y-2">
              {missingRequirementsSummary.map((item, idx) => (
                <div key={idx} className="text-xs bg-card/80 border border-amber-500/20 p-2.5 rounded-xl text-fg">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-amber-950 truncate">{item.title}</span>
                    {item.deadline && (
                      <span className="text-[10px] font-semibold text-muted bg-amber-500/10 px-2 py-0.5 rounded">
                        Due: {item.deadline}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.missingNames.map((name, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-red-500/10 text-red-700 border border-red-500/20 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Scholarship Input & Suggestions */}
      <div ref={inputContainerRef} className="space-y-2 mb-3.5">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newScholarship}
            onChange={e => setNewScholarship(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddClick()}
            placeholder="Add or search scholarship to track (e.g. DOST-SEI Merit)..."
            className="flex-1 min-w-0 px-3.5 py-2.5 sm:py-2 rounded-xl border border-border bg-canvas focus:outline-none focus:border-primary transition-colors text-xs sm:text-sm"
          />
          <button
            onClick={() => handleAddClick()}
            className="bg-primary hover:bg-primaryHover text-white px-4 py-2.5 sm:py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0 text-xs sm:text-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> <span>Add to Tracker</span>
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        {availableScholarships.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Suggestions:</span>
            {availableScholarships.slice(0, 4).map((s) => {
              const isAlreadyTracked = appliedScholarships.some(t =>
                (t?.title || t?.name || '').toLowerCase() === (s?.title || s?.name || '').toLowerCase()
              );
              return (
                <button
                  key={s.id}
                  onClick={() => handleAddClick(s)}
                  disabled={isAlreadyTracked}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1 cursor-pointer ${
                    isAlreadyTracked
                      ? 'bg-canvas text-muted/50 border-border/50 cursor-not-allowed'
                      : 'bg-primary/5 border-primary/20 text-primary hover:bg-primary/15 active:scale-95'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span className="truncate max-w-[130px]">{s.title.split(' ')[0]} {s.title.split(' ')[1] || ''}</span>
                  {isAlreadyTracked && <Check className="w-3 h-3 ml-0.5 text-emerald-600 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tracked Scholarships List */}
      <div className="flex-1 bg-canvas rounded-xl p-2 sm:p-3 overflow-y-auto space-y-2.5 min-h-[280px]">
        {appliedScholarships.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted text-sm py-12 text-center">
            <div className="p-3 bg-card rounded-2xl border border-border mb-2.5 shadow-sm">
              <CheckCircle2 className="w-6 h-6 text-primary/40" />
            </div>
            <p className="font-bold text-fg text-xs sm:text-sm">No scholarships tracked yet</p>
            <p className="text-[11px] text-muted max-w-xs mt-0.5">
              Add a scholarship above or visit the Scholarships page to auto-track requirements.
            </p>
          </div>
        ) : (
          appliedScholarships.map((scholarship) => {
            const isExpanded = expandedTrackerId === scholarship.id;
            const reqs = scholarship.requirements || [];

            const readyCount = reqs.filter(r => {
              const inVault = findVaultDocForReq(r.name, vaultDocs);
              return inVault || r.status === 'ready' || r.status === 'submitted';
            }).length;

            const pendingCount = reqs.filter(r => {
              const inVault = findVaultDocForReq(r.name, vaultDocs);
              return !inVault && (r.status === 'pending' || r.status === 'in_progress');
            }).length;

            const missingCount = reqs.length - readyCount - pendingCount;
            const percent = reqs.length > 0 ? Math.round((readyCount / reqs.length) * 100) : 0;
            const deadlineBadge = getDeadlineBadge(scholarship.deadline);

            return (
              <div
                key={scholarship.id}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-xs transition-all"
              >
                {/* Accordion Header */}
                <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                  <div
                    className="flex-1 min-w-0 cursor-pointer w-full"
                    onClick={() => setExpandedTrackerId(isExpanded ? null : scholarship.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-bold text-fg text-xs sm:text-sm truncate">{scholarship.title}</span>
                      {deadlineBadge && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${deadlineBadge.color}`}>
                          <Clock className="w-2.5 h-2.5" />
                          {deadlineBadge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-muted">{scholarship.provider || 'Scholarship Program'}</p>

                    {/* Progress bar */}
                    <div className="mt-2 flex items-center gap-2.5">
                      <div className="flex-1 bg-muted/20 h-1.5 rounded-full overflow-hidden border border-border/40">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-fg shrink-0">
                        {readyCount}/{reqs.length} Ready ({percent}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                    {scholarship.applyLink && (
                      <a
                        href={scholarship.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-colors"
                        title="Official Application Link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {userRole === 'admin' && (
                      <button
                        onClick={() => openEditModal(scholarship)}
                        className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-canvas transition-colors cursor-pointer"
                        title="Edit Scholarship Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedTrackerId(isExpanded ? null : scholarship.id)}
                      className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-canvas transition-colors cursor-pointer"
                      title="Toggle Checklist"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                    </button>
                    <button
                      onClick={() => onRemoveScholarship(scholarship.id)}
                      className="p-1.5 text-muted hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Remove Scholarship"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expandable Checklist */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border bg-canvas/60 p-3 space-y-2 overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 px-1">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Preparation Checklist</span>
                        <div className="flex gap-2 text-[10px] font-semibold text-muted flex-wrap">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"/> Ready ({readyCount})</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"/> Pending ({pendingCount})</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/> Missing ({missingCount})</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {reqs.map((req, rIdx) => {
                          const vaultDoc = findVaultDocForReq(req.name, vaultDocs);
                          const isInVault = Boolean(vaultDoc);
                          const isMarkedReady = req.status === 'ready' || req.status === 'submitted';
                          const isReady = isInVault || isMarkedReady;
                          const isPending = !isReady && (req.status === 'pending' || req.status === 'in_progress');
                          const isMissing = !isReady && !isPending;

                          return (
                            <div
                              key={rIdx}
                              className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                                isInVault
                                  ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-fg'
                                  : isReady
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-fg'
                                    : isPending
                                      ? 'bg-amber-500/5 border-amber-500/20 text-fg'
                                      : 'bg-card border-border/80 text-fg'
                              }`}
                            >
                              <div
                                className="flex items-center gap-2.5 min-w-0 pr-2 flex-1 cursor-pointer select-none"
                                onClick={(e) => onToggleRequirementStatus(scholarship.id, rIdx, isInVault, e)}
                              >
                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 transition-colors ${
                                  isInVault
                                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                                    : isReady
                                      ? 'bg-emerald-500 border-emerald-600 text-white'
                                      : isPending
                                        ? 'bg-amber-500 border-amber-600 text-white'
                                        : 'border-border bg-card'
                                }`}>
                                  {isInVault && <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />}
                                  {!isInVault && isReady && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  {!isInVault && isPending && <Clock className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <div className="min-w-0">
                                  <span className={`text-xs font-medium block truncate ${isReady ? 'text-fg' : 'text-fg/90'}`}>
                                    {req.name}
                                  </span>
                                  {isInVault && (
                                    <span className="text-[10px] text-emerald-700 font-mono block truncate">
                                      Linked to Vault: {vaultDoc.originalFileName}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isInVault ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-emerald-500/15 text-emerald-700 border border-emerald-500/20 flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>In Vault</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => onPreviewVaultDoc(vaultDoc.docKey)}
                                      className="p-1 text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                                      title="Preview Vault Document"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => onToggleRequirementStatus(scholarship.id, rIdx, false, e)}
                                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                                      isReady
                                        ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/20 hover:bg-emerald-500/25'
                                        : isPending
                                          ? 'bg-amber-500/15 text-amber-800 border border-amber-500/20 hover:bg-amber-500/25'
                                          : 'bg-red-500/10 text-red-700 border border-red-500/20 hover:bg-red-500/20'
                                    }`}
                                    title="Click to toggle status"
                                  >
                                    {isReady && <Check className="w-3 h-3 stroke-[3]" />}
                                    {isPending && <Clock className="w-3 h-3 stroke-[3]" />}
                                    {isMissing && <AlertCircle className="w-3 h-3" />}
                                    <span>{isReady ? 'Ready' : isPending ? 'Pending' : 'Missing'}</span>
                                  </button>
                                )}

                                {userRole === 'admin' && (
                                  <button
                                    type="button"
                                    onClick={(e) => onDeleteRequirement(scholarship.id, rIdx, e)}
                                    className="p-1 text-muted hover:text-red-500 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Delete requirement"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Inline Add Custom Document */}
                      <div className="pt-1.5 border-t border-border/50 flex gap-2">
                        <input
                          type="text"
                          value={inlineNewReqName[scholarship.id] || ''}
                          onChange={(e) => setInlineNewReqName({ ...inlineNewReqName, [scholarship.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onAddInlineRequirement(scholarship.id, inlineNewReqName[scholarship.id]);
                              setInlineNewReqName(prev => ({ ...prev, [scholarship.id]: '' }));
                            }
                          }}
                          placeholder="+ Add custom requirement item..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onAddInlineRequirement(scholarship.id, inlineNewReqName[scholarship.id]);
                            setInlineNewReqName(prev => ({ ...prev, [scholarship.id]: '' }));
                          }}
                          className="bg-primary/10 hover:bg-primary hover:text-white text-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      <EditTrackedModal
        isOpen={isEditingTrackedModalOpen}
        editingTrackedItem={editingTrackedItem}
        setEditingTrackedItem={setEditingTrackedItem}
        onSave={handleSaveModal}
        onClose={() => setIsEditingTrackedModalOpen(false)}
      />
    </div>
  );
}
