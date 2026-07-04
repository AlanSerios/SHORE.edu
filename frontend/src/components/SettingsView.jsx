import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, Plus, Trash2, CheckCircle2, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';

export default function SettingsView({ userEmail, userRole, onUpdateUser }) {
  const [profilePicture, setProfilePicture] = useState(null);
  const [appliedScholarships, setAppliedScholarships] = useState([]);
  const [newScholarship, setNewScholarship] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [userEmail]);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      const currentUser = data.users.find(u => u.email === userEmail);
      if (currentUser) {
        setProfilePicture(currentUser.profilePicture || null);
        setAppliedScholarships(currentUser.appliedScholarships || []);
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      setImageSrc(reader.result);
      setIsCropping(true);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
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

  const handleAddScholarship = async () => {
    if (!newScholarship.trim()) return;
    
    const updatedScholarships = [...appliedScholarships, newScholarship.trim()];
    setAppliedScholarships(updatedScholarships);
    setNewScholarship('');

    const success = await saveUserData({ appliedScholarships: updatedScholarships });
    if (success) {
      toast.success('Added to your tracker');
    } else {
      toast.error('Failed to update tracker');
      setAppliedScholarships(appliedScholarships); // Revert
    }
  };

  const handleRemoveScholarship = async (index) => {
    const updatedScholarships = appliedScholarships.filter((_, i) => i !== index);
    setAppliedScholarships(updatedScholarships);

    const success = await saveUserData({ appliedScholarships: updatedScholarships });
    if (success) {
      toast.success('Removed from your tracker');
    } else {
      toast.error('Failed to update tracker');
      setAppliedScholarships(appliedScholarships); // Revert
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto relative">
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

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fg tracking-tight">Manage Account</h1>
        <p className="text-muted mt-1">Update your profile and track your scholarship applications.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 h-full">
        {/* Profile Details */}
        <div className="lg:col-span-1 xl:col-span-1 flex flex-col">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-fg mb-6">Profile Settings</h2>
            
            <div className="flex flex-col items-center">
              <div className="relative group mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-canvas border-2 border-primary/20 flex items-center justify-center text-4xl font-bold text-primary">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    userRole === 'admin' ? 'A' : userEmail.charAt(0).toUpperCase()
                  )}
                </div>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-primary text-white p-2.5 rounded-full shadow-md hover:bg-primaryHover transition-transform hover:scale-105"
                  title="Change Picture"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/png, image/jpeg, image/jpg" 
                  className="hidden" 
                />
              </div>

              <div className="text-center w-full">
                <h3 className="font-bold text-fg text-lg">{userRole === 'admin' ? 'Admin User' : userEmail.split('@')[0]}</h3>
                <p className="text-muted text-sm mb-4">{userEmail}</p>
                <div className="bg-canvas text-xs font-semibold px-3 py-1.5 rounded-md text-primary uppercase tracking-wider inline-block">
                  {userRole} Account
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Digital ID / QR Code */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-primary/40" />
            
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-fg mb-1">Attendance ID</h2>
            <p className="text-sm text-muted mb-6">Scan this code at events</p>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-border/30 group-hover:scale-105 transition-transform duration-300">
              <QRCodeSVG 
                value={userEmail} 
                size={120} 
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin={false}
              />
            </div>
            
            <div className="mt-6">
              <p className="font-bold text-fg">{userEmail.split('@')[0]}</p>
            </div>
          </div>
        </div>

        {/* Scholarships Tracker */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full flex flex-col">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-fg">Scholarship Tracker</h2>
              <p className="text-sm text-muted mt-1">Keep track of the scholarships you are currently applying for.</p>
            </div>

            <div className="flex gap-3 mb-6">
              <input 
                type="text" 
                value={newScholarship}
                onChange={e => setNewScholarship(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddScholarship()}
                placeholder="e.g. DOST-SEI Merit Scholarship"
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-canvas focus:outline-none focus:border-primary transition-colors"
              />
              <button 
                onClick={handleAddScholarship}
                className="bg-primary hover:bg-primaryHover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm shrink-0"
              >
                <Plus className="w-5 h-5" /> Add
              </button>
            </div>

            <div className="flex-1 bg-canvas rounded-xl p-4 overflow-y-auto">
              {appliedScholarships.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted/60 text-sm py-12">
                  <CheckCircle2 className="w-12 h-12 mb-3 opacity-50" />
                  <p>You haven't added any scholarships to your tracker yet.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {appliedScholarships.map((scholarship, idx) => (
                    <li key={idx} className="bg-card border border-border p-4 rounded-xl flex items-center justify-between group shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-fg">{scholarship}</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveScholarship(idx)}
                        className="text-muted hover:text-accentRedFg p-2 rounded-lg hover:bg-accentRed/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Remove from tracker"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
