import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Megaphone, MessageSquare, Eye, Send, Bold, Italic, Link2, Image as ImageIcon, Trash2, X, Loader2, RefreshCw, AlertTriangle, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import AvatarBorder from './AvatarBorder';
import { PageHeader, PageShell } from './ui/page';


// Secure markdown parser: escapes raw HTML to neutralize XSS, then converts safe markdown
const escapeHtml = (str) => {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const parseMarkdown = (text) => {
  if (!text) return '';

  const escaped = escapeHtml(text);

  const html = escaped
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Safe links: only permit http://, https://, and mailto: protocols
    .replace(/\[(.*?)\]\(((?:https?:\/\/|mailto:)[^\s"'<>]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br />');

  return html;
};

const formatAnnouncementDate = (timestamp) => {
  const date = new Date(timestamp);

  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const getAudienceLabel = (audience) => {
  if (audience === 'students') return 'Students';

  if (audience === 'volunteers') return 'Volunteers';

  return 'Everyone';
};

const AnnouncementItem = ({ post, userRole, userEmail, profilePicture, userEquippedBorder, renderAvatar, handleMarkAsRead, handleComment, commentText, setCommentText, handleDeleteAnnouncement, onImageClick }) => {
  const hasRead = post.read_by?.includes(userEmail);
  const isUnread = userRole !== 'admin' && Boolean(userEmail) && !hasRead;
  const postRef = useRef(null);
  const [readersExpanded, setReadersExpanded] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const readers = Array.isArray(post.read_by) ? post.read_by : [];
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const postDate = new Date(post.timestamp);
  const validPostDate = !Number.isNaN(postDate.getTime());

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
    <article ref={postRef} aria-labelledby={`announcement-title-${post.id}`} className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="p-4 sm:p-7">
        <header className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0 border border-border/50">
            {renderAvatar(post.authorEmail, post.author)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={`announcement-title-${post.id}`} className="break-words text-xl font-bold leading-snug text-fg sm:text-2xl">{post.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span className="font-semibold text-primary">{post.author || 'SHORE team'}</span>
              <span aria-hidden="true">·</span>
              {validPostDate ? (
                <time dateTime={postDate.toISOString()}>{formatAnnouncementDate(post.timestamp)}</time>
              ) : (
                <span>{formatAnnouncementDate(post.timestamp)}</span>
              )}
              <span aria-hidden="true">·</span>
              <span>{getAudienceLabel(post.audience)}</span>
              {isUnread && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    <span>Unread</span>
                  </span>
                </>
              )}
            </div>
          </div>
          {userRole === 'admin' && (
            <button
              type="button"
              aria-label={`Delete announcement: ${post.title}`}
              onClick={() => handleDeleteAnnouncement(post.id)}
              className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              title="Delete announcement"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </header>

        <div className="prose mt-5 max-w-none break-words text-[15px] leading-7 text-fg/85 prose-a:underline prose-a:underline-offset-2">
          <div dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) }} />
        </div>

        {post.images?.length > 0 && (
          <div className={post.images.length === 1 ? '-mx-4 -mb-4 mt-5 flex justify-center bg-slate-100/70 px-4 py-4 sm:-mx-7 sm:-mb-7 sm:px-7' : 'mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3'}>
            {post.images.map((img, i) => (
              <button
                key={`${post.id}-image-${i}`}
                type="button"
                aria-label={`View announcement attachment ${i + 1}`}
                onClick={() => onImageClick?.(img)}
                className={`overflow-hidden rounded-xl border border-border bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${post.images.length === 1 ? 'block w-fit max-w-full' : 'aspect-[4/3] w-full'}`}
              >
                <img
                  src={img}
                  alt={`Attachment ${i + 1} for ${post.title}`}
                  loading="lazy"
                  className={post.images.length === 1 ? 'block h-auto max-h-72 max-w-full object-contain' : 'h-full w-full object-contain p-1'}
                />
              </button>
            ))}
          </div>
        )}

      </div>

      <section aria-label={`Comments on ${post.title}`} className="border-t border-border/70 bg-slate-50/70 px-4 py-3 sm:px-7 sm:py-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            aria-expanded={commentsExpanded}
            aria-controls={`announcement-comments-${post.id}`}
            onClick={() => setCommentsExpanded((expanded) => !expanded)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-fg hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <MessageSquare className="h-4 w-4 text-muted" aria-hidden="true" />
            {comments.length ? `Comments (${comments.length})` : 'Comments'}
            {comments.length > 0 && <ChevronDown className={`h-4 w-4 transition-transform ${commentsExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />}
          </button>
          {userRole === 'admin' && (
            <button
              type="button"
              aria-label={`${readers.length} ${readers.length === 1 ? 'person has' : 'people have'} seen this announcement${readers.length ? (readersExpanded ? '. Hide readers' : '. Show readers') : ''}`}
              aria-expanded={readersExpanded}
              aria-controls={`announcement-readers-${post.id}`}
              disabled={readers.length === 0}
              onClick={() => setReadersExpanded((expanded) => !expanded)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted transition-colors hover:bg-white hover:text-fg disabled:cursor-default disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span>{readers.length}</span>
            </button>
          )}
        </div>

        {userRole === 'admin' && (
          <div id={`announcement-readers-${post.id}`} className={readersExpanded ? 'mb-4 flex flex-wrap gap-2 border-b border-border/70 pb-4' : 'hidden'}>
            {readers.map((email) => (
              <span key={email} className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-fg">
                {String(email).split('@')[0]}
              </span>
            ))}
          </div>
        )}

        {comments.length === 0 && <p className="mb-3 text-sm text-muted">No comments yet. Start the conversation.</p>}
        {commentsExpanded && comments.length > 0 && (
          <div id={`announcement-comments-${post.id}`} className="mb-4 space-y-2.5">
            {comments.map((comment) => {
              const commentDate = new Date(comment.timestamp);
              const hasValidDate = !Number.isNaN(commentDate.getTime());

              return (
              <div key={comment.id} className="flex items-start gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-border/70 bg-white text-xs font-semibold text-primary">
                  {renderAvatar(comment.authorEmail, comment.author)}
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-white px-3 py-2.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold text-fg">{comment.author}</span>
                    {hasValidDate && (
                      <time className="text-xs text-muted" dateTime={commentDate.toISOString()}>
                        {commentDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </time>
                    )}
                  </div>
                  <p className="mt-1 break-words text-sm leading-6 text-fg/85">{comment.text}</p>
                </div>
              </div>
              );
            })}
          </div>
        )}

        <form
          className="flex items-center gap-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            handleComment(post.id);
          }}
        >
          <AvatarBorder borderId={userEquippedBorder} className="h-9 w-9 shrink-0">
            <div className="h-full w-full overflow-hidden rounded-full border border-border/70 bg-white">
              {profilePicture ? (
                <img src={profilePicture} alt="Your profile" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-primary">
                  {userRole === 'admin' ? 'A' : (userEmail ? userEmail.charAt(0).toUpperCase() : '?')}
                </div>
              )}
            </div>
          </AvatarBorder>
          <label className="sr-only" htmlFor={`announcement-comment-input-${post.id}`}>Write a comment on {post.title}</label>
          <input
            id={`announcement-comment-input-${post.id}`}
            type="text"
            aria-label={`Comment on ${post.title}`}
            placeholder="Write a comment…"
            value={commentText[post.id] || ''}
            onChange={(event) => setCommentText((current) => ({ ...current, [post.id]: event.target.value }))}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-white px-3.5 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button
            type="submit"
            aria-label={`Post comment on ${post.title}`}
            disabled={!commentText[post.id]?.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-white transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </section>
    </article>
  );
};

let cachedAnnouncements = null;

let cachedAllUsers = null;

export default function AnnouncementsView({ userEmail, userName, userRole, profilePicture, onRead }) {
  const [announcements, setAnnouncements] = useState(() => cachedAnnouncements || []);
  const [allUsers, setAllUsers] = useState(() => cachedAllUsers || []);
  const [loading, setLoading] = useState(() => !cachedAnnouncements);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [announcementFilter, setAnnouncementFilter] = useState('all');

  // Admin New Post State
  const [isComposing, setIsComposing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [showPublishedNotice, setShowPublishedNotice] = useState(false);
  const [recentPostId, setRecentPostId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [attachedImages, setAttachedImages] = useState([]);
  const [audience, setAudience] = useState('All');
  const [linkUrl, setLinkUrl] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const fileInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const textareaRef = useRef(null);
  const linkInputRef = useRef(null);
  const linkSelectionRef = useRef(null);
  const postButtonRef = useRef(null);
  const reduceMotion = useReducedMotion();

  // Comment State
  const [commentText, setCommentText] = useState({});

  // Lightbox State
  const [expandedImage, setExpandedImage] = useState(null);
  const imageTriggerRef = useRef(null);
  const imageCloseRef = useRef(null);

  useEffect(() => {
    if (!expandedImage) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    imageCloseRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setExpandedImage(null);

      if (event.key === 'Tab') {
        event.preventDefault();
        imageCloseRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedImage]);

  const openImagePreview = (image) => {
    imageTriggerRef.current = document.activeElement;
    setExpandedImage(image);
  };

  const roleAnnouncements = announcements.filter((post) => {
    if (userRole === 'admin') return true;
    const postAudience = String(post.audience || 'all').toLowerCase();

    return postAudience === 'all' || postAudience === `${userRole}s`;
  });

  const filteredAnnouncements = roleAnnouncements.filter((post) => {
    const postAudience = String(post.audience || 'all').toLowerCase();

    const audienceMatches = userRole !== 'admin'
      || announcementFilter === 'all'
      || (announcementFilter === 'everyone' && postAudience === 'all')
      || postAudience === announcementFilter;

    const readMatches = userRole === 'admin'
      || announcementFilter !== 'unread'
      || !post.read_by?.includes(userEmail);

    const searchableText = [
      post.title,
      post.author,
      String(post.content || '').replace(/<[^>]*>/g, ' '),
      getAudienceLabel(post.audience),
    ].join(' ').toLowerCase();

    return audienceMatches && readMatches && searchableText.includes(searchTerm.trim().toLowerCase());
  });

  useEffect(() => {
    if (isComposing && !isPreviewing) titleInputRef.current?.focus();
  }, [isComposing]);

  useEffect(() => {
    if (isAddingLink) linkInputRef.current?.focus();
  }, [isAddingLink]);

  useEffect(() => {
    fetchAnnouncements({ showLoading: !cachedAnnouncements });
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      const usersList = data.users || [];
      cachedAllUsers = usersList;
      setAllUsers(usersList);
    } catch {
      console.error('Failed to load users');
    }
  };

  const fetchAnnouncements = async ({ showLoading = false } = {}) => {
    if (showLoading) setLoading(true);
    setLoadError('');

    try {
      const res = await fetch('/api/announcements');

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      // Sort newest first
      const sorted = (data.announcements || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      cachedAnnouncements = sorted;
      setAnnouncements(sorted);
    } catch (e) {
      console.error('Failed to load announcements', e);
      setLoadError('We could not load announcements. Check your connection and try again.');
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

  const closeComposer = () => {
    setIsComposing(false);
    setIsPreviewing(false);
    setIsAddingLink(false);
    setEditorError('');
    requestAnimationFrame(() => postButtonRef.current?.focus());
  };

  const reviewAnnouncement = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      setEditorError(!newTitle.trim() ? 'Add a title before reviewing.' : 'Add a message before reviewing.');
      requestAnimationFrame(() => (!newTitle.trim() ? titleInputRef : textareaRef).current?.focus());

      return;
    }

    setEditorError('');
    setIsPreviewing(true);
  };

  const insertMarkdown = (before, after, placeholder, range = null) => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    const start = range?.start ?? textarea.selectionStart;
    const end = range?.end ?? textarea.selectionEnd;
    const selected = newContent.slice(start, end) || placeholder;
    const prefix = start === end && start > 0 && !/\s/.test(newContent[start - 1]) ? ' ' : '';
    const suffix = start === end && end < newContent.length && !/\s/.test(newContent[end]) ? ' ' : '';
    const insertion = `${prefix}${before}${selected}${after}${suffix}`;
    setNewContent((current) => current.slice(0, start) + insertion + current.slice(end));
    setEditorError('');

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length + before.length, start + prefix.length + before.length + selected.length);
    });
  };

  const openLinkEditor = () => {
    const textarea = textareaRef.current;
    linkSelectionRef.current = { start: textarea?.selectionStart ?? 0, end: textarea?.selectionEnd ?? 0 };
    setLinkUrl('');
    setIsAddingLink(true);
  };

  const insertLink = () => {
    let parsed;

    try {
      parsed = new URL(linkUrl.trim());
    } catch {
      setEditorError('Enter a full link starting with https://.');
      linkInputRef.current?.focus();

      return;
    }

    if (!['https:', 'http:'].includes(parsed.protocol)) {
      setEditorError('Use an http or https link.');
      linkInputRef.current?.focus();

      return;
    }

    insertMarkdown('[', `](${parsed.href})`, 'link text', linkSelectionRef.current);
    setIsAddingLink(false);
  };

  const handlePostAnnouncement = async () => {
    if (!newTitle.trim()) {
      setIsPreviewing(false);
      setEditorError('Add a title before publishing.');
      requestAnimationFrame(() => titleInputRef.current?.focus());

      return;
    }

    if (!newContent.trim()) {
      setIsPreviewing(false);
      setEditorError('Add a message before publishing.');
      requestAnimationFrame(() => textareaRef.current?.focus());

      return;
    }

    setEditorError('');

    const newPost = {
      title: newTitle.trim(),
      content: newContent.trim(),
      author: userName,
      authorEmail: userEmail,
      images: attachedImages,
      audience: audience
    };

    setIsPosting(true);

    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) throw new Error(data.error || 'Could not publish this announcement. Try again.');

      toast.success('Announcement posted.');
      setShowPublishedNotice(true);
      setRecentPostId(data.announcement?.id || null);
      setNewTitle('');
      setNewContent('');
      setAttachedImages([]);
      setAudience('All');
      closeComposer();
      await fetchAnnouncements();
    } catch (error) {
      toast.error(error.message || 'Could not publish this announcement. Try again.');
    } finally {
      setIsPosting(false);
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

    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image or GIF file.');

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image or GIF must be less than 10MB');

      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImages((current) => [...current, reader.result]);
    };

    reader.onerror = () => toast.error('Could not read that image. Try another file.');

    reader.readAsDataURL(file);
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || 'Could not post your comment. Try again.');

      setCommentText((current) => ({ ...current, [announcementId]: '' }));
      await fetchAnnouncements();
    } catch (error) {
      toast.error(error.message || 'Could not post your comment. Try again.');
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

  const unreadCount = roleAnnouncements.filter((post) => !post.read_by?.includes(userEmail)).length;

  const filterOptions = userRole === 'admin'
    ? [
      { value: 'all', label: 'All audiences' },
      { value: 'everyone', label: 'Everyone' },
      { value: 'students', label: 'Students' },
      { value: 'volunteers', label: 'Volunteers' },
    ]
    : [
      { value: 'all', label: 'All updates' },
      { value: 'unread', label: unreadCount ? `Unread (${unreadCount})` : 'Unread' },
    ];

  const clearFilters = () => {
    setSearchTerm('');
    setAnnouncementFilter('all');
  };

  if (loading) return (
    <PageShell width="reading" contentClassName="space-y-5" aria-busy="true">
      <div role="status" aria-live="polite" className="animate-pulse space-y-5 motion-reduce:animate-none">
        <span className="sr-only">Loading announcements</span>
        <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-2">
            <div className="h-8 w-52 rounded bg-border/70" />
            <div className="h-4 w-72 max-w-full rounded bg-border/50" />
          </div>
          <div className="h-11 w-32 rounded-xl bg-border/60" />
        </div>
        <div className="h-12 rounded-xl bg-border/50" />
        <div className="h-64 rounded-2xl border border-border bg-white" />
      </div>
    </PageShell>
  );

  if (loadError) return (
    <PageShell width="reading" contentClassName="grid min-h-[55vh] place-items-center" role="alert">
      <div className="max-w-sm text-center">
        <AlertTriangle className="mx-auto mb-3 h-9 w-9 text-accentRedFg" aria-hidden="true" />
        <h1 className="mb-2 text-xl font-bold text-fg">Announcements are unavailable</h1>
        <p className="mb-5 text-sm leading-6 text-muted">{loadError}</p>
        <button type="button" onClick={() => fetchAnnouncements({ showLoading: true })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </button>
      </div>
    </PageShell>
  );

  return (
    <PageShell width="reading" contentClassName="space-y-5">
      <div className="pb-1">
        <PageHeader
          title="Announcements"
          description="Cohort notices, event schedules, and team updates."
          actions={userRole === 'admin' && !isComposing ? (
            <button
              ref={postButtonRef}
              type="button"
              onClick={() => setIsComposing(true)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
            >
              <Megaphone className="h-4 w-4" aria-hidden="true" /> {newTitle || newContent || attachedImages.length ? 'Continue draft' : 'Post update'}
            </button>
          ) : null}
        />
      </div>

      <AnimatePresence>
        {showPublishedNotice && (
          <motion.div role="status" initial={{ opacity: 0, y: reduceMotion ? 0 : -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <span>Your announcement is live and appears at the top of the feed.</span>
            <button type="button" onClick={() => setShowPublishedNotice(false)} aria-label="Dismiss published notice" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isComposing && userRole === 'admin' && (
          <motion.section
            aria-labelledby="announcement-composer-title"
            aria-busy={isPosting}
            initial={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: 'easeOut' }}
            className="overflow-hidden rounded-2xl border border-border bg-white"
          >
            <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="announcement-composer-title" className="text-lg font-bold text-fg">New announcement</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">Write your update, review how it will appear, then publish.</p>
                </div>
                <button
                  type="button"
                  aria-label="Close announcement editor"
                  disabled={isPosting}
                  onClick={closeComposer}
                  className="grid min-h-11 min-w-11 place-items-center rounded-xl text-muted transition-colors hover:bg-canvas hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div role="group" aria-label="Announcement editor view" className="inline-flex rounded-lg bg-canvas p-1">
                <button type="button" aria-pressed={!isPreviewing} disabled={isPosting} onClick={() => setIsPreviewing(false)} className={`min-h-10 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${!isPreviewing ? 'bg-white text-fg shadow-sm' : 'text-muted hover:text-fg'}`}>Write</button>
                <button type="button" aria-pressed={isPreviewing} disabled={isPosting} onClick={reviewAnnouncement} className={`min-h-10 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isPreviewing ? 'bg-white text-fg shadow-sm' : 'text-muted hover:text-fg'}`}>Review</button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {isPreviewing ? (
                  <motion.div key="preview" initial={{ opacity: 0, x: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduceMotion ? 0 : -8 }} transition={{ duration: 0.12, ease: 'easeOut' }} className="rounded-xl border border-border bg-canvas/50 p-4 sm:p-6">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Ready to publish · {getAudienceLabel(audience)}</p>
                    <h3 className="break-words text-xl font-bold text-fg">{newTitle.trim() || 'Your title will appear here'}</h3>
                    <div className="mt-4 min-h-16 break-words text-sm leading-7 text-fg/85" dangerouslySetInnerHTML={{ __html: parseMarkdown(newContent.trim() || 'Your message will appear here.') }} />
                    {attachedImages.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {attachedImages.map((img, index) => <img key={`preview-${index}`} src={img} alt={`Attachment ${index + 1} preview`} className="aspect-[4/3] w-full rounded-lg border border-border bg-white object-contain" />)}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="write" initial={{ opacity: 0, x: reduceMotion ? 0 : -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduceMotion ? 0 : 8 }} transition={{ duration: 0.12, ease: 'easeOut' }} onAnimationComplete={() => { if (editorError) (newTitle.trim() ? textareaRef : titleInputRef).current?.focus(); }} className="space-y-4 sm:space-y-5">

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
                <div className="space-y-1.5">
                  <label htmlFor="announcement-title-input" className="text-sm font-semibold text-fg">Title</label>
                  <input
                    ref={titleInputRef}
                    id="announcement-title-input"
                    type="text"
                    disabled={isPosting}
                    required
                    aria-required="true"
                    placeholder="Write a clear title"
                    value={newTitle}
                    onChange={(event) => { setNewTitle(event.target.value); setEditorError(''); }}
                    className="min-h-11 w-full rounded-xl border border-border bg-white px-3.5 text-base text-fg outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="announcement-audience" className="text-sm font-semibold text-fg">Audience</label>
                  <select
                    id="announcement-audience"
                    value={audience}
                    disabled={isPosting}
                    onChange={(event) => setAudience(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm font-medium text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    <option value="All">Everyone</option>
                    <option value="students">Students</option>
                    <option value="volunteers">Volunteers</option>
                  </select>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border focus-within:border-primary">
                <div role="toolbar" aria-label="Message formatting" className="flex flex-wrap items-center gap-1 border-b border-border bg-canvas/70 p-1.5">
                  <button type="button" aria-label="Bold" disabled={isPosting} onClick={() => insertMarkdown('**', '**', 'bold text')} className="grid min-h-10 min-w-10 place-items-center rounded-lg text-fg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Bold className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label="Italic" disabled={isPosting} onClick={() => insertMarkdown('_', '_', 'italic text')} className="grid min-h-10 min-w-10 place-items-center rounded-lg text-fg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Italic className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label="Add link" aria-expanded={isAddingLink} disabled={isPosting} onClick={openLinkEditor} className="grid min-h-10 min-w-10 place-items-center rounded-lg text-fg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
                  <button type="button" aria-label="Add image" disabled={isPosting} onClick={() => fileInputRef.current?.click()} className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold text-fg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-[420px]:px-3">
                    <ImageIcon className="h-4 w-4" aria-hidden="true" /> <span className="hidden min-[420px]:inline">Add image</span>
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" aria-label="Choose announcement attachment" />
                </div>
                <AnimatePresence initial={false}>
                  {isAddingLink && (
                    <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }} transition={{ duration: 0.16 }} className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                      <label className="sr-only" htmlFor="announcement-link-url">Link URL</label>
                      <input ref={linkInputRef} id="announcement-link-url" type="url" placeholder="https://example.com" value={linkUrl} onChange={(event) => { setLinkUrl(event.target.value); setEditorError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); insertLink(); } }} className="min-h-10 min-w-0 flex-1 rounded-lg border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                      <button type="button" onClick={insertLink} className="min-h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-white">Insert</button>
                      <button type="button" onClick={() => setIsAddingLink(false)} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-muted">Cancel</button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <label className="block px-3.5 pt-3 text-sm font-semibold text-fg" htmlFor="announcement-content">Message</label>
                <textarea
                  id="announcement-content"
                  ref={textareaRef}
                  aria-label="Announcement message"
                  aria-required="true"
                  disabled={isPosting}
                  placeholder="What does everyone need to know?"
                  value={newContent}
                  onChange={(event) => { setNewContent(event.target.value); setEditorError(''); }}
                  className="min-h-28 max-h-80 w-full resize-y overflow-y-auto px-3.5 pb-4 pt-2 text-sm leading-6 text-fg outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:min-h-36"
                />
              </div>

              {attachedImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Attachments">
                  {attachedImages.map((img, i) => (
                    <motion.div key={`attachment-${i}`} initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.17, ease: 'easeOut' }} className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-canvas">
                      <img src={img} alt={`Attached image ${i + 1}`} className="h-full w-full object-contain p-1" />
                      <button
                        type="button"
                        aria-label={`Remove attachment ${i + 1}`}
                        disabled={isPosting}
                        onClick={() => setAttachedImages((current) => current.filter((_, index) => index !== i))}
                        className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-lg bg-black/70 text-white transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

                  </motion.div>
                )}
              </AnimatePresence>

              {editorError && <p role="alert" className="text-sm font-medium text-red-600">{editorError}</p>}

              <div className="flex items-center justify-end gap-2 border-t border-border/70 pt-4">
                <button type="button" disabled={isPosting} onClick={closeComposer} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-muted transition-colors hover:bg-canvas hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-5">
                  Close
                </button>
                <button type="button" disabled={isPosting} onClick={isPreviewing ? handlePostAnnouncement : reviewAnnouncement} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-white transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-5">
                  {isPosting ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                  {isPosting ? 'Publishing…' : isPreviewing ? 'Publish announcement' : 'Review announcement'}
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {(roleAnnouncements.length > 1 || searchTerm || announcementFilter !== 'all') && (
      <section aria-label="Find announcements" className="space-y-3 border-b border-border/70 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <label className="sr-only" htmlFor="announcement-search">Search announcements</label>
            <input
              id="announcement-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search updates, people, or topics"
              className="min-h-11 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm text-fg outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div role="group" aria-label={userRole === 'admin' ? 'Filter by audience' : 'Filter by read status'} className="flex flex-wrap gap-1.5">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={announcementFilter === option.value}
                onClick={() => setAnnouncementFilter(option.value)}
                className={`min-h-11 rounded-lg px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${announcementFilter === option.value ? 'bg-primary text-white' : 'text-muted hover:bg-white hover:text-fg'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-muted" aria-live="polite">
          <p>
            {filteredAnnouncements.length === roleAnnouncements.length
              ? `${roleAnnouncements.length} ${roleAnnouncements.length === 1 ? 'update' : 'updates'}`
              : `Showing ${filteredAnnouncements.length} of ${roleAnnouncements.length} updates`}
          </p>
          {(searchTerm || announcementFilter !== 'all') && (
            <button type="button" onClick={clearFilters} className="min-h-10 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Clear filters
            </button>
          )}
        </div>
      </section>
      )}

      {filteredAnnouncements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-12 text-center sm:px-8">
          <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-accentBlue text-primary">
            <Megaphone className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-fg">
            {roleAnnouncements.length === 0 ? 'No announcements yet' : 'No updates match your search'}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">
            {roleAnnouncements.length === 0
              ? 'New updates from the SHORE team will appear here.'
              : 'Try another word or clear the filters to see more updates.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {roleAnnouncements.length > 0 && (searchTerm || announcementFilter !== 'all') && (
              <button type="button" onClick={clearFilters} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-primary hover:bg-accentBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                Clear filters
              </button>
            )}
            {userRole === 'admin' && roleAnnouncements.length === 0 && (
              <button type="button" onClick={() => setIsComposing(true)} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                Post the first update
              </button>
            )}
          </div>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Announcement feed">
          {filteredAnnouncements.map((post) => (
            <motion.li key={post.id} initial={post.id === recentPostId ? { opacity: 0, y: reduceMotion ? 0 : -12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0.12 : 0.25, ease: 'easeOut' }}>
              <AnnouncementItem
                post={post}
                userRole={userRole}
                userEmail={userEmail}
                profilePicture={profilePicture}
                userEquippedBorder={allUsers.find((user) => user.email === userEmail)?.equippedBorder}
                renderAvatar={renderAvatar}
                handleMarkAsRead={handleMarkAsRead}
                handleComment={handleComment}
                commentText={commentText}
                setCommentText={setCommentText}
                handleDeleteAnnouncement={handleDeleteAnnouncement}
                onImageClick={openImagePreview}
              />
            </motion.li>
          ))}
        </ul>
      )}

      {createPortal(<AnimatePresence onExitComplete={() => imageTriggerRef.current?.focus()}>
        {expandedImage && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Expanded announcement image"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 p-4 sm:p-8"
          >
            <button
              ref={imageCloseRef}
              type="button"
              aria-label="Close image preview"
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:top-6"
              onClick={() => setExpandedImage(null)}
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
            <motion.img
              initial={{ scale: reduceMotion ? 1 : 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: reduceMotion ? 1 : 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} // Prevent click from closing when clicking image
              src={expandedImage}
              alt="Expanded view"
              className="max-h-[calc(100dvh-6rem)] max-w-full object-contain sm:max-h-[calc(100dvh-5rem)]"
            />
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </PageShell>
  );
}
