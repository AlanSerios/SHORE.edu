import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, parseISO, differenceInDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Calendar as CalendarIcon, Clock, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';

const EVENT_TYPES = [
  { id: 'events', label: 'Events', color: 'bg-amber-400 text-amber-950 border-amber-500/40', badge: 'bg-amber-400' },
  { id: 'meeting', label: 'Meeting', color: 'bg-cyan-500 text-white border-cyan-600/40', badge: 'bg-cyan-500' },
  { id: 'activities', label: 'Activities', color: 'bg-emerald-500 text-white border-emerald-600/40', badge: 'bg-emerald-500' },
  { id: 'due', label: 'Due / Deadline', color: 'bg-rose-500 text-white border-rose-600/40', badge: 'bg-rose-500' },
  { id: 'online_post', label: 'Online Post', color: 'bg-orange-500 text-white border-orange-600/40', badge: 'bg-orange-500' },
  { id: 'overdue', label: 'Overdue', color: 'bg-indigo-600 text-white border-indigo-700/40', badge: 'bg-indigo-600' },
];

export default function CalendarView({ userRole = 'admin' }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // Modal form state
  const [modalDate, setModalDate] = useState(new Date());
  const [modalEndDate, setModalEndDate] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState('events');
  const [modalHidden, setModalHidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Details Modal state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editType, setEditType] = useState('events');
  const [editHidden, setEditHidden] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (e) {
      console.error('Failed to fetch events', e);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const jumpToToday = () => setCurrentDate(new Date());

  const handleOpenModal = (date = new Date()) => {
    setModalDate(date);
    setModalEndDate('');
    setModalTitle('');
    setModalType('events');
    setModalHidden(false);
    setShowModal(true);
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    setIsSubmitting(true);
    const newEvent = {
      id: uuidv4(),
      title: modalTitle.trim(),
      date: format(modalDate, 'yyyy-MM-dd'),
      type: modalType,
      isHidden: modalHidden
    };
    if (modalEndDate) {
      newEvent.endDate = modalEndDate;
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      if (res.ok) {
        setEvents([...events, newEvent]);
        setShowModal(false);
        setModalTitle('');
        setModalEndDate('');
      }
    } catch (error) {
      console.error("Error creating event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
      setEvents(events.filter(e => e.id !== eventId));
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    setIsSubmitting(true);
    const updatedEvent = {
      ...selectedEvent,
      title: editTitle.trim(),
      date: editDate,
      type: editType,
      isHidden: editHidden
    };
    
    if (editEndDate) {
      updatedEvent.endDate = editEndDate;
    } else {
      delete updatedEvent.endDate;
    }

    try {
      await fetch(`/api/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent)
      });
      
      setEvents(events.map(ev => ev.id === selectedEvent.id ? updatedEvent : ev));
      setSelectedEvent(updatedEvent);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  // Count number of weeks in current view
  let weekCount = 0;
  let tempDay = startDate;
  while (tempDay <= endDate) {
    weekCount++;
    tempDay = addDays(tempDay, 7);
  }

  const renderHeader = () => {
    return (
      <div className="flex flex-col mb-4 gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex bg-card border border-border rounded-xl overflow-hidden shadow-2xs shrink-0">
              <button onClick={prevMonth} className="px-3 py-2 text-muted hover:bg-canvas hover:text-fg transition-colors border-r border-border">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={jumpToToday} className="px-3.5 py-2 text-xs sm:text-sm font-bold text-fg hover:bg-canvas transition-colors">
                Today
              </button>
              <button onClick={nextMonth} className="px-3 py-2 text-muted hover:bg-canvas hover:text-fg transition-colors border-l border-border">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-fg tracking-tight">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-primary/20">
              {events.length} Event{events.length === 1 ? '' : 's'}
            </span>
          </div>

          {userRole === 'admin' && (
            <button 
              onClick={() => handleOpenModal(new Date())}
              className="bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-primary/25 active:scale-95 w-full sm:w-auto shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Event</span>
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-[11px] font-semibold text-muted bg-card px-3.5 py-2 rounded-xl border border-border w-fit shadow-2xs">
          <span className="text-fg font-bold uppercase tracking-wider text-[10px]">Legend:</span>
          {EVENT_TYPES.map(type => (
            <div key={type.id} className="flex items-center gap-1.5 hover:text-fg transition-colors">
              <div className={cn("w-2.5 h-2.5 rounded-full ring-1 ring-black/10", type.badge)} />
              <span>{type.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    let startDayOfWeek = startOfWeek(currentDate);

    for (let i = 0; i < 7; i++) {
      const currentDay = addDays(startDayOfWeek, i);
      days.push(
        <div className="text-center font-bold text-xs text-muted uppercase tracking-wider py-2.5" key={i}>
          <span className="hidden sm:inline">{format(currentDay, "EEEE")}</span>
          <span className="sm:hidden">{format(currentDay, "EEE")}</span>
        </div>
      );
    }

    return <div className="grid grid-cols-7 border-b border-border w-full bg-card/80 shrink-0">{days}</div>;
  };

  const renderCells = () => {
    const rows = [];
    let day = startDate;

    while (day <= endDate) {
      const weekStart = day;
      const weekEnd = addDays(weekStart, 6);
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

      // 1. Generate Background Cells
      const bgCells = [];
      for (let i = 0; i < 7; i++) {
        const cloneDay = addDays(weekStart, i);
        const formattedDate = format(cloneDay, "d");
        const isToday = isSameDay(cloneDay, new Date());
        const isCurrentMonth = isSameMonth(cloneDay, monthStart);
        
        bgCells.push(
          <div
            className={cn(
              "border-r border-border h-full transition-colors hover:bg-canvas/50 p-1.5 sm:p-2 flex flex-col justify-between",
              !isCurrentMonth && "bg-canvas/40 opacity-55",
              isToday && "bg-primary/5 ring-1 ring-inset ring-primary/20",
              userRole === 'admin' ? "cursor-pointer" : "cursor-default"
            )}
            key={cloneDay.toISOString()}
            onClick={() => { if (userRole === 'admin') handleOpenModal(cloneDay); }}
          >
            <div className="flex items-center justify-between">
              <span className={cn(
                  "w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs sm:text-sm font-bold rounded-full transition-all",
                  isToday ? "bg-primary text-white shadow-xs" : (isCurrentMonth ? "text-fg" : "text-muted")
                )}>
                  {formattedDate}
              </span>
              {userRole === 'admin' && (
                <span className="opacity-0 group-hover/row:opacity-40 hover:!opacity-100 text-[10px] text-primary font-bold">
                  +
                </span>
              )}
            </div>
          </div>
        );
      }

      // 2. Calculate Events for this week
      const weekEvents = events.filter(e => {
        if (userRole === 'student' && e.isHidden) return false;
        const eStart = e.date;
        const eEnd = e.endDate || e.date;
        return eStart <= weekEndStr && eEnd >= weekStartStr;
      });

      // Sort to ensure consistent placement
      weekEvents.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const aEnd = a.endDate || a.date;
        const bEnd = b.endDate || b.date;
        if (aEnd !== bEnd) return bEnd.localeCompare(aEnd);
        return a.title.localeCompare(b.title);
      });

      // 3. Render Events Grid
      const eventElements = weekEvents.map(evt => {
        const eStart = evt.date;
        const eEnd = evt.endDate || evt.date;
        
        let startCol = 1;
        let endCol = 7;
        for (let i = 0; i < 7; i++) {
           const colDateStr = format(addDays(weekStart, i), 'yyyy-MM-dd');
           if (colDateStr === eStart) startCol = i + 1;
           if (colDateStr === eEnd) endCol = i + 1;
        }
        if (eStart < weekStartStr) startCol = 1;
        if (eEnd > weekEndStr) endCol = 7;
        const span = endCol - startCol + 1;

        const typeStyle = EVENT_TYPES.find(t => t.id === evt.type) || EVENT_TYPES[0];
        const roundedLeft = eStart >= weekStartStr;
        const roundedRight = eEnd <= weekEndStr;
        const isMultiDay = eStart !== eEnd;

        return (
          <div 
            key={evt.id}
            onClick={(e) => { 
              e.stopPropagation(); 
              setSelectedEvent(evt); 
              setEditTitle(evt.title);
              setEditDate(evt.date);
              setEditEndDate(evt.endDate || '');
              setEditType(evt.type);
              setEditHidden(evt.isHidden || false);
              setIsEditing(false);
              setShowDetailsModal(true); 
            }}
            className={cn(
              "group flex items-center justify-start text-[10px] sm:text-[11.5px] font-bold py-1 px-2 mx-0.5 cursor-pointer pointer-events-auto transition-all hover:brightness-105 active:scale-[0.99] overflow-hidden border shadow-2xs",
              typeStyle.color,
              roundedLeft ? "rounded-l-lg ml-1" : "rounded-l-none ml-0 border-l-0",
              roundedRight ? "rounded-r-lg mr-1" : "rounded-r-none mr-0 border-r-0"
            )}
            style={{ 
              gridColumnStart: startCol,
              gridColumnEnd: `span ${span}`
            }}
            title={evt.title}
          >
            {evt.isHidden && <EyeOff className="w-3 h-3 mr-1 shrink-0 opacity-75" />}
            <span className="truncate">{evt.title}</span>
          </div>
        );
      });

      rows.push(
        <div className="relative flex-1 min-h-[95px] border-b border-border group/row overflow-hidden" key={weekStartStr}>
          {/* Background Grid */}
          <div className="absolute inset-0 grid grid-cols-7 h-full">
            {bgCells}
          </div>

          {/* Events Grid Layer */}
          <div className="relative z-10 grid grid-cols-7 gap-y-1 grid-flow-row-dense pt-8 sm:pt-9 pb-1 pointer-events-none">
            {eventElements}
          </div>
        </div>
      );

      day = addDays(weekEnd, 1);
    }
    return (
      <div 
        className={cn(
          "border-l border-border bg-card flex flex-col h-full w-full",
          weekCount === 5 ? "grid grid-rows-5" : (weekCount === 6 ? "grid grid-rows-6" : "grid grid-rows-4")
        )}
      >
        {rows}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-canvas p-3 sm:p-6 lg:p-8 overflow-hidden">
      {renderHeader()}
      
      <div className="bg-card border border-border rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
        {renderDays()}
        <div className="flex-1 w-full h-full min-h-0 overflow-hidden">
          {renderCells()}
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border"
            >
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-base font-bold text-fg flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" /> Add Calendar Event
                </h3>
                <button onClick={() => setShowModal(false)} className="text-muted hover:text-fg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddEvent} className="p-5">
                <div className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-fg mb-1">Start Date</label>
                      <div className="w-full bg-canvas border border-border rounded-xl px-3 py-2 text-xs font-semibold text-fg flex items-center gap-2 cursor-not-allowed opacity-85">
                        <CalendarIcon className="w-3.5 h-3.5 text-muted" />
                        {format(modalDate, 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-fg mb-1">End Date (Optional)</label>
                      <input 
                        type="date"
                        value={modalEndDate}
                        min={format(modalDate, 'yyyy-MM-dd')}
                        onChange={(e) => setModalEndDate(e.target.value)}
                        className="w-full bg-canvas border border-border rounded-xl px-3 py-2 text-xs font-semibold text-fg focus:outline-none focus:border-primary transition-colors h-[38px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-fg mb-1">Event Title</label>
                    <input 
                      type="text" 
                      autoFocus
                      required
                      value={modalTitle}
                      onChange={(e) => setModalTitle(e.target.value)}
                      placeholder="e.g., General Assembly & Scholarship Shortlisting"
                      className="w-full bg-canvas border border-border rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-fg focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-fg mb-1.5">Event Category</label>
                    <div className="grid grid-cols-2 gap-2">
                      {EVENT_TYPES.map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setModalType(type.id)}
                          className={cn(
                            "px-2.5 py-1.5 border rounded-xl text-xs font-bold flex items-center justify-start gap-2 transition-all",
                            modalType === type.id 
                              ? "bg-primary/10 border-primary text-primary shadow-xs" 
                              : "bg-canvas border-border text-muted hover:border-borderHover hover:text-fg"
                          )}
                        >
                          <div className={cn("w-2 h-2 rounded-full", type.badge)} />
                          <span>{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input 
                      type="checkbox"
                      id="modalHidden"
                      checked={modalHidden}
                      onChange={(e) => setModalHidden(e.target.checked)}
                      className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                    />
                    <label htmlFor="modalHidden" className="text-xs font-medium text-fg cursor-pointer">
                      Admin/Volunteer Only (Hidden from Students)
                    </label>
                  </div>

                </div>

                <div className="mt-6 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-bold text-muted hover:text-fg hover:bg-canvas rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primaryHover text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm shadow-primary/25 active:scale-95 transition-all"
                  >
                    {isSubmitting ? 'Saving...' : 'Add Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Details / Edit Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border"
            >
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-base font-bold text-fg">
                  {isEditing ? 'Edit Event' : 'Event Details'}
                </h3>
                <button onClick={() => setShowDetailsModal(false)} className="text-muted hover:text-fg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5">
                {isEditing ? (
                  <form onSubmit={handleUpdateEvent} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-fg mb-1">Event Title</label>
                      <input 
                        type="text" 
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-canvas border border-border rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-fg focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-fg mb-1">Start Date</label>
                        <input 
                          type="date"
                          required
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full bg-canvas border border-border rounded-xl px-3 py-2 text-xs font-semibold text-fg focus:outline-none focus:border-primary h-[38px]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-fg mb-1">End Date</label>
                        <input 
                          type="date"
                          value={editEndDate}
                          min={editDate}
                          onChange={(e) => setEditEndDate(e.target.value)}
                          className="w-full bg-canvas border border-border rounded-xl px-3 py-2 text-xs font-semibold text-fg focus:outline-none focus:border-primary h-[38px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-fg mb-1.5">Event Category</label>
                      <div className="grid grid-cols-2 gap-2">
                        {EVENT_TYPES.map(type => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setEditType(type.id)}
                            className={cn(
                              "px-2.5 py-1.5 border rounded-xl text-xs font-bold flex items-center justify-start gap-2 transition-all",
                              editType === type.id 
                                ? "bg-primary/10 border-primary text-primary shadow-xs" 
                                : "bg-canvas border-border text-muted hover:border-borderHover hover:text-fg"
                            )}
                          >
                            <div className={cn("w-2 h-2 rounded-full", type.badge)} />
                            <span>{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input 
                        type="checkbox"
                        id="editHidden"
                        checked={editHidden}
                        onChange={(e) => setEditHidden(e.target.checked)}
                        className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                      />
                      <label htmlFor="editHidden" className="text-xs font-medium text-fg cursor-pointer">
                        Admin/Volunteer Only (Hidden from Students)
                      </label>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 text-xs font-bold text-muted hover:text-fg hover:bg-canvas rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-primary hover:bg-primaryHover text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm shadow-primary/25 active:scale-95 transition-all"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Title</span>
                      <h2 className="text-lg font-black text-fg mt-0.5">{selectedEvent.title}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Date</span>
                        <p className="text-xs font-bold text-fg mt-0.5">
                          {selectedEvent.endDate 
                            ? `${selectedEvent.date} → ${selectedEvent.endDate}`
                            : selectedEvent.date}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Category</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={cn("w-2.5 h-2.5 rounded-full", (EVENT_TYPES.find(t => t.id === selectedEvent.type) || EVENT_TYPES[0]).badge)} />
                          <span className="text-xs font-bold capitalize text-fg">
                            {(EVENT_TYPES.find(t => t.id === selectedEvent.type) || EVENT_TYPES[0]).label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedEvent.isHidden && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-semibold flex items-center gap-2">
                        <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Hidden from student accounts</span>
                      </div>
                    )}

                    {userRole === 'admin' && (
                      <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(selectedEvent.id)}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="bg-primary hover:bg-primaryHover text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          Edit Event
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
