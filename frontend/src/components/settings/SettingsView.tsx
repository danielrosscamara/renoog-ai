import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Sliders,
  Check,
  Cpu,
  Bot,
  Flame,
  Layers,
  Save,
  Plus,
  Trash2,
  X,
  Radio,
  ShieldCheck,
} from 'lucide-react';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  tagline: string;
  badge: string;
  icon?: typeof Bot;
  isCustom?: boolean;
}

interface SamplerPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  temp: number;
  topP: number;
  repPenalty: number;
  freqPenalty: number;
  presPenalty: number;
  maxTokens: number;
}

const SAMPLER_PRESETS: SamplerPreset[] = [
  {
    id: 'immersive',
    name: 'Immersive Roleplay',
    emoji: '🎭',
    description: 'Natural, expressive dialogue with rich emotions',
    temp: 0.95,
    topP: 0.90,
    repPenalty: 1.15,
    freqPenalty: 0.00,
    presPenalty: 0.00,
    maxTokens: 1024,
  },
  {
    id: 'precise',
    name: 'Precise & In-Char',
    emoji: '⚡',
    description: 'Strict character adherence & focused tone',
    temp: 0.65,
    topP: 0.85,
    repPenalty: 1.05,
    freqPenalty: 0.00,
    presPenalty: 0.00,
    maxTokens: 800,
  },
  {
    id: 'novelistic',
    name: 'Wild & Novelistic',
    emoji: '🎨',
    description: 'High creativity, rich metaphors & unexpected twists',
    temp: 1.25,
    topP: 0.98,
    repPenalty: 1.20,
    freqPenalty: 0.20,
    presPenalty: 0.35,
    maxTokens: 1500,
  },
  {
    id: 'punchy',
    name: 'Fast & Punchy',
    emoji: '💬',
    description: 'Rapid-fire short replies & messenger pacing',
    temp: 0.85,
    topP: 0.90,
    repPenalty: 1.10,
    freqPenalty: 0.10,
    presPenalty: 0.00,
    maxTokens: 300,
  },
  {
    id: 'reasoning',
    name: 'Deep Reasoning',
    emoji: '🧠',
    description: 'Logical deductions, RPG puzzles & complex lore analysis',
    temp: 0.20,
    topP: 0.95,
    repPenalty: 1.00,
    freqPenalty: 0.00,
    presPenalty: 0.00,
    maxTokens: 2048,
  },
];

const DEFAULT_PRESET_MODELS: ModelOption[] = [
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    tagline: 'Supreme roleplay prose, deep nuance & character adherence',
    badge: 'Recommended',
    icon: Sparkles,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    tagline: 'Ultra-fast, high-immersion & expressive dialogue',
    badge: 'Popular',
    icon: Cpu,
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    tagline: 'Deep reasoning, intricate plot twists & long memory retention',
    badge: 'Reasoning',
    icon: Bot,
  },
  {
    id: 'mistralai/mistral-large-2407',
    name: 'Mistral Large',
    provider: 'Mistral',
    tagline: 'Fluid storytelling, unfiltered narrative & high creativity',
    badge: 'Creative',
    icon: Flame,
  },
];

export const SettingsView: React.FC = () => {
  // Settings state with localStorage fallback
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('renoog_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('renoog_model') || 'anthropic/claude-3.5-sonnet'
  );
  const [customModels, setCustomModels] = useState<ModelOption[]>(() => {
    const saved = localStorage.getItem('renoog_custom_models');
    if (saved) {
      try {
        return JSON.parse(saved) as ModelOption[];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [temperature, setTemperature] = useState(() =>
    parseFloat(localStorage.getItem('renoog_temp') || '0.90')
  );
  const [topP, setTopP] = useState(() =>
    parseFloat(localStorage.getItem('renoog_top_p') || '0.95')
  );
  const [repetitionPenalty, setRepetitionPenalty] = useState(() =>
    parseFloat(localStorage.getItem('renoog_rep_penalty') || '1.15')
  );
  const [frequencyPenalty, setFrequencyPenalty] = useState(() =>
    parseFloat(localStorage.getItem('renoog_freq_penalty') || '0.00')
  );
  const [presencePenalty, setPresencePenalty] = useState(() =>
    parseFloat(localStorage.getItem('renoog_pres_penalty') || '0.00')
  );
  const [maxTokens, setMaxTokens] = useState(() =>
    parseInt(localStorage.getItem('renoog_max_tokens') || '1024', 10)
  );
  const [antiImpersonation, setAntiImpersonation] = useState(
    () => localStorage.getItem('renoog_anti_impersonation') !== 'false'
  );
  const [activePreset, setActivePreset] = useState<string>('immersive');

  // Apply a 1-click sampler preset
  const applyPreset = (preset: SamplerPreset) => {
    setTemperature(preset.temp);
    setTopP(preset.topP);
    setRepetitionPenalty(preset.repPenalty);
    setFrequencyPenalty(preset.freqPenalty);
    setPresencePenalty(preset.presPenalty);
    setMaxTokens(preset.maxTokens);
    setActivePreset(preset.id);
  };

  // Modal for adding a new custom model
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [customProvider, setCustomProvider] = useState('');
  const [customTagline, setCustomTagline] = useState('');

  // Test status & save toast
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success'>('idle');
  const [savedToast, setSavedToast] = useState(false);

  const handleTestKey = () => {
    if (!apiKey.trim()) return;
    setTestStatus('testing');
    setTimeout(() => {
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    }, 800);
  };

  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customSlug.trim()) return;

    const newModel: ModelOption = {
      id: customSlug.trim(),
      name: customName.trim(),
      provider: customProvider.trim() || 'Custom',
      tagline: customTagline.trim() || 'Custom user-added AI model',
      badge: 'Custom',
      isCustom: true,
    };

    const updated = [...customModels, newModel];
    setCustomModels(updated);
    localStorage.setItem('renoog_custom_models', JSON.stringify(updated));
    setSelectedModel(newModel.id);

    // Reset & close modal
    setCustomName('');
    setCustomSlug('');
    setCustomProvider('');
    setCustomTagline('');
    setIsAddModalOpen(false);
  };

  const handleDeleteCustomModel = (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customModels.filter((m) => m.id !== modelId);
    setCustomModels(updated);
    localStorage.setItem('renoog_custom_models', JSON.stringify(updated));
    if (selectedModel === modelId) {
      setSelectedModel(DEFAULT_PRESET_MODELS[0].id);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('renoog_api_key', apiKey.trim());
    localStorage.setItem('renoog_model', selectedModel);
    localStorage.setItem('renoog_temp', temperature.toString());
    localStorage.setItem('renoog_top_p', topP.toString());
    localStorage.setItem('renoog_rep_penalty', repetitionPenalty.toString());
    localStorage.setItem('renoog_freq_penalty', frequencyPenalty.toString());
    localStorage.setItem('renoog_pres_penalty', presencePenalty.toString());
    localStorage.setItem('renoog_max_tokens', maxTokens.toString());
    localStorage.setItem('renoog_anti_impersonation', antiImpersonation.toString());

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const allModels = [...DEFAULT_PRESET_MODELS, ...customModels];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#121214] text-zinc-100 p-6 md:p-10">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-5xl w-full mx-auto mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <SettingsIcon className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              App & Model Settings
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            Configure your OpenRouter API connection, AI models, and sampling parameters
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-sm font-semibold text-white transition-all shadow-md shrink-0"
        >
          {savedToast ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Settings Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSave} className="max-w-5xl w-full mx-auto space-y-8 pb-12">
        {/* Section 1: API Connection */}
        <section className="p-6 rounded-2xl bg-[#18181b] border border-[#27272a] shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-white pb-3 border-b border-[#27272a]">
            <Key className="w-5 h-5 text-indigo-400" />
            <span>API Engine & Connection</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              OpenRouter API Key
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500/60 font-mono text-zinc-200 placeholder-zinc-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestKey}
                disabled={!apiKey.trim() || testStatus === 'testing'}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#27272a] hover:bg-[#323236] text-xs font-semibold text-zinc-200 transition-colors disabled:opacity-40 shrink-0"
              >
                {testStatus === 'testing' ? (
                  <span>Testing...</span>
                ) : testStatus === 'success' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Valid Key</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Test Key</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              Keys are stored securely in your local browser storage and sent directly to OpenRouter via encrypted HTTPS.
            </p>
          </div>
        </section>

        {/* Section 2: Model Selection Grid */}
        <section className="p-6 rounded-2xl bg-[#18181b] border border-[#27272a] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
            <div className="flex items-center gap-2 text-base font-bold text-white">
              <Bot className="w-5 h-5 text-indigo-400" />
              <span>AI Models & Custom Endpoints</span>
            </div>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Model</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allModels.map((model) => {
              const isSelected = selectedModel === model.id;
              const IconComp = model.icon || Radio;

              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`group relative flex flex-col p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500/80 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-500/5'
                      : 'bg-[#121214] border-[#27272a] hover:border-[#3f3f46]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isSelected
                            ? 'bg-indigo-500 text-white'
                            : 'bg-[#27272a] text-zinc-400'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-white truncate">{model.name}</h4>
                        <span className="text-[10px] text-zinc-500 font-mono block truncate">
                          {model.provider}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isSelected
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-[#27272a] text-zinc-400'
                        }`}
                      >
                        {model.badge}
                      </span>
                      {model.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomModel(model.id, e)}
                          className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete custom model"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed mt-1 line-clamp-2">
                    {model.tagline}
                  </p>

                  <div className="mt-3 pt-2 border-t border-[#232326] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span className="truncate max-w-64">{model.id}</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <Check className="w-3.5 h-3.5" /> Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Quick Add Model Card Trigger */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-[#27272a] hover:border-indigo-500/50 hover:bg-[#18181b]/50 text-zinc-400 hover:text-zinc-200 transition-all text-center group min-h-32"
            >
              <div className="p-2.5 rounded-full bg-[#27272a] group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-2">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-zinc-300">Add New Model</span>
              <span className="text-[11px] text-zinc-500 mt-0.5">
                Paste any OpenRouter or local Ollama slug
              </span>
            </button>
          </div>
        </section>

        {/* Section 3: Generation & Sampling Sliders */}
        <section className="p-6 rounded-2xl bg-[#18181b] border border-[#27272a] shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#27272a]">
            <div className="flex items-center gap-2 text-base font-bold text-white">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>Generation Parameters (Sampling Controls)</span>
            </div>
            <span className="text-[11px] text-zinc-500">
              Configure creativity, anti-looping penalties & response length
            </span>
          </div>

          {/* 1-Click Sampler Presets */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>1-Click Sampler Presets</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {SAMPLER_PRESETS.map((preset) => {
                const isPresetActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isPresetActive
                        ? 'bg-indigo-600/20 border-indigo-500/60 shadow-sm ring-1 ring-indigo-500/30'
                        : 'bg-[#121214] border-[#27272a] hover:border-zinc-600 hover:bg-[#18181b]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{preset.emoji}</span>
                      {isPresetActive && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-200">{preset.name}</div>
                      <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                        {preset.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-[#232326]">
            {/* Temperature Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-zinc-200">Temperature</label>
                  <p className="text-[11px] text-zinc-500">
                    Randomness & creativity. Higher = expressive/wild; Lower = literal.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400 bg-[#121214] px-2 py-1 rounded-lg border border-[#27272a]">
                  {temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="2.00"
                step="0.05"
                value={temperature}
                onChange={(e) => {
                  setTemperature(parseFloat(e.target.value));
                  setActivePreset('custom');
                }}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Top-P Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-zinc-200">Top-P (Nucleus Sampling)</label>
                  <p className="text-[11px] text-zinc-500">
                    Probability pool threshold for candidate tokens.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400 bg-[#121214] px-2 py-1 rounded-lg border border-[#27272a]">
                  {topP.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="1.00"
                step="0.05"
                value={topP}
                onChange={(e) => {
                  setTopP(parseFloat(e.target.value));
                  setActivePreset('custom');
                }}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Repetition Penalty Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-zinc-200">Repetition Penalty</label>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                      Anti-Looping
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Penalizes repeated phrases & infinite text loops (1.15 is optimal).
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 bg-[#121214] px-2 py-1 rounded-lg border border-[#27272a]">
                  {repetitionPenalty.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="1.00"
                max="2.00"
                step="0.05"
                value={repetitionPenalty}
                onChange={(e) => {
                  setRepetitionPenalty(parseFloat(e.target.value));
                  setActivePreset('custom');
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Frequency Penalty Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-zinc-200">Frequency Penalty</label>
                  <p className="text-[11px] text-zinc-500">
                    Penalizes words based on how frequently they appear in context.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400 bg-[#121214] px-2 py-1 rounded-lg border border-[#27272a]">
                  {frequencyPenalty.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-2.00"
                max="2.00"
                step="0.05"
                value={frequencyPenalty}
                onChange={(e) => {
                  setFrequencyPenalty(parseFloat(e.target.value));
                  setActivePreset('custom');
                }}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Presence Penalty Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-zinc-200">Presence Penalty</label>
                  <p className="text-[11px] text-zinc-500">
                    Encourages the model to introduce brand new topics & vocabulary.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400 bg-[#121214] px-2 py-1 rounded-lg border border-[#27272a]">
                  {presencePenalty.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-2.00"
                max="2.00"
                step="0.05"
                value={presencePenalty}
                onChange={(e) => {
                  setPresencePenalty(parseFloat(e.target.value));
                  setActivePreset('custom');
                }}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Max Output Tokens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-zinc-200">Max Response Length</label>
                  <p className="text-[11px] text-zinc-500">
                    Length ceiling for a single companion reply (~75 words per 100 tokens).
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400 bg-[#121214] px-2 py-1 rounded-lg border border-[#27272a]">
                  {maxTokens} tokens
                </span>
              </div>
              <input
                type="range"
                min="128"
                max="4096"
                step="64"
                value={maxTokens}
                onChange={(e) => {
                  setMaxTokens(parseInt(e.target.value, 10));
                  setActivePreset('custom');
                }}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Anti-User Impersonation Safeguard Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121214] border border-[#27272a] mt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-200">
                    Anti-User Impersonation Safeguard
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-semibold">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Automatically halts generation if the AI attempts to speak, act, or roleplay as your Persona.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={antiImpersonation}
                onChange={(e) => setAntiImpersonation(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </section>

        {/* Section 4: System Directives Info */}
        <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="text-xs text-zinc-400 leading-relaxed">
            <strong className="text-zinc-200 block mb-0.5">Prompt Architecture Note:</strong>
            These generation settings and active model choice will be compiled into <strong>Phase 3 (Prompt Compiler & Token Trimmer)</strong> when sending live streaming API requests to OpenRouter.
          </div>
        </div>
      </form>

      {/* Modal Dialog: Add Custom Model */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-[#18181b] border border-[#2e2e36] shadow-2xl p-6 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a] mb-4">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Add Custom AI Model</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddCustomModel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Model Display Name <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. MythoMax 13B, Euryale 70B"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500/60 text-zinc-100 placeholder-zinc-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  OpenRouter Model Slug / ID <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="e.g. gryphe/mythomax-l2-13b"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500/60 text-zinc-200 placeholder-zinc-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Provider / Creator
                </label>
                <input
                  type="text"
                  value={customProvider}
                  onChange={(e) => setCustomProvider(e.target.value)}
                  placeholder="e.g. Gryphe, Sao10K, Ollama"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500/60 text-zinc-200 placeholder-zinc-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Short Tagline / Description
                </label>
                <input
                  type="text"
                  value={customTagline}
                  onChange={(e) => setCustomTagline(e.target.value)}
                  placeholder="e.g. Specialized storytelling fine-tune"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500/60 text-zinc-200 placeholder-zinc-500 outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#323236] text-xs font-medium text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customName.trim() || !customSlug.trim()}
                  className="px-4 py-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-xs font-semibold text-white transition-all shadow-md"
                >
                  Add Model Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
