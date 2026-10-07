import {
  LayoutDashboard, Megaphone, Calendar, LifeBuoy,
  ClipboardCheck, Target, FileText, Award, ShoppingBag,
  GraduationCap, Shield, Users
} from 'lucide-react';

/** Top-level nav items (always visible, no role filter needed here). */
export const TOP_NAV = [
  { id: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'announcements', icon: Megaphone,        label: 'Announcements' },
  { id: 'calendar',      icon: Calendar,         label: 'Calendar' },
  { id: 'tickets',       icon: LifeBuoy,         label: 'Support Tickets' },
];

/**
 * Academic / Classroom tools — ranked in order of importance:
 * 1. Attendance: Essential daily session check-in (starts every class).
 * 2. Recitations: In-class active student participation & grading during lessons.
 * 3. Reports: Student diagnostic analysis, grade records, & progress trackers.
 * 4. Scholarships: Financial aid directory, eligibility guidelines, & application tracking.
 * 5. Rewards Shop: Gamified point redemption and student incentives store.
 */
export const ACADEMIC_TOOLS_NAV = [
  { id: 'attendance',   icon: ClipboardCheck, label: 'Attendance',   adminOnly: false },
  { id: 'recitations',  icon: Target,         label: 'Recitations',  adminOnly: true  },
  { id: 'reports',      icon: FileText,       label: 'Reports',      adminOnly: true  },
  { id: 'scholarships', icon: Award,          label: 'Scholarships', adminOnly: false },
  { id: 'shop',         icon: ShoppingBag,    label: 'Rewards Shop', adminOnly: false },
];

/**
 * Administration / Account tools — ranked in order of operational importance:
 * 1. Manage Class: Classroom setup, student rosters, & tracker spreadsheet sync.
 * 2. Manage Team: Volunteer teachers, staff permissions, & team coordination.
 * 3. Accounts: User credentials, account roles, & security directory.
 */
export const ADMIN_TOOLS_NAV = [
  { id: 'manageclass', icon: GraduationCap, label: 'Manage Class', adminOnly: true },
  { id: 'manageteam',  icon: Shield,        label: 'Manage Team',  adminOnly: true },
  { id: 'accounts',    icon: Users,         label: 'Accounts',     adminOnly: true },
];

/** Combined list for backwards compatibility. */
export const CLASS_TOOLS_NAV = [...ACADEMIC_TOOLS_NAV, ...ADMIN_TOOLS_NAV];

export const ACADEMIC_TOOL_IDS = ACADEMIC_TOOLS_NAV.map(i => i.id);

export const ADMIN_TOOL_IDS = ADMIN_TOOLS_NAV.map(i => i.id);

export const ALL_TOOL_IDS = [...ACADEMIC_TOOL_IDS, ...ADMIN_TOOL_IDS];

/** Returns academic tools filtered for the given role. */
export function getAcademicTools(userRole) {
  return ACADEMIC_TOOLS_NAV.filter(i => !i.adminOnly || userRole === 'admin');
}

/** Returns admin/management tools filtered for the given role. */
export function getAdminTools(userRole) {
  return ADMIN_TOOLS_NAV.filter(i => !i.adminOnly || userRole === 'admin');
}

/** Legacy helper: returns combined list for the given role. */
export function getClassTools(userRole) {
  return CLASS_TOOLS_NAV.filter(i => !i.adminOnly || userRole === 'admin');
}
