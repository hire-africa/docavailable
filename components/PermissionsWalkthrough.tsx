import { useThemedColors } from '@/hooks/useThemedColors';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { PermissionStatus, PermissionUtils } from '../utils/PermissionUtils';

interface PermissionsWalkthroughProps {
    visible: boolean;
    onComplete: () => void;
    onSkip: () => void;
}

export default function PermissionsWalkthrough({
    visible,
    onComplete,
    onSkip
}: PermissionsWalkthroughProps) {
    const colors = useThemedColors();
    const [status, setStatus] = useState<PermissionStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const checkStatus = async () => {
        setLoading(true);
        const currentStatus = await PermissionUtils.getStatus();
        setStatus(currentStatus);
        setLoading(false);
    };

    useEffect(() => {
        if (visible) {
            checkStatus();
        }

        // Add AppState listener to refresh status when user returns to app
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && visible) {
                console.log('🔄 [PermissionsWalkthrough] App returned to foreground, refreshing status');
                checkStatus();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [visible]);

    if (!visible) return null;

    const handleOpenSettings = async (type: 'overlay' | 'battery' | 'notifications') => {
        if (type === 'overlay') await PermissionUtils.openOverlaySettings();
        else if (type === 'battery') await PermissionUtils.openBatterySettings();
        else if (type === 'notifications') await PermissionUtils.openNotificationSettings();

        // Status will be re-checked when the user returns to the app via AppState in the parent component
        // or manually if they stay in the app.
        checkStatus();
    };

    const handleContinue = () => {
        if (status?.overlay && status?.notifications && status?.battery) {
            onComplete();
        } else {
            Alert.alert(
                "Permissions Missing",
                "Some critical permissions are still missing. Without these, you might not receive or be able to answer incoming calls reliably.",
                [
                    { text: "Dismiss", style: "cancel" },
                    { text: "Skip Anyway", onPress: onSkip, style: "destructive" }
                ]
            );
        }
    };

    const renderPermissionItem = (
        title: string,
        description: string,
        isGranted: boolean,
        icon: string,
        onPress: () => void,
        isOptional: boolean = false
    ) => (
        <View style={[styles.permissionCard, { backgroundColor: colors.card }]}>
            <View style={styles.permissionHeader}>
                <View style={[styles.iconContainer, { backgroundColor: isGranted ? '#E8F5E9' : '#FFF3E0' }]}>
                    <FontAwesome5 name={icon} size={20} color={isGranted ? '#4CAF50' : '#FF9800'} />
                </View>
                <View style={styles.permissionTitleContainer}>
                    <Text style={[styles.permissionTitle, { color: colors.text }]}>{title}</Text>
                    {isOptional && <Text style={styles.optionalBadge}>Optional</Text>}
                </View>
                {isGranted ? (
                    <FontAwesome5 name="check-circle" size={24} color="#4CAF50" />
                ) : (
                    <TouchableOpacity
                        style={[styles.settingsButton, { backgroundColor: colors.primary }]}
                        onPress={onPress}
                    >
                        <Text style={styles.settingsButtonText}>Enable</Text>
                    </TouchableOpacity>
                )}
            </View>
            <Text style={[styles.permissionDescription, { color: colors.textSecondary }]}>
                {description}
            </Text>
            {!isGranted && (
                <View style={styles.guidanceContainer}>
                    <Text style={[styles.guidanceText, { color: colors.primary }]}>
                        {title === "Appear on Top" ? "→ Look for 'Display over other apps' in settings" :
                            title === "Show on Lock Screen" ? "→ Enable 'Lock screen' notifications" :
                                "→ Set Battery to 'Unrestricted' or 'Not Optimized'"}
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <View style={styles.headerIcon}>
                            <FontAwesome5 name="shield-alt" size={48} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Call Reliability Setup</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Complete these steps to ensure you never miss a patient call.
                        </Text>
                        <TouchableOpacity
                            style={[styles.refreshStatusButton, { borderColor: colors.primary }]}
                            onPress={checkStatus}
                            disabled={loading}
                        >
                            <FontAwesome5 name="sync-alt" size={14} color={colors.primary} />
                            <Text style={[styles.refreshStatusText, { color: colors.primary }]}>Refresh Status</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                    ) : (
                        <View style={styles.permissionsList}>
                            {renderPermissionItem(
                                "Appear on Top",
                                "Allows incoming calls to pop up even when you're using other apps.",
                                status?.overlay || false,
                                "window-restore",
                                () => handleOpenSettings('overlay')
                            )}

                            {renderPermissionItem(
                                "Show on Lock Screen",
                                "So you can answer calls immediately even when your phone is locked.",
                                status?.notifications || false, // Assuming notifications includes lock screen visibility on many setups
                                "lock",
                                () => handleOpenSettings('notifications')
                            )}

                            {renderPermissionItem(
                                "Background Performance",
                                "Prevents the system from closing the app when it's in the background.",
                                status?.battery || false,
                                "battery-full",
                                () => handleOpenSettings('battery'),
                                true
                            )}
                        </View>
                    )}
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.continueButton, { backgroundColor: colors.primary }]}
                        onPress={handleContinue}
                    >
                        <Text style={styles.continueButtonText}>Continue to Dashboard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                        <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>Configure Later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingTop: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    headerIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F0F9F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    loader: {
        marginTop: 40,
    },
    permissionsList: {
        gap: 16,
    },
    permissionCard: {
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    permissionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    permissionTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    permissionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginRight: 8,
    },
    optionalBadge: {
        fontSize: 12,
        color: '#666',
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    permissionDescription: {
        fontSize: 14,
        lineHeight: 20,
        paddingLeft: 60,
        marginBottom: 8,
    },
    guidanceContainer: {
        paddingLeft: 60,
        marginTop: 4,
    },
    guidanceText: {
        fontSize: 12,
        fontStyle: 'italic',
        fontWeight: '500',
    },
    settingsButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    settingsButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        borderTopWidth: 1,
    },
    continueButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    continueButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    skipButton: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    refreshStatusButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 16,
    },
    refreshStatusText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
});
