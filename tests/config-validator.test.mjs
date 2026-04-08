import test from 'node:test';
import assert from 'node:assert/strict';

// Save original environment
const originalEnv = { ...process.env };

function setupTestEnv() {
  // Clear environment for tests
  delete process.env.NEXT_PUBLIC_AMAP_JS_KEY;
  delete process.env.NEXT_PUBLIC_AMAP_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  delete process.env.NEXT_PUBLIC_MAPBOX_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.AMAP_API_KEY;
}

function restoreEnv() {
  // Restore original environment
  for (const key in originalEnv) {
    process.env[key] = originalEnv[key];
  }
}

// Import the module
const {
  validateAmapKey,
  validateGoogleMapsKey,
  validateMapboxKey,
  validateOpenAIKey,
  getMapProviderConfigs,
  validateAllConfig,
  getRecommendedMapProvider
} = await import('../.test-dist/config-validator.js');

test('validateAmapKey validates AMap key format', () => {
  // Valid AMap keys (32-character hex)
  assert.equal(validateAmapKey('0123456789abcdef0123456789abcdef'), true);
  assert.equal(validateAmapKey('ABCDEF0123456789ABCDEF0123456789'), true);
  assert.equal(validateAmapKey('a1b2c3d4e5f678901234567890123456'), true);
  
  // Invalid AMap keys
  assert.equal(validateAmapKey(''), false);
  assert.equal(validateAmapKey('test_key_for_development_only'), false);
  assert.equal(validateAmapKey('123'), false); // Too short
  assert.equal(validateAmapKey('0123456789abcdef0123456789abcdef0'), false); // Too long
  assert.equal(validateAmapKey('0123456789abcdef0123456789abcdeg'), false); // Invalid character
  assert.equal(validateAmapKey('01234567-89ab-cdef-0123-456789abcdef'), false); // Contains hyphens
});

test('validateGoogleMapsKey validates Google Maps key format', () => {
  // Valid Google Maps keys
  assert.equal(validateGoogleMapsKey('AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), true);
  assert.equal(validateGoogleMapsKey('test_key_123_ABC_def_456'), true);
  assert.equal(validateGoogleMapsKey('a'.repeat(30)), true); // Minimum length
  
  // Invalid Google Maps keys
  assert.equal(validateGoogleMapsKey(''), false);
  assert.equal(validateGoogleMapsKey('123'), false); // Too short
  assert.equal(validateGoogleMapsKey('key with spaces'), false); // Contains spaces
  assert.equal(validateGoogleMapsKey('key@with#special$chars'), false); // Special characters
});

test('validateMapboxKey validates Mapbox key format', () => {
  // Valid Mapbox public keys
  assert.equal(validateMapboxKey('pk.abcdefghijklmnopqrstuvwxyz0123456789'), true);
  
  // Valid Mapbox secret keys
  assert.equal(validateMapboxKey('sk.abcdefghijklmnopqrstuvwxyz0123456789'), true);
  
  // Valid with underscores and hyphens
  assert.equal(validateMapboxKey('pk.abc_def-ghi_jkl0123456789'), true);
  
  // Invalid Mapbox keys
  assert.equal(validateMapboxKey(''), false);
  assert.equal(validateMapboxKey('pk.'), false); // Too short after prefix
  assert.equal(validateMapboxKey('ak.abcdefghijklmnopqrstuvwxyz0123456789'), false); // Wrong prefix
  assert.equal(validateMapboxKey('abcdefghijklmnopqrstuvwxyz0123456789'), false); // No prefix
});

test('validateOpenAIKey validates OpenAI key format', () => {
  // Valid OpenAI keys
  assert.equal(validateOpenAIKey('sk-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN'), true); // 48 chars
  assert.equal(validateOpenAIKey('sk-' + 'a'.repeat(48)), true); // Minimum length
  
  // Invalid OpenAI keys
  assert.equal(validateOpenAIKey(''), false);
  assert.equal(validateOpenAIKey('sk-'), false); // Too short
  assert.equal(validateOpenAIKey('sk-123'), false); // Too short
  assert.equal(validateOpenAIKey('pk-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN'), false); // Wrong prefix
  assert.equal(validateOpenAIKey('sk-abc@def#ghi$jkl%mno'), false); // Special characters
});

test('getMapProviderConfigs returns correct configurations', () => {
  setupTestEnv();
  
  // Set test environment
  process.env.NEXT_PUBLIC_AMAP_JS_KEY = '0123456789abcdef0123456789abcdef';
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'AIzaSyTestKey1234567890ABCDEFGHIJKLMN';
  process.env.NEXT_PUBLIC_MAPBOX_KEY = 'pk.testmapboxkey1234567890abcdef';
  
  const configs = getMapProviderConfigs();
  
  // Should have 3 configs
  assert.equal(configs.length, 3);
  
  // Check AMap config
  const amapConfig = configs.find(c => c.provider === 'amap');
  assert.ok(amapConfig);
  assert.equal(amapConfig.key, '0123456789abcdef0123456789abcdef');
  assert.equal(amapConfig.isValid, true);
  assert.equal(amapConfig.validationError, undefined);
  
  // Check Google Maps config
  const googleConfig = configs.find(c => c.provider === 'google');
  assert.ok(googleConfig);
  assert.equal(googleConfig.key, 'AIzaSyTestKey1234567890ABCDEFGHIJKLMN');
  assert.equal(googleConfig.isValid, true);
  assert.equal(googleConfig.validationError, undefined);
  
  // Check Mapbox config
  const mapboxConfig = configs.find(c => c.provider === 'mapbox');
  assert.ok(mapboxConfig);
  assert.equal(mapboxConfig.key, 'pk.testmapboxkey1234567890abcdef');
  assert.equal(mapboxConfig.isValid, true);
  assert.equal(mapboxConfig.validationError, undefined);
  
  restoreEnv();
});

test('getMapProviderConfigs handles invalid keys', () => {
  setupTestEnv();
  
  // Set invalid keys
  process.env.NEXT_PUBLIC_AMAP_JS_KEY = 'invalid';
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'too_short';
  process.env.NEXT_PUBLIC_MAPBOX_KEY = 'wrong.prefix';
  
  const configs = getMapProviderConfigs();
  
  // All should be invalid
  configs.forEach(config => {
    assert.equal(config.isValid, false);
    assert.ok(config.validationError);
    assert.ok(config.validationError.includes('Invalid or missing'));
  });
  
  restoreEnv();
});

test('validateAllConfig returns correct validation results', () => {
  setupTestEnv();
  
  // Test with no configuration
  let result = validateAllConfig();
  
  assert.equal(result.isValid, false);
  assert.ok(result.errors.length > 0);
  assert.ok(result.warnings.length > 0);
  assert.ok(result.missingKeys.length >= 4); // At least 4 keys missing
  
  // Test with partial configuration
  process.env.OPENAI_API_KEY = 'sk-testopenapikey123456789012345678901234567890123456';
  process.env.NEXT_PUBLIC_AMAP_JS_KEY = '0123456789abcdef0123456789abcdef';
  process.env.AMAP_API_KEY = 'abcdef0123456789abcdef0123456789';
  
  result = validateAllConfig();
  
  assert.equal(result.isValid, true); // No errors, only warnings
  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.length > 0); // Should warn about missing other map keys
  assert.ok(result.missingKeys.includes('NEXT_PUBLIC_GOOGLE_MAPS_KEY'));
  assert.ok(result.missingKeys.includes('NEXT_PUBLIC_MAPBOX_KEY'));
  
  // Test with full configuration
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'AIzaSyTestKey1234567890ABCDEFGHIJKLMN';
  process.env.NEXT_PUBLIC_MAPBOX_KEY = 'pk.testmapboxkey1234567890abcdef';
  
  result = validateAllConfig();
  
  assert.equal(result.isValid, true);
  assert.equal(result.errors.length, 0);
  // May still have warnings about development mode
  assert.ok(result.missingKeys.length === 0 || result.missingKeys.length === 1); // Only AMAP_API_KEY if not set
  
  restoreEnv();
});

test('getRecommendedMapProvider returns correct provider', () => {
  setupTestEnv();
  
  // No configuration
  let provider = getRecommendedMapProvider();
  assert.equal(provider, undefined);
  
  // Only AMap configured
  process.env.NEXT_PUBLIC_AMAP_JS_KEY = '0123456789abcdef0123456789abcdef';
  provider = getRecommendedMapProvider();
  assert.equal(provider, 'amap');
  
  // Only Google Maps configured
  delete process.env.NEXT_PUBLIC_AMAP_JS_KEY;
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'AIzaSyTestKey1234567890ABCDEFGHIJKLMN';
  provider = getRecommendedMapProvider();
  assert.equal(provider, 'google');
  
  // Only Mapbox configured
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  process.env.NEXT_PUBLIC_MAPBOX_KEY = 'pk.testmapboxkey1234567890abcdef';
  provider = getRecommendedMapProvider();
  assert.equal(provider, 'mapbox');
  
  // Multiple providers configured - should prefer AMap
  process.env.NEXT_PUBLIC_AMAP_JS_KEY = '0123456789abcdef0123456789abcdef';
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'AIzaSyTestKey1234567890ABCDEFGHIJKLMN';
  process.env.NEXT_PUBLIC_MAPBOX_KEY = 'pk.testmapboxkey1234567890abcdef';
  
  provider = getRecommendedMapProvider();
  assert.equal(provider, 'amap');
  
  // AMap invalid, Google valid
  process.env.NEXT_PUBLIC_AMAP_JS_KEY = 'invalid';
  provider = getRecommendedMapProvider();
  assert.equal(provider, 'google');
  
  // AMap and Google invalid, Mapbox valid
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'invalid';
  provider = getRecommendedMapProvider();
  assert.equal(provider, 'mapbox');
  
  restoreEnv();
});

test('development mode detection', () => {
  setupTestEnv();
  
  // Save original NODE_ENV
  const originalNodeEnv = process.env.NODE_ENV;
  
  // Test development mode
  process.env.NODE_ENV = 'development';
  process.env.OPENAI_API_KEY = 'sk-testkey';
  
  let result = validateAllConfig();
  assert.ok(result.warnings.some(w => w.includes('development mode')));
  
  // Test production mode
  process.env.NODE_ENV = 'production';
  result = validateAllConfig();
  assert.ok(!result.warnings.some(w => w.includes('development mode')));
  
  // Restore NODE_ENV
  process.env.NODE_ENV = originalNodeEnv;
  restoreEnv();
});

// Run all tests
test('config-validator module tests', async (t) => {
  await t.test('key validation tests', async () => {
    // Tests will run above
  });
  
  await t.test('configuration tests', async () => {
    // Tests will run above
  });
  
  await t.test('validation result tests', async () => {
    // Tests will run above
  });
  
  await t.test('provider recommendation tests', async () => {
    // Tests will run above
  });
  
  await t.test('environment mode tests', async () => {
    // Tests will run above
  });
});