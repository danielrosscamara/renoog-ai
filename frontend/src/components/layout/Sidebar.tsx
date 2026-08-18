import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquarePlus,
  Compass,
  UserCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Pin,
  Sparkles,
  Search,
  MoreHorizontal,
  Trash2,
  PenLine,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import type { Chat } from '../../types';

// ─── Context Menu ───────────────────────────────────────────────────────────
interface ChatContextMenuProps {
  chat: Chat;
  onClose: () => void;
}

const ChatContextMenu: React.FC<ChatContextMenuProps> = ({ chat, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-2 top-8 z-50 w-44 rounded-xl bg-[#27272a] border border-[#3f3f46] shadow-xl py-1"
    >
      <button
        onClick={onClose}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-[#3f3f46] hover:text-white transition-colors"
      >
        <PenLine className="w-4 h-4 text-zinc-400" />
        Rename
      </button>
      <button
        onClick={onClose}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-[#3f3f46] hover:text-white transition-colors"
      >
        <Pin className="w-4 h-4 text-zinc-400" />
        {chat.is_pinned ? 'Unpin' : 'Pin Chat'}
      </button>
      <div className="my-1 border-t border-[#3f3f46]" />
      <button
        onClick={onClose}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete Chat
      </button>
    </div>
  );
};

// ─── Chat List Item ──────────────────────────────────────────────────────────
interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  characterName: string | undefined;
  characterAvatar: string | undefined;
  isSidebarOpen: boolean;
  onClick: () => void;
}

const ChatItem: React.FC<ChatItemProps> = ({
  chat,
  isActive,
  characterName,
  characterAvatar,
  isSidebarOpen,
  onClick,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
    >
      <button
        onClick={onClick}
        className={`flex items-center gap-3 w-full p-2 rounded-xl text-left transition-all ${
          isActive
            ? 'bg-[#27272a] text-white ring-1 ring-blue-500/50'
            : 'text-zinc-300 hover:bg-[#202024] hover:text-white'
        }`}
      >
        <div className="relative shrink-0">
          <img
            src={characterAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt={characterName || 'Character Avatar'}
            className="w-9 h-9 rounded-full object-cover ring-1 ring-zinc-700"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-[#18181b]" />
        </div>

        {isSidebarOpen && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-semibold text-sm truncate text-zinc-200">
                {characterName || chat.title}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {chat.is_pinned && (
                  <Pin className="w-3 h-3 text-blue-400 fill-blue-400" />
                )}
                <span className="text-[10px] text-zinc-500">{chat.updated_at}</span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 truncate">{chat.title}</p>
          </div>
        )}
      </button>

      {/* Context Menu Trigger — shows on hover */}
      {isSidebarOpen && hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="absolute right-2 top-2.5 p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#3f3f46] transition-colors z-10"
          aria-label="Chat options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}

      {menuOpen && (
        <ChatContextMenu chat={chat} onClose={() => setMenuOpen(false)} />
      )}
    </div>
  );
};

// ─── Main Sidebar ────────────────────────────────────────────────────────────
export const Sidebar: React.FC = () => {
  const {
    chats,
    characters,
    personas,
    activeChatId,
    activeCharacterId,
    activePersonaId,
    activeView,
    isSidebarOpen,
    setActiveChat,
    setActiveView,
    setActivePersona,
    createNewChat,
    toggleSidebar,
  } = useChatStore();

  const [search, setSearch] = useState('');
  const [personaOpen, setPersonaOpen] = useState(false);
  const personaRef = useRef<HTMLDivElement>(null);

  const handleNewChat = () => {
    const targetCharId = activeCharacterId || characters[0]?.id;
    if (targetCharId) {
      createNewChat(targetCharId);
    }
  };

  // Close persona popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) {
        setPersonaOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activePersona = personas.find((p) => p.id === activePersonaId) || personas[0];

  // Filter chats by search query
  const filteredChats = chats.filter((chat) => {
    const char = characters.find((c) => c.id === chat.character_id);
    const query = search.toLowerCase();
    return (
      chat.title.toLowerCase().includes(query) ||
      (char?.name.toLowerCase().includes(query) ?? false)
    );
  });

  const pinnedChats = filteredChats.filter((c) => c.is_pinned);
  const recentChats = filteredChats.filter((c) => !c.is_pinned);

  return (
    <aside
      className={`relative flex flex-col h-screen bg-[#18181b] border-r border-[#27272a] transition-all duration-300 ease-in-out z-20 ${
        isSidebarOpen ? 'w-72' : 'w-18'
      }`}
    >
      {/* Zone 1: Brand Header & Collapse Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 shadow-md shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight text-white truncate">
                Renoog AI
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">
                Interactive Storytelling
              </span>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
        >
          {isSidebarOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Zone 2: Primary Action — New Chat with current character */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className={`flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-md transition-all ${
            !isSidebarOpen ? 'px-0' : ''
          }`}
        >
          <MessageSquarePlus className="w-5 h-5 shrink-0" />
          {isSidebarOpen && <span>New Chat</span>}
        </button>
      </div>

      {/* Zone 3: Navigation Links */}
      <div className="px-3 pb-2 space-y-1">
        <button
          onClick={() => setActiveView('gallery')}
          className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeView === 'gallery'
              ? 'bg-[#27272a] text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#202024]'
          }`}
        >
          <Compass className="w-5 h-5 shrink-0 text-indigo-400" />
          {isSidebarOpen && <span>Discover</span>}
        </button>

        <button
          onClick={() => setActiveView('personas')}
          className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeView === 'personas'
              ? 'bg-[#27272a] text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#202024]'
          }`}
        >
          <UserCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          {isSidebarOpen && <span>Personas</span>}
        </button>
      </div>

      {/* Zone 4: Search Bar (Expanded only) */}
      {isSidebarOpen && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#121214] border border-[#27272a] focus-within:border-blue-500/50 transition-colors">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* Zone 4B: Scrollable Chat Lists */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1">

        {/* Pinned Chats */}
        {pinnedChats.length > 0 && (
          <>
            {isSidebarOpen && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <Pin className="w-3 h-3 text-blue-400 fill-blue-400" />
                Pinned
              </div>
            )}
            {pinnedChats.map((chat) => {
              const char = characters.find((c) => c.id === chat.character_id);
              return (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={activeChatId === chat.id && activeView === 'chat'}
                  characterName={char?.name}
                  characterAvatar={char?.avatar_url}
                  isSidebarOpen={isSidebarOpen}
                  onClick={() => setActiveChat(chat.id)}
                />
              );
            })}
          </>
        )}

        {/* Recent Chats */}
        {recentChats.length > 0 && (
          <>
            {isSidebarOpen && (
              <div className="px-2 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Recent
              </div>
            )}
            {recentChats.map((chat) => {
              const char = characters.find((c) => c.id === chat.character_id);
              return (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={activeChatId === chat.id && activeView === 'chat'}
                  characterName={char?.name}
                  characterAvatar={char?.avatar_url}
                  isSidebarOpen={isSidebarOpen}
                  onClick={() => setActiveChat(chat.id)}
                />
              );
            })}
          </>
        )}

        {/* Empty State */}
        {filteredChats.length === 0 && isSidebarOpen && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-500">No conversations found</p>
            <p className="text-xs text-zinc-600 mt-1">Try a different search term</p>
          </div>
        )}
      </div>

      {/* Zone 5: Footer — Settings & Persona Switcher */}
      <div className="p-3 border-t border-[#27272a] space-y-1">
        <button
          onClick={() => setActiveView('settings')}
          className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeView === 'settings'
              ? 'bg-[#27272a] text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#202024]'
          }`}
        >
          <Settings className="w-5 h-5 shrink-0 text-zinc-400" />
          {isSidebarOpen && <span>Settings</span>}
        </button>

        {/* Persona Switcher */}
        {activePersona && (
          <div ref={personaRef} className="relative mt-1">
            <button
              onClick={() => setPersonaOpen((v) => !v)}
              className="flex items-center gap-3 w-full p-2 rounded-xl bg-[#202024] border border-[#2e2e36] hover:border-[#3f3f46] transition-colors group"
            >
              <img
                src={activePersona.avatar_url}
                alt={activePersona.name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500/50 shrink-0"
              />
              {isSidebarOpen && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="block text-xs font-bold text-zinc-200 truncate">
                      {activePersona.name}
                    </span>
                    <span className="block text-[10px] text-emerald-400">Active Persona</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                      personaOpen ? 'rotate-180' : ''
                    }`}
                  />
                </>
              )}
            </button>

            {/* Persona Popover */}
            {personaOpen && isSidebarOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl bg-[#27272a] border border-[#3f3f46] shadow-xl py-1 z-50">
                <div className="px-3 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Switch Persona
                </div>
                {personas.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => {
                      setActivePersona(persona.id);
                      setPersonaOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 hover:bg-[#3f3f46] transition-colors"
                  >
                    <img
                      src={persona.avatar_url}
                      alt={persona.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <span className="block text-sm text-zinc-200 truncate font-medium">
                        {persona.name}
                      </span>
                    </div>
                    {persona.id === activePersonaId && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
