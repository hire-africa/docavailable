import DateTimePicker from '@react-native-community/datetimepicker';
import { forwardRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const styles = StyleSheet.create({
  label: {
    fontWeight: '500',
    marginBottom: 4,
    fontSize: 15,
  },
  input: {
    height: 48,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  error: {
    color: '#D32F2F',
    marginTop: 4,
    fontSize: 13,
  },
  datePickerContainer: {
    position: 'relative',
  },
  datePickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  datePickerContent: {
    padding: 16,
  },
  datePickerButtons: {
    backgroundColor: '#fff',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: '#D32F2F',
    padding: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
});

interface DatePickerFieldProps {
    value: string;
    onChange: (date: string) => void;
    label?: string;
    error?: string;
    minimumDate?: Date;
    outputFormat?: 'MM/DD/YYYY' | 'YYYY-MM-DD';
}

function formatDate(date: Date, format: 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'YYYY-MM-DD'): string {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    
    return format === 'YYYY-MM-DD' ? `${yyyy}-${mm}-${dd}` : `${mm}/${dd}/${yyyy}`;
}

function parseDate(str: string): Date | null {
    if (!str || str.trim() === '') return null;
    
    // console.log('DatePickerField: Parsing date string:', str);
    
    // Handle different date formats
    let parts: string[] = [];
    
    // 1. Try parsing as ISO string (Laravel default format)
    if (str.includes('T') || str.includes('Z')) {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
            // console.log('DatePickerField: Parsed as ISO string:', date);
            return date;
        }
    }
    
    // 2. Try parsing as YYYY-MM-DD format
    if (str.includes('-') && !str.includes('T')) {
        parts = str.split('-');
        if (parts.length === 3) {
            const year = Number(parts[0]);
            const month = Number(parts[1]) - 1; // Month is 0-indexed
            const day = Number(parts[2]);
            
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                const date = new Date(year, month, day);
                // console.log('DatePickerField: Parsed as YYYY-MM-DD:', date);
                return date;
            }
        }
    }
    
    // 3. Try parsing as MM/DD/YYYY format
    if (str.includes('/')) {
        parts = str.split('/');
        if (parts.length === 3) {
            const month = Number(parts[0]) - 1; // Month is 0-indexed
            const day = Number(parts[1]);
            const year = Number(parts[2]);
            
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                const date = new Date(year, month, day);
                // console.log('DatePickerField: Parsed as MM/DD/YYYY:', date);
                return date;
            }
        }
    }
    
    // 4. Try parsing as timestamp (Unix timestamp)
    if (/^\d+$/.test(str)) {
        const timestamp = Number(str);
        if (!isNaN(timestamp)) {
            // Check if it's a Unix timestamp (seconds since epoch)
            if (timestamp > 1000000000) { // Likely a Unix timestamp
                const date = new Date(timestamp * 1000);
                // console.log('DatePickerField: Parsed as Unix timestamp:', date);
                return date;
            } else {
                const date = new Date(timestamp);
                // console.log('DatePickerField: Parsed as JavaScript timestamp:', date);
                return date;
            }
        }
    }
    
    // 5. Try parsing as is (fallback)
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
        // console.log('DatePickerField: Parsed as generic date:', date);
        return date;
    }
    
    // console.log('DatePickerField: Failed to parse date string:', str);
    return null;
}

export const DatePickerField = forwardRef<View, DatePickerFieldProps>(({ 
    value, 
    onChange, 
    label, 
    error, 
    minimumDate,
    outputFormat = 'YYYY-MM-DD'
}, ref) => {
    const [show, setShow] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(new Date());
    const [isProcessing, setIsProcessing] = useState(false);

    // Parse the current value
    const dateObj = parseDate(value) || new Date(2000, 0, 1);
    
    // Validate the current value
    const isValidValue = !value || parseDate(value) !== null;
    
    // Log the parsing result for debugging
    if (value) {
        // console.log('DatePickerField: Input value:', value);
        // console.log('DatePickerField: Parsed date object:', dateObj);
        // console.log('DatePickerField: Is valid:', isValidValue);
    }

    if (Platform.OS === 'web') {
        // For web, always use YYYY-MM-DD as it's the HTML5 date input format
        const htmlValue = value ? formatDate(parseDate(value) || new Date(), 'YYYY-MM-DD') : '';
        
        return (
            <View style={{ marginBottom: 16 }}>
                {label && <Text style={styles.label}>{label}</Text>}
                <input
                    type="date"
                    min={minimumDate ? minimumDate.toISOString().split('T')[0] : undefined}
                    value={htmlValue}
                    onChange={e => {
                        const val = e.target.value;
                        if (val) {
                            // Convert from HTML5 format to desired output format
                            const date = parseDate(val);
                            if (date) {
                                onChange(formatDate(date, outputFormat));
                            }
                        } else {
                            onChange('');
                        }
                    }}
                    style={{
                        height: 40,
                        borderColor: error ? '#D32F2F' : '#E0E0E0',
                        borderWidth: 1,
                        borderRadius: 8,
                        padding: 8,
                        fontSize: 16,
                        width: '100%',
                    }}
                />
                {error && <Text style={styles.error}>{error}</Text>}
                {!isValidValue && value && (
                    <Text style={styles.error}>Invalid date format</Text>
                )}
            </View>
        );
    }

    // For native platforms
    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (isProcessing) return; // Prevent multiple rapid calls
        
        if (Platform.OS === 'android') {
            // On Android, the picker closes automatically after selection
            setShow(false);
        }
        
        if (selectedDate && event.type !== 'dismissed') {
            setIsProcessing(true);
            setTempDate(selectedDate);
            // On Android, automatically save the date when selected
            if (Platform.OS === 'android') {
                onChange(formatDate(selectedDate, outputFormat));
            }
            // Reset processing flag after a short delay
            setTimeout(() => setIsProcessing(false), 100);
        }
    };

    const handleSave = () => {
        onChange(formatDate(tempDate, outputFormat));
        setShow(false);
    };

    const handleCancel = () => {
        setTempDate(dateObj);
        setShow(false);
    };

    return (
        <View ref={ref} style={{ marginBottom: 16 }}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TouchableOpacity
                style={[
                    styles.input,
                    (error || (!isValidValue && value)) && { borderColor: '#D32F2F' },
                ]}
                onPress={() => {
                    if (isProcessing) return; // Prevent opening while processing
                    setTempDate(dateObj);
                    setShow(true);
                }}
                activeOpacity={0.7}
            >
                <Text style={{ 
                    color: value && isValidValue ? '#000' : '#999', 
                    fontSize: 16 
                }}>
                    {value && isValidValue ? formatDate(dateObj, outputFormat) : 'Select date'}
                </Text>
            </TouchableOpacity>
            {show && (
                <View style={styles.datePickerContainer}>
                    <TouchableOpacity 
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                        activeOpacity={1}
                        onPress={() => setShow(false)}
                    />
                    <View style={styles.datePickerModal}>
                        <View style={styles.datePickerContent}>
                            <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display={Platform.OS === 'android' ? 'calendar' : 'default'}
                                minimumDate={minimumDate}
                                onChange={handleDateChange}
                            />
                            {Platform.OS !== 'android' && (
                                <View style={styles.datePickerButtons}>
                                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            )}
            {error && <Text style={styles.error}>{error}</Text>}
            {!isValidValue && value && (
                <Text style={styles.error}>Invalid date format</Text>
            )}
        </View>
    );
});

export default DatePickerField; 