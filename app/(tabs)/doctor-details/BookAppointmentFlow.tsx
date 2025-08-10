import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    DateTimePickerAndroid,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../../contexts/AuthContext';
import { apiService } from '../../../services/apiService';
import { paymentsService } from '../../../services/paymentsService';

const availableTimes = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
];

const consultationTypes = [
  { key: 'text', label: 'Text', icon: 'comment' },
  { key: 'voice', label: 'Call', icon: 'phone' },
  { key: 'video', label: 'Video', icon: 'video-camera' },
];

export default function BookAppointmentFlow() {
  const params = useLocalSearchParams();
  const { user, userData } = useAuth();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showNativeTimePicker, setShowNativeTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customTime, setCustomTime] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [consultationType, setConsultationType] = useState('');
  const [reason, setReason] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workingHours, setWorkingHours] = useState<any>(null);
  const [loadingHours, setLoadingHours] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string | null>(null);

  // Doctor info from params
  const doctorId = params.doctorId as string;
  const doctorName = params.doctorName as string;
  const specialization = params.specialization as string;
  // Parse userSubscription from params
  let userSubscription: any = null;
  try {
    userSubscription = params.userSubscription ? JSON.parse(params.userSubscription as string) : null;
  } catch {
    userSubscription = null;
  }

  useEffect(() => {
    const fetchWorkingHours = async () => {
      if (!doctorId) return;
      setLoadingHours(true);
      try {
        const response = await apiService.get(`/doctors/${doctorId}/availability`);
        if (response.success && response.data && response.data.working_hours) {
          setWorkingHours(response.data.working_hours);
        } else {
          setWorkingHours(null);
        }
      } catch (e) {
        console.error('Error fetching working hours:', e);
        setWorkingHours(null);
      } finally {
        setLoadingHours(false);
      }
    };
    fetchWorkingHours();
  }, [doctorId]);

  // Helper to check if a consultation type is available
  const isTypeAvailable = (type: string) => {
    if (!userSubscription) return true;
    if (type === 'text') return userSubscription.textSessionsRemaining > 0;
    if (type === 'voice') return userSubscription.voiceCallsRemaining > 0;
    if (type === 'video') return userSubscription.videoCallsRemaining > 0;
    return true;
  };

  // Helper to get availability info for selected day
  const getAvailabilityInfo = () => {
    if (!workingHours) return 'No availability info.';
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayKey = days[selectedDate.getDay()];
    const dayHours = workingHours[dayKey];
    if (!dayHours || !dayHours.enabled) return `${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}: Not available`;
    const slots = dayHours.slots.map((slot: any) => `${slot.start} to ${slot.end}`).join(', ');
    return `${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)} availability: ${slots}`;
  };

  // Helper to get available slots for selected day
  const getAvailableSlots = () => {
    if (!workingHours) return [];
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayKey = days[selectedDate.getDay()];
    const dayHours = workingHours[dayKey];
    if (!dayHours || !dayHours.enabled) return [];
    return dayHours.slots;
  };

  // Helper to generate time options in 30-min increments for all slots
  const generateTimeOptions = () => {
    const slots = getAvailableSlots();
    const options: string[] = [];
    const now = new Date();
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = selectedDateOnly.getTime() === today.getTime();
    
    slots.forEach((slot: any) => {
      const [startHour, startMin] = slot.start.split(':').map(Number);
      const [endHour, endMin] = slot.end.split(':').map(Number);
      let current = new Date();
      current.setHours(startHour, startMin, 0, 0);
      const end = new Date();
      end.setHours(endHour, endMin, 0, 0);
      
      while (current <= end) {
        const h = current.getHours();
        const m = current.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        const label = `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
        
        // Filter out past times for today
        if (isToday) {
          const currentTime = new Date();
          const slotTime = new Date();
          slotTime.setHours(h, m, 0, 0);
          if (slotTime > currentTime) {
            options.push(label);
          }
        } else {
          options.push(label);
        }
        
        current.setMinutes(current.getMinutes() + 30);
      }
    });
    // Remove duplicates and sort
    return Array.from(new Set(options)).sort((a, b) => {
      const timeA = new Date(`2000-01-01 ${a}`);
      const timeB = new Date(`2000-01-01 ${b}`);
      return timeA.getTime() - timeB.getTime();
    });
  };

  // Helper to check if a time slot is available (not booked)
  const isTimeSlotAvailable = (timeStr: string) => {
    // This would typically check against booked appointments
    // For now, we'll assume all slots are available
    return true;
  };

  // Helper to get time slot status
  const getTimeSlotStatus = (timeStr: string) => {
    if (!isTimeSlotAvailable(timeStr)) {
      return 'booked';
    }
    
    const now = new Date();
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = selectedDateOnly.getTime() === today.getTime();
    
    if (isToday) {
      const time24 = to24HourFormat(timeStr);
      const [hour, minute] = time24.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(hour, minute, 0, 0);
      
      if (slotTime <= now) {
        return 'past';
      }
    }
    
    return 'available';
  };

  // Helper to convert 12-hour time string (e.g., '1:30 PM') to 24-hour format (e.g., '13:30')
  function to24HourFormat(timeStr: string): string {
    if (!timeStr) return '';
    // If already in 24-hour format
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr;
    // Handle 12-hour format with AM/PM
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (!match) return timeStr;
    let [_, hour, minute, period] = match;
    let h = parseInt(hour, 10);
    if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute}`;
  }

  // Helper to convert Date object to 12-hour format string
  function formatTime12Hour(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  // Helper to check if a time is within available slots
  const isTimeInAvailableSlots = (time: Date): boolean => {
    const slots = getAvailableSlots();
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    
    return slots.some((slot: any) => {
      const startTime = slot.start;
      const endTime = slot.end;
      return timeStr >= startTime && timeStr <= endTime;
    });
  };

  // Native time picker for Android
  const showAndroidTimePicker = () => {
    const now = new Date();
    const minTime = new Date(now);
    minTime.setMinutes(Math.ceil(now.getMinutes() / 30) * 30);
    
    DateTimePickerAndroid.open({
      value: tempTime,
      onChange: (event, selectedTime) => {
        if (selectedTime && event.type === 'set') {
          setTempTime(selectedTime);
          const timeStr = formatTime12Hour(selectedTime);
          const time24Hour = to24HourFormat(timeStr);
          
          // Check if time is within available slots
          if (isTimeInAvailableSlots(selectedTime)) {
            setCustomTime(timeStr);
            setSelectedTime(time24Hour);
          } else {
            Alert.alert(
              'Invalid Time',
              'The selected time is outside of the doctor\'s working hours. Please select a time within the available schedule.',
              [{ text: 'OK' }]
            );
          }
        }
      },
      mode: 'time',
      is24Hour: false,
      minuteInterval: 1,
      minimumDate: now,
    });
  };

  // Native time picker for iOS
  const showIOSTimePicker = () => {
    setShowNativeTimePicker(true);
  };

  // Handle time picker change for iOS
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (selectedTime && event.type === 'set') {
      setTempTime(selectedTime);
    }
  };

  // Handle continue button press for iOS time picker
  const handleContinueTimeSelection = () => {
    const timeStr = formatTime12Hour(tempTime);
    const time24Hour = to24HourFormat(timeStr);
    
    // Check if time is within available slots
    if (isTimeInAvailableSlots(tempTime)) {
      setCustomTime(timeStr);
      setSelectedTime(time24Hour);
      setShowNativeTimePicker(false);
    } else {
      Alert.alert(
        'Invalid Time',
        'The selected time is outside of the doctor\'s working hours. Please select a time within the available schedule.',
        [{ text: 'OK' }]
      );
    }
  };

  // Show appropriate time picker based on platform
  const showTimePickerModal = () => {
    if (Platform.OS === 'android') {
      showAndroidTimePicker();
    } else {
      showIOSTimePicker();
    }
  };

  // Check if current temp time is valid
  const isCurrentTimeValid = () => {
    return isTimeInAvailableSlots(tempTime);
  };

  // Calendar logic for current month
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Step 1: Select date, time, consultation type, reason
  const renderStep1 = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={22} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select date & time</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ marginHorizontal: 24, marginTop: 12 }}>
          <Text style={styles.doctorName}>{doctorName}</Text>
          <Text style={styles.doctorSpecialization}>{specialization}</Text>
        </View>
        {/* Calendar - show current month and year */}
        <View style={styles.calendarContainer}>
          <Text style={styles.monthLabel}>{monthNames[currentMonth]} {currentYear}</Text>
          <View style={styles.calendarRowContainer}>
            <View style={styles.calendarRow}>
              {[...'SMTWTFS'].map((d, i) => (
                <View key={i} style={styles.calendarCell}>
                  <Text style={styles.calendarDayLabel}>{d}</Text>
                </View>
              ))}
            </View>
            {/* Show days for the current month */}
            <View style={styles.calendarGrid}>
              {(() => {
                const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
                const daysArray = [];
                // Add empty cells for offset
                for (let i = 0; i < firstDayOfWeek; i++) {
                  daysArray.push(<View key={`empty-${i}`} style={styles.calendarCell} />);
                }
                // Add days of the month
                for (let day = 1; day <= daysInMonth; day++) {
                  const currentDate = new Date();
                  const dayDate = new Date(currentYear, currentMonth, day);
                  const isToday = dayDate.toDateString() === currentDate.toDateString();
                  const isPast = dayDate < currentDate;
                  const isDisabled = isToday || isPast;
                  
                  daysArray.push(
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.calendarDay,
                        styles.calendarCell,
                        selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear && styles.selectedDay,
                        isDisabled && styles.disabledDay
                      ]}
                      onPress={() => !isDisabled && setSelectedDate(new Date(currentYear, currentMonth, day))}
                      disabled={isDisabled}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear && styles.selectedDayText,
                        isDisabled && styles.disabledDayText
                      ]}>{day}</Text>
                    </TouchableOpacity>
                  );
                }
                return daysArray;
              })()}
            </View>
          </View>
        </View>
        {/* Show doctor's availability for the selected day */}
        <Text style={styles.sectionLabel}>Doctor's Availability</Text>
        <View style={{ marginHorizontal: 24, marginBottom: 8 }}>
          {loadingHours ? (
            <Text>Loading availability...</Text>
          ) : (
            <Text>{getAvailabilityInfo()}</Text>
          )}
        </View>
        {/* Custom Time Picker Button and Modal */}
        {getAvailableSlots().length > 0 && (
          <View style={{ marginHorizontal: 24, marginBottom: 8 }}>
            <TouchableOpacity
              style={styles.timePickerBtn}
              onPress={showTimePickerModal}
            >
              <Text style={styles.timePickerBtnText}>{customTime ? `Change Time (${customTime})` : 'Pick a time'}</Text>
            </TouchableOpacity>
            {customTime ? (
              <Text style={styles.selectedTimeText}>Selected time: {customTime}</Text>
            ) : null}
            <Modal
              visible={showNativeTimePicker}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowNativeTimePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Time</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedDate.toLocaleDateString(undefined, { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>

                  {/* Doctor Availability Info */}
                  <View style={styles.availabilityContainer}>
                    <View style={styles.availabilityHeader}>
                      <FontAwesome name="clock-o" size={16} color="#4CAF50" />
                      <Text style={styles.availabilityTitle}>Doctor's Availability</Text>
                    </View>
                    {loadingHours ? (
                      <Text style={styles.availabilityText}>Loading availability...</Text>
                    ) : (
                      <Text style={styles.availabilityText}>{getAvailabilityInfo()}</Text>
                    )}
                  </View>
                  
                  <View style={styles.timePickerContainer}>
                    <DateTimePicker
                      value={tempTime}
                      mode="time"
                      display="spinner"
                      onChange={handleTimeChange}
                      minuteInterval={1}
                      minimumDate={new Date()}
                      style={styles.nativeTimePicker}
                      textColor="#000000"
                      themeVariant="light"
                    />
                  </View>

                  {/* Selected Time Preview */}
                  <View style={styles.selectedTimePreview}>
                    <Text style={styles.selectedTimeLabel}>Selected Time:</Text>
                    <Text style={styles.selectedTimeValue}>
                      {formatTime12Hour(tempTime)}
                    </Text>
                  </View>
                  
                  <View style={styles.modalFooter}>
                    <TouchableOpacity 
                      style={styles.cancelModalBtn} 
                      onPress={() => setShowNativeTimePicker(false)}
                    >
                      <Text style={styles.cancelModalBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[
                        styles.continueModalBtn, 
                        !isCurrentTimeValid() && styles.continueModalBtnDisabled
                      ]} 
                      onPress={handleContinueTimeSelection}
                      disabled={!isCurrentTimeValid()}
                    >
                      <Text style={[
                        styles.continueModalBtnText,
                        !isCurrentTimeValid() && styles.continueModalBtnTextDisabled
                      ]}>
                        Confirm Time
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {!isCurrentTimeValid() && (
                    <View style={styles.validationMessage}>
                      <FontAwesome name="exclamation-triangle" size={14} color="#D32F2F" />
                      <Text style={styles.validationText}>
                        Selected time is outside working hours
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Modal>
          </View>
        )}
        {/* Remove selectable time slots UI */}
        <Text style={styles.sectionLabel}>Consultation type</Text>
        <View style={styles.consultationTypesContainer}>
          {consultationTypes.map(type => {
            const available = isTypeAvailable(type.key);
            return (
              <View key={type.key} style={styles.consultationTypeRow}>
              <TouchableOpacity
                  style={[styles.consultationTypeBtn, consultationType === type.key && styles.selectedConsultationTypeBtn, !available && { backgroundColor: '#E0E0E0' }]}
                onPress={() => available && setConsultationType(type.key)}
                disabled={!available}
              >
                  <FontAwesome 
                    name={type.icon as any} 
                    size={16} 
                    color={consultationType === type.key ? '#fff' : (!available ? '#aaa' : '#222')} 
                  />
                </TouchableOpacity>
                <View style={styles.consultationTypeTextContainer}>
                  <Text style={[styles.consultationTypeText, !available && { color: '#aaa' }]}>{type.label}</Text>
                {!available && (
                    <Text style={styles.consultationTypeUnavailable}>(0 left)</Text>
                )}
                </View>
              </View>
            );
          })}
        </View>
        <Text style={styles.sectionLabel}>Reason for session</Text>
        <TextInput
          style={styles.reasonInput}
          placeholder="e.g. Rash, Checkup"
          value={reason}
          onChangeText={setReason}
          maxLength={20}
        />
        <TouchableOpacity
          style={[styles.continueBtn, !(customTime && reason) && { opacity: 0.5 }]}
          onPress={() => customTime && reason && setStep(2)}
          disabled={!(customTime && reason)}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // Step 2: Confirm details
  const renderStep2 = () => (
    <SafeAreaView style={styles.container}>
      {checkoutUrl ? (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: checkoutUrl }}
            onShouldStartLoadWithRequest={(req) => {
              const url = req.url;
              const callback = 'https://docavailable-1.onrender.com/api/payments/paychangu/callback';
              const ret = 'https://docavailable-1.onrender.com/api/payments/paychangu/return';
              if (url.startsWith(callback) || url.startsWith(ret)) {
                setCheckoutUrl(null);
                return false;
              }
              return true;
            }}
          />
        </View>
      ) : null}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={22} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm appointment</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.confirmCard}>
        <View style={styles.avatarCircle} />
        <Text style={styles.doctorName}>{doctorName}</Text>
        <Text style={styles.doctorSpecialization}>{specialization}</Text>
        <Text style={styles.confirmLabel}>Date & Time</Text>
        <Text style={styles.confirmValue}>
          {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {selectedTime}
        </Text>
        <Text style={styles.confirmLabel}>Consultation Type</Text>
        <Text style={styles.confirmValue}>{consultationTypes.find(t => t.key === consultationType)?.label || ''}</Text>
        <Text style={styles.confirmLabel}>Reason</Text>
        <Text style={styles.confirmValue}>{reason}</Text>
      </View>
      <View style={styles.confirmBtnRow}>
        <TouchableOpacity style={styles.editBtn} onPress={() => setStep(1)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={submitting}>
          <Text style={styles.confirmBtnText}>{submitting ? 'Booking...' : 'Confirm'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // Step 3: Success
  const renderStep3 = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="close" size={22} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Requested</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.successCard}>
        <Text style={styles.successTitle}>Appointment Request Sent!</Text>
        <Text style={styles.successMsg}>Your appointment request with {doctorName} has been sent and is waiting for doctor approval.</Text>
        <View style={styles.successCheck}>
          <FontAwesome name="check-circle" size={48} color="#4CAF50" />
        </View>
        <View style={styles.successDetails}>
          <Text style={styles.successDetailLabel}>Date & Time</Text>
          <Text style={styles.successDetailValue}>
            {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {selectedTime}
          </Text>
          <Text style={styles.successDetailLabel}>Consultation Type</Text>
          <Text style={styles.successDetailValue}>{consultationTypes.find(t => t.key === consultationType)?.label || ''}</Text>
          <Text style={styles.successDetailLabel}>Reason</Text>
          <Text style={styles.successDetailValue}>{reason}</Text>
        </View>
        <View style={styles.pendingNote}>
          <Text style={styles.pendingNoteText}>
            You'll receive a notification when the doctor confirms or rejects your appointment.
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.proceedBtn} 
        onPress={() => router.push('/(tabs)/discover')}
      >
        <Text style={styles.proceedBtnText}>Proceed</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  // Handle confirm booking
  async function handleConfirm() {
    // console.log('🔍 [BookAppointmentFlow] handleConfirm started');
    
    if (!user) {
      // console.log('❌ [BookAppointmentFlow] No user found');
      Alert.alert('Error', 'Please login to book an appointment');
      return;
    }
    
    if (!doctorId || !doctorName) {
      // console.log('❌ [BookAppointmentFlow] Missing doctor info:', { doctorId, doctorName });
      Alert.alert('Error', 'Doctor information not available');
      return;
    }
    
    if (!selectedDate || !customTime || !consultationType || !reason) {
      // console.log('❌ [BookAppointmentFlow] Missing required fields:', { 
      //   selectedDate, customTime, consultationType, reason 
      // });
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    // Validate that selected date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (selectedDateOnly <= today) {
      // console.log('❌ [BookAppointmentFlow] Selected date is not in the future:', { 
      //   selectedDate: selectedDateOnly, 
      //   today: today 
      // });
      Alert.alert('Error', 'Please select a future date for your appointment');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // For plan purchase (deposit): show sample Basic plan id = 1
      const res = await paymentsService.initiatePlanPurchase(1);
              if (res?.success && res.data?.checkout_url) {
          setCheckoutUrl(res.data.checkout_url);
                  setTxRef(res.data.reference);
      }
    } catch (error) {
      console.error('❌ [BookAppointmentFlow] Appointment creation failed:', error);
      console.error('❌ [BookAppointmentFlow] Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        stack: error?.stack
      });
      
      // More specific error messages
      let errorMessage = 'Failed to book appointment. Please try again.';
      if (error?.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error?.response?.status === 422) {
        errorMessage = 'Invalid appointment data. Please check your details.';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 1) return renderStep1();
  if (step === 2) return renderStep2();
  return renderStep3();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  doctorSpecialization: {
    color: '#4CAF50',
    fontSize: 15,
    marginBottom: 12,
  },
  calendarContainer: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  monthLabel: {
    fontWeight: '700',
    fontSize: 16,
    color: '#222',
    marginBottom: 8,
    textAlign: 'center',
  },
  calendarRowContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: 7 * 40, // 7 cells * (36px width + 2*2px margin)
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  calendarDayLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#888',
    fontWeight: '600',
    fontSize: 13,
  },
  calendarDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  selectedDay: {
    backgroundColor: '#4CAF50',
  },
  calendarDayText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 15,
  },
  selectedDayText: {
    color: '#fff',
  },
  calendarCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  sectionLabel: {
    fontWeight: '700',
    fontSize: 15,
    color: '#222',
    marginHorizontal: 24,
    marginTop: 18,
    marginBottom: 8,
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  timeBtn: {
    backgroundColor: '#F1F3F4',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    margin: 4,
  },
  selectedTimeBtn: {
    backgroundColor: '#4CAF50',
  },
  timeBtnText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 15,
  },
  selectedTimeBtnText: {
    color: '#fff',
  },
  consultationTypesContainer: {
    marginHorizontal: 24,
    marginBottom: 8,
  },
  consultationTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  consultationTypeBtn: {
    backgroundColor: '#F1F3F4',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  selectedConsultationTypeBtn: {
    backgroundColor: '#4CAF50',
  },
  consultationTypeTextContainer: {
    flex: 1,
  },
  consultationTypeText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 15,
  },
  consultationTypeUnavailable: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  reasonInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 24,
    marginTop: 8,
    fontSize: 15,
    color: '#222',
    fontWeight: '600',
  },
  continueBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    marginHorizontal: 24,
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  confirmCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2E9',
    marginBottom: 12,
  },
  confirmLabel: {
    fontWeight: '700',
    fontSize: 15,
    color: '#222',
    marginTop: 18,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  confirmValue: {
    fontSize: 15,
    color: '#222',
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  confirmBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginTop: 32,
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#F1F3F4',
    borderRadius: 24,
    marginRight: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#222',
    fontWeight: '700',
    fontSize: 17,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  successMsg: {
    fontSize: 16,
    color: '#222',
    marginBottom: 16,
    textAlign: 'center',
  },
  successCheck: {
    backgroundColor: '#E0F2E9',
    borderRadius: 32,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successDetails: {
    width: '100%',
    marginTop: 12,
  },
  successDetailLabel: {
    fontWeight: '700',
    fontSize: 15,
    color: '#222',
    marginTop: 8,
    marginBottom: 2,
  },
  successDetailValue: {
    fontSize: 15,
    color: '#222',
    fontWeight: '600',
  },
  addCalendarBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addCalendarBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  secondaryBtn: {
    backgroundColor: '#F1F3F4',
    borderRadius: 24,
    marginHorizontal: 24,
    marginTop: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#222',
    fontWeight: '700',
    fontSize: 17,
  },
  timePickerBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timePickerBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectedTimeText: {
    color: '#222',
    fontSize: 15,
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  availabilityContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginLeft: 8,
  },
  availabilityText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  timePickerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  nativeTimePicker: {
    width: '100%',
    height: 200,
    backgroundColor: '#FFFFFF',
  },
  selectedTimePreview: {
    width: '100%',
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  selectedTimeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  selectedTimeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  modalFooter: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: '#F1F3F4',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelModalBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  continueModalBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueModalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  continueModalBtnDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueModalBtnTextDisabled: {
    color: '#999',
  },
  validationMessage: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  validationText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  disabledDay: {
    backgroundColor: '#F5F5F5',
    opacity: 0.5,
  },
  disabledDayText: {
    color: '#999',
  },
  pendingNote: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 16,
    alignSelf: 'center',
  },
  pendingNoteText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  proceedBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    marginHorizontal: 24,
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  proceedBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
}); 