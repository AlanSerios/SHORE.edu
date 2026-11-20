import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadStoredUser } from '../utils/userStorage';
import { ArrowRight, ChevronLeft, FolderArchive, LockKeyhole, QrCode, ShieldCheck, Sparkles } from 'lucide-react';
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
import ProfileCard from './settings/ProfileCard';
import AvatarBorder from './AvatarBorder';
import StudentProfileGoals from './settings/StudentProfileGoals';
import CosmeticsCard from './settings/CosmeticsCard';
import SecurityCard from './settings/SecurityCard';
import { PageHeader, PageShell } from './ui/page';
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

export default function SettingsView({ userEmail, userName, userRole, onUpdateUser, onNavigate }) {
  const cachedUser = loadStoredUser() || {};

  const [currentUserData, setCurrentUserData] = useState(cachedUser);
  const [profilePicture, setProfilePicture] = useState(cachedUser.profilePicture || null);
  const [ownedBorders, setOwnedBorders] = useState(cachedUser.ownedBorders || []);
  const [equippedBorder, setEquippedBorder] = useState(cachedUser.equippedBorder || null);
  const [appliedScholarships, setAppliedScholarships] = useState(() => normalizeTrackedScholarships(cachedUser.appliedScholarships || []));
  const [availableScholarships, setAvailableScholarships] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accountLoadError, setAccountLoadError] = useState('');
  const [borderInventory, setBorderInventory] = useState([]);

  // Profile crop state
  const fileInputRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Tabs & Document Vault State
  const [activeAccountSection, setActiveAccountSection] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState('tracker'); // 'tracker' | 'vault'
  const [vaultDocs, setVaultDocs] = useState([]);
  const sectionHeadingRef = useRef(null);
  const overviewCardRefs = useRef({});

  useEffect(() => {
    if (!activeAccountSection) return undefined;

    const frame = window.requestAnimationFrame(() => sectionHeadingRef.current?.focus());

    return () => window.cancelAnimationFrame(frame);
  }, [activeAccountSection]);

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
    setAccountLoadError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch('/api/users', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Account details could not be loaded.');
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
      setAccountLoadError('Could not refresh account details. Previously available details are still shown.');
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
        setCurrentUserData((current) => ({ ...current, ...data.user }));

        if (data.user?.profilePicture !== undefined) setProfilePicture(data.user.profilePicture || null);

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
      const result = await saveUserData({ profilePicture: croppedImageBase64 });

      if (result.success) {
        setProfilePicture(croppedImageBase64);
        setImageSrc(null);
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
    <PageShell width="wide" contentClassName="relative">
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
        className="mb-4 sm:mb-6"
        title="Manage Account"
        description="Profile, attendance, scholarships, and password."
      />

      {accountLoadError && <div className="mb-4 flex flex-wrap items-center gap-3 text-sm"><p role="alert" className="text-red-800">{accountLoadError}</p><button type="button" onClick={fetchUserData} className="min-h-11 rounded-lg border border-border px-4 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-primary">Retry</button></div>}

      {!activeAccountSection ? (
        <section aria-label="Account overview" className="space-y-3">
          <button
            ref={(node) => { overviewCardRefs.current.profile = node; }}
            type="button"
            onClick={() => setActiveAccountSection('profile')}
            className="flex min-h-[88px] w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-4"
          >
            <AvatarBorder borderId={equippedBorder} className="h-12 w-12 shrink-0">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-canvas text-lg font-semibold text-primary">
                {profilePicture ? <img src={profilePicture} alt="" className="h-full w-full object-cover" /> : (currentUserData.name || userName || userEmail || 'S').trim().charAt(0).toUpperCase()}
              </div>
            </AvatarBorder>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-fg">{currentUserData.name || userName || 'Your Profile'}</span>
              <span className="mt-0.5 block truncate text-sm text-muted">{userEmail}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-primary">Open profile</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          </button>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={() => onNavigate?.('attendance')}
              className="flex min-h-[82px] items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><QrCode className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-fg">{userRole === 'admin' ? 'Attendance' : 'Attendance Pass'}</span>
                <span className="mt-0.5 block text-sm text-muted">{userRole === 'admin' ? 'Manage check-ins' : 'Open your event pass'}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            </button>

            <button
              ref={(node) => { overviewCardRefs.current.scholarships = node; }}
              type="button"
              onClick={() => setActiveAccountSection('scholarships')}
              className="flex min-h-[82px] items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FolderArchive className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-fg">Tracked Scholarships</span>
                <span className="mt-0.5 block text-sm text-muted">{appliedScholarships.length ? `${appliedScholarships.length} ${appliedScholarships.length === 1 ? 'program' : 'programs'} saved` : 'Requirements and documents'}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            </button>

            <button
              ref={(node) => { overviewCardRefs.current.security = node; }}
              type="button"
              onClick={() => setActiveAccountSection('security')}
              className="flex min-h-[82px] items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:col-span-2 xl:col-span-1"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-fg">Security &amp; Password</span>
                <span className="mt-0.5 block text-sm text-muted">Manage your sign-in password</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : (
        <section id="account-section-panel" aria-labelledby="account-section-heading" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const previousSection = activeAccountSection;
                setActiveAccountSection(null);
                window.requestAnimationFrame(() => overviewCardRefs.current[previousSection]?.focus());
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />Account overview
            </button>
            <h2 ref={sectionHeadingRef} id="account-section-heading" tabIndex="-1" className="text-base font-semibold text-fg focus:outline-none">
              {activeAccountSection === 'profile' ? 'Profile' : activeAccountSection === 'scholarships' ? 'Tracked Scholarships' : 'Security & Password'}
            </h2>
          </div>

        {activeAccountSection === 'profile' && (
          <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${userRole === 'student' ? 'lg:grid-cols-12' : 'sm:grid-cols-2'}`}>
            <div className={`flex flex-col gap-4 sm:gap-6 ${userRole === 'student' ? 'lg:col-span-4' : ''}`}>
              <ProfileCard
                userEmail={userEmail}
                userName={currentUserData.name || userName}
                userRole={userRole}
                profilePicture={profilePicture}
                equippedBorder={equippedBorder}
                fileInputRef={fileInputRef}
                handleImageUpload={handleImageUpload}
              />
              {userRole === 'student' && <CosmeticsCard
                ownedBorders={ownedBorders}
                borderInventory={borderInventory}
                equippedBorder={equippedBorder}
                handleEquipBorder={handleEquipBorder}
              />}
            </div>
            {userRole === 'student' && (
              <div className="lg:col-span-8">
                <StudentProfileGoals
                  profilePicture={profilePicture}
                  onAddPhoto={() => fileInputRef.current?.click()}
                />
              </div>
            )}
            {userRole !== 'student' && <CosmeticsCard
              ownedBorders={ownedBorders}
              borderInventory={borderInventory}
              equippedBorder={equippedBorder}
              handleEquipBorder={handleEquipBorder}
            />}
          </div>
        )}

        {activeAccountSection === 'scholarships' && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border/70 bg-canvas/40 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div role="group" aria-label="Scholarship records" className="flex min-w-0 rounded-lg border border-border/80 bg-card p-1 sm:w-fit">
                <button
                  type="button"
                  aria-pressed={activeMainTab === 'tracker'}
                  onClick={() => setActiveMainTab('tracker')}
                  className={`flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-none sm:px-3 ${activeMainTab === 'tracker' ? 'bg-primary text-white' : 'text-muted hover:bg-canvas hover:text-fg'}`}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Requirements</span>
                  <span className="tabular-nums">{appliedScholarships.length}</span>
                </button>
                <button
                  type="button"
                  aria-pressed={activeMainTab === 'vault'}
                  onClick={() => setActiveMainTab('vault')}
                  className={`flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-none sm:px-3 ${activeMainTab === 'vault' ? 'bg-primary text-white' : 'text-muted hover:bg-canvas hover:text-fg'}`}
                >
                  <FolderArchive className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Document Vault</span>
                  <span className="tabular-nums">{vaultDocs.length}/{allVaultSlots.length}</span>
                </button>
              </div>
              <div className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{activeMainTab === 'tracker' ? 'Track requirements and deadlines' : 'Keep application files together'}</span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
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
        )}

        {activeAccountSection === 'security' && <SecurityCard userEmail={userEmail} />}
        </section>
      )}
    </PageShell>
  );
}
