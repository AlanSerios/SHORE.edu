import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadStoredUser } from '../utils/userStorage';
import { FolderArchive, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import getCroppedImg from '../utils/cropImage';
import {
  encryptAndSaveDocument,
  loadAndDecryptDocument,
  getAllVaultDocuments,
  deleteVaultDocument,
  downloadSingleDocument,
  exportDocumentsAsZip
} from '../utils/vaultStorage';

// Modular Subcomponents
import CropModal from './settings/CropModal';
import QRPassModal from './settings/QRPassModal';
import ProfileCard from './settings/ProfileCard';
import CosmeticsCard from './settings/CosmeticsCard';
import SecurityCard from './settings/SecurityCard';
import { PageHeader } from './ui/page';
import ScholarshipTracker from './settings/ScholarshipTracker';
import DocumentVault, { DEFAULT_MASTER_DOCS } from './settings/DocumentVault';

// Normalize scholarship entries (string or object) to a structured tracker object
export const normalizeTrackedScholarships = (list, catalog = []) => {
  return (list || []).map((item, idx) => {
    if (!item || !item.requirements) {
      const itemStr = item?.title || item || '';

      const matched = (catalog || []).find(s => {
        const sTitle = s?.title || s?.name || '';

        return (
          (sTitle && sTitle.toLowerCase().includes(itemStr.toLowerCase())) ||
          (itemStr && itemStr.toLowerCase().includes(sTitle.toLowerCase()))
        );
      });

      const reqNames = (matched && matched.requirements && matched.requirements.length > 0)
        ? matched.requirements
        : [
            "Accomplished Application Form",
            "Grade 12 Report Card (Form 137 / 138)",
            "PSA Birth Certificate",
            "Parents' Proof of Income (ITR / Indigency)",
            "Certificate of Residency",
            "2x2 ID Picture"
          ];

      return {
        id: matched?.id || `custom-${idx}-${Date.now()}`,
        title: itemStr,
        provider: matched?.provider || "Scholarship Provider",
        deadline: matched?.deadline || "",
        applyLink: matched?.applyLink || "",
        requirements: reqNames.map(r => ({ name: r?.name ?? r, status: 'missing' }))
      };
    }

    const safeItem = item || {};

    const reqs = (safeItem.requirements || []).map(r => {
      if (!r?.name) return { name: String(r || 'Required Document'), status: 'missing' };

      return { name: r.name, status: r.status || 'missing' };
    });

    return {
      ...safeItem,
      id: safeItem.id || `sch-${idx}-${Date.now()}`,
      title: safeItem.title || safeItem.name || 'Scholarship Program',
      provider: safeItem.provider || 'Scholarship Provider',
      requirements: reqs
    };
  });
};

export default function SettingsView({ userEmail, userRole, onUpdateUser }) {
  const cachedUser = loadStoredUser() || {};

  const [currentUserData, setCurrentUserData] = useState(cachedUser);
  const [profilePicture, setProfilePicture] = useState(cachedUser.profilePicture || null);
  const [ownedBorders, setOwnedBorders] = useState(cachedUser.ownedBorders || []);
  const [equippedBorder, setEquippedBorder] = useState(cachedUser.equippedBorder || null);
  const [appliedScholarships, setAppliedScholarships] = useState(() => normalizeTrackedScholarships(cachedUser.appliedScholarships || []));
  const [availableScholarships, setAvailableScholarships] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [borderInventory, setBorderInventory] = useState([]);
  const [showQRPopout, setShowQRPopout] = useState(false);

  // Profile crop state
  const fileInputRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Tabs & Document Vault State
  const [activeMainTab, setActiveMainTab] = useState('tracker'); // 'tracker' | 'vault'
  const [vaultDocs, setVaultDocs] = useState([]);

  const [customVaultDocs, setCustomVaultDocs] = useState(() => {
    try {
      const saved = localStorage.getItem(`shore_custom_docs_${userEmail}`);

      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isUploadingDoc, setIsUploadingDoc] = useState({});
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [previewModalDoc, setPreviewModalDoc] = useState(null);

  useEffect(() => {
    fetchUserData();
    fetchInventory();
    fetchAvailableScholarships();
    loadVaultDocs();
  }, [userEmail]);

  const loadVaultDocs = async () => {
    if (!userEmail) return;

    try {
      const docs = await getAllVaultDocuments(userEmail);
      setVaultDocs(docs || []);
    } catch (e) {
      console.error("Failed to load vault documents:", e);
    }
  };

  const fetchAvailableScholarships = async () => {
    try {
      const res = await fetch('/api/scholarships');
      const data = await res.json();
      setAvailableScholarships(data.scholarships || []);
    } catch (e) {
      console.error("Failed to load available scholarships", e);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      setBorderInventory((data.inventory || []).filter(i => i.itemType === 'border'));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserData = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch('/api/users', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return;
      const data = await res.json();
      const currentUser = (data.users || []).find(u => u.email === userEmail);

      if (currentUser) {
        setCurrentUserData(currentUser);
        setProfilePicture(currentUser.profilePicture || null);
        setOwnedBorders(currentUser.ownedBorders || []);
        setEquippedBorder(currentUser.equippedBorder || null);

        try {
          const catRes = await fetch('/api/scholarships');

          if (catRes.ok) {
            const catData = await catRes.json();
            const catalog = catData.scholarships || [];
            setAvailableScholarships(catalog);
            setAppliedScholarships(normalizeTrackedScholarships(currentUser.appliedScholarships || [], catalog));
          }
        } catch (catErr) {
          console.warn('Catalog fetch failed, using cached scholarships:', catErr);
        }
      }
    } catch (error) {
      console.warn('Network slow or timed out, keeping cached profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserData = async (updates) => {
    try {
      const res = await fetch(`/api/users/${userEmail}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await res.json();

      if (res.ok) {
        if (onUpdateUser) onUpdateUser(data.user);

        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to save' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Avatar border equip
  const handleEquipBorder = async (borderId) => {
    try {
      const res = await fetch('/api/inventory/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, borderId })
      });

      const data = await res.json();

      if (res.ok) {
        setEquippedBorder(borderId);
        toast.success("Avatar border equipped!");

        if (onUpdateUser && currentUserData) {
          onUpdateUser({ ...currentUserData, equippedBorder: borderId });
        }
      } else {
        toast.error(data.error || "Failed to equip border.");
      }
    } catch {
      toast.error("Network error.");
    }
  };

  // Photo crop upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');

      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      setImageSrc(reader.result);

      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    try {
      const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      setProfilePicture(croppedImageBase64);
      setImageSrc(null);
      const result = await saveUserData({ profilePicture: croppedImageBase64 });

      if (result.success) {
        toast.success('Profile picture updated successfully');
      } else {
        toast.error(`Failed to update profile picture: ${result.error}`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to crop image');
    }
  };

  // Scholarship tracker handlers
  const handleAddScholarship = async (scholarshipItem = null, manualTitle = '', onResetInput) => {
    const titleToAdd = scholarshipItem ? scholarshipItem.title : manualTitle.trim();

    if (!titleToAdd) {
      toast.warning("Please type a scholarship name or click a suggestion below");

      return;
    }

    if (appliedScholarships.some(s => (s?.title || s?.name || '').toLowerCase() === (titleToAdd || '').toLowerCase())) {
      toast.info(`"${titleToAdd}" is already in your tracker!`);

      return;
    }

    const matched = availableScholarships.find(s =>
      ((s?.title || s?.name || '').toLowerCase() === (titleToAdd || '').toLowerCase()) ||
      (scholarshipItem && s.id === scholarshipItem.id)
    );

    const defaultReqs = (matched && matched.requirements && matched.requirements.length > 0)
      ? matched.requirements.map(r => ({ name: r?.name ?? r, status: 'missing' }))
      : [
          { name: "Accomplished Application Form", status: "missing" },
          { name: "Grade 12 Report Card (Form 137 / 138)", status: "missing" },
          { name: "PSA Birth Certificate", status: "missing" },
          { name: "Parents' Proof of Income (ITR / Indigency)", status: "missing" },
          { name: "Certificate of Residency", status: "missing" },
          { name: "2x2 ID Picture", status: "missing" }
        ];

    const newTracked = {
      id: matched ? matched.id : `custom-${Date.now()}`,
      title: matched ? matched.title : titleToAdd,
      provider: matched ? matched.provider : "Scholarship Provider",
      deadline: matched ? matched.deadline : "",
      applyLink: matched ? matched.applyLink : "",
      requirements: defaultReqs
    };

    const updated = [newTracked, ...appliedScholarships];
    setAppliedScholarships(updated);

    if (onResetInput) onResetInput();

    const result = await saveUserData({ appliedScholarships: updated });

    if (result.success) {
      toast.success(`Tracked "${newTracked.title}" with checklist!`);
    } else {
      toast.error('Failed to update tracker');
      setAppliedScholarships(appliedScholarships);
    }
  };

  const handleRemoveScholarship = async (id) => {
    const updated = appliedScholarships.filter(s => s.id !== id);
    setAppliedScholarships(updated);
    const result = await saveUserData({ appliedScholarships: updated });

    if (result.success) {
      toast.success('Removed from your tracker');
    } else {
      toast.error('Failed to update tracker');
      setAppliedScholarships(appliedScholarships);
    }
  };

  const handleToggleRequirementStatus = async (scholarshipId, reqIndex, isInVault, e) => {
    if (e) e.stopPropagation();

    const updated = appliedScholarships.map(item => {
      if (item.id === scholarshipId) {
        const nextReqs = [...item.requirements];
        const currentStatus = nextReqs[reqIndex].status;
        let nextStatus = 'missing';

        if (isInVault) {
          nextStatus = currentStatus === 'pending' ? 'ready' : 'pending';
        } else {
          if (currentStatus === 'missing' || !currentStatus) {
            nextStatus = 'pending';
          } else if (currentStatus === 'pending' || currentStatus === 'in_progress') {
            nextStatus = 'ready';
          } else {
            nextStatus = 'missing';
          }
        }

        nextReqs[reqIndex] = { ...nextReqs[reqIndex], status: nextStatus };

        return { ...item, requirements: nextReqs };
      }

      return item;
    });

    setAppliedScholarships(updated);
    await saveUserData({ appliedScholarships: updated });
  };

  const handleAddInlineRequirement = async (scholarshipId, reqName) => {
    const trimmed = (reqName || '').trim();

    if (!trimmed) {
      toast.warning("Please enter a document name");

      return;
    }

    const updated = appliedScholarships.map(s => {
      if (s.id === scholarshipId) {
        const nextReqs = [...(s.requirements || []), { name: trimmed, status: 'missing' }];

        return { ...s, requirements: nextReqs };
      }

      return s;
    });

    setAppliedScholarships(updated);
    const result = await saveUserData({ appliedScholarships: updated });

    if (result.success) {
      toast.success(`Added "${trimmed}" to checklist!`);
    } else {
      toast.error("Failed to add requirement");
    }
  };

  const handleDeleteRequirement = async (scholarshipId, reqIndex, e) => {
    if (e) e.stopPropagation();

    const updated = appliedScholarships.map(s => {
      if (s.id === scholarshipId) {
        const nextReqs = (s.requirements || []).filter((_, idx) => idx !== reqIndex);

        return { ...s, requirements: nextReqs };
      }

      return s;
    });

    setAppliedScholarships(updated);
    await saveUserData({ appliedScholarships: updated });
    toast.success("Document removed from checklist");
  };

  const handleSaveTrackedItemEdits = async (editingTrackedItem, onFinish) => {
    if (!editingTrackedItem || !editingTrackedItem.title.trim()) {
      toast.error("Scholarship title cannot be empty");

      return;
    }

    const cleanedReqs = (editingTrackedItem.requirements || [])
      .filter(r => (r?.name ? r.name.trim() : String(r || '').trim()))
      .map(r => ({
        name: r?.name ? r.name.trim() : String(r || '').trim(),
        status: r?.status || 'missing'
      }));

    const updated = appliedScholarships.map(s => {
      if (s.id === editingTrackedItem.id) {
        return { ...editingTrackedItem, requirements: cleanedReqs };
      }

      return s;
    });

    setAppliedScholarships(updated);

    if (onFinish) onFinish();
    const result = await saveUserData({ appliedScholarships: updated });

    if (result.success) {
      toast.success(`Updated "${editingTrackedItem.title}"!`);
    } else {
      toast.error("Failed to save tracker edits");
      setAppliedScholarships(appliedScholarships);
    }
  };

  // Document Vault handlers
  const handleUploadVaultDoc = async (docKey, docName, file) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File exceeds 25MB limit. Please choose a smaller file.");

      return;
    }

    setIsUploadingDoc(prev => ({ ...prev, [docKey]: true }));

    try {
      await encryptAndSaveDocument(userEmail, docKey, file, { name: docName });
      toast.success(`"${docName}" encrypted with AES-256 and stored in your secure cache!`);
      await loadVaultDocs();
    } catch {
      toast.error("Failed to encrypt and store document");
    } finally {
      setIsUploadingDoc(prev => ({ ...prev, [docKey]: false }));
    }
  };

  const handleDownloadVaultDoc = async (docKey) => {
    try {
      await downloadSingleDocument(userEmail, docKey);
      toast.success("Document downloaded in original format!");
    } catch {
      toast.error("Failed to decrypt or download file");
    }
  };

  const handlePreviewVaultDoc = async (docKey) => {
    try {
      const doc = await loadAndDecryptDocument(userEmail, docKey);

      if (!doc) {
        toast.error("Document not found");

        return;
      }

      setPreviewModalDoc(doc);
    } catch {
      toast.error("Failed to preview document");
    }
  };

  const handleDeleteVaultDoc = async (docKey, docName) => {
    if (!confirm(`Are you sure you want to remove "${docName}" from your encrypted cache?`)) return;

    try {
      await deleteVaultDocument(userEmail, docKey);
      toast.success("Document removed from local vault");
      await loadVaultDocs();
    } catch {
      toast.error("Failed to remove document");
    }
  };

  const handleExportAllZip = async () => {
    if (vaultDocs.length === 0) {
      toast.warning("No files uploaded in your document vault yet!");

      return;
    }

    setIsExportingZip(true);

    try {
      const count = await exportDocumentsAsZip(
        userEmail,
        vaultDocs.map(d => d.docKey),
        `${userEmail ? userEmail.split('@')[0] : 'student'}_Scholarship_Universal_Dossier.zip`
      );

      toast.success(`Bundled and downloaded all ${count} documents into a ZIP archive!`);
    } catch (err) {
      toast.error(err.message || "Failed to package documents into ZIP");
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleCreateCustomDoc = (newDoc, onFinish) => {
    if (!newDoc.name.trim()) {
      toast.error("Please enter a document name");

      return;
    }

    const key = `custom_${Date.now()}`;

    const updated = [
      ...customVaultDocs,
      {
        key,
        name: newDoc.name.trim(),
        category: newDoc.category || 'Custom',
        note: newDoc.note || 'Custom requirement document',
        accepts: 'image/*,.pdf,.doc,.docx'
      }
    ];

    setCustomVaultDocs(updated);

    try {
      localStorage.setItem(`shore_custom_docs_${userEmail}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    if (onFinish) onFinish();
    toast.success("Custom document requirement added!");
  };

  const handleDeleteCustomDocSlot = (key) => {
    const updated = customVaultDocs.filter(d => d.key !== key);
    setCustomVaultDocs(updated);

    try {
      localStorage.setItem(`shore_custom_docs_${userEmail}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    deleteVaultDocument(userEmail, key);
    loadVaultDocs();
  };

  if (isLoading && !userEmail && !cachedUser?.email) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-muted">Loading settings...</p>
        </div>
      </div>
    );
  }

  const allVaultSlots = [...DEFAULT_MASTER_DOCS, ...customVaultDocs];

  return (
    <div className="h-full w-full max-w-7xl mx-auto flex flex-col overflow-y-auto relative px-4 sm:px-6 lg:px-8 pt-[max(1.25rem,calc(0.75rem+env(safe-area-inset-top,0px)))] sm:pt-8 bg-canvas overscroll-contain">
      {/* Photo Crop Modal */}
      <CropModal
        imageSrc={imageSrc}
        crop={crop}
        setCrop={setCrop}
        zoom={zoom}
        setZoom={setZoom}
        onCropComplete={onCropComplete}
        handleSaveCrop={handleSaveCrop}
        onClose={() => setImageSrc(null)}
      />

      {/* Header */}
      <PageHeader
        className="mb-6"
        title="Manage Account"
        description="Update your profile, avatar cosmetics, and organize your scholarship requirements."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-12">
        {/* Left Column: Profile, Attendance Pass, Cosmetics */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-4 sm:gap-6">
          <ProfileCard
            userEmail={userEmail}
            userRole={userRole}
            profilePicture={profilePicture}
            equippedBorder={equippedBorder}
            fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload}
            onOpenQR={() => setShowQRPopout(true)}
          />

          <CosmeticsCard
            ownedBorders={ownedBorders}
            borderInventory={borderInventory}
            equippedBorder={equippedBorder}
            handleEquipBorder={handleEquipBorder}
          />
        </div>

        {/* Right Column: Unified Workspace & Security */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-4 sm:gap-6">
          <div className="bg-card border border-border/80 rounded-3xl shadow-sm flex flex-col overflow-hidden transition-all">
            {/* Top Workspace Navigation Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-border/70 bg-canvas/40 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div role="tablist" aria-label="Account workspace" className="flex w-full min-w-0 rounded-xl border border-border/80 bg-card p-1 shadow-sm xl:w-auto">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMainTab === 'vault'}
                  onClick={() => setActiveMainTab('vault')}
                  className={`min-w-0 flex-1 py-2 px-2 sm:px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg transition-colors duration-200 ${
                    activeMainTab === 'vault'
                      ? 'bg-primary text-white shadow-sm shadow-primary/25'
                      : 'text-muted hover:text-fg hover:bg-canvas/60'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Document Vault</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold shrink-0 transition-colors ${
                    activeMainTab === 'vault'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-500/10 text-emerald-700'
                  }`}>
                    {vaultDocs.length}/{allVaultSlots.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMainTab === 'tracker'}
                  onClick={() => setActiveMainTab('tracker')}
                  className={`min-w-0 flex-1 py-2 px-2 sm:px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg transition-colors duration-200 ${
                    activeMainTab === 'tracker'
                      ? 'bg-primary text-white shadow-sm shadow-primary/25'
                      : 'text-muted hover:text-fg hover:bg-canvas/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Requirements Tracker</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold shrink-0 transition-colors ${
                    activeMainTab === 'tracker'
                      ? 'bg-white/20 text-white'
                      : 'bg-muted/20 text-muted'
                  }`}>
                    {appliedScholarships.length}
                  </span>
                </button>
              </div>

              {/* Vault Status Indicator */}
              <div className="hidden xl:flex items-center gap-1.5 text-xs font-medium text-muted shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">Document Vault</span>
              </div>
            </div>

            {/* Tab Body */}
            <div className="p-3.5 sm:p-6 flex-1 flex flex-col min-h-0">
              {activeMainTab === 'tracker' ? (
                <ScholarshipTracker
                  appliedScholarships={appliedScholarships}
                  availableScholarships={availableScholarships}
                  vaultDocs={vaultDocs}
                  userRole={userRole}
                  onAddScholarship={handleAddScholarship}
                  onRemoveScholarship={handleRemoveScholarship}
                  onToggleRequirementStatus={handleToggleRequirementStatus}
                  onAddInlineRequirement={handleAddInlineRequirement}
                  onDeleteRequirement={handleDeleteRequirement}
                  onSaveTrackedItemEdits={handleSaveTrackedItemEdits}
                  onPreviewVaultDoc={handlePreviewVaultDoc}
                />
              ) : (
                <DocumentVault
                  vaultDocs={vaultDocs}
                  customVaultDocs={customVaultDocs}
                  isUploadingDoc={isUploadingDoc}
                  isExportingZip={isExportingZip}
                  onUploadVaultDoc={handleUploadVaultDoc}
                  onDownloadVaultDoc={handleDownloadVaultDoc}
                  onPreviewVaultDoc={handlePreviewVaultDoc}
                  onDeleteVaultDoc={handleDeleteVaultDoc}
                  onExportAllZip={handleExportAllZip}
                  onCreateCustomDoc={handleCreateCustomDoc}
                  onDeleteCustomDocSlot={handleDeleteCustomDocSlot}
                  previewModalDoc={previewModalDoc}
                  setPreviewModalDoc={setPreviewModalDoc}
                />
              )}
            </div>
          </div>

          {/* Security & Password Card */}
          <SecurityCard userEmail={userEmail} />
        </div>
      </div>

      {/* QR Code Popout Modal */}
      <QRPassModal
        isOpen={showQRPopout}
        onClose={() => setShowQRPopout(false)}
        userEmail={userEmail}
        userRole={userRole}
      />
    </div>
  );
}
