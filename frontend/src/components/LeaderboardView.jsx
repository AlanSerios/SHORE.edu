import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function LeaderboardView() {
  const [attendanceLeaders, setAttendanceLeaders] = useState([]);
  const [recitationLeaders, setRecitationLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [attRes, recRes, usersRes] = await Promise.all([
        fetch('/api/attendance'),
        fetch('/api/recitations'),
        fetch('/api/users')
      ]);
      const attData = await attRes.json();
      const recData = await recRes.json();
      const usersData = await usersRes.json();

      const students = usersData.users.filter(u => u.role === 'student');

      // Calculate Attendance (Count of "Time In"s)
      const attCount = {};
      (attData.attendance || []).forEach(log => {
        if (log.type === 'Time In') {
          attCount[log.email] = (attCount[log.email] || 0) + 1;
        }
      });

      const attLeaders = Object.entries(attCount)
        .map(([email, count]) => {
          const user = students.find(s => s.email === email);
          return {
            email,
            name: user ? user.name || email.split('@')[0] : email,
            score: count,
            profilePicture: user?.profilePicture
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Top 10

      // Calculate Recitations (Sum of scores)
      const recCount = {};
      (recData.recitations || []).forEach(rec => {
        recCount[rec.studentEmail] = (recCount[rec.studentEmail] || 0) + rec.score;
      });

      const recLeaders = Object.entries(recCount)
        .map(([email, score]) => {
          const user = students.find(s => s.email === email);
          return {
            email,
            name: user ? user.name || email.split('@')[0] : email,
            score: score,
            profilePicture: user?.profilePicture
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      setAttendanceLeaders(attLeaders);
      setRecitationLeaders(recLeaders);
      setLoading(false);
    } catch {
      toast.error('Failed to load leaderboard data.');
      setLoading(false);
    }
  };

  const getRankBadge = (index) => {
    switch(index) {
      case 0: return <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-black"><Trophy className="w-4 h-4" /></div>;
      case 1: return <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black"><Medal className="w-4 h-4" /></div>;
      case 2: return <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-black"><Medal className="w-4 h-4" /></div>;
      default: return <div className="w-8 h-8 rounded-full bg-canvas text-muted flex items-center justify-center font-black text-sm">{index + 1}</div>;
    }
  };

  const LeaderboardList = ({ title, icon: Icon, data, label, accentColor }) => (
    <div className="bg-white rounded-3xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
      <div className={`p-6 border-b border-border/40 ${accentColor}`}>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Icon className="w-5 h-5" /> {title}
        </h2>
      </div>
      <div className="flex-1 p-6">
        {data.length === 0 ? (
          <div className="text-center py-10 text-muted text-sm">No data yet.</div>
        ) : (
          <div className="space-y-4">
            {data.map((student, idx) => (
              <div key={student.email} className="flex items-center justify-between p-3 rounded-2xl hover:bg-canvas/50 transition-colors">
                <div className="flex items-center gap-4">
                  {getRankBadge(idx)}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-primary font-bold shrink-0">
                      {student.profilePicture ? (
                        <img src={student.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        student.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-fg truncate">{student.name}</p>
                      <p className="text-[10px] text-muted font-medium uppercase tracking-wider truncate">{label}</p>
                    </div>
                  </div>
                </div>
                <div className="text-xl font-black text-fg pl-2">{student.score}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="p-8">Loading Leaderboard...</div>;

  return (
    <div className="h-full overflow-y-auto bg-canvas pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-100 border border-yellow-200 text-[10px] font-bold tracking-[0.2em] uppercase text-yellow-700 mb-5 shadow-sm">
            <Star className="w-3 h-3" />
            Top Performers
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-fg mb-2">Leaderboard</h1>
          <p className="text-sm text-muted">Celebrating our most active and outstanding students.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LeaderboardList 
            title="Perfect Attendance" 
            icon={Target} 
            data={attendanceLeaders} 
            label="Total Sessions" 
            accentColor="bg-blue-50/50 text-blue-900" 
          />
          <LeaderboardList 
            title="Top Recitations" 
            icon={Star} 
            data={recitationLeaders} 
            label="Total Score" 
            accentColor="bg-green-50/50 text-green-900" 
          />
        </div>

      </div>
    </div>
  );
}
