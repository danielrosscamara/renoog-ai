import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { LucideIcon } from 'lucide-react';
import {
  Plus,
  Compass,
  Users,
  Code2,
  Search,
  Pin,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { useChatStore } from '../../stores/useChatStore';
import { useCharacterStore } from '../../stores/useCharacterStore';
import { usePersonaStore } from '../../stores/usePersonaStore';
import { Avatar } from '../common/Avatar';
import type { Chat, Character } from '../../types';

/**
 * Formats an ISO timestamp as a compact relative-time label ("12m", "2h", "1d").
 * Falls back to the raw input if it isn't a parseable date, since some chats
 * may carry a pre-formatted optimistic-UI placeholder (e.g. "Just now") instead
 * of a real ISO string before the server round-trip completes.
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;

  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return 'now'; // also covers small negative skew from server/client clock drift
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

const iconButton =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-text-dim transition-colors hover:bg-surface-2 hover:text-text';

/**
 * Floating left navigation sidebar: brand header, new-chat action, primary
 * nav, chat search/list (pinned + recent), and a footer with settings +
 * active persona switcher. Collapses to an icon rail via `useUIStore`.
 * Separated from the page by surface lightness and a border — no shadow.
 */
export const Sidebar = () => {
  // Selectors are atomic (or useShallow-wrapped) rather than pulling the
  // whole store, so this component doesn't re-render on unrelated state
  // changes elsewhere in the store (e.g. per-token streaming updates).
  const { isSidebarOpen, toggleSidebar, theme, toggleTheme, activeView, setActiveView } =
    useUIStore(
      useShallow((s) => ({
        isSidebarOpen: s.isSidebarOpen,
        toggleSidebar: s.toggleSidebar,
        theme: s.theme,
        toggleTheme: s.toggleTheme,
        activeView: s.activeView,
        setActiveView: s.setActiveView,
      }))
    );

  const { chats, activeChatId, setActiveChat, createChat } = useChatStore(
    useShallow((s) => ({
      chats: s.chats,
      activeChatId: s.activeChatId,
      setActiveChat: s.setActiveChat,
      createChat: s.createChat,
    }))
  );

  const characters = useCharacterStore((s) => s.characters);

  const { personas, activePersonaId, setActivePersona } = usePersonaStore(
    useShallow((s) => ({
      personas: s.personas,
      activePersonaId: s.activePersonaId,
      setActivePersona: s.setActivePersona,
    }))
  );

  const [search, setSearch] = useState('');
  const [personaOpen, setPersonaOpen] = useState(false);
  const personaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) {
        setPersonaOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const activePersona = personas.find((p) => p.id === activePersonaId) || personas[0];
  const characterById = useMemo(
    () => new Map(characters.map((c) => [c.id, c])),
    [characters]
  );

  // Memoized so typing in search doesn't re-filter on renders unrelated to
  // chats/characters/search (e.g. theme toggle).
  const filteredChats = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return chats;
    return chats.filter((chat) => {
      const character = characterById.get(chat.character_id);
      return (
        chat.title.toLowerCase().includes(q) ||
        (character?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [chats, characterById, search]);

  const pinnedChats = useMemo(() => filteredChats.filter((c) => c.is_pinned), [filteredChats]);
  const recentChats = useMemo(() => filteredChats.filter((c) => !c.is_pinned), [filteredChats]);

  const openChat = (chatId: string) => {
    setActiveView('chat');
    setActiveChat(chatId);
  };

  /** Starts a new chat with the current chat's character, falling back to Discover if there isn't one. */
  const handleNewChat = async () => {
    const currentCharacterId =
      chats.find((c) => c.id === activeChatId)?.character_id || characters[0]?.id;
    if (!currentCharacterId) {
      setActiveView('gallery');
      return;
    }
    try {
      await createChat(currentCharacterId, activePersonaId || undefined);
      setActiveView('chat');
    } catch (err) {
      console.error('[Sidebar] createChat failed:', err);
    }
  };

  const navItems: Array<{ id: 'gallery' | 'personas' | 'studio'; label: string; icon: LucideIcon }> = [
    { id: 'gallery', label: 'Discover', icon: Compass },
    { id: 'personas', label: 'Personas', icon: Users },
    { id: 'studio', label: 'Dev Studio', icon: Code2 },
  ];

  const renderRows = (list: Chat[]) =>
    list.map((chat) => (
      <ChatRow
        key={chat.id}
        chat={chat}
        character={characterById.get(chat.character_id)}
        isActive={activeChatId === chat.id && activeView === 'chat'}
        isSidebarOpen={isSidebarOpen}
        onClick={() => openChat(chat.id)}
      />
    ));

  return (
    <aside
      className={`fixed bottom-4 left-4 top-4 z-30 flex flex-col overflow-hidden rounded-card border border-border bg-surface-1 shadow-card transition-[width] ${
        isSidebarOpen ? 'w-[280px]' : 'w-[76px]'
      }`}
    >
      {/* Zone 1 — Brand Header */}
      <div
        className={`flex shrink-0 items-center border-b border-border p-3 ${
          isSidebarOpen ? 'justify-between' : 'justify-center'
        }`}
      >
        {isSidebarOpen && (
          <div className="flex min-w-0 items-center gap-2">
            <img src="/favicon.svg" alt="" className="h-6 w-6 shrink-0 object-contain" />
            <span className="truncate text-heading font-semibold text-text">Renoog</span>
          </div>
        )}

        {isSidebarOpen ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleTheme}
              className={iconButton}
            >
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button
              type="button"
              aria-label="Collapse sidebar"
              onClick={toggleSidebar}
              className={iconButton}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button type="button" aria-label="Expand sidebar" onClick={toggleSidebar} className={iconButton}>
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Zone 2 — Primary Action (the one solid-filled element in the sidebar, per spec) */}
      <div className="shrink-0 px-3 pt-3">
        <button
          type="button"
          onClick={handleNewChat}
          aria-label="New chat"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-control bg-accent text-body font-semibold text-on-accent transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {isSidebarOpen && <span>New chat</span>}
        </button>
      </div>

      {/* Zone 3 — Navigation */}
      <nav className="flex shrink-0 flex-col gap-1 px-3 pt-3">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveView(item.id)}
              className={`flex h-9 items-center gap-3 rounded-control px-3 text-body transition-colors ${
                isSidebarOpen ? '' : 'justify-center'
              } ${
                isActive
                  ? 'bg-accent-quiet text-text'
                  : 'text-text-dim hover:bg-surface-2 hover:text-text'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {isSidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Zone 4 — Search */}
      {isSidebarOpen && (
        <div className="shrink-0 px-3 pt-3">
          <label className="flex h-9 items-center gap-2 rounded-control border border-border bg-bg px-3 transition-colors focus-within:border-border-hover">
            <Search className="h-4 w-4 shrink-0 text-text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
              className="w-full bg-transparent text-small text-text outline-none placeholder:text-text-faint"
            />
          </label>
        </div>
      )}

      {/* Zone 5 — Chat List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-4">
        {pinnedChats.length > 0 && (
          <section className="mb-4">
            {isSidebarOpen && <SectionLabel>Pinned</SectionLabel>}
            <div className="flex flex-col gap-1">{renderRows(pinnedChats)}</div>
          </section>
        )}

        {recentChats.length > 0 && (
          <section>
            {isSidebarOpen && pinnedChats.length > 0 && <SectionLabel>Recent</SectionLabel>}
            <div className="flex flex-col gap-1">{renderRows(recentChats)}</div>
          </section>
        )}

        {filteredChats.length === 0 && isSidebarOpen && (
          <p className="px-2 py-8 text-center text-small text-text-faint">
            {search ? 'No chats match that search' : 'No chats yet'}
          </p>
        )}
      </div>

      {/* Zone 6 — Footer */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-border p-3">
        <button
          type="button"
          aria-label="Settings"
          onClick={() => setActiveView('settings')}
          className={`flex h-9 items-center gap-3 rounded-control px-3 text-body transition-colors ${
            isSidebarOpen ? '' : 'justify-center'
          } ${
            activeView === 'settings'
              ? 'bg-accent-quiet text-text'
              : 'text-text-dim hover:bg-surface-2 hover:text-text'
          }`}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {isSidebarOpen && <span>Settings</span>}
        </button>

        {activePersona && (
          <div ref={personaRef} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={personaOpen}
              aria-label={`Persona: ${activePersona.name}`}
              onClick={() => isSidebarOpen && setPersonaOpen((v) => !v)}
              className={`flex w-full items-center gap-3 rounded-control p-2 text-left transition-colors hover:bg-surface-2 ${
                isSidebarOpen ? '' : 'justify-center'
              }`}
            >
              <Avatar src={activePersona.avatar_url} name={activePersona.name} size={32} />
              {isSidebarOpen && (
                <>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-medium text-text">{activePersona.name}</span>
                    <span className="truncate text-small text-text-dim">Your persona</span>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-dim" />
                </>
              )}
            </button>

            {personaOpen && isSidebarOpen && (
              <div
                role="listbox"
                className="absolute bottom-full left-0 right-0 z-50 mb-2 flex flex-col gap-1 rounded-control border border-border bg-surface-1 p-1 shadow-card"
              >
                {personas.map((persona) => {
                  const selected = persona.id === activePersonaId;
                  return (
                    <button
                      key={persona.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        setActivePersona(persona.id);
                        setPersonaOpen(false);
                      }}
                      className={`flex items-center gap-3 rounded-control p-2 text-left transition-colors ${
                        selected ? 'bg-accent-quiet' : 'hover:bg-surface-2'
                      }`}
                    >
                      <Avatar src={persona.avatar_url} name={persona.name} size={28} />
                      <span className="min-w-0 flex-1 truncate text-body text-text">{persona.name}</span>
                      {selected && <Check className="h-4 w-4 shrink-0 text-text" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <h3 className="meta px-2 pb-2 text-text-faint">{children}</h3>
);

interface ChatRowProps {
  chat: Chat;
  character?: Character;
  isActive: boolean;
  isSidebarOpen: boolean;
  onClick: () => void;
}

/**
 * Zone 5 chat row: 64px avatar (character presence), 13px name, 11px mono
 * timestamp, 12px two-line preview. Collapsed rail shows a 40px avatar only.
 *
 * Meta text is --text-faint at rest, but steps up to --text-dim on hover
 * (--surface-2) and when selected (--accent-quiet), where faint fails AA.
 */
const ChatRow = ({ chat, character, isActive, isSidebarOpen, onClick }: ChatRowProps) => {
  const name = character?.name || chat.title;
  const metaTone = isActive ? 'text-text-dim' : 'text-text-faint group-hover:text-text-dim';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'true' : undefined}
      aria-label={isSidebarOpen ? undefined : name}
      title={isSidebarOpen ? undefined : name}
      className={`group flex w-full items-center gap-3 rounded-control p-1 text-left transition-colors ${
        isSidebarOpen ? 'pr-2' : 'justify-center'
      } ${isActive ? 'bg-accent-quiet' : 'hover:bg-surface-2'}`}
    >
      <Avatar src={character?.avatar_url} name={name} size={isSidebarOpen ? 64 : 40} />

      {isSidebarOpen && (
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-body font-semibold text-text">{name}</span>
            <span className={`meta flex shrink-0 items-center gap-1 transition-colors ${metaTone}`}>
              {chat.is_pinned && <Pin aria-label="Pinned" className="h-3 w-3" />}
              {formatRelativeTime(chat.updated_at)}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-small text-text-dim">{chat.title}</p>
        </div>
      )}
    </button>
  );
};
