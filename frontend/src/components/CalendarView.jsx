import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, format, isSameDay, isSameMonth,
  parseISO, subMonths, subWeeks,
} from 'date-fns';
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Filter, List, Loader2,
  MapPin, Plus, RefreshCw, Repeat2, SlidersHorizontal, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils';
import {
  AUDIENCES, EVENT_TYPES, dateKey, eventOccursOn, eventType, expandRecurringEvents,
  formatEventTime, getCalendarRange, groupEventsByDate, isEventOverdue,
  normalizeCalendarEvent,
} from '../utils/calendar';
import EventDrawer from './calendar/EventDrawer';

const VIEW_OPTIONS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'agenda', label: 'Agenda' },
];

const HOURS = Array.from({ length: 24 }, (_, index) => index);

const TIMELINE_HEIGHT = 1152;

function initialView() {
  const query = new URLSearchParams(window.location.search).get('calendarView');

  if (VIEW_OPTIONS.some(option => option.id === query)) return query;

  return window.matchMedia('(max-width: 767px)').matches ? 'agenda' : 'month';
}

function initialDate() {
  const query = new URLSearchParams(window.location.search).get('calendarDate');

  if (query && /^\d{4}-\d{2}-\d{2}$/.test(query)) return parseISO(query);

  return new Date();
}

function EventChip({ event, onOpen, compact = false, className, style }) {
  const type = eventType(event);
  const overdue = isEventOverdue(event);

  return (
    <button
      type="button"
      onClick={clickEvent => { clickEvent.stopPropagation(); onOpen(event); }}
      className={cn(
        'group flex min-w-0 items-center gap-1.5 rounded-lg border border-l-[3px] text-left font-semibold shadow-sm transition-[background-color,border-color,transform] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        type.chip, type.accent,
        compact ? 'h-6 px-1.5 text-[11px]' : 'min-h-9 px-2.5 py-1.5 text-xs',
        event.completedAt && 'opacity-60',
        overdue && 'border-rose-300 bg-rose-50 text-rose-900',
        className,
      )}
      style={style}
      title={event.title}
      data-event-chip="true"
    >
      {event.recurrence && <Repeat2 aria-hidden="true" className="h-3 w-3 shrink-0 opacity-70" />}
      {event.completedAt && <Check aria-hidden="true" className="h-3 w-3 shrink-0" />}
      <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', type.dot)} />
      <span className="truncate">{event.title}</span>
    </button>
  );
}

function EmptySchedule({ filtered, onReset }) {
  return (
    <div className="grid min-h-56 place-items-center px-6 py-10 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-border bg-white text-muted"><CalendarDays className="h-5 w-5" /></div>
        <h3 className="font-bold text-fg">{filtered ? 'No matching events' : 'Nothing scheduled'}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{filtered ? 'Adjust the category filters to see more of the calendar.' : 'This date range is clear. New events will appear here.'}</p>
        {filtered && <button type="button" onClick={onReset} className="mt-4 min-h-10 rounded-xl border border-border px-4 text-sm font-bold text-primary hover:bg-canvas">Show all categories</button>}
      </div>
    </div>
  );
}

function AgendaEvent({ event, onOpen }) {
  const type = eventType(event);
  const audience = AUDIENCES.find(item => item.id === event.audience)?.label || 'Everyone';

  return (
    <button type="button" onClick={() => onOpen(event)} className="group flex w-full gap-3 rounded-2xl border border-border bg-white p-3.5 text-left shadow-sm transition-[border-color,box-shadow] hover:border-borderHover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <span className={cn('mt-1 h-9 w-1 shrink-0 rounded-full', type.dot)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div><p className="font-bold leading-snug text-fg group-hover:text-primary">{event.title}</p><p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted"><Clock3 className="h-3.5 w-3.5" /> {formatEventTime(event)}</p></div>
          <span className={cn('shrink-0 rounded-lg border px-2 py-1 text-[11px] font-bold', type.chip)}>{type.label}</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{audience}</span>
            {event.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{event.location}</span></span>}
            {event.recurrence && <span className="inline-flex items-center gap-1 capitalize"><Repeat2 className="h-3.5 w-3.5" />{event.recurrence.frequency}</span>}
            {isEventOverdue(event) && <span className="font-bold text-rose-600">Overdue</span>}
            {event.completedAt && <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><Check className="h-3.5 w-3.5" />Completed</span>}
        </div>
      </div>
    </button>
  );
}

function DayEventList({ day, events, onOpen, canEdit, onCreate, emptyLabel = 'No events on this day.' }) {
  const dayEvents = events.filter(event => eventOccursOn(event, day));

  if (!dayEvents.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-7 text-center">
        <p className="text-sm text-muted">{emptyLabel}</p>
        {canEdit && <button type="button" onClick={() => onCreate(day)} className="mt-2 text-sm font-bold text-primary hover:underline">Add an event</button>}
      </div>
    );
  }

  return <div className="space-y-2">{dayEvents.map(event => <AgendaEvent key={event.occurrenceId} event={event} onOpen={onOpen} />)}</div>;
}

function MonthMobile({ focusedDate, selectedDate, setSelectedDate, events, onOpen, canEdit, onCreate }) {
  const days = eachDayOfInterval(getCalendarRange('month', focusedDate));

  return (
    <div className="md:hidden">
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-border bg-canvas/70">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <div key={`${label}-${index}`} className="py-2 text-center text-[11px] font-bold text-muted">{label}</div>)}
        </div>
        <div className="grid grid-cols-7 p-1.5">
          {days.map(day => {
            const dayEvents = events.filter(event => eventOccursOn(event, day));
            const selected = isSameDay(day, selectedDate);
            const today = isSameDay(day, new Date());

            return (
              <button key={dateKey(day)} type="button" aria-label={`${format(day, 'MMMM d')}, ${dayEvents.length} events`} aria-pressed={selected} onClick={() => setSelectedDate(day)} className={cn('flex min-h-12 flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', !isSameMonth(day, focusedDate) && 'text-slate-400', selected ? 'bg-primary text-white' : today ? 'bg-primary/10 text-primary' : 'text-fg hover:bg-canvas')}>
                <span>{format(day, 'd')}</span>
                <span className="mt-1 flex h-1.5 gap-0.5" aria-hidden="true">{dayEvents.slice(0, 3).map(event => <span key={event.occurrenceId} className={cn('h-1.5 w-1.5 rounded-full', selected ? 'bg-white' : eventType(event).dot)} />)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <section className="mt-5" aria-labelledby="selected-day-title">
        <div className="mb-3 flex items-center justify-between">
          <div><p className="text-xs font-bold uppercase tracking-wider text-primary">Selected day</p><h3 id="selected-day-title" className="mt-0.5 text-lg font-bold text-fg">{format(selectedDate, 'EEEE, MMMM d')}</h3></div>
          {canEdit && <button type="button" onClick={() => onCreate(selectedDate)} className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white" aria-label={`Add event on ${format(selectedDate, 'MMMM d')}`}><Plus className="h-5 w-5" /></button>}
        </div>
        <DayEventList day={selectedDate} events={events} onOpen={onOpen} canEdit={canEdit} onCreate={onCreate} />
      </section>
    </div>
  );
}

function packWeekSegments(weekStart, events) {
  const weekEnd = addDays(weekStart, 6);
  const startKey = dateKey(weekStart);
  const endKey = dateKey(weekEnd);
  const lanes = [];
  const hidden = Array(7).fill(0);

  const segments = events
    .filter(event => event.date <= endKey && (event.endDate || event.date) >= startKey)
    .map(event => {
      const segmentStart = event.date < startKey ? startKey : event.date;
      const segmentEnd = (event.endDate || event.date) > endKey ? endKey : (event.endDate || event.date);
      const startCol = Math.max(0, Math.round((parseISO(segmentStart) - weekStart) / 86400000));
      const endCol = Math.min(6, Math.round((parseISO(segmentEnd) - weekStart) / 86400000));

      return { event, startCol, endCol };
    })
    .sort((a, b) => a.startCol - b.startCol || b.endCol - a.endCol);

  const placed = segments.map(segment => {
    let lane = lanes.findIndex(lastEnd => lastEnd < segment.startCol);

    if (lane < 0) lane = lanes.length;
    lanes[lane] = segment.endCol;

    if (lane >= 2) for (let day = segment.startCol; day <= segment.endCol; day += 1) hidden[day] += 1;

    return { ...segment, lane };
  });

  return { segments: placed, hidden };
}

function MonthDesktop({ focusedDate, events, onOpen, canEdit, onCreate, onMore }) {
  const days = eachDayOfInterval(getCalendarRange('month', focusedDate));
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => days.slice(index * 7, index * 7 + 7));

  return (
    <div className="hidden h-full min-h-0 flex-col overflow-y-auto rounded-2xl border border-border bg-white shadow-sm md:flex">
      <div className="sticky top-0 z-30 grid shrink-0 grid-cols-7 border-b border-border bg-canvas/95 backdrop-blur-sm">
        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => <div key={day} className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-muted">{day}</div>)}
      </div>
      <div className="grid flex-1" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(112px, 1fr))`, minHeight: weeks.length * 112 }}>
        {weeks.map(week => {
          const { segments, hidden } = packWeekSegments(week[0], events);

          return (
            <div key={dateKey(week[0])} className="relative min-h-[112px] border-b border-border last:border-b-0">
              <div className="absolute inset-0 grid grid-cols-7">
                {week.map((day, index) => {
                  const today = isSameDay(day, new Date());

                  return (
                    <div key={dateKey(day)} className={cn('relative border-r border-border last:border-r-0', !isSameMonth(day, focusedDate) && 'bg-canvas/50')}>
                      <button type="button" onClick={() => canEdit && onCreate(day)} aria-label={`${format(day, 'EEEE, MMMM d')}${canEdit ? ', add event' : ''}`} className={cn('h-full w-full p-2 text-left align-top transition-colors focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary', canEdit && 'hover:bg-blue-50/40')}>
                        <span data-month-date={dateKey(day)} className={cn('absolute left-2 top-2 z-20 inline-grid h-7 min-w-7 place-items-center rounded-lg px-1 text-sm font-bold tabular-nums', today ? 'bg-primary text-white' : isSameMonth(day, focusedDate) ? 'text-fg' : 'text-slate-400')}>{format(day, 'd')}</span>
                      </button>
                      {hidden[index] > 0 && <button type="button" onClick={() => onMore(day)} className="absolute bottom-0.5 left-2 z-20 text-[11px] font-bold text-primary hover:underline">+{hidden[index]} more</button>}
                    </div>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-10 z-10 grid grid-cols-7 grid-rows-2 gap-y-1 px-0.5">
                {segments.filter(segment => segment.lane < 2).map(segment => <EventChip key={`${segment.event.occurrenceId}-${segment.startCol}`} event={segment.event} onOpen={onOpen} compact className="pointer-events-auto mx-0.5" style={{ gridColumn: `${segment.startCol + 1} / span ${segment.endCol - segment.startCol + 1}`, gridRow: segment.lane + 1 }} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function layoutTimedEvents(events) {
  const columnEnds = [];

  const placed = events.slice().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map(event => {
    const start = Number(event.startTime.slice(0, 2)) * 60 + Number(event.startTime.slice(3));
    const end = Number(event.endTime.slice(0, 2)) * 60 + Number(event.endTime.slice(3));
    let column = columnEnds.findIndex(columnEnd => columnEnd <= start);

    if (column < 0) column = columnEnds.length;
    columnEnds[column] = end;

    return { event, start, end, column };
  });

  return placed.map(item => ({ ...item, columnCount: Math.max(1, columnEnds.length) }));
}

function WeekDesktop({ focusedDate, events, onOpen, canEdit, onCreate }) {
  const days = eachDayOfInterval(getCalendarRange('week', focusedDate));
  const allDayEvents = events.filter(event => event.allDay || event.endDate);

  return (
    <div className="hidden h-full min-h-0 overflow-auto rounded-2xl border border-border bg-white shadow-sm xl:block">
      <div className="min-w-[900px]">
        <div className="sticky top-0 z-30 grid grid-cols-[64px_repeat(7,minmax(110px,1fr))] border-b border-border bg-white">
          <div className="border-r border-border" />
          {days.map(day => <div key={dateKey(day)} className="border-r border-border px-2 py-3 text-center last:border-r-0"><p className="text-[11px] font-bold uppercase tracking-wider text-muted">{format(day, 'EEE')}</p><p className={cn('mx-auto mt-1 grid h-8 w-8 place-items-center rounded-lg text-sm font-bold', isSameDay(day, new Date()) ? 'bg-primary text-white' : 'text-fg')}>{format(day, 'd')}</p></div>)}
        </div>
        <div className="grid grid-cols-[64px_repeat(7,minmax(110px,1fr))] border-b border-border bg-canvas/40">
          <div className="border-r border-border p-2 text-right text-[11px] font-bold text-muted">All day</div>
          {days.map(day => <div key={dateKey(day)} className="relative min-h-14 space-y-1 border-r border-border p-1 last:border-r-0">{canEdit && <button type="button" onClick={() => onCreate(day)} className="absolute inset-0 z-0 w-full hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" aria-label={`Add all-day event on ${format(day, 'MMMM d')}`} />}{allDayEvents.filter(event => eventOccursOn(event, day)).slice(0, 2).map(event => <EventChip key={event.occurrenceId} event={event} onOpen={onOpen} compact className="pointer-events-auto relative z-10 w-full" />)}</div>)}
        </div>
        <div className="grid grid-cols-[64px_repeat(7,minmax(110px,1fr))]">
          <div className="relative border-r border-border" style={{ height: TIMELINE_HEIGHT }}>{HOURS.map(hour => <span key={hour} className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-muted" style={{ top: hour * 48 }}>{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</span>)}</div>
          {days.map(day => {
            const timed = layoutTimedEvents(events.filter(event => !event.allDay && !event.endDate && event.date === dateKey(day)));

            return (
              <div key={dateKey(day)} className="relative border-r border-border last:border-r-0" style={{ height: TIMELINE_HEIGHT }}>
                {canEdit && <button type="button" aria-label={`Add timed event on ${format(day, 'MMMM d')}`} onClick={click => { const bounds = click.currentTarget.getBoundingClientRect(); const minutes = Math.max(0, Math.min(1410, Math.round(((click.clientY - bounds.top) / bounds.height * 1440) / 30) * 30)); onCreate(day, `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`); }} className="absolute inset-0 z-0 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" />}
                {HOURS.map(hour => <div key={hour} className="pointer-events-none absolute inset-x-0 border-t border-slate-100" style={{ top: hour * 48 }} />)}
                {timed.map(({ event, start, end, column, columnCount }) => <EventChip key={event.occurrenceId} event={event} onOpen={onOpen} className="absolute z-10 overflow-hidden px-1.5 py-1" style={{ top: start / 1440 * TIMELINE_HEIGHT + 2, height: Math.max(30, (end - start) / 1440 * TIMELINE_HEIGHT - 3), left: `calc(${column / columnCount * 100}% + 3px)`, width: `calc(${100 / columnCount}% - 6px)` }} />)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekMobile({ focusedDate, selectedDate, setSelectedDate, events, onOpen, canEdit, onCreate }) {
  const days = eachDayOfInterval(getCalendarRange('week', focusedDate));

  return (
    <div className="xl:hidden">
      <div className="grid grid-cols-7 gap-1 rounded-2xl border border-border bg-white p-2 shadow-sm">
        {days.map(day => { const count = events.filter(event => eventOccursOn(event, day)).length; const selected = isSameDay(day, selectedDate);

 return <button key={dateKey(day)} type="button" onClick={() => setSelectedDate(day)} aria-pressed={selected} className={cn('flex min-h-14 flex-col items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', selected ? 'bg-primary text-white' : 'hover:bg-canvas')}><span className={cn('text-[10px] font-bold uppercase', selected ? 'text-white/75' : 'text-muted')}>{format(day, 'EEE')}</span><span className="mt-0.5 text-sm font-bold">{format(day, 'd')}</span>{count > 0 && <span className={cn('mt-1 h-1.5 w-1.5 rounded-full', selected ? 'bg-white' : 'bg-primary')} />}</button>; })}
      </div>
      <section className="mt-5"><h3 className="mb-3 text-lg font-bold text-fg">{format(selectedDate, 'EEEE, MMMM d')}</h3><DayEventList day={selectedDate} events={events} onOpen={onOpen} canEdit={canEdit} onCreate={onCreate} /></section>
    </div>
  );
}

function AgendaView({ events, onOpen, filtered, onReset }) {
  const groups = groupEventsByDate(events);
  const dates = Object.keys(groups).sort();

  if (!dates.length) return <EmptySchedule filtered={filtered} onReset={onReset} />;

  return <div className="space-y-7 pb-4">{dates.map(date => <section key={date} className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]" aria-labelledby={`agenda-${date}`}><div><p className="text-xs font-bold uppercase tracking-wider text-primary">{isSameDay(parseISO(date), new Date()) ? 'Today' : format(parseISO(date), 'EEEE')}</p><h3 id={`agenda-${date}`} className="mt-0.5 font-bold text-fg">{format(parseISO(date), 'MMMM d, yyyy')}</h3></div><div className="space-y-2">{groups[date].map(event => <AgendaEvent key={event.occurrenceId} event={event} onOpen={onOpen} />)}</div></section>)}</div>;
}

function UpcomingRail({ events, onOpen }) {
  const todayKey = dateKey(new Date());

  return (
    <aside className="hidden w-72 shrink-0 2xl:block" aria-labelledby="upcoming-title">
      <div className="sticky top-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Next 14 days</p><h2 id="upcoming-title" className="mt-0.5 font-bold text-fg">Upcoming</h2></div><List className="h-5 w-5 text-muted" /></div>
        {events.length ? <div className="space-y-2.5">{events.slice(0, 6).map(event => <button key={event.occurrenceId} type="button" onClick={() => onOpen(event)} className="w-full rounded-xl border border-border p-3 text-left transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><div className="flex items-center gap-2"><span className={cn('h-2 w-2 rounded-full', eventType(event).dot)} /><span className="text-[11px] font-bold uppercase tracking-wide text-muted">{event.date < todayKey && (event.endDate || event.date) >= todayKey ? 'Ongoing' : format(parseISO(event.date), 'MMM d')}</span></div><p className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-fg">{event.title}</p><p className="mt-1 text-xs text-muted">{formatEventTime(event)}</p></button>)}</div> : <p className="rounded-xl bg-canvas p-4 text-sm text-muted">No upcoming events.</p>}
      </div>
    </aside>
  );
}

let cachedCalendarEvents = null;

export default function CalendarView({ userRole = 'student' }) {
  const [view, setView] = useState(initialView);
  const [focusedDate, setFocusedDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [events, setEvents] = useState(() => cachedCalendarEvents || []);
  const [activeTypes, setActiveTypes] = useState(() => new Set(EVENT_TYPES.map(type => type.id)));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(() => !cachedCalendarEvents);
  const [loadError, setLoadError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('details');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [createDate, setCreateDate] = useState(dateKey(new Date()));
  const [createTime, setCreateTime] = useState(null);
  const filterRef = useRef(null);
  const canEdit = userRole === 'admin' || userRole === 'volunteer';

  const fetchEvents = useCallback(async () => {
    if (!cachedCalendarEvents) setLoading(true);
    setLoadError('');

    try {
      const response = await fetch('/api/events');
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Unable to load events.');
      const normalized = (data.events || []).map(normalizeCalendarEvent);
      cachedCalendarEvents = normalized;
      setEvents(normalized);
    } catch (error) {
      console.error('Failed to fetch calendar events', error);

      if (!cachedCalendarEvents) setLoadError(error.message || 'We could not load the calendar.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { const url = new URL(window.location.href); url.searchParams.set('calendarView', view); url.searchParams.set('calendarDate', dateKey(focusedDate)); window.history.replaceState({}, '', url); }, [focusedDate, view]);
  useEffect(() => { const close = event => { if (filterRef.current && !filterRef.current.contains(event.target)) setFiltersOpen(false); };

 document.addEventListener('pointerdown', close);

 return () => document.removeEventListener('pointerdown', close); }, []);

  const range = useMemo(() => getCalendarRange(view, focusedDate), [focusedDate, view]);

  const visibleOccurrences = useMemo(
    () => expandRecurringEvents(events, range.start, range.end).filter(event => activeTypes.has(event.type)),
    [activeTypes, events, range.end, range.start]
  );

  const upcomingEvents = useMemo(() => {
    const start = new Date();

    return expandRecurringEvents(events, start, addDays(start, 13))
      .filter(event => activeTypes.has(event.type))
      .slice(0, 6);
  }, [activeTypes, events]);

  const hasFilters = activeTypes.size !== EVENT_TYPES.length;

  const changePeriod = direction => {
    const next = view === 'month' ? (direction > 0 ? addMonths(focusedDate, 1) : subMonths(focusedDate, 1)) : view === 'week' ? (direction > 0 ? addWeeks(focusedDate, 1) : subWeeks(focusedDate, 1)) : addDays(focusedDate, direction * 30);
    setFocusedDate(next);
    setSelectedDate(next);
  };

  const jumpToToday = () => {
    const now = new Date();
    setFocusedDate(now);
    setSelectedDate(now);
  };

  const openCreate = (day = new Date(), time = null) => {
    setSelectedEvent(null);
    setCreateDate(dateKey(day));
    setCreateTime(time);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const openDetails = event => {
    setSelectedEvent(event);
    setDrawerMode('details');
    setDrawerOpen(true);
  };

  const resetFilters = () => setActiveTypes(new Set(EVENT_TYPES.map(type => type.id)));

  const toggleType = type => setActiveTypes(current => {
    const next = new Set(current);

    if (next.has(type)) next.delete(type);
    else next.add(type);

    return next;
  });

  const saveEvent = async payload => {
    setIsBusy(true);

    try {
      const isEditing = drawerMode === 'edit';
      const id = selectedEvent?.seriesId || selectedEvent?.id;
      const response = await fetch(isEditing ? `/api/events/${id}` : '/api/events', { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Unable to save the event.');
      const saved = normalizeCalendarEvent(data.event);
      setEvents(current => {
        const next = isEditing ? current.map(event => event.id === saved.id ? saved : event) : [...current, saved];
        cachedCalendarEvents = next;

        return next;
      });
      toast.success(isEditing ? 'Event series updated.' : 'Event created.'); setDrawerOpen(false);
    } catch (error) { toast.error(error.message || 'Unable to save the event.'); } finally { setIsBusy(false); }
  };

  const deleteEvent = async () => {
    const id = selectedEvent?.seriesId || selectedEvent?.id; setIsBusy(true);

    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Unable to delete the event.');
      setEvents(current => {
        const next = current.filter(event => event.id !== id);
        cachedCalendarEvents = next;

        return next;
      });
      toast.success('Event cancelled.'); setDrawerOpen(false);
    } catch (error) { toast.error(error.message || 'Unable to delete the event.'); } finally { setIsBusy(false); }
  };

  const completeEvent = async () => {
    const id = selectedEvent?.seriesId || selectedEvent?.id; setIsBusy(true);

    try {
      const response = await fetch(`/api/events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completedAt: new Date().toISOString() }) });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Unable to complete the deadline.');
      const saved = normalizeCalendarEvent(data.event);
      setEvents(current => {
        const next = current.map(event => event.id === saved.id ? saved : event);
        cachedCalendarEvents = next;

        return next;
      });
      toast.success('Deadline marked complete.'); setDrawerOpen(false);
    } catch (error) { toast.error(error.message || 'Unable to complete the deadline.'); } finally { setIsBusy(false); }
  };

  const periodTitle = view === 'month' ? format(focusedDate, 'MMMM yyyy') : view === 'week' ? `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}` : `From ${format(focusedDate, 'MMMM d, yyyy')}`;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-canvas px-4 pt-[max(1.25rem,calc(0.75rem+env(safe-area-inset-top,0px)))] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:overflow-hidden md:px-6 md:pb-6 md:pt-5 lg:px-8 overscroll-contain">
      <header className="mb-4 shrink-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-baseline gap-2.5"><h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{periodTitle}</h1><span className="text-sm font-semibold text-muted">{visibleOccurrences.length} in view</span></div></div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              <button type="button" onClick={() => changePeriod(-1)} aria-label="Previous period" className="grid h-11 w-11 place-items-center border-r border-border text-muted transition-colors hover:bg-canvas hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={jumpToToday} className="h-11 px-4 text-sm font-bold text-fg transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">Today</button>
              <button type="button" onClick={() => changePeriod(1)} aria-label="Next period" className="grid h-11 w-11 place-items-center border-l border-border text-muted transition-colors hover:bg-canvas hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><ChevronRight className="h-4 w-4" /></button>
            </div>
            {canEdit && <button type="button" onClick={() => openCreate(new Date())} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><Plus className="h-4 w-4" /> New event</button>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-xl border border-border bg-white p-1 shadow-sm" aria-label="Calendar view">{VIEW_OPTIONS.map(option => <button key={option.id} type="button" aria-pressed={view === option.id} onClick={() => setView(option.id)} className={cn('min-h-11 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:min-h-9', view === option.id ? 'bg-primary text-white' : 'text-muted hover:bg-canvas hover:text-fg')}>{option.label}</button>)}</div>
          <div className="relative" ref={filterRef}>
            <button type="button" aria-expanded={filtersOpen} aria-haspopup="dialog" onClick={() => setFiltersOpen(open => !open)} className={cn('inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-3.5 text-sm font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', hasFilters ? 'border-primary text-primary' : 'border-border text-fg hover:bg-canvas')}><Filter className="h-4 w-4" /> Categories {hasFilters && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] text-white">{activeTypes.size}</span>}</button>
            {filtersOpen && <div role="dialog" aria-label="Filter event categories" className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-border bg-white p-3 shadow-xl"><div className="mb-2 flex items-center justify-between px-1"><p className="text-sm font-bold text-fg">Show categories</p><SlidersHorizontal className="h-4 w-4 text-muted" /></div><div className="space-y-1">{EVENT_TYPES.map(type => <label key={type.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2.5 hover:bg-canvas"><input type="checkbox" checked={activeTypes.has(type.id)} onChange={() => toggleType(type.id)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" /><span className={cn('h-2.5 w-2.5 rounded-full', type.dot)} /><span className="text-sm font-semibold text-fg">{type.label}</span></label>)}</div>{hasFilters && <button type="button" onClick={resetFilters} className="mt-2 min-h-11 w-full rounded-xl text-sm font-bold text-primary hover:bg-primary/5">Reset filters</button>}</div>}
          </div>
        </div>
      </header>

      {loading ? <div className="grid flex-1 place-items-center" role="status" aria-live="polite"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /><p className="mt-3 text-sm font-semibold text-muted">Loading calendar…</p></div></div>
        : loadError ? <div className="grid flex-1 place-items-center px-6 text-center" role="alert"><div className="max-w-sm"><CalendarDays className="mx-auto h-10 w-10 text-rose-500" /><h2 className="mt-3 text-xl font-bold text-fg">Calendar unavailable</h2><p className="mt-2 text-sm text-muted">{loadError}</p><button type="button" onClick={fetchEvents} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" /> Try again</button></div></div>
          : <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="flex min-h-0 flex-1 gap-5"><main className="min-w-0 flex-1 md:min-h-0">{view === 'month' && <><MonthMobile focusedDate={focusedDate} selectedDate={selectedDate} setSelectedDate={setSelectedDate} events={visibleOccurrences} onOpen={openDetails} canEdit={canEdit} onCreate={openCreate} /><MonthDesktop focusedDate={focusedDate} events={visibleOccurrences} onOpen={openDetails} canEdit={canEdit} onCreate={openCreate} onMore={day => { setFocusedDate(day); setSelectedDate(day); setView('agenda'); }} /></>}{view === 'week' && <><WeekMobile focusedDate={focusedDate} selectedDate={selectedDate} setSelectedDate={setSelectedDate} events={visibleOccurrences} onOpen={openDetails} canEdit={canEdit} onCreate={openCreate} /><WeekDesktop focusedDate={focusedDate} events={visibleOccurrences} onOpen={openDetails} canEdit={canEdit} onCreate={openCreate} /></>}{view === 'agenda' && <div className="h-full overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6"><AgendaView events={visibleOccurrences} onOpen={openDetails} filtered={hasFilters} onReset={resetFilters} /></div>}</main>{view !== 'agenda' && <UpcomingRail events={upcomingEvents} onOpen={openDetails} />}</motion.div>}

      <EventDrawer isOpen={drawerOpen} mode={drawerMode} setMode={setDrawerMode} event={selectedEvent} initialDate={createDate} initialTime={createTime} canEdit={canEdit} isBusy={isBusy} onClose={() => !isBusy && setDrawerOpen(false)} onSave={saveEvent} onDelete={deleteEvent} onComplete={completeEvent} />
    </div>
  );
}

