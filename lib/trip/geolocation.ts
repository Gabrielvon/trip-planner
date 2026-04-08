/**
 * Geolocation detection utilities for determining user's location
 * and selecting appropriate map provider.
 * 
 * This module provides:
 * 1. IP-based geolocation detection (server-side)
 * 2. Manual location selection (client-side)
 * 3. Map provider selection based on location
 * 4. Fallback mechanisms for failed geolocation
 */

import { MapProvider } from './types';

export type GeoLocation = {
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isInChinaMainland: boolean;
};

export type GeoDetectionResult = {
  location?: GeoLocation;
  source: 'ip' | 'manual' | 'browser' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
};

// China mainland country codes and regions
const CHINA_MAINLAND_COUNTRY_CODES = ['CN'];
const CHINA_MAINLAND_REGIONS = [
  'Beijing', 'Shanghai', 'Tianjin', 'Chongqing',
  'Guangdong', 'Jiangsu', 'Zhejiang', 'Shandong', 'Henan',
  'Sichuan', 'Hubei', 'Hunan', 'Fujian', 'Anhui', 'Hebei',
  'Shaanxi', 'Jiangxi', 'Guangxi', 'Yunnan', 'Guizhou',
  'Shanxi', 'Gansu', 'Liaoning', 'Heilongjiang', 'Jilin',
  'Hainan', 'Ningxia', 'Qinghai', 'Xinjiang', 'Tibet',
  'Inner Mongolia'
];

/**
 * Check if a location is within China mainland
 */
export function isChinaMainland(location: GeoLocation): boolean {
  if (!CHINA_MAINLAND_COUNTRY_CODES.includes(location.countryCode)) {
    return false;
  }
  
  // If region is specified, check if it's a China mainland region
  if (location.region) {
    return CHINA_MAINLAND_REGIONS.some(region => 
      location.region?.toLowerCase().includes(region.toLowerCase())
    );
  }
  
  return true;
}

/**
 * Detect location from IP address (server-side only)
 * Uses free IP geolocation API with fallback
 */
export async function detectLocationFromIp(ip?: string): Promise<GeoDetectionResult> {
  try {
    // Use ipapi.co free tier (1000 requests/month)
    const response = await fetch(`https://ipapi.co/${ip || ''}/json/`, {
      headers: {
        'User-Agent': 'TripPlanner/1.0'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error(`IP geolocation failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    const location: GeoLocation = {
      country: data.country_name || 'Unknown',
      countryCode: data.country_code || '',
      region: data.region || data.region_code || undefined,
      city: data.city || undefined,
      latitude: data.latitude ? parseFloat(data.latitude) : undefined,
      longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      isInChinaMainland: CHINA_MAINLAND_COUNTRY_CODES.includes(data.country_code || '') && 
        (!data.region || CHINA_MAINLAND_REGIONS.some(region => 
          data.region?.toLowerCase().includes(region.toLowerCase())
        ))
    };
    
    return {
      location,
      source: 'ip',
      confidence: data.country_code ? 'high' : 'medium'
    };
  } catch (error) {
    console.error('[geolocation] IP detection failed:', error);
    
    // Fallback: try ipinfo.io
    try {
      const response = await fetch(`https://ipinfo.io/${ip || ''}/json`, {
        headers: {
          'User-Agent': 'TripPlanner/1.0'
        },
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const data = await response.json();
        const countryCode = data.country || '';
        
        const location: GeoLocation = {
          country: data.country || 'Unknown',
          countryCode,
          region: data.region || undefined,
          city: data.city || undefined,
          isInChinaMainland: CHINA_MAINLAND_COUNTRY_CODES.includes(countryCode)
        };
        
        return {
          location,
          source: 'ip',
          confidence: 'medium'
        };
      }
    } catch (fallbackError) {
      console.error('[geolocation] Fallback IP detection failed:', fallbackError);
    }
    
    // Ultimate fallback: assume China mainland for safety
    return {
      location: {
        country: 'China',
        countryCode: 'CN',
        isInChinaMainland: true
      },
      source: 'fallback',
      confidence: 'low'
    };
  }
}

/**
 * Detect location from browser geolocation API (client-side only)
 */
export async function detectLocationFromBrowser(): Promise<GeoDetectionResult> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return {
      source: 'browser',
      confidence: 'low'
    };
  }
  
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Reverse geocode to get country info
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
            {
              headers: {
                'User-Agent': 'TripPlanner/1.0'
              },
              signal: AbortSignal.timeout(5000)
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const countryCode = data.address?.country_code?.toUpperCase() || '';
            
            const location: GeoLocation = {
              country: data.address?.country || 'Unknown',
              countryCode,
              region: data.address?.state || data.address?.region || undefined,
              city: data.address?.city || data.address?.town || undefined,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              isInChinaMainland: CHINA_MAINLAND_COUNTRY_CODES.includes(countryCode)
            };
            
            resolve({
              location,
              source: 'browser',
              confidence: 'high'
            });
          } else {
            // Fallback with just coordinates
            const location: GeoLocation = {
              country: 'Unknown',
              countryCode: '',
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              isInChinaMainland: false // Assume not China mainland without country info
            };
            
            resolve({
              location,
              source: 'browser',
              confidence: 'medium'
            });
          }
        } catch (error) {
          console.error('[geolocation] Reverse geocoding failed:', error);
          
          const location: GeoLocation = {
            country: 'Unknown',
            countryCode: '',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            isInChinaMainland: false
          };
          
          resolve({
            location,
            source: 'browser',
            confidence: 'medium'
          });
        }
      },
      (error) => {
        console.error('[geolocation] Browser geolocation failed:', error);
        resolve({
          source: 'browser',
          confidence: 'low'
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

/**
 * Select appropriate map provider based on location
 * Rules:
 * 1. If in China mainland → AMap (高德)
 * 2. If outside China mainland → Google Maps
 * 3. If location unknown → AMap (default for safety in China)
 */
export function selectMapProviderByLocation(
  location?: GeoLocation,
  userPreference?: MapProvider
): MapProvider {
  // Respect user preference if provided
  if (userPreference) {
    return userPreference;
  }
  
  // If location is known, use location-based selection
  if (location) {
    return location.isInChinaMainland ? 'amap' : 'google';
  }
  
  // Default to AMap for safety (most users likely in China)
  return 'amap';
}

/**
 * Get recommended map providers with fallback options
 */
export function getMapProviderWithFallback(
  primaryProvider: MapProvider
): { primary: MapProvider; fallback: MapProvider } {
  if (primaryProvider === 'amap') {
    return {
      primary: 'amap',
      fallback: 'google'
    };
  } else {
    return {
      primary: 'google',
      fallback: 'amap'
    };
  }
}

/**
 * Check if a map provider is available/accessible from current location
 * This is a simple check based on common restrictions
 */
export function isMapProviderAccessible(
  provider: MapProvider,
  location?: GeoLocation
): boolean {
  if (!location) {
    return true; // Assume accessible if location unknown
  }
  
  // Google Maps may be restricted in China mainland
  if (provider === 'google' && location.isInChinaMainland) {
    return false;
  }
  
  // AMap may have limited coverage outside China
  if (provider === 'amap' && !location.isInChinaMainland) {
    // AMap works globally but may have less detailed data
    return true; // Still accessible, just less optimal
  }
  
  return true;
}