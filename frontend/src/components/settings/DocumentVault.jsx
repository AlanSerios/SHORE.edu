import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Download, Plus, Check, Trash2, FileCheck, Eye,
  RefreshCw, Upload, ShieldCheck, FileText, X, Loader2
} from 'lucide-react';

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const DEFAULT_MASTER_DOCS = [
  { key: 'id_photo_2x2', name: '2x2 ID Photo (White Background & Name Tag)', category: 'Identity', note: 'Formal attire, taken within last 6 months', accepts: 'image/*' },
  { key: 'psa_birth_cert', name: 'PSA Authenticated Birth Certificate', category: 'Civil', note: 'Clear scan or photo of PSA SECPA copy', accepts: 'image/*,.pdf' },
  { key: 'form_137_138', name: 'Grade 12 Report Card (Form 137 / 138 / Transcript)', category: 'Academic', note: 'Showing complete quarterly grades & GWA', accepts: 'image/*,.pdf' },
  { key: 'good_moral', name: 'Certificate of Good Moral Character', category: 'Academic', note: 'Signed by Principal or Guidance Counselor', accepts: 'image/*,.pdf' },
  { key: 'brgy_residency', name: 'Barangay Certificate of Residency / Indigency', category: 'Civil', note: 'Issued by local Barangay Captain within 6 months', accepts: 'image/*,.pdf' },
  { key: 'parents_itr', name: "Parents' ITR / BIR Tax Exemption / 4Ps Certificate", category: 'Financial', note: 'Proof of annual gross income < ₱400k', accepts: 'image/*,.pdf' },
  { key: 'recommendation', name: 'Principal or Teacher Recommendation Letter', category: 'Academic', note: 'Attesting to character and academic merit', accepts: 'image/*,.pdf,.doc,.docx' },
  { key: 'residence_sketch', name: 'Barangay Sketch of Residence Map', category: 'Civil', note: 'Vicinity sketch map to family residence', accepts: 'image/*,.pdf' }
];

export default function DocumentVault({
  vaultDocs,
  customVaultDocs,
  isUploadingDoc,
  isExportingZip,
  onUploadVaultDoc,
  onDownloadVaultDoc,
  onPreviewVaultDoc,
  onDeleteVaultDoc,
  onExportAllZip,
  onCreateCustomDoc,
  onDeleteCustomDocSlot,
  previewModalDoc,
  setPreviewModalDoc
}) {
  const [vaultCategoryFilter, setVaultCategoryFilter] = useState('All');
  const [isAddCustomDocModalOpen, setIsAddCustomDocModalOpen] = useState(false);
  const [newCustomDoc, setNewCustomDoc] = useState({ name: '', category: 'Custom', note: '' });

  const allVaultSlots = [...DEFAULT_MASTER_DOCS, ...customVaultDocs];
  const customCategories = Array.from(new Set(customVaultDocs.map(d => d.category).filter(Boolean)));

  const filteredVaultSlots = allVaultSlots.filter(docDef => {
    if (vaultCategoryFilter === 'All') return true;

    return docDef.category?.toLowerCase() === vaultCategoryFilter.toLowerCase();
  });

  const handleCreateSlot = () => {
    onCreateCustomDoc(newCustomDoc, () => {
      setNewCustomDoc({ name: '', category: 'Custom', note: '' });
      setIsAddCustomDocModalOpen(false);
    });
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Vault Overview & Action Banner */}
      <div className="bg-canvas/50 border border-border/80 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-fg tracking-tight">
              Universal Master Requirements
            </h2>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3" />
              Auto-Sync Ready
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Store authenticated student credentials once. Uploaded papers automatically verify across your scholarship application checklists.
          </p>
        </div>

        {/* Readiness Stat & Action Group */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2.5 bg-card px-3 py-1.5 rounded-xl border border-border shadow-2xs">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Readiness</span>
            <span className="text-xs font-black text-fg">
              {vaultDocs.length} <span className="text-muted font-normal">of</span> {allVaultSlots.length} Ready
            </span>
            <div className="w-16 h-2 bg-muted/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((vaultDocs.length / Math.max(1, allVaultSlots.length)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportAllZip}
              disabled={isExportingZip || vaultDocs.length === 0}
              className="bg-card hover:bg-slate-50 border border-border text-fg hover:text-primary disabled:opacity-40 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-[color,background-color,border-color,transform] shadow-2xs active:scale-95 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Bundle and download all stored files as a single ZIP archive"
            >
              {isExportingZip ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" /> : <Download className="w-3.5 h-3.5 text-primary" />}
              <span>{isExportingZip ? 'Packaging ZIP…' : 'Download All (.ZIP)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddCustomDocModalOpen(true)}
              className="bg-primary hover:bg-primaryHover text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-primary/20 active:scale-95 cursor-pointer"
              title="Add a custom document slot to your vault"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Slot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {['All', 'Identity', 'Academic', 'Civil', 'Financial', ...(customCategories.length > 0 ? ['Custom'] : [])].map((cat) => {
          const isActive = vaultCategoryFilter === cat;

          const count = cat === 'All'
            ? allVaultSlots.length
            : allVaultSlots.filter(s => s.category?.toLowerCase() === cat.toLowerCase()).length;

          if (count === 0 && cat !== 'All') return null;

          return (
            <button
              key={cat}
              onClick={() => setVaultCategoryFilter(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-fg text-canvas shadow-xs'
                  : 'bg-canvas text-muted hover:text-fg hover:bg-slate-100 border border-border/60'
              }`}
            >
              <span>{cat}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-canvas/20 text-canvas' : 'bg-muted/15 text-muted'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2-Column Documents Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filteredVaultSlots.map((docDef) => {
          const storedDoc = vaultDocs.find(d => d.docKey === docDef.key);
          const isUploading = isUploadingDoc[docDef.key];

          return (
            <div
              key={docDef.key}
              className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-200 group ${
                storedDoc
                  ? 'bg-card border-emerald-500/30 shadow-xs hover:border-emerald-500/50 hover:shadow-sm'
                  : 'bg-card border-border/80 hover:border-border hover:bg-slate-50/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      storedDoc
                        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                        : 'bg-canvas text-muted border-border/70'
                    }`}>
                      {docDef.category}
                    </span>
                    {docDef.key.startsWith('custom_') && (
                      <button
                        onClick={() => onDeleteCustomDocSlot(docDef.key)}
                        className="p-1 text-muted hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete custom slot"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {storedDoc ? (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>{formatFileSize(storedDoc.fileSize)}</span>
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-muted bg-canvas px-2 py-0.5 rounded-md border border-border/50">
                      Not uploaded
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-fg text-xs sm:text-sm leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                  {docDef.name}
                </h3>
                <p className="text-[11px] text-muted line-clamp-2 mb-3 leading-relaxed">
                  {docDef.note}
                </p>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 mt-auto">
                {storedDoc ? (
                  <>
                    <div className="min-w-0 flex-1 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <p className="text-[11px] font-mono text-muted truncate" title={storedDoc.originalFileName}>
                        {storedDoc.originalFileName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onPreviewVaultDoc(docDef.key)}
                        className="p-1.5 bg-canvas hover:bg-primary/10 hover:text-primary border border-border/80 text-fg rounded-xl text-xs font-semibold transition-all active:scale-90 cursor-pointer"
                        title="Preview file"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDownloadVaultDoc(docDef.key)}
                        className="p-1.5 bg-canvas hover:bg-emerald-50 hover:text-emerald-700 border border-border/80 text-fg rounded-xl text-xs font-bold transition-all active:scale-90 cursor-pointer"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <label className="p-1.5 bg-canvas hover:bg-slate-100 border border-border/80 text-muted hover:text-fg rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-90" title="Replace file">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept={docDef.accepts || 'image/*,.pdf,.docx,.doc'}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              onUploadVaultDoc(docDef.key, docDef.name, e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>

                      <button
                        onClick={() => onDeleteVaultDoc(docDef.key, docDef.name)}
                        className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90 cursor-pointer"
                        title="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <label className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border border-dashed active:scale-[0.99] ${
                    isUploading
                      ? 'bg-primary/10 text-primary border-primary cursor-wait'
                      : 'bg-canvas hover:bg-primary/5 text-fg hover:text-primary border-border hover:border-primary/50'
                  }`}>
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" /> : <Upload className="w-3.5 h-3.5 text-primary" />}
                    <span>{isUploading ? 'Encrypting & saving…' : 'Upload Document'}</span>
                    <input
                      type="file"
                      accept={docDef.accepts || 'image/*,.pdf,.docx,.doc'}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          onUploadVaultDoc(docDef.key, docDef.name, e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Document In-App Preview Modal */}
      <AnimatePresence>
        {previewModalDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 pb-28 sm:pb-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (previewModalDoc.objectUrl) URL.revokeObjectURL(previewModalDoc.objectUrl);
                setPreviewModalDoc(null);
              }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-3xl w-full max-w-3xl p-5 sm:p-6 relative z-10 shadow-2xl max-h-[82vh] flex flex-col my-auto overflow-hidden"
            >
              <div className="flex justify-between items-start pb-3 border-b border-border mb-4 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-fg text-base sm:text-lg">{previewModalDoc.name}</h3>
                  </div>
                  <p className="text-xs text-muted font-mono mt-0.5">{previewModalDoc.originalFileName} ({formatFileSize(previewModalDoc.fileSize)})</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewModalDoc.objectUrl}
                    download={previewModalDoc.originalFileName}
                    className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => {
                      if (previewModalDoc.objectUrl) URL.revokeObjectURL(previewModalDoc.objectUrl);
                      setPreviewModalDoc(null);
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-fg hover:bg-canvas cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-slate-950/5 rounded-2xl flex items-center justify-center p-2 min-h-[300px]">
                {previewModalDoc.fileType.startsWith('image/') ? (
                  <img
                    src={previewModalDoc.objectUrl}
                    alt={previewModalDoc.name}
                    className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md"
                  />
                ) : previewModalDoc.fileType === 'application/pdf' ? (
                  <iframe
                    src={previewModalDoc.objectUrl}
                    title={previewModalDoc.name}
                    className="w-full h-[60vh] rounded-xl border border-border"
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="w-16 h-16 text-primary mx-auto mb-3" />
                    <p className="font-bold text-fg text-sm mb-1">{previewModalDoc.originalFileName}</p>
                    <p className="text-xs text-muted mb-4">This file format ({previewModalDoc.fileType}) can be downloaded directly in original format.</p>
                    <a
                      href={previewModalDoc.objectUrl}
                      download={previewModalDoc.originalFileName}
                      className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-4 h-4" /> Download Original File
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Custom Vault Requirement Slot Modal */}
      <AnimatePresence>
        {isAddCustomDocModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pb-28 sm:pb-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddCustomDocModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-3xl w-full max-w-md p-5 sm:p-6 relative z-10 shadow-2xl max-h-[82vh] flex flex-col my-auto overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-border/60">
                <h3 className="font-bold text-fg text-base">Add Custom Document Slot</h3>
                <button onClick={() => setIsAddCustomDocModalOpen(false)} className="text-muted hover:text-fg p-1 rounded-lg cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs overflow-y-auto flex-1 pr-1">
                <div>
                  <label className="block font-semibold text-fg mb-1">Document Name *</label>
                  <input
                    type="text"
                    value={newCustomDoc.name}
                    onChange={(e) => setNewCustomDoc({ ...newCustomDoc, name: e.target.value })}
                    placeholder="e.g. Solo Parent ID / NCIP Certificate"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-canvas text-xs sm:text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-fg mb-1">Category</label>
                  <select
                    value={newCustomDoc.category}
                    onChange={(e) => setNewCustomDoc({ ...newCustomDoc, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-canvas text-xs sm:text-sm focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Identity">Identity</option>
                    <option value="Academic">Academic</option>
                    <option value="Civil">Civil</option>
                    <option value="Financial">Financial</option>
                    <option value="Medical">Medical</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-fg mb-1">Description / Notes</label>
                  <input
                    type="text"
                    value={newCustomDoc.note}
                    onChange={(e) => setNewCustomDoc({ ...newCustomDoc, note: e.target.value })}
                    placeholder="e.g. Required for indigenous or low-income criteria"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-canvas text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border mt-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddCustomDocModalOpen(false)}
                  className="px-4 py-2 border border-border text-fg rounded-xl font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateSlot}
                  className="px-5 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  Create Slot
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
