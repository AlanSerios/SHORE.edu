import React, { useState, useEffect } from 'react';
import { Award, Plus, Trash2, Search, Target, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils';

export default function RecitationsAdminView() {
  const [recitations, setRecitations] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recRes, stuRes] = await Promise.all([
        fetch('/api/recitations'),
        fetch('/api/users')
      ]);
      const recData = await recRes.json();
      const stuData = await stuRes.json();
      
      setRecitations((recData.recitations || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      setStudents(stuData.users.filter(u => u.role === 'student'));
      setLoading(false);
    } catch {
      toast.error("Failed to load recitations data.");
      setLoading(false);
    }
  };

  const handleAddRecitation = async () => {
    if (!selectedStudent || !score) {
      toast.error("Student and Score are required.");
      return;
    }

    const newRec = {
      studentEmail: selectedStudent,
      score: Number(score),
      notes: notes.trim()
    };

    try {
      const res = await fetch('/api/recitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRec)
      });
      if (res.ok) {
        toast.success("Recitation recorded!");
        setSelectedStudent('');
        setScore('');
        setNotes('');
        setIsAdding(false);
        fetchData();
      }
    } catch {
      toast.error("Failed to record recitation.");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/recitations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Record deleted.");
        fetchData();
      }
    } catch {
      toast.error("Failed to delete record.");
    }
  };

  const getStudentName = (email) => {
    const student = students.find(s => s.email === email);
    return student ? student.name || student.email.split('@')[0] : email;
  };

  const filteredRecitations = recitations.filter(r => 
    getStudentName(r.studentEmail || r.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="p-8">Loading recitations...</div>;

  return (
    <div className="h-full overflow-y-auto bg-canvas pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-border/50 text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-5 shadow-sm">
              <Award className="w-3 h-3" />
              Teacher Interface
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-fg mb-2">Oral Recitations</h1>
            <p className="text-sm text-muted">Grade and record student performance in oral recitations.</p>
          </div>
          
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
          >
            <Plus className={cn("w-4 h-4 transition-transform", isAdding && "rotate-45")} />
            {isAdding ? "Cancel" : "Record Score"}
          </button>
        </div>

        {/* Add Form */}
        {isAdding && (
          <div className="bg-white rounded-3xl border border-border/60 shadow-xl overflow-hidden p-6 sm:p-8 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-lg font-bold text-fg mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              New Recitation Entry
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Select Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-canvas/30 text-sm focus:outline-none focus:border-primary/50"
                >
                  <option value="">-- Choose a Student --</option>
                  {students.map(s => (
                    <option key={s.email} value={s.email}>{s.name || s.email.split('@')[0]}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Points Awarded</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setScore(2)}
                    className={cn(
                      "flex-1 h-11 rounded-xl border text-sm font-bold transition-all",
                      score === 2 ? "bg-primary border-primary text-white shadow-md shadow-primary/20" : "bg-canvas/30 border-border text-fg hover:border-primary/50"
                    )}
                  >
                    +2 Points
                  </button>
                  <button
                    onClick={() => setScore(5)}
                    className={cn(
                      "flex-1 h-11 rounded-xl border text-sm font-bold transition-all",
                      score === 5 ? "bg-primary border-primary text-white shadow-md shadow-primary/20" : "bg-canvas/30 border-border text-fg hover:border-primary/50"
                    )}
                  >
                    +5 Points
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Feedback / Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Great job explaining the concept..."
                className="w-full h-11 px-4 rounded-xl border border-border bg-canvas/30 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleAddRecitation}
                className="px-8 py-2.5 bg-fg text-canvas text-sm font-bold rounded-xl hover:bg-fg/90 transition-all flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Save Record
              </button>
            </div>
          </div>
        )}

        {/* Records Table */}
        <div className="bg-white rounded-3xl border border-border/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border/40 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-lg text-fg">Recent Records</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input 
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-full border border-border bg-canvas/30 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-canvas/50 text-xs text-muted uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredRecitations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-muted">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecitations.map((rec) => (
                    <tr key={rec.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(rec.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-fg">
                        {getStudentName(rec.studentEmail || rec.studentName)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-green-100 text-green-700 font-bold text-xs">
                          {rec.score}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground truncate max-w-xs">
                        {rec.notes || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(rec.id)}
                          className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
