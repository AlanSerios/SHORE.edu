import {
  LayoutDashboard, Megaphone, Calendar, LifeBuoy,
  ClipboardCheck, ShoppingBag, Target, Award,
  FileText, GraduationCap, Shield, Users
} from 'lucide-react';

/** Top-level nav items (always visible, no role filter needed here). */
export const TOP_NAV = [
  { id: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'announcements', icon: Megaphone,        label: 'Announcements' },
  { id: 'calendar',      icon: Calendar,         label: 'Calendar' },
  { id: 'tickets',       icon: LifeBuoy,         label: 'Support Tickets' },
];

/** Class tools nav items — filter by role before rendering. */
export const CLASS_TOOLS_NAV = [
  { id: 'attendance',   icon: ClipboardCheck, label: 'Attendance',   adminOnly: false },
  { id: 'shop',         icon: ShoppingBag,    label: 'Rewards Shop', adminOnly: false },
  { id: 'recitations',  icon: Target,         label: 'Recitations',  adminOnly: true  },
  { id: 'scholarships', icon: Award,          label: 'Scholarships', adminOnly: false },
  { id: 'reports',      icon: FileText,       label: 'Reports',      adminOnly: true  },
  { id: 'manageclass',  icon: GraduationCap,  label: 'Manage Class', adminOnly: true  },
  { id: 'manageteam',   icon: Shield,         label: 'Manage Team',  adminOnly: true  },
  { id: 'accounts',     icon: Users,          label: 'Accounts',     adminOnly: true  },
];

/**
 * Returns CLASS_TOOLS_NAV filtered for the given role.
 * ponytail: single filter replaces three separate arrays scattered across App.jsx
 */
export function getClassTools(userRole) {
  return CLASS_TOOLS_NAV.filter(i => !i.adminOnly || userRole === 'admin');
}
