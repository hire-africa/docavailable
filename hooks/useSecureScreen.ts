import { useEffect } from 'react';
import { useScreenshotPrevention } from './useScreenshotPrevention';

/**
 * Auto-manages screenshot prevention for secure screens
 * Enables protection on mount, disables on unmount
 * 
 * Usage:
 * ```tsx
 * function SecureChatScreen() {
 *   useSecureScreen(); // That's it!
 *   return <YourContent />;
 * }
 * ```
 */
export function useSecureScreen(screenName: string = 'Screen') {
  const { enable, disable } = useScreenshotPrevention();

  useEffect(() => {
    let isMounted = true;

    const enableProtection = async () => {
      if (!isMounted) return;
      
      try {
        console.log(`🔒 [${screenName}] Enabling screenshot prevention...`);
        await enable();
        console.log(`✅ [${screenName}] Screenshot prevention enabled`);
      } catch (error) {
        console.error(`❌ [${screenName}] Failed to enable screenshot prevention:`, error);
      }
    };

    enableProtection();

    // Cleanup: Disable when screen unmounts
    return () => {
      isMounted = false;
      
      const disableProtection = async () => {
        try {
          console.log(`🔓 [${screenName}] Disabling screenshot prevention...`);
          await disable();
          console.log(`✅ [${screenName}] Screenshot prevention disabled`);
        } catch (error) {
          console.error(`❌ [${screenName}] Failed to disable screenshot prevention:`, error);
        }
      };
      
      disableProtection();
    };
  }, [enable, disable, screenName]);
}


