'use client';

import { useState } from 'react';
import {
  clearLLMConfig,
  createDefaultConfigTemplate,
  detectProvider,
  getLLMConfig,
  maskApiKey,
  sanitizeBaseUrl,
  setLLMConfig,
  SUGGESTED_MODELS,
} from '@/lib/trip/llm-config';
import type { LLMConfig } from '@/lib/trip/types';

type LLMConfigPanelProps = {
  onConfigChange?: (hasConfig: boolean) => void;
};

// Initialize from localStorage synchronously (client-side only)
function getInitialConfig(): LLMConfig {
  if (typeof window === 'undefined') return createDefaultConfigTemplate();
  const saved = getLLMConfig();
  return saved || createDefaultConfigTemplate();
}

function getInitialSavedConfig(): LLMConfig | null {
  if (typeof window === 'undefined') return null;
  return getLLMConfig();
}

export default function LLMConfigPanel({ onConfigChange }: LLMConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<LLMConfig>(getInitialConfig);
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedConfig, setSavedConfig] = useState<LLMConfig | null>(getInitialSavedConfig);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const handleSave = () => {
    const sanitized: LLMConfig = {
      ...config,
      baseUrl: sanitizeBaseUrl(config.baseUrl),
    };

    if (setLLMConfig(sanitized)) {
      setSavedConfig(sanitized);
      setSaveStatus('saved');
      onConfigChange?.(true);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleClear = () => {
    clearLLMConfig();
    setSavedConfig(null);
    setConfig(createDefaultConfigTemplate());
    setSaveStatus('idle');
    onConfigChange?.(false);
  };

  const detectedProvider = detectProvider(config.baseUrl);
  const hasExistingConfig = savedConfig !== null;

  return (
    <div className="rounded-2xl border">
      <button
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="font-medium">LLM Configuration</span>
          {hasExistingConfig && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Custom
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="space-y-4 border-t p-4">
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-medium">Configure your own OpenAI-compatible API</p>
            <p className="mt-1">
              Supports OpenAI, DeepSeek, 智谱 GLM, 通义千问, Anthropic, or local models via Ollama.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="w-full rounded-xl border p-2 pr-20"
                  placeholder="sk-..."
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              {savedConfig && !showApiKey && (
                <p className="mt-1 text-xs text-slate-500">
                  Saved: {maskApiKey(savedConfig.apiKey)}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Base URL
                {detectedProvider && (
                  <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-normal text-blue-700">
                    {detectedProvider}
                  </span>
                )}
              </label>
              <input
                type="text"
                className="w-full rounded-xl border p-2"
                placeholder="https://api.openai.com/v1"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">
                Examples: api.openai.com/v1, api.deepseek.com, open.bigmodel.cn/api/paas/v4
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Model Name</label>
              <input
                type="text"
                className="w-full rounded-xl border p-2"
                placeholder="gpt-4o-2024-08-06"
                value={config.modelName}
                onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                list="model-suggestions"
              />
              <datalist id="model-suggestions">
                {SUGGESTED_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </datalist>
              <p className="mt-1 text-xs text-slate-500">
                Select from list or type custom model name
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
              disabled={!config.apiKey.trim() || !config.modelName.trim()}
              onClick={handleSave}
            >
              {saveStatus === 'saved' ? '✓ Saved' : 'Save Configuration'}
            </button>
            {hasExistingConfig && (
              <button
                className="rounded-xl border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50"
                onClick={handleClear}
              >
                Clear
              </button>
            )}
          </div>

          {saveStatus === 'error' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Failed to save configuration. Please check your inputs.
            </div>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">⚠️ Security Note</p>
            <p className="mt-1">
              API keys are stored in your browser&apos;s localStorage. Do not save sensitive keys on shared or public computers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
