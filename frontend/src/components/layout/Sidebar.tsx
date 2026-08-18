import React from 'react';
import {
  MessageSquarePlus,
  Compass,
  UserCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Pin,
  Sparkles
} from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';

export const Sidebar: React.FC = () => {
  const {
    chats,
    characters,
    personas,
    activeChatId,
    activePersonaId,
    activeView,
    isSidebarOpen,
    setActiveChat,
    setActiveView,
    toggleSidebar,
  } = useChatStore();

  const activePersona = personas.find((p) => p.id === activePersonaId) || personas[0];

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

      {/* Zone 2: Primary Action — New Chat */}
      <div className="p-3">
        <button
          onClick={() => setActiveView('gallery')}
          className={`flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-md transition-all ${
            !isSidebarOpen ? 'px-0' : ''
          }`}
        >
          <MessageSquarePlus className="w-5 h-5 shrink-0" />
          {isSidebarOpen && <span>New Chat</span>}
        </button>
      </div>

      {/* Zone 3: Navigation Links */}
      <div className="px-3 py-1 space-y-1">
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

      {/* Zone 4: Scrollable Recent Chats */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {isSidebarOpen && (
          <div className="px-2 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Recent Chats
          </div>
        )}

        {chats.map((chat) => {
          const char = characters.find((c) => c.id === chat.character_id);
          const isActive = activeChatId === chat.id && activeView === 'chat';

          return (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`flex items-center gap-3 w-full p-2 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-[#27272a] text-white ring-1 ring-blue-500/50'
                  : 'text-zinc-300 hover:bg-[#202024] hover:text-white'
              }`}
            >
              <img
                src={char?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={char?.name || 'Character Avatar'}
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-zinc-700"
              />
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate text-zinc-200">
                      {char?.name || chat.title}
                    </span>
                    {chat.is_pinned && (
                      <Pin className="w-3 h-3 text-blue-400 fill-blue-400 shrink-0 ml-1" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{chat.title}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Zone 5: Footer — Settings & Active Persona Badge */}
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

        {isSidebarOpen && activePersona && (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-[#202024] border border-[#2e2e36] mt-2">
            <img
              src={activePersona.avatar_url}
              alt={activePersona.name}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500/50 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="block text-xs font-bold text-zinc-200 truncate">
                {activePersona.name}
              </span>
              <span className="block text-[10px] text-emerald-400">Active Persona</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
