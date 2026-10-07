import assert from 'node:assert/strict';
import { parseISO } from 'date-fns';
import {
  expandRecurringEvents,
  isEventOverdue,
  normalizeCalendarEvent,
} from '../src/utils/calendar.js';

const legacy = normalizeCalendarEvent({ title: 'Legacy', date: '2026-10-04', type: 'overdue', isHidden: true });

assert.equal(legacy.type, 'due');

assert.equal(legacy.audience, 'staff');

assert.equal(legacy.allDay, true);

const monthly = expandRecurringEvents([{
  id: 'month-end', title: 'Month end', date: '2028-01-31', type: 'events',
  recurrence: { frequency: 'monthly', until: '2028-03-31' },
}], parseISO('2028-01-01'), parseISO('2028-03-31'));

assert.deepEqual(monthly.map(event => event.date), ['2028-01-31', '2028-02-29', '2028-03-31']);

const weekly = expandRecurringEvents([{
  id: 'weekly', title: 'Weekly', date: '2026-10-04', endDate: '2026-10-05', type: 'activities',
  recurrence: { frequency: 'weekly', until: '2026-10-18' },
}], parseISO('2026-10-01'), parseISO('2026-10-31'));

assert.equal(weekly.length, 3);

assert.equal(weekly[1].endDate, '2026-10-12');

assert.equal(isEventOverdue({ type: 'due', date: '2026-10-03', allDay: true }, new Date('2026-10-04T04:00:00Z')), true);

assert.equal(isEventOverdue({ type: 'due', date: '2026-10-03', allDay: true, completedAt: '2026-10-03T01:00:00Z' }, new Date('2026-10-04T04:00:00Z')), false);

console.log('Calendar recurrence, normalization, and overdue checks passed.');

