import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../app/services/apiService';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;

interface Settings {
    notifications: {
        appointments: boolean;
        messages: boolean;
        system: boolean;
    };
    privacy: {
        profileVisibility: boolean;
        dataSharing: boolean;
        anonymousMode: boolean;
    };
    security: {
        loginNotifications: boolean;
        sessionTimeout: number;
    };
    preferences: {
        theme: 'light' | 'dark' | 'auto';
        language: string;
        timezone: string;
    };
}

interface UserData {
    notifications?: {
        appointments?: boolean;
        consultation?: boolean;
        system?: boolean;
    };
    privacy_preferences?: {
        profileVisibility?: boolean;
        dataSharing?: boolean;
        privacy?: {
            anonymousMode?: boolean;
        };
        security?: {
            loginNotifications?: boolean;
            sessionTimeout?: number;
        };
    };
}

export default function PatientSettings() {
    return (
        <>
            <Stack.Screen 
                options={{ 
                    headerShown: false 
                }} 
            />
            <PatientSettingsContent />
        </>
    );
}

function PatientSettingsContent() {
    const { user, userData, refreshUserData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showAnonymousWarning, setShowAnonymousWarning] = useState(false);
    const [pendingAnonymousMode, setPendingAnonymousMode] = useState(false);
    const [settings, setSettings] = useState<Settings>({
        notifications: {
            appointments: true,
            messages: true,
            system: true,
        },
        privacy: {
            profileVisibility: true,
            dataSharing: true,
            anonymousMode: false,
        },
        security: {
            loginNotifications: true,
            sessionTimeout: 30,
        },
        preferences: {
            theme: 'light',
            language: 'en',
            timezone: 'UTC',
        },
    });

    useEffect(() => {
        if (!user) {
            router.replace('/');
            return;
        }
        loadSettings();
    }, [user]);

    // Reload settings when page comes into focus
    useFocusEffect(
        React.useCallback(() => {
            if (user) {
                loadSettings();
            }
        }, [user])
    );

    const loadSettings = async () => {
        if (!user) return;

        try {
            setLoading(true);
            // Load combined settings from both endpoints
            const [notificationsResponse, privacyResponse] = await Promise.all([
                apiService.get('/user/notification-settings'),
                apiService.get('/user/privacy-settings')
            ]);

            if (notificationsResponse.success && notificationsResponse.data) {
                setSettings(prev => ({
                    ...prev,
                    notifications: {
                        appointments: (notificationsResponse.data as any)?.appointments?.reminders ?? true,
                        messages: (notificationsResponse.data as any)?.consultation?.newMessages ?? true,
                        system: (notificationsResponse.data as any)?.system?.securityAlerts ?? true,
                    }
                }));
            }

            if (privacyResponse.success && privacyResponse.data) {
                const anonymousMode = (privacyResponse.data as any)?.privacy?.anonymousMode ?? false;
                console.log('🔍 Loading anonymous mode setting:', anonymousMode);
                setSettings(prev => ({
                    ...prev,
                    privacy: {
                        profileVisibility: (privacyResponse.data as any)?.profileVisibility?.showToDoctors ?? true,
                        dataSharing: (privacyResponse.data as any)?.dataSharing?.allowAnalytics ?? true,
                        anonymousMode: anonymousMode,
                    },
                    security: {
                        loginNotifications: (privacyResponse.data as any)?.security?.loginNotifications ?? true,
                        sessionTimeout: (privacyResponse.data as any)?.security?.sessionTimeout ?? 30,
                    }
                }));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (newSettings: Partial<Settings>) => {
        if (!user) return;

        try {
            setLoading(true);
            const updatedSettings = { ...settings, ...newSettings };
            setSettings(updatedSettings);

            // Save notification settings
            await apiService.patch('/user/notification-settings', {
                appointments: {
                    reminders: updatedSettings.notifications.appointments,
                },
                consultation: {
                    newMessages: updatedSettings.notifications.messages,
                },
                system: {
                    securityAlerts: updatedSettings.notifications.system,
                }
            });

            // Save privacy settings
            console.log('🔍 Saving anonymous mode setting:', updatedSettings.privacy.anonymousMode);
            const privacyResponse = await apiService.patch('/user/privacy-settings', {
                profileVisibility: {
                    showToDoctors: updatedSettings.privacy.profileVisibility,
                },
                dataSharing: {
                    allowAnalytics: updatedSettings.privacy.dataSharing,
                },
                privacy: {
                    anonymousMode: updatedSettings.privacy.anonymousMode,
                },
                security: {
                    loginNotifications: updatedSettings.security.loginNotifications,
                    sessionTimeout: updatedSettings.security.sessionTimeout,
                }
            });
            console.log('🔍 Privacy settings save response:', privacyResponse);

            // Refresh user data to ensure settings are updated
            if (userData) {
                await refreshUserData();
            }

            // Settings saved successfully
        } catch (error) {
            console.error('Error saving settings:', error);
            Alert.alert('Error', 'Failed to save settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = (path: string, value: any) => {
        // Special handling for anonymous mode toggle
        if (path === 'privacy.anonymousMode' && value === true && !settings.privacy.anonymousMode) {
            // Show warning modal before enabling anonymous mode
            setPendingAnonymousMode(true);
            setShowAnonymousWarning(true);
            return;
        }

        // Allow disabling anonymous mode without warning
        if (path === 'privacy.anonymousMode' && value === false) {
            const keys = path.split('.');
            const newSettings = { ...settings };
            let current = newSettings;
            
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            
            setSettings(newSettings);
            saveSettings(newSettings);
            return;
        }

        const keys = path.split('.');
        const newSettings = { ...settings };
        let current = newSettings;
        
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    const handleAnonymousModeConfirm = () => {
        // Enable anonymous mode
        const newSettings = { ...settings };
        newSettings.privacy.anonymousMode = true;
        setSettings(newSettings);
        saveSettings(newSettings);
        
        // Close modal
        setShowAnonymousWarning(false);
        setPendingAnonymousMode(false);
    };

    const handleAnonymousModeCancel = () => {
        // Keep anonymous mode disabled
        setShowAnonymousWarning(false);
        setPendingAnonymousMode(false);
    };

    if (loading && !settings) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading settings...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Icon name="arrowLeft" size={20} color="#222" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Notifications Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    
                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Icon name="calendar" size={20} color="#4CAF50" />
                            <View style={styles.settingText}>
                                <Text style={styles.settingLabel}>Appointment Notifications</Text>
                                <Text style={styles.settingDescription}>Reminders and updates about appointments</Text>
                            </View>
                        </View>
                        <Switch
                            value={settings.notifications.appointments}
                            onValueChange={(value) => updateSetting('notifications.appointments', value)}
                            trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                            thumbColor={settings.notifications.appointments ? '#FFFFFF' : '#FFFFFF'}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Icon name="comments" size={20} color="#4CAF50" />
                            <View style={styles.settingText}>
                                <Text style={styles.settingLabel}>Message Notifications</Text>
                                <Text style={styles.settingDescription}>New messages and consultation updates</Text>
                            </View>
                        </View>
                        <Switch
                            value={settings.notifications.messages}
                            onValueChange={(value) => updateSetting('notifications.messages', value)}
                            trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                            thumbColor={settings.notifications.messages ? '#FFFFFF' : '#FFFFFF'}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Icon name="bell" size={20} color="#4CAF50" />
                            <View style={styles.settingText}>
                                <Text style={styles.settingLabel}>System Notifications</Text>
                                <Text style={styles.settingDescription}>Security alerts and system updates</Text>
                            </View>
                        </View>
                        <Switch
                            value={settings.notifications.system}
                            onValueChange={(value) => updateSetting('notifications.system', value)}
                            trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                            thumbColor={settings.notifications.system ? '#FFFFFF' : '#FFFFFF'}
                        />
                    </View>
                </View>

                {/* Privacy Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Privacy & Security</Text>
                    
                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Icon name="eye" size={20} color="#4CAF50" />
                            <View style={styles.settingText}>
                                <Text style={styles.settingLabel}>Profile Visibility</Text>
                                <Text style={styles.settingDescription}>Show profile to doctors</Text>
                            </View>
                        </View>
                        <Switch
                            value={settings.privacy.profileVisibility}
                            onValueChange={(value) => updateSetting('privacy.profileVisibility', value)}
                            trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                            thumbColor={settings.privacy.profileVisibility ? '#FFFFFF' : '#FFFFFF'}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Icon name="user" size={20} color="#4CAF50" />
                            <View style={styles.settingText}>
                                <Text style={styles.settingLabel}>Anonymous Consultations</Text>
                                <Text style={styles.settingDescription}>Hide your name and profile in all consultations</Text>
                            </View>
                        </View>
                        <Switch
                            value={pendingAnonymousMode ? true : settings.privacy.anonymousMode}
                            onValueChange={(value) => updateSetting('privacy.anonymousMode', value)}
                            trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                            thumbColor={settings.privacy.anonymousMode ? '#FFFFFF' : '#FFFFFF'}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Icon name="lock" size={20} color="#4CAF50" />
                            <View style={styles.settingText}>
                                <Text style={styles.settingLabel}>Login Notifications</Text>
                                <Text style={styles.settingDescription}>Get notified of new login attempts</Text>
                            </View>
                        </View>
                        <Switch
                            value={settings.security.loginNotifications}
                            onValueChange={(value) => updateSetting('security.loginNotifications', value)}
                            trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                            thumbColor={settings.security.loginNotifications ? '#FFFFFF' : '#FFFFFF'}
                        />
                    </View>
                </View>

            </ScrollView>

            {/* Anonymous Mode Warning Modal */}
            <Modal
                visible={showAnonymousWarning}
                transparent={true}
                animationType="fade"
                onRequestClose={handleAnonymousModeCancel}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={styles.warningIconContainer}>
                                <Icon name="warning" size={32} color="#FF6B35" />
                            </View>
                            <Text style={styles.modalTitle}>Enable Anonymous Consultations?</Text>
                        </View>

                        <View style={styles.modalContent}>
                            <Text style={styles.modalDescription}>
                                By enabling anonymous consultations, your name and profile picture will be hidden from doctors during all consultations.
                            </Text>
                            
                            <View style={styles.warningSection}>
                                <Text style={styles.warningTitle}>Important Considerations:</Text>
                                
                                <View style={styles.warningItem}>
                                    <Icon name="close" size={16} color="#FF6B35" />
                                    <Text style={styles.warningText}>
                                        Doctors won't be able to follow up on your condition or medical history
                                    </Text>
                                </View>
                                
                                <View style={styles.warningItem}>
                                    <Icon name="close" size={16} color="#FF6B35" />
                                    <Text style={styles.warningText}>
                                        Emergency services may not work properly as they won't be connected to your patient profile
                                    </Text>
                                </View>
                                
                                <View style={styles.warningItem}>
                                    <Icon name="close" size={16} color="#FF6B35" />
                                    <Text style={styles.warningText}>
                                        Medical records and consultation history may be limited
                                    </Text>
                                </View>
                                
                                <View style={styles.warningItem}>
                                    <Icon name="close" size={16} color="#FF6B35" />
                                    <Text style={styles.warningText}>
                                        You can disable this feature at any time in settings
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={handleAnonymousModeCancel}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleAnonymousModeConfirm}
                            >
                                <Text style={styles.confirmButtonText}>Enable Anonymous Mode</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F7FA',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
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
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F8F9FA',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#222',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        marginLeft: 12,
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 14,
        color: '#666',
    },
    dangerItem: {
        borderWidth: 1,
        borderColor: '#FFE6E6',
    },
    dangerText: {
        color: '#FF3B30',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    warningIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFF5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#222',
        textAlign: 'center',
    },
    modalContent: {
        marginBottom: 24,
    },
    modalDescription: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 20,
    },
    warningSection: {
        backgroundColor: '#FFF8F5',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B35',
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF6B35',
        marginBottom: 12,
    },
    warningItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    warningText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginLeft: 8,
        flex: 1,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    confirmButton: {
        backgroundColor: '#FF6B35',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
