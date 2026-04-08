import test from 'node:test';
import assert from 'node:assert/strict';

// Mock fetch for testing
const originalFetch = global.fetch;
let mockFetchResponses = new Map();

function setupFetchMock() {
  global.fetch = async (url, options) => {
    const mockResponse = mockFetchResponses.get(url);
    if (mockResponse) {
      return {
        ok: true,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      };
    }
    
    // Default fallback
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    };
  };
}

function teardownFetchMock() {
  global.fetch = originalFetch;
  mockFetchResponses.clear();
}

// Import the module after setting up mocks
const { 
  isChinaMainland,
  selectMapProviderByLocation,
  getMapProviderWithFallback,
  isMapProviderAccessible
} = await import('../.test-dist/geolocation.js');

test('isChinaMainland returns true for China mainland locations', () => {
  const chinaLocation = {
    country: 'China',
    countryCode: 'CN',
    region: 'Beijing',
    isInChinaMainland: true
  };
  
  assert.equal(isChinaMainland(chinaLocation), true);
  
  const shanghaiLocation = {
    country: 'China',
    countryCode: 'CN',
    region: 'Shanghai',
    isInChinaMainland: true
  };
  
  assert.equal(isChinaMainland(shanghaiLocation), true);
});

test('isChinaMainland returns false for non-China locations', () => {
  const usLocation = {
    country: 'United States',
    countryCode: 'US',
    region: 'California',
    isInChinaMainland: false
  };
  
  assert.equal(isChinaMainland(usLocation), false);
  
  const japanLocation = {
    country: 'Japan',
    countryCode: 'JP',
    region: 'Tokyo',
    isInChinaMainland: false
  };
  
  assert.equal(isChinaMainland(japanLocation), false);
});

test('selectMapProviderByLocation selects AMap for China mainland', () => {
  const chinaLocation = {
    country: 'China',
    countryCode: 'CN',
    isInChinaMainland: true
  };
  
  // No user preference
  assert.equal(selectMapProviderByLocation(chinaLocation), 'amap');
  
  // User preference should be respected
  assert.equal(selectMapProviderByLocation(chinaLocation, 'google'), 'google');
  assert.equal(selectMapProviderByLocation(chinaLocation, 'mapbox'), 'mapbox');
});

test('selectMapProviderByLocation selects Google for non-China locations', () => {
  const usLocation = {
    country: 'United States',
    countryCode: 'US',
    isInChinaMainland: false
  };
  
  assert.equal(selectMapProviderByLocation(usLocation), 'google');
  
  const japanLocation = {
    country: 'Japan',
    countryCode: 'JP',
    isInChinaMainland: false
  };
  
  assert.equal(selectMapProviderByLocation(japanLocation), 'google');
});

test('selectMapProviderByLocation handles undefined location', () => {
  // Default to AMap for safety when location is unknown
  assert.equal(selectMapProviderByLocation(undefined), 'amap');
  assert.equal(selectMapProviderByLocation(null), 'amap');
});

test('getMapProviderWithFallback returns appropriate fallback providers', () => {
  // AMap should fallback to Google
  const amapFallback = getMapProviderWithFallback('amap');
  assert.equal(amapFallback.primary, 'amap');
  assert.equal(amapFallback.fallback, 'google');
  
  // Google should fallback to Mapbox
  const googleFallback = getMapProviderWithFallback('google');
  assert.equal(googleFallback.primary, 'google');
  assert.equal(googleFallback.fallback, 'mapbox');
  
  // Mapbox should fallback to Google
  const mapboxFallback = getMapProviderWithFallback('mapbox');
  assert.equal(mapboxFallback.primary, 'mapbox');
  assert.equal(mapboxFallback.fallback, 'google');
});

test('isMapProviderAccessible checks provider accessibility by location', () => {
  const chinaLocation = {
    country: 'China',
    countryCode: 'CN',
    isInChinaMainland: true
  };
  
  const usLocation = {
    country: 'United States',
    countryCode: 'US',
    isInChinaMainland: false
  };
  
  // AMap should be accessible in China
  assert.equal(isMapProviderAccessible('amap', chinaLocation), true);
  
  // Google should be accessible in US
  assert.equal(isMapProviderAccessible('google', usLocation), true);
  
  // Mapbox should be accessible everywhere
  assert.equal(isMapProviderAccessible('mapbox', chinaLocation), true);
  assert.equal(isMapProviderAccessible('mapbox', usLocation), true);
  
  // Google may not be accessible in China
  assert.equal(isMapProviderAccessible('google', chinaLocation), false);
  
  // AMap may not be accessible outside China
  assert.equal(isMapProviderAccessible('amap', usLocation), false);
});

test('isMapProviderAccessible handles undefined location', () => {
  // When location is unknown, assume all providers are accessible
  assert.equal(isMapProviderAccessible('amap', undefined), true);
  assert.equal(isMapProviderAccessible('google', undefined), true);
  assert.equal(isMapProviderAccessible('mapbox', undefined), true);
});

// Test with mocked fetch for detectLocationFromIp
test('detectLocationFromIp with mocked responses', async (t) => {
  await t.test('successful detection from ipapi.co', async () => {
    setupFetchMock();
    
    // Mock ipapi.co response
    mockFetchResponses.set('https://ipapi.co/json/', {
      country_name: 'China',
      country_code: 'CN',
      region: 'Beijing',
      city: 'Beijing',
      latitude: 39.9042,
      longitude: 116.4074
    });
    
    const { detectLocationFromIp } = await import('../.test-dist/geolocation.js');
    
    const result = await detectLocationFromIp('8.8.8.8');
    
    assert.equal(result.location?.country, 'China');
    assert.equal(result.location?.countryCode, 'CN');
    assert.equal(result.location?.isInChinaMainland, true);
    assert.equal(result.source, 'ip');
    assert.equal(result.confidence, 'high');
    
    teardownFetchMock();
  });
  
  await t.test('fallback to ipinfo.io when ipapi.co fails', async () => {
    setupFetchMock();
    
    // ipapi.co fails (no mock response)
    // Mock ipinfo.io response
    mockFetchResponses.set('https://ipinfo.io/8.8.8.8/json', {
      country: 'United States',
      countryCode: 'US',
      region: 'California',
      city: 'Mountain View'
    });
    
    const { detectLocationFromIp } = await import('../.test-dist/geolocation.js');
    
    const result = await detectLocationFromIp('8.8.8.8');
    
    assert.equal(result.location?.country, 'United States');
    assert.equal(result.location?.countryCode, 'US');
    assert.equal(result.location?.isInChinaMainland, false);
    assert.equal(result.source, 'ip');
    assert.equal(result.confidence, 'medium');
    
    teardownFetchMock();
  });
  
  await t.test('ultimate fallback when all detection fails', async () => {
    setupFetchMock();
    
    // No mock responses - all detection will fail
    const { detectLocationFromIp } = await import('../.test-dist/geolocation.js');
    
    const result = await detectLocationFromIp('invalid-ip');
    
    assert.equal(result.location?.country, 'China');
    assert.equal(result.location?.countryCode, 'CN');
    assert.equal(result.location?.isInChinaMainland, true);
    assert.equal(result.source, 'fallback');
    assert.equal(result.confidence, 'low');
    
    teardownFetchMock();
  });
});

// Run all tests
test('geolocation module tests', async (t) => {
  await t.test('isChinaMainland tests', async () => {
    // Tests will run above
  });
  
  await t.test('provider selection tests', async () => {
    // Tests will run above
  });
  
  await t.test('fallback tests', async () => {
    // Tests will run above
  });
  
  await t.test('accessibility tests', async () => {
    // Tests will run above
  });
  
  await t.test('IP detection tests', async () => {
    // Tests will run above
  });
});