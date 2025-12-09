import authService from '@/services/authService';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DatePickerField from '../components/DatePickerField';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;
const isLargeScreen = width > 768;

// Extended admin data interface for complete profile
interface CompleteAdminData {
    uid: string;
    email: string;
    displayName: string;
    userType: 'patient' | 'doctor' | 'admin';
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    role?: string;
    permissions?: string[];
    preferredLanguage?: string;
    notificationPreferences?: {
        email: boolean;
        sms: boolean;
        push: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
    status?: string;
}

// Utility to auto-format phone number
function formatPhoneInput(value: string) {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
    let formatted = cleaned;
    if (cleaned.length > 6) {
        formatted = `${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length > 3) {
        formatted = `${cleaned.slice(0,3)}-${cleaned.slice(3)}`;
    }
    return formatted;
}

// Utility to clean up date strings
function cleanDateString(dateStr: string): string {
    if (!dateStr || dateStr.trim() === '') return '';
    
    // If it's already in MM/DD/YYYY format and valid, return as is
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [mm, dd, yyyy] = dateStr.split('/');
        const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (!isNaN(date.getTime())) {
            return dateStr;
        }
    }
    
    // If it's in YYYY-MM-DD format, convert to MM/DD/YYYY
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [yyyy, mm, dd] = dateStr.split('-');
        const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (!isNaN(date.getTime())) {
            return `${mm}/${dd}/${yyyy}`;
        }
    }
    
    // If it's an invalid date, return empty string
    return '';
}

export default function EditPatientProfile() {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [completeUserData, setCompleteUserData] = useState<CompleteAdminData | null>(null);
    
    // Basic Information
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    
    // Preferences
    const [preferredLanguage, setPreferredLanguage] = useState<string | null>(null);
    const [notificationPreferences, setNotificationPreferences] = useState({
        email: true,
        sms: true,
        push: true
    });
    
    const [errors, setErrors] = useState<any>({});

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/');
        }
    }, [user, loading]);

    // Fetch complete user data from Firestore
    useEffect(() => {
        const fetchCompleteUserData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // console.log('EditProfile: Fetching complete user data for:', user.uid);
                const completeData = await authService.getUserById(user.uid) as CompleteAdminData;
                // console.log('EditProfile: Complete user data fetched:', completeData);
                setCompleteUserData(completeData);
                
                if (completeData) {
                    // Load all existing user data
                    setFirstName(completeData.firstName || '');
                    setLastName(completeData.lastName || '');
                    setDateOfBirth(cleanDateString(completeData.dateOfBirth || ''));
                    setGender(completeData.gender || null);
                    setEmail(completeData.email || user?.email || '');
                    setRole(completeData.role || '');
                    setPreferredLanguage(completeData.preferredLanguage || null);
                    setNotificationPreferences(completeData.notificationPreferences || {
                        email: true,
                        sms: true,
                        push: true
                    });
                    
                    // Log the loaded data for debugging
                    // console.log('EditProfile: Loaded user data:', {
                    //   firstName: completeData.firstName,
                    //   lastName: completeData.lastName,
                    //   dateOfBirth: completeData.dateOfBirth,
                    //   cleanedDateOfBirth: cleanDateString(completeData.dateOfBirth || ''),
                    //   gender: completeData.gender,
                    //   bio: completeData.bio,
                    //   country: completeData.country,
                    //   city: completeData.city,
                    //   profilePicture: completeData.profilePicture
                    // });
                }
            } catch (error) {
                console.error('EditProfile: Error fetching complete user data:', error);
                Alert.alert('Error', 'Failed to load profile data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchCompleteUserData();
    }, [user]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.mainContent}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4CAF50" />
                        <Text style={styles.loadingText}>Loading profile data...</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (!user) return null;

    const validateForm = () => {
        const newErrors: any = {};
        let isValid = true;

        if (firstName.length < 2) {
            newErrors.firstName = 'First name must be at least 2 characters.';
            isValid = false;
        }
        if (lastName.length < 2) {
            newErrors.lastName = 'Last name must be at least 2 characters.';
            isValid = false;
        }
        if (!dateOfBirth) {
            newErrors.dateOfBirth = 'Please enter your Date of Birth.';
            isValid = false;
        }
        if (!gender) {
            newErrors.gender = 'Please select a gender.';
            isValid = false;
        }
        if (!email.includes('@')) {
            newErrors.email = 'Please enter a valid email address.';
            isValid = false;
        }
        if (role && role.length < 2) {
            newErrors.role = 'Role must be at least 2 characters.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setSaving(true);
        try {
            // Create the update data object, filtering out undefined and empty values
            const updateData: any = {
                updatedAt: new Date()
            };

            // Only add fields that have values
            if (firstName) updateData.firstName = firstName;
            if (lastName) updateData.lastName = lastName;
            if (firstName && lastName) updateData.displayName = `${firstName} ${lastName}`;
            if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
            if (gender) updateData.gender = gender;
            if (email) updateData.email = email;
            if (role) updateData.role = role;
            if (preferredLanguage) updateData.preferredLanguage = preferredLanguage;
            if (notificationPreferences) updateData.notificationPreferences = notificationPreferences;

            await authService.updateUser(user.uid, updateData);
            
            Alert.alert(
                'Success!',
                'Your profile has been updated successfully.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const genderOptions = ['Male', 'Female', 'Other'];
    const languageOptions = ['English', 'Chichewa', 'French', 'Portuguese', 'Other'];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainContent}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <FontAwesome name="arrow-left" size={20} color="#4CAF50" />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <View style={{ width: 60 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Basic Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Basic Information</Text>
                        
                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <Text style={styles.inputLabel}>First Name *</Text>
                                <TextInput
                                    style={[styles.input, errors.firstName && styles.inputError]}
                                    placeholder="Enter your first name"
                                    placeholderTextColor="#999"
                                    value={firstName}
                                    onChangeText={setFirstName}
                                />
                                {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                            </View>
                            <View style={styles.halfInput}>
                                <Text style={styles.inputLabel}>Last Name *</Text>
                                <TextInput
                                    style={[styles.input, errors.lastName && styles.inputError]}
                                    placeholder="Enter your last name"
                                    placeholderTextColor="#999"
                                    value={lastName}
                                    onChangeText={setLastName}
                                />
                                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                            </View>
                        </View>

                        <Text style={styles.inputLabel}>Date of Birth *</Text>
                        <DatePickerField
                            value={dateOfBirth}
                            onChange={setDateOfBirth}
                            error={errors.dateOfBirth}
                            minimumDate={new Date(1900, 0, 1)}
                        />

                        <Text style={styles.inputLabel}>Gender *</Text>
                        <View style={styles.optionsContainer}>
                            {genderOptions.map(option => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.optionButton, gender === option && styles.optionButtonActive]}
                                    onPress={() => setGender(option)}
                                >
                                    <FontAwesome 
                                        name={option === 'Male' ? 'mars' : option === 'Female' ? 'venus' : 'genderless'} 
                                        size={16} 
                                        color={gender === option ? '#FFFFFF' : '#666'} 
                                    />
                                    <Text style={[styles.optionButtonText, gender === option && styles.optionButtonTextActive]}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}

                        <Text style={styles.inputLabel}>Email Address *</Text>
                        <TextInput
                            style={[styles.input, errors.email && styles.inputError]}
                            placeholder="Enter your email address"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

                        <Text style={styles.inputLabel}>Role</Text>
                        <TextInput
                            style={[styles.input, errors.role && styles.inputError]}
                            placeholder="Enter your role (e.g., System Administrator)"
                            placeholderTextColor="#999"
                            value={role}
                            onChangeText={setRole}
                        />
                        {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
                    </View>

                    {/* Preferences */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Preferences</Text>
                        
                        <Text style={styles.inputLabel}>Preferred Language</Text>
                        <View style={styles.optionsContainer}>
                            {languageOptions.map(option => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.optionButton, preferredLanguage === option && styles.optionButtonActive]}
                                    onPress={() => setPreferredLanguage(option)}
                                >
                                    <Text style={[styles.optionButtonText, preferredLanguage === option && styles.optionButtonTextActive]}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Notification Preferences</Text>
                        <View style={styles.preferencesContainer}>
                            <TouchableOpacity
                                style={styles.preferenceItem}
                                onPress={() => setNotificationPreferences(prev => ({ ...prev, email: !prev.email }))}
                            >
                                <FontAwesome 
                                    name={notificationPreferences.email ? 'check-square-o' : 'square-o'} 
                                    size={20} 
                                    color={notificationPreferences.email ? '#4CAF50' : '#666'} 
                                />
                                <Text style={styles.preferenceText}>Email Notifications</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.preferenceItem}
                                onPress={() => setNotificationPreferences(prev => ({ ...prev, sms: !prev.sms }))}
                            >
                                <FontAwesome 
                                    name={notificationPreferences.sms ? 'check-square-o' : 'square-o'} 
                                    size={20} 
                                    color={notificationPreferences.sms ? '#4CAF50' : '#666'} 
                                />
                                <Text style={styles.preferenceText}>SMS Notifications</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.preferenceItem}
                                onPress={() => setNotificationPreferences(prev => ({ ...prev, push: !prev.push }))}
                            >
                                <FontAwesome 
                                    name={notificationPreferences.push ? 'check-square-o' : 'square-o'} 
                                    size={20} 
                                    color={notificationPreferences.push ? '#4CAF50' : '#666'} 
                                />
                                <Text style={styles.preferenceText}>Push Notifications</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <FontAwesome name="save" size={16} color="#FFFFFF" />
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    mainContent: {
        flex: 1,
        maxWidth: maxWidth,
        alignSelf: 'center',
        width: '100%',
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
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 16,
        color: '#4CAF50',
        marginLeft: 8,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        // paddingTop: 20, // Removed to eliminate extra gap
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#000',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: 16,
    },
    inputError: {
        borderColor: '#FF3B30',
    },
    multilineInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    errorText: {
        fontSize: 12,
        color: '#FF3B30',
        marginTop: -12,
        marginBottom: 16,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    optionButtonActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    optionButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    optionButtonTextActive: {
        color: '#FFFFFF',
    },
    preferencesContainer: {
        gap: 12,
    },
    preferenceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    preferenceText: {
        fontSize: 16,
        color: '#000',
    },
    buttonContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    saveButtonDisabled: {
        backgroundColor: '#CCC',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#4CAF50',
        marginTop: 16,
    },
}); 