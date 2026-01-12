import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { apiService } from '../app/services/apiService';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useCustomTheme } from '../hooks/useCustomTheme';
import { useThemedColors } from '../hooks/useThemedColors';

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

export default function DoctorSettings() {
    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false
                }}
            />
            <DoctorSettingsContent />
        </>
    );
}

function DoctorSettingsContent() {
    const { user, userData } = useAuth();
    const colors = useThemedColors();
    const { isDark } = useCustomTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<Settings>({
        notifications: {
            appointments: true,
            messages: true,
            system: true,
        },
        privacy: {
            profileVisibility: true,
            dataSharing: true,
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
                const data = notificationsResponse.data as any;
                setSettings(prev => ({
                    ...prev,
                    notifications: {
                        appointments: data.appointments?.reminders ?? true,
                        messages: data.consultation?.newMessages ?? true,
                        system: data.system?.securityAlerts ?? true,
                    }
                }));
            }

            if (privacyResponse.success && privacyResponse.data) {
                const data = privacyResponse.data as any;
                setSettings(prev => ({
                    ...prev,
                    privacy: {
                        profileVisibility: data.profileVisibility?.showToPatients ?? true,
                        dataSharing: data.dataSharing?.allowAnalytics ?? true,
                    },
                    security: {
                        loginNotifications: data.security?.loginNotifications ?? true,
                        sessionTimeout: data.security?.sessionTimeout ?? 30,
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
            await apiService.patch('/user/privacy-settings', {
                profileVisibility: {
                    showToPatients: updatedSettings.privacy.profileVisibility,
                },
                dataSharing: {
                    allowAnalytics: updatedSettings.privacy.dataSharing,
                },
                security: {
                    loginNotifications: updatedSettings.security.loginNotifications,
                    sessionTimeout: updatedSettings.security.sessionTimeout,
                }
            });

            // Settings saved silently
        } catch (error) {
            console.error('Error saving settings:', error);
            Alert.alert('Error', 'Failed to save settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = (path: string, value: any) => {
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

    if (loading && !settings) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading settings...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={colors.background} barStyle={isDark ? "light-content" : "dark-content"} />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Icon name="back" size={20} color={colors.text} />
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
                                <Text style={styles.settingDescription}>Show profile to patients</Text>
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
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundTertiary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundTertiary,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginTop: 20,
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.surface,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
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
        color: colors.text,
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
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
        color: colors.text,
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    dangerItem: {
        borderWidth: 1,
        borderColor: colors.error + '40',
    },
    dangerText: {
        color: colors.error,
    },
});