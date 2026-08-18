import React, { useState } from 'react';
import { Search, MessageSquare, Sparkles, Tag, Plus, Upload } from 'lucide-react';
import { useChatStore } from '../../stores/useChatStore';
import type { Character } from '../../types';

const GENRE_TAGS = [
  'All',
  'Fantasy',
  'Sci-Fi',
  'Cyberpunk',
  'Mystery',
  'Magic',
  'Detective',
];

export const CharacterGallery: React.FC = () => {
  const { characters, createNewChat } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  // Filter characters based on search query and selected genre tags
  const filteredCharacters = characters.filter((char) => {
    const matchesTag =
      selectedTag === 'All' ||
      char.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === '' ||
      char.name.toLowerCase().includes(query) ||
      char.tagline.toLowerCase().includes(query) ||
      char.tags.some((t) => t.toLowerCase().includes(query));

    return matchesTag && matchesSearch;
  });

  const handleStartChat = (characterId: string) => {
    createNewChat(characterId);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#121214] text-zinc-100 p-6 md:p-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl w-full mx-auto mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Discover Characters
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            Choose an AI companion to embark on an interactive roleplay journey
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1e1e22] hover:bg-[#27272a] border border-[#2e2e36] text-xs font-medium text-zinc-300 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Import Card</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create Character</span>
          </button>
        </div>
      </div>

      {/* Controls: Search & Tag Filter Pills */}
      <div className="max-w-7xl w-full mx-auto mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search characters by name, tagline, or genre..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 text-sm text-zinc-200 placeholder-zinc-400 outline-none transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {GENRE_TAGS.map((tag) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                  isActive
                    ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-[#18181b] border border-[#27272a] text-zinc-400 hover:text-zinc-200 hover:border-[#3f3f46]'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Character Cards Grid */}
      <div className="max-w-7xl w-full mx-auto">
        {filteredCharacters.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCharacters.map((character: Character) => (
              <div
                key={character.id}
                className="group relative flex flex-col rounded-2xl bg-[#18181b] border border-[#27272a] hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden"
              >
                {/* Image Container with Vignette */}
                <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-900">
                  <img
                    src={character.avatar_url}
                    alt={character.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#18181b] via-[#18181b]/30 to-transparent" />

                  {/* Primary Tag Badge */}
                  {character.tags[0] && (
                    <span className="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-semibold bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-indigo-400" />
                      {character.tags[0]}
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="flex-1 flex flex-col p-4 -mt-6 relative z-10">
                  <h3 className="font-bold text-base text-white group-hover:text-indigo-400 transition-colors truncate">
                    {character.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 mb-3 line-clamp-2 leading-relaxed">
                    {character.tagline}
                  </p>

                  <div className="mt-auto pt-3 border-t border-[#232326] flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 truncate">
                      by {character.creator}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleStartChat(character.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No characters found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-4">
              We couldn't find any characters matching "{searchQuery}". Try searching for something else or clearing your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('All');
              }}
              className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#323236] text-xs font-medium text-zinc-200 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
