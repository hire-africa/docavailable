import { authService } from '@/services/authService';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;
const isLargeScreen = width > 768;

interface NotificationSettings {
    communication: {
        email: boolean;
        sms: boolean;
        push: boolean;
        inApp: boolean;
    };
    appointments: {
        reminders: boolean;
        confirmations: boolean;
        cancellations: boolean;
        reschedules: boolean;
    };
    marketing: {
        promotionalMessages: boolean;
        healthNews: boolean;
        specialOffers: boolean;
        surveys: boolean;
    };
    system: {
        securityAlerts: boolean;
        maintenanceUpdates: boolean;
        featureAnnouncements: boolean;
    };
}

export default function NotificationsSettings() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<NotificationSettings>({
        communication: {
            email: true,
            sms: true,
            push: true,
            inApp: true,
        },
        appointments: {
            reminders: true,
            confirmations: true,
            cancellations: true,
            reschedules: true,
        },
        marketing: {
            promotionalMessages: false,
            healthNews: false,
            specialOffers: false,
            surveys: false,
        },
        system: {
            securityAlerts: true,
            maintenanceUpdates: false,
            featureAnnouncements: false,
        },
    });

    useEffect(() => {
        if (!user) {
            router.replace('/');
            return;
        }

        // Load existing notification settings from Firestore
        loadNotificationSettings();
    }, [user]);

    const loadNotificationSettings = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const userDoc = await authService.getUserById(user.uid);
            if (userDoc?.notificationSettings) {
                setSettings(prevSettings => ({
                    ...prevSettings,
                    ...userDoc.notificationSettings,
                }));
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
            Alert.alert('Error', 'Failed to load notification settings.');
        } finally {
            setLoading(false);
        }
    };

    const saveNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
        if (!user) return;

        try {
            setLoading(true);
            const updatedSettings = { ...settings, ...newSettings };
            await authService.updateUser(user.uid, {
                notificationSettings: updatedSettings,
                updatedAt: new Date(),
            });
            setSettings(updatedSettings);
            Alert.alert('Success', 'Notification settings updated successfully.');
        } catch (error) {
            console.error('Error saving notification settings:', error);
            Alert.alert('Error', 'Failed to save notification settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (category: keyof NotificationSettings, key: string, value: boolean) => {
        const newSettings = {
            ...settings,
            [category]: {
                ...settings[category],
                [key]: value,
            },
        };
        setSettings(newSettings);
        await saveNotificationSettings(newSettings);
    };

    const resetToDefaults = async () => {
        Alert.alert(
            'Reset Notification Settings',
            'Are you sure you want to reset all notification settings to default values?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        const defaultSettings: NotificationSettings = {
                            communication: {
                                email: true,
                                sms: true,
                                push: true,
                                inApp: true,
                            },
                            appointments: {
                                reminders: true,
                                confirmations: true,
                                cancellations: true,
                                reschedules: true,
                            },
                            marketing: {
                                promotionalMessages: false,
                                healthNews: false,
                                specialOffers: false,
                                surveys: false,
                            },
                            system: {
                                securityAlerts: true,
                                maintenanceUpdates: false,
                                featureAnnouncements: false,
                            },
                        };
                        setSettings(defaultSettings);
                        await saveNotificationSettings(defaultSettings);
                    },
                },
            ]
        );
    };

    const renderSection = (
        title: string,
        icon: string,
        children: React.ReactNode,
        description?: string
    ) => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <FontAwesome name={icon as any} size={20} color="#4CAF50" />
                <View style={styles.sectionTitleContainer}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    {description && <Text style={styles.sectionDescription}>{description}</Text>}
                </View>
            </View>
            {children}
        </View>
    );

    const renderToggleItem = (
        title: string,
        description: string,
        value: boolean,
        onToggle: (value: boolean) => void,
        category: keyof NotificationSettings,
        key: string
    ) => (
        <View style={styles.toggleItem}>
            <View style={styles.toggleContent}>
                <Text style={styles.toggleTitle}>{title}</Text>
                <Text style={styles.toggleDescription}>{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={(newValue) => onToggle(newValue)}
                trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
                disabled={loading}
            />
        </View>
    );

    if (!user) return null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainContent}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <FontAwesome name="arrow-left" size={20} color="#4CAF50" />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
                        <FontAwesome name="refresh" size={20} color="#FF3B30" />
                        <Text style={styles.resetButtonText}>Reset</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Communication Channels */}
                    {renderSection(
                        'Communication Channels',
                        'envelope',
                        <View style={styles.sectionContent}>
                            {renderToggleItem(
                                'Email Notifications',
                                'Receive notifications via email',
                                settings.communication.email,
                                (value) => handleToggle('communication', 'email', value),
                                'communication',
                                'email'
                            )}
                            {renderToggleItem(
                                'SMS Notifications',
                                'Receive urgent notifications via text message',
                                settings.communication.sms,
                                (value) => handleToggle('communication', 'sms', value),
                                'communication',
                                'sms'
                            )}
                            {renderToggleItem(
                                'Push Notifications',
                                'Receive notifications on your device',
                                settings.communication.push,
                                (value) => handleToggle('communication', 'push', value),
                                'communication',
                                'push'
                            )}
                            {renderToggleItem(
                                'In-App Notifications',
                                'Show notifications within the app',
                                settings.communication.inApp,
                                (value) => handleToggle('communication', 'inApp', value),
                                'communication',
                                'inApp'
                            )}
                        </View>,
                        'Choose how you want to receive notifications'
                    )}

                    {/* Appointments */}
                    {renderSection(
                        'Appointments',
                        'calendar',
                        <View style={styles.sectionContent}>
                            {renderToggleItem(
                                'Appointment Reminders',
                                'Get reminded about upcoming appointments',
                                settings.appointments.reminders,
                                (value) => handleToggle('appointments', 'reminders', value),
                                'appointments',
                                'reminders'
                            )}
                            {renderToggleItem(
                                'Appointment Confirmations',
                                'Receive confirmation when appointments are scheduled',
                                settings.appointments.confirmations,
                                (value) => handleToggle('appointments', 'confirmations', value),
                                'appointments',
                                'confirmations'
                            )}
                            {renderToggleItem(
                                'Cancellation Notifications',
                                'Get notified when appointments are cancelled',
                                settings.appointments.cancellations,
                                (value) => handleToggle('appointments', 'cancellations', value),
                                'appointments',
                                'cancellations'
                            )}
                            {renderToggleItem(
                                'Reschedule Notifications',
                                'Receive updates when appointments are rescheduled',
                                settings.appointments.reschedules,
                                (value) => handleToggle('appointments', 'reschedules', value),
                                'appointments',
                                'reschedules'
                            )}
                        </View>,
                        'Manage appointment-related notifications'
                    )}

                    {/* Marketing */}
                    {renderSection(
                        'Marketing & Promotions',
                        'gift',
                        <View style={styles.sectionContent}>
                            {renderToggleItem(
                                'Promotional Messages',
                                'Receive offers and promotional content',
                                settings.marketing.promotionalMessages,
                                (value) => handleToggle('marketing', 'promotionalMessages', value),
                                'marketing',
                                'promotionalMessages'
                            )}
                            {renderToggleItem(
                                'Health News',
                                'Get updates on health-related news and articles',
                                settings.marketing.healthNews,
                                (value) => handleToggle('marketing', 'healthNews', value),
                                'marketing',
                                'healthNews'
                            )}
                            {renderToggleItem(
                                'Special Offers',
                                'Receive notifications about special offers and discounts',
                                settings.marketing.specialOffers,
                                (value) => handleToggle('marketing', 'specialOffers', value),
                                'marketing',
                                'specialOffers'
                            )}
                            {renderToggleItem(
                                'Surveys & Feedback',
                                'Participate in surveys to help improve our services',
                                settings.marketing.surveys,
                                (value) => handleToggle('marketing', 'surveys', value),
                                'marketing',
                                'surveys'
                            )}
                        </View>,
                        'Manage promotional and marketing communications'
                    )}

                    {/* System */}
                    {renderSection(
                        'System Notifications',
                        'cog',
                        <View style={styles.sectionContent}>
                            {renderToggleItem(
                                'Security Alerts',
                                'Get notified about security-related events',
                                settings.system.securityAlerts,
                                (value) => handleToggle('system', 'securityAlerts', value),
                                'system',
                                'securityAlerts'
                            )}
                            {renderToggleItem(
                                'Maintenance Updates',
                                'Receive notifications about system maintenance',
                                settings.system.maintenanceUpdates,
                                (value) => handleToggle('system', 'maintenanceUpdates', value),
                                'system',
                                'maintenanceUpdates'
                            )}
                            {renderToggleItem(
                                'Feature Announcements',
                                'Learn about new features and improvements',
                                settings.system.featureAnnouncements,
                                (value) => handleToggle('system', 'featureAnnouncements', value),
                                'system',
                                'featureAnnouncements'
                            )}
                        </View>,
                        'System and security notifications'
                    )}

                    {/* Quick Actions */}
                    <View style={styles.quickActionsSection}>
                        <TouchableOpacity style={styles.quickActionButton} onPress={() => {
                            // Toggle all notifications on
                            const allOn = {
                                communication: { email: true, sms: true, push: true, inApp: true },
                                appointments: { reminders: true, confirmations: true, cancellations: true, reschedules: true },
                                marketing: { promotionalMessages: true, healthNews: true, specialOffers: true, surveys: true },
                                system: { securityAlerts: true, maintenanceUpdates: true, featureAnnouncements: true },
                            };
                            setSettings(allOn);
                            saveNotificationSettings(allOn);
                        }}>
                            <FontAwesome name="check-square-o" size={20} color="#4CAF50" />
                            <Text style={styles.quickActionText}>Enable All</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickActionButton} onPress={() => {
                            // Toggle all notifications off
                            const allOff = {
                                communication: { email: false, sms: false, push: false, inApp: false },
                                appointments: { reminders: false, confirmations: false, cancellations: false, reschedules: false },
                                marketing: { promotionalMessages: false, healthNews: false, specialOffers: false, surveys: false },
                                system: { securityAlerts: false, maintenanceUpdates: false, featureAnnouncements: false },
                            };
                            setSettings(allOff);
                            saveNotificationSettings(allOff);
                        }}>
                            <FontAwesome name="square-o" size={20} color="#FF3B30" />
                            <Text style={[styles.quickActionText, { color: '#FF3B30' }]}>Disable All</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    mainContent: {
        flex: 1,
        maxWidth: maxWidth,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 16,
        color: '#4CAF50',
        marginLeft: 8,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resetButtonText: {
        fontSize: 16,
        color: '#FF3B30',
        marginLeft: 8,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    sectionTitleContainer: {
        flex: 1,
        marginLeft: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    sectionContent: {
        gap: 16,
    },
    toggleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    toggleContent: {
        flex: 1,
        marginRight: 16,
    },
    toggleTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    toggleDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    quickActionsSection: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        marginBottom: 40,
    },
    quickActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    quickActionText: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: '600',
        marginLeft: 8,
    },
}); 