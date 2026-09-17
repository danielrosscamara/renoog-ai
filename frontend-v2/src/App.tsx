import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTheme } from './hooks/useTheme';
import { useUIStore } from './stores/useUIStore';
import { useChatStore } from './stores/useChatStore';
import { useCharacterStore } from './stores/useCharacterStore';
import { usePersonaStore } from './stores/usePersonaStore';
import { Sidebar } from './components/layout/Sidebar';
import { CharacterCard } from './components/character/CharacterCard';
import { MessageBubble } from './components/chat/MessageBubble';
import { fixtureCharacters, fixtureChats, fixturePersonas, fixtureTurns } from './dev/fixtures';

/**
 * TEMPORARY design harness — not the real app shell.
 * Renders build-order steps 1–4 from the UI brief (sidebar chat row,
 * character card, message thread, light mode) against live stores, seeding
 * dev fixtures when the backend returns nothing.
 */
function App() {
  useTheme();
  const { isSidebarOpen, activeView, setActiveView } = useUIStore(
    useShallow((s) => ({
      isSidebarOpen: s.isSidebarOpen,
      activeView: s.activeView,
      setActiveView: s.setActiveView,
    }))
  );
  const { chats, activeChatId, messageTurns, streamingChatIds, loadChats } = useChatStore(
    useShallow((s) => ({
      chats: s.chats,
      activeChatId: s.activeChatId,
      messageTurns: s.messageTurns,
      streamingChatIds: s.streamingChatIds,
      loadChats: s.loadChats,
    }))
  );
  const { characters, loadCharacters } = useCharacterStore(
    useShallow((s) => ({ characters: s.characters, loadCharacters: s.loadCharacters }))
  );
  const { personas, loadPersonas } = usePersonaStore(
    useShallow((s) => ({ personas: s.personas, loadPersonas: s.loadPersonas }))
  );

  useEffect(() => {
    Promise.all([loadChats(), loadCharacters(), loadPersonas()]).then(() => {
      if (!import.meta.env.DEV) return;
      if (useChatStore.getState().chats.length === 0) {
        useChatStore.setState({ chats: fixtureChats, messageTurns: fixtureTurns, activeChatId: 'chat_1' });
      }
      if (useCharacterStore.getState().characters.length === 0) {
        useCharacterStore.setState({ characters: fixtureCharacters });
      }
      if (usePersonaStore.getState().personas.length === 0) {
        usePersonaStore.setState({ personas: fixturePersonas, activePersonaId: 'persona_rin' });
      }
    });
  }, [loadChats, loadCharacters, loadPersonas]);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const character = characters.find((c) => c.id === activeChat?.character_id);
  const turns = activeChatId ? messageTurns[activeChatId] || [] : [];

  return (
    <div className="min-h-screen bg-bg text-text">
      <Sidebar />

      <main
        className={`min-h-screen pb-16 pr-8 pt-8 transition-[padding] ${
          isSidebarOpen ? 'pl-[328px]' : 'pl-[124px]'
        }`}
      >
        {activeView === 'gallery' ? (
          <section>
            <h1 className="mb-6 text-heading font-semibold text-text">Discover</h1>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {characters.map((c) => (
                <CharacterCard key={c.id} character={c} onSelect={() => setActiveView('chat')} />
              ))}
            </div>
          </section>
        ) : activeView === 'chat' && activeChat ? (
          <section className="mx-auto flex max-w-[720px] flex-col gap-8">
            <header className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
              <h1 className="truncate text-heading font-semibold text-text">{activeChat.title}</h1>
              <span className="meta shrink-0 text-text-faint">{activeChat.model_name}</span>
            </header>
            {turns.map((turn) => {
              const persona = personas.find((p) => p.id === turn.persona_id);
              const isUser = turn.role === 'user';
              return (
                <MessageBubble
                  key={turn.id}
                  turn={turn}
                  authorName={isUser ? persona?.name || 'You' : character?.name || 'Character'}
                  authorAvatarUrl={isUser ? persona?.avatar_url : character?.avatar_url}
                  isStreaming={Boolean(streamingChatIds[turn.chat_id]) && turn === turns[turns.length - 1]}
                  onRegenerate={() => {}}
                />
              );
            })}
          </section>
        ) : (
          <p className="pt-16 text-center text-body text-text-faint">
            {activeView === 'chat' ? 'Pick a chat from the sidebar.' : `“${activeView}” isn't built yet.`}
          </p>
        )}
      </main>
    </div>
  );
}

export default App;
