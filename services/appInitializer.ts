import globalSessionMonitor from './globalSessionMonitor';

class AppInitializer {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) {
      console.log('🚀 [AppInitializer] Already initialized');
      return;
    }

    console.log('🚀 [AppInitializer] Initializing app services');
    
    try {
      // Initialize global session monitor
      await globalSessionMonitor.initialize();
      
      this.isInitialized = true;
      console.log('✅ [AppInitializer] App services initialized successfully');
    } catch (error) {
      console.error('❌ [AppInitializer] Failed to initialize app services:', error);
    }
  }

  isAppInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export default new AppInitializer();
