import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface CustomTimePickerProps {
  visible: boolean;
  onClose: () => void;
  onTimeSelect: (time: string) => void;
  selectedTime?: string;
  availableSlots?: any[];
  workingHours?: any;
  selectedDate?: Date;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  visible,
  onClose,
  onTimeSelect,
  selectedTime,
  availableSlots = [],
  workingHours,
  selectedDate,
}) => {
  const [tempTime, setTempTime] = useState<string>('');
  const [isValidTime, setIsValidTime] = useState<boolean>(true);

  // Generate time options based on available slots
  const generateTimeOptions = () => {
    console.log('🔍 [CustomTimePicker] generateTimeOptions called');
    console.log('🔍 [CustomTimePicker] availableSlots:', availableSlots);
    console.log('🔍 [CustomTimePicker] selectedDate:', selectedDate);
    
    const options: string[] = [];
    const now = new Date();
    const selectedDateOnly = selectedDate ? new Date(selectedDate) : new Date();
    selectedDateOnly.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = selectedDateOnly.getTime() === today.getTime();

    console.log('🔍 [CustomTimePicker] isToday:', isToday);

    if (!availableSlots || availableSlots.length === 0) {
      console.log('❌ [CustomTimePicker] No available slots, using fallback times');
      // Fallback times for testing (9 AM to 4:30 PM - last appointment 30 min before 5 PM)
      return [
        '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
        '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
        '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'
      ];
    }

    availableSlots.forEach((slot: any, index: number) => {
      console.log(`🔍 [CustomTimePicker] Processing slot ${index}:`, slot);
      
      if (!slot || !slot.start || !slot.end) {
        console.log(`❌ [CustomTimePicker] Invalid slot ${index}:`, slot);
        return;
      }

      const [startHour, startMin] = slot.start.split(':').map(Number);
      const [endHour, endMin] = slot.end.split(':').map(Number);
      let current = new Date();
      current.setHours(startHour, startMin, 0, 0);
      const end = new Date();
      end.setHours(endHour, endMin, 0, 0);

      console.log(`🔍 [CustomTimePicker] Slot ${index} time range: ${slot.start} to ${slot.end}`);

      // Create a copy of end time and subtract 30 minutes to ensure last appointment ends before doctor's work ends
      const lastAppointmentTime = new Date(end);
      lastAppointmentTime.setMinutes(lastAppointmentTime.getMinutes() - 30);
      
      console.log(`🔍 [CustomTimePicker] Last appointment time: ${lastAppointmentTime.getHours()}:${lastAppointmentTime.getMinutes().toString().padStart(2, '0')}`);

      while (current <= lastAppointmentTime) {
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
            console.log(`✅ [CustomTimePicker] Added time for today: ${label}`);
          } else {
            console.log(`⏰ [CustomTimePicker] Skipped past time: ${label}`);
          }
        } else {
          options.push(label);
          console.log(`✅ [CustomTimePicker] Added time for future date: ${label}`);
        }

        current.setMinutes(current.getMinutes() + 30);
      }
    });

    console.log('🔍 [CustomTimePicker] Final options:', options);

    // Remove duplicates and sort
    const finalOptions = Array.from(new Set(options)).sort((a, b) => {
      const timeA = new Date(`2000-01-01 ${a}`);
      const timeB = new Date(`2000-01-01 ${b}`);
      return timeA.getTime() - timeB.getTime();
    });

    console.log('🔍 [CustomTimePicker] Final sorted options:', finalOptions);
    return finalOptions;
  };

  const timeOptions = generateTimeOptions();

  // Convert 12-hour time string to 24-hour format
  const to24HourFormat = (timeStr: string): string => {
    if (!timeStr) return '';
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (!match) return timeStr;
    let [_, hour, minute, period] = match;
    let h = parseInt(hour, 10);
    if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute}`;
  };

  // Check if time is valid
  const checkTimeValidity = (time: string) => {
    if (!time) return false;
    return timeOptions.includes(time);
  };

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    setTempTime(time);
    setIsValidTime(checkTimeValidity(time));
  };

  // Handle confirm
  const handleConfirm = () => {
    if (tempTime && isValidTime) {
      onTimeSelect(tempTime);
      onClose();
    }
  };

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      console.log('🔍 [CustomTimePicker] Modal opened');
      console.log('🔍 [CustomTimePicker] Props received:', {
        selectedTime,
        availableSlots,
        workingHours,
        selectedDate
      });
      setTempTime(selectedTime || '');
      setIsValidTime(true);
    }
  }, [visible, selectedTime, availableSlots, workingHours, selectedDate]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FontAwesome name="times" size={20} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>Select Time</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Selected Date Info */}
          {selectedDate && (
            <View style={styles.dateInfo}>
              <FontAwesome name="calendar" size={16} color="#4CAF50" />
              <Text style={styles.dateText}>
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}

           {/* Debug Info */}
           <View style={styles.debugInfo}>
             <Text style={styles.debugText}>Available Slots: {availableSlots?.length || 0}</Text>
             <Text style={styles.debugText}>Time Options: {timeOptions.length}</Text>
             <Text style={styles.debugText}>Selected Date: {selectedDate?.toDateString()}</Text>
           </View>

           {/* Time Options */}
           <ScrollView style={styles.timeOptionsContainer} showsVerticalScrollIndicator={false}>
             <View style={styles.timeGrid}>
               {timeOptions.length > 0 ? (
                 timeOptions.map((time, index) => (
                   <TouchableOpacity
                     key={index}
                     style={[
                       styles.timeOption,
                       tempTime === time && styles.selectedTimeOption,
                     ]}
                     onPress={() => handleTimeSelect(time)}
                   >
                     <Text
                       style={[
                         styles.timeOptionText,
                         tempTime === time && styles.selectedTimeOptionText,
                       ]}
                     >
                       {time}
                     </Text>
                   </TouchableOpacity>
                 ))
               ) : (
                 <View style={styles.noTimesContainer}>
                   <Text style={styles.noTimesText}>No available times for this day</Text>
                 </View>
               )}
             </View>
           </ScrollView>

          {/* Selected Time Preview */}
          {tempTime && (
            <View style={styles.selectedTimePreview}>
              <FontAwesome name="clock-o" size={16} color="#4CAF50" />
              <Text style={styles.selectedTimeLabel}>Selected: {tempTime}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!tempTime || !isValidTime) && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!tempTime || !isValidTime}
            >
              <Text
                style={[
                  styles.confirmBtnText,
                  (!tempTime || !isValidTime) && styles.confirmBtnTextDisabled,
                ]}
              >
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  placeholder: {
    width: 36,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  timeOptionsContainer: {
    maxHeight: 300,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeOption: {
    backgroundColor: '#F1F3F4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedTimeOption: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  selectedTimeOptionText: {
    color: '#fff',
  },
  selectedTimePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedTimeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F3F4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  confirmBtnDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnTextDisabled: {
    color: '#999',
  },
  debugInfo: {
    backgroundColor: '#F0F8FF',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  debugText: {
    fontSize: 12,
    color: '#1976D2',
    marginBottom: 4,
  },
  noTimesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noTimesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default CustomTimePicker;
