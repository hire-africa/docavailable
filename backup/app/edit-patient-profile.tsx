import { SimpleIcons } from '../components/SimpleIcons';
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
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;
const isLargeScreen = width > 768;

// Extended user data interface for complete profile
interface CompleteUserData {
    uid: string;
    email: string;
    displayName: string;
    userType: 'patient' | 'doctor' | 'admin';
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    healthHistory?: string;
    allergies?: string;
    medications?: string;
    bloodType?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;
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

// Utility to auto-format date as MM/DD/YYYY
function formatDateInput(value: string) {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);
    let formatted = cleaned;
    if (cleaned.length > 4) {
        formatted = `${cleaned.slice(0,2)}/${cleaned.slice(2,4)}/${cleaned.slice(4)}`;
    } else if (cleaned.length > 2) {
        formatted = `${cleaned.slice(0,2)}/${cleaned.slice(2)}`;
    }
    return formatted;
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

export default function EditPatientProfile() {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [completeUserData, setCompleteUserData] = useState<CompleteUserData | null>(null);
    
    // Basic Information
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    
    // Contact Information
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');
    
    // Health Information
    const [healthHistory, setHealthHistory] = useState('');
    const [allergies, setAllergies] = useState('');
    const [medications, setMedications] = useState('');
    const [bloodType, setBloodType] = useState<string | null>(null);
    
    // Emergency Contact
    const [emergencyContactName, setEmergencyContactName] = useState('');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
    const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('');
    
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
                console.log('EditProfile: Fetching complete user data for:', user.uid);
                const completeData = await firestoreService.getUserById(user.uid) as CompleteUserData;
                console.log('EditProfile: Complete user data fetched:', completeData);
                setCompleteUserData(completeData);
                
                if (completeData) {
                    // Load all existing user data
                    setFirstName(completeData.firstName || '');
                    setLastName(completeData.lastName || '');
                    setDateOfBirth(completeData.dateOfBirth || '');
                    setGender(completeData.gender || null);
                    setEmail(completeData.email || user?.email || '');
                    setPhoneNumber(completeData.phoneNumber || '');
                    setAddress(completeData.address || '');
                    setCity(completeData.city || '');
                    setState(completeData.state || '');
                    setZipCode(completeData.zipCode || '');
                    setHealthHistory(completeData.healthHistory || '');
                    setAllergies(completeData.allergies || '');
                    setMedications(completeData.medications || '');
                    setBloodType(completeData.bloodType || null);
                    setEmergencyContactName(completeData.emergencyContactName || '');
                    setEmergencyContactPhone(completeData.emergencyContactPhone || '');
                    setEmergencyContactRelationship(completeData.emergencyContactRelationship || '');
                    setPreferredLanguage(completeData.preferredLanguage || null);
                    setNotificationPreferences(completeData.notificationPreferences || {
                        email: true,
                        sms: true,
                        push: true
                    });
                    
                    // Log the loaded data for debugging
                    console.log('EditProfile: Loaded user data:', {
                        firstName: completeData.firstName,
                        lastName: completeData.lastName,
                        dateOfBirth: completeData.dateOfBirth,
                        gender: completeData.gender,
                        email: completeData.email,
                        phoneNumber: completeData.phoneNumber,
                        address: completeData.address,
                        city: completeData.city,
                        state: completeData.state,
                        zipCode: completeData.zipCode,
                        healthHistory: completeData.healthHistory,
                        allergies: completeData.allergies,
                        medications: completeData.medications,
                        bloodType: completeData.bloodType,
                        emergencyContactName: completeData.emergencyContactName,
                        emergencyContactPhone: completeData.emergencyContactPhone,
                        emergencyContactRelationship: completeData.emergencyContactRelationship,
                        preferredLanguage: completeData.preferredLanguage
                    });
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
        if (phoneNumber && phoneNumber.replace(/\D/g, '').length < 10) {
            newErrors.phoneNumber = 'Please enter a valid phone number.';
            isValid = false;
        }
        if (emergencyContactName && !emergencyContactPhone) {
            newErrors.emergencyContactPhone = 'Please enter emergency contact phone number.';
            isValid = false;
        }
        if (emergencyContactPhone && !emergencyContactName) {
            newErrors.emergencyContactName = 'Please enter emergency contact name.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setSaving(true);
        try {
            const updatedData = {
                firstName,
                lastName,
                displayName: `${firstName} ${lastName}`,
                dateOfBirth,
                gender: gender || undefined,
                email,
                phoneNumber,
                address,
                city,
                state,
                zipCode,
                healthHistory,
                allergies,
                medications,
                bloodType: bloodType || undefined,
                emergencyContactName,
                emergencyContactPhone,
                emergencyContactRelationship,
                preferredLanguage: preferredLanguage || undefined,
                notificationPreferences,
                updatedAt: new Date()
            };

            await firestoreService.updateUser(user.uid, updatedData);
            
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
    const bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const languageOptions = ['English', 'Chichewa', 'French', 'Portuguese', 'Other'];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainContent}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <SimpleIcons.FontAwesome.arrow-left />
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
                        <TextInput
                            style={[styles.input, errors.dateOfBirth && styles.inputError]}
                            placeholder="MM/DD/YYYY"
                            placeholderTextColor="#999"
                            value={dateOfBirth}
                            onChangeText={text => setDateOfBirth(formatDateInput(text))}
                        />
                        {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}

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
                    </View>

                    {/* Contact Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Contact Information</Text>
                        
                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <TextInput
                            style={[styles.input, errors.phoneNumber && styles.inputError]}
                            placeholder="Enter your phone number"
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={text => setPhoneNumber(formatPhoneInput(text))}
                        />
                        {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}

                        <Text style={styles.inputLabel}>Address</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            placeholder="Enter your street address"
                            placeholderTextColor="#999"
                            value={address}
                            onChangeText={setAddress}
                        />

                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <Text style={styles.inputLabel}>City</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your city"
                                    placeholderTextColor="#999"
                                    value={city}
                                    onChangeText={setCity}
                                />
                            </View>
                            <View style={styles.halfInput}>
                                <Text style={styles.inputLabel}>State/Province</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your state"
                                    placeholderTextColor="#999"
                                    value={state}
                                    onChangeText={setState}
                                />
                            </View>
                        </View>

                        <Text style={styles.inputLabel}>ZIP/Postal Code</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your ZIP code"
                            placeholderTextColor="#999"
                            value={zipCode}
                            onChangeText={setZipCode}
                        />
                    </View>

                    {/* Health Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Health Information</Text>
                        
                        <Text style={styles.inputLabel}>Health History</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            placeholder="Any medical conditions, surgeries, or relevant health information..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                            value={healthHistory}
                            onChangeText={setHealthHistory}
                        />

                        <Text style={styles.inputLabel}>Allergies</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            placeholder="List any allergies (medications, foods, environmental)..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                            value={allergies}
                            onChangeText={setAllergies}
                        />

                        <Text style={styles.inputLabel}>Current Medications</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            placeholder="List current medications and dosages..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                            value={medications}
                            onChangeText={setMedications}
                        />

                        <Text style={styles.inputLabel}>Blood Type</Text>
                        <View style={styles.optionsContainer}>
                            {bloodTypeOptions.map(option => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.optionButton, bloodType === option && styles.optionButtonActive]}
                                    onPress={() => setBloodType(option)}
                                >
                                    <Text style={[styles.optionButtonText, bloodType === option && styles.optionButtonTextActive]}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Emergency Contact */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Emergency Contact</Text>
                        
                        <Text style={styles.inputLabel}>Emergency Contact Name</Text>
                        <TextInput
                            style={[styles.input, errors.emergencyContactName && styles.inputError]}
                            placeholder="Enter emergency contact name"
                            placeholderTextColor="#999"
                            value={emergencyContactName}
                            onChangeText={setEmergencyContactName}
                        />
                        {errors.emergencyContactName && <Text style={styles.errorText}>{errors.emergencyContactName}</Text>}

                        <Text style={styles.inputLabel}>Emergency Contact Phone</Text>
                        <TextInput
                            style={[styles.input, errors.emergencyContactPhone && styles.inputError]}
                            placeholder="Enter emergency contact phone"
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                            value={emergencyContactPhone}
                            onChangeText={text => setEmergencyContactPhone(formatPhoneInput(text))}
                        />
                        {errors.emergencyContactPhone && <Text style={styles.errorText}>{errors.emergencyContactPhone}</Text>}

                        <Text style={styles.inputLabel}>Relationship</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Spouse, Parent, Friend"
                            placeholderTextColor="#999"
                            value={emergencyContactRelationship}
                            onChangeText={setEmergencyContactRelationship}
                        />
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
                                <SimpleIcons.FontAwesome.save />
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
        paddingTop: 20,
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