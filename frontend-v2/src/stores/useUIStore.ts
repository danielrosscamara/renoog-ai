import { create } from 'zustand';
import type { Theme, ViewType } from '../types';

interface UIState {
    theme: Theme;
    isSidebarOpen: boolean;
    isRightSidebarOpen: boolean;
    activeView: ViewType;

    toggleTheme: () => void;
    toggleSidebar: () => void;
    toggleRightSidebar: () => void;
    setActiveView: (view: ViewType) => void;
}

const readStoredTheme = (): Theme => {
    const stored = localStorage.getItem('renoog_theme');
    return stored === 'light' ? 'light' : 'dark';
};

export const useUIStore = create<UIState>((set) => ({
    theme: readStoredTheme(),
    isSidebarOpen: true,
    isRightSidebarOpen: localStorage.getItem('renoog_right_sidebar') !== 'false',
    activeView: 'chat',

    toggleTheme: () => set((state) => {
        const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('renoog_theme', next);
        return { theme: next };
    }),

    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    toggleRightSidebar: () => 
        set((state) => {
            const next = !state.isRightSidebarOpen;
            localStorage.setItem('renoog_right_sidebar', String(next));
            return { isRightSidebarOpen: next };
        }),

    setActiveView: (view) => set({ activeView: view })
}));