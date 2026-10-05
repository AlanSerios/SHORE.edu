import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export const CALENDAR_TIMEZONE = 'Asia/Manila';

export const EVENT_TYPES = [
  { id: 'events', label: 'Event', dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-800 border-blue-200', accent: 'border-l-blue-500' },
  { id: 'meeting', label: 'Meeting', dot: 'bg-cyan-500', chip: 'bg-cyan-50 text-cyan-900 border-cyan-200', accent: 'border-l-cyan-500' },
  { id: 'activities', label: 'Activity', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-900 border-emerald-200', accent: 'border-l-emerald-500' },
  { id: 'due', label: 'Deadline', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-900 border-rose-200', accent: 'border-l-rose-500' },
  { id: 'online_post', label: 'Online Post', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-950 border-amber-200', accent: 'border-l-amber-500' },
];

export const AUDIENCES = [
  { id: 'all', label: 'Everyone' },
  { id: 'students', label: 'Students' },
  { id: 'volunteers', label: 'Volunteers' },
  { id: 'staff', label: 'Staff only' },
];

export function dateKey(value) {
  if (typeof value === 'string') return value.slice(0, 10);
  return format(value, 'yyyy-MM-dd');
}

export function normalizeCalendarEvent(raw = {}) {
  const type = raw.type === 'overdue' ? 'due' : raw.type;
  const allDay = raw.allDay === undefined ? true : Boolean(raw.allDay);
  return {
    ...raw,
    type: EVENT_TYPES.some(item => item.id === type) ? type : 'events',
    audience: AUDIENCES.some(item => item.id === raw.audience)
      ? raw.audience
      : raw.isHidden ? 'staff' : 'all',
    allDay,
    startTime: allDay ? null : raw.startTime || null,
    endTime: allDay ? null : raw.endTime || null,
    endDate: raw.endDate || null,
    location: raw.location || '',
    notes: raw.notes || '',
    timezone: CALENDAR_TIMEZONE,
    recurrence: raw.recurrence?.frequency === 'weekly' || raw.recurrence?.frequency === 'monthly'
      ? { frequency: raw.recurrence.frequency, until: raw.recurrence.until || null }
      : null,
    completedAt: raw.completedAt || null,
  };
}

function clampedMonthDate(baseDate, monthOffset) {
  const targetMonth = baseDate.getMonth() + monthOffset;
  const year = baseDate.getFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(baseDate.getDate(), lastDay));
}

function occurrenceOverlaps(start, end, rangeStart, rangeEnd) {
  return !isBefore(end, rangeStart) && !isAfter(start, rangeEnd);
}

export function expandRecurringEvents(rawEvents, rangeStart, rangeEnd) {
  const results = [];
  const safeStart = parseISO(`${dateKey(rangeStart)}T00:00:00`);
  const safeEnd = parseISO(`${dateKey(rangeEnd)}T23:59:59`);

  rawEvents.map(normalizeCalendarEvent).forEach(event => {
    if (!event.date) return;
    const baseStart = parseISO(`${event.date}T00:00:00`);
    const baseEnd = parseISO(`${event.endDate || event.date}T00:00:00`);
    const durationDays = Math.max(0, differenceInCalendarDays(baseEnd, baseStart));

    const pushOccurrence = start => {
      const end = addDays(start, durationDays);
      if (!occurrenceOverlaps(start, end, safeStart, safeEnd)) return;
      const occurrenceDate = dateKey(start);
      results.push({
        ...event,
        seriesId: event.id,
        occurrenceId: `${event.id}:${occurrenceDate}`,
        date: occurrenceDate,
        endDate: durationDays ? dateKey(end) : null,
        isRecurringOccurrence: Boolean(event.recurrence),
        seriesDate: event.date,
        seriesEndDate: event.endDate,
      });
    };

    if (!event.recurrence) {
      pushOccurrence(baseStart);
      return;
    }

    const until = event.recurrence.until
      ? parseISO(`${event.recurrence.until}T23:59:59`)
      : safeEnd;
    const hardEnd = isBefore(until, safeEnd) ? until : safeEnd;
    let index = 0;
    let occurrenceStart = baseStart;
    while (!isAfter(occurrenceStart, hardEnd) && index < 600) {
      pushOccurrence(occurrenceStart);
      index += 1;
      occurrenceStart = event.recurrence.frequency === 'weekly'
        ? addWeeks(baseStart, index)
        : clampedMonthDate(baseStart, index);
    }
  });

  return results.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    if ((a.startTime || '') !== (b.startTime || '')) return (a.startTime || '').localeCompare(b.startTime || '');
    return a.title.localeCompare(b.title);
  });
}

export function getCalendarRange(view, focusedDate) {
  if (view === 'month') {
    return {
      start: startOfWeek(startOfMonth(focusedDate)),
      end: endOfWeek(endOfMonth(focusedDate)),
    };
  }
  if (view === 'week') {
    return { start: startOfWeek(focusedDate), end: endOfWeek(focusedDate) };
  }
  return { start: focusedDate, end: addDays(focusedDate, 89) };
}

export function eventOccursOn(event, day) {
  const key = dateKey(day);
  return event.date <= key && (event.endDate || event.date) >= key;
}

export function groupEventsByDate(events) {
  return events.reduce((groups, event) => {
    const key = event.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
    return groups;
  }, {});
}

function manilaNowKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CALENDAR_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function isEventOverdue(event, now = new Date()) {
  if (event.type !== 'due' || event.completedAt) return false;
  const deadline = `${event.endDate || event.date}T${event.allDay ? '23:59' : event.endTime || '23:59'}`;
  return deadline < manilaNowKey(now);
}

export function formatEventTime(event) {
  if (event.allDay) return 'All day';
  const formatTime = value => {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
      .format(new Date(2000, 0, 1, Number(value.slice(0, 2)), Number(value.slice(3, 5))));
  };
  return `${formatTime(event.startTime)}–${formatTime(event.endTime)}`;
}

export function eventType(event) {
  return EVENT_TYPES.find(item => item.id === event.type) || EVENT_TYPES[0];
}

