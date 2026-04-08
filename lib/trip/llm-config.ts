/**
 * LLM Configuration Management
 *
 * Manages user-configurable OpenAI-compatible API settings.
 * Config is stored in localStorage and takes precedence over system defaults.
 */

import type { LLMConfig } from './types';

const STORAGE_KEY = 'trip-planner-llm-config';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-2024-08-06';

/**
 * Common OpenAI-compatible models for quick selection
 */
export const SUGGESTED_MODELS = [
  { id: 'gpt-4o-2024-08-06', name: 'GPT-4o (Recommended)', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek' },
  { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'DeepSeek' },
  { id: 'glm-4', name: 'GLM-4', provider: '智谱' },
  { id: 'glm-4-flash', name: 'GLM-4 Flash', provider: '智谱' },
  { id: 'qwen-turbo', name: 'Qwen Turbo', provider: '通义千问' },
  { id: 'qwen-plus', name: 'Qwen Plus', provider: '通义千问' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'llama3.1:70b', name: 'Llama 3.1 70B', provider: 'Ollama (Local)' },
  { id: 'llama3.1:8b', name: 'Llama 3.1 8B', provider: 'Ollama (Local)' },
] as const;

/**
 * Get user's LLM config from localStorage
 */
export function getLLMConfig(): LLMConfig | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const config = JSON.parse(stored) as LLMConfig;
    if (validateLLMConfig(config)) {
      return config;
    }
    
    // Invalid config, clear it
    clearLLMConfig();
    return null;
  } catch {
    return null;
  }
}

/**
 * Save user's LLM config to localStorage
 */
export function setLLMConfig(config: LLMConfig): boolean {
  if (typeof window === 'undefined') return false;
  
  if (!validateLLMConfig(config)) {
    return false;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear user's LLM config from localStorage
 */
export function clearLLMConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if user has configured a custom LLM
 */
export function hasUserLLMConfig(): boolean {
  return getLLMConfig() !== null;
}

/**
 * Validate LLM config structure
 */
export function validateLLMConfig(config: unknown): config is LLMConfig {
  if (typeof config !== 'object' || config === null) return false;
  
  const c = config as Record<string, unknown>;
  
  // apiKey must be a non-empty string
  if (typeof c.apiKey !== 'string' || c.apiKey.trim().length === 0) {
    return false;
  }
  
  // baseUrl must be a valid URL string
  if (typeof c.baseUrl !== 'string') {
    return false;
  }
  
  try {
    new URL(c.baseUrl);
  } catch {
    return false;
  }
  
  // modelName must be a non-empty string
  if (typeof c.modelName !== 'string' || c.modelName.trim().length === 0) {
    return false;
  }
  
  return true;
}

/**
 * Get default LLM config from environment variables (server-side only)
 * Returns null if OPENAI_API_KEY is not set
 */
export function getDefaultLLMConfig(): LLMConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  
  return {
    apiKey,
    baseUrl: process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL,
    modelName: process.env.OPENAI_MODEL || DEFAULT_MODEL,
  };
}

/**
 * Create a default config template for UI
 */
export function createDefaultConfigTemplate(): LLMConfig {
  return {
    apiKey: '',
    baseUrl: DEFAULT_BASE_URL,
    modelName: DEFAULT_MODEL,
  };
}

/**
 * Sanitize baseUrl - remove trailing slash
 */
export function sanitizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

/**
 * Mask API key for display (show first 8 and last 4 chars)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) return '••••••••';
  return `${apiKey.slice(0, 8)}•••${apiKey.slice(-4)}`;
}

/**
 * Detect if baseUrl points to a known provider
 */
export function detectProvider(baseUrl: string): string | null {
  const url = baseUrl.toLowerCase();
  
  if (url.includes('api.openai.com')) return 'OpenAI';
  if (url.includes('api.deepseek.com')) return 'DeepSeek';
  if (url.includes('open.bigmodel.cn')) return '智谱';
  if (url.includes('dashscope.aliyuncs.com')) return '通义千问';
  if (url.includes('api.anthropic.com')) return 'Anthropic';
  if (url.includes('localhost') || url.includes('127.0.0.1')) return 'Local';
  
  return null;
}
