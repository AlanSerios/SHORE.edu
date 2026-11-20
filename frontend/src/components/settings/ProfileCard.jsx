import React from 'react';
import { Camera, User } from 'lucide-react';
import AvatarBorder from '../AvatarBorder';

export default function ProfileCard({
  userEmail,
  userName,
  userRole,
  profilePicture,
  equippedBorder,
  fileInputRef,
  handleImageUpload
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
              {userName || (userEmail ? userEmail.split('@')[0] : userRole === 'admin' ? 'Admin User' : 'Student')}
            </h3>
            <p className="text-muted text-xs truncate mb-2 sm:mb-3">{userEmail}</p>
            <div className="bg-primary/10 text-[11px] font-bold px-3 py-0.5 sm:py-1 rounded-full text-primary uppercase tracking-wider inline-block border border-primary/20">
              {userRole} Account
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
