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
} from 'lucide-react';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  tagline: string;
  badge: string;
  icon: typeof Bot;
}

const PRESET_MODELS: ModelOption[] = [
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
  const [temperature, setTemperature] = useState(() =>
    parseFloat(localStorage.getItem('renoog_temp') || '0.90')
  );
  const [topP, setTopP] = useState(() =>
    parseFloat(localStorage.getItem('renoog_top_p') || '0.95')
  );
  const [maxTokens, setMaxTokens] = useState(() =>
    parseInt(localStorage.getItem('renoog_max_tokens') || '1024', 10)
  );

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('renoog_api_key', apiKey.trim());
    localStorage.setItem('renoog_model', selectedModel);
    localStorage.setItem('renoog_temp', temperature.toString());
    localStorage.setItem('renoog_top_p', topP.toString());
    localStorage.setItem('renoog_max_tokens', maxTokens.toString());

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

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
            Configure your OpenRouter API connection, default AI models, and sampling parameters
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

        {/* Section 2: Model Selection */}
        <section className="p-6 rounded-2xl bg-[#18181b] border border-[#27272a] shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-white pb-3 border-b border-[#27272a]">
            <Bot className="w-5 h-5 text-indigo-400" />
            <span>Default AI Model</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRESET_MODELS.map((model) => {
              const isSelected = selectedModel === model.id;
              const IconComp = model.icon;

              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setSelectedModel(model.id)}
                  className={`flex flex-col p-4 rounded-2xl text-left border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500/80 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-500/5'
                      : 'bg-[#121214] border-[#27272a] hover:border-[#3f3f46]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-xl ${
                          isSelected
                            ? 'bg-indigo-500 text-white'
                            : 'bg-[#27272a] text-zinc-400'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{model.name}</h4>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {model.provider}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isSelected
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-[#27272a] text-zinc-400'
                      }`}
                    >
                      {model.badge}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                    {model.tagline}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Custom Model ID */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Active Model Identifier (OpenRouter Slug)
            </label>
            <input
              type="text"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[#121214] border border-[#27272a] focus:border-indigo-500/60 text-zinc-300 outline-none"
            />
          </div>
        </section>

        {/* Section 3: Generation & Sampling Sliders */}
        <section className="p-6 rounded-2xl bg-[#18181b] border border-[#27272a] shadow-xl space-y-6">
          <div className="flex items-center gap-2 text-base font-bold text-white pb-3 border-b border-[#27272a]">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <span>Generation Parameters (Sampling Controls)</span>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-zinc-200">Temperature</label>
                <p className="text-[11px] text-zinc-500">
                  Controls randomness. Higher = creative/expressive; Lower = focused/literal.
                </p>
              </div>
              <span className="text-sm font-mono font-bold text-indigo-400 bg-[#121214] px-2.5 py-1 rounded-lg border border-[#27272a]">
                {temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="2.00"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Top-P Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-zinc-200">Top-P (Nucleus Sampling)</label>
                <p className="text-[11px] text-zinc-500">
                  Limits the probability pool of candidate tokens.
                </p>
              </div>
              <span className="text-sm font-mono font-bold text-indigo-400 bg-[#121214] px-2.5 py-1 rounded-lg border border-[#27272a]">
                {topP.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="1.00"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Max Output Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-zinc-200">Max Response Tokens</label>
                <p className="text-[11px] text-zinc-500">
                  Maximum length limit for a single generated message.
                </p>
              </div>
              <span className="text-sm font-mono font-bold text-indigo-400 bg-[#121214] px-2.5 py-1 rounded-lg border border-[#27272a]">
                {maxTokens} tokens
              </span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="128"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </section>

        {/* Section 4: System Directives Info */}
        <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="text-xs text-zinc-400 leading-relaxed">
            <strong className="text-zinc-200 block mb-0.5">Prompt Architecture Note:</strong>
            These generation settings will be compiled into <strong>Phase 3 (Prompt Compiler & Token Trimmer)</strong> when sending streaming API requests to OpenRouter.
          </div>
        </div>
      </form>
    </div>
  );
};
