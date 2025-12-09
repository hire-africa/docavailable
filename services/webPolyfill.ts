/**
 * Web API polyfills for React Native
 * Fixes "window addEventListener is not a function" errors in preview builds
 */

// Polyfill window object if it doesn't exist
if (typeof global.window === 'undefined') {
  global.window = global as any;
}

// Polyfill addEventListener and removeEventListener
if (typeof global.window.addEventListener === 'undefined') {
  const eventListeners = new Map<string, Function[]>();
  
  global.window.addEventListener = function(type: string, listener: Function, options?: any) {
    if (!eventListeners.has(type)) {
      eventListeners.set(type, []);
    }
    eventListeners.get(type)!.push(listener);
    console.log(`[WebPolyfill] Added event listener for '${type}'`);
  };
  
  global.window.removeEventListener = function(type: string, listener: Function, options?: any) {
    if (eventListeners.has(type)) {
      const listeners = eventListeners.get(type)!;
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
        console.log(`[WebPolyfill] Removed event listener for '${type}'`);
      }
    }
  };
  
  global.window.dispatchEvent = function(event: any) {
    const type = event.type || event;
    if (eventListeners.has(type)) {
      const listeners = eventListeners.get(type)!;
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.warn(`[WebPolyfill] Error in event listener for '${type}':`, error);
        }
      });
    }
    return true;
  };
}

// Polyfill document object if it doesn't exist
if (typeof global.document === 'undefined') {
  global.document = {
    addEventListener: global.window.addEventListener,
    removeEventListener: global.window.removeEventListener,
    dispatchEvent: global.window.dispatchEvent,
    createElement: () => ({}),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  } as any;
}

// Polyfill location object
if (typeof global.location === 'undefined') {
  global.location = {
    href: '',
    protocol: 'https:',
    host: 'localhost',
    hostname: 'localhost',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
    origin: 'https://localhost'
  } as any;
}

// Polyfill navigator object
if (typeof global.navigator === 'undefined') {
  global.navigator = {
    userAgent: 'React Native',
    platform: 'mobile',
    language: 'en-US',
    languages: ['en-US'],
    onLine: true,
    mediaDevices: {
      getUserMedia: () => Promise.reject(new Error('Use react-native-webrtc mediaDevices instead')),
      enumerateDevices: () => Promise.resolve([])
    }
  } as any;
}

// Polyfill performance object
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => [],
    clearMarks: () => {},
    clearMeasures: () => {}
  } as any;
}

// Polyfill requestAnimationFrame and cancelAnimationFrame
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(() => callback(Date.now()), 16);
  };
}

if (typeof global.cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}

// Polyfill URL constructor
if (typeof global.URL === 'undefined') {
  global.URL = class URL {
    href: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
    origin: string;

    constructor(url: string, base?: string) {
      // Simple URL parsing
      this.href = url;
      const parts = url.match(/^(https?:)\/\/([^\/]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
      if (parts) {
        this.protocol = parts[1];
        this.host = parts[2];
        this.hostname = parts[2].split(':')[0];
        this.port = parts[2].split(':')[1] || '';
        this.pathname = parts[3] || '/';
        this.search = parts[4] || '';
        this.hash = parts[5] || '';
        this.origin = `${this.protocol}//${this.host}`;
      } else {
        // Fallback for simple URLs
        this.protocol = 'https:';
        this.host = 'localhost';
        this.hostname = 'localhost';
        this.port = '';
        this.pathname = url;
        this.search = '';
        this.hash = '';
        this.origin = 'https://localhost';
      }
    }

    toString() {
      return this.href;
    }
  } as any;
}

// Polyfill URLSearchParams
if (typeof global.URLSearchParams === 'undefined') {
  global.URLSearchParams = class URLSearchParams {
    private params = new Map<string, string>();

    constructor(init?: string | URLSearchParams | Record<string, string>) {
      if (typeof init === 'string') {
        // Parse query string
        if (init.startsWith('?')) {
          init = init.slice(1);
        }
        init.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          if (key) {
            this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
          }
        });
      } else if (init instanceof URLSearchParams) {
        init.params.forEach((value, key) => {
          this.params.set(key, value);
        });
      } else if (init && typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => {
          this.params.set(key, String(value));
        });
      }
    }

    append(name: string, value: string) {
      this.params.set(name, value);
    }

    delete(name: string) {
      this.params.delete(name);
    }

    get(name: string) {
      return this.params.get(name);
    }

    has(name: string) {
      return this.params.has(name);
    }

    set(name: string, value: string) {
      this.params.set(name, value);
    }

    toString() {
      const pairs: string[] = [];
      this.params.forEach((value, key) => {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      });
      return pairs.join('&');
    }
  } as any;
}

// Polyfill fetch if not available (though React Native usually has this)
if (typeof global.fetch === 'undefined') {
  console.warn('[WebPolyfill] fetch is not available - this may cause network issues');
}

// Polyfill WebSocket if not available (React Native usually has this)
if (typeof global.WebSocket === 'undefined') {
  console.warn('[WebPolyfill] WebSocket is not available - this may cause connection issues');
}

console.log('[WebPolyfill] Web API polyfills loaded successfully');

export default {};
