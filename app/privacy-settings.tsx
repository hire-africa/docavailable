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
import { authService } from '@/services/authService';
import HelpSupport from './help-support';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;
const isLargeScreen = width > 768;

interface PrivacySettings {
    profileVisibility: {
        showToDoctors: boolean;
    };
    dataSharing: {
        allowAnalytics: boolean;
        allowResearch: boolean;
        allowMarketing: boolean;
    };
    notifications: {
        email: boolean;
        sms: boolean;
        push: boolean;
        appointmentReminders: boolean;
        healthUpdates: boolean;
        promotionalMessages: boolean;
    };
    security: {
        twoFactorAuth: boolean;
        loginNotifications: boolean;
        sessionTimeout: number; // in minutes
    };
}

export default function PrivacySettings() {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<PrivacySettings>({
        profileVisibility: {
            showToDoctors: true,
        },
        dataSharing: {
            allowAnalytics: true,
            allowResearch: false,
            allowMarketing: false,
        },
        notifications: {
            email: true,
            sms: true,
            push: true,
            appointmentReminders: true,
            healthUpdates: true,
            promotionalMessages: false,
        },
        security: {
            twoFactorAuth: false,
            loginNotifications: true,
            sessionTimeout: 30,
        },
    });

    useEffect(() => {
        if (!user) {
            router.replace('/');
            return;
        }

        // Load existing privacy settings from Firestore
        loadPrivacySettings();
    }, [user]);

    const loadPrivacySettings = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const userDoc = await authService.getUserById(user.uid);
            if (userDoc?.privacySettings) {
                setSettings(prevSettings => ({
                    ...prevSettings,
                    ...userDoc.privacySettings,
                }));
            }
        } catch (error) {
            console.error('Error loading privacy settings:', error);
            Alert.alert('Error', 'Failed to load privacy settings.');
        } finally {
            setLoading(false);
        }
    };

    const savePrivacySettings = async (newSettings: Partial<PrivacySettings>) => {
        if (!user) return;

        try {
            setLoading(true);
            const updatedSettings = { ...settings, ...newSettings };
            await authService.updateUser(user.uid, {
                privacySettings: updatedSettings,
                updatedAt: new Date(),
            });
            setSettings(updatedSettings);
            Alert.alert('Success', 'Privacy settings updated successfully.');
        } catch (error) {
            console.error('Error saving privacy settings:', error);
            Alert.alert('Error', 'Failed to save privacy settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (category: keyof PrivacySettings, key: string, value: boolean) => {
        const newSettings = {
            ...settings,
            [category]: {
                ...settings[category],
                [key]: value,
            },
        };
        setSettings(newSettings);
        await savePrivacySettings(newSettings);
    };

    const handleSessionTimeoutChange = async (timeout: number) => {
        const newSettings = {
            ...settings,
            security: {
                ...settings.security,
                sessionTimeout: timeout,
            },
        };
        setSettings(newSettings);
        await savePrivacySettings(newSettings);
    };

    const resetToDefaults = async () => {
        Alert.alert(
            'Reset Privacy Settings',
            'Are you sure you want to reset all privacy settings to default values?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        const defaultSettings: PrivacySettings = {
                            profileVisibility: {
                                showToDoctors: true,
                            },
                            dataSharing: {
                                allowAnalytics: true,
                                allowResearch: false,
                                allowMarketing: false,
                            },
                            notifications: {
                                email: true,
                                sms: true,
                                push: true,
                                appointmentReminders: true,
                                healthUpdates: true,
                                promotionalMessages: false,
                            },
                            security: {
                                twoFactorAuth: false,
                                loginNotifications: true,
                                sessionTimeout: 30,
                            },
                        };
                        setSettings(defaultSettings);
                        await savePrivacySettings(defaultSettings);
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
        category: keyof PrivacySettings,
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

    if (userData?.userType === 'doctor') {
        return <HelpSupport />;
    }

    if (!user) return null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainContent}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <FontAwesome name="arrow-left" size={20} color="#4CAF50" />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Privacy Settings</Text>
                    <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
                        <FontAwesome name="refresh" size={20} color="#FF3B30" />
                        <Text style={styles.resetButtonText}>Reset</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Profile Visibility */}
                    {renderSection(
                        'Profile Visibility',
                        'eye',
                        <View style={styles.sectionContent}>
                            {renderToggleItem(
                                'Show to Doctors',
                                'Allow doctors to view your profile information',
                                settings.profileVisibility.showToDoctors,
                                (value) => handleToggle('profileVisibility', 'showToDoctors', value),
                                'profileVisibility',
                                'showToDoctors'
                            )}
                        </View>,
                        'Control who can see your profile information'
                    )}

                    {/* Data Sharing */}
                    {renderSection(
                        'Data Sharing',
                        'share-alt',
                        <View style={styles.sectionContent}>
                            {renderToggleItem(
                                'Analytics',
                                'Help us improve the app by sharing anonymous usage data',
                                settings.dataSharing.allowAnalytics,
                                (value) => handleToggle('dataSharing', 'allowAnalytics', value),
                                'dataSharing',
                                'allowAnalytics'
                            )}
                            {renderToggleItem(
                                'Research',
                                'Allow your data to be used for medical research (anonymized)',
                                settings.dataSharing.allowResearch,
                                (value) => handleToggle('dataSharing', 'allowResearch', value),
                                'dataSharing',
                                'allowResearch'
                            )}
                            {renderToggleItem(
                                'Marketing',
                                'Receive personalized offers and health-related content',
                                settings.dataSharing.allowMarketing,
                                (value) => handleToggle('dataSharing', 'allowMarketing', value),
                                'dataSharing',
                                'allowMarketing'
                            )}
                        </View>,
                        'Control how your data is shared and used'
                    )}

                    {/* Notifications */}
                    {renderSection(
                        'Notifications',
                        'bell',
                        <View style={styles.sectionContent}>
                            {renderToggleItem(
                                'Email Notifications',
                                'Receive important updates via email',
                                settings.notifications.email,
                                (value) => handleToggle('notifications', 'email', value),
                                'notifications',
                                'email'
                            )}
                            {renderToggleItem(
                                'SMS Notifications',
                                'Receive urgent notifications via text message',
                                settings.notifications.sms,
                                (value) => handleToggle('notifications', 'sms', value),
                                'notifications',
                                'sms'
                            )}
                            {renderToggleItem(
                                'Push Notifications',
                                'Receive notifications on your device',
                                settings.notifications.push,
                                (value) => handleToggle('notifications', 'push', value),
                                'notifications',
                                'push'
                            )}
                            {renderToggleItem(
                                'Appointment Reminders',
                                'Get reminded about upcoming appointments',
                                settings.notifications.appointmentReminders,
                                (value) => handleToggle('notifications', 'appointmentReminders', value),
                                'notifications',
                                'appointmentReminders'
                            )}
                            {renderToggleItem(
                                'Health Updates',
                                'Receive updates about your health records',
                                settings.notifications.healthUpdates,
                                (value) => handleToggle('notifications', 'healthUpdates', value),
                                'notifications',
                                'healthUpdates'
                            )}
                            {renderToggleItem(
                                'Promotional Messages',
                                'Receive offers and promotional content',
                                settings.notifications.promotionalMessages,
                                (value) => handleToggle('notifications', 'promotionalMessages', value),
                                'notifications',
                                'promotionalMessages'
                            )}
                        </View>,
                        'Manage your notification preferences'
                    )}

                    {/* Security */}
                    {renderSection(
                        'Security',
                        'shield',
                        <View style={styles.sectionContent}>
                            {renderToggleItem(
                                'Two-Factor Authentication',
                                'Add an extra layer of security to your account',
                                settings.security.twoFactorAuth,
                                (value) => handleToggle('security', 'twoFactorAuth', value),
                                'security',
                                'twoFactorAuth'
                            )}
                            {renderToggleItem(
                                'Login Notifications',
                                'Get notified when someone logs into your account',
                                settings.security.loginNotifications,
                                (value) => handleToggle('security', 'loginNotifications', value),
                                'security',
                                'loginNotifications'
                            )}
                            <View style={styles.sessionTimeoutContainer}>
                                <View style={styles.sessionTimeoutContent}>
                                    <Text style={styles.sessionTimeoutTitle}>Session Timeout</Text>
                                    <Text style={styles.sessionTimeoutDescription}>
                                        Automatically log out after {settings.security.sessionTimeout} minutes of inactivity
                                    </Text>
                                </View>
                                <View style={styles.sessionTimeoutOptions}>
                                    {[15, 30, 60, 120].map((timeout) => (
                                        <TouchableOpacity
                                            key={timeout}
                                            style={[
                                                styles.timeoutOption,
                                                settings.security.sessionTimeout === timeout && styles.timeoutOptionActive,
                                            ]}
                                            onPress={() => handleSessionTimeoutChange(timeout)}
                                            disabled={loading}
                                        >
                                            <Text
                                                style={[
                                                    styles.timeoutOptionText,
                                                    settings.security.sessionTimeout === timeout && styles.timeoutOptionTextActive,
                                                ]}
                                            >
                                                {timeout}m
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>,
                        'Manage your account security settings'
                    )}

                    {/* Privacy Policy Link */}
                    <View style={styles.privacyPolicySection}>
                        <TouchableOpacity style={styles.privacyPolicyButton}>
                            <FontAwesome name="file-text-o" size={20} color="#4CAF50" />
                            <Text style={styles.privacyPolicyText}>View Privacy Policy</Text>
                            <FontAwesome name="chevron-right" size={16} color="#666" />
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
        // paddingTop: 20, // Removed to eliminate extra gap
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
    sessionTimeoutContainer: {
        marginTop: 8,
    },
    sessionTimeoutContent: {
        marginBottom: 12,
    },
    sessionTimeoutTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    sessionTimeoutDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    sessionTimeoutOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    timeoutOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
    },
    timeoutOptionActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    timeoutOptionText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    timeoutOptionTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    privacyPolicySection: {
        marginTop: 20,
        marginBottom: 40,
    },
    privacyPolicyButton: {
        flexDirection: 'row',
        alignItems: 'center',
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
    privacyPolicyText: {
        flex: 1,
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: '600',
        marginLeft: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        padding: 8,
    },
    clearButton: {
        padding: 8,
    },
    categoryContainer: {
        padding: 16,
    },
    categoryContent: {
        gap: 8,
    },
    categoryButton: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
    },
    categoryButtonActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    categoryText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    categoryTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    faqList: {
        flex: 1,
    },
    faqItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    faqQuestion: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    faqAnswer: {
        marginTop: 8,
        color: '#666',
    },
    contactSupportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        marginTop: 16,
    },
    contactSupportText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 12,
    },
    quickActionsSection: {
        marginBottom: 20,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    quickActionCard: {
        flex: 1,
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    quickActionIcon: {
        alignItems: 'center',
        marginBottom: 8,
    },
    quickActionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    quickActionSubtitle: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    contactSection: {
        marginTop: 20,
    },
    contactCard: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    contactInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    contactText: {
        fontSize: 16,
        color: '#666',
        marginLeft: 8,
    },
}); 