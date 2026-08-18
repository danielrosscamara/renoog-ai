import React, { useState } from 'react';
import {
  Brain,
  X,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Layers,
} from 'lucide-react';
import type { Character, Persona, MessageTurn } from '../../types';

export interface PromptInspectorProps {
  character: Character;
  persona: Persona;
  turns: MessageTurn[];
  modelName: string;
  temperature: number;
  maxTokens?: number;
  onClose: () => void;
}

export const PromptInspector: React.FC<PromptInspectorProps> = ({
  character,
  persona,
  turns,
  modelName,
  temperature,
  maxTokens = 8192,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'layers' | 'raw'>('layers');
  const [copied, setCopied] = useState(false);

  // Accordion toggle states
  const [openLayers, setOpenLayers] = useState<Record<string, boolean>>({
    l1: true,
    l2: true,
    l3: true,
    l4: false,
    l5: true,
  });

  const toggleLayer = (layerKey: string) => {
    setOpenLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Compile Layer Text
  const layer1Directives = `[SYSTEM DIRECTIVE: IMPARTIAL ROLEPLAY ENGINE]
You are a creative, unfiltered roleplay companion. Stay in character as {{char}} at all times.
- Format all physical actions, gestures, expressions, and environmental details inside *asterisks* (e.g. *steps forward slowly*).
- Format all spoken dialogue clearly outside asterisks.
- Never break character, never speak as {{user}}, and never moralize or summarize.`;

  const layer2Persona = `[ACTIVE USER PERSONA: {{user}}]
Name: ${persona.name}
Description / Bio: ${persona.description || 'A mysterious wanderer with sharp senses.'}
Instruction: Address the user as ${persona.name}. Adapt responses to acknowledge their backstory and physical presence.`;

  const layer3Character = `[CHARACTER CARD DEFINITION: {{char}}]
Name: ${character.name}
Tagline: ${character.tagline}
Personality: ${character.personality}
Scenario: ${character.scenario}
Description: ${character.description}`;

  const layer4Lore = `[WORLD INFO / LOREBOOK SCANNER]
Active Keywords Scanned: ["Clocktower", "Temporal Sand", "Sector 9", "Cyberdeck"]
Matched Entries:
- "Temporal Sand": Fine crystalline dust that accelerates or decelerates localized causality. Highly sought after by chronomancers.`;

  // Estimate Tokens (~4 chars per token)
  const countTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

  const l1Tokens = countTokens(layer1Directives);
  const l2Tokens = countTokens(layer2Persona);
  const l3Tokens = countTokens(layer3Character);
  const l4Tokens = countTokens(layer4Lore);

  const turnsText = turns
    .map((t) => `${t.role.toUpperCase()}: ${t.swipes[t.active_index] || ''}`)
    .join('\n\n');
  const l5Tokens = countTokens(turnsText);

  const totalTokens = l1Tokens + l2Tokens + l3Tokens + l4Tokens + l5Tokens;
  const contextPercentage = Math.min(100, Math.round((totalTokens / maxTokens) * 100));

  // Raw API JSON Payload
  const rawApiPayload = {
    model: modelName,
    temperature,
    messages: [
      {
        role: 'system',
        content: `${layer1Directives}\n\n${layer2Persona}\n\n${layer3Character}\n\n${layer4Lore}`,
      },
      ...turns.map((t) => ({
        role: t.role,
        content: t.swipes[t.active_index] || '',
      })),
    ],
  };

  const fullRawJsonString = JSON.stringify(rawApiPayload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(
      activeTab === 'raw'
        ? fullRawJsonString
        : `${layer1Directives}\n\n${layer2Persona}\n\n${layer3Character}\n\n${layer4Lore}\n\n${turnsText}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#18181b] border border-[#2e2e36] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-purple-600 shadow-md shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white">Prompt Architecture Inspector</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  6-Layer Compiler
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Live inspection of prompt compilation sent to {modelName.split('/')[1] || modelName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: View Switcher & Live Token Budget */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-[#232326] bg-[#121214]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('layers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'layers'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-[#18181b] text-zinc-400 hover:text-zinc-200 border border-[#27272a]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>6-Layer Breakdown</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'raw'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-[#18181b] text-zinc-400 hover:text-zinc-200 border border-[#27272a]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Raw API JSON</span>
            </button>
          </div>

          {/* Token Meter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-zinc-300">
              <span className="text-zinc-500">Context:</span>
              <span className="font-bold text-indigo-400">{totalTokens.toLocaleString()}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">{maxTokens.toLocaleString()} tok</span>
              <span className="text-zinc-500">({contextPercentage}%)</span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#27272a] hover:bg-[#323236] text-xs font-medium text-zinc-200 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'layers' ? (
            <div className="space-y-3">
              {/* Layer 1: Global Directives */}
              <div className="rounded-xl bg-[#121214] border border-[#27272a] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleLayer('l1')}
                  className="flex items-center justify-between w-full p-3.5 text-left hover:bg-[#18181b] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {openLayers.l1 ? <ChevronDown className="w-4 h-4 text-blue-400" /> : <ChevronRight className="w-4 h-4 text-blue-400" />}
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-xs font-bold text-white">Layer 1: Global System Directives</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">~{l1Tokens} tok</span>
                </button>
                {openLayers.l1 && (
                  <div className="p-3.5 pt-0 text-xs font-mono text-blue-300/90 whitespace-pre-wrap leading-relaxed border-t border-[#1e1e22]">
                    {layer1Directives}
                  </div>
                )}
              </div>

              {/* Layer 2: Active User Persona */}
              <div className="rounded-xl bg-[#121214] border border-[#27272a] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleLayer('l2')}
                  className="flex items-center justify-between w-full p-3.5 text-left hover:bg-[#18181b] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {openLayers.l2 ? <ChevronDown className="w-4 h-4 text-emerald-400" /> : <ChevronRight className="w-4 h-4 text-emerald-400" />}
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-white">
                      Layer 2: User Persona (<code className="text-emerald-400 font-mono">{"{{user}}"}</code>: {persona.name})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">~{l2Tokens} tok</span>
                </button>
                {openLayers.l2 && (
                  <div className="p-3.5 pt-0 text-xs font-mono text-emerald-300/90 whitespace-pre-wrap leading-relaxed border-t border-[#1e1e22]">
                    {layer2Persona}
                  </div>
                )}
              </div>

              {/* Layer 3: Character Definition */}
              <div className="rounded-xl bg-[#121214] border border-[#27272a] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleLayer('l3')}
                  className="flex items-center justify-between w-full p-3.5 text-left hover:bg-[#18181b] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {openLayers.l3 ? <ChevronDown className="w-4 h-4 text-indigo-400" /> : <ChevronRight className="w-4 h-4 text-indigo-400" />}
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="text-xs font-bold text-white">
                      Layer 3: Character Card (<code className="text-indigo-400 font-mono">{"{{char}}"}</code>: {character.name})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">~{l3Tokens} tok</span>
                </button>
                {openLayers.l3 && (
                  <div className="p-3.5 pt-0 text-xs font-mono text-indigo-300/90 whitespace-pre-wrap leading-relaxed border-t border-[#1e1e22]">
                    {layer3Character}
                  </div>
                )}
              </div>

              {/* Layer 4: World Info / Lorebook */}
              <div className="rounded-xl bg-[#121214] border border-[#27272a] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleLayer('l4')}
                  className="flex items-center justify-between w-full p-3.5 text-left hover:bg-[#18181b] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {openLayers.l4 ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />}
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-white">Layer 4: World Info & Lorebook Injections</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">~{l4Tokens} tok</span>
                </button>
                {openLayers.l4 && (
                  <div className="p-3.5 pt-0 text-xs font-mono text-amber-300/90 whitespace-pre-wrap leading-relaxed border-t border-[#1e1e22]">
                    {layer4Lore}
                  </div>
                )}
              </div>

              {/* Layer 5: Conversation Turns */}
              <div className="rounded-xl bg-[#121214] border border-[#27272a] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleLayer('l5')}
                  className="flex items-center justify-between w-full p-3.5 text-left hover:bg-[#18181b] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {openLayers.l5 ? <ChevronDown className="w-4 h-4 text-orange-400" /> : <ChevronRight className="w-4 h-4 text-orange-400" />}
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="text-xs font-bold text-white">
                      Layer 5: Conversation History ({turns.length} Turns)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">~{l5Tokens} tok</span>
                </button>
                {openLayers.l5 && (
                  <div className="p-3.5 pt-0 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed border-t border-[#1e1e22] space-y-2">
                    {turns.map((turn, idx) => (
                      <div key={turn.id} className="p-2 rounded-lg bg-[#18181b] border border-[#232326]">
                        <span className={`text-[10px] font-bold uppercase ${turn.role === 'assistant' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                          [{turn.role}] Turn #{idx + 1}
                        </span>
                        <p className="mt-1 text-xs text-zinc-300">
                          {turn.swipes[turn.active_index] || ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Raw JSON View */
            <pre className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-xs font-mono text-emerald-400/90 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {fullRawJsonString}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-[#27272a] bg-[#121214]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#323236] text-xs font-medium text-zinc-200 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
