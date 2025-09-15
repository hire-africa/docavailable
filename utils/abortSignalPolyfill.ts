// AbortSignal.timeout polyfill for environments that don't support it
// This is needed for React Native and older environments

declare global {
  interface AbortSignal {
    timeout(ms: number): AbortSignal;
  }
}

// Polyfill for AbortSignal.timeout
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function timeout(ms: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

export { };

