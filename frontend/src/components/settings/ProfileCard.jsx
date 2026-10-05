import React from 'react';
import { Camera, User, QrCode, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import AvatarBorder from '../AvatarBorder';

export default function ProfileCard({
  userEmail,
  userRole,
  profilePicture,
  equippedBorder,
  fileInputRef,
  handleImageUpload,
  onOpenQR
}) {
  return (
    <>
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
            <h3 className="font-bold text-fg text-sm sm:text-lg truncate">
              {userRole === 'admin' ? 'Admin User' : (userEmail ? userEmail.split('@')[0] : '')}
            </h3>
            <p className="text-muted text-xs truncate mb-2 sm:mb-3">{userEmail}</p>
            <div className="bg-primary/10 text-[11px] font-bold px-3 py-0.5 sm:py-1 rounded-full text-primary uppercase tracking-wider inline-block border border-primary/20">
              {userRole} Account
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Pass Card */}
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
          onClick={onOpenQR}
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
    </>
  );
}
