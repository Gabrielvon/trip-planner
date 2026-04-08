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
  isMapProviderAccessible,
  extractIpFromRequest
} = await import('../.test-dist/geolocation.js');

test('isChinaMainland returns true for China mainland locations', () => {
  const chinaLocation = {
    country: 'China',
    countryCode: 'CN',
    region: 'Beijing',
    isInChinaMainland: true
  };
  
  assert.equal(isChinaMainland(chinaLocation), true);
});

test('isChinaMainland returns false for non-China locations', () => {
  const usLocation = {
    country: 'United States',
    countryCode: 'US',
    region: 'California',
    isInChinaMainland: false
  };
  
  assert.equal(isChinaMainland(usLocation), false);
});

test('selectMapProviderByLocation selects AMap for China mainland', () => {
  const chinaLocation = {
    country: 'China',
    countryCode: 'CN',
    isInChinaMainland: true
  };
  
  assert.equal(selectMapProviderByLocation(chinaLocation), 'amap');
});

test('selectMapProviderByLocation selects Google for non-China locations', () => {
  const usLocation = {
    country: 'United States',
    countryCode: 'US',
    isInChinaMainland: false
  };
  
  assert.equal(selectMapProviderByLocation(usLocation), 'google');
});

test('selectMapProviderByLocation handles undefined location', () => {
  assert.equal(selectMapProviderByLocation(undefined), 'google');
});

test('getMapProviderWithFallback returns appropriate fallback providers', () => {
  const chinaFallback = getMapProviderWithFallback('amap');
  assert.deepEqual(chinaFallback, ['amap', 'google', 'mapbox']);
  
  const globalFallback = getMapProviderWithFallback('google');
  assert.deepEqual(globalFallback, ['google', 'mapbox', 'amap']);
});

test('isMapProviderAccessible checks provider accessibility by location', () => {
  const chinaLocation = {
    country: 'China',
    countryCode: 'CN',
    isInChinaMainland: true
  };
  
  assert.equal(isMapProviderAccessible('amap', chinaLocation), true);
  assert.equal(isMapProviderAccessible('google', chinaLocation), true);
  assert.equal(isMapProviderAccessible('mapbox', chinaLocation), true);
});

test('isMapProviderAccessible handles undefined location', () => {
  assert.equal(isMapProviderAccessible('amap', undefined), true);
  assert.equal(isMapProviderAccessible('google', undefined), true);
  assert.equal(isMapProviderAccessible('mapbox', undefined), true);
});

// Test with mocked fetch for detectLocationFromIp
test('detectLocationFromIp with mocked responses', async (t) => {
  await t.test('successful detection from ipapi.co', async () => {
    setupFetchMock();
    
    // Mock ipapi.co response - note: URL includes IP address
    mockFetchResponses.set('https://ipapi.co/8.8.8.8/json/', {
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
  
  await t.test('IP extraction from request tests', async () => {
    // Tests will run above
  });
});

test('extractIpFromRequest extracts IP from various headers', () => {
  const req1 = {
    headers: {
      'x-forwarded-for': '192.168.1.1, 10.0.0.1'
    }
  };
  assert.equal(extractIpFromRequest(req1), '192.168.1.1');
  
  const req2 = {
    headers: {
      'x-real-ip': '203.0.113.1'
    }
  };
  assert.equal(extractIpFromRequest(req2), '203.0.113.1');
  
  const req3 = {
    headers: {
      'cf-connecting-ip': '198.51.100.1'
    }
  };
  assert.equal(extractIpFromRequest(req3), '198.51.100.1');
});

test('extractIpFromRequest handles edge cases', () => {
  const req1 = {
    headers: {}
  };
  assert.equal(extractIpFromRequest(req1), undefined);
  
  const req2 = {
    headers: {
      'x-forwarded-for': '  '
    }
  };
  assert.equal(extractIpFromRequest(req2), undefined);
  
  const req3 = {
    headers: {
      'x-forwarded-for': 'invalid-ip-address'
    }
  };
  assert.equal(extractIpFromRequest(req3), 'invalid-ip-address');
});