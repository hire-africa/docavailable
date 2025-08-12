import authService from '@/services/authService';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
    View,
} from 'react-native';
import DatePickerField from '../components/DatePickerField';
import LocationPicker from '../components/LocationPicker';
import MultipleSpecializationPicker from '../components/MultipleSpecializationPicker';
import ProfilePicturePicker from '../components/ProfilePicturePicker';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 1200 : width;
const isLargeScreen = width > 768;

// Define interfaces for props to ensure type safety
interface Step1Props {
    firstName: string;
    setFirstName: (name: string) => void;
    surname: string;
    setSurname: (name: string) => void;
    profilePicture: string | null;
    setProfilePicture: (uri: string | null) => void;
    dob: string;
    setDob: (dob: string) => void;
    gender: string | null;
    setGender: (gender: string) => void;
    email: string;
    setEmail: (email: string) => void;
    password: string;
    setPassword: (password: string) => void;
    yearsOfExperience: string;
    setYearsOfExperience: (years: string) => void;
    specializations: string[];
    setSpecializations: (specializations: string[]) => void;
    professionalBio: string;
    setProfessionalBio: (bio: string) => void;
    country: string;
    setCountry: (country: string) => void;
    city: string;
    setCity: (city: string) => void;
    errors: any;
}

interface Step2Props {
    nationalId: string | null;
    setNationalId: (uri: string | null) => void;
    medicalDegree: string | null;
    setMedicalDegree: (uri: string | null) => void;
    medicalLicence: string | null;
    setMedicalLicence: (uri: string | null) => void;
    isUploading: boolean;
    errors: any;
}

// Step 1 Component: Personal and Professional Information
const Step1: React.FC<Step1Props> = ({
    firstName, setFirstName, surname, setSurname,
    profilePicture, setProfilePicture,
    dob, setDob, gender, setGender,
    email, setEmail, password, setPassword, yearsOfExperience, setYearsOfExperience,
    specializations, setSpecializations,
    professionalBio, setProfessionalBio, country, setCountry, city, setCity, errors,
}) => {
    const genderOptions = ['Male', 'Female', 'Other'];

    return (
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.stepHeader}>
                <FontAwesome name="user-md" size={40} color="#4CAF50" />
                <Text style={styles.stepTitle}>Personal & Professional Info</Text>
                <Text style={styles.stepSubtitle}>Tell us about yourself and your expertise</Text>
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Profile Picture</Text>
                <ProfilePicturePicker
                    imageUri={profilePicture}
                    onImageSelected={setProfilePicture}
                    size={120}
                />
                {errors.profilePicture && <Text style={styles.errorText}>{errors.profilePicture}</Text>}
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Basic Details</Text>
                
                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={styles.inputLabel}>First Name</Text>
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
                        <Text style={styles.inputLabel}>Surname</Text>
                        <TextInput
                            style={[styles.input, errors.surname && styles.inputError]}
                            placeholder="Enter your surname"
                            placeholderTextColor="#999"
                            value={surname}
                            onChangeText={setSurname}
                        />
                        {errors.surname && <Text style={styles.errorText}>{errors.surname}</Text>}
                    </View>
                </View>

                <Text style={styles.inputLabel}>Date of Birth</Text>
                <DatePickerField
                    value={dob}
                    onChange={setDob}
                    error={errors.dob}
                    minimumDate={new Date(1900, 0, 1)}
                />

                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderContainer}>
                    {genderOptions.map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.genderOption,
                                gender === option.toLowerCase() && styles.genderOptionSelected,
                            ]}
                            onPress={() => setGender(option.toLowerCase())}
                        >
                            <Text style={[
                                styles.genderOptionText,
                                gender === option.toLowerCase() && styles.genderOptionTextSelected,
                            ]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Professional Details</Text>

                <Text style={styles.inputLabel}>Years of Experience</Text>
                <TextInput
                    style={[styles.input, errors.yearsOfExperience && styles.inputError]}
                    placeholder="Enter years of experience"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={yearsOfExperience}
                    onChangeText={setYearsOfExperience}
                />
                {errors.yearsOfExperience && <Text style={styles.errorText}>{errors.yearsOfExperience}</Text>}

                <Text style={styles.inputLabel}>Specializations</Text>
                <MultipleSpecializationPicker
                    selectedSpecializations={specializations}
                    onSpecializationsChange={setSpecializations}
                    error={errors.specializations}
                    maxSelections={3}
                />

                <Text style={styles.inputLabel}>Professional Bio</Text>
                <TextInput
                    style={[styles.textArea, errors.professionalBio && styles.inputError]}
                    placeholder="Tell us about your professional background"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    value={professionalBio}
                    onChangeText={setProfessionalBio}
                />
                {errors.professionalBio && <Text style={styles.errorText}>{errors.professionalBio}</Text>}
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Account Details</Text>
                
                <Text style={styles.inputLabel}>Email Address</Text>
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
                
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    placeholder="Create a secure password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <View style={styles.formSection}>
                <LocationPicker
                    country={country}
                    setCountry={setCountry}
                    city={city}
                    setCity={setCity}
                    errors={errors}
                />
            </View>
        </ScrollView>
    );
};

// Step 2 Component: Document Upload
const Step2: React.FC<Step2Props> = ({
    nationalId,
    setNationalId,
    medicalDegree,
    setMedicalDegree,
    medicalLicence,
    setMedicalLicence,
    isUploading,
    errors,
}) => {
    const handleFileUpload = async (type: 'nationalId' | 'medicalDegree' | 'medicalLicence', setter: (uri: string | null) => void) => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1.0, // No compression - maximum quality
            });

            if (!result.canceled && result.assets[0]) {
                setter(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            Alert.alert('Error', 'Failed to upload file. Please try again.');
        }
    };

    return (
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.stepHeader}>
                <FontAwesome name="file-text" size={40} color="#4CAF50" />
                <Text style={styles.stepTitle}>Required Documents</Text>
                <Text style={styles.stepSubtitle}>Upload your credentials</Text>
            </View>

            <View style={styles.formSection}>
                <View style={styles.documentUpload}>
                    <Text style={styles.documentLabel}>National ID *</Text>
                    <TouchableOpacity
                        style={[styles.uploadButton, nationalId && styles.uploadButtonSuccess]}
                        onPress={() => handleFileUpload('nationalId', setNationalId)}
                        disabled={isUploading}
                    >
                        <FontAwesome
                            name={nationalId ? "check-circle" : "upload"}
                            size={24}
                            color={nationalId ? "#4CAF50" : "#666"}
                        />
                        <Text style={styles.uploadButtonText}>
                            {nationalId ? 'Document uploaded' : 'Upload National ID'}
                        </Text>
                    </TouchableOpacity>
                    {errors.nationalId && <Text style={styles.errorText}>{errors.nationalId}</Text>}
                </View>

                <View style={styles.documentUpload}>
                    <Text style={styles.documentLabel}>Medical Degree *</Text>
                    <TouchableOpacity
                        style={[styles.uploadButton, medicalDegree && styles.uploadButtonSuccess]}
                        onPress={() => handleFileUpload('medicalDegree', setMedicalDegree)}
                        disabled={isUploading}
                    >
                        <FontAwesome
                            name={medicalDegree ? "check-circle" : "upload"}
                            size={24}
                            color={medicalDegree ? "#4CAF50" : "#666"}
                        />
                        <Text style={styles.uploadButtonText}>
                            {medicalDegree ? 'Document uploaded' : 'Upload Medical Degree'}
                        </Text>
                    </TouchableOpacity>
                    {errors.medicalDegree && <Text style={styles.errorText}>{errors.medicalDegree}</Text>}
                </View>

                <View style={styles.documentUpload}>
                    <Text style={styles.documentLabel}>Medical License (Optional)</Text>
                    <TouchableOpacity
                        style={[styles.uploadButton, medicalLicence && styles.uploadButtonSuccess]}
                        onPress={() => handleFileUpload('medicalLicence', setMedicalLicence)}
                        disabled={isUploading}
                    >
                        <FontAwesome
                            name={medicalLicence ? "check-circle" : "upload"}
                            size={24}
                            color={medicalLicence ? "#4CAF50" : "#666"}
                        />
                        <Text style={styles.uploadButtonText}>
                            {medicalLicence ? 'Document uploaded' : 'Upload Medical License'}
                        </Text>
                    </TouchableOpacity>
                    {errors.medicalLicence && <Text style={styles.errorText}>{errors.medicalLicence}</Text>}
                </View>
            </View>
        </ScrollView>
    );
};

// Main Component: Doctor Sign-Up Page
export default function DoctorSignUp() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Step 1 state
    const [firstName, setFirstName] = useState('');
    const [surname, setSurname] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [yearsOfExperience, setYearsOfExperience] = useState('');
    const [specializations, setSpecializations] = useState<string[]>([]);
    const [professionalBio, setProfessionalBio] = useState('');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);

    // Step 2 state
    const [nationalId, setNationalId] = useState<string | null>(null);
    const [medicalDegree, setMedicalDegree] = useState<string | null>(null);
    const [medicalLicence, setMedicalLicence] = useState<string | null>(null);

    const [errors, setErrors] = useState<any>({});

    const validateStep1 = () => {
        const newErrors: any = {};
        
        if (!firstName.trim()) {
            newErrors.firstName = 'First name is required.';
        } else if (firstName.length < 3) {
            newErrors.firstName = 'First name must be at least 3 characters.';
        }
        
        if (!surname.trim()) {
            newErrors.surname = 'Surname is required.';
        } else if (surname.length < 3) {
            newErrors.surname = 'Surname must be at least 3 characters.';
        }
        
        if (!dob.trim()) {
            newErrors.dob = 'Date of Birth is required.';
        }
        
        if (!gender) {
            newErrors.gender = 'Please select a gender.';
        }
        
        if (!email.trim()) {
            newErrors.email = 'Email is required.';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email.';
        }
        
        if (!password) {
            newErrors.password = 'Password is required.';
        } else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters.';
        }
        
        if (specializations.length === 0) {
            newErrors.specializations = 'At least one specialization is required.';
        }
        
        if (!yearsOfExperience.trim()) {
            newErrors.yearsOfExperience = 'Years of experience is required.';
        } else if (isNaN(Number(yearsOfExperience)) || Number(yearsOfExperience) < 0) {
            newErrors.yearsOfExperience = 'Please enter a valid number of years.';
        }
        
        if (!professionalBio.trim()) {
            newErrors.professionalBio = 'Professional bio is required.';
        } else if (professionalBio.length < 10) {
            newErrors.professionalBio = 'Bio must be at least 10 characters.';
        }

        if (!country.trim()) {
            newErrors.country = 'Country is required.';
        }

        if (!city.trim()) {
            newErrors.city = 'City is required.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors: any = {};

        if (!nationalId) {
            newErrors.nationalId = 'National ID is required.';
        }

        if (!medicalDegree) {
            newErrors.medicalDegree = 'Medical degree is required.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleContinue = async () => {
        if (step === 1) {
            if (validateStep1()) {
                setStep(2);
            }
        } else if (step === 2) {
            if (validateStep2()) {
                await handleSignUp();
            }
        }
    };

    const handleSignUp = async () => {
        setLoading(true);
        let registrationSuccessful = false;
        
        try {
            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('surname', surname);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('password_confirmation', password);
            formData.append('dob', dob);
            formData.append('gender', gender || '');
            formData.append('country', country);
            formData.append('city', city);
            formData.append('user_type', 'doctor');
            formData.append('specializations', JSON.stringify(specializations));
            formData.append('years_of_experience', yearsOfExperience.toString());
            formData.append('bio', professionalBio);

            if (profilePicture) {
                // Convert profile picture to base64 with timeout
                try {
                    const response = await fetch(profilePicture);
                    const blob = await response.blob();
                    const base64 = await Promise.race([
                        new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64String = reader.result as string;
                                resolve(base64String);
                            };
                            reader.readAsDataURL(blob);
                        }),
                        new Promise<string>((_, reject) => 
                            setTimeout(() => reject(new Error('Profile picture conversion timeout')), 10000)
                        )
                    ]);
                    formData.append('profile_picture', base64);
                } catch (conversionError) {
                    console.warn('Profile picture conversion failed, proceeding without it:', conversionError);
                    // Continue without profile picture if conversion fails
                }
            }
            if (nationalId) {
                try {
                    const response = await fetch(nationalId);
                    const blob = await response.blob();
                    const base64 = await Promise.race([
                        new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64String = reader.result as string;
                                resolve(base64String);
                            };
                            reader.readAsDataURL(blob);
                        }),
                        new Promise<string>((_, reject) => 
                            setTimeout(() => reject(new Error('Document conversion timeout')), 10000)
                        )
                    ]);
                    formData.append('national_id', base64);
                } catch (conversionError) {
                    console.warn('National ID conversion failed:', conversionError);
                    throw new Error('Failed to process National ID. Please try again.');
                }
            }
            if (medicalDegree) {
                try {
                    const response = await fetch(medicalDegree);
                    const blob = await response.blob();
                    const base64 = await Promise.race([
                        new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64String = reader.result as string;
                                resolve(base64String);
                            };
                            reader.readAsDataURL(blob);
                        }),
                        new Promise<string>((_, reject) => 
                            setTimeout(() => reject(new Error('Document conversion timeout')), 10000)
                        )
                    ]);
                    formData.append('medical_degree', base64);
                } catch (conversionError) {
                    console.warn('Medical degree conversion failed:', conversionError);
                    throw new Error('Failed to process Medical Degree. Please try again.');
                }
            }
            if (medicalLicence) {
                try {
                    const response = await fetch(medicalLicence);
                    const blob = await response.blob();
                    const base64 = await Promise.race([
                        new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64String = reader.result as string;
                                resolve(base64String);
                            };
                            reader.readAsDataURL(blob);
                        }),
                        new Promise<string>((_, reject) => 
                            setTimeout(() => reject(new Error('Document conversion timeout')), 10000)
                        )
                    ]);
                    formData.append('medical_licence', base64);
                } catch (conversionError) {
                    console.warn('Medical licence conversion failed:', conversionError);
                    // Medical licence is optional, so we can continue without it
                }
            }

            // console.log('DoctorSignup: Starting registration with form data');
            const response = await authService.signUp(formData);
            
            // console.log('DoctorSignup: Registration response:', {
            //   success: response.data?.user ? 'yes' : 'no',
            //   userType: response.data?.user?.user_type,
            //   userId: response.data?.user?.id,
            //   status: response.data?.user?.status
            // });
            
            // For doctors, we expect a successful registration but no token
            if (response.data?.user?.user_type === 'doctor') {
                // console.log('DoctorSignup: Doctor registration successful, redirecting to pending approval');
                registrationSuccessful = true;
                // Redirect to pending approval page
                router.replace('/pending-approval' as any);
                return;
            }
            
            // Only throw error if we get an unexpected response
            throw new Error('Unexpected response from registration');
        } catch (error: any) {
            console.error('DoctorSignup: Registration error:', error);
            
            // Only show errors if registration was not successful
            if (!registrationSuccessful) {
                let errorMessage = 'Registration failed. Please try again.';
                
                // Handle timeout errors
                if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                    errorMessage = 'Registration timed out. Your account may have been created successfully. Please try logging in.';
                    Alert.alert('Timeout', errorMessage, [
                        {
                            text: 'Try Login',
                            onPress: () => router.replace('/login')
                        },
                        {
                            text: 'OK',
                            style: 'cancel'
                        }
                    ]);
                    return;
                }
                
                // Parse validation errors
                if (error.message && error.message.includes('Validation failed:')) {
                    const validationErrors = error.message
                        .replace('Validation failed:\n', '')
                        .split('\n')
                        .reduce((acc: any, curr: string) => {
                            const [field, message] = curr.split(': ');
                            acc[field] = message;
                            return acc;
                        }, {});
                    setErrors(validationErrors);
                } else {
                    Alert.alert(
                        'Registration Error',
                        errorMessage || 'An error occurred during registration. Please try again.'
                    );
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <Step1 
                        firstName={firstName}
                        setFirstName={setFirstName}
                        surname={surname}
                        setSurname={setSurname}
                        profilePicture={profilePicture}
                        setProfilePicture={setProfilePicture}
                        dob={dob}
                        setDob={setDob}
                        gender={gender}
                        setGender={setGender}
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        yearsOfExperience={yearsOfExperience}
                        setYearsOfExperience={setYearsOfExperience}
                        specializations={specializations}
                        setSpecializations={setSpecializations}
                        professionalBio={professionalBio}
                        setProfessionalBio={setProfessionalBio}
                        country={country}
                        setCountry={setCountry}
                        city={city}
                        setCity={setCity}
                        errors={errors}
                    />
                );
            case 2:
                return (
                    <Step2 
                        nationalId={nationalId}
                        setNationalId={setNationalId}
                        medicalDegree={medicalDegree}
                        setMedicalDegree={setMedicalDegree}
                        medicalLicence={medicalLicence}
                        setMedicalLicence={setMedicalLicence}
                        isUploading={isUploading}
                        errors={errors}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerText}>Create Doctor Account</Text>
                    <Text style={styles.headerSubtext}>Join our healthcare platform as a medical professional</Text>
                </View>
                
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]} />
                        <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]} />
                    </View>
                    <Text style={styles.progressText}>Step {step} of 2</Text>
                </View>
                
                {renderStep()}
                
                <View style={styles.footer}>
                    {step > 1 && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => setStep(step - 1)}
                            disabled={loading}
                        >
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                        style={[styles.continueButton, loading && styles.continueButtonDisabled]}
                        onPress={handleContinue}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.continueButtonText}>
                                {step === 2 ? 'Complete Registration' : 'Continue'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

// Update the styles object
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    container: {
        flex: 1,
        maxWidth: maxWidth,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: isWeb ? 40 : 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    headerText: {
        fontSize: isLargeScreen ? 32 : 28,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
        textAlign: 'center',
    },
    headerSubtext: {
        fontSize: isLargeScreen ? 18 : 16,
        color: '#666',
        textAlign: 'center',
    },
    progressContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    progressBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 300,
        marginBottom: 10,
    },
    progressStep: {
        flex: 1,
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        marginHorizontal: 4,
    },
    progressStepActive: {
        backgroundColor: '#4CAF50',
    },
    progressText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    stepContainer: {
        flex: 1,
    },
    stepHeader: {
        alignItems: 'center',
        marginBottom: 30,
    },
    stepTitle: {
        fontSize: isLargeScreen ? 24 : 22,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    stepSubtitle: {
        fontSize: isLargeScreen ? 16 : 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    formSection: {
        marginBottom: 30,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
            web: {
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            },
        }),
    },
    sectionLabel: {
        fontSize: isLargeScreen ? 18 : 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginLeft: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    input: {
        height: 56,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderRadius: 16,
        paddingHorizontal: 20,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
        color: '#000',
    },
    inputError: {
        borderColor: '#FF3B30',
    },
    textArea: {
        height: 120,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingTop: 16,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
        color: '#000',
        textAlignVertical: 'top',
    },
    genderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    genderOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        minWidth: 80,
        justifyContent: 'center',
    },
    genderOptionSelected: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    genderOptionText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    genderOptionTextSelected: {
        color: '#FFFFFF',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '500',
    },
    documentUpload: {
        marginBottom: 24,
    },
    documentLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 10,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
    },
    uploadButtonSuccess: {
        backgroundColor: '#E8F5E9',
        borderColor: '#4CAF50',
        borderStyle: 'solid',
    },
    uploadButtonText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        paddingHorizontal: 20,
        marginTop: 20,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
    },
    backButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    continueButton: {
        flex: 1,
        marginLeft: 20,
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        shadowColor: '#4CAF50',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    continueButtonDisabled: {
        backgroundColor: '#B0B0B0',
        shadowOpacity: 0,
        elevation: 0,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
}); 