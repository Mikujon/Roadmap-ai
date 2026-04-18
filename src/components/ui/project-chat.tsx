"use client";
import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";

// ── Types ─────────────────────────────────────────────────────────────────
interface ChatMessage {
  id:           string;
  content:      string;
  type:         "TEXT" | "SYSTEM" | "COMMAND";
  mentions:     string[];
  userId:       string;
  userName:     string;
  userInitials: string;
  userColor:    string;
  editedAt:     string | null;
  createdAt:    string;
  replyTo:      { id: string; content: string; userName: string } | null;
  isOwn:        boolean;
}

interface TeamMember { id: string; name: string; role: string; }

interface Props {
  open:        boolean;
  onClose:     () => void;
  projectId:   string;
  projectName: string;
  teamMembers: TeamMember[];
}

// ── Slash commands ────────────────────────────────────────────────────────
const SLASH_COMMANDS = [
  { cmd: "/status",   desc: "Update project status"         },
  { cmd: "/risk",     desc: "Add a risk"                    },
  { cmd: "/scope",    desc: "Request scope change"          },
  { cmd: "/snapshot", desc: "Create snapshot"               },
  { cmd: "/slack",    desc: "Slack integration (coming soon)"  },
  { cmd: "/jira",     desc: "Jira integration (coming soon)"   },
  { cmd: "/report",   desc: "Generate Guardian AI report"   },
];

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (isToday)     return time;
  if (isYesterday) return `Yesterday ${time}`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + ` ${time}`;
}

// Highlight @mentions in message content
function renderContent(content: string) {
  const parts = content.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith("@")
      ? <strong key={i} style={{ color: "#006D6B", fontWeight: 700 }}>{part}</strong>
      : <span key={i}>{part}</span>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────
export function ProjectChat({ open, onClose, projectId, projectName, teamMembers }: Props) {
  const [messages,     setMessages]    = useState<ChatMessage[]>([]);
  const [input,        setInput]       = useState("");
  const [sending,      setSending]     = useState(false);
  const [loading,      setLoading]     = useState(false);
  const [hasMore,      setHasMore]     = useState(false);
  const [unread,       setUnread]      = useState(0);
  const [replyTo,      setReplyTo]     = useState<ChatMessage | null>(null);
  const [editingId,    setEditingId]   = useState<string | null>(null);
  const [editContent,  setEditContent] = useState("");
  const [mentionQuery, setMentionQ]    = useState("");
  const [mentionOpen,  setMentionOpen] = useState(false);
  const [mentionIdx,   setMentionIdx]  = useState(0);
  const [slashOpen,    setSlashOpen]   = useState(false);
  const [slashIdx,     setSlashIdx]    = useState(0);
  const [slashQuery,   setSlashQuery]  = useState("");

  const listRef   = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const isAtBottomRef = useRef(true);

  // ── Fetch initial messages ────────────────────────────────────────────
  const fetchMessages = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const qs = cursor ? `?cursor=${cursor}` : "";
      const res = await fetch(`/api/projects/${projectId}/messages${qs}`);
      const text = await res.text();
      if (!text || !text.trim()) { setMessages([]); return; }
      const data = JSON.parse(text) as { messages: ChatMessage[]; hasMore: boolean };
      const msgs = data.messages ?? [];
      if (cursor) {
        setMessages(prev => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
        if (msgs.length > 0) {
          lastIdRef.current = msgs[msgs.length - 1].createdAt;
        }
      }
      setHasMore(data.hasMore ?? false);
    } catch (err) {
      console.error("[fetchMessages]", err);
      if (!cursor) setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // ── Poll for new messages ─────────────────────────────────────────────
  const pollMessages = useCallback(async () => {
    if (!lastIdRef.current) return;
    try {
      const res  = await fetch(`/api/projects/${projectId}/messages?since=${encodeURIComponent(lastIdRef.current)}`);
      const text = await res.text();
      if (!text || !text.trim()) return;
      const data = JSON.parse(text) as { messages: ChatMessage[] };
      const msgs = data.messages ?? [];
      if (msgs.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs     = msgs.filter(m => !existingIds.has(m.id));
          if (newMsgs.length === 0) return prev;
          lastIdRef.current = newMsgs[newMsgs.length - 1].createdAt;
          if (!isAtBottomRef.current) setUnread(u => u + newMsgs.length);
          return [...prev, ...newMsgs];
        });
      }
    } catch { /* silent poll failure */ }
  }, [projectId]);

  useEffect(() => {
    if (!open) return;
    fetchMessages();
    pollRef.current = setInterval(pollMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, fetchMessages, pollMessages]);

  // ── Auto-scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isAtBottomRef.current = atBottom;
    if (atBottom) { el.scrollTop = el.scrollHeight; setUnread(0); }
  }, [messages]);

  // ── ESC to close ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ── Textarea auto-resize ──────────────────────────────────────────────
  const autoResize = () => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "36px";
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
  };

  // ── Input change — detect @mention and /command ───────────────────────
  const handleInputChange = (val: string) => {
    setInput(val);
    autoResize();

    // @mention detection — look for @ before cursor
    const atIdx = val.lastIndexOf("@");
    if (atIdx !== -1 && !val.slice(atIdx + 1).includes(" ")) {
      setMentionQ(val.slice(atIdx + 1).toLowerCase());
      setMentionOpen(true);
      setMentionIdx(0);
    } else {
      setMentionOpen(false);
    }

    // /command detection — only at start of line
    const slashMatch = val.match(/^\/(\S*)$/);
    if (slashMatch) {
      setSlashQuery(slashMatch[1].toLowerCase());
      setSlashOpen(true);
      setSlashIdx(0);
    } else {
      setSlashOpen(false);
    }
  };

  const filteredMembers = teamMembers.filter(m =>
    m.name.toLowerCase().includes(mentionQuery)
  ).slice(0, 5);

  const filteredCmds = SLASH_COMMANDS.filter(c =>
    c.cmd.slice(1).startsWith(slashQuery)
  );

  // ── Keyboard nav for dropdowns ────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen) {
      if (e.key === "ArrowDown")  { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, filteredMembers.length - 1)); return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectMention(filteredMembers[mentionIdx]); return; }
      if (e.key === "Escape")     { setMentionOpen(false); return; }
    }
    if (slashOpen) {
      if (e.key === "ArrowDown")  { e.preventDefault(); setSlashIdx(i => Math.min(i + 1, filteredCmds.length - 1)); return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); setSlashIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectCmd(filteredCmds[slashIdx]); return; }
      if (e.key === "Escape")     { setSlashOpen(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectMention = (member: TeamMember) => {
    const atIdx = input.lastIndexOf("@");
    const newVal = input.slice(0, atIdx) + `@${member.name} `;
    setInput(newVal);
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  const selectCmd = (cmd: (typeof SLASH_COMMANDS)[0]) => {
    setInput(cmd.cmd + " ");
    setSlashOpen(false);
    inputRef.current?.focus();
  };

  // ── Send message ──────────────────────────────────────────────────────
  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput("");
    setReplyTo(null);
    setMentionOpen(false);
    setSlashOpen(false);
    if (inputRef.current) { inputRef.current.style.height = "36px"; }

    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content, replyToId: replyTo?.id }),
      });
      const data = await res.json() as { message: ChatMessage };
      if (res.ok) {
        setMessages(prev => [...prev, data.message]);
        lastIdRef.current = data.message.createdAt;
        setTimeout(() => {
          if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
        }, 0);
      }
    } finally {
      setSending(false);
    }
  };

  // ── Edit message ──────────────────────────────────────────────────────
  const saveEdit = async (id: string) => {
    const content = editContent.trim();
    if (!content) return;
    const res = await fetch(`/api/projects/${projectId}/messages/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ content }),
    });
    if (res.ok) {
      const data = await res.json() as { message: { id: string; content: string; editedAt: string } };
      setMessages(prev => prev.map(m => m.id === id ? { ...m, content: data.message.content, editedAt: data.message.editedAt } : m));
    }
    setEditingId(null);
  };

  // ── Delete message ────────────────────────────────────────────────────
  const deleteMsg = async (id: string) => {
    const res = await fetch(`/api/projects/${projectId}/messages/${id}`, { method: "DELETE" });
    if (res.ok) setMessages(prev => prev.filter(m => m.id !== id));
  };

  if (!open) return null;

  return (
    <>
      <style>{`
        .chat-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 420px; background: #fff; border-left: 1px solid #E5E2D9; box-shadow: -8px 0 32px rgba(0,0,0,.1); z-index: 201; display: flex; flex-direction: column; font-family: 'DM Sans', system-ui, sans-serif; transition: transform .25s cubic-bezier(.4,0,.2,1); }
        .chat-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.15); z-index: 200; }
        .chat-header { padding: 14px 16px; border-bottom: 1px solid #E5E2D9; display: flex; align-items: center; gap: 10px; flex-shrink: 0; background: #fff; }
        .chat-title { font-size: 13px; font-weight: 700; color: #18170F; flex: 1; min-width: 0; }
        .chat-subtitle { font-size: 10px; color: #9E9C93; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .chat-close { width: 28px; height: 28px; border: none; background: none; cursor: pointer; font-size: 16px; color: #9E9C93; display: flex; align-items: center; justify-content: center; border-radius: 6px; flex-shrink: 0; }
        .chat-close:hover { background: #F0EEE8; color: #18170F; }
        .chat-list { flex: 1; overflow-y: auto; padding: 12px 0; display: flex; flex-direction: column; gap: 2px; }
        .chat-msg-own { display: flex; justify-content: flex-end; padding: 3px 12px; gap: 8px; }
        .chat-msg-other { display: flex; justify-content: flex-start; padding: 3px 12px; gap: 8px; }
        .chat-bubble-own { background: #006D6B; color: #fff; padding: 8px 12px; border-radius: 12px 12px 2px 12px; font-size: 12px; max-width: 300px; word-break: break-word; line-height: 1.45; }
        .chat-bubble-other { background: #F4F2EC; color: #18170F; padding: 8px 12px; border-radius: 12px 12px 12px 2px; font-size: 12px; max-width: 300px; word-break: break-word; line-height: 1.45; }
        .chat-system { text-align: center; padding: 6px 12px; font-size: 11px; color: #9E9C93; font-style: italic; }
        .chat-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; flex-shrink: 0; color: #fff; letter-spacing: .03em; align-self: flex-end; }
        .chat-meta-own { display: flex; justify-content: flex-end; gap: 6px; margin-bottom: 1px; }
        .chat-meta-other { display: flex; justify-content: flex-start; gap: 6px; margin-bottom: 1px; margin-left: 36px; }
        .chat-name { font-size: 10px; font-weight: 700; color: #5C5A52; }
        .chat-ts { font-size: 10px; color: #CCC9BF; }
        .chat-edited { font-size: 9px; color: #CCC9BF; font-style: italic; }
        .chat-actions { display: none; gap: 4px; }
        .chat-msg-own:hover .chat-actions, .chat-msg-other:hover .chat-actions { display: flex; }
        .chat-act-btn { padding: 2px 5px; border: 1px solid #E5E2D9; border-radius: 4px; background: #fff; font-size: 10px; color: #5C5A52; cursor: pointer; }
        .chat-act-btn:hover { background: #F0EEE8; }
        .chat-reply-bar { background: #F4F2EC; border-left: 3px solid #006D6B; padding: 6px 10px; margin: 0 12px 6px; border-radius: 0 6px 6px 0; font-size: 11px; color: #5C5A52; display: flex; align-items: center; gap: 8px; }
        .chat-reply-preview { background: rgba(255,255,255,.5); border-radius: 6px; border-left: 2px solid rgba(255,255,255,.6); padding: 4px 8px; margin-bottom: 4px; font-size: 10px; opacity: .85; }
        .chat-input-area { padding: 10px 12px; border-top: 1px solid #E5E2D9; flex-shrink: 0; position: relative; background: #fff; }
        .chat-textarea { width: 100%; resize: none; border: 1px solid #E5E2D9; border-radius: 10px; padding: 8px 44px 8px 12px; font-size: 12px; font-family: inherit; color: #18170F; background: #F8F7F3; outline: none; min-height: 36px; max-height: 120px; line-height: 1.45; box-sizing: border-box; }
        .chat-textarea:focus { border-color: #006D6B; background: #fff; }
        .chat-send-btn { position: absolute; right: 18px; bottom: 16px; width: 30px; height: 30px; background: #006D6B; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; transition: background .1s; }
        .chat-send-btn:disabled { background: #CCC9BF; cursor: not-allowed; }
        .chat-send-btn:hover:not(:disabled) { background: #005957; }
        .chat-dropdown { position: absolute; bottom: calc(100% + 4px); left: 12px; right: 12px; background: #fff; border: 1px solid #E5E2D9; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,.1); overflow: hidden; z-index: 10; }
        .chat-drop-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; font-size: 12px; cursor: pointer; }
        .chat-drop-item:hover, .chat-drop-item.active { background: #F0EEE8; }
        .chat-drop-item .code { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 700; color: #006D6B; min-width: 90px; }
        .chat-drop-item .desc { color: #9E9C93; font-size: 11px; }
        .chat-scroll-btn { position: sticky; bottom: 8px; margin: 0 auto; display: block; padding: 5px 12px; background: #006D6B; color: #fff; border: none; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .chat-load-more { display: block; margin: 8px auto; padding: 5px 14px; border: 1px solid #E5E2D9; border-radius: 20px; background: #F8F7F3; font-size: 11px; color: #5C5A52; cursor: pointer; font-family: inherit; }
        .chat-load-more:hover { background: #F0EEE8; }
        .chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 40px 20px; color: #9E9C93; font-size: 12px; text-align: center; }
        .chat-day-sep { text-align: center; font-size: 10px; color: #CCC9BF; padding: 8px 0; position: relative; }
        .chat-day-sep::before { content: ''; position: absolute; left: 12px; right: 12px; top: 50%; height: 1px; background: #F0EEE8; z-index: 0; }
        .chat-day-sep span { position: relative; z-index: 1; background: #fff; padding: 0 8px; }
        @keyframes chatIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .chat-panel { animation: chatIn .25s cubic-bezier(.4,0,.2,1); }
      `}</style>

      <div className="chat-backdrop" onClick={onClose} />

      <div className="chat-panel">
        {/* Header */}
        <div className="chat-header">
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#006D6B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12v8H9l-3 2.5V11H2V3z" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="chat-title">Project Chat</div>
            <div className="chat-subtitle">{projectName}</div>
          </div>
          {unread > 0 && (
            <div style={{ background: "#DC2626", color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 10, flexShrink: 0 }}>
              {unread} new
            </div>
          )}
          <button className="chat-close" onClick={onClose} aria-label="Close chat">✕</button>
        </div>

        {/* Message list */}
        <div className="chat-list" ref={listRef} onScroll={() => {
          if (!listRef.current) return;
          const el = listRef.current;
          isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          if (isAtBottomRef.current) setUnread(0);
        }}>
          {loading && messages.length === 0 ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
              <div style={{ width: 18, height: 18, border: "2px solid #E5E2D9", borderTopColor: "#006D6B", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <div style={{ fontSize: 28 }}>💬</div>
              <div style={{ fontWeight: 600, color: "#5C5A52" }}>No messages yet</div>
              <div>Start a conversation with your team</div>
            </div>
          ) : (
            <>
              {hasMore && (
                <button className="chat-load-more" onClick={() => fetchMessages(messages[0]?.id)}>
                  Load older messages
                </button>
              )}
              {messages.map((msg, idx) => {
                const prevMsg = messages[idx - 1];
                const showDay = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
                const showName = !prevMsg || prevMsg.userId !== msg.userId || showDay;

                if (msg.type === "SYSTEM") {
                  return (
                    <div key={msg.id}>
                      {showDay && <div className="chat-day-sep"><span>{new Date(msg.createdAt).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}</span></div>}
                      <div className="chat-system">{msg.content}</div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id}>
                    {showDay && <div className="chat-day-sep"><span>{new Date(msg.createdAt).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}</span></div>}

                    {showName && (
                      <div className={msg.isOwn ? "chat-meta-own" : "chat-meta-other"}>
                        <span className="chat-name">{msg.isOwn ? "You" : msg.userName}</span>
                        <span className="chat-ts">{fmtTime(msg.createdAt)}</span>
                        {msg.editedAt && <span className="chat-edited">(edited)</span>}
                      </div>
                    )}

                    <div className={msg.isOwn ? "chat-msg-own" : "chat-msg-other"} style={{ alignItems: "flex-end" }}>
                      {!msg.isOwn && (
                        <div className="chat-avatar" style={{ background: msg.userColor }}>
                          {msg.userInitials}
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: msg.isOwn ? "flex-end" : "flex-start" }}>
                        {msg.replyTo && (
                          <div className={msg.isOwn ? "chat-bubble-own" : "chat-bubble-other"} style={{ padding: "4px 10px", fontSize: 11, opacity: 0.85, borderRadius: 8 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 2, opacity: 0.8 }}>{msg.replyTo.userName}</div>
                            {msg.replyTo.content}
                          </div>
                        )}

                        {editingId === msg.id ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input
                              style={{ padding: "6px 10px", border: "1px solid #006D6B", borderRadius: 8, fontSize: 12, fontFamily: "inherit", width: 240 }}
                              value={editContent}
                              onChange={e => setEditContent(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") saveEdit(msg.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              autoFocus
                            />
                            <button onClick={() => saveEdit(msg.id)} style={{ padding: "4px 8px", background: "#006D6B", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Save</button>
                            <button onClick={() => setEditingId(null)} style={{ padding: "4px 8px", background: "#F0EEE8", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>✕</button>
                          </div>
                        ) : (
                          <div className={msg.isOwn ? "chat-bubble-own" : "chat-bubble-other"}>
                            {renderContent(msg.content)}
                          </div>
                        )}

                        <div className="chat-actions">
                          <button className="chat-act-btn" onClick={() => setReplyTo(msg)} title="Reply">↩</button>
                          {msg.isOwn && (
                            <>
                              <button className="chat-act-btn" onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} title="Edit">✏</button>
                              <button className="chat-act-btn" style={{ color: "#DC2626" }} onClick={() => deleteMsg(msg.id)} title="Delete">🗑</button>
                            </>
                          )}
                        </div>
                      </div>
                      {msg.isOwn && (
                        <div className="chat-avatar" style={{ background: msg.userColor }}>
                          {msg.userInitials}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Scroll-to-bottom button */}
          {unread > 0 && (
            <button
              className="chat-scroll-btn"
              onClick={() => {
                if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
                setUnread(0);
              }}
            >
              ↓ {unread} new message{unread > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Reply bar */}
        {replyTo && (
          <div className="chat-reply-bar">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#006D6B", marginBottom: 2 }}>Replying to {replyTo.userName}</div>
              <div style={{ fontSize: 11, color: "#5C5A52", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.content.slice(0, 60)}</div>
            </div>
            <button onClick={() => setReplyTo(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#9E9C93", fontSize: 14, padding: 0, flexShrink: 0 }}>✕</button>
          </div>
        )}

        {/* Input */}
        <div className="chat-input-area">
          {/* Mention dropdown */}
          {mentionOpen && filteredMembers.length > 0 && (
            <div className="chat-dropdown">
              {filteredMembers.map((m, i) => (
                <div
                  key={m.id}
                  className={`chat-drop-item${i === mentionIdx ? " active" : ""}`}
                  onMouseDown={() => selectMention(m)}
                >
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#006D6B", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, flexShrink: 0 }}>
                    {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#18170F" }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: "#9E9C93" }}>{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Slash command dropdown */}
          {slashOpen && filteredCmds.length > 0 && (
            <div className="chat-dropdown">
              {filteredCmds.map((c, i) => (
                <div
                  key={c.cmd}
                  className={`chat-drop-item${i === slashIdx ? " active" : ""}`}
                  onMouseDown={() => selectCmd(c)}
                >
                  <span className="code">{c.cmd}</span>
                  <span className="desc">{c.desc}</span>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={inputRef}
            className="chat-textarea"
            placeholder="Message… @ to mention, / for commands"
            value={input}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={sending}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            aria-label="Send"
          >
            {sending
              ? <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .6s linear infinite" }} />
              : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 7L2 2l2.5 5L2 12l10-5z" fill="#fff"/></svg>
            }
          </button>
        </div>
      </div>
    </>
  );
}

// ── Chat Button (for page headers) ────────────────────────────────────────
export function ChatButton({
  onClick, unreadCount,
}: { onClick: () => void; unreadCount?: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 34, height: 34, border: "1px solid #E5E2D9", borderRadius: 8,
        background: "#fff", cursor: "pointer", flexShrink: 0,
      }}
      title="Project chat"
      aria-label="Open project chat"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 3h12v8H9l-3 2.5V11H2V3z" stroke="#5C5A52" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
      {!!unreadCount && unreadCount > 0 && (
        <span style={{
          position: "absolute", top: -4, right: -4,
          background: "#DC2626", color: "#fff",
          fontSize: 8, fontWeight: 800, lineHeight: 1,
          padding: "2px 4px", borderRadius: 8,
          border: "1.5px solid #fff",
        }}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
