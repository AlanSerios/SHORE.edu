import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ExternalLink, GraduationCap, MapPin, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';

export default function ScholarshipsView({ userRole }) {
  const [scholarships, setScholarships] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentScholarship, setCurrentScholarship] = useState({
    id: '',
    title: '',
    provider: '',
    location: 'Mindanao, Philippines',
    requirements: [''],
    applyLink: ''
  });

  useEffect(() => {
    fetchScholarships();
  }, []);

  const fetchScholarships = async () => {
    try {
      const res = await fetch('/api/scholarships');
      const data = await res.json();
      setScholarships(data.scholarships || []);
    } catch (error) {
      toast.error('Failed to load scholarships');
    }
  };

  const openModal = (scholarship = null) => {
    if (scholarship) {
      setCurrentScholarship({
        ...scholarship,
        requirements: scholarship.requirements?.length ? scholarship.requirements : ['']
      });
      setIsEditing(true);
    } else {
      setCurrentScholarship({
        id: crypto.randomUUID(),
        title: '',
        provider: '',
        location: 'Mindanao, Philippines',
        requirements: [''],
        applyLink: ''
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleRequirementChange = (index, value) => {
    const newReqs = [...currentScholarship.requirements];
    newReqs[index] = value;
    setCurrentScholarship({ ...currentScholarship, requirements: newReqs });
  };

  const addRequirement = () => {
    setCurrentScholarship({
      ...currentScholarship,
      requirements: [...currentScholarship.requirements, '']
    });
  };

  const removeRequirement = (index) => {
    const newReqs = currentScholarship.requirements.filter((_, i) => i !== index);
    setCurrentScholarship({ ...currentScholarship, requirements: newReqs });
  };

  const handleSave = async () => {
    if (!currentScholarship.title || !currentScholarship.provider || !currentScholarship.applyLink) {
      toast.error("Please fill in the title, provider, and apply link.");
      return;
    }

    const payload = {
      ...currentScholarship,
      requirements: currentScholarship.requirements.filter(r => r.trim() !== '')
    };

    try {
      const url = isEditing ? `/api/scholarships/${payload.id}` : '/api/scholarships';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(isEditing ? 'Scholarship updated!' : 'Scholarship added!');
        fetchScholarships();
        setIsModalOpen(false);
      } else {
        toast.error('Failed to save scholarship');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this scholarship?')) return;
    try {
      const res = await fetch(`/api/scholarships/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Scholarship deleted');
        fetchScholarships();
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-fg tracking-tight">Available Scholarships</h1>
          <p className="text-muted mt-1">Discover and apply for financial aid opportunities in Mindanao and beyond.</p>
        </div>
        {userRole === 'admin' && (
          <button 
            onClick={() => openModal()}
            className="w-full sm:w-auto justify-center bg-primary hover:bg-primaryHover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" /> Add Scholarship
          </button>
        )}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-8 flex flex-col md:flex-row gap-6 items-start shadow-sm">
        <div className="bg-primary/10 p-3 rounded-xl shrink-0">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-fg mb-2">General Requirements Checklist</h2>
          <p className="text-sm text-muted mb-4">Please prepare these general requirements as soon as possible to ensure a smooth application process for most scholarships:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {[
              "Online Application",
              "Grades (G12 Grades signed by Principal / 95% Grades)",
              "Certificate of Residency",
              "Residence Map",
              "Photo of Residence",
              "Proof of Comelec Registration",
              "Parents' Proof of Income (ITR, Tax Exemption)",
              "Awards, 4Ps ID sa Parents or Applicant, Solo Parent ID, Certificate of Indigenous People Membership",
              "Birth Certificate",
              "2X2 Picture",
              "Sketch of Nearest SM Mall"
            ].map((req, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-fg font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scholarships.map((scholarship) => (
          <div key={scholarship.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-primary/10 text-primary p-3 rounded-xl">
                <GraduationCap className="w-6 h-6" />
              </div>
              {userRole === 'admin' && (
                <div className="flex gap-2">
                  <button onClick={() => openModal(scholarship)} className="text-muted hover:text-fg p-1 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(scholarship.id)} className="text-muted hover:text-accentRedFg p-1 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
            
            <h3 className="text-xl font-bold text-fg mb-1">{scholarship.title}</h3>
            <p className="text-sm font-medium text-primary mb-3">{scholarship.provider}</p>
            
            <div className="flex items-center gap-1.5 text-xs text-muted mb-6 bg-canvas w-max px-2.5 py-1 rounded-md">
              <MapPin className="w-3.5 h-3.5" />
              {scholarship.location}
            </div>

            <div className="flex-1 mb-6">
              <h4 className="text-sm font-semibold text-fg mb-3 uppercase tracking-wider">Requirements</h4>
              <ul className="space-y-2.5">
                {scholarship.requirements?.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-muted">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-tight">{req}</span>
                  </li>
                ))}
                {(!scholarship.requirements || scholarship.requirements.length === 0) && (
                  <li className="text-sm text-muted/50 italic">No specific requirements listed.</li>
                )}
              </ul>
            </div>

            <a 
              href={scholarship.applyLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-auto bg-fg text-canvas hover:bg-fg/90 w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              Apply Here <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ))}

        {scholarships.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
            <div className="bg-canvas p-4 rounded-full mb-4">
              <GraduationCap className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-bold text-fg mb-1">No Scholarships Available</h3>
            <p className="text-muted text-sm max-w-sm">There are currently no active scholarships listed. Check back later or contact your administrator.</p>
          </div>
        )}
      </div>

      {/* Admin Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-fg mb-6">{isEditing ? 'Edit Scholarship' : 'Add New Scholarship'}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-fg mb-1.5">Scholarship Title</label>
                  <input 
                    type="text" 
                    value={currentScholarship.title} 
                    onChange={e => setCurrentScholarship({...currentScholarship, title: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-canvas focus:outline-none focus:border-primary transition-colors"
                    placeholder="e.g. CHED Scholarship Program"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-fg mb-1.5">Provider</label>
                  <input 
                    type="text" 
                    value={currentScholarship.provider} 
                    onChange={e => setCurrentScholarship({...currentScholarship, provider: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-canvas focus:outline-none focus:border-primary transition-colors"
                    placeholder="e.g. Commission on Higher Education"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-fg mb-1.5">Location</label>
                  <input 
                    type="text" 
                    value={currentScholarship.location} 
                    onChange={e => setCurrentScholarship({...currentScholarship, location: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-canvas focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-fg mb-1.5">Application Link (URL)</label>
                  <input 
                    type="url" 
                    value={currentScholarship.applyLink} 
                    onChange={e => setCurrentScholarship({...currentScholarship, applyLink: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-canvas focus:outline-none focus:border-primary transition-colors"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-fg mb-2">Requirements</label>
                  <div className="space-y-3">
                    {currentScholarship.requirements.map((req, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                          type="text" 
                          value={req} 
                          onChange={e => handleRequirementChange(idx, e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-border bg-canvas focus:outline-none focus:border-primary transition-colors text-sm"
                          placeholder="e.g. Must be a resident of Mindanao"
                        />
                        <button 
                          onClick={() => removeRequirement(idx)}
                          className="p-2 text-muted hover:text-accentRedFg hover:bg-accentRed/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={addRequirement}
                      className="text-sm font-medium text-primary hover:text-primaryHover flex items-center gap-1.5 mt-2"
                    >
                      <Plus className="w-4 h-4" /> Add Requirement
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-muted hover:text-fg hover:bg-canvas transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-primary hover:bg-primaryHover text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
                >
                  Save Scholarship
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
