import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;

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
    consultation: {
        newMessages: boolean;
        consultationUpdates: boolean;
        feedbackRequests: boolean;
    };
    system: {
        securityAlerts: boolean;
        maintenanceUpdates: boolean;
        featureAnnouncements: boolean;
    };
}

export default function NotificationsSettings() {
    const { user, userData } = useAuth();
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
        consultation: {
            newMessages: true,
            consultationUpdates: true,
            feedbackRequests: true,
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
        loadNotificationSettings();
    }, [user]);

    const loadNotificationSettings = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const response = await apiService.get('/user/notification-settings');
            if (response.success && response.data) {
                setSettings(prevSettings => ({
                    ...prevSettings,
                    ...response.data,
                }));
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
        if (!user) return;

        try {
            setLoading(true);
            const updatedSettings = { ...settings, ...newSettings };
            const response = await apiService.patch('/user/notification-settings', updatedSettings);
            
            if (response.success) {
                setSettings(updatedSettings);
                // Silent success - no modal
            } else {
                Alert.alert('Error', response.message || 'Failed to save notification settings.');
            }
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
                            consultation: {
                                newMessages: true,
                                consultationUpdates: true,
                                feedbackRequests: true,
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
                <Icon name={icon} size={24} color="#4CAF50" />
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

    const isDoctor = userData?.userType === 'doctor';

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.content, { maxWidth }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Icon name="back" size={20} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Notifications</Text>
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={resetToDefaults}
                        >
                            <Icon name="refresh" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                    </View>

                    {/* Communication Channels */}
                    {renderSection(
                        'Communication Channels',
                        'message',
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

                    {/* Consultation */}
                    {renderSection(
                        'Consultation',
                        'chat',
                        <View style={styles.sectionContent}>
                            {renderToggleItem(
                                'New Messages',
                                'Get notified when you receive new consultation messages',
                                settings.consultation.newMessages,
                                (value) => handleToggle('consultation', 'newMessages', value),
                                'consultation',
                                'newMessages'
                            )}
                            {renderToggleItem(
                                'Consultation Updates',
                                'Receive updates about your consultation status',
                                settings.consultation.consultationUpdates,
                                (value) => handleToggle('consultation', 'consultationUpdates', value),
                                'consultation',
                                'consultationUpdates'
                            )}
                            {renderToggleItem(
                                'Feedback Requests',
                                'Get notified when feedback is requested',
                                settings.consultation.feedbackRequests,
                                (value) => handleToggle('consultation', 'feedbackRequests', value),
                                'consultation',
                                'feedbackRequests'
                            )}
                        </View>,
                        'Manage consultation-related notifications'
                    )}

                    {/* System */}
                    {renderSection(
                        'System Notifications',
                        'settings',
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
                        <TouchableOpacity 
                            style={styles.quickActionButton} 
                            onPress={() => {
                                const allOn = {
                                    communication: { email: true, sms: true, push: true, inApp: true },
                                    appointments: { reminders: true, confirmations: true, cancellations: true, reschedules: true },
                                    consultation: { newMessages: true, consultationUpdates: true, feedbackRequests: true },
                                    system: { securityAlerts: true, maintenanceUpdates: true, featureAnnouncements: true },
                                };
                                setSettings(allOn);
                                saveNotificationSettings(allOn);
                            }}
                        >
                            <Icon name="check" size={20} color="#4CAF50" />
                            <Text style={styles.quickActionText}>Enable All</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.quickActionButton} 
                            onPress={() => {
                                const allOff = {
                                    communication: { email: false, sms: false, push: false, inApp: false },
                                    appointments: { reminders: false, confirmations: false, cancellations: false, reschedules: false },
                                    consultation: { newMessages: false, consultationUpdates: false, feedbackRequests: false },
                                    system: { securityAlerts: false, maintenanceUpdates: false, featureAnnouncements: false },
                                };
                                setSettings(allOff);
                                saveNotificationSettings(allOff);
                            }}
                        >
                            <Icon name="close" size={20} color="#FF3B30" />
                            <Text style={[styles.quickActionText, { color: '#FF3B30' }]}>Disable All</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
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
        marginTop: 20,
        borderRadius: 12,
        marginBottom: 20,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
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