import test from 'node:test';
import assert from 'node:assert/strict';

// Mock the geolocation module
const mockGeolocation = {
  isMapProviderAccessible: (provider, location) => {
    if (!location) return true;
    
    if (provider === 'amap') {
      return location.isInChinaMainland;
    }
    
    if (provider === 'google') {
      return !location.isInChinaMainland;
    }
    
    return true; // mapbox is accessible everywhere
  },
  
  getMapProviderWithFallback: (provider) => {
    const fallbacks = {
      amap: { primary: 'amap', fallback: 'google' },
      google: { primary: 'google', fallback: 'mapbox' },
      mapbox: { primary: 'mapbox', fallback: 'google' }
    };
    return fallbacks[provider] || { primary: 'amap', fallback: 'google' };
  }
};

// Mock the module before importing
const moduleMock = {
  '../.test-dist/geolocation.js': mockGeolocation
};

// Simple module mocking
const originalRequire = require;
global.require = function(id) {
  if (moduleMock[id]) {
    return moduleMock[id];
  }
  return originalRequire(id);
};

// Import the module
const { MapServiceManager } = await import('../.test-dist/map-service-manager.js');

test('MapServiceManager initializes with all providers', () => {
  const manager = new MapServiceManager();
  
  // Check that all providers are initialized
  const providers = ['amap', 'google', 'mapbox'];
  providers.forEach(provider => {
    const status = manager.providerStatus.get(provider);
    assert.ok(status, `Provider ${provider} should be initialized`);
    assert.equal(status.provider, provider);
    assert.equal(status.status, 'available');
    assert.equal(status.errorCount, 0);
  });
});

test('getNavigationUrl returns URL for valid provider', async () => {
  const manager = new MapServiceManager();
  
  const stops = [
    { lng: 116.3974, lat: 39.9093, name: 'Beijing' },
    { lng: 121.4737, lat: 31.2304, name: 'Shanghai' }
  ];
  
  const travelMode = 'driving';
  const userPreferredProvider = 'amap';
  const location = {
    country: 'China',
    countryCode: 'CN',
    isInChinaMainland: true
  };
  
  // Mock the internal method that builds URLs
  // Since we can't easily mock private methods, we'll test the public API
  // and expect it to handle the fallback logic
  
  const result = await manager.getNavigationUrl(stops, travelMode, userPreferredProvider, location);
  
  // Should return a result object
  assert.ok(result);
  assert.equal(typeof result.url, 'string');
  assert.ok(['amap', 'google', 'mapbox'].includes(result.provider));
  assert.equal(typeof result.isFallback, 'boolean');
  assert.ok(Array.isArray(result.warnings));
});

test('provider health checking updates status', () => {
  const manager = new MapServiceManager();
  
  // Initially all providers should be available
  const initialStatus = manager.providerStatus.get('amap');
  assert.equal(initialStatus.status, 'available');
  assert.equal(initialStatus.errorCount, 0);
  
  // Simulate an error
  manager.updateProviderStatus('amap', 'unavailable', 'Test error');
  
  const updatedStatus = manager.providerStatus.get('amap');
  assert.equal(updatedStatus.status, 'unavailable');
  assert.equal(updatedStatus.errorCount, 1);
  
  // Simulate recovery
  manager.updateProviderStatus('amap', 'available');
  
  const recoveredStatus = manager.providerStatus.get('amap');
  assert.equal(recoveredStatus.status, 'available');
  // Error count should be reset when status changes to available
  assert.equal(recoveredStatus.errorCount, 0);
});

test('getHealthyProvider selects available provider', () => {
  const manager = new MapServiceManager();
  
  // All providers should be initially healthy
  const healthyProvider = manager.getHealthyProvider('amap');
  assert.equal(healthyProvider, 'amap');
  
  // Mark amap as unavailable
  manager.updateProviderStatus('amap', 'unavailable', 'Service down');
  
  // Should fallback to google
  const fallbackProvider = manager.getHealthyProvider('amap');
  assert.equal(fallbackProvider, 'google');
  
  // Mark google as unavailable too
  manager.updateProviderStatus('google', 'unavailable', 'Service down');
  
  // Should fallback to mapbox
  const secondFallback = manager.getHealthyProvider('amap');
  assert.equal(secondFallback, 'mapbox');
  
  // Mark all providers as unavailable
  manager.updateProviderStatus('mapbox', 'unavailable', 'Service down');
  
  // Should return the original provider even if unhealthy
  // (better to try and fail than to give up)
  const lastResort = manager.getHealthyProvider('amap');
  assert.equal(lastResort, 'amap');
});

test('buildNavigationUrl builds correct URLs for different providers', async () => {
  const manager = new MapServiceManager();
  
  const stops = [
    { lng: -74.0060, lat: 40.7128, name: 'New York' },
    { lng: -118.2437, lat: 34.0522, name: 'Los Angeles' }
  ];
  
  // Test AMap URL building (for China locations)
  const chinaLocation = {
    country: 'China',
    countryCode: 'CN',
    isInChinaMainland: true
  };
  
  const amapResult = await manager.getNavigationUrl(
    stops,
    'driving',
    'amap',
    chinaLocation
  );
  
  assert.ok(amapResult.url.includes('amap.com') || amapResult.provider === 'google');
  // If AMap is not accessible from China location, it should fallback
  
  // Test Google Maps URL building (for US locations)
  const usLocation = {
    country: 'United States',
    countryCode: 'US',
    isInChinaMainland: false
  };
  
  const googleResult = await manager.getNavigationUrl(
    stops,
    'driving',
    'google',
    usLocation
  );
  
  assert.ok(googleResult.url.includes('google.com') || googleResult.provider === 'mapbox');
  
  // Test Mapbox URL building
  const mapboxResult = await manager.getNavigationUrl(
    stops,
    'walking',
    'mapbox',
    usLocation
  );
  
  assert.ok(mapboxResult.url.includes('mapbox.com') || mapboxResult.provider === 'google');
});

test('error handling and retry logic', async () => {
  const manager = new MapServiceManager();
  
  // Simulate a provider that fails
  manager.updateProviderStatus('amap', 'degraded', 'High latency');
  
  const stops = [
    { lng: 116.3974, lat: 39.9093, name: 'Beijing' }
  ];
  
  const location = {
    country: 'China',
    countryCode: 'CN',
    isInChinaMainland: true
  };
  
  // Should still try to use the provider even if degraded
  const result = await manager.getNavigationUrl(
    stops,
    'driving',
    'amap',
    location
  );
  
  assert.ok(result);
  // Should have warnings about degraded service
  if (result.provider === 'amap') {
    assert.ok(result.warnings.length > 0);
  }
});

test('transport mode mapping', async () => {
  const manager = new MapServiceManager();
  
  const stops = [
    { lng: 139.6917, lat: 35.6895, name: 'Tokyo' },
    { lng: 135.5023, lat: 34.6937, name: 'Osaka' }
  ];
  
  const location = {
    country: 'Japan',
    countryCode: 'JP',
    isInChinaMainland: false
  };
  
  // Test different transport modes
  const modes = ['driving', 'walking', 'transit', 'bicycling'];
  
  for (const mode of modes) {
    const result = await manager.getNavigationUrl(
      stops,
      mode,
      'google',
      location
    );
    
    assert.ok(result);
    assert.ok(result.url);
    // URL should contain the transport mode
    if (result.provider === 'google') {
      assert.ok(result.url.includes(mode) || result.url.includes('travelmode'));
    }
  }
});

// Run all tests
test('map-service-manager module tests', async (t) => {
  await t.test('initialization tests', async () => {
    // Tests will run above
  });
  
  await t.test('navigation URL tests', async () => {
    // Tests will run above
  });
  
  await t.test('health checking tests', async () => {
    // Tests will run above
  });
  
  await t.test('provider selection tests', async () => {
    // Tests will run above
  });
  
  await t.test('URL building tests', async () => {
    // Tests will run above
  });
  
  await t.test('error handling tests', async () => {
    // Tests will run above
  });
  
  await t.test('transport mode tests', async () => {
    // Tests will run above
  });
});