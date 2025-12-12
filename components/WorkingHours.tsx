import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import onDutyNotificationService from '../services/onDutyNotificationService';

interface WorkingHours {
    [key: string]: {
        enabled: boolean;
        slots: Array<{
            start: string;
            end: string;
        }>;
    };
}

interface DoctorAvailability {
    isOnline: boolean;
    workingHours: WorkingHours;
    maxPatientsPerDay: number;
}

const WorkingHours: React.FC = () => {
    const { user } = useAuth();
    const [availability, setAvailability] = useState<DoctorAvailability>({
        isOnline: false,
        workingHours: {
            monday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            tuesday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            wednesday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            thursday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            friday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            saturday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            sunday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
        },
        maxPatientsPerDay: 10,
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showOnlineModal, setShowOnlineModal] = useState(false);

    const days = [
        { key: 'monday', label: 'Monday', icon: 'calendar' as const },
        { key: 'tuesday', label: 'Tuesday', icon: 'calendar' as const },
        { key: 'wednesday', label: 'Wednesday', icon: 'calendar' as const },
        { key: 'thursday', label: 'Thursday', icon: 'calendar' as const },
        { key: 'friday', label: 'Friday', icon: 'calendar' as const },
        { key: 'saturday', label: 'Saturday', icon: 'calendar' as const },
        { key: 'sunday', label: 'Sunday', icon: 'calendar' as const },
    ];

    // Load availability when component mounts
    useEffect(() => {
        if (user?.id) {
            loadAvailability();
        }
    }, [user?.id]);

    // Reload availability when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                // console.log('WorkingHours: Screen focused, reloading availability');
                loadAvailability();
            }
        }, [user?.id])
    );

    const loadAvailability = async () => {
        try {
            setLoading(true);
            console.log('[WorkingHours] Loading availability for user:', user?.id);

            if (!user?.id) {
                console.log('[WorkingHours] No user ID found');
                return;
            }

            const response = await authService.getDoctorAvailability(user.id.toString());
            console.log('[WorkingHours] API response:', response);

            if (response.success && response.data) {
                // Map backend snake_case to frontend camelCase
                const data = response.data;
                console.log('[WorkingHours] Mapped data:', data);

                const newAvailability = {
                    isOnline: data.is_online || false,
                    workingHours: data.working_hours || availability.workingHours,
                    maxPatientsPerDay: data.max_patients_per_day || 10,
                };

                console.log('[WorkingHours] Setting availability:', newAvailability);
                setAvailability(newAvailability);
                console.log('[WorkingHours] Availability state updated');
            } else {
                console.log('[WorkingHours] API call failed:', response.message);
            }
        } catch (error) {
            console.error('WorkingHours: Error loading availability:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveAvailability = async () => {
        try {
            setSaving(true);
            setSaveSuccess(false);

            if (!user?.id) {
                console.error('WorkingHours: User not found');
                return;
            }

            // Map frontend camelCase to backend snake_case
            const backendData = {
                is_online: availability.isOnline,
                working_hours: availability.workingHours,
                max_patients_per_day: availability.maxPatientsPerDay,
            };

            const response = await authService.updateDoctorAvailability(user.id.toString(), backendData);

            if (response.success) {
                setSaveSuccess(true);
                // Hide success state after 2 seconds
                setTimeout(() => {
                    setSaveSuccess(false);
                }, 2000);
            } else {
                console.error('WorkingHours: Save failed:', response.message);
            }
        } catch (error) {
            console.error('WorkingHours: Error saving availability:', error);
        } finally {
            setSaving(false);
        }
    };

    const toggleOnlineStatus = () => {
        const newOnlineStatus = !availability.isOnline;

        if (newOnlineStatus) {
            // Show modal when turning online
            setShowOnlineModal(true);
        } else {
            // Directly toggle off without modal
            setAvailability(prev => ({
                ...prev,
                isOnline: newOnlineStatus,
            }));
            // Hide on-duty notification when going offline
            onDutyNotificationService.hideOnDutyNotification();
        }
    };

    const confirmOnlineStatus = () => {
        setAvailability(prev => ({
            ...prev,
            isOnline: true,
        }));
        setShowOnlineModal(false);
        // Show on-duty notification when going online
        onDutyNotificationService.showOnDutyNotification(user?.first_name || user?.display_name);
    };

    const cancelOnlineStatus = () => {
        setShowOnlineModal(false);
    };

    const toggleDay = (day: string) => {
        setAvailability(prev => ({
            ...prev,
            workingHours: {
                ...prev.workingHours,
                [day]: {
                    ...prev.workingHours[day],
                    enabled: !prev.workingHours[day].enabled,
                },
            },
        }));
    };

    const addTimeSlot = (day: string) => {
        setAvailability(prev => ({
            ...prev,
            workingHours: {
                ...prev.workingHours,
                [day]: {
                    ...prev.workingHours[day],
                    slots: [...prev.workingHours[day].slots, { start: '09:00', end: '17:00' }],
                },
            },
        }));
    };

    const removeTimeSlot = (day: string, index: number) => {
        setAvailability(prev => ({
            ...prev,
            workingHours: {
                ...prev.workingHours,
                [day]: {
                    ...prev.workingHours[day],
                    slots: prev.workingHours[day].slots.filter((_, i) => i !== index),
                },
            },
        }));
    };

    const updateTimeSlot = (day: string, index: number, field: 'start' | 'end', value: string) => {
        setAvailability(prev => ({
            ...prev,
            workingHours: {
                ...prev.workingHours,
                [day]: {
                    ...prev.workingHours[day],
                    slots: prev.workingHours[day].slots.map((slot, i) =>
                        i === index ? { ...slot, [field]: value } : slot
                    ),
                },
            },
        }));
    };

    const getEnabledDaysCount = () => {
        return Object.values(availability.workingHours).filter(day => day.enabled).length;
    };

    const getTotalWorkingHours = () => {
        let total = 0;
        Object.values(availability.workingHours).forEach(day => {
            if (day.enabled) {
                day.slots.forEach(slot => {
                    const start = parseInt(slot.start.split(':')[0]) + parseInt(slot.start.split(':')[1]) / 60;
                    const end = parseInt(slot.end.split(':')[0]) + parseInt(slot.end.split(':')[1]) / 60;
                    total += end - start;
                });
            }
        });
        return Math.round(total);
    };

    const isWeb = Platform.OS === 'web';
    const isLargeScreen = isWeb;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading availability settings...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.title}>Availability & Working Hours</Text>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={loadAvailability}
                        disabled={loading}
                    >
                        <FontAwesome
                            name="refresh"
                            size={16}
                            color={loading ? "#999" : "#4CAF50"}
                        />
                    </TouchableOpacity>
                </View>
                <Text style={styles.subtitle}>
                    Manage your online status, working hours, and appointment preferences
                </Text>
            </View>

            {/* Online Status Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <FontAwesome name="wifi" size={20} color="#4CAF50" />
                    <Text style={styles.sectionTitle}>Online Status</Text>
                </View>
                <View style={styles.onlineStatusCard}>
                    <View style={styles.onlineStatusInfo}>
                        <Text style={styles.onlineStatusTitle}>
                            {availability.isOnline ? 'Online' : 'Offline'}
                        </Text>
                        <Text style={styles.onlineStatusDescription}>
                            {availability.isOnline
                                ? 'Patients can see you and request instant chats'
                                : 'You are currently unavailable for instant chats'
                            }
                        </Text>
                    </View>
                    <Switch
                        value={availability.isOnline}
                        onValueChange={toggleOnlineStatus}
                        trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                        thumbColor={availability.isOnline ? '#fff' : '#f4f3f4'}
                    />
                </View>
            </View>


            {/* Quick Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <FontAwesome name="calendar-check-o" size={24} color="#4CAF50" />
                    <Text style={styles.statNumber}>{getEnabledDaysCount()}</Text>
                    <Text style={styles.statLabel}>Working Days</Text>
                </View>
                <View style={styles.statCard}>
                    <FontAwesome name="clock-o" size={24} color="#FF9500" />
                    <Text style={styles.statNumber}>{getTotalWorkingHours()}</Text>
                    <Text style={styles.statLabel}>Hours/Week</Text>
                </View>
                <View style={styles.statCard}>
                    <FontAwesome name="users" size={24} color="#007AFF" />
                    <Text style={styles.statNumber}>{availability.maxPatientsPerDay}</Text>
                    <Text style={styles.statLabel}>Max Patients/Day</Text>
                </View>
            </View>

            {/* Working Hours Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <FontAwesome name="clock-o" size={20} color="#FF9500" />
                    <Text style={styles.sectionTitle}>Working Hours</Text>
                </View>
                <Text style={styles.sectionDescription}>
                    Set your availability for each day of the week. Patients will only be able to book appointments during these hours.
                </Text>

                {days.map(({ key, label, icon }) => (
                    <View key={key} style={styles.dayContainer}>
                        <View style={styles.dayHeader}>
                            <TouchableOpacity
                                style={styles.dayToggle}
                                onPress={() => toggleDay(key)}
                            >
                                <View style={[
                                    styles.toggleButton,
                                    availability.workingHours[key].enabled && styles.toggleButtonActive
                                ]}>
                                    <FontAwesome
                                        name={availability.workingHours[key].enabled ? 'check' : 'times'}
                                        size={12}
                                        color={availability.workingHours[key].enabled ? '#fff' : '#999'}
                                    />
                                </View>
                                <FontAwesome name={icon} size={16} color="#666" style={styles.dayIcon} />
                                <Text style={[
                                    styles.dayLabel,
                                    availability.workingHours[key].enabled && styles.dayLabelActive
                                ]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {availability.workingHours[key].enabled && (
                            <View style={styles.timeSlotsContainer}>
                                {availability.workingHours[key].slots.map((slot, index) => (
                                    <View key={index} style={styles.timeSlot}>
                                        <View style={styles.timeInputs}>
                                            <View style={styles.timeInput}>
                                                <Text style={styles.timeLabel}>Start Time</Text>
                                                <TextInput
                                                    style={styles.timePicker}
                                                    value={slot.start}
                                                    onChangeText={(value) => updateTimeSlot(key, index, 'start', value)}
                                                    placeholder="09:00"
                                                    placeholderTextColor="#999"
                                                />
                                            </View>
                                            <View style={styles.timeInput}>
                                                <Text style={styles.timeLabel}>End Time</Text>
                                                <TextInput
                                                    style={styles.timePicker}
                                                    value={slot.end}
                                                    onChangeText={(value) => updateTimeSlot(key, index, 'end', value)}
                                                    placeholder="17:00"
                                                    placeholderTextColor="#999"
                                                />
                                            </View>
                                        </View>
                                        {availability.workingHours[key].slots.length > 1 && (
                                            <TouchableOpacity
                                                style={styles.removeSlot}
                                                onPress={() => removeTimeSlot(key, index)}
                                            >
                                                <FontAwesome name="trash" size={16} color="#FF3B30" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                                <TouchableOpacity
                                    style={styles.addSlot}
                                    onPress={() => addTimeSlot(key)}
                                >
                                    <FontAwesome name="plus" size={16} color="#4CAF50" />
                                    <Text style={styles.addSlotText}>Add Time Slot</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))}
            </View>

            {/* Appointment Settings Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <FontAwesome name="users" size={20} color="#007AFF" />
                    <Text style={styles.sectionTitle}>Appointment Settings</Text>
                </View>
                <Text style={styles.sectionDescription}>
                    Configure your daily appointment capacity.
                </Text>

                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingTitle}>Max Patients Per Day</Text>
                        <Text style={styles.settingDescription}>Limit the number of appointments per day</Text>
                    </View>
                    <TextInput
                        style={styles.numberInput}
                        value={availability.maxPatientsPerDay.toString()}
                        onChangeText={(value) => setAvailability(prev => ({
                            ...prev,
                            maxPatientsPerDay: parseInt(value) || 0
                        }))}
                        keyboardType="numeric"
                        placeholder="10"
                    />
                </View>
            </View>

            {/* Save Button */}
            <View style={styles.saveSection}>
                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        saving && styles.saveButtonDisabled,
                        saveSuccess && styles.saveButtonSuccess
                    ]}
                    onPress={saveAvailability}
                    disabled={saving}
                >
                    {saving ? (
                        <>
                            <ActivityIndicator size="small" color="#fff" />
                            <Text style={styles.saveButtonText}>Saving...</Text>
                        </>
                    ) : saveSuccess ? (
                        <>
                            <FontAwesome name="check" size={16} color="#fff" />
                            <Text style={styles.saveButtonText}>Saved!</Text>
                        </>
                    ) : (
                        <>
                            <FontAwesome name="save" size={16} color="#fff" />
                            <Text style={styles.saveButtonText}>Save All Settings</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Online Status Confirmation Modal */}
            <Modal
                visible={showOnlineModal}
                transparent={true}
                animationType="fade"
                onRequestClose={cancelOnlineStatus}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconContainer}>
                                <FontAwesome name="exclamation-triangle" size={24} color="#FF9500" />
                            </View>
                            <Text style={styles.modalTitle}>Important Notice</Text>
                        </View>

                        <Text style={styles.modalMessage}>
                            Only turn online when you're actively available. Remember to turn off when going offline to avoid account restrictions.
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={cancelOnlineStatus}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmButton}
                                onPress={confirmOnlineStatus}
                            >
                                <Text style={styles.modalConfirmText}>I Understand</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

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
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        flex: 1,
    },
    refreshButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F8F9FA',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        lineHeight: 22,
    },
    section: {
        backgroundColor: '#fff',
        margin: 16,
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginLeft: 12,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 20,
    },
    onlineStatusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
    },
    onlineStatusInfo: {
        flex: 1,
    },
    onlineStatusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    onlineStatusDescription: {
        fontSize: 14,
        color: '#666',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    statCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    dayContainer: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingBottom: 20,
    },
    dayHeader: {
        marginBottom: 12,
    },
    dayToggle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toggleButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    toggleButtonActive: {
        backgroundColor: '#4CAF50',
    },
    dayIcon: {
        marginRight: 8,
    },
    dayLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    dayLabelActive: {
        color: '#000',
    },
    timeSlotsContainer: {
        marginLeft: 44,
    },
    timeSlot: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    timeInputs: {
        flex: 1,
        flexDirection: 'row',
        gap: 12,
    },
    timeInput: {
        flex: 1,
    },
    timeLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    timePicker: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#000',
        backgroundColor: '#F8F9FA',
    },
    removeSlot: {
        padding: 8,
        marginLeft: 8,
    },
    addSlot: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#4CAF50',
        borderStyle: 'dashed',
        borderRadius: 8,
        marginTop: 8,
    },
    addSlotText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
    numberInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#000',
        backgroundColor: '#F8F9FA',
        width: 80,
        textAlign: 'center',
    },
    saveSection: {
        padding: 16,
        marginBottom: 20,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        borderRadius: 16,
        padding: 18,
        shadowColor: '#4CAF50',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    saveButtonSuccess: {
        backgroundColor: '#4CAF50',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    modalIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF8E1',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    modalConfirmButton: {
        flex: 1,
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    modalConfirmText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});

export default WorkingHours; 