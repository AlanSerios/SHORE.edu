import React from 'react';
import { Upload } from 'lucide-react';
import RosterManager from './RosterManager';

export default function ManageClassView({ onUploadTracker, trackerFile }) {
  return (
    <RosterManager
      title="Manage Class"
      description="Enroll students for SHORE registration and publish their diagnostic scores."
      rosterKey="students"
      role="student"
      person="student"
      heading="Student Roster"
      actions={onUploadTracker && (
        <button type="button" onClick={onUploadTracker} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-fg hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Upload aria-hidden="true" className="h-4 w-4" />{trackerFile ? 'Update Scores' : 'Import Scores'}
        </button>
      )}
    >
      <p>Student registration and diagnostic scores are managed separately.</p>
    </RosterManager>
  );
}
