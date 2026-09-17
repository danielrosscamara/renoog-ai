import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ChevronLeft, ChevronRight, Pencil, Pin, RotateCcw, Trash2 } from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import { Avatar } from '../common/Avatar';
import type { MessageTurn } from '../../types';

interface MessageBubbleProps {
  turn: MessageTurn;
  /** Display name + avatar for whoever authored this turn (character or persona). */
  authorName: string;
  authorAvatarUrl?: string;
  isStreaming?: boolean;
  /** Only offered on assistant turns; hidden when not provided. */
  onRegenerate?: (turn: MessageTurn) => void;
}

function formatClock(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** `**strong**` and `*action*` → elements. Unclosed markers (mid-stream) stay literal. */
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderProse(text: string): ReactNode {
  return text
    .split(/\n{2,}/)
    .filter((para) => para.trim())
    .map((para, i) => (
      <p key={i}>
        {para.split('\n').map((line, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {renderInline(line)}
          </span>
        ))}
      </p>
    ));
}

const actionButton =
  'flex h-8 w-8 items-center justify-center rounded-control text-text-dim transition-colors hover:bg-surface-2 hover:text-text';

/**
 * One turn in the thread. Reads like a page, not a chat app:
 * - Serif prose, 17/1.65, capped at 64ch no matter how wide the panel is.
 * - No colored bubbles. Sender is carried by alignment + avatar; the user's
 *   turns sit right on --surface-1, the character's sit left on --bg.
 * - Actions (swipe, edit, regenerate, pin, delete) are invisible until the
 *   row is hovered or keyboard-focused. Nothing animates while reading
 *   beyond a 150ms fade on arrival.
 */
export const MessageBubble = ({
  turn,
  authorName,
  authorAvatarUrl,
  isStreaming = false,
  onRegenerate,
}: MessageBubbleProps) => {
  const { editTurnMessage, deleteTurn, setSwipeIndex, togglePinTurn } = useChatStore(
    useShallow((s) => ({
      editTurnMessage: s.editTurnMessage,
      deleteTurn: s.deleteTurn,
      setSwipeIndex: s.setSwipeIndex,
      togglePinTurn: s.togglePinTurn,
    }))
  );

  const isUser = turn.role === 'user';
  const text = turn.swipes[turn.active_index] ?? '';
  const swipeCount = turn.swipes.length;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!isEditing || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [isEditing]);

  // Grow the editor with its content so editing doesn't reflow into a scroll box.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, isEditing]);

  const startEdit = () => {
    setDraft(text);
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (draft.trim() && draft !== text) editTurnMessage(turn.chat_id, turn.id, draft);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteTurn(turn.chat_id, turn.id);
  };

  const showActions = !isStreaming && !isEditing;
  const revealOnHover = confirmDelete
    ? 'opacity-100'
    : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100';

  return (
    <article
      onMouseLeave={() => setConfirmDelete(false)}
      aria-label={`${authorName}${isStreaming ? ', writing' : ''}`}
      className={`group flex animate-fade-in gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <Avatar src={authorAvatarUrl} name={authorName} size={40} />

      <div className={`flex min-w-0 flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <header className={`flex items-baseline gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-name font-semibold text-text">{authorName}</span>
          <time dateTime={turn.created_at} className="meta text-text-faint">
            {formatClock(turn.created_at)}
          </time>
          {turn.is_pinned && <Pin aria-label="Pinned" className="h-3 w-3 self-center text-text-faint" />}
        </header>

        <div
          className={`mt-1 ${
            isUser ? 'rounded-control bg-surface-1 px-4 py-3' : 'py-1'
          } ${isEditing ? 'w-[64ch] max-w-full font-serif text-prose' : ''}`}
        >
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                ref={textareaRef}
                value={draft}
                aria-label="Edit message"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditing(false);
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEdit();
                }}
                className="prose-body w-full resize-none rounded-control border border-border bg-bg px-3 py-2 text-text outline-none transition-colors focus:border-border-hover"
              />
              <div className="flex items-center justify-end gap-2 font-sans">
                <span className="meta mr-auto text-text-faint">Ctrl+Enter to save · Esc to cancel</span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="h-8 rounded-control px-3 text-body text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="h-8 rounded-control bg-accent px-3 text-body font-semibold text-on-accent transition-colors hover:bg-accent-hover"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="prose-body text-text">
              {text ? renderProse(text) : <p className="text-text-faint">…</p>}
            </div>
          )}
        </div>

        {showActions && (
          <div
            className={`mt-1 flex items-center gap-1 transition-opacity ${revealOnHover} ${
              isUser ? 'flex-row-reverse' : ''
            }`}
          >
            {swipeCount > 1 && (
              <div className="flex items-center">
                <button
                  type="button"
                  aria-label="Previous version"
                  disabled={turn.active_index === 0}
                  onClick={() => setSwipeIndex(turn.chat_id, turn.id, turn.active_index - 1)}
                  className={`${actionButton} disabled:pointer-events-none disabled:opacity-40`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="meta min-w-8 text-center text-text-dim">
                  {turn.active_index + 1}/{swipeCount}
                </span>
                <button
                  type="button"
                  aria-label="Next version"
                  disabled={turn.active_index >= swipeCount - 1}
                  onClick={() => setSwipeIndex(turn.chat_id, turn.id, turn.active_index + 1)}
                  className={`${actionButton} disabled:pointer-events-none disabled:opacity-40`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <button type="button" aria-label="Edit" onClick={startEdit} className={actionButton}>
              <Pencil className="h-4 w-4" />
            </button>

            {!isUser && onRegenerate && (
              <button
                type="button"
                aria-label="Regenerate"
                onClick={() => onRegenerate(turn)}
                className={actionButton}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              aria-label={turn.is_pinned ? 'Unpin' : 'Pin'}
              aria-pressed={Boolean(turn.is_pinned)}
              onClick={() => togglePinTurn(turn.chat_id, turn.id)}
              className={actionButton}
            >
              <Pin className="h-4 w-4" />
            </button>

            {confirmDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex h-8 items-center gap-1 rounded-control px-2 text-small font-medium text-danger transition-colors hover:bg-surface-1"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            ) : (
              <button type="button" aria-label="Delete" onClick={handleDelete} className={actionButton}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
