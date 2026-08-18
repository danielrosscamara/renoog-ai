import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Sparkles, Square, Paperclip } from 'lucide-react';

export interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  isStreaming?: boolean;
  onStopStreaming?: () => void;
  characterName?: string;
  maxTokens?: number;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  isStreaming = false,
  onStopStreaming,
  characterName = 'Character',
  maxTokens = 8192,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }, [input]);

  // Rough token estimator (~4 characters per token in English prose)
  const estimatedTokens = Math.max(1, Math.ceil(input.length / 4));
  const tokenPercentage = Math.min(100, Math.round((estimatedTokens / maxTokens) * 100));

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper: Wraps selected text or cursor in *asterisks* for action formatting
  const handleInsertAsterisks = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = input.substring(start, end);

    const replacement = selectedText ? `*${selectedText}*` : '**';
    const newCursorPos = selectedText ? start + replacement.length : start + 1;

    const nextValue = input.substring(0, start) + replacement + input.substring(end);
    setInput(nextValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Floating Card Container */}
      <div className="relative flex flex-col rounded-2xl bg-[#18181b] border border-[#27272a] focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all shadow-xl">
        {/* Main Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Type a message or *action* to ${characterName}...`}
          disabled={isStreaming}
          rows={1}
          className="w-full p-4 pb-2 bg-transparent text-sm text-zinc-100 placeholder-zinc-400 resize-none outline-none max-h-44 disabled:opacity-50"
        />

        {/* Toolbar & Controls Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#232326]">
          {/* Left Action Shortcuts */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleInsertAsterisks}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-[#27272a] transition-colors"
              title="Wrap in *asterisks* for action text"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>*Action*</span>
            </button>

            <button
              type="button"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#27272a] transition-colors"
              title="Attach context or image (coming soon)"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>

          {/* Right Controls: Token Counter & Send Button */}
          <div className="flex items-center gap-3">
            {/* Live Token Indicator */}
            {input.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs tabular-nums font-mono text-zinc-400">
                <span className={tokenPercentage > 80 ? 'text-amber-400' : 'text-zinc-400'}>
                  ~{estimatedTokens}
                </span>
                <span className="text-zinc-400">/</span>
                <span className="text-zinc-400">{maxTokens} tokens</span>
              </div>
            )}

            {/* Send or Stop Streaming Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md transition-all shrink-0 animate-pulse"
                aria-label="Stop generation"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-30 disabled:hover:from-blue-600 disabled:hover:to-indigo-600 text-white shadow-md transition-all shrink-0"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Helper Subtext */}
      <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] text-zinc-400">
        <span>
          <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for new line
        </span>
        <span className="hidden sm:inline">Renoog AI Engine v0.1</span>
      </div>
    </div>
  );
};
