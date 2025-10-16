import authService from '@/services/authService';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import MultipleLanguagePicker from '../components/MultipleLanguagePicker';
import MultipleSpecializationPicker from '../components/MultipleSpecializationPicker';
import ProfilePicturePicker from '../components/ProfilePicturePicker';
import { navigateToLogin } from '../utils/navigationUtils';
import { createFieldRefs, scrollToFirstError } from '../utils/scrollToError';

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
    languagesSpoken: string[];
    setLanguagesSpoken: (languages: string[]) => void;
    acceptPolicies: boolean;
    setAcceptPolicies: (accept: boolean) => void;
    errors: any;
    fieldRefs: any;
}

interface Step2Props {
    nationalIdPassport: string | null;
    setNationalIdPassport: (uri: string | null) => void;
    highestMedicalCertificate: string | null;
    setHighestMedicalCertificate: (uri: string | null) => void;
    specialistCertificate: string | null;
    setSpecialistCertificate: (uri: string | null) => void;
    isUploading: boolean;
    errors: any;
    fieldRefs: any;
}

interface Step3Props {
    email: string;
    verificationCode: string;
    setVerificationCode: (code: string) => void;
    isVerifying: boolean;
    onResendCode: () => void;
    errors: any;
    fieldRefs: any;
}

// Step 1 Component: Personal and Professional Information
const Step1: React.FC<Step1Props> = ({
    firstName, setFirstName, surname, setSurname,
    profilePicture, setProfilePicture,
    dob, setDob, gender, setGender,
    email, setEmail, password, setPassword, yearsOfExperience, setYearsOfExperience,
    specializations, setSpecializations,
    professionalBio, setProfessionalBio, country, setCountry, city, setCity,
    languagesSpoken, setLanguagesSpoken, acceptPolicies, setAcceptPolicies, errors, fieldRefs,
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
                            ref={fieldRefs.firstName}
                            style={[styles.input, errors.firstName && styles.inputError]}
                            placeholder="First name"
                            placeholderTextColor="#999"
                            value={firstName}
                            onChangeText={setFirstName}
                            numberOfLines={1}
                        />
                        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={styles.inputLabel}>Surname</Text>
                        <TextInput
                            ref={fieldRefs.surname}
                            style={[styles.input, errors.surname && styles.inputError]}
                            placeholder="Surname"
                            placeholderTextColor="#999"
                            value={surname}
                            onChangeText={setSurname}
                            numberOfLines={1}
                        />
                        {errors.surname && <Text style={styles.errorText}>{errors.surname}</Text>}
                    </View>
                </View>

                <Text style={styles.inputLabel}>Date of Birth</Text>
                <DatePickerField
                    ref={fieldRefs.dob}
                    value={dob}
                    onChange={setDob}
                    error={errors.dob}
                    minimumDate={new Date(1900, 0, 1)}
                />

                <Text style={styles.inputLabel}>Gender</Text>
                <View ref={fieldRefs.gender} style={styles.genderContainer}>
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
                    ref={fieldRefs.yearsOfExperience}
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
                    ref={fieldRefs.professionalBio}
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
                    ref={fieldRefs.email}
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
                    ref={fieldRefs.password}
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
                <Text style={styles.sectionLabel}>Languages Spoken</Text>
                <Text style={styles.inputLabel}>Languages you can communicate in</Text>
                <MultipleLanguagePicker
                    selectedLanguages={languagesSpoken}
                    onLanguagesChange={setLanguagesSpoken}
                    error={errors.languagesSpoken}
                    maxSelections={5}
                />
            </View>

            <View style={styles.formSection}>
                <LocationPicker
                    country={country}
                    setCountry={setCountry}
                    city={city}
                    setCity={setCity}
                    errors={errors}
                    fieldRefs={fieldRefs}
                />
            </View>

            <View style={styles.formSection}>
                <View style={styles.policyContainer}>
                    <TouchableOpacity
                        ref={fieldRefs.acceptPolicies}
                        style={styles.checkboxContainer}
                        onPress={() => setAcceptPolicies(!acceptPolicies)}
                    >
                        <View style={[styles.checkbox, acceptPolicies && styles.checkboxChecked]}>
                            {acceptPolicies && <FontAwesome name="check" size={12} color="#FFFFFF" />}
                        </View>
                        <Text style={styles.policyText}>
                            I accept the{' '}
                            <Text style={styles.policyLink}>Platform Terms of Service</Text>
                            {' '}and{' '}
                            <Text style={styles.policyLink}>Privacy Policy</Text>
                        </Text>
                    </TouchableOpacity>
                    {errors.acceptPolicies && <Text style={styles.errorText}>{errors.acceptPolicies}</Text>}
                </View>
            </View>
        </ScrollView>
    );
};

// Step 2 Component: Document Upload
const Step2: React.FC<Step2Props> = ({
    nationalIdPassport,
    setNationalIdPassport,
    highestMedicalCertificate,
    setHighestMedicalCertificate,
    specialistCertificate,
    setSpecialistCertificate,
    isUploading,
    errors,
    fieldRefs,
}) => {
    const handleFileUpload = async (type: 'nationalIdPassport' | 'highestMedicalCertificate' | 'specialistCertificate', setter: (uri: string | null) => void) => {
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

    const handleCameraCapture = async (type: 'nationalIdPassport' | 'highestMedicalCertificate' | 'specialistCertificate', setter: (uri: string | null) => void) => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Sorry, we need camera permissions to take photos!');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1.0, // No compression - maximum quality
            });

            if (!result.canceled && result.assets[0]) {
                setter(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        }
    };

    const showUploadOptions = (type: 'nationalIdPassport' | 'highestMedicalCertificate' | 'specialistCertificate', setter: (uri: string | null) => void) => {
        Alert.alert(
            'Upload Document',
            'Choose how you want to upload your document',
            [
                {
                    text: 'Camera',
                    onPress: () => handleCameraCapture(type, setter),
                },
                {
                    text: 'Photo Library',
                    onPress: () => handleFileUpload(type, setter),
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.stepHeader}>
                <FontAwesome name="file-text" size={40} color="#4CAF50" />
                <Text style={styles.stepTitle}>Required Documents</Text>
                <Text style={styles.stepSubtitle}>Upload your credentials</Text>
                <Text style={styles.uploadInstruction}>
                    Tap any upload button to choose between camera or photo library
                </Text>
            </View>

            <View style={styles.formSection}>
                <View style={styles.documentUpload}>
                    <Text style={styles.documentLabel}>National ID / Passport *</Text>
                    <TouchableOpacity
                        ref={fieldRefs?.nationalIdPassport}
                        style={[styles.uploadButton, nationalIdPassport && styles.uploadButtonSuccess]}
                        onPress={() => showUploadOptions('nationalIdPassport', setNationalIdPassport)}
                        disabled={isUploading}
                    >
                        <View style={styles.uploadIconContainer}>
                            <FontAwesome
                                name={nationalIdPassport ? "check-circle" : "camera"}
                                size={20}
                                color={nationalIdPassport ? "#4CAF50" : "#666"}
                            />
                            <FontAwesome
                                name={nationalIdPassport ? "check-circle" : "photo"}
                                size={20}
                                color={nationalIdPassport ? "#4CAF50" : "#666"}
                                style={{ marginLeft: 8 }}
                            />
                        </View>
                        <Text style={styles.uploadButtonText}>
                            {nationalIdPassport ? 'Document uploaded' : 'Upload National ID or Passport'}
                        </Text>
                    </TouchableOpacity>
                    {errors.nationalIdPassport && <Text style={styles.errorText}>{errors.nationalIdPassport}</Text>}
                </View>

                <View style={styles.documentUpload}>
                    <Text style={styles.documentLabel}>Highest Medical Certificate *</Text>
                    <TouchableOpacity
                        ref={fieldRefs?.highestMedicalCertificate}
                        style={[styles.uploadButton, highestMedicalCertificate && styles.uploadButtonSuccess]}
                        onPress={() => showUploadOptions('highestMedicalCertificate', setHighestMedicalCertificate)}
                        disabled={isUploading}
                    >
                        <View style={styles.uploadIconContainer}>
                            <FontAwesome
                                name={highestMedicalCertificate ? "check-circle" : "camera"}
                                size={20}
                                color={highestMedicalCertificate ? "#4CAF50" : "#666"}
                            />
                            <FontAwesome
                                name={highestMedicalCertificate ? "check-circle" : "photo"}
                                size={20}
                                color={highestMedicalCertificate ? "#4CAF50" : "#666"}
                                style={{ marginLeft: 8 }}
                            />
                        </View>
                        <Text style={styles.uploadButtonText}>
                            {highestMedicalCertificate ? 'Document uploaded' : 'Upload Highest Medical Certificate'}
                        </Text>
                    </TouchableOpacity>
                    {errors.highestMedicalCertificate && <Text style={styles.errorText}>{errors.highestMedicalCertificate}</Text>}
                </View>

                <View style={styles.documentUpload}>
                    <Text style={styles.documentLabel}>Specialist Certificate (Optional)</Text>
                    <TouchableOpacity
                        style={[styles.uploadButton, specialistCertificate && styles.uploadButtonSuccess]}
                        onPress={() => showUploadOptions('specialistCertificate', setSpecialistCertificate)}
                        disabled={isUploading}
                    >
                        <View style={styles.uploadIconContainer}>
                            <FontAwesome
                                name={specialistCertificate ? "check-circle" : "camera"}
                                size={20}
                                color={specialistCertificate ? "#4CAF50" : "#666"}
                            />
                            <FontAwesome
                                name={specialistCertificate ? "check-circle" : "photo"}
                                size={20}
                                color={specialistCertificate ? "#4CAF50" : "#666"}
                                style={{ marginLeft: 8 }}
                            />
                        </View>
                        <Text style={styles.uploadButtonText}>
                            {specialistCertificate ? 'Document uploaded' : 'Upload Specialist Certificate'}
                        </Text>
                    </TouchableOpacity>
                    {errors.specialistCertificate && <Text style={styles.errorText}>{errors.specialistCertificate}</Text>}
                </View>
            </View>
        </ScrollView>
    );
};

// Step 3 Component: Email Verification
const Step3: React.FC<Step3Props> = ({
    email,
    verificationCode,
    setVerificationCode,
    isVerifying,
    onResendCode,
    errors,
    fieldRefs,
}) => {
    return (
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.stepHeader}>
                <FontAwesome name="envelope" size={32} color="#4CAF50" />
                <Text style={styles.stepTitle}>Email Verification</Text>
                <Text style={styles.stepSubtitle}>Verify your email address to complete registration</Text>
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Verification Code</Text>
                <Text style={styles.verificationDescription}>
                    We've sent a verification code to{' '}
                    <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
                
                <Text style={styles.inputLabel}>Enter Verification Code</Text>
                <TextInput
                    ref={fieldRefs.verificationCode}
                    style={[styles.input, errors.verificationCode && styles.inputError]}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#999"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="numeric"
                    maxLength={6}
                    autoFocus
                />
                {errors.verificationCode && <Text style={styles.errorText}>{errors.verificationCode}</Text>}

                <TouchableOpacity
                    style={styles.resendButton}
                    onPress={onResendCode}
                    disabled={isVerifying}
                >
                    <FontAwesome name="refresh" size={16} color="#4CAF50" />
                    <Text style={styles.resendButtonText}>Resend Code</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
                <View style={styles.verificationNote}>
                    <FontAwesome name="info-circle" size={16} color="#666" />
                    <Text style={styles.verificationNoteText}>
                        Check your email inbox and spam folder. The code expires in 10 minutes.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
};

// Main Component: Doctor Sign-Up Page
export default function DoctorSignUp() {
    const { googleData, userType, source } = useLocalSearchParams<{
        googleData?: string;
        userType?: string;
        source?: string;
    }>();
    
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    // Create refs for scrolling to errors
    const scrollViewRef = useRef<ScrollView>(null);
    const fieldRefs = createFieldRefs([
        'firstName', 'surname', 'dob', 'gender', 'email', 'password', 
        'yearsOfExperience', 'specializations', 'professionalBio', 'country', 'city', 
        'languagesSpoken', 'acceptPolicies', 'nationalIdPassport', 'highestMedicalCertificate',
        'verificationCode'
    ]);
    
    // Pre-fill form with Google data if available
    useEffect(() => {
        if (googleData && source === 'google') {
            try {
                const parsedGoogleData = JSON.parse(googleData);
                console.log('🔐 Doctor Signup: Pre-filling form with Google data:', parsedGoogleData);
                
                // Pre-fill form fields with Google data
                if (parsedGoogleData.name) {
                    const nameParts = parsedGoogleData.name.split(' ');
                    setFirstName(nameParts[0] || '');
                    setSurname(nameParts.slice(1).join(' ') || '');
                }
                if (parsedGoogleData.email) {
                    setEmail(parsedGoogleData.email);
                }
                if (parsedGoogleData.profile_picture) {
                    setProfilePicture(parsedGoogleData.profile_picture);
                }
                
                console.log('🔐 Doctor Signup: Form pre-filled successfully');
            } catch (error) {
                console.error('🔐 Doctor Signup: Error parsing Google data:', error);
            }
        }
    }, [googleData, source]);

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

    // Step 1 additional state
    const [languagesSpoken, setLanguagesSpoken] = useState<string[]>([]);
    const [acceptPolicies, setAcceptPolicies] = useState(false);

    // Step 2 state
    const [nationalIdPassport, setNationalIdPassport] = useState<string | null>(null);
    const [highestMedicalCertificate, setHighestMedicalCertificate] = useState<string | null>(null);
    const [specialistCertificate, setSpecialistCertificate] = useState<string | null>(null);

    // Step 3 state
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [isSendingVerification, setIsSendingVerification] = useState(false);

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

        if (languagesSpoken.length === 0) {
            newErrors.languagesSpoken = 'At least one language is required.';
        }

        if (!acceptPolicies) {
            newErrors.acceptPolicies = 'You must accept the platform policies.';
        }

        setErrors(newErrors);
        
        // Scroll to first error if validation fails
        if (Object.keys(newErrors).length > 0) {
            setTimeout(() => {
                scrollToFirstError(scrollViewRef, newErrors, fieldRefs);
            }, 100);
        }
        
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors: any = {};

        if (!nationalIdPassport) {
            newErrors.nationalIdPassport = 'National ID or Passport is required.';
        }

        if (!highestMedicalCertificate) {
            newErrors.highestMedicalCertificate = 'Highest Medical Certificate is required.';
        }

        setErrors(newErrors);
        
        // Scroll to first error if validation fails
        if (Object.keys(newErrors).length > 0) {
            setTimeout(() => {
                scrollToFirstError(scrollViewRef, newErrors, fieldRefs);
            }, 100);
        }
        
        return Object.keys(newErrors).length === 0;
    };

    const validateStep3 = () => {
        const newErrors: any = {};
        let isValid = true;

        if (!verificationCode.trim()) {
            newErrors.verificationCode = 'Please enter the verification code.';
            isValid = false;
        } else if (verificationCode.length !== 6) {
            newErrors.verificationCode = 'Verification code must be 6 digits.';
            isValid = false;
        }

        setErrors(newErrors);
        
        // Scroll to first error if validation fails
        if (!isValid) {
            setTimeout(() => {
                scrollToFirstError(scrollViewRef, newErrors, fieldRefs);
            }, 100);
        }
        
        return isValid;
    };

    const sendVerificationCode = async () => {
        try {
            setIsResending(true);
            const response = await authService.sendVerificationCode(email);
            
            if (response.success) {
                // No modal - just proceed silently
                console.log('Verification code sent successfully');
            } else {
                throw new Error(response.message || 'Failed to send verification code');
            }
        } catch (error) {
            console.error('Error sending verification code:', error);
            Alert.alert('Error', 'Failed to send verification code. Please try again.');
            throw error; // Re-throw the error so handleContinue knows it failed
        } finally {
            setIsResending(false);
        }
    };

    const verifyEmail = async () => {
        try {
            setIsVerifying(true);
            
            console.log('DoctorSignup: Verifying email with code:', {
                email: email,
                verificationCode: verificationCode,
                codeLength: verificationCode.length,
                codeType: typeof verificationCode,
                codeTrimmed: verificationCode.trim(),
                codeTrimmedLength: verificationCode.trim().length
            });
            
            // Add a small delay to prevent rapid successive calls
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const response = await authService.verifyEmail(email, verificationCode);
            
            if (response.success) {
                return true;
            } else {
                throw new Error(response.message || 'Invalid verification code');
            }
        } catch (error) {
            console.error('Error verifying email:', error);
            Alert.alert('Error', error.message || 'Invalid verification code. Please try again.');
            return false;
        } finally {
            setIsVerifying(false);
        }
    };

    const handleContinue = async () => {
        if (step === 1) {
            if (validateStep1()) {
                setStep(2);
            }
        } else if (step === 2) {
            if (validateStep2()) {
                // Send verification code when moving to step 3
                try {
                    setIsSendingVerification(true);
                    await sendVerificationCode();
                    setStep(3);
                } catch (error) {
                    console.error('Failed to send verification code:', error);
                    // Don't move to step 3 if email sending fails
                } finally {
                    setIsSendingVerification(false);
                }
            }
        } else if (step === 3) {
            if (validateStep3()) {
                const isVerified = await verifyEmail();
                if (isVerified) {
                await handleSignUp();
                }
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
            formData.append('languages_spoken', JSON.stringify(languagesSpoken));

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
            if (nationalIdPassport) {
                try {
                    const response = await fetch(nationalIdPassport);
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
                    formData.append('national_id_passport', base64);
                } catch (conversionError) {
                    console.warn('National ID/Passport conversion failed:', conversionError);
                    throw new Error('Failed to process National ID/Passport. Please try again.');
                }
            }
            if (highestMedicalCertificate) {
                try {
                    const response = await fetch(highestMedicalCertificate);
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
                    formData.append('highest_medical_certificate', base64);
                } catch (conversionError) {
                    console.warn('Highest Medical Certificate conversion failed:', conversionError);
                    throw new Error('Failed to process Highest Medical Certificate. Please try again.');
                }
            }
            if (specialistCertificate) {
                try {
                    const response = await fetch(specialistCertificate);
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
                    formData.append('specialist_certificate', base64);
                } catch (conversionError) {
                    console.warn('Specialist Certificate conversion failed:', conversionError);
                    // Specialist Certificate is optional, so we can continue without it
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
                        languagesSpoken={languagesSpoken}
                        setLanguagesSpoken={setLanguagesSpoken}
                        acceptPolicies={acceptPolicies}
                        setAcceptPolicies={setAcceptPolicies}
                        errors={errors}
                        fieldRefs={fieldRefs}
                    />
                );
            case 2:
                return (
                    <Step2 
                        nationalIdPassport={nationalIdPassport}
                        setNationalIdPassport={setNationalIdPassport}
                        highestMedicalCertificate={highestMedicalCertificate}
                        setHighestMedicalCertificate={setHighestMedicalCertificate}
                        specialistCertificate={specialistCertificate}
                        setSpecialistCertificate={setSpecialistCertificate}
                        isUploading={isUploading}
                        errors={errors}
                        fieldRefs={fieldRefs}
                    />
                );
            case 3:
                return (
                    <Step3
                        email={email}
                        verificationCode={verificationCode}
                        setVerificationCode={setVerificationCode}
                        isVerifying={isVerifying}
                        onResendCode={sendVerificationCode}
                        errors={errors}
                        fieldRefs={fieldRefs}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView ref={scrollViewRef} style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* Modern Header with Gradient */}
                <View style={styles.modernHeader}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity 
                            style={styles.modernBackButton}
                            onPress={() => navigateToLogin({ userType: 'doctor' })}
                        >
                            <View style={styles.backButtonIcon}>
                                <FontAwesome name="arrow-left" size={16} color="#FFFFFF" />
                            </View>
                            <Text style={styles.modernBackText}>Back to Login</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.headerTitleContainer}>
                            <View style={styles.titleIconContainer}>
                                <FontAwesome name="user-md" size={24} color="#FFFFFF" />
                            </View>
                            <Text style={styles.modernHeaderText}>Create Doctor Account</Text>
                        </View>
                    </View>
                </View>
                
                <View style={styles.container}>
                
                <View style={styles.modernProgressContainer}>
                    <View style={styles.modernProgressWrapper}>
                        <Text style={styles.modernProgressTitle}>Registration Progress</Text>
                        <View style={styles.modernProgressBar}>
                            <View style={[styles.modernProgressStep, step >= 1 && styles.modernProgressStepActive]}>
                                <View style={[styles.progressStepIcon, step >= 1 && styles.progressStepIconActive]}>
                                    <FontAwesome name={step >= 1 ? "check" : "user-md"} size={12} color={step >= 1 ? "#FFFFFF" : "#94A3B8"} />
                                </View>
                                <Text style={[styles.progressStepLabel, step >= 1 && styles.progressStepLabelActive]}>Professional Info</Text>
                            </View>
                            <View style={[styles.progressConnector, step >= 2 && styles.progressConnectorActive]} />
                            <View style={[styles.modernProgressStep, step >= 2 && styles.modernProgressStepActive]}>
                                <View style={[styles.progressStepIcon, step >= 2 && styles.progressStepIconActive]}>
                                    <FontAwesome name={step >= 2 ? "check" : "certificate"} size={12} color={step >= 2 ? "#FFFFFF" : "#94A3B8"} />
                                </View>
                                <Text style={[styles.progressStepLabel, step >= 2 && styles.progressStepLabelActive]}>Verification</Text>
                            </View>
                            <View style={[styles.progressConnector, step >= 3 && styles.progressConnectorActive]} />
                            <View style={[styles.modernProgressStep, step >= 3 && styles.modernProgressStepActive]}>
                                <View style={[styles.progressStepIcon, step >= 3 && styles.progressStepIconActive]}>
                                    <FontAwesome name={step >= 3 ? "check" : "envelope"} size={12} color={step >= 3 ? "#FFFFFF" : "#94A3B8"} />
                                </View>
                                <Text style={[styles.progressStepLabel, step >= 3 && styles.progressStepLabelActive]}>Email Confirm</Text>
                            </View>
                        </View>
                    </View>
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
                        style={[styles.continueButton, (loading || isSendingVerification) && styles.continueButtonDisabled]}
                        onPress={handleContinue}
                        disabled={loading || isSendingVerification}
                    >
                        {loading ? (
                            <>
                                <ActivityIndicator color="#FFFFFF" size="small" />
                                <Text style={[styles.continueButtonText, { marginLeft: 8 }]}>
                                    {step === 3 ? 'Creating Account...' : 'Processing...'}
                                </Text>
                            </>
                        ) : isSendingVerification ? (
                            <>
                                <ActivityIndicator color="#FFFFFF" size="small" />
                                <Text style={[styles.continueButtonText, { marginLeft: 8 }]}>
                                    Sending verification code...
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.continueButtonText}>
                                    {step === 3 ? 'Complete Registration' : 'Continue'}
                                </Text>
                                <Text style={styles.arrowIcon}>→</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
                
            </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Update the styles object
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContainer: {
        flex: 1,
    },
    // Compact Modern Header Styles
    modernHeader: {
        background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)',
        paddingTop: Platform.OS === 'ios' ? 0 : 10,
        paddingBottom: 16,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#4CAF50',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
        ...(Platform.OS === 'web' && {
            background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)',
        }),
        backgroundColor: '#4CAF50', // Fallback for non-web platforms
    },
    headerContent: {
        paddingHorizontal: isWeb ? 40 : 24,
        paddingTop: 12,
    },
    modernBackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: 12,
    },
    backButtonIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    modernBackText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    headerTitleContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    titleIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    modernHeaderText: {
        fontSize: isLargeScreen ? 20 : 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
        textAlign: 'center',
    },
    modernHeaderSubtext: {
        fontSize: isLargeScreen ? 13 : 12,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        lineHeight: 16,
        maxWidth: 300,
    },
    container: {
        maxWidth: maxWidth,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: isWeb ? 40 : 24,
        paddingTop: 20,
        paddingBottom: 20,
    },
    // Compact Progress Bar Styles
    modernProgressContainer: {
        marginBottom: 20,
    },
    modernProgressWrapper: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    modernProgressTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 12,
        textAlign: 'center',
    },
    modernProgressBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modernProgressStep: {
        alignItems: 'center',
        flex: 1,
    },
    progressStepIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    modernProgressStepActive: {
        opacity: 1,
    },
    progressStepLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
        textAlign: 'center',
    },
    progressStepLabelActive: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    progressConnector: {
        height: 2,
        flex: 1,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 8,
        marginBottom: 24,
    },
    progressConnectorActive: {
        backgroundColor: '#4CAF50',
    },
    progressStepIconActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
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
        paddingBottom: 16,
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
    uploadInstruction: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
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
    uploadIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 24,
        backgroundColor: '#fff',
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        paddingHorizontal: 20,
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
    backToSignupButton: {
        alignSelf: 'flex-start',
        marginBottom: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#F8F9FA',
    },
    backToSignupText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    policyContainer: {
        marginTop: 16,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        marginRight: 12,
        marginTop: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    policyText: {
        flex: 1,
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    policyLink: {
        color: '#4CAF50',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    verificationDescription: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    emailHighlight: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    resendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    resendButtonText: {
        marginLeft: 8,
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '600',
    },
    verificationNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        backgroundColor: '#F0F8FF',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    verificationNoteText: {
        marginLeft: 12,
        color: '#666',
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    arrowIcon: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
}); 