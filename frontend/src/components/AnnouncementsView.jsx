import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, MessageSquare, Eye, Send, Bold, Italic, Link2, Image as ImageIcon, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';
import AvatarBorder from './AvatarBorder';

// A simple utility to parse basic markdown for rendering
const parseMarkdown = (text) => {
  if (!text) return '';
  let html = text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
    // Newlines
    .replace(/\n/g, '<br />');
  return html;
};

const AnnouncementItem = ({ post, userRole, userEmail, userName, profilePicture, userEquippedBorder, renderAvatar, handleMarkAsRead, handleComment, commentText, setCommentText, handleDeleteAnnouncement }) => {
  const hasRead = post.read_by?.includes(userEmail);
  const postRef = useRef(null);

  useEffect(() => {
    if (userRole === 'admin' || hasRead) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        handleMarkAsRead(post.id);
        observer.disconnect();
      }
    }, { threshold: 0.5 });

    if (postRef.current) {
      observer.observe(postRef.current);
    }

    return () => observer.disconnect();
  }, [hasRead, post.id, userRole, handleMarkAsRead]);

  return (
    <div ref={postRef} className="bg-white rounded-3xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
      {/* Post Content */}
      <div className="p-4 sm:p-8">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 border border-border/50">
              {renderAvatar(post.authorEmail, post.author)}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-fg mb-1">{post.title}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-xs text-muted font-medium">
                <span className="text-primary">{post.author}</span>
                <span className="hidden sm:inline">•</span>
                <span>{new Date(post.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>
          {userRole === 'admin' && (
            <button 
              onClick={() => handleDeleteAnnouncement(post.id)}
              className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Delete Announcement"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="prose prose-sm max-w-none text-fg/80 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) }} />

        {post.images && post.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {post.images.map((img, i) => (
              <img key={i} src={img} alt="Announcement Attachment" className="w-full h-48 object-cover rounded-2xl border border-border/50" />
            ))}
          </div>
        )}
        
        {/* Read Receipts (Admin Only) */}
        {userRole === 'admin' && (
          <div className="mt-4 border-t border-border/40 pt-4">
            <div className="flex items-center gap-2 text-xs text-muted mb-2">
              <Eye className="w-3.5 h-3.5" />
              <span className="font-bold">{post.read_by?.length || 0}</span> people have seen this
            </div>
            {post.read_by && post.read_by.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.read_by.map(email => (
                   <span key={email} className="px-2 py-1 bg-canvas rounded-md text-[10px] font-bold text-fg border border-border">
                     {email.split('@')[0]}
                   </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-canvas/30 border-t border-border/40 p-6 sm:p-8">
        <h4 className="text-sm font-bold text-fg mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted" /> 
          Comments ({post.comments?.length || 0})
        </h4>
        
        <div className="space-y-4 mb-6">
          {(post.comments || []).map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-border/50">
                {renderAvatar(comment.authorEmail, comment.author)}
              </div>
              <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-border/50 shadow-sm flex-1">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-bold text-fg">{comment.author}</span>
                  <span className="text-[10px] text-muted">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-fg/80">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Add Comment */}
        <div className="flex gap-3 mt-4">
          <AvatarBorder borderId={userEquippedBorder} className="w-8 h-8 shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden bg-canvas border border-border/50 shrink-0">
              {profilePicture ? (
                <img src={profilePicture} alt="You" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-primary text-xs">
                  {userRole === 'admin' ? 'A' : (userEmail ? userEmail.charAt(0).toUpperCase() : '')}
                </div>
              )}
            </div>
          </AvatarBorder>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Ask a question or leave a comment..."
              value={commentText[post.id] || ''}
              onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
              className="w-full pl-4 pr-12 py-2.5 rounded-full border border-border/60 bg-white text-sm outline-none focus:border-primary/50 shadow-sm"
            />
            <button 
              onClick={() => handleComment(post.id)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AnnouncementsView({ userEmail, userName, userRole, profilePicture, onRead }) {
  const [announcements, setAnnouncements] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin New Post State
  const [isComposing, setIsComposing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [attachedImages, setAttachedImages] = useState([]);
  const [audience, setAudience] = useState('All');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Comment State
  const [commentText, setCommentText] = useState({});

  useEffect(() => {
    fetchAnnouncements();
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setAllUsers(data.users || []);
    } catch {
      console.error('Failed to load users');
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      const data = await res.json();
      // Sort newest first
      setAnnouncements((data.announcements || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (e) {
      console.error('Failed to load announcements', e);
    } finally {
      setLoading(false);
      if (onRead) onRead();
    }
  };

  const renderAvatar = (email, name) => {
    const user = allUsers.find(u => u.email === email);
    const content = (user && user.profilePicture) 
      ? <img src={user.profilePicture} alt={name} className="w-full h-full object-cover rounded-full" />
      : <div className="w-full h-full flex items-center justify-center bg-canvas text-primary font-bold rounded-full">{name ? name.charAt(0).toUpperCase() : '?'}</div>;
    
    return user?.equippedBorder ? (
      <AvatarBorder borderId={user.equippedBorder} className="w-full h-full">
        {content}
      </AvatarBorder>
    ) : content;
  };

  const handlePostAnnouncement = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Title and Content are required.");
      return;
    }

    const newPost = {
      title: newTitle,
      content: newContent,
      author: userName,
      authorEmail: userEmail,
      images: attachedImages,
      audience: audience
    };

    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Announcement posted!");
        setNewTitle('');
        setNewContent('');
        setAttachedImages([]);
        setIsComposing(false);
        fetchAnnouncements();
      }
    } catch {
      toast.error("Failed to post announcement.");
    }
  };

  const handleDeleteAnnouncement = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const res = await fetch(`/api/announcements/${postId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Announcement deleted.");
        fetchAnnouncements();
      } else {
        toast.error("Failed to delete announcement.");
      }
    } catch {
      toast.error("Error deleting announcement.");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImages([...attachedImages, reader.result]);
    };
    reader.readAsDataURL(file);
  };

  const insertFormatting = (prefix, suffix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    setNewContent(before + prefix + selected + suffix + after);
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleComment = async (announcementId) => {
    const text = commentText[announcementId];
    if (!text || !text.trim()) return;

    try {
      const res = await fetch(`/api/announcements/${announcementId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: userName,
          authorEmail: userEmail,
          text: text.trim()
        })
      });
      if (res.ok) {
        setCommentText({ ...commentText, [announcementId]: '' });
        fetchAnnouncements();
      }
    } catch {
      toast.error("Failed to post comment.");
    }
  };

  const handleMarkAsRead = async (announcementId) => {
    try {
      const res = await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
      if (res.ok) {
        fetchAnnouncements();
      }
    } catch {
      // silently fail
    }
  };

  if (loading) return <div className="p-8">Loading announcements...</div>;

  return (
    <div className="h-full overflow-y-auto bg-canvas pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-border/50 text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-5 shadow-sm">
              <Megaphone className="w-3 h-3" />
              Notice Board
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-fg mb-2">Announcements</h1>
            <p className="text-sm text-muted">Stay up to date with the latest news and updates from the team.</p>
          </div>
          
          {userRole === 'admin' && !isComposing && (
            <button 
              onClick={() => setIsComposing(true)}
              className="w-full sm:w-auto justify-center px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
            >
              <Megaphone className="w-4 h-4" />
              Post Update
            </button>
          )}
        </div>

        {/* Composer (Admin Only) */}
        <AnimatePresence>
          {isComposing && userRole === 'admin' && (
            <motion.div 
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="bg-white rounded-3xl border border-border/60 shadow-xl overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <input 
                    type="text"
                    placeholder="Announcement Title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="flex-1 text-2xl font-black text-fg placeholder:text-muted/50 border-none outline-none bg-transparent"
                  />
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="px-4 py-2 bg-canvas border border-border rounded-xl text-sm font-semibold text-fg outline-none focus:border-primary/50"
                  >
                    <option value="All">All Users</option>
                    <option value="students">Students Only</option>
                    <option value="volunteers">Volunteers Only</option>
                  </select>
                </div>
                
                {/* Formatting Toolbar */}
                <div className="flex gap-2 p-2 bg-canvas/50 rounded-lg border border-border/50">
                  <button onClick={() => insertFormatting('**', '**')} className="p-2 hover:bg-white rounded-md text-fg transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
                  <button onClick={() => insertFormatting('*', '*')} className="p-2 hover:bg-white rounded-md text-fg transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
                  <button onClick={() => insertFormatting('[', '](url)')} className="p-2 hover:bg-white rounded-md text-fg transition-colors" title="Link"><Link2 className="w-4 h-4" /></button>
                  <div className="w-px h-6 bg-border/50 mx-2 self-center"></div>
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white rounded-md text-fg transition-colors" title="Add Image"><ImageIcon className="w-4 h-4" /></button>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>

                <textarea
                  ref={textareaRef}
                  placeholder="Write your announcement here... Use the toolbar to format."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full min-h-[150px] p-4 bg-canvas/30 rounded-xl border border-border/50 resize-y outline-none focus:border-primary/50 text-sm"
                />

                {/* Attached Images Preview */}
                {attachedImages.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto py-2">
                    {attachedImages.map((img, i) => (
                      <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                        <img src={img} alt="Attached" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setAttachedImages(attachedImages.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                        >
                          <Megaphone className="w-3 h-3 hidden" /> {/* Just for spacing, using text instead */}
                          <span className="text-[10px] font-bold leading-none px-1">X</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                  <button onClick={() => setIsComposing(false)} className="px-5 py-2 text-sm font-bold text-muted hover:text-fg transition-colors">Cancel</button>
                  <button onClick={handlePostAnnouncement} className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2">
                    <Send className="w-4 h-4" /> Publish
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Announcements Feed */}
        <div className="space-y-6">
          {announcements.filter(post => {
            if (userRole === 'admin') return true;
            if (!post.audience || post.audience === 'All') return true;
            return post.audience === `${userRole}s`;
          }).length === 0 ? (
            <div className="text-center py-20 text-muted">No announcements yet.</div>
          ) : (
            announcements.filter(post => {
              if (userRole === 'admin') return true;
              if (!post.audience || post.audience === 'All') return true;
              return post.audience === `${userRole}s`;
            }).map((post) => (
              <AnnouncementItem 
                key={post.id}
                post={post}
                userRole={userRole}
                userEmail={userEmail}
                userName={userName}
                profilePicture={profilePicture}
                userEquippedBorder={allUsers.find(u => u.email === userEmail)?.equippedBorder}
                renderAvatar={renderAvatar}
                handleMarkAsRead={handleMarkAsRead}
                handleComment={handleComment}
                commentText={commentText}
                setCommentText={setCommentText}
                handleDeleteAnnouncement={handleDeleteAnnouncement}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
