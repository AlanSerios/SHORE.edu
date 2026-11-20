import React from 'react';
import RosterManager from './RosterManager';

export default function ManageTeamView() {
  return (
    <RosterManager
      title="Manage Team"
      description="Approve volunteers for registration and see who has joined SHORE."
      rosterKey="volunteers"
      role="volunteer"
      person="volunteer"
      heading="Volunteer Roster"
    >
      <p>Student enrollment is in <a href="#manageclass" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">Manage Class</a>.</p>
    </RosterManager>
  );
}
