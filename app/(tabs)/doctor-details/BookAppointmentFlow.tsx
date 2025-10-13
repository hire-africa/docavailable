import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
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
import { apiService } from '../../../app/services/apiService';
import DoctorProfilePicture from '../../../components/DoctorProfilePicture';
import { useAuth } from '../../../contexts/AuthContext';
import { imageCacheService } from '../../../services/imageCacheService';
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
  const [doctorPicUrl, setDoctorPicUrl] = useState<string | null>(null);
  const [doctorPic, setDoctorPic] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

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
      console.log('🔍 [fetchWorkingHours] Fetching for doctorId:', doctorId);
      setLoadingHours(true);
      try {
        const response = await apiService.get(`/doctors/${doctorId}/availability`);
        console.log('🔍 [fetchWorkingHours] API response:', response);
        
        if (response.success && response.data && (response.data as any).working_hours) {
          console.log('✅ [fetchWorkingHours] Setting working hours:', (response.data as any).working_hours);
          setWorkingHours((response.data as any).working_hours);
        } else {
          console.log('❌ [fetchWorkingHours] No working hours data in response');
          setWorkingHours(null);
        }
      } catch (e) {
        console.error('❌ [fetchWorkingHours] Error fetching working hours:', e);
        setWorkingHours(null);
      } finally {
        setLoadingHours(false);
      }
    };
    fetchWorkingHours();
  }, [doctorId]);

  // Fetch doctor profile picture and preload/cache it
  useEffect(() => {
    const fetchDoctorInfo = async () => {
      if (!doctorId) return;
      try {
        const response = await apiService.get(`/doctors/${doctorId}`);
        if (response.success && response.data) {
          const data: any = response.data;
          const url = data.profile_picture_url || null;
          const pic = data.profile_picture || null;
          setDoctorPicUrl(url);
          setDoctorPic(pic);
          // Preload/cache the image
          const toCache = getImageUrlForCache(url || pic);
          if (toCache) {
            imageCacheService.downloadAndCache(toCache).catch(() => {});
          }
        }
      } catch (e) {
        // ignore
      }
    };
    fetchDoctorInfo();
  }, [doctorId]);

  // Normalize backend image URI to a full URL for caching
  const getImageUrlForCache = (uri?: string | null): string | null => {
    if (!uri || typeof uri !== 'string') return null;
    if (uri.startsWith('http')) return uri;
    let clean = uri.trim();
    if (clean.startsWith('/storage/')) clean = clean.substring('/storage/'.length);
    if (clean.startsWith('storage/')) clean = clean.substring('storage/'.length);
    clean = clean.replace(/^\/+/, '');
    return `https://docavailable-3vbdv.ondigitalocean.app/api/images/${clean}`;
  };

  // Load subscription: prefer param; fallback to API
  useEffect(() => {
    if (subscription || !user) return;
    // set from params first
    if (userSubscription) {
      setSubscription(userSubscription);
      return;
    }
    (async () => {
      try {
        const resp = await apiService.get('/subscription');
        if (resp.success && resp.data) setSubscription(resp.data);
      } catch {}
    })();
  }, [user, userSubscription, subscription]);

  // Helper to check if a consultation type is available
  const isTypeAvailable = (type: string) => {
    const sub = subscription || userSubscription;
    if (!sub) return true;
    if (type === 'text') return (sub.textSessionsRemaining || 0) > 0;
    if (type === 'voice') return (sub.voiceCallsRemaining || 0) > 0;
    if (type === 'video') return (sub.videoCallsRemaining || 0) > 0;
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
    console.log('🔍 [getAvailableSlots] workingHours:', workingHours);
    console.log('🔍 [getAvailableSlots] selectedDate:', selectedDate);
    console.log('🔍 [getAvailableSlots] selectedDate.getDay():', selectedDate.getDay());
    
    if (!workingHours) {
      console.log('❌ [getAvailableSlots] No workingHours data');
      return [];
    }
    
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayKey = days[selectedDate.getDay()];
    console.log('🔍 [getAvailableSlots] dayKey:', dayKey);
    
    const dayHours = workingHours[dayKey];
    console.log('🔍 [getAvailableSlots] dayHours:', dayHours);
    
    if (!dayHours || !dayHours.enabled) {
      console.log('❌ [getAvailableSlots] No dayHours or not enabled');
      return [];
    }
    
    console.log('✅ [getAvailableSlots] Returning slots:', dayHours.slots);
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

  // Allow any time for future dates; for today, disallow past times
  const isTimeNotPastForSelectedDay = (time: Date): boolean => {
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = selectedDateOnly.getTime() === today.getTime();
    if (!isToday) return true;
    const now = new Date();
    const candidate = new Date();
    candidate.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return candidate > now;
  };

  // Native time picker for Android
  const showAndroidTimePicker = () => {
    console.log('🔍 [showAndroidTimePicker] Setting showNativeTimePicker to true');
    setShowNativeTimePicker(true);
  };

  // Native time picker for iOS
  const showIOSTimePicker = () => {
    console.log('🔍 [showIOSTimePicker] Setting showNativeTimePicker to true');
    setShowNativeTimePicker(true);
  };

  // Handle time picker change for both Android and iOS
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      // On Android, the picker closes automatically after selection
      setShowNativeTimePicker(false);
    }
    
    if (selectedTime && event.type !== 'dismissed') {
      setTempTime(selectedTime);
      
      // On Android, automatically save the time when selected
      if (Platform.OS === 'android') {
        const timeStr = formatTime12Hour(selectedTime);
        const time24Hour = to24HourFormat(timeStr);
        
        // Check if time is within available slots
        if (isTimeInAvailableSlots(selectedTime) && isTimeNotPastForSelectedDay(selectedTime)) {
          setCustomTime(timeStr);
          setSelectedTime(time24Hour);
        } else {
          Alert.alert(
            'Invalid Time',
            'Please select a time within the doctor\'s working hours. For today, the time must be in the future.',
            [{ text: 'OK' }]
          );
        }
      }
    }
  };

  // Handle continue button press for iOS time picker
  const handleContinueTimeSelection = () => {
    const timeStr = formatTime12Hour(tempTime);
    const time24Hour = to24HourFormat(timeStr);
    
    // Check if time is within available slots
    if (isTimeInAvailableSlots(tempTime) && isTimeNotPastForSelectedDay(tempTime)) {
      setCustomTime(timeStr);
      setSelectedTime(time24Hour);
      setShowNativeTimePicker(false);
    } else {
      Alert.alert(
        'Invalid Time',
        'Please select a time within the doctor\'s working hours. For today, the time must be in the future.',
        [{ text: 'OK' }]
      );
    }
  };

  // Show appropriate time picker based on platform
  const showTimePickerModal = () => {
    console.log('🔍 [showTimePickerModal] Called');
    console.log('🔍 [showTimePickerModal] Platform.OS:', Platform.OS);
    console.log('🔍 [showTimePickerModal] getAvailableSlots().length:', getAvailableSlots().length);
    
    if (Platform.OS === 'android') {
      console.log('🔍 [showTimePickerModal] Calling showAndroidTimePicker');
      showAndroidTimePicker();
    } else {
      console.log('🔍 [showTimePickerModal] Calling showIOSTimePicker');
      showIOSTimePicker();
    }
  };

  // Check if current temp time is valid
  const isCurrentTimeValid = () => {
    return isTimeInAvailableSlots(tempTime) && isTimeNotPastForSelectedDay(tempTime);
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
        {/* Enhanced Doctor Profile Card */}
        <View style={styles.doctorProfileCard}>
          <View style={styles.doctorProfileHeader}>
            {doctorPicUrl || doctorPic ? (
              <DoctorProfilePicture
                profilePictureUrl={doctorPicUrl || undefined}
                profilePicture={doctorPic || undefined}
                size={80}
                name={doctorName}
                style={styles.doctorProfileImage}
              />
            ) : (
              <View style={styles.doctorProfileImagePlaceholder}>
                <FontAwesome name="user-md" size={32} color="#4CAF50" />
              </View>
            )}
            <View style={styles.doctorProfileInfo}>
              <Text style={styles.doctorProfileName}>{doctorName}</Text>
              <Text style={styles.doctorProfileSpecialization}>{specialization}</Text>
              <View style={styles.doctorProfileStatus}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Available for consultation</Text>
              </View>
            </View>
          </View>
        </View>
        {/* Enhanced Calendar Section */}
        <View style={styles.calendarSection}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="calendar" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Select Date</Text>
          </View>
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
        </View>
        {/* Enhanced Time Selection Section */}
        <View style={styles.timeSection}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="clock-o" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Select Time</Text>
          </View>
          <View style={styles.availabilityCard}>
            <View style={styles.availabilityHeader}>
              <FontAwesome name="info-circle" size={16} color="#4CAF50" />
              <Text style={styles.availabilityTitle}>Doctor's Availability</Text>
            </View>
            {loadingHours ? (
              <Text style={styles.availabilityText}>Loading availability...</Text>
            ) : (
              <Text style={styles.availabilityText}>{getAvailabilityInfo()}</Text>
            )}
          </View>
          <View style={styles.timePickerCard}>
          {getAvailableSlots().length > 0 ? (
            <>
              <TouchableOpacity
                style={styles.timePickerBtn}
                onPress={showTimePickerModal}
              >
                <Text style={styles.timePickerBtnText}>{customTime ? `Change Time (${customTime})` : 'Pick a time'}</Text>
              </TouchableOpacity>
              {customTime ? (
                <Text style={styles.selectedTimeText}>Selected time: {customTime}</Text>
              ) : null}
              {/* Debug info */}
              <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                Debug: showNativeTimePicker = {showNativeTimePicker.toString()}
              </Text>
            </>
          ) : (
            <View style={styles.noAvailabilityContainer}>
              <Text style={styles.noAvailabilityText}>
                {loadingHours ? 'Loading availability...' : 'No available time slots for this day'}
              </Text>
            </View>
          )}
          </View>
        </View>
        {/* Enhanced Consultation Types Section */}
        <View style={styles.consultationSection}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="stethoscope" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Consultation Type</Text>
          </View>
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
        </View>
        {/* Enhanced Reason Section */}
        <View style={styles.reasonSection}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="file-text-o" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Reason for Session</Text>
          </View>
          <TextInput
            style={styles.reasonInput}
            placeholder="e.g. Rash, Checkup, General consultation"
            placeholderTextColor="#999"
            value={reason}
            onChangeText={setReason}
            maxLength={50}
          />
        </View>
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
            javaScriptEnabled={true}
            domStorageEnabled={true}
            thirdPartyCookiesEnabled={true}
            mixedContentMode="compatibility"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            onShouldStartLoadWithRequest={(req) => {
              try {
                const url = req.url;
                const callback = 'https://docavailable-3vbdv.ondigitalocean.app/api/payments/paychangu/callback';
                const ret = 'https://docavailable-3vbdv.ondigitalocean.app/api/payments/paychangu/return';
                if (url.startsWith(callback) || url.startsWith(ret)) {
                  setCheckoutUrl(null);
                  return false;
                }
                return true;
              } catch (error) {
                console.log('Error in onShouldStartLoadWithRequest:', error);
                return true;
              }
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.log('WebView error:', nativeEvent);
            }}
            onLoadStart={() => {
              console.log('WebView load started');
            }}
            onLoadEnd={() => {
              console.log('WebView load ended');
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
        <View style={styles.confirmHeader}>
          <View style={styles.confirmDoctorInfo}>
            {doctorPicUrl || doctorPic ? (
              <DoctorProfilePicture
                profilePictureUrl={doctorPicUrl || undefined}
                profilePicture={doctorPic || undefined}
                size={80}
                name={doctorName}
                style={styles.confirmDoctorImage}
              />
            ) : (
              <View style={styles.confirmAvatarCircle}>
                <FontAwesome name="user-md" size={32} color="#4CAF50" />
              </View>
            )}
            <View style={styles.confirmDoctorDetails}>
              <Text style={styles.confirmDoctorName}>{doctorName}</Text>
              <Text style={styles.confirmDoctorSpecialization}>{specialization}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.confirmDetailsContainer}>
          <View style={styles.confirmDetailItem}>
            <View style={styles.confirmDetailIcon}>
              <FontAwesome name="calendar" size={16} color="#4CAF50" />
            </View>
            <View style={styles.confirmDetailContent}>
              <Text style={styles.confirmLabel}>Date & Time</Text>
              <Text style={styles.confirmValue}>
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {customTime}
              </Text>
            </View>
          </View>
          
          <View style={styles.confirmDetailItem}>
            <View style={styles.confirmDetailIcon}>
              <FontAwesome name="stethoscope" size={16} color="#4CAF50" />
            </View>
            <View style={styles.confirmDetailContent}>
              <Text style={styles.confirmLabel}>Consultation Type</Text>
              <Text style={styles.confirmValue}>{consultationTypes.find(t => t.key === consultationType)?.label || ''}</Text>
            </View>
          </View>
          
          <View style={styles.confirmDetailItem}>
            <View style={styles.confirmDetailIcon}>
              <FontAwesome name="file-text-o" size={16} color="#4CAF50" />
            </View>
            <View style={styles.confirmDetailContent}>
              <Text style={styles.confirmLabel}>Reason</Text>
              <Text style={styles.confirmValue}>{reason}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={{ marginHorizontal: 24, marginTop: -8 }}>
        <View style={{ backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FFE082' }}>
          <Text style={{ color: '#8D6E63', fontSize: 12 }}>
            Note: Please respect the scheduled appointment time. Missing your appointment may forfeit your text sessions or audio/video calls.
          </Text>
        </View>
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
        <View style={styles.successHeader}>
          <View style={styles.successIconContainer}>
            <FontAwesome name="check-circle" size={48} color="#4CAF50" />
          </View>
          <Text style={styles.successTitle}>Appointment Request Sent!</Text>
          <Text style={styles.successMsg}>Your appointment request with {doctorName} has been sent and is waiting for doctor approval.</Text>
        </View>
        
        <View style={styles.successDetailsContainer}>
          <View style={styles.successDetailItem}>
            <View style={styles.successDetailIcon}>
              <FontAwesome name="calendar" size={16} color="#4CAF50" />
            </View>
            <View style={styles.successDetailContent}>
              <Text style={styles.successDetailLabel}>Date & Time</Text>
              <Text style={styles.successDetailValue}>
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {customTime}
              </Text>
            </View>
          </View>
          
          <View style={styles.successDetailItem}>
            <View style={styles.successDetailIcon}>
              <FontAwesome name="stethoscope" size={16} color="#4CAF50" />
            </View>
            <View style={styles.successDetailContent}>
              <Text style={styles.successDetailLabel}>Consultation Type</Text>
              <Text style={styles.successDetailValue}>{consultationTypes.find(t => t.key === consultationType)?.label || ''}</Text>
            </View>
          </View>
          
          <View style={styles.successDetailItem}>
            <View style={styles.successDetailIcon}>
              <FontAwesome name="file-text-o" size={16} color="#4CAF50" />
            </View>
            <View style={styles.successDetailContent}>
              <Text style={styles.successDetailLabel}>Reason</Text>
              <Text style={styles.successDetailValue}>{reason}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.pendingNote}>
          <FontAwesome name="info-circle" size={16} color="#2E7D32" />
          <Text style={styles.pendingNoteText}>
            You'll receive a notification when the doctor confirms or rejects your appointment.
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.proceedBtn} 
        onPress={() => router.push({ pathname: '/patient-dashboard', params: { tab: 'discover' } })}
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

    // Validate that selected date/time is in the future
    const now = new Date();
    const [selHour, selMin] = selectedTime.split(':').map((v) => parseInt(v, 10));
    const apptDateTime = new Date(selectedDate);
    apptDateTime.setHours(selHour || 0, selMin || 0, 0, 0);
    if (!(apptDateTime.getTime() > now.getTime())) {
      Alert.alert('Error', 'Please select a future time for your appointment');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Determine if user has remaining sessions for selected type
      const hasQuota = isTypeAvailable(consultationType);
      if (hasQuota) {
        // Create appointment directly
        const payload: any = {
          doctor_id: Number(doctorId),
          appointment_date: `${apptDateTime.getFullYear()}-${(apptDateTime.getMonth()+1).toString().padStart(2,'0')}-${apptDateTime.getDate().toString().padStart(2,'0')}`,
          appointment_time: selectedTime,
          appointment_type: consultationType,
          reason: reason,
        };
        const createRes = await apiService.post('/appointments', payload);
        if (createRes.success) {
          setStep(3);
          return;
        }
        throw new Error(createRes.message || 'Failed to create appointment');
      } else {
        // No quota: initiate purchase flow
        const res = await paymentsService.initiatePlanPurchase(1);
        if (res?.success && res.data?.checkout_url) {
          setCheckoutUrl(res.data.checkout_url);
          setTxRef(res.data.reference);
        } else {
          Alert.alert('No Sessions Available', 'Please purchase a plan to continue.');
        }
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

  return (
    <>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      
      {/* Time Picker Modal - rendered at component level */}
      <Modal
        visible={showNativeTimePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          console.log('🔍 [Modal] onRequestClose called');
          setShowNativeTimePicker(false);
        }}
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
            
            {Platform.OS !== 'android' && (
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
            )}
            
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
    </>
  );
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmHeader: {
    marginBottom: 24,
  },
  confirmDoctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmDoctorImage: {
    marginRight: 16,
  },
  confirmAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  confirmDoctorDetails: {
    flex: 1,
  },
  confirmDoctorName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  confirmDoctorSpecialization: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  confirmDetailsContainer: {
    gap: 20,
  },
  confirmDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  confirmDetailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  confirmDetailContent: {
    flex: 1,
  },
  confirmLabel: {
    fontWeight: '600',
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  confirmValue: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
    lineHeight: 22,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMsg: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  successDetailsContainer: {
    marginBottom: 24,
  },
  successDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  successDetailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  successDetailContent: {
    flex: 1,
  },
  successDetailLabel: {
    fontWeight: '600',
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  successDetailValue: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
    lineHeight: 22,
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
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  pendingNoteText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
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
  noAvailabilityContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  noAvailabilityText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Enhanced Doctor Profile Styles
  doctorProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  doctorProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorProfileImage: {
    marginRight: 16,
  },
  doctorProfileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  doctorProfileInfo: {
    flex: 1,
  },
  doctorProfileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  doctorProfileSpecialization: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 8,
  },
  doctorProfileStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  // Enhanced Section Styles
  calendarSection: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  consultationSection: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  reasonSection: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  timeSection: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginLeft: 12,
  },
  // Enhanced Calendar Styles
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  // Enhanced Consultation Type Styles
  consultationTypesContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  consultationTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  consultationTypeBtn: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedConsultationTypeBtn: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  consultationTypeTextContainer: {
    flex: 1,
  },
  consultationTypeText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 16,
  },
  consultationTypeUnavailable: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  // Enhanced Reason Input Styles
  reasonInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  // Enhanced Time Selection Styles
  availabilityCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  availabilityText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  timePickerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
}); 