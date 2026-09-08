import { useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { useUIStore } from './stores/useUIStore';
import { useChatStore } from './stores/useChatStore';
import { useSettingsStore } from './components/settings/UseSettingsStore';

/**
 * TEMPORARY test harness — not the real app UI.
 * Purpose: verify the wiring chain works end to end before building
 * the actual components on top of it.
 */
function App() {
  const { theme, toggleTheme } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const { chats, isLoading, loadChats } = useChatStore();
  const { selected_model, provider, updateSettings, getActiveModel } = useSettingsStore();

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] p-8 space-y-6">
      <h1 className="text-xl font-bold">frontend-v2 wiring test</h1>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--surface-0)] text-sm font-semibold"
        >
          Toggle theme (currently: {theme})
        </button>

        <button
          onClick={toggleSidebar}
          className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-default)] text-sm"
        >
          Toggle sidebar flag (currently: {isSidebarOpen ? 'open' : 'closed'})
        </button>
      </div>

      <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border-default)] space-y-2">
        <h2 className="font-semibold">Settings store (persists to localStorage)</h2>
        <p className="text-sm">Provider: <strong>{provider}</strong></p>
        <p className="text-sm">Selected model: <strong>{selected_model}</strong></p>
        <p className="text-sm">Resolved active model: <strong>{getActiveModel()}</strong></p>
        <button
          onClick={() => updateSettings({ selected_model: 'meta-llama/llama-3.3-70b-instruct' })}
          className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-default)] text-sm"
        >
          Change model (then refresh page — should persist)
        </button>
      </div>

      <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border-default)]">
        <h2 className="font-semibold mb-2">Chats from backend (GET /api/v1/chats)</h2>
        {isLoading ? (
          <p className="text-[var(--text-secondary)] text-sm">Loading...</p>
        ) : chats.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-sm">
            No chats returned — either backend isn't running, or DB is empty.
          </p>
        ) : (
          <ul className="text-sm space-y-1">
            {chats.map((c) => (
              <li key={c.id}>
                {c.title} — <span className="text-[var(--text-secondary)]">{c.id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;