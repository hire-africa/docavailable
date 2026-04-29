import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';

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
    workingHours: WorkingHours;
    maxPatientsPerDay: number;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function formatTime(date: Date): string {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

function parseTimeToDate(time: string): Date {
    const match = time.match(TIME_RE);
    const now = new Date();
    if (!match) {
        now.setHours(9, 0, 0, 0);
        return now;
    }
    const hh = Number(match[1]);
    const mm = Number(match[2]);
    now.setHours(hh, mm, 0, 0);
    return now;
}

function timeToMinutes(time: string): number | null {
    const match = time.match(TIME_RE);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}

function isValidTimeRange(start: string, end: string): boolean {
    const s = timeToMinutes(start);
    const e = timeToMinutes(end);
    if (s === null || e === null) return false;
    return s < e;
}

const WorkingHours: React.FC = () => {
    const { user } = useAuth();
    const [availability, setAvailability] = useState<DoctorAvailability>({
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
    const [activeTimePicker, setActiveTimePicker] = useState<{
        day: string;
        index: number;
        field: 'start' | 'end';
        temp: Date;
    } | null>(null);

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

    const openTimePicker = (day: string, index: number, field: 'start' | 'end') => {
        const current = availability.workingHours[day]?.slots?.[index]?.[field] ?? '09:00';
        setActiveTimePicker({
            day,
            index,
            field,
            temp: parseTimeToDate(current),
        });
    };

    const closeTimePicker = () => {
        setActiveTimePicker(null);
    };

    const commitPickedTime = (date: Date) => {
        if (!activeTimePicker) return;
        updateTimeSlot(activeTimePicker.day, activeTimePicker.index, activeTimePicker.field, formatTime(date));
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
                    Manage your working hours and appointment preferences
                </Text>
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
                    Set your on-duty schedule for each day of the week. During these hours, patients can find you and reach you when you're available.
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
                                    (() => {
                                        const hasValidStart = TIME_RE.test(slot.start);
                                        const hasValidEnd = TIME_RE.test(slot.end);
                                        const hasValidRange = hasValidStart && hasValidEnd && isValidTimeRange(slot.start, slot.end);

                                        return (
                                    <View key={index} style={styles.timeSlot}>
                                        <View style={styles.timeInputs}>
                                            <View style={styles.timeInput}>
                                                <Text style={styles.timeLabel}>Start Time</Text>
                                                {Platform.OS === 'web' ? (
                                                    <input
                                                        type="time"
                                                        value={slot.start}
                                                        onChange={e => updateTimeSlot(key, index, 'start', e.target.value)}
                                                        style={{
                                                            height: 44,
                                                            borderColor: !hasValidStart || !hasValidRange ? '#D32F2F' : '#E0E0E0',
                                                            borderWidth: 1,
                                                            borderRadius: 10,
                                                            padding: 10,
                                                            fontSize: 14,
                                                            width: '100%',
                                                            backgroundColor: '#F8F9FA',
                                                            color: '#000',
                                                        }}
                                                    />
                                                ) : (
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.timePickerButton,
                                                            (!hasValidStart || !hasValidRange) && styles.timePickerButtonError,
                                                        ]}
                                                        onPress={() => openTimePicker(key, index, 'start')}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={styles.timePickerButtonText}>{slot.start}</Text>
                                                        <FontAwesome name="clock-o" size={16} color="#666" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            <View style={styles.timeInput}>
                                                <Text style={styles.timeLabel}>End Time</Text>
                                                {Platform.OS === 'web' ? (
                                                    <input
                                                        type="time"
                                                        value={slot.end}
                                                        onChange={e => updateTimeSlot(key, index, 'end', e.target.value)}
                                                        style={{
                                                            height: 44,
                                                            borderColor: !hasValidEnd || !hasValidRange ? '#D32F2F' : '#E0E0E0',
                                                            borderWidth: 1,
                                                            borderRadius: 10,
                                                            padding: 10,
                                                            fontSize: 14,
                                                            width: '100%',
                                                            backgroundColor: '#F8F9FA',
                                                            color: '#000',
                                                        }}
                                                    />
                                                ) : (
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.timePickerButton,
                                                            (!hasValidEnd || !hasValidRange) && styles.timePickerButtonError,
                                                        ]}
                                                        onPress={() => openTimePicker(key, index, 'end')}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={styles.timePickerButtonText}>{slot.end}</Text>
                                                        <FontAwesome name="clock-o" size={16} color="#666" />
                                                    </TouchableOpacity>
                                                )}
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
                                        {!hasValidRange && (
                                            <Text style={styles.timeRangeError}>Start time must be earlier than end time</Text>
                                        )}
                                    </View>
                                        );
                                    })()
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
                    {Platform.OS === 'web' ? (
                        <input
                            type="number"
                            value={String(availability.maxPatientsPerDay)}
                            onChange={e => {
                                const next = Number(e.target.value);
                                setAvailability(prev => ({
                                    ...prev,
                                    maxPatientsPerDay: Number.isFinite(next) ? next : 0,
                                }));
                            }}
                            style={{
                                height: 44,
                                borderColor: '#E0E0E0',
                                borderWidth: 1,
                                borderRadius: 10,
                                padding: 10,
                                fontSize: 16,
                                width: 96,
                                textAlign: 'center',
                                backgroundColor: '#F8F9FA',
                                color: '#000',
                            }}
                        />
                    ) : (
                        <TouchableOpacity
                            style={styles.numberPickerButton}
                            onPress={() => {}}
                            activeOpacity={1}
                        >
                            <Text style={styles.numberPickerText}>{availability.maxPatientsPerDay}</Text>
                        </TouchableOpacity>
                    )}
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

            {Platform.OS !== 'web' && activeTimePicker && (
                <View style={styles.timePickerOverlay}>
                    <TouchableOpacity style={styles.timePickerBackdrop} activeOpacity={1} onPress={closeTimePicker} />
                    <View style={styles.timePickerSheet}>
                        <View style={styles.timePickerHeader}>
                            <Text style={styles.timePickerTitle}>Select time</Text>
                            <TouchableOpacity onPress={closeTimePicker} style={styles.timePickerDoneBtn}>
                                <Text style={styles.timePickerDoneText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={activeTimePicker.temp}
                            mode="time"
                            display={Platform.OS === 'android' ? 'clock' : 'spinner'}
                            onChange={(event, selected) => {
                                if (Platform.OS === 'android') {
                                    if (event.type === 'dismissed') {
                                        closeTimePicker();
                                        return;
                                    }
                                    if (selected) commitPickedTime(selected);
                                    closeTimePicker();
                                    return;
                                }

                                if (selected) {
                                    setActiveTimePicker(prev => prev ? ({ ...prev, temp: selected }) : prev);
                                    commitPickedTime(selected);
                                }
                            }}
                        />
                    </View>
                </View>
            )}

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F6F9',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F6F9',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        backgroundColor: '#F4F6F9',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0B1220',
        flex: 1,
    },
    refreshButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E6EAF0',
    },
    subtitle: {
        fontSize: 16,
        color: '#5B6472',
        lineHeight: 22,
    },
    section: {
        backgroundColor: '#fff',
        margin: 16,
        borderRadius: 18,
        padding: 24,
        borderWidth: 1,
        borderColor: '#E6EAF0',
        shadowColor: '#0B1220',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0B1220',
        marginLeft: 12,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#5B6472',
        lineHeight: 20,
        marginBottom: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    statCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#E6EAF0',
        shadowColor: '#0B1220',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0B1220',
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#5B6472',
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
        backgroundColor: '#E9EDF3',
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
        fontWeight: '700',
        color: '#5B6472',
    },
    dayLabelActive: {
        color: '#0B1220',
    },
    timeSlotsContainer: {
        marginLeft: 44,
    },
    timeSlot: {
        alignItems: 'flex-start',
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
        color: '#5B6472',
        marginBottom: 4,
    },
    timePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#F8F9FA',
        minHeight: 44,
    },
    timePickerButtonError: {
        borderColor: '#D32F2F',
    },
    timePickerButtonText: {
        fontSize: 14,
        color: '#000',
        fontWeight: '600',
    },
    timeRangeError: {
        color: '#D32F2F',
        fontSize: 12,
        marginTop: 6,
        marginLeft: 0,
    },
    removeSlot: {
        padding: 8,
        alignSelf: 'flex-end',
    },
    addSlot: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#4CAF50',
        borderStyle: 'dashed',
        borderRadius: 12,
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
        fontWeight: '800',
        color: '#0B1220',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 14,
        color: '#5B6472',
        lineHeight: 18,
    },
    numberPickerButton: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#F8F9FA',
        width: 96,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numberPickerText: {
        fontSize: 16,
        color: '#000',
        fontWeight: '600',
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
    timePickerOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'flex-end',
    },
    timePickerBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    timePickerSheet: {
        backgroundColor: '#fff',
        paddingTop: 12,
        paddingBottom: 24,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
    timePickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    timePickerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    timePickerDoneBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#F2F4F7',
    },
    timePickerDoneText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111',
    },
});

export default WorkingHours; 