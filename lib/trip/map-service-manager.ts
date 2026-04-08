/**
 * Map service manager with intelligent provider selection and fallback mechanisms.
 * 
 * This module handles:
 * 1. Primary map provider selection based on location
 * 2. Fallback to alternative providers when primary fails
 * 3. Provider health checking
 * 4. Graceful degradation when all providers fail
 */

import { MapProvider, TravelMode } from './types';
import { GeoLocation, isMapProviderAccessible, getMapProviderWithFallback } from './geolocation';

export type MapServiceStatus = {
  provider: MapProvider;
  status: 'available' | 'degraded' | 'unavailable';
  lastChecked: Date;
  errorCount: number;
};

export type NavigationUrlResult = {
  url: string;
  provider: MapProvider;
  isFallback: boolean;
  warnings: string[];
};

export class MapServiceManager {
  private providerStatus: Map<MapProvider, MapServiceStatus> = new Map();
  private readonly maxRetries = 2;
  private readonly healthCheckInterval = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    const providers: MapProvider[] = ['amap', 'google', 'mapbox'];
    const now = new Date();
    
    providers.forEach(provider => {
      this.providerStatus.set(provider, {
        provider,
        status: 'available',
        lastChecked: now,
        errorCount: 0
      });
    });
  }

  /**
   * Select the best map provider based on location and provider health
   */
  public selectBestProvider(
    location?: GeoLocation,
    userPreference?: MapProvider
  ): { primary: MapProvider; fallback: MapProvider } {
    // Respect user preference if provided and healthy
    if (userPreference) {
      const status = this.providerStatus.get(userPreference);
      if (status?.status !== 'unavailable') {
        const fallback = this.getBestFallbackProvider(userPreference, location);
        return { primary: userPreference, fallback };
      }
    }

    // Select based on location
    let primary: MapProvider;
    
    if (location?.isInChinaMainland) {
      primary = 'amap';
    } else {
      primary = 'google';
    }

    // Check if primary is healthy
    const primaryStatus = this.providerStatus.get(primary);
    if (primaryStatus?.status === 'unavailable') {
      // Primary is unavailable, try alternative
      if (location?.isInChinaMainland) {
        primary = 'google'; // Fallback to Google in China if AMap is down
      } else {
        primary = 'amap'; // Fallback to AMap outside China if Google is down
      }
    }

    const fallback = this.getBestFallbackProvider(primary, location);
    return { primary, fallback };
  }

  /**
   * Get the best fallback provider for a given primary provider
   */
  private getBestFallbackProvider(
    primary: MapProvider,
    location?: GeoLocation
  ): MapProvider {
    const providers: MapProvider[] = ['amap', 'google', 'mapbox'];
    
    // Filter out primary and unhealthy providers
    const availableProviders = providers.filter(provider => {
      if (provider === primary) return false;
      
      const status = this.providerStatus.get(provider);
      if (status?.status === 'unavailable') return false;
      
      // Check if provider is accessible from location
      return isMapProviderAccessible(provider, location);
    });

    // Prioritize based on location
    if (location?.isInChinaMainland) {
      // In China: AMap > Google > Mapbox
      if (availableProviders.includes('amap')) return 'amap';
      if (availableProviders.includes('google')) return 'google';
      return 'mapbox';
    } else {
      // Outside China: Google > AMap > Mapbox
      if (availableProviders.includes('google')) return 'google';
      if (availableProviders.includes('amap')) return 'amap';
      return 'mapbox';
    }
  }

  /**
   * Report a provider failure to update health status
   */
  public reportProviderFailure(provider: MapProvider, error: Error) {
    const status = this.providerStatus.get(provider);
    if (!status) return;

    status.errorCount++;
    
    // Mark as degraded after 2 errors, unavailable after 5
    if (status.errorCount >= 5) {
      status.status = 'unavailable';
      console.error(`[MapService] Provider ${provider} marked as unavailable after ${status.errorCount} errors`);
    } else if (status.errorCount >= 2) {
      status.status = 'degraded';
      console.warn(`[MapService] Provider ${provider} degraded after ${status.errorCount} errors`);
    }
    
    status.lastChecked = new Date();
  }

  /**
   * Report a provider success to improve health status
   */
  public reportProviderSuccess(provider: MapProvider) {
    const status = this.providerStatus.get(provider);
    if (!status) return;

    // Reset error count on success
    if (status.errorCount > 0) {
      status.errorCount = Math.max(0, status.errorCount - 1);
      
      // Upgrade status if errors reduced
      if (status.errorCount < 2 && status.status === 'degraded') {
        status.status = 'available';
      } else if (status.errorCount < 5 && status.status === 'unavailable') {
        status.status = 'degraded';
      }
    }
    
    status.lastChecked = new Date();
  }

  /**
   * Get navigation URL with automatic fallback
   */
  public async getNavigationUrl(
    stops: Array<{ lng: number; lat: number; name: string }>,
    mode: TravelMode,
    preferredProvider?: MapProvider,
    location?: GeoLocation
  ): Promise<NavigationUrlResult> {
    if (stops.length === 0) {
      throw new Error('No stops provided for navigation');
    }

    const { primary, fallback } = this.selectBestProvider(location, preferredProvider);
    const warnings: string[] = [];
    
    // Try primary provider first
    try {
      const url = this.buildNavigationUrl(primary, stops, mode);
      if (url) {
        this.reportProviderSuccess(primary);
        return {
          url,
          provider: primary,
          isFallback: false,
          warnings
        };
      }
    } catch (error) {
      this.reportProviderFailure(primary, error as Error);
      warnings.push(`${primary} navigation failed: ${(error as Error).message}`);
    }

    // Primary failed, try fallback
    if (fallback !== primary) {
      try {
        const url = this.buildNavigationUrl(fallback, stops, mode);
        if (url) {
          warnings.push(`Fell back to ${fallback} because ${primary} failed`);
          this.reportProviderSuccess(fallback);
          return {
            url,
            provider: fallback,
            isFallback: true,
            warnings
          };
        }
      } catch (error) {
        this.reportProviderFailure(fallback, error as Error);
        warnings.push(`${fallback} fallback also failed: ${(error as Error).message}`);
      }
    }

    // All providers failed, return a basic URL or throw
    throw new Error(`All map providers failed. Warnings: ${warnings.join('; ')}`);
  }

  /**
   * Build navigation URL for a specific provider
   */
  private buildNavigationUrl(
    provider: MapProvider,
    stops: Array<{ lng: number; lat: number; name: string }>,
    mode: TravelMode
  ): string | undefined {
    const from = stops[0];
    const to = stops[stops.length - 1];
    const mids = stops.slice(1, -1);

    switch (provider) {
      case 'amap':
        return this.buildAmapUrl(from, to, mids, mode);
      case 'google':
        return this.buildGoogleUrl(from, to, mids, mode);
      case 'mapbox':
        return this.buildMapboxUrl(from, to, mids, mode);
      default:
        throw new Error(`Unsupported map provider: ${provider}`);
    }
  }

  private buildAmapUrl(
    from: { lng: number; lat: number; name: string },
    to: { lng: number; lat: number; name: string },
    mids: Array<{ lng: number; lat: number; name: string }>,
    mode: TravelMode
  ): string {
    const amapMode =
      mode === 'driving'
        ? 'car'
        : mode === 'walking'
          ? 'walk'
          : mode === 'cycling'
            ? 'ride'
            : 'bus';

    let url = `https://uri.amap.com/navigation?from=${from.lng},${from.lat},${encodeURIComponent(from.name)}&to=${to.lng},${to.lat},${encodeURIComponent(to.name)}&mode=${amapMode}&policy=1&coordinate=gaode&callnative=0`;

    if (mids.length > 0) {
      const waypointCoords = mids.map((stop) => `${stop.lng},${stop.lat}`).join(';');
      url += `&waypoints=${encodeURIComponent(waypointCoords)}`;
    }

    return url;
  }

  private buildGoogleUrl(
    from: { lng: number; lat: number; name: string },
    to: { lng: number; lat: number; name: string },
    mids: Array<{ lng: number; lat: number; name: string }>,
    mode: TravelMode
  ): string {
    const googleMode =
      mode === 'driving'
        ? 'driving'
        : mode === 'walking'
          ? 'walking'
          : mode === 'cycling'
            ? 'bicycling'
            : 'transit';

    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from.name)}&destination=${encodeURIComponent(to.name)}&travelmode=${googleMode}`;
    
    if (mids.length > 0) {
      const waypoints = mids.map((stop) => stop.name).join('|');
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    
    return url;
  }

  private buildMapboxUrl(
    from: { lng: number; lat: number; name: string },
    to: { lng: number; lat: number; name: string },
    mids: Array<{ lng: number; lat: number; name: string }>,
    mode: TravelMode
  ): string {
    // Mapbox doesn't have a direct navigation URL like AMap/Google
    // We'll create a directions URL instead
    const coordinates = [from, ...mids, to]
      .map(stop => `${stop.lng},${stop.lat}`)
      .join(';');
    
    const profile = 
      mode === 'driving' ? 'driving' :
      mode === 'walking' ? 'walking' :
      mode === 'cycling' ? 'cycling' : 'driving';
    
    return `https://www.mapbox.com/directions/?coordinates=${coordinates}&profile=${profile}`;
  }

  /**
   * Get current status of all providers
   */
  public getStatus(): MapServiceStatus[] {
    return Array.from(this.providerStatus.values());
  }

  /**
   * Force health check of all providers
   */
  public async performHealthCheck(): Promise<void> {
    // In a real implementation, this would make test requests to each provider
    // For now, we'll just reset error counts for providers that haven't failed recently
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const [provider, status] of this.providerStatus) {
      if (status.lastChecked < oneHourAgo && status.errorCount > 0) {
        // Reset old errors
        status.errorCount = Math.max(0, status.errorCount - 1);
        if (status.errorCount < 2 && status.status === 'degraded') {
          status.status = 'available';
        }
        status.lastChecked = now;
      }
    }
  }
}

// Singleton instance
export const mapServiceManager = new MapServiceManager();