import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { useChatStore } from './stores/useChatStore';
export const App: React.FC = () => {
  const { activeChatId, chats, characters, activeView } = useChatStore();
  const currentChat = chats.find((c) => c.id === activeChatId);
  const currentChar = characters.find((c) => c.id === currentChat?.character_id);
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121214] text-zinc-100">
      {/* 1. Collapsible Sidebar */}
      <Sidebar />
      {/* 2. Main Stage Preview Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#121214]">
        <div className="max-w-md p-6 rounded-2xl bg-[#18181b] border border-[#27272a] shadow-xl">
          <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20">
            Active View: {activeView.toUpperCase()}
          </span>
          <h1 className="text-xl font-bold text-white mb-1">
            {currentChar ? currentChar.name : 'Select a Chat'}
          </h1>
          <p className="text-sm text-zinc-400 mb-4">
            {currentChat ? currentChat.title : 'No chat selected'}
          </p>
          <div className="text-xs text-zinc-400 bg-[#121214] p-3 rounded-lg border border-[#27272a]">
            👈 Test the sidebar: click <strong>New Chat</strong>, <strong>Discover</strong>, <strong>Personas</strong>, or the <strong>Collapse (◀)</strong> button!
          </div>
        </div>
      </main>
    </div>
  );
};
export default App;
