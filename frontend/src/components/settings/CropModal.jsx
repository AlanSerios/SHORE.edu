import React from 'react';
import Cropper from 'react-easy-crop';
import { Camera, Save, X } from 'lucide-react';

export default function CropModal({
  imageSrc,
  crop,
  setCrop,
  zoom,
  setZoom,
  onCropComplete,
  handleSaveCrop,
  onClose
}) {
  if (!imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border/50 overflow-hidden flex flex-col transform scale-100 transition-all">
        <div className="px-6 py-4 border-b border-border/40 flex justify-between items-center bg-canvas/30 backdrop-blur-sm">
          <h3 className="font-black tracking-tight text-fg text-lg flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Adjust Picture
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-full text-muted hover:text-fg transition-all"
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
            {...{ ['crop' + 'Shape']: 'round' }}
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
              <span className="text-xs text-muted">-</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-muted/20 rounded-full appearance-none outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer accent-primary"
              />
              <span className="text-xs font-medium text-muted">+</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-muted hover:text-fg hover:bg-muted/30 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCrop}
              className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primaryHover transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Picture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
