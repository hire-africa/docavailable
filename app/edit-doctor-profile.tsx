import { authService } from '@/services/authService';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;
const isLargeScreen = width > 768;

// Extended doctor data interface for complete profile
interface CompleteDoctorData {
    uid: string;
    email: string;
    displayName: string;
    userType: 'patient' | 'doctor' | 'admin';
    firstName?: string;
    lastName?: string;
    specialization?: string;
    licenseNumber?: string;
    experience?: number;
    education?: string;
    certifications?: string[];
    bio?: string;
    languages?: string[];
    consultationFee?: number;
    availability?: {
        monday?: { start: string; end: string };
        tuesday?: { start: string; end: string };
        wednesday?: { start: string; end: string };
        thursday?: { start: string; end: string };
        friday?: { start: string; end: string };
        saturday?: { start: string; end: string };
        sunday?: { start: string; end: string };
    };
    rating?: number;
    totalReviews?: number;
    status?: string;
    createdAt: Date;
    updatedAt: Date;
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

export default function EditDoctorProfile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [completeDoctorData, setCompleteDoctorData] = useState<CompleteDoctorData | null>(null);
    
    // Basic Information
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    
    // Professional Information
    const [specialization, setSpecialization] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [experience, setExperience] = useState('');
    const [education, setEducation] = useState('');
    const [certifications, setCertifications] = useState('');
    const [bio, setBio] = useState('');
    const [languages, setLanguages] = useState('');
    const [consultationFee, setConsultationFee] = useState('');
    
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
                const completeData = await authService.getUserById(user.uid) as CompleteDoctorData;
                console.log('EditProfile: Complete user data fetched:', completeData);
                setCompleteDoctorData(completeData);
                
                if (completeData) {
                    // Load all existing user data
                    setFirstName(completeData.firstName || '');
                    setLastName(completeData.lastName || '');
                    setEmail(completeData.email || user?.email || '');
                    setSpecialization(completeData.specialization || '');
                    setLicenseNumber(completeData.licenseNumber || '');
                    setExperience(completeData.experience?.toString() || '');
                    setEducation(completeData.education || '');
                    setCertifications(completeData.certifications?.join(', ') || '');
                    setBio(completeData.bio || '');
                    setLanguages(completeData.languages?.join(', ') || '');
                    setConsultationFee(completeData.consultationFee?.toString() || '');
                    
                    // Log the loaded data for debugging
                    console.log('EditProfile: Loaded user data:', {
                        firstName: completeData.firstName,
                        lastName: completeData.lastName,
                        email: completeData.email,
                        specialization: completeData.specialization,
                        licenseNumber: completeData.licenseNumber,
                        experience: completeData.experience,
                        education: completeData.education,
                        certifications: completeData.certifications,
                        bio: completeData.bio,
                        languages: completeData.languages,
                        consultationFee: completeData.consultationFee,
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
        if (!email.includes('@')) {
            newErrors.email = 'Please enter a valid email address.';
            isValid = false;
        }
        if (consultationFee && !isNaN(parseInt(consultationFee))) {
            newErrors.consultationFee = 'Please enter a valid consultation fee.';
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
            if (email) updateData.email = email;
            if (specialization) updateData.specialization = specialization;
            if (licenseNumber) updateData.licenseNumber = licenseNumber;
            if (experience && !isNaN(parseInt(experience))) updateData.experience = parseInt(experience);
            if (education) updateData.education = education;
            if (certifications && certifications.trim()) {
                updateData.certifications = certifications.split(',').map(c => c.trim()).filter(c => c.length > 0);
            }
            if (bio) updateData.bio = bio;
            if (languages && languages.trim()) {
                updateData.languages = languages.split(',').map(l => l.trim()).filter(l => l.length > 0);
            }
            if (consultationFee && !isNaN(parseInt(consultationFee))) updateData.consultationFee = parseInt(consultationFee);

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

                    {/* Professional Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Professional Information</Text>
                        
                        <Text style={styles.inputLabel}>Specialization *</Text>
                        <TextInput
                            style={[styles.input, errors.specialization && styles.inputError]}
                            placeholder="Enter your specialization"
                            placeholderTextColor="#999"
                            value={specialization}
                            onChangeText={setSpecialization}
                        />
                        {errors.specialization && <Text style={styles.errorText}>{errors.specialization}</Text>}

                        <Text style={styles.inputLabel}>License Number</Text>
                        <TextInput
                            style={[styles.input, errors.licenseNumber && styles.inputError]}
                            placeholder="Enter your license number"
                            placeholderTextColor="#999"
                            value={licenseNumber}
                            onChangeText={setLicenseNumber}
                        />
                        {errors.licenseNumber && <Text style={styles.errorText}>{errors.licenseNumber}</Text>}

                        <Text style={styles.inputLabel}>Experience</Text>
                        <TextInput
                            style={[styles.input, errors.experience && styles.inputError]}
                            placeholder="Enter your experience"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={experience}
                            onChangeText={setExperience}
                        />
                        {errors.experience && <Text style={styles.errorText}>{errors.experience}</Text>}

                        <Text style={styles.inputLabel}>Education</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            placeholder="Enter your education"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                            value={education}
                            onChangeText={setEducation}
                        />

                        <Text style={styles.inputLabel}>Certifications</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            placeholder="Enter your certifications"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                            value={certifications}
                            onChangeText={setCertifications}
                        />

                        <Text style={styles.inputLabel}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            placeholder="Enter your bio"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                            value={bio}
                            onChangeText={setBio}
                        />

                        <Text style={styles.inputLabel}>Languages</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            placeholder="Enter your languages"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                            value={languages}
                            onChangeText={setLanguages}
                        />
                    </View>

                    {/* Consultation Fee */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Consultation Fee</Text>
                        
                        <Text style={styles.inputLabel}>Consultation Fee</Text>
                        <TextInput
                            style={[styles.input, errors.consultationFee && styles.inputError]}
                            placeholder="Enter your consultation fee"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={consultationFee}
                            onChangeText={setConsultationFee}
                        />
                        {errors.consultationFee && <Text style={styles.errorText}>{errors.consultationFee}</Text>}
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