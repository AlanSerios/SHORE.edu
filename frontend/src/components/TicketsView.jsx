import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeBuoy, Plus, CheckCircle2, MessageSquare, Trash2, Send, Clock, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function TicketsView({ userEmail, userName, userRole }) {
  const [tickets, setTickets] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Bug');

  // Admin Reply State
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = () => {
    fetch('/api/tickets')
      .then(res => res.json())
      .then(data => {
        setTickets(data.tickets || []);
      })
      .catch(err => console.error("Failed to load tickets", err));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          authorEmail: userEmail,
          authorName: userName
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Ticket submitted successfully!');
        setShowForm(false);
        setTitle('');
        setDescription('');
        fetchTickets();
      } else {
        toast.error('Failed to submit ticket');
      }
    } catch (err) {
      toast.error('Network error');
    }
    setIsSubmitting(false);
  };

  const handleResolve = async (ticketId) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Ticket resolved');
        setReplyingTo(null);
        setReplyText('');
        fetchTickets();
      }
    } catch (err) {
      toast.error('Failed to resolve ticket');
    }
  };

  const handleDelete = async (ticketId) => {
    if (!window.confirm('Delete this ticket?')) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
      if ((await res.json()).success) {
        toast.success('Ticket deleted');
        fetchTickets();
      }
    } catch (err) {
      toast.error('Failed to delete ticket');
    }
  };

  const myTickets = userRole === 'admin' ? tickets : tickets.filter(t => t.authorEmail === userEmail);
  const openTickets = myTickets.filter(t => t.status === 'open');
  const resolvedTickets = myTickets.filter(t => t.status === 'resolved');

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-canvas p-6 rounded-3xl border border-border shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-fg flex items-center gap-2">
              <LifeBuoy className="w-6 h-6 text-primary" />
              Support & Ticketing
            </h1>
            <p className="text-sm text-muted mt-1">
              {userRole === 'admin' ? 'Manage and resolve user feedback and bug reports.' : 'Report bugs or submit feedback to the admins.'}
            </p>
          </div>
          {userRole !== 'admin' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Ticket
            </button>
          )}
        </div>

        {/* Create Ticket Form (Students) */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-border/50 shadow-sm space-y-4 mb-8">
                <h2 className="text-lg font-bold text-fg mb-4">Submit a Ticket</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted uppercase">Title</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="Brief description..."
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted uppercase">Category</label>
                    <select 
                      value={category} 
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    >
                      <option value="Bug">Bug Report</option>
                      <option value="Feedback">Feedback</option>
                      <option value="Question">Question</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted uppercase">Details</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-canvas border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                    placeholder="Provide more context..."
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm font-bold text-muted hover:text-fg transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-fg text-canvas font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-50">
                    {isSubmitting ? <span className="animate-pulse">Submitting...</span> : <><Send className="w-4 h-4" /> Submit</>}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tickets List */}
        <div className="space-y-6">
          {/* Open Tickets */}
          <div>
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Open Tickets ({openTickets.length})
            </h3>
            {openTickets.length === 0 ? (
              <div className="bg-canvas border border-dashed border-border/60 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-primary/40 mx-auto mb-2" />
                <p className="text-sm text-muted font-medium">No open tickets right now!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {openTickets.map(ticket => (
                  <TicketCard 
                    key={ticket.id} 
                    ticket={ticket} 
                    userRole={userRole} 
                    onDelete={() => handleDelete(ticket.id)}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    onResolve={() => handleResolve(ticket.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Resolved Tickets */}
          {resolvedTickets.length > 0 && (
            <div className="pt-8">
              <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Resolved Tickets ({resolvedTickets.length})
              </h3>
              <div className="grid gap-4 opacity-75">
                {resolvedTickets.map(ticket => (
                  <TicketCard 
                    key={ticket.id} 
                    ticket={ticket} 
                    userRole={userRole} 
                    onDelete={() => handleDelete(ticket.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket, userRole, onDelete, replyingTo, setReplyingTo, replyText, setReplyText, onResolve }) {
  const isResolved = ticket.status === 'resolved';
  
  return (
    <div className={`p-5 rounded-2xl border transition-all ${isResolved ? 'bg-canvas border-border/40' : 'bg-white border-border shadow-sm'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
              ticket.category === 'Bug' ? 'bg-red-50 text-red-600' :
              ticket.category === 'Feedback' ? 'bg-blue-50 text-blue-600' :
              'bg-purple-50 text-purple-600'
            }`}>
              {ticket.category}
            </span>
            <span className="text-xs text-muted/60">{new Date(ticket.timestamp).toLocaleString()}</span>
          </div>
          <h4 className="text-base font-bold text-fg">{ticket.title}</h4>
          <p className="text-sm text-muted mt-1">{ticket.description}</p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {userRole === 'admin' && (
            <button onClick={onDelete} className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {userRole === 'admin' && !isResolved && replyingTo !== ticket.id && (
            <button 
              onClick={() => { setReplyingTo(ticket.id); setReplyText(''); }}
              className="px-4 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors"
            >
              Reply & Resolve
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
        <div className="w-6 h-6 rounded-full bg-canvas border border-border flex items-center justify-center shrink-0">
          <UserIcon className="w-3 h-3 text-muted" />
        </div>
        <p className="text-xs text-muted font-medium">Reported by <span className="font-bold text-fg">{ticket.authorName}</span></p>
      </div>

      {isResolved && ticket.reply && (
        <div className="mt-4 bg-green-50/50 border border-green-100 rounded-xl p-4 flex gap-3">
          <MessageSquare className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-green-700 mb-0.5">Admin Reply</p>
            <p className="text-sm text-green-900/80">{ticket.reply}</p>
          </div>
        </div>
      )}

      {replyingTo === ticket.id && !isResolved && (
        <div className="mt-4 bg-canvas rounded-xl p-3 border border-border/60 animate-in fade-in slide-in-from-top-2">
          <textarea 
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={2}
            className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            placeholder="Type your reply..."
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setReplyingTo(null)} className="px-3 py-1.5 text-xs font-bold text-muted hover:text-fg">Cancel</button>
            <button onClick={onResolve} className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 shadow-sm">
              Mark Resolved
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
