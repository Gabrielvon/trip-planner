/**
 * Configuration validation utilities for trip planner
 * 
 * This module provides validation for:
 * 1. Map API keys (AMap, Google Maps, Mapbox)
 * 2. OpenAI API key
 * 3. Environment configuration
 * 4. Feature flags
 */

import { MapProvider } from './types';

export type ConfigValidationResult = {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  missingKeys: string[];
};

export type MapProviderConfig = {
  provider: MapProvider;
  key: string;
  isValid: boolean;
  validationError?: string;
};

/**
 * Validate AMap API key format
 * AMap keys are typically 32-character hexadecimal strings
 */
export function validateAmapKey(key: string): boolean {
  if (!key || key.trim() === '') {
    return false;
  }
  
  // Check for test key
  if (key === 'test_key_for_development_only') {
    return false;
  }
  
  // AMap keys are typically 32-character hex strings
  const hexRegex = /^[a-fA-F0-9]{32}$/;
  return hexRegex.test(key);
}

/**
 * Validate Google Maps API key format
 * Google Maps keys can vary in format, but typically contain letters, numbers, and underscores
 */
export function validateGoogleMapsKey(key: string): boolean {
  if (!key || key.trim() === '') {
    return false;
  }
  
  // Google Maps keys typically contain alphanumeric characters and underscores
  // They can vary in length, but usually at least 30 characters
  const googleKeyRegex = /^[A-Za-z0-9_-]{30,}$/;
  return googleKeyRegex.test(key);
}

/**
 * Validate Mapbox API key format
 * Mapbox keys start with 'pk.' for public keys or 'sk.' for secret keys
 */
export function validateMapboxKey(key: string): boolean {
  if (!key || key.trim() === '') {
    return false;
  }
  
  // Mapbox keys start with pk. or sk.
  const mapboxKeyRegex = /^(pk|sk)\.[A-Za-z0-9_-]{20,}$/;
  return mapboxKeyRegex.test(key);
}

/**
 * Validate OpenAI API key format
 * OpenAI keys start with 'sk-' followed by alphanumeric characters
 */
export function validateOpenAIKey(key: string): boolean {
  if (!key || key.trim() === '') {
    return false;
  }
  
  // OpenAI keys start with sk-
  const openAIKeyRegex = /^sk-[A-Za-z0-9]{48,}$/;
  return openAIKeyRegex.test(key);
}

/**
 * Get map provider configuration status
 */
export function getMapProviderConfigs(): MapProviderConfig[] {
  const configs: MapProviderConfig[] = [];
  
  // Check AMap configuration
  const amapKey = process.env.NEXT_PUBLIC_AMAP_JS_KEY || process.env.NEXT_PUBLIC_AMAP_KEY;
  const amapIsValid = validateAmapKey(amapKey || '');
  configs.push({
    provider: 'amap',
    key: amapKey || '',
    isValid: amapIsValid,
    validationError: amapIsValid ? undefined : 'Invalid or missing AMap API key'
  });
  
  // Check Google Maps configuration
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const googleIsValid = validateGoogleMapsKey(googleKey || '');
  configs.push({
    provider: 'google',
    key: googleKey || '',
    isValid: googleIsValid,
    validationError: googleIsValid ? undefined : 'Invalid or missing Google Maps API key'
  });
  
  // Check Mapbox configuration
  const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_KEY;
  const mapboxIsValid = validateMapboxKey(mapboxKey || '');
  configs.push({
    provider: 'mapbox',
    key: mapboxKey || '',
    isValid: mapboxIsValid,
    validationError: mapboxIsValid ? undefined : 'Invalid or missing Mapbox API key'
  });
  
  return configs;
}

/**
 * Validate all configuration
 */
export function validateAllConfig(): ConfigValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const missingKeys: string[] = [];
  
  // Check OpenAI API key (required for live parsing)
  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openAIKey || !validateOpenAIKey(openAIKey)) {
    warnings.push('OpenAI API key is missing or invalid. Live parsing will be unavailable.');
    missingKeys.push('OPENAI_API_KEY');
  }
  
  // Check map provider configurations
  const mapConfigs = getMapProviderConfigs();
  const validMapProviders = mapConfigs.filter(config => config.isValid);
  
  if (validMapProviders.length === 0) {
    errors.push('No valid map API keys configured. Map features will be unavailable.');
    missingKeys.push('NEXT_PUBLIC_AMAP_JS_KEY', 'NEXT_PUBLIC_GOOGLE_MAPS_KEY', 'NEXT_PUBLIC_MAPBOX_KEY');
  } else if (validMapProviders.length === 1) {
    warnings.push(`Only one map provider (${validMapProviders[0].provider}) is configured. No fallback available.`);
  }
  
  // Check AMap server-side key (required for geocoding)
  const amapServerKey = process.env.AMAP_API_KEY;
  if (!amapServerKey || !validateAmapKey(amapServerKey)) {
    warnings.push('AMap server-side API key is missing or invalid. Geocoding features may be limited.');
    missingKeys.push('AMAP_API_KEY');
  }
  
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment) {
    warnings.push('Running in development mode. Some features may be limited.');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    missingKeys: [...new Set(missingKeys)] // Remove duplicates
  };
}

/**
 * Log configuration status (for startup diagnostics)
 */
export function logConfigStatus(): void {
  const result = validateAllConfig();
  
  console.log('=== Trip Planner Configuration Status ===');
  
  if (result.errors.length > 0) {
    console.error('Configuration Errors:');
    result.errors.forEach(error => console.error(`  ❌ ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.warn('Configuration Warnings:');
    result.warnings.forEach(warning => console.warn(`  ⚠️ ${warning}`));
  }
  
  // Log map provider status
  const mapConfigs = getMapProviderConfigs();
  console.log('Map Provider Status:');
  mapConfigs.forEach(config => {
    const status = config.isValid ? '✅' : '❌';
    const keyPreview = config.key ? `${config.key.substring(0, 8)}...` : '(missing)';
    console.log(`  ${status} ${config.provider}: ${keyPreview}`);
    if (config.validationError) {
      console.log(`     ${config.validationError}`);
    }
  });
  
  // Log OpenAI status
  const openAIKey = process.env.OPENAI_API_KEY;
  const openAIStatus = openAIKey && validateOpenAIKey(openAIKey) ? '✅' : '⚠️';
  console.log(`OpenAI API: ${openAIStatus} ${openAIKey ? 'Configured' : 'Not configured'}`);
  
  console.log('=========================================');
  
  if (!result.isValid) {
    console.error('Configuration validation failed. Some features may not work correctly.');
  }
}

/**
 * Get recommended map provider based on available configuration
 */
export function getRecommendedMapProvider(): MapProvider | undefined {
  const mapConfigs = getMapProviderConfigs();
  const validConfigs = mapConfigs.filter(config => config.isValid);
  
  if (validConfigs.length === 0) {
    return undefined;
  }
  
  // Priority: AMap > Google Maps > Mapbox
  const amapConfig = validConfigs.find(config => config.provider === 'amap');
  if (amapConfig) {
    return 'amap';
  }
  
  const googleConfig = validConfigs.find(config => config.provider === 'google');
  if (googleConfig) {
    return 'google';
  }
  
  const mapboxConfig = validConfigs.find(config => config.provider === 'mapbox');
  if (mapboxConfig) {
    return 'mapbox';
  }
  
  return validConfigs[0].provider;
}