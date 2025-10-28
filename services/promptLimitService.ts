import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PromptUsage {
  date: string;
  count: number;
  lastReset: string;
}

export interface PromptLimitStatus {
  remaining: number;
  total: number;
  resetTime: string;
  isLimitReached: boolean;
}

const DAILY_PROMPT_LIMIT = 5;
const STORAGE_KEY = 'docava_prompt_usage';

export class PromptLimitService {
  /**
   * Check if user can make another prompt today
   */
  static async canMakePrompt(): Promise<boolean> {
    const usage = await this.getTodayUsage();
    return usage.count < DAILY_PROMPT_LIMIT;
  }

  /**
   * Get remaining prompts for today
   */
  static async getRemainingPrompts(): Promise<number> {
    const usage = await this.getTodayUsage();
    return Math.max(0, DAILY_PROMPT_LIMIT - usage.count);
  }

  /**
   * Get prompt limit status
   */
  static async getPromptLimitStatus(): Promise<PromptLimitStatus> {
    const usage = await this.getTodayUsage();
    const remaining = Math.max(0, DAILY_PROMPT_LIMIT - usage.count);
    const isLimitReached = usage.count >= DAILY_PROMPT_LIMIT;
    
    // Calculate reset time (next day at midnight)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return {
      remaining,
      total: DAILY_PROMPT_LIMIT,
      resetTime: tomorrow.toISOString(),
      isLimitReached
    };
  }

  /**
   * Record a prompt usage
   */
  static async recordPromptUsage(): Promise<PromptLimitStatus> {
    const usage = await this.getTodayUsage();
    usage.count += 1;
    usage.lastReset = new Date().toISOString();
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
    
    return this.getPromptLimitStatus();
  }

  /**
   * Get today's usage data
   */
  private static async getTodayUsage(): Promise<PromptUsage> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const usage: PromptUsage = JSON.parse(stored);
        const today = new Date().toDateString();
        
        // Check if we need to reset for a new day
        if (usage.date !== today) {
          const newUsage: PromptUsage = {
            date: today,
            count: 0,
            lastReset: new Date().toISOString()
          };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
          return newUsage;
        }
        
        return usage;
      }
    } catch (error) {
      console.error('Error getting prompt usage:', error);
    }
    
    // Return default usage for today
    const today = new Date().toDateString();
    const defaultUsage: PromptUsage = {
      date: today,
      count: 0,
      lastReset: new Date().toISOString()
    };
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsage));
    return defaultUsage;
  }

  /**
   * Reset prompt usage (for testing or admin purposes)
   */
  static async resetPromptUsage(): Promise<void> {
    const today = new Date().toDateString();
    const resetUsage: PromptUsage = {
      date: today,
      count: 0,
      lastReset: new Date().toISOString()
    };
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(resetUsage));
  }

  /**
   * Get formatted time until reset
   */
  static getTimeUntilReset(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const now = new Date();
    const diff = tomorrow.getTime() - now.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

