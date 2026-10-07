import React from 'react';
import { User, X } from 'lucide-react';
import AvatarBorder from '../AvatarBorder';

export default function CosmeticsCard({
  ownedBorders,
  borderInventory,
  equippedBorder,
  handleEquipBorder
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col">
      <h2 className="text-sm sm:text-base font-bold text-fg mb-0.5">Digital Cosmetics</h2>
      <p className="text-[11px] sm:text-xs text-muted mb-3 sm:mb-4">
        Equip avatar borders unlocked from the Rewards Shop.
      </p>

      {ownedBorders.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-4 sm:p-6 border-2 border-dashed border-border/60 rounded-xl bg-canvas/50">
          <p className="text-xs font-bold text-muted">No borders unlocked yet.</p>
          <p className="text-[11px] text-muted mt-0.5">Visit the Rewards Shop to unlock frames!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          <button
            onClick={() => handleEquipBorder(null)}
            className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              !equippedBorder
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border/60 bg-canvas hover:bg-slate-100'
            }`}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-400">
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span
              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                !equippedBorder ? 'text-primary' : 'text-muted'
              }`}
            >
              No Border
            </span>
          </button>

          {borderInventory
            .filter((b) => ownedBorders.includes(b.id))
            .map((border) => {
              const isActive = equippedBorder === border.id;

              return (
                <button
                  key={border.id}
                  onClick={() => handleEquipBorder(border.id)}
                  className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/60 bg-canvas hover:bg-slate-100'
                  }`}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center mb-0.5">
                    <AvatarBorder borderId={border.id}>
                      <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    </AvatarBorder>
                  </div>
                  <span
                    className={`text-[9px] sm:text-[10px] text-center font-bold uppercase tracking-wider truncate max-w-full ${
                      isActive ? 'text-primary' : 'text-muted'
                    }`}
                  >
                    {border.name}
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
