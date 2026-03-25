type AMapLike = {
  Map: new (container: HTMLElement, options?: Record<string, unknown>) => any;
  Marker: new (options?: Record<string, unknown>) => any;
  Polyline: new (options?: Record<string, unknown>) => any;
  Pixel: new (x: number, y: number) => any;
  Scale: new () => any;
  ToolBar: new () => any;
};

declare global {
  interface Window {
    AMap?: AMapLike;
  }
}

let amapLoaderPromise: Promise<AMapLike> | null = null;

export function loadAmapJs(key: string): Promise<AMapLike> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('AMap JS can only be loaded in the browser'));
  }

  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }

  if (amapLoaderPromise) {
    return amapLoaderPromise;
  }

  amapLoaderPromise = new Promise<AMapLike>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-amap-sdk="true"]');

    if (existing) {
      existing.addEventListener('load', () => {
        if (window.AMap) resolve(window.AMap);
        else reject(new Error('AMap SDK loaded but window.AMap is unavailable'));
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load AMap SDK')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.Scale,AMap.ToolBar`;
    script.async = true;
    script.defer = true;
    script.dataset.amapSdk = 'true';

    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap);
      } else {
        reject(new Error('AMap SDK loaded but window.AMap is unavailable'));
      }
    };

    script.onerror = () => reject(new Error('Failed to load AMap SDK'));
    document.head.appendChild(script);
  });

  return amapLoaderPromise;
}
