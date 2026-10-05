import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  MapPin,
  Pencil,
  Repeat2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { AUDIENCES, EVENT_TYPES, eventType, formatEventTime, isEventOverdue } from '../../utils/calendar';
import { cn } from '../../utils';

const EMPTY_FORM = {
  title: '',
  date: '',
  endDate: '',
  allDay: true,
  startTime: '09:00',
  endTime: '10:00',
  type: 'events',
  audience: 'all',
  location: '',
  notes: '',
  recurrenceFrequency: 'none',
  recurrenceUntil: '',
};

function formFromEvent(event, initialDate, initialTime) {
  if (!event) {
    const startMinutes = initialTime ? Number(initialTime.slice(0, 2)) * 60 + Number(initialTime.slice(3, 5)) : 540;
    const endMinutes = Math.min(1439, startMinutes + 60);
    return {
      ...EMPTY_FORM,
      date: initialDate || format(new Date(), 'yyyy-MM-dd'),
      allDay: !initialTime,
      startTime: initialTime || '09:00',
      endTime: `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`,
    };
  }
  return {
    title: event.title || '',
    date: event.seriesDate || event.date,
    endDate: event.seriesEndDate || event.endDate || '',
    allDay: event.allDay !== false,
    startTime: event.startTime || '09:00',
    endTime: event.endTime || '10:00',
    type: event.type || 'events',
    audience: event.audience || 'all',
    location: event.location || '',
    notes: event.notes || '',
    recurrenceFrequency: event.recurrence?.frequency || 'none',
    recurrenceUntil: event.recurrence?.until || '',
  };
}

export default function EventDrawer({
  isOpen,
  mode,
  setMode,
  event,
  initialDate,
  initialTime,
  canEdit,
  isBusy,
  onClose,
  onSave,
  onDelete,
  onComplete,
}) {
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isForm = mode === 'create' || mode === 'edit';

  useEffect(() => {
    if (!isOpen) return;
    setForm(formFromEvent(event, initialDate, initialTime));
    setConfirmDelete(false);
  }, [event, initialDate, initialTime, isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (!previousFocusRef.current) previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = keyEvent => {
      if (keyEvent.key === 'Escape' && !isBusy) {
        keyEvent.preventDefault();
        onClose();
        return;
      }
      if (keyEvent.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )].filter(element => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (keyEvent.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        keyEvent.preventDefault();
        last.focus();
      } else if (!keyEvent.shiftKey && document.activeElement === last) {
        keyEvent.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => {
      const initialFocus = isForm
        ? panelRef.current?.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
        : panelRef.current;
      initialFocus?.focus();
    });
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isBusy, isForm, isOpen, onClose]);

  const audienceLabel = useMemo(
    () => AUDIENCES.find(item => item.id === event?.audience)?.label || 'Everyone',
    [event?.audience],
  );

  const update = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const handleSubmit = submitEvent => {
    submitEvent.preventDefault();
    if (!form.title.trim()) return toast.error('Add an event title.');
    if (form.endDate && form.endDate < form.date) return toast.error('End date cannot be before the start date.');
    if (!form.allDay && (!form.startTime || !form.endTime)) return toast.error('Add a start and end time.');
    if (!form.allDay && (!form.endDate || form.endDate === form.date) && form.endTime <= form.startTime) {
      return toast.error('End time must be after the start time.');
    }
    if (form.recurrenceUntil && form.recurrenceUntil < form.date) return toast.error('Recurrence cannot end before the event starts.');

    onSave({
      title: form.title.trim(),
      date: form.date,
      endDate: form.endDate || null,
      allDay: form.allDay,
      startTime: form.allDay ? null : form.startTime,
      endTime: form.allDay ? null : form.endTime,
      type: form.type,
      audience: form.audience,
      location: form.location.trim(),
      notes: form.notes.trim(),
      recurrence: form.recurrenceFrequency === 'none'
        ? null
        : { frequency: form.recurrenceFrequency, until: form.recurrenceUntil || null },
      completedAt: event?.completedAt || null,
    });
  };

  const title = mode === 'create' ? 'New event' : mode === 'edit' ? 'Edit event series' : 'Event details';

  return createPortal((
    <AnimatePresence onExitComplete={() => {
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    }}>
      {isOpen && (
        <div className="fixed inset-0 z-[80]">
          <motion.button
            type="button"
            aria-label="Close event panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            onClick={onClose}
            className="absolute inset-0 h-full w-full bg-slate-950/45"
          />
          <motion.aside
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-drawer-title"
            initial={reduceMotion ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 36 }}
            className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-3xl border-t border-border bg-card shadow-2xl focus:outline-none md:inset-y-0 md:left-auto md:w-[460px] md:max-h-none md:rounded-none md:border-l md:border-t-0"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4 md:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Calendar</p>
                <h2 id="event-drawer-title" className="mt-0.5 text-lg font-bold text-fg">{title}</h2>
              </div>
              <button type="button" aria-label="Close" onClick={onClose} disabled={isBusy} className="grid h-11 w-11 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 md:px-6">
              {isForm ? (
                <form id="event-form" onSubmit={handleSubmit} className="space-y-5">
                  {mode === 'edit' && event?.recurrence && (
                    <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                      <Repeat2 className="mt-0.5 h-4 w-4 shrink-0" />
                      Changes apply to the entire recurring series.
                    </div>
                  )}

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-fg">Event title</span>
                    <input required maxLength={160} value={form.title} onChange={e => update('title', e.target.value)} placeholder="What is happening?" className="min-h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-fg outline-none transition-colors placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/15" />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-fg">Start date</span>
                      <input type="date" required value={form.date} onChange={e => update('date', e.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-fg">End date</span>
                      <input type="date" min={form.date} value={form.endDate} onChange={e => update('endDate', e.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                    </label>
                  </div>

                  <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-border px-3.5">
                    <span className="text-sm font-semibold text-fg">All-day event</span>
                    <input type="checkbox" checked={form.allDay} onChange={e => update('allDay', e.target.checked)} className="h-5 w-5 rounded border-border text-primary focus:ring-primary" />
                  </label>

                  {!form.allDay && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-fg">Starts</span>
                        <input type="time" required value={form.startTime} onChange={e => update('startTime', e.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-fg">Ends</span>
                        <input type="time" required value={form.endTime} onChange={e => update('endTime', e.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                      </label>
                    </div>
                  )}

                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-fg">Category</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {EVENT_TYPES.map(type => (
                        <button key={type.id} type="button" aria-pressed={form.type === type.id} onClick={() => update('type', type.id)} className={cn('flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', form.type === type.id ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted hover:bg-canvas hover:text-fg')}>
                          <span className={cn('h-2.5 w-2.5 rounded-full', type.dot)} /> {type.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-fg">Audience</span>
                    <select value={form.audience} onChange={e => update('audience', e.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
                      {AUDIENCES.map(audience => <option key={audience.id} value={audience.id}>{audience.label}</option>)}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-fg">Repeats</span>
                      <select value={form.recurrenceFrequency} onChange={e => update('recurrenceFrequency', e.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
                        <option value="none">Does not repeat</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>
                    {form.recurrenceFrequency !== 'none' && (
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-fg">Repeats until</span>
                        <input type="date" min={form.date} value={form.recurrenceUntil} onChange={e => update('recurrenceUntil', e.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                      </label>
                    )}
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-fg">Location <span className="font-normal text-muted">(optional)</span></span>
                    <input maxLength={160} value={form.location} onChange={e => update('location', e.target.value)} placeholder="Room, venue, or link" className="min-h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-fg outline-none placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/15" />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-fg">Notes <span className="font-normal text-muted">(optional)</span></span>
                    <textarea maxLength={2000} rows={4} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Add context or instructions" className="w-full resize-y rounded-xl border border-border bg-white px-3.5 py-3 text-sm text-fg outline-none placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/15" />
                  </label>
                </form>
              ) : event ? (
                <div className="space-y-6">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold', eventType(event).chip)}>
                        <span className={cn('h-2 w-2 rounded-full', eventType(event).dot)} /> {eventType(event).label}
                      </span>
                      {isEventOverdue(event) && <span className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">Overdue</span>}
                      {event.completedAt && <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800"><Check className="h-3 w-3" /> Completed</span>}
                    </div>
                    <h3 className="text-2xl font-bold leading-tight text-fg">{event.title}</h3>
                  </div>

                  <dl className="space-y-4 text-sm">
                    <div className="flex gap-3"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><dt className="font-semibold text-fg">Date</dt><dd className="mt-0.5 text-muted">{format(parseISO(event.date), 'EEEE, MMMM d, yyyy')}{event.endDate ? ` – ${format(parseISO(event.endDate), 'MMMM d, yyyy')}` : ''}</dd></div></div>
                    <div className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><dt className="font-semibold text-fg">Time</dt><dd className="mt-0.5 text-muted">{formatEventTime(event)}</dd></div></div>
                    <div className="flex gap-3"><Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><dt className="font-semibold text-fg">Audience</dt><dd className="mt-0.5 text-muted">{audienceLabel}</dd></div></div>
                    {event.location && <div className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><dt className="font-semibold text-fg">Location</dt><dd className="mt-0.5 whitespace-pre-wrap text-muted">{event.location}</dd></div></div>}
                    {event.recurrence && <div className="flex gap-3"><Repeat2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><dt className="font-semibold text-fg">Repeats</dt><dd className="mt-0.5 capitalize text-muted">{event.recurrence.frequency}{event.recurrence.until ? ` until ${format(parseISO(event.recurrence.until), 'MMMM d, yyyy')}` : ''}</dd></div></div>}
                  </dl>

                  {event.notes && <div className="rounded-2xl border border-border bg-canvas p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">Notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg">{event.notes}</p></div>}

                  {confirmDelete && (
                    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <p className="font-semibold text-rose-900">Delete this {event.recurrence ? 'recurring series' : 'event'}?</p>
                      <p className="mt-1 text-sm text-rose-700">This cannot be undone and recipients will receive a cancellation alert.</p>
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-10 rounded-xl border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-800">Keep event</button>
                        <button type="button" onClick={onDelete} disabled={isBusy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rose-600 px-3 text-sm font-bold text-white disabled:opacity-60">{isBusy && <Loader2 className="h-4 w-4 animate-spin" />} Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <footer className="border-t border-border bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pb-4">
              {isForm ? (
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={mode === 'edit' ? () => setMode('details') : onClose} disabled={isBusy} className="min-h-11 rounded-xl px-4 text-sm font-bold text-muted transition-colors hover:bg-canvas hover:text-fg">Cancel</button>
                  <button type="submit" form="event-form" disabled={isBusy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primaryHover disabled:opacity-60">
                    {isBusy && <Loader2 className="h-4 w-4 animate-spin" />} {mode === 'create' ? 'Create event' : 'Save changes'}
                  </button>
                </div>
              ) : event && canEdit ? (
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => setConfirmDelete(true)} disabled={isBusy || confirmDelete} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Delete</button>
                  <div className="flex gap-2">
                    {event.type === 'due' && !event.completedAt && <button type="button" onClick={onComplete} disabled={isBusy} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold text-fg transition-colors hover:bg-canvas"><Check className="h-4 w-4 text-emerald-600" /> Complete</button>}
                    <button type="button" onClick={() => setMode('edit')} disabled={isBusy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primaryHover"><Pencil className="h-4 w-4" /> Edit</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={onClose} className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-bold text-white">Close</button>
              )}
            </footer>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  ), document.body);
}

