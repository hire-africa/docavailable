import notifee, { AndroidCategory, AndroidImportance, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';

const CHANNEL_ID = 'on-duty-channel';
const NOTIFICATION_ID = 'doctor-on-duty';

class OnDutyNotificationService {
    private isInitialized = false;

    // Initialize the notification channel (required for Android)
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Create a channel for on-duty notifications (Android only)
            if (Platform.OS === 'android') {
                await notifee.createChannel({
                    id: CHANNEL_ID,
                    name: 'On Duty Status',
                    description: 'Shows when you are available for instant sessions',
                    importance: AndroidImportance.LOW, // Low importance = no sound, but visible
                });
            }

            // Listen for notification action button presses
            notifee.onForegroundEvent(({ type, detail }) => {
                if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'go-offline') {
                    console.log('🔴 [OnDutyNotification] Go Offline action pressed');
                    // The component will handle the actual toggle via callback
                    if (this.onGoOfflineCallback) {
                        this.onGoOfflineCallback();
                    }
                }
            });

            // Also handle background events
            notifee.onBackgroundEvent(async ({ type, detail }) => {
                if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'go-offline') {
                    console.log('🔴 [OnDutyNotification] Go Offline action pressed (background)');
                    if (this.onGoOfflineCallback) {
                        this.onGoOfflineCallback();
                    }
                }
            });

            this.isInitialized = true;
            console.log('✅ [OnDutyNotification] Service initialized');
        } catch (error) {
            console.error('❌ [OnDutyNotification] Failed to initialize:', error);
        }
    }

    private onGoOfflineCallback: (() => void) | null = null;

    // Set callback for when "Go Offline" is pressed
    setOnGoOfflineCallback(callback: () => void): void {
        this.onGoOfflineCallback = callback;
    }

    // Show the on-duty notification
    async showOnDutyNotification(doctorName?: string): Promise<void> {
        try {
            await this.initialize();

            const title = '🟢 You are On Duty';
            const body = doctorName
                ? `Dr. ${doctorName}, you are available for instant sessions`
                : 'You are available for instant sessions';

            if (Platform.OS === 'android') {
                // Android: Foreground service notification (sticky)
                await notifee.displayNotification({
                    id: NOTIFICATION_ID,
                    title,
                    body,
                    android: {
                        channelId: CHANNEL_ID,
                        smallIcon: 'ic_launcher', // Default app launcher icon (always exists)
                        color: '#4CAF50',
                        ongoing: true, // Can't be swiped away
                        autoCancel: false,
                        category: AndroidCategory.SERVICE,
                        pressAction: {
                            id: 'default',
                            launchActivity: 'default',
                        },
                        actions: [
                            {
                                title: '🔴 Go Offline',
                                pressAction: {
                                    id: 'go-offline',
                                },
                            },
                        ],
                    },
                });
            } else {
                // iOS: Regular notification (can be dismissed)
                await notifee.displayNotification({
                    id: NOTIFICATION_ID,
                    title,
                    body,
                    ios: {
                        categoryId: 'on-duty',
                    },
                });
            }

            console.log('✅ [OnDutyNotification] Notification displayed');
        } catch (error) {
            console.error('❌ [OnDutyNotification] Failed to show notification:', error);
        }
    }

    // Hide the on-duty notification
    async hideOnDutyNotification(): Promise<void> {
        try {
            await notifee.cancelNotification(NOTIFICATION_ID);
            console.log('✅ [OnDutyNotification] Notification hidden');
        } catch (error) {
            console.error('❌ [OnDutyNotification] Failed to hide notification:', error);
        }
    }

    // Check if notification is currently showing
    async isNotificationShowing(): Promise<boolean> {
        try {
            const notifications = await notifee.getDisplayedNotifications();
            return notifications.some(n => n.id === NOTIFICATION_ID);
        } catch (error) {
            console.error('❌ [OnDutyNotification] Failed to check notification status:', error);
            return false;
        }
    }
}

export const onDutyNotificationService = new OnDutyNotificationService();
export default onDutyNotificationService;
