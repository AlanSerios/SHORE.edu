import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';

export default function EditTrackedModal({
  isOpen,
  editingTrackedItem,
  setEditingTrackedItem,
  onSave,
  onClose
}) {
  if (!isOpen || !editingTrackedItem) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pb-28 sm:pb-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
              onClick={onClose}
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
                  className="text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
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
                      className="text-muted hover:text-red-500 p-1.5 cursor-pointer"
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
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-fg hover:bg-canvas font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primaryHover text-white font-bold text-xs shadow-sm cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
