import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Calendar as CalendarIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';

const EVENT_TYPES = [
  { id: 'events', label: 'Events', color: 'bg-yellow-400 text-yellow-950' },
  { id: 'meeting', label: 'Meeting', color: 'bg-cyan-400 text-cyan-950' },
  { id: 'activities', label: 'Activities', color: 'bg-emerald-500 text-white' },
  { id: 'due', label: 'Due', color: 'bg-rose-500 text-white' },
  { id: 'online_post', label: 'Online Post', color: 'bg-orange-500 text-white' },
  { id: 'overdue', label: 'Overdue', color: 'bg-indigo-500 text-white' },
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
      title: modalTitle,
      date: format(modalDate, 'yyyy-MM-dd'),
      type: modalType,
      isHidden: modalHidden
    };
    if (modalEndDate) {
      newEvent.endDate = modalEndDate;
    }

    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      setEvents([...events, newEvent]);
      setShowModal(false);
    } catch (error) {
      console.error("Error saving event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Delete this event?')) return;
    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' });
      setEvents(events.filter(ev => ev.id !== id));
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !selectedEvent) return;

    setIsSubmitting(true);
    const updatedEvent = {
      ...selectedEvent,
      title: editTitle,
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

  const renderHeader = () => {
    return (
      <div className="flex flex-col mb-6 gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex bg-card border border-border rounded-lg overflow-hidden shadow-sm shrink-0">
              <button onClick={prevMonth} className="px-3 py-2 text-muted hover:bg-canvas transition-colors border-r border-border">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={jumpToToday} className="px-4 py-2 text-sm font-semibold text-fg hover:bg-canvas transition-colors">
                Today
              </button>
              <button onClick={nextMonth} className="px-3 py-2 text-muted hover:bg-canvas transition-colors border-l border-border">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-fg tracking-tight">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>
          {userRole === 'admin' && (
            <button 
              onClick={() => handleOpenModal(new Date())}
              className="bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" /> New Event
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-5 text-[11px] font-semibold text-muted bg-card px-4 py-2 rounded-lg border border-border w-fit shadow-sm">
          <span className="text-fg mr-1 uppercase tracking-wider text-[10px]">Legend:</span>
          {EVENT_TYPES.map(type => (
            <div key={type.id} className="flex items-center gap-1.5 hover:text-fg transition-colors">
              <div className={cn("w-2.5 h-2.5 rounded-full ring-1 ring-black/10", type.color.split(' ')[0])} />
              <span>{type.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    let startDate = startOfWeek(currentDate);

    for (let i = 0; i < 7; i++) {
      const currentDay = addDays(startDate, i);
      days.push(
        <div className="text-center font-semibold text-xs text-muted uppercase tracking-wider py-3" key={i}>
          <span className="hidden md:inline">{format(currentDay, "EEEE")}</span>
          <span className="md:hidden">{format(currentDay, "EEE")}</span>
        </div>
      );
    }

    return <div className="grid grid-cols-7 border-b border-border w-full">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

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
              "border-r border-border transition-colors hover:bg-canvas/50 p-2",
              !isCurrentMonth && "bg-canvas/40 opacity-60",
              isToday && "bg-accentGreen/5",
              userRole === 'admin' ? "cursor-pointer" : "cursor-default"
            )}
            key={cloneDay.toISOString()}
            onClick={() => { if (userRole === 'admin') handleOpenModal(cloneDay); }}
          >
            <span className={cn(
                "w-7 h-7 flex items-center justify-center text-sm font-semibold rounded-full",
                isToday ? "bg-primary text-white" : (isCurrentMonth ? "text-fg" : "text-muted")
              )}>
                {formattedDate}
            </span>
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
              "group flex items-center justify-start md:justify-between text-[9px] sm:text-[11.5px] font-semibold py-1 px-1.5 mx-1 cursor-pointer pointer-events-auto transition-transform hover:brightness-110 active:scale-[0.99] overflow-hidden",
              typeStyle.color,
              roundedLeft ? "rounded-l-md ml-1" : "rounded-l-none ml-0 border-l border-white/20",
              roundedRight ? "rounded-r-md mr-1" : "rounded-r-none mr-0 border-r border-white/20"
            )}
            style={{ 
              gridColumnStart: startCol,
              gridColumnEnd: `span ${span}`
            }}
            title={evt.title}
          >
            <span className="truncate">{evt.title}</span>
          </div>
        );
      });

      rows.push(
        <div className="relative min-h-[100px] sm:min-h-[120px] border-b border-border group/row" key={weekStartStr}>
          {/* Background Grid */}
          <div className="absolute inset-0 grid grid-cols-7">
            {bgCells}
          </div>

          {/* Events Grid Layer */}
          <div className="relative z-10 grid grid-cols-7 gap-y-1 grid-flow-row-dense pt-8 md:pt-10 pb-1 md:pb-2 pointer-events-none">
            {eventElements}
          </div>
        </div>
      );

      day = addDays(weekEnd, 1);
    }
    return <div className="border-l border-border bg-card">{rows}</div>;
  };

  return (
    <div className="flex flex-col h-full w-full bg-canvas p-4 md:p-8 overflow-hidden">
      {renderHeader()}
      
      <div className="bg-card border border-border rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="w-full flex-1 flex flex-col min-h-0">
            {renderDays()}
            <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 touch-pan-y">
              {renderCells()}
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border"
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold text-fg">Add Event</h3>
                <button onClick={() => setShowModal(false)} className="text-muted hover:text-fg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddEvent} className="p-6">
                <div className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-fg mb-1.5">Start Date</label>
                      <div className="w-full bg-canvas border border-border rounded-lg px-3 py-2.5 text-sm font-medium text-fg flex items-center gap-2 cursor-not-allowed opacity-80">
                        <CalendarIcon className="w-4 h-4 text-muted" />
                        {format(modalDate, 'MMMM d, yyyy')}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-fg mb-1.5">End Date (Optional)</label>
                      <input 
                        type="date"
                        value={modalEndDate}
                        min={format(modalDate, 'yyyy-MM-dd')}
                        onChange={(e) => setModalEndDate(e.target.value)}
                        className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-sm font-medium text-fg focus:outline-none focus:border-primary transition-colors h-[42px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-fg mb-1.5">Event Title</label>
                    <input 
                      type="text" 
                      autoFocus
                      required
                      value={modalTitle}
                      onChange={(e) => setModalTitle(e.target.value)}
                      placeholder="e.g., Math Final Exam"
                      className="w-full bg-canvas border border-border rounded-lg px-3 py-2.5 text-sm font-medium text-fg focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-fg mb-1.5">Event Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {EVENT_TYPES.map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setModalType(type.id)}
                          className={cn(
                            "px-3 py-2 border rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                            modalType === type.id 
                              ? "bg-card border-primary text-primary shadow-sm ring-1 ring-primary" 
                              : "bg-canvas border-border text-muted hover:border-borderHover hover:text-fg"
                          )}
                        >
                          <div className={cn("w-2 h-2 rounded-full", type.color.split(' ')[0])} />
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <input 
                      type="checkbox" 
                      id="hideAdd" 
                      checked={modalHidden}
                      onChange={(e) => setModalHidden(e.target.checked)}
                      className="w-4 h-4 text-primary bg-canvas border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <label htmlFor="hideAdd" className="text-sm font-medium text-fg cursor-pointer">
                      Hide from Students
                    </label>
                  </div>

                </div>

                <div className="mt-8 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-canvas hover:bg-border text-fg font-semibold py-2.5 rounded-lg transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || !modalTitle.trim()}
                    className="flex-1 bg-primary hover:bg-primaryHover text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Event"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Event Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-border"
            >
              <div className="px-6 py-4 border-b border-border flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn("w-3 h-3 rounded-full mt-1.5 flex-shrink-0", EVENT_TYPES.find(t => t.id === (isEditing ? editType : selectedEvent.type))?.color.split(' ')[0])} />
                  <h3 className="text-lg font-bold text-fg pr-4 leading-snug">
                    {isEditing ? "Edit Event" : selectedEvent.title}
                  </h3>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="text-muted hover:text-fg transition-colors flex-shrink-0 mt-0.5">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                {!isEditing ? (
                  <>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm text-fg">
                        <CalendarIcon className="w-4 h-4 text-muted" />
                        <span className="font-medium">
                          {format(parseISO(selectedEvent.date), 'MMM d, yyyy')}
                          {selectedEvent.endDate && selectedEvent.endDate !== selectedEvent.date && ` - ${format(parseISO(selectedEvent.endDate), 'MMM d, yyyy')}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-fg">
                        <div className="w-4 flex justify-center">
                          <div className="w-2 h-2 rounded-full bg-muted" />
                        </div>
                        <span className="font-medium capitalize">
                          {EVENT_TYPES.find(t => t.id === selectedEvent.type)?.label || 'Event'}
                        </span>
                      </div>
                    </div>

                    {userRole === 'admin' && (
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="flex-1 bg-canvas hover:bg-border text-fg font-semibold py-2.5 rounded-lg transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={(e) => handleDeleteEvent(selectedEvent.id, e)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <form onSubmit={handleUpdateEvent} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-fg mb-1.5">Start Date</label>
                        <input 
                          type="date"
                          required
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-sm font-medium text-fg focus:outline-none focus:border-primary transition-colors h-[42px]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-fg mb-1.5">End Date</label>
                        <input 
                          type="date"
                          value={editEndDate}
                          min={editDate}
                          onChange={(e) => setEditEndDate(e.target.value)}
                          className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-sm font-medium text-fg focus:outline-none focus:border-primary transition-colors h-[42px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-fg mb-1.5">Event Title</label>
                      <input 
                        type="text" 
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-canvas border border-border rounded-lg px-3 py-2.5 text-sm font-medium text-fg focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-fg mb-1.5">Event Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {EVENT_TYPES.map(type => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setEditType(type.id)}
                            className={cn(
                              "px-3 py-2 border rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                              editType === type.id 
                                ? "bg-card border-primary text-primary shadow-sm ring-1 ring-primary" 
                                : "bg-canvas border-border text-muted hover:border-borderHover hover:text-fg"
                            )}
                          >
                            <div className={cn("w-2 h-2 rounded-full", type.color.split(' ')[0])} />
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <input 
                        type="checkbox" 
                        id="hideEdit" 
                        checked={editHidden}
                        onChange={(e) => setEditHidden(e.target.checked)}
                        className="w-4 h-4 text-primary bg-canvas border-border rounded focus:ring-primary focus:ring-2"
                      />
                      <label htmlFor="hideEdit" className="text-sm font-medium text-fg cursor-pointer">
                        Hide from Students
                      </label>
                    </div>

                    <div className="mt-6 flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex-1 bg-canvas hover:bg-border text-fg font-semibold py-2.5 rounded-lg transition-colors text-sm"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmitting || !editTitle.trim()}
                        className="flex-1 bg-primary hover:bg-primaryHover text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                      >
                        {isSubmitting ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
