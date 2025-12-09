import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SignupProgress {
  step: number;
  userType: 'patient' | 'doctor';
  data: Record<string, any>;
  timestamp: number;
  completedSteps: number[];
}

export interface ProgressRestoreResult {
  hasProgress: boolean;
  progress?: SignupProgress;
  isExpired?: boolean;
}

export class SignupProgressUtils {
  private static readonly STORAGE_KEY = 'signup_progress';
  private static readonly EXPIRY_HOURS = 24; // Progress expires after 24 hours

  /**
   * Save signup progress to storage
   */
  static async saveProgress(
    step: number,
    userType: 'patient' | 'doctor',
    data: Record<string, any>,
    completedSteps: number[] = []
  ): Promise<void> {
    try {
      const progress: SignupProgress = {
        step,
        userType,
        data: { ...data }, // Create a copy to avoid reference issues
        timestamp: Date.now(),
        completedSteps: [...completedSteps]
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
      console.log('✅ Signup progress saved:', { step, userType, completedSteps: completedSteps.length });
    } catch (error) {
      console.error('❌ Failed to save signup progress:', error);
    }
  }

  /**
   * Restore signup progress from storage
   */
  static async restoreProgress(): Promise<ProgressRestoreResult> {
    try {
      const savedProgress = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      if (!savedProgress) {
        return { hasProgress: false };
      }

      const progress: SignupProgress = JSON.parse(savedProgress);
      const now = Date.now();
      const expiryTime = progress.timestamp + (this.EXPIRY_HOURS * 60 * 60 * 1000);

      // Check if progress has expired
      if (now > expiryTime) {
        await this.clearProgress(); // Clean up expired progress
        return { hasProgress: false, isExpired: true };
      }

      console.log('✅ Signup progress restored:', {
        step: progress.step,
        userType: progress.userType,
        age: Math.round((now - progress.timestamp) / (1000 * 60)) + ' minutes'
      });

      return { hasProgress: true, progress };
    } catch (error) {
      console.error('❌ Failed to restore signup progress:', error);
      return { hasProgress: false };
    }
  }

  /**
   * Clear saved progress
   */
  static async clearProgress(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('✅ Signup progress cleared');
    } catch (error) {
      console.error('❌ Failed to clear signup progress:', error);
    }
  }

  /**
   * Update specific field in saved progress
   */
  static async updateProgressField(
    fieldName: string,
    value: any
  ): Promise<void> {
    try {
      const result = await this.restoreProgress();
      
      if (result.hasProgress && result.progress) {
        const updatedData = {
          ...result.progress.data,
          [fieldName]: value
        };

        await this.saveProgress(
          result.progress.step,
          result.progress.userType,
          updatedData,
          result.progress.completedSteps
        );
      }
    } catch (error) {
      console.error('❌ Failed to update progress field:', error);
    }
  }

  /**
   * Mark step as completed
   */
  static async markStepCompleted(
    step: number,
    userType: 'patient' | 'doctor',
    data: Record<string, any>
  ): Promise<void> {
    try {
      const result = await this.restoreProgress();
      let completedSteps: number[] = [];

      if (result.hasProgress && result.progress) {
        completedSteps = [...result.progress.completedSteps];
      }

      if (!completedSteps.includes(step)) {
        completedSteps.push(step);
      }

      await this.saveProgress(step + 1, userType, data, completedSteps);
    } catch (error) {
      console.error('❌ Failed to mark step as completed:', error);
    }
  }

  /**
   * Check if step is completed
   */
  static async isStepCompleted(step: number): Promise<boolean> {
    try {
      const result = await this.restoreProgress();
      
      if (result.hasProgress && result.progress) {
        return result.progress.completedSteps.includes(step);
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to check step completion:', error);
      return false;
    }
  }

  /**
   * Get progress percentage
   */
  static getProgressPercentage(
    currentStep: number,
    totalSteps: number,
    completedSteps: number[] = []
  ): number {
    const completed = completedSteps.length;
    const percentage = Math.min((completed / totalSteps) * 100, 100);
    return Math.round(percentage);
  }

  /**
   * Get time remaining before expiry
   */
  static getTimeUntilExpiry(progress: SignupProgress): string {
    const now = Date.now();
    const expiryTime = progress.timestamp + (this.EXPIRY_HOURS * 60 * 60 * 1000);
    const timeLeft = expiryTime - now;

    if (timeLeft <= 0) {
      return 'Expired';
    }

    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    if (hoursLeft > 0) {
      return `${hoursLeft}h ${minutesLeft}m remaining`;
    } else {
      return `${minutesLeft}m remaining`;
    }
  }

  /**
   * Create progress summary for display
   */
  static createProgressSummary(progress: SignupProgress): {
    title: string;
    description: string;
    percentage: number;
  } {
    const totalSteps = progress.userType === 'doctor' ? 6 : 4;
    const percentage = this.getProgressPercentage(
      progress.step,
      totalSteps,
      progress.completedSteps
    );

    const timeRemaining = this.getTimeUntilExpiry(progress);
    
    return {
      title: `${progress.userType === 'doctor' ? 'Doctor' : 'Patient'} Registration`,
      description: `Step ${progress.step} of ${totalSteps} • ${timeRemaining}`,
      percentage
    };
  }
}

export default SignupProgressUtils;
