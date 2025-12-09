import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { ScreenshotPreventionConfig, screenshotPreventionService } from '../services/screenshotPreventionService';

export interface UseScreenshotPreventionReturn {
  isEnabled: boolean;
  config: ScreenshotPreventionConfig;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  toggle: () => Promise<void>;
  updateConfig: (newConfig: Partial<ScreenshotPreventionConfig>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useScreenshotPrevention(): UseScreenshotPreventionReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [config, setConfig] = useState<ScreenshotPreventionConfig>({
    enabled: true,
    showWatermark: true,
    watermarkText: 'Doc Available - Confidential',
    notifyOnScreenshot: true,
    securityLevel: 'enhanced'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize screenshot prevention
  useEffect(() => {
    initializeScreenshotPrevention();
  }, []);

  // Monitor app state changes for screenshot detection (iOS)
  useEffect(() => {
    if (Platform.OS === 'ios' && config.notifyOnScreenshot) {
      const handleAppStateChange = (nextAppState: string) => {
        if (nextAppState === 'active') {
          // App became active, check if screenshot was taken
          handleScreenshotDetection();
        }
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => subscription?.remove();
    }
  }, [config.notifyOnScreenshot]);

  const initializeScreenshotPrevention = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await screenshotPreventionService.initialize();
      
      const currentConfig = screenshotPreventionService.getConfig();
      const currentEnabled = screenshotPreventionService.isScreenshotPreventionEnabled();
      
      setConfig(currentConfig);
      setIsEnabled(currentEnabled);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize screenshot prevention';
      setError(errorMessage);
      console.error('❌ Screenshot prevention initialization failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const enable = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await screenshotPreventionService.enableScreenshotPrevention();
      setIsEnabled(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable screenshot prevention';
      setError(errorMessage);
      console.error('❌ Failed to enable screenshot prevention:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disable = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await screenshotPreventionService.disableScreenshotPrevention();
      setIsEnabled(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable screenshot prevention';
      setError(errorMessage);
      console.error('❌ Failed to disable screenshot prevention:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggle = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await screenshotPreventionService.toggleScreenshotPrevention();
      const currentEnabled = screenshotPreventionService.isScreenshotPreventionEnabled();
      setIsEnabled(currentEnabled);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle screenshot prevention';
      setError(errorMessage);
      console.error('❌ Failed to toggle screenshot prevention:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (newConfig: Partial<ScreenshotPreventionConfig>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await screenshotPreventionService.updateConfig(newConfig);
      
      const updatedConfig = screenshotPreventionService.getConfig();
      const currentEnabled = screenshotPreventionService.isScreenshotPreventionEnabled();
      
      setConfig(updatedConfig);
      setIsEnabled(currentEnabled);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update screenshot prevention config';
      setError(errorMessage);
      console.error('❌ Failed to update screenshot prevention config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleScreenshotDetection = useCallback(async () => {
    try {
      await screenshotPreventionService.handleScreenshotDetection();
    } catch (err) {
      console.error('❌ Failed to handle screenshot detection:', err);
    }
  }, []);

  return {
    isEnabled,
    config,
    enable,
    disable,
    toggle,
    updateConfig,
    isLoading,
    error
  };
}
