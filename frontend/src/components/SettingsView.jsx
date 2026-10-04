import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Save, Plus, Trash2, CheckCircle2, QrCode, X, User, ChevronDown, 
  Clock, AlertTriangle, Check, ExternalLink, Sparkles, AlertCircle, Info, 
  XCircle, Edit2, FilePlus2, ShieldCheck, Upload, Download, Eye, FileText, 
  Lock, Shield, FileCheck, FolderArchive, RefreshCw, Layers, ShieldAlert 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import anime from 'animejs';
import getCroppedImg from '../utils/cropImage';
import AvatarBorder from './AvatarBorder';
import { 
  encryptAndSaveDocument, 
  loadAndDecryptDocument, 
  getAllVaultDocuments, 
  deleteVaultDocument, 
  downloadSingleDocument, 
  exportDocumentsAsZip,
  findVaultDocForReq
} from '../utils/vaultStorage';

export default function SettingsView({ userEmail, userRole, onUpdateUser }) {
  const [profilePicture, setProfilePicture] = useState(null);
  const [appliedScholarships, setAppliedScholarships] = useState([]);
  const [availableScholarships, setAvailableScholarships] = useState([]);
  const [newScholarship, setNewScholarship] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTrackerId, setExpandedTrackerId] = useState(null);
  const fileInputRef = useRef(null);
  const inputContainerRef = useRef(null);
  
  const [ownedBorders, setOwnedBorders] = useState([]);
  const [equippedBorder, setEquippedBorder] = useState(null);
  const [borderInventory, setBorderInventory] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);

  const [showQRPopout, setShowQRPopout] = useState(false);
  const qrModalRef = useRef(null);

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  // Edit Tracked Scholarship Modal State
  const [editingTrackedItem, setEditingTrackedItem] = useState(null);
  const [isEditingTrackedModalOpen, setIsEditingTrackedModalOpen] = useState(false);
  const [inlineNewReqName, setInlineNewReqName] = useState({});

  // Document Vault State
  const defaultMasterDocs = [
    { key: 'id_photo_2x2', name: '2x2 ID Photo (White Background & Name Tag)', category: 'Identity', note: 'Formal attire, taken within last 6 months', accepts: 'image/*' },
    { key: 'psa_birth_cert', name: 'PSA Authenticated Birth Certificate', category: 'Civil', note: 'Clear scan or photo of PSA SECPA copy', accepts: 'image/*,.pdf' },
    { key: 'form_137_138', name: 'Grade 12 Report Card (Form 137 / 138 / Transcript)', category: 'Academic', note: 'Showing complete quarterly grades & GWA', accepts: 'image/*,.pdf' },
    { key: 'good_moral', name: 'Certificate of Good Moral Character', category: 'Academic', note: 'Signed by Principal or Guidance Counselor', accepts: 'image/*,.pdf' },
    { key: 'brgy_residency', name: 'Barangay Certificate of Residency / Indigency', category: 'Civil', note: 'Issued by local Barangay Captain within 6 months', accepts: 'image/*,.pdf' },
    { key: 'parents_itr', name: "Parents' ITR / BIR Tax Exemption / 4Ps Certificate", category: 'Financial', note: 'Proof of annual gross income < ₱400k', accepts: 'image/*,.pdf' },
    { key: 'recommendation', name: 'Principal or Teacher Recommendation Letter', category: 'Academic', note: 'Attesting to character and academic merit', accepts: 'image/*,.pdf,.doc,.docx' },
    { key: 'residence_sketch', name: 'Barangay Sketch of Residence Map', category: 'Civil', note: 'Vicinity sketch map to family residence', accepts: 'image/*,.pdf' }
  ];

  
  // Change Password State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPasswordInput) {
      toast.error('Please enter your current password.');
      return;
    }
    if (newPasswordInput.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      toast.error('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          current_password: currentPasswordInput,
          new_password: newPasswordInput
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Password updated successfully!');
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
      } else {
        toast.error(data.error || 'Failed to update password.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error updating password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

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
  const [isAddCustomDocModalOpen, setIsAddCustomDocModalOpen] = useState(false);
  const [newCustomDoc, setNewCustomDoc] = useState({ name: '', category: 'Custom', note: '' });

  useEffect(() => {
    if (showQRPopout && qrModalRef.current) {
      anime({
        targets: qrModalRef.current,
        scale: [0.5, 1],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutElastic(1, .8)'
      });
    }
  }, [showQRPopout]);

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
    } catch (err) {
      toast.error("Failed to encrypt and store document");
    } finally {
      setIsUploadingDoc(prev => ({ ...prev, [docKey]: false }));
    }
  };

  const handleDownloadVaultDoc = async (docKey) => {
    try {
      toast.info("Decrypting file...");
      await downloadSingleDocument(userEmail, docKey);
      toast.success("Document downloaded in original format!");
    } catch (err) {
      toast.error("Failed to decrypt or download file");
    }
  };

  const handlePreviewVaultDoc = async (docKey) => {
    try {
      toast.info("Decrypting preview...");
      const doc = await loadAndDecryptDocument(userEmail, docKey);
      if (!doc) {
        toast.error("Document not found");
        return;
      }
      setPreviewModalDoc(doc);
    } catch (err) {
      toast.error("Failed to preview document");
    }
  };

  const handleDeleteVaultDoc = async (docKey, docName) => {
    if (!confirm(`Are you sure you want to remove "${docName}" from your encrypted cache?`)) return;
    try {
      await deleteVaultDocument(userEmail, docKey);
      toast.success("Document removed from local vault");
      await loadVaultDocs();
    } catch (err) {
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

  const handleCreateCustomDoc = () => {
    if (!newCustomDoc.name.trim()) {
      toast.error("Please enter a document name");
      return;
    }
    const key = `custom_${Date.now()}`;
    const updated = [...customVaultDocs, { key, name: newCustomDoc.name.trim(), category: newCustomDoc.category || 'Custom', note: newCustomDoc.note || 'Custom requirement document', accepts: 'image/*,.pdf,.doc,.docx' }];
    setCustomVaultDocs(updated);
    try {
      localStorage.setItem(`shore_custom_docs_${userEmail}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setNewCustomDoc({ name: '', category: 'Custom', note: '' });
    setIsAddCustomDocModalOpen(false);
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

  // Normalize scholarship entries (string or object) to a structured tracker object
  const normalizeTrackedScholarships = (list, catalog) => {
    return (list || []).map((item, idx) => {
      if (typeof item === 'string') {
        const matched = (catalog || []).find(s => 
          s.title.toLowerCase().includes(item.toLowerCase()) || 
          item.toLowerCase().includes(s.title.toLowerCase())
        );
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
          id: matched ? matched.id : `custom-${idx}-${Date.now()}`,
          title: item,
          provider: matched ? matched.provider : "Scholarship Provider",
          deadline: matched ? matched.deadline : "",
          applyLink: matched ? matched.applyLink : "",
          requirements: reqNames.map(r => ({ name: typeof r === 'string' ? r : r.name, status: 'missing' }))
        };
      }
      // If already object, ensure requirements array is formatted
      const reqs = (item.requirements || []).map(r => {
        if (typeof r === 'string') return { name: r, status: 'missing' };
        return { name: r.name || 'Required Document', status: r.status || 'missing' };
      });
      return {
        ...item,
        id: item.id || `sch-${idx}-${Date.now()}`,
        requirements: reqs
      };
    });
  };

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      const currentUser = data.users.find(u => u.email === userEmail);
      if (currentUser) {
        setCurrentUserData(currentUser);
        setProfilePicture(currentUser.profilePicture || null);
        setOwnedBorders(currentUser.ownedBorders || []);
        setEquippedBorder(currentUser.equippedBorder || null);

        // Fetch catalog to help normalize
        const catRes = await fetch('/api/scholarships');
        const catData = await catRes.json();
        const catalog = catData.scholarships || [];
        setAvailableScholarships(catalog);

        const normalized = normalizeTrackedScholarships(currentUser.appliedScholarships || [], catalog);
        setAppliedScholarships(normalized);
        if (normalized.length > 0 && !expandedTrackerId) {
          setExpandedTrackerId(normalized[0].id);
        }
      }
    } catch (error) {
      toast.error('Failed to load user data');
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
        if (onUpdateUser) {
          onUpdateUser(data.user);
        }
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to save' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

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
      setIsCropping(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSaveCrop = async () => {
    try {
      const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      setProfilePicture(croppedImageBase64);
      setIsCropping(false);
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

  const handleAddScholarship = async (scholarshipItem = null) => {
    const titleToAdd = scholarshipItem ? scholarshipItem.title : newScholarship.trim();
    
    if (!titleToAdd) {
      if (inputContainerRef.current) {
        anime({
          targets: inputContainerRef.current,
          translateX: [-10, 10, -8, 8, -4, 4, 0],
          duration: 400,
          easing: 'easeInOutQuad'
        });
      }
      toast.warning("Please type a scholarship name or click a suggestion below");
      return;
    }

    // Check if already tracked
    if (appliedScholarships.some(s => s.title.toLowerCase() === titleToAdd.toLowerCase())) {
      toast.info(`"${titleToAdd}" is already in your tracker!`);
      return;
    }

    // Find in catalog or generate default
    const matched = availableScholarships.find(s => 
      s.title.toLowerCase() === titleToAdd.toLowerCase() || 
      (scholarshipItem && s.id === scholarshipItem.id)
    );

    const defaultReqs = (matched && matched.requirements && matched.requirements.length > 0)
      ? matched.requirements.map(r => ({ name: typeof r === 'string' ? r : r.name, status: 'missing' }))
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
    setNewScholarship('');
    setExpandedTrackerId(newTracked.id);

    const result = await saveUserData({ appliedScholarships: updated });
    if (result.success) {
      toast.success(`Tracked "${newTracked.title}" with checklist!`);
    } else {
      toast.error('Failed to update tracker');
      setAppliedScholarships(appliedScholarships);
    }
  };

  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false);

  const handleToggleRequirementStatus = async (scholarshipId, reqIndex, isInVault, e) => {
    if (e) {
      anime({
        targets: e.currentTarget,
        scale: [0.95, 1.05, 1],
        duration: 250,
        easing: 'easeOutQuad'
      });
    }

    const updated = appliedScholarships.map(item => {
      if (item.id === scholarshipId) {
        const nextReqs = [...item.requirements];
        const currentStatus = nextReqs[reqIndex].status;
        
        let nextStatus = 'missing';
        if (isInVault) {
          nextStatus = currentStatus === 'pending' ? 'ready' : 'pending';
        } else {
          // Cycle: missing -> pending -> ready -> missing
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

  const openEditTrackedModal = (scholarship) => {
    setEditingTrackedItem({
      ...scholarship,
      requirements: (scholarship.requirements || []).map(r => ({ ...r }))
    });
    setIsEditingTrackedModalOpen(true);
  };

  const handleSaveTrackedItemEdits = async () => {
    if (!editingTrackedItem || !editingTrackedItem.title.trim()) {
      toast.error("Scholarship title cannot be empty");
      return;
    }

    const cleanedReqs = (editingTrackedItem.requirements || [])
      .filter(r => (typeof r === 'string' ? r.trim() : r.name?.trim()))
      .map(r => (typeof r === 'string' ? { name: r.trim(), status: 'missing' } : { name: r.name.trim(), status: r.status || 'missing' }));

    const updated = appliedScholarships.map(s => {
      if (s.id === editingTrackedItem.id) {
        return {
          ...editingTrackedItem,
          requirements: cleanedReqs
        };
      }
      return s;
    });

    setAppliedScholarships(updated);
    setIsEditingTrackedModalOpen(false);
    const result = await saveUserData({ appliedScholarships: updated });
    if (result.success) {
      toast.success(`Updated "${editingTrackedItem.title}"!`);
    } else {
      toast.error("Failed to save tracker edits");
      setAppliedScholarships(appliedScholarships);
    }
  };

  const handleAddInlineRequirement = async (scholarshipId) => {
    const reqName = (inlineNewReqName[scholarshipId] || '').trim();
    if (!reqName) {
      toast.warning("Please enter a document name");
      return;
    }

    const updated = appliedScholarships.map(s => {
      if (s.id === scholarshipId) {
        const nextReqs = [...(s.requirements || []), { name: reqName, status: 'missing' }];
        return { ...s, requirements: nextReqs };
      }
      return s;
    });

    setAppliedScholarships(updated);
    setInlineNewReqName(prev => ({ ...prev, [scholarshipId]: '' }));
    const result = await saveUserData({ appliedScholarships: updated });
    if (result.success) {
      toast.success(`Added "${reqName}" to checklist!`);
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

  // Calculate missing requirements for all tracked scholarships taking Vault into account
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

  // Calculate days remaining helper
  const getDeadlineBadge = (deadlineStr) => {
    if (!deadlineStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Expired', color: 'bg-red-500/10 text-red-600 border-red-500/20', urgent: true };
    }
    if (diffDays === 0) {
      return { label: 'Due Today!', color: 'bg-red-500 text-white font-bold', urgent: true };
    }
    if (diffDays <= 7) {
      return { label: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`, color: 'bg-amber-500/15 text-amber-700 border-amber-500/30 font-bold', urgent: true };
    }
    return { label: `Due in ${diffDays} days`, color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold', urgent: false };
  };

  useEffect(() => {
    if (activeMainTab === 'vault') {
      anime({
        targets: '.vault-card-anim',
        translateY: [14, 0],
        opacity: [0, 1],
        delay: anime.stagger(40),
        easing: 'easeOutCubic',
        duration: 350
      });
    } else if (activeMainTab === 'tracker') {
      anime({
        targets: '.tracker-card-anim',
        translateY: [14, 0],
        opacity: [0, 1],
        delay: anime.stagger(40),
        easing: 'easeOutCubic',
        duration: 350
      });
    }
  }, [activeMainTab, vaultDocs.length, appliedScholarships.length]);

  if (isLoading) {
    return <div className="p-4 sm:p-8">Loading...</div>;
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 h-full flex flex-col overflow-y-auto relative max-w-7xl mx-auto w-full">
      {isCropping && imageSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border/50 overflow-hidden flex flex-col transform scale-100 transition-all">
            <div className="px-6 py-4 border-b border-border/40 flex justify-between items-center bg-canvas/30 backdrop-blur-sm">
              <h3 className="font-black tracking-tight text-fg text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" /> 
                Adjust Picture
              </h3>
              <button 
                onClick={() => { setIsCropping(false); setImageSrc(null); }} 
                className="p-2 hover:bg-black/5 rounded-full text-muted-foreground hover:text-fg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full h-[350px] bg-black/95">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="px-6 py-5 bg-card space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-muted uppercase tracking-widest">Zoom</span>
                  <span className="text-xs font-bold text-primary">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">-</span>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-full appearance-none outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer accent-primary"
                  />
                  <span className="text-xs font-medium text-muted-foreground">+</span>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setIsCropping(false); setImageSrc(null); }}
                  className="px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-fg hover:bg-muted/30 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCrop}
                  className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Picture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-3xl font-black text-fg tracking-tight">Manage Account</h1>
        <p className="text-muted text-xs sm:text-sm mt-0.5 sm:mt-1">Update your profile, avatar cosmetics, and organize your scholarship requirements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 pb-12">
        {/* Left Column: Profile, Attendance ID, Cosmetics */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-4 sm:gap-6">
          
          {/* Profile Settings Card */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
            <h2 className="text-sm sm:text-base font-bold text-fg mb-3 sm:mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Profile Settings
            </h2>
            
            <div className="flex flex-col items-center">
              <div className="relative group mb-3 sm:mb-4">
                <AvatarBorder borderId={equippedBorder} className="w-24 h-24 sm:w-32 sm:h-32 shrink-0">
                  <div className="w-full h-full rounded-full overflow-hidden bg-canvas border-2 border-primary/20 flex items-center justify-center text-2xl sm:text-4xl font-bold text-primary">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      userRole === 'admin' ? 'A' : (userEmail ? userEmail.charAt(0).toUpperCase() : '')
                    )}
                  </div>
                </AvatarBorder>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 z-20 bg-primary text-white p-2 sm:p-2.5 rounded-full shadow-md hover:bg-primaryHover transition-transform hover:scale-105 active:scale-95"
                  title="Change Picture"
                >
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/png, image/jpeg, image/jpg" 
                  className="hidden" 
                />
              </div>

              <div className="text-center w-full min-w-0">
                <h3 className="font-bold text-fg text-sm sm:text-lg truncate">{userRole === 'admin' ? 'Admin User' : (userEmail ? userEmail.split('@')[0] : '')}</h3>
                <p className="text-muted text-xs truncate mb-2 sm:mb-3">{userEmail}</p>
                <div className="bg-primary/10 text-[11px] font-bold px-3 py-0.5 sm:py-1 rounded-full text-primary uppercase tracking-wider inline-block border border-primary/20">
                  {userRole} Account
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Student ID / Pass Card */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-primary/40" />
            
            <div className="flex items-center justify-between w-full mb-2 sm:mb-3">
              <div className="flex items-center gap-2 text-left">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                  <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-fg">Attendance Pass</h2>
                  <p className="text-[10px] sm:text-[11px] text-muted">Scan at events & recitations</p>
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {userRole === 'admin' ? 'Admin' : 'Student'}
              </span>
            </div>
            
            <div 
              className="bg-white p-3 rounded-2xl shadow-sm border border-border/80 hover:border-primary/40 group-hover:scale-[1.02] transition-all duration-200 cursor-pointer flex flex-col items-center my-1"
              onClick={() => setShowQRPopout(true)}
              title="Click to enlarge"
            >
              <QRCodeSVG 
                value={userEmail} 
                size={120} 
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
                includeMargin={false}
              />
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/5 px-2.5 py-0.5 rounded-md border border-primary/10">
                <Sparkles className="w-3 h-3" />
                <span>Tap to Enlarge Pass</span>
              </div>
            </div>
            
            <div className="mt-1.5 text-center w-full">
              <p className="font-bold text-fg text-xs truncate">{userEmail.split('@')[0]}</p>
            </div>
          </div>

          {/* Digital Cosmetics Card */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col">
            <h2 className="text-sm sm:text-base font-bold text-fg mb-0.5">Digital Cosmetics</h2>
            <p className="text-[11px] sm:text-xs text-muted mb-3 sm:mb-4">Equip avatar borders unlocked from the Rewards Shop.</p>
            
            {ownedBorders.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-4 sm:p-6 border-2 border-dashed border-border/60 rounded-xl bg-canvas/50">
                <p className="text-xs font-bold text-muted">No borders unlocked yet.</p>
                <p className="text-[11px] text-muted mt-0.5">Visit the Rewards Shop to unlock frames!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <button
                  onClick={() => handleEquipBorder(null)}
                  className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                    !equippedBorder ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 bg-canvas hover:bg-slate-100'
                  }`}
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-400">
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${!equippedBorder ? 'text-primary' : 'text-muted'}`}>No Border</span>
                </button>
                
                {borderInventory.filter(b => ownedBorders.includes(b.id)).map(border => {
                  const isActive = equippedBorder === border.id;
                  return (
                    <button
                      key={border.id}
                      onClick={() => handleEquipBorder(border.id)}
                      className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                        isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 bg-canvas hover:bg-slate-100'
                      }`}
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center mb-0.5">
                        <AvatarBorder borderId={border.id}>
                          <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
                             <User className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                        </AvatarBorder>
                      </div>
                      <span className={`text-[9px] sm:text-[10px] text-center font-bold uppercase tracking-wider truncate max-w-full ${isActive ? 'text-primary' : 'text-muted'}`}>
                        {border.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        
            {/* Security & Password Card */}
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm mt-4">
              <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-border/60">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-fg">Security & Password</h3>
                  <p className="text-[11px] text-muted">Update your SHORE account password</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-fg mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPasswordInput}
                      onChange={e => setCurrentPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-canvas border border-border rounded-xl px-3 py-1.5 text-xs font-medium text-fg focus:outline-none focus:border-primary pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
                    >
                      {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-fg mb-1">New Password (min. 6 chars)</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPasswordInput}
                      onChange={e => setNewPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full bg-canvas border border-border rounded-xl px-3 py-1.5 text-xs font-medium text-fg focus:outline-none focus:border-primary pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
                    >
                      {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-fg mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPasswordInput}
                    onChange={e => setConfirmPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-canvas border border-border rounded-xl px-3 py-1.5 text-xs font-medium text-fg focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword || !currentPasswordInput || !newPasswordInput}
                  className="w-full bg-primary hover:bg-primaryHover disabled:opacity-50 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {isChangingPassword && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Password</span>
                </button>
              </form>
            </div>

          </div>

        {/* Right Column: Unified Panel with Seamless Header Navigation */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col">
          <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
            
            {/* Integrated Header with Modern Tab Bar & Vault Toolbar */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-border bg-card/70 backdrop-blur-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              {/* Segmented Pill Tabs */}
              <div className="grid grid-cols-2 p-1 bg-canvas rounded-xl border border-border sm:flex sm:bg-canvas sm:p-1 sm:rounded-xl sm:border sm:border-border sm:gap-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveMainTab('tracker')}
                  className={`py-1.5 px-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${
                    activeMainTab === 'tracker'
                      ? 'bg-card text-primary shadow-xs border border-border/60'
                      : 'text-muted hover:text-fg'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">Requirements Tracker</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                    activeMainTab === 'tracker' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-muted/20 text-muted'
                  }`}>
                    {appliedScholarships.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMainTab('vault')}
                  className={`py-1.5 px-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${
                    activeMainTab === 'vault'
                      ? 'bg-card text-emerald-700 shadow-xs border border-border/60'
                      : 'text-muted hover:text-fg'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Document Vault</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                    activeMainTab === 'vault' 
                      ? 'bg-emerald-500/10 text-emerald-700' 
                      : 'bg-muted/20 text-muted'
                  }`}>
                    {vaultDocs.length}/{defaultMasterDocs.length + customVaultDocs.length}
                  </span>
                </button>
              </div>

              {/* Top Quick Actions for Vault */}
              {activeMainTab === 'vault' && (
                <div className="flex items-center gap-2 justify-end shrink-0">
                  <button
                    onClick={handleExportAllZip}
                    disabled={isExportingZip || vaultDocs.length === 0}
                    className="bg-primary hover:bg-primaryHover disabled:opacity-40 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs shadow-sm shadow-primary/20 active:scale-95 shrink-0"
                    title="Bundle and download all stored files as ZIP"
                  >
                    <Download className={`w-3.5 h-3.5 ${isExportingZip ? 'animate-bounce' : ''}`} />
                    <span>{isExportingZip ? 'Exporting...' : 'Download All (.ZIP)'}</span>
                  </button>

                  <button
                    onClick={() => setIsAddCustomDocModalOpen(true)}
                    className="bg-canvas border border-border hover:bg-slate-100 text-fg px-3 py-1.5 rounded-xl font-semibold flex items-center justify-center gap-1 transition-all text-xs active:scale-95 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add Slot</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tab Body */}
            <div className="p-3.5 sm:p-6 flex-1 flex flex-col min-h-0">
              {activeMainTab === 'tracker' ? (
                /* Scholarships Interactive Tracker */
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
                          className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg shrink-0 transition-colors flex items-center gap-1"
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
                        onKeyDown={e => e.key === 'Enter' && handleAddScholarship()}
                        placeholder="Add or search scholarship to track (e.g. DOST-SEI Merit)..."
                        className="flex-1 min-w-0 px-3.5 py-2.5 sm:py-2 rounded-xl border border-border bg-canvas focus:outline-none focus:border-primary transition-colors text-xs sm:text-sm"
                      />
                      <button 
                        onClick={() => handleAddScholarship()}
                        className="bg-primary hover:bg-primaryHover text-white px-4 py-2.5 sm:py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0 text-xs sm:text-sm active:scale-95"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" /> <span>Add to Tracker</span>
                      </button>
                    </div>

                    {/* Quick Suggestion Pills */}
                    {availableScholarships.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Suggestions:</span>
                        {availableScholarships.slice(0, 4).map((s) => {
                          const isAlreadyTracked = appliedScholarships.some(t => t.title.toLowerCase() === s.title.toLowerCase());
                          return (
                            <button
                              key={s.id}
                              onClick={() => handleAddScholarship(s)}
                              disabled={isAlreadyTracked}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1 ${
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
                            className="tracker-card-anim bg-card border border-border rounded-xl overflow-hidden shadow-xs transition-all"
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
                                <p className="text-[10px] sm:text-[11px] text-muted">{scholarship.provider || "Scholarship Program"}</p>
                                
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
                                    onClick={() => openEditTrackedModal(scholarship)}
                                    className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-canvas transition-colors"
                                    title="Edit Scholarship Details"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setExpandedTrackerId(isExpanded ? null : scholarship.id)}
                                  className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-canvas transition-colors"
                                  title="Toggle Checklist"
                                >
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                                </button>
                                <button 
                                  onClick={() => handleRemoveScholarship(scholarship.id)}
                                  className="p-1.5 text-muted hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
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
                                  animate={{ height: "auto", opacity: 1 }}
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
                                            onClick={(e) => handleToggleRequirementStatus(scholarship.id, rIdx, isInVault, e)}
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
                                                  onClick={() => handlePreviewVaultDoc(vaultDoc.docKey)}
                                                  className="p-1 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                  title="Preview Vault Document"
                                                >
                                                  <Eye className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={(e) => handleToggleRequirementStatus(scholarship.id, rIdx, false, e)}
                                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider transition-all flex items-center gap-1 ${
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
                                                onClick={(e) => handleDeleteRequirement(scholarship.id, rIdx, e)}
                                                className="p-1 text-muted hover:text-red-500 rounded hover:bg-red-50 transition-colors"
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
                                      onKeyDown={(e) => e.key === 'Enter' && handleAddInlineRequirement(scholarship.id)}
                                      placeholder="+ Add custom requirement item..."
                                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-primary transition-colors"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddInlineRequirement(scholarship.id)}
                                      className="bg-primary/10 hover:bg-primary hover:text-white text-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
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
                </div>
              ) : (
                /* Document Vault — Clean 2-Column Bento Grid */
                <div className="flex flex-col h-full">
                  {/* Vault Subheader / Progress bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3.5 pb-2.5 border-b border-border/60">
                    <div>
                      <h2 className="text-sm font-bold text-fg">Universal Master Requirements</h2>
                      <p className="text-[11px] text-muted">Upload standard student papers once to quickly attach to scholarship applications.</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-[11px] font-bold text-fg">
                        <span className="text-primary font-extrabold">{vaultDocs.length}</span>
                        <span className="text-muted"> / {defaultMasterDocs.length + customVaultDocs.length} Ready</span>
                      </div>
                      <div className="w-20 bg-muted/20 h-2 rounded-full overflow-hidden border border-border/40">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.round((vaultDocs.length / Math.max(1, defaultMasterDocs.length + customVaultDocs.length)) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Documents Bento Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[...defaultMasterDocs, ...customVaultDocs].map((docDef) => {
                      const storedDoc = vaultDocs.find(d => d.docKey === docDef.key);
                      const isUploading = isUploadingDoc[docDef.key];

                      return (
                        <div 
                          key={docDef.key}
                          className={`vault-card-anim p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                            storedDoc 
                              ? 'bg-primary/[0.02] border-primary/30 shadow-xs hover:border-primary/50' 
                              : 'bg-card border-border/80 hover:border-border hover:bg-slate-50/50'
                          }`}
                        >
                          <div>
                            {/* Card Top Row: Category + Status Badge */}
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 py-0.5 rounded bg-canvas border border-border/60">
                                {docDef.category}
                              </span>
                              
                              {storedDoc ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  <span>{formatFileSize(storedDoc.fileSize)}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-muted/70">
                                  Not uploaded
                                </span>
                              )}
                            </div>

                            {/* Card Body: Title & Note */}
                            <h3 className="font-bold text-fg text-xs leading-snug line-clamp-2 mb-1">
                              {docDef.name}
                            </h3>
                            <p className="text-[10px] text-muted line-clamp-1 mb-3">
                              {docDef.note}
                            </p>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-1.5 mt-auto">
                            {storedDoc ? (
                              <>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-mono text-muted truncate" title={storedDoc.originalFileName}>
                                    {storedDoc.originalFileName}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handlePreviewVaultDoc(docDef.key)}
                                    className="p-1.5 bg-canvas hover:bg-slate-100 border border-border text-fg rounded-lg text-xs font-semibold transition-colors"
                                    title="Preview file"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                  </button>

                                  <button
                                    onClick={() => handleDownloadVaultDoc(docDef.key)}
                                    className="p-1.5 bg-primary/10 hover:bg-primary hover:text-white border border-primary/20 text-primary rounded-lg text-xs font-bold transition-all active:scale-95"
                                    title="Download file"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>

                                  <label className="p-1.5 bg-canvas hover:bg-slate-100 border border-border text-muted hover:text-fg rounded-lg text-xs font-semibold cursor-pointer transition-colors" title="Replace file">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <input
                                      type="file"
                                      accept={docDef.accepts || 'image/*,.pdf,.docx,.doc'}
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleUploadVaultDoc(docDef.key, docDef.name, e.target.files[0]);
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>

                                  <button
                                    onClick={() => handleDeleteVaultDoc(docDef.key, docDef.name)}
                                    className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete file"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <label className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-dashed ${
                                isUploading 
                                  ? 'bg-primary/10 text-primary border-primary cursor-wait'
                                  : 'bg-canvas hover:bg-primary/5 text-fg hover:text-primary border-border hover:border-primary/40'
                              }`}>
                                <Upload className={`w-3 h-3 text-primary ${isUploading ? 'animate-bounce' : ''}`} />
                                <span>{isUploading ? 'Saving...' : 'Upload Document'}</span>
                                <input
                                  type="file"
                                  accept={docDef.accepts || 'image/*,.pdf,.docx,.doc'}
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleUploadVaultDoc(docDef.key, docDef.name, e.target.files[0]);
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
                </div>
              )}
            </div>
          </div>
        </div>
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
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-fg hover:bg-canvas"
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
                <button onClick={() => setIsAddCustomDocModalOpen(false)} className="text-muted hover:text-fg p-1 rounded-lg">
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
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-canvas text-xs sm:text-sm focus:outline-none focus:border-primary"
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
                  className="px-4 py-2 border border-border text-fg rounded-xl font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCustomDoc}
                  className="px-5 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Create Slot
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Edit Tracked Scholarship & Checklist Modal */}
      <AnimatePresence>
        {isEditingTrackedModalOpen && editingTrackedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pb-28 sm:pb-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsEditingTrackedModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-3xl w-full max-w-lg p-5 sm:p-6 relative z-10 shadow-2xl max-h-[82vh] flex flex-col my-auto overflow-hidden"
            >
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-border/60 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-fg">Edit Tracked Scholarship</h2>
                  <p className="text-xs text-muted">Customize scholarship details and requirements checklist.</p>
                </div>
                <button 
                  onClick={() => setIsEditingTrackedModalOpen(false)} 
                  className="p-1.5 text-muted hover:text-fg rounded-xl hover:bg-canvas"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs overflow-y-auto flex-1 pr-1">
                <div>
                  <label className="block font-bold text-fg mb-1 uppercase tracking-wider">Scholarship Title</label>
                  <input
                    type="text"
                    value={editingTrackedItem.title}
                    onChange={(e) => setEditingTrackedItem({ ...editingTrackedItem, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-canvas text-xs sm:text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-fg mb-1 uppercase tracking-wider">Provider</label>
                    <input
                      type="text"
                      value={editingTrackedItem.provider || ''}
                      onChange={(e) => setEditingTrackedItem({ ...editingTrackedItem, provider: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-canvas text-xs sm:text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-fg mb-1 uppercase tracking-wider">Deadline</label>
                    <input
                      type="date"
                      value={editingTrackedItem.deadline || ''}
                      onChange={(e) => setEditingTrackedItem({ ...editingTrackedItem, deadline: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-canvas text-xs sm:text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-fg mb-1 uppercase tracking-wider">Official Portal URL</label>
                  <input
                    type="url"
                    value={editingTrackedItem.applyLink || ''}
                    onChange={(e) => setEditingTrackedItem({ ...editingTrackedItem, applyLink: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-canvas text-xs sm:text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="font-bold text-fg uppercase tracking-wider">Checklist Documents</label>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTrackedItem({
                          ...editingTrackedItem,
                          requirements: [...(editingTrackedItem.requirements || []), { name: '', status: 'missing' }]
                        });
                      }}
                      className="text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" /> Add Item
                    </button>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto p-1">
                    {(editingTrackedItem.requirements || []).map((req, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={typeof req === 'string' ? req : req.name}
                          onChange={(e) => {
                            const next = [...editingTrackedItem.requirements];
                            if (typeof next[idx] === 'string') {
                              next[idx] = e.target.value;
                            } else {
                              next[idx] = { ...next[idx], name: e.target.value };
                            }
                            setEditingTrackedItem({ ...editingTrackedItem, requirements: next });
                          }}
                          placeholder="Document name..."
                          className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-canvas text-xs focus:outline-none focus:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = editingTrackedItem.requirements.filter((_, i) => i !== idx);
                            setEditingTrackedItem({ ...editingTrackedItem, requirements: next });
                          }}
                          className="text-muted hover:text-red-500 p-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border mt-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditingTrackedModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-fg hover:bg-canvas font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTrackedItemEdits}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primaryHover text-white font-bold text-xs shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Popout Modal */}
      <AnimatePresence>
        {showQRPopout && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pb-28 sm:pb-6 overflow-y-auto">
            <div 
              className="absolute inset-0"
              onClick={() => setShowQRPopout(false)}
            />
            <div 
              ref={qrModalRef}
              className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center max-w-sm w-full z-10 my-auto"
            >
              <button 
                onClick={() => setShowQRPopout(false)}
                className="absolute top-4 right-4 p-2 bg-canvas text-muted hover:text-fg rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="bg-canvas p-4 rounded-2xl mb-4 shadow-inner border border-border/50">
                <QRCodeSVG 
                  value={userEmail} 
                  size={220} 
                  bgColor="transparent"
                  fgColor="#000000"
                  level="H"
                  includeMargin={false}
                />
              </div>
              
              <h2 className="text-xl sm:text-2xl font-black text-fg text-center mb-1 tracking-tight">
                {userEmail.split('@')[0]}
              </h2>
              <div className="flex items-center gap-1.5 justify-center">
                <span className="text-xs font-bold text-primary uppercase tracking-[0.15em] bg-primary/10 px-3 py-1 rounded-full">
                  {userRole === 'admin' ? 'Volunteer/Admin' : 'SHORE 5.0 Student'}
                </span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
