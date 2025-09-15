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
import { apiService } from '../app/services/apiService';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;

interface PrivacySettings {
    profileVisibility: {
        showToDoctors: boolean;
        showToPatients: boolean;
    };
    dataSharing: {
        allowAnalytics: boolean;
        allowResearch: boolean;
    };
    communication: {
        email: boolean;
        sms: boolean;
        push: boolean;
    };
    security: {
        loginNotifications: boolean;
        sessionTimeout: number;
    };
}

export default function PrivacySettings() {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<PrivacySettings>({
        profileVisibility: {
            showToDoctors: true,
            showToPatients: userData?.userType === 'doctor',
        },
        dataSharing: {
            allowAnalytics: true,
            allowResearch: false,
        },
        communication: {
            email: true,
            sms: true,
            push: true,
        },
        security: {
            loginNotifications: true,
            sessionTimeout: 30,
        },
    });

    useEffect(() => {
        if (!user) {
            router.replace('/');
            return;
        }
        loadPrivacySettings();
    }, [user]);

    const loadPrivacySettings = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const response = await apiService.get('/user/privacy-settings');
            if (response.success && response.data) {
                setSettings(prevSettings => ({
                    ...prevSettings,
                    ...response.data,
                }));
            }
        } catch (error) {
            console.error('Error loading privacy settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const savePrivacySettings = async (newSettings: Partial<PrivacySettings>) => {
        if (!user) return;

        try {
            setLoading(true);
            const updatedSettings = { ...settings, ...newSettings };
            const response = await apiService.patch('/user/privacy-settings', updatedSettings);
            
            if (response.success) {
                setSettings(updatedSettings);
                // Silent success - no modal
            } else {
                Alert.alert('Error', response.message || 'Failed to save privacy settings.');
            }
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
                                showToPatients: userData?.userType === 'doctor',
                            },
                            dataSharing: {
                                allowAnalytics: true,
                                allowResearch: false,
                            },
                            communication: {
                                email: true,
                                sms: true,
                                push: true,
                            },
                            security: {
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
                        <Text style={styles.headerTitle}>Privacy Settings</Text>
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={resetToDefaults}
                        >
                            <Icon name="refresh" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                    </View>

                    {/* Profile Visibility */}
                    {renderSection(
                        'Profile Visibility',
                        'eye',
                        <View style={styles.sectionContent}>
                            {renderToggleItem(
                                isDoctor ? 'Show to Patients' : 'Show to Doctors',
                                isDoctor 
                                    ? 'Allow patients to view your profile information'
                                    : 'Allow doctors to view your profile information',
                                isDoctor 
                                    ? settings.profileVisibility.showToPatients
                                    : settings.profileVisibility.showToDoctors,
                                (value) => handleToggle(
                                    'profileVisibility', 
                                    isDoctor ? 'showToPatients' : 'showToDoctors', 
                                    value
                                ),
                                'profileVisibility',
                                isDoctor ? 'showToPatients' : 'showToDoctors'
                            )}
                        </View>,
                        'Control who can see your profile information'
                    )}

                    {/* Data Sharing */}
                    {renderSection(
                        'Data Sharing',
                        'share',
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
                                'Allow your data to be used for consultation research (anonymized)',
                                settings.dataSharing.allowResearch,
                                (value) => handleToggle('dataSharing', 'allowResearch', value),
                                'dataSharing',
                                'allowResearch'
                            )}
                        </View>,
                        'Control how your data is shared and used'
                    )}

                    {/* Communication */}
                    {renderSection(
                        'Communication',
                        'message',
                        <View style={styles.sectionContent}>
                            {renderToggleItem(
                                'Email Notifications',
                                'Receive important updates via email',
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
                        </View>,
                        'Manage your communication preferences'
                    )}

                    {/* Security */}
                    {renderSection(
                        'Security',
                        'shield',
                        <View style={styles.sectionContent}>
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
                            <Icon name="document" size={20} color="#4CAF50" />
                            <Text style={styles.privacyPolicyText}>View Privacy Policy</Text>
                            <Icon name="arrow-forward" size={20} color="#4CAF50" />
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
}); 