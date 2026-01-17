import authService from '@/services/authService';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Linking,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CountryCodeSelector from '../components/CountryCodeSelector';
import DatePickerField from '../components/DatePickerField';
import LocationPicker from '../components/LocationPicker';
import ProfilePicturePicker from '../components/ProfilePicturePicker';
import ProgressIndicator from '../components/ProgressIndicator';
import customAlertService from '../services/customAlertService';
import { efasheService } from '../services/efasheService';
import EnhancedValidation from '../utils/enhancedValidation';
import SignUpErrorHandler from '../utils/errorHandler';
import { navigateToLogin } from '../utils/navigationUtils';
import { CountryCode, getDefaultCountryCode, normalizePhoneToE164 } from '../utils/phoneUtils';
import { createFieldRefs, scrollToFirstError } from '../utils/scrollToError';
import ValidationUtils from '../utils/validationUtils';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 1200 : width;
const isLargeScreen = width > 768;

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
    authMode: 'email' | 'phone';
    setAuthMode: (mode: 'email' | 'phone') => void;
    email: string;
    setEmail: (email: string) => void;
    phone: string;
    setPhone: (phone: string) => void;
    countryCode: CountryCode;
    setCountryCode: (code: CountryCode) => void;
    password: string;
    setPassword: (password: string) => void;
    country: string;
    setCountry: (country: string) => void;
    city: string;
    setCity: (city: string) => void;
    acceptPolicies: boolean;
    setAcceptPolicies: (accept: boolean) => void;
    idType: string | null;
    setIdType: (type: string | null) => void;
    idDocument: string | null;
    setIdDocument: (uri: string | null) => void;
    errors: any;
    fieldRefs: any;
    scrollViewRef: React.RefObject<ScrollView>;
}

interface Step3Props {
    email: string;
    phone: string;
    authMode: 'email' | 'phone';
    verificationCode: string;
    setVerificationCode: (code: string) => void;
    isVerifying: boolean;
    onResendCode: () => void;
    errors: any;
    fieldRefs: any;
}

const Step1: React.FC<Step1Props> = ({
    firstName,
    setFirstName,
    surname,
    setSurname,
    profilePicture,
    setProfilePicture,
    dob,
    setDob,
    gender,
    setGender,
    authMode,
    setAuthMode,
    email,
    setEmail,
    phone,
    setPhone,
    countryCode,
    setCountryCode,
    password,
    setPassword,
    country,
    setCountry,
    city,
    setCity,
    acceptPolicies,
    setAcceptPolicies,
    idType,
    setIdType,
    idDocument,
    setIdDocument,
    errors,
    fieldRefs,
    scrollViewRef,
}) => {
    const genderOptions = ['Male', 'Female', 'Other'];
    const [isUploading, setIsUploading] = useState(false);

    const handleIdUpload = async () => {
        console.log('handleIdUpload called, idType:', idType);
        if (!idType) {
            // Use enhanced validation to scroll to ID type field
            const validationConfig = EnhancedValidation.createConfig(scrollViewRef, fieldRefs, {
                showAlert: true,
                alertTitle: 'Select ID Type'
            });
            EnhancedValidation.showValidationError('idType', 'Please select an ID type first.', validationConfig);
            return;
        }

        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                customAlertService.error('Permission Required', 'Camera roll permissions are needed to upload ID documents.');
                return;
            }

            setIsUploading(true);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setIdDocument(result.assets[0].uri);
                customAlertService.success('Success', 'ID document uploaded successfully!');
            }
        } catch (error) {
            console.error('Error uploading ID:', error);
            customAlertService.error('Upload Error', 'Failed to upload ID document. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleTakePhoto = async () => {
        console.log('handleTakePhoto called, idType:', idType);
        if (!idType) {
            // Use enhanced validation to scroll to ID type field
            const validationConfig = EnhancedValidation.createConfig(scrollViewRef, fieldRefs, {
                showAlert: true,
                alertTitle: 'Select ID Type'
            });
            EnhancedValidation.showValidationError('idType', 'Please select an ID type first.', validationConfig);
            return;
        }

        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                customAlertService.error('Permission Required', 'Camera permissions are needed to take photos.');
                return;
            }

            setIsUploading(true);
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setIdDocument(result.assets[0].uri);
                customAlertService.success('Success', 'ID photo captured successfully!');
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            customAlertService.error('Camera Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.stepHeader}>
                <FontAwesome name="user" size={32} color="#4CAF50" />
                <Text style={styles.stepTitle}>Personal Information</Text>
                <Text style={styles.stepSubtitle}>Tell us about yourself</Text>
            </View>

            <View ref={fieldRefs.profilePicture} style={styles.formSection}>
                <Text style={styles.sectionLabel}>Profile Picture</Text>
                <ProfilePicturePicker
                    imageUri={profilePicture}
                    onImageSelected={setProfilePicture}
                    size={120}
                />
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Basic Details</Text>

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={styles.inputLabel}>First Name</Text>
                        <TextInput
                            ref={fieldRefs.firstName}
                            style={[styles.input, errors?.firstName && styles.inputError]}
                            placeholder="First name"
                            placeholderTextColor="#999"
                            value={firstName}
                            onChangeText={setFirstName}
                            numberOfLines={1}
                        />
                        {errors?.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
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
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Gender</Text>
                <View ref={fieldRefs.gender} style={styles.genderContainer}>
                    {genderOptions.map(option => (
                        <TouchableOpacity
                            key={option}
                            style={[styles.genderButton, gender === option && styles.genderButtonActive]}
                            onPress={() => setGender(option)}
                        >
                            <FontAwesome name="user" size={24} color={gender === option ? "#4CAF50" : "#666"} />
                            <Text style={[styles.genderButtonText, gender === option && styles.genderButtonTextActive]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Account Details</Text>

                {/* Auth Mode Toggle */}
                <View style={styles.authModeToggle}>
                    <TouchableOpacity
                        style={[styles.toggleButton, authMode === 'email' && styles.toggleButtonActive]}
                        onPress={() => setAuthMode('email')}
                    >
                        <FontAwesome
                            name="envelope"
                            size={14}
                            color={authMode === 'email' ? '#FFFFFF' : '#666'}
                            style={styles.toggleIcon}
                        />
                        <Text style={[styles.toggleText, authMode === 'email' && styles.toggleTextActive]}>
                            Email
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, authMode === 'phone' && styles.toggleButtonActive]}
                        onPress={() => setAuthMode('phone')}
                    >
                        <FontAwesome
                            name="phone"
                            size={14}
                            color={authMode === 'phone' ? '#FFFFFF' : '#666'}
                            style={styles.toggleIcon}
                        />
                        <Text style={[styles.toggleText, authMode === 'phone' && styles.toggleTextActive]}>
                            Phone
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Email Input (shown when email mode) */}
                {authMode === 'email' && (
                    <>
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
                    </>
                )}

                {/* Phone Input (shown when phone mode) */}
                {authMode === 'phone' && (
                    <>
                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <View style={[styles.phoneInputContainer, errors.phone && styles.inputError]}>
                            <CountryCodeSelector
                                selectedCountry={countryCode}
                                onSelect={setCountryCode}
                                locked={true}
                            />
                            <TextInput
                                ref={fieldRefs.phone}
                                style={[styles.input, styles.phoneInput]}
                                placeholder="Enter your phone number"
                                placeholderTextColor="#999"
                                keyboardType="phone-pad"
                                autoCapitalize="none"
                                value={phone}
                                onChangeText={setPhone}
                            />
                        </View>
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </>
                )}

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
                <Text style={styles.sectionLabel}>Identity Verification (Optional)</Text>
                <Text style={styles.uploadDescription}>
                    Verify your identity for enhanced security. This step is optional and can be completed later.
                </Text>

                <Text style={styles.inputLabel}>Choose ID Type</Text>
                <View ref={fieldRefs.idType} style={styles.idOptionsContainer}>
                    <TouchableOpacity
                        style={[styles.idOption, idType === 'drivers' && styles.idOptionActive]}
                        onPress={() => {
                            console.log('Selected ID type: drivers');
                            setIdType('drivers');
                        }}
                    >
                        <View style={[styles.idOptionIcon, idType === 'drivers' && styles.idOptionIconActive]}>
                            <FontAwesome name="car" size={24} color={idType === 'drivers' ? "#4CAF50" : "#666"} />
                        </View>
                        <Text style={[styles.idOptionText, idType === 'drivers' && styles.idOptionTextActive]}>
                            Driver&apos;s License
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.idOption, idType === 'passport' && styles.idOptionActive]}
                        onPress={() => {
                            console.log('Selected ID type: passport');
                            setIdType('passport');
                        }}
                    >
                        <View style={[styles.idOptionIcon, idType === 'passport' && styles.idOptionIconActive]}>
                            <FontAwesome name="id-card" size={24} color={idType === 'passport' ? "#4CAF50" : "#666"} />
                        </View>
                        <Text style={[styles.idOptionText, idType === 'passport' && styles.idOptionTextActive]}>
                            Passport
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.idOption, idType === 'national' && styles.idOptionActive]}
                        onPress={() => {
                            console.log('Selected ID type: national');
                            setIdType('national');
                        }}
                    >
                        <View style={[styles.idOptionIcon, idType === 'national' && styles.idOptionIconActive]}>
                            <FontAwesome name="flag" size={24} color={idType === 'national' ? "#4CAF50" : "#666"} />
                        </View>
                        <Text style={[styles.idOptionText, idType === 'national' && styles.idOptionTextActive]}>
                            National ID
                        </Text>
                    </TouchableOpacity>
                </View>

                {idType && (
                    <View style={styles.modernUploadSection}>
                        <Text style={styles.modernUploadTitle}>Upload Your {idType === 'drivers' ? 'Driver\'s License' : idType === 'passport' ? 'Passport' : 'National ID'}</Text>

                        {idDocument ? (
                            <View style={styles.modernUploadedContainer}>
                                <View style={styles.modernUploadedImageContainer}>
                                    <Image source={{ uri: idDocument }} style={styles.modernUploadedImage} />
                                    <View style={styles.modernUploadSuccessOverlay}>
                                        <FontAwesome name="check-circle" size={24} color="#4CAF50" />
                                        <Text style={styles.modernUploadedText}>Document Uploaded Successfully</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.modernChangeButton} onPress={() => setIdDocument(null)}>
                                    <FontAwesome name="edit" size={16} color="#4CAF50" />
                                    <Text style={styles.modernChangeText}>Change Photo</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.modernUploadOptions}>
                                <TouchableOpacity
                                    style={styles.modernUploadButton}
                                    onPress={handleTakePhoto}
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <FontAwesome name="camera" size={20} color="#FFFFFF" />
                                            <Text style={styles.modernUploadButtonText}>Take Photo</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modernUploadButtonSecondary}
                                    onPress={handleIdUpload}
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <ActivityIndicator size="small" color="#4CAF50" />
                                    ) : (
                                        <>
                                            <FontAwesome name="upload" size={20} color="#4CAF50" />
                                            <Text style={styles.modernUploadButtonSecondaryText}>Choose from Gallery</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {idDocument && (
                            <View style={styles.uploadSuccessNote}>
                                <FontAwesome name="check-circle" size={16} color="#4CAF50" />
                                <Text style={styles.uploadSuccessText}>
                                    ID document uploaded successfully. This step is optional.
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.skipNote}>
                    <FontAwesome name="info-circle" size={16} color="#666" />
                    <Text style={styles.skipNoteText}>
                        Don't have your ID handy? You can skip this step and update it later in your profile settings.
                    </Text>
                </View>

                <View style={styles.securityNote}>
                    <FontAwesome name="lock" size={20} color="#4CAF50" />
                    <Text style={styles.securityNoteText}>
                        Your information is encrypted and secure. We follow strict privacy guidelines.
                    </Text>
                </View>
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
                            <Text
                                style={styles.policyLink}
                                onPress={() => Linking.openURL('https://docavailable.com/privacy.html')}
                            >
                                Privacy Policy
                            </Text>
                        </Text>
                    </TouchableOpacity>
                    {errors.acceptPolicies && <Text style={styles.errorText}>{errors.acceptPolicies}</Text>}
                </View>
            </View>
        </ScrollView>
    );
};


// Step 3 Component: Email Verification
const Step3: React.FC<Step3Props> = ({
    email,
    phone,
    authMode,
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
                <FontAwesome name={authMode === 'email' ? "envelope" : "mobile-phone"} size={32} color="#4CAF50" />
                <Text style={styles.stepTitle}>{authMode === 'email' ? 'Email' : 'Phone'} Verification</Text>
                <Text style={styles.stepSubtitle}>Verify your {authMode === 'email' ? 'email address' : 'phone number'} to complete registration</Text>
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Verification Code</Text>
                <Text style={styles.verificationDescription}>
                    We've sent a verification code to{' '}
                    <Text style={styles.emailHighlight}>{authMode === 'email' ? email : phone}</Text>
                </Text>

                <Text style={styles.inputLabel}>Enter {authMode === 'email' ? 'Email' : 'SMS'} Verification Code</Text>
                <TextInput
                    ref={fieldRefs.verificationCode}
                    style={[styles.input, errors.verificationCode && styles.inputError]}
                    placeholder="Enter code"
                    placeholderTextColor="#999"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="numeric"
                    maxLength={null}
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

export default function PatientSignUp() {
    const { googleData, userType, source } = useLocalSearchParams<{
        googleData?: string;
        userType?: string;
        source?: string;
    }>();

    const [step, setStep] = useState(1);
    const [authMode, setAuthMode] = useState<'email' | 'phone'>('email');
    const [firstName, setFirstName] = useState('');
    const [surname, setSurname] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState<CountryCode>(getDefaultCountryCode());
    const [password, setPassword] = useState('');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [acceptPolicies, setAcceptPolicies] = useState(false);
    const [loading, setLoading] = useState(false);

    // Create refs for scrolling to errors
    const scrollViewRef = useRef<ScrollView>(null);

    // Pre-fill form with Google data if available and check if user exists
    useEffect(() => {
        if (googleData && source === 'google') {
            try {
                const parsedGoogleData = JSON.parse(googleData);
                console.log('🔐 Patient Signup: Pre-filling form with Google data:', parsedGoogleData);

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

                console.log('🔐 Patient Signup: Form pre-filled successfully');

                // Check if user already exists
                checkIfUserExists(parsedGoogleData.email);

            } catch (error) {
                console.error('🔐 Patient Signup: Error parsing Google data:', error);
            }
        }
    }, [googleData, source]);

    // Only check if user already exists if coming from Google OAuth
    useEffect(() => {
        if (googleData && source === 'google') {
            try {
                const parsedGoogleData = JSON.parse(googleData);
                checkIfUserExists(parsedGoogleData.email);
            } catch (error) {
                console.error('🔐 Patient Signup: Error parsing Google data for email check:', error);
            }
        }
    }, [googleData, source]);



    // Check if user already exists using proper endpoint
    const checkIfUserExists = async (email: string) => {
        try {
            console.log('🔐 Patient Signup: Checking if user exists for email:', email);

            // Use dedicated endpoint to check email existence
            const response = await fetch('https://docavailable-3vbdv.ondigitalocean.app/api/auth/check-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            console.log('🔐 Patient Signup: Email check response:', data);

            if (data.exists) {
                console.log('🔐 Patient Signup: User already exists, showing login option');

                customAlertService.confirm(
                    'Account Already Exists',
                    'An account with this email already exists. Would you like to log in instead?',
                    () => {
                        console.log('🔐 Patient Signup: User chose to go to login');
                        router.push('/login');
                    },
                    () => {
                        console.log('🔐 Patient Signup: User chose to stay on signup page');
                    },
                    'Login',
                    'Cancel'
                );
            }
        } catch (error) {
            console.error('🔐 Patient Signup: Error checking user existence:', error);
            // Don't block signup if check fails - let backend handle duplicates
        }
    };
    const fieldRefs = createFieldRefs([
        'firstName', 'surname', 'dob', 'gender', 'email', 'password',
        'country', 'city', 'acceptPolicies', 'verificationCode', 'idType', 'profilePicture'
    ]);

    // ID verification state (formerly Step 2)
    const [idType, setIdType] = useState<string | null>(null);
    const [idDocument, setIdDocument] = useState<string | null>(null);

    // Step 2 state (now email verification)
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [isSendingVerification, setIsSendingVerification] = useState(false);

    const [errors, setErrors] = useState({
        firstName: null,
        surname: null,
        dob: null,
        gender: null,
        email: null,
        password: null,
        country: null,
        city: null,
        acceptPolicies: null,
        verificationCode: null,
    });

    // Pre-fill form with Google user data if available
    useEffect(() => {
        const loadGoogleUserData = async () => {
            try {
                let googleUserData = null;

                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    const stored = sessionStorage.getItem('google_user_data');
                    if (stored) {
                        googleUserData = JSON.parse(stored);
                        // Clear the stored data after reading
                        sessionStorage.removeItem('google_user_data');
                    }
                } else {
                    const stored = await AsyncStorage.getItem('google_user_data');
                    if (stored) {
                        googleUserData = JSON.parse(stored);
                        // Clear the stored data after reading
                        await AsyncStorage.removeItem('google_user_data');
                    }
                }

                if (googleUserData) {
                    console.log('Pre-filling form with Google user data:', googleUserData);
                    setFirstName(googleUserData.first_name || '');
                    setSurname(googleUserData.last_name || '');
                    setEmail(googleUserData.email || '');

                    // Set profile picture if available
                    if (googleUserData.picture) {
                        setProfilePicture(googleUserData.picture);
                    }

                    // Show a message to the user
                    customAlertService.info(
                        'Google Account Detected',
                        'We found your Google account information. Some fields have been pre-filled for you.'
                    );
                }
            } catch (error) {
                console.warn('Could not load Google user data:', error);
            }
        };

        loadGoogleUserData();
    }, []);

    const validateStep1 = () => {
        const formData: any = {
            firstName,
            surname,
            password,
            dateOfBirth: dob,
            gender,
            country,
            city,
            acceptPolicies
        };

        // Add email or phone based on auth mode
        if (authMode === 'email') {
            formData.email = email;
        } else {
            // For phone mode, we'll validate phone separately
            // Backend will enforce its own validation rules
            formData.phone = phone;
        }

        const rules = { ...ValidationUtils.getSignUpRules('patient') };

        // Adjust rules based on auth mode
        if (authMode === 'phone') {
            delete rules.email;
        } else {
            // Email mode: Ensure email is required (already in default rules, but good to be explicit if needed)
        }

        const newErrors = ValidationUtils.validateFields(formData, rules);

        // Additional phone validation in phone mode (basic frontend check)
        if (authMode === 'phone' && !phone) {
            newErrors.phone = 'Phone number is required';
        }

        // Additional validation for profile picture
        if (profilePicture) {
            const fileError = ValidationUtils.validateFileUpload(profilePicture, {
                maxSize: 5 * 1024 * 1024, // 5MB
                allowedTypes: ['image/jpeg', 'image/png', 'image/jpg'],
                required: false
            });
            if (fileError) {
                newErrors.profilePicture = fileError;
            }
        }

        setErrors(newErrors as any);

        // Use enhanced validation for better scrolling
        const validationConfig = EnhancedValidation.createConfig(scrollViewRef, fieldRefs, {
            showAlert: false,
            scrollDelay: 100
        });

        return EnhancedValidation.validateAndScroll(newErrors, validationConfig);
    };

    const validateStep3 = () => {
        const verificationError = ValidationUtils.validateVerificationCode(verificationCode);
        const newErrors = verificationError ? { verificationCode: verificationError } : {};

        setErrors(newErrors as any);

        // Use enhanced validation for better scrolling
        const validationConfig = EnhancedValidation.createConfig(scrollViewRef, fieldRefs, {
            showAlert: false,
            scrollDelay: 100
        });

        return EnhancedValidation.validateAndScroll(newErrors, validationConfig);
    };

    const sendVerificationCode = async () => {
        try {
            setIsResending(true);
            let response;

            if (authMode === 'email') {
                response = await authService.sendVerificationCode(email);
            } else {
                // Phone mode: use Efashe service
                const normalizedPhone = normalizePhoneToE164(phone, countryCode);
                console.log('Sending OTP to:', normalizedPhone);
                const result = await efasheService.sendOtp(normalizedPhone);
                response = { success: true, message: 'OTP sent' }; // Efashe result adapter
                if (!result) throw new Error('Failed to send OTP');
            }

            if (response.success) {
                // No modal - just proceed silently
                console.log('Verification code sent successfully');
            } else {
                throw new Error(response.message || 'Failed to send verification code');
            }
        } catch (error) {
            console.error('Error sending verification code:', error);
            // Scroll to top for general errors
            EnhancedValidation.scrollToTop(scrollViewRef);
            customAlertService.error('Error', 'Failed to send verification code. Please try again.');
            throw error; // Re-throw the error so handleContinue knows it failed
        } finally {
            setIsResending(false);
        }
    };

    const verifyCode = async () => {
        try {
            setIsVerifying(true);

            console.log('PatientSignup: Verifying code:', {
                mode: authMode,
                email: email,
                phone: phone,
                verificationCode: verificationCode
            });

            // Add a small delay to prevent rapid successive calls
            await new Promise(resolve => setTimeout(resolve, 200));

            let response;
            if (authMode === 'email') {
                response = await authService.verifyEmail(email, verificationCode);
            } else {
                const normalizedPhone = normalizePhoneToE164(phone, countryCode);
                const result = await efasheService.verifyOtp(normalizedPhone, verificationCode);
                // Efashe service verifyOtp returns { success: boolean, token?: string, user?: any }
                // We map it to { success, message } style if needed, but the main check is success
                response = result;
            }

            if (response.success) {
                return true;
            } else {
                throw new Error(response.message || 'Invalid verification code');
            }
        } catch (error) {
            console.error('Error verifying email:', error);
            // Scroll to verification code field for verification errors
            EnhancedValidation.scrollToField('verificationCode', scrollViewRef, fieldRefs);
            customAlertService.error('Error', error.message || 'Invalid verification code. Please try again.');
            return false;
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSignUp = async () => {
        setLoading(true);
        let registrationSuccessful = false;

        try {
            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('surname', surname);

            // Send email or phone based on auth mode
            if (authMode === 'email') {
                formData.append('email', email);
            } else {
                // Normalize phone to E.164 format before sending
                const normalizedPhone = normalizePhoneToE164(phone, countryCode);
                formData.append('phone', normalizedPhone);
            }

            formData.append('password', password);
            formData.append('password_confirmation', password);
            formData.append('date_of_birth', dob);
            if (gender && gender.trim()) {
                formData.append('gender', gender.toLowerCase());
            }
            formData.append('country', country);
            formData.append('city', city);
            formData.append('user_type', 'patient');

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

            // Debug logging to see what's being sent
            console.log('PatientSignup: Registration data being sent:');
            console.log('First Name:', firstName);
            console.log('Last Name (surname):', surname);
            console.log('Auth Mode:', authMode);
            if (authMode === 'email') {
                console.log('Email:', email);
            } else {
                console.log('Phone:', normalizePhoneToE164(phone, countryCode));
            }
            console.log('Date of Birth:', dob);
            console.log('Gender:', gender);
            console.log('Country:', country);
            console.log('City:', city);
            console.log('User Type: patient');
            console.log('Profile Picture:', profilePicture ? 'Yes' : 'No');

            const authState = await authService.signUp(formData);

            if (authState.data && authState.data.user) {
                // console.log('PatientSignup: Signup successful, user:', authState.data.user);
                registrationSuccessful = true;

                // Store user type immediately after successful signup for routing
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    try {
                        sessionStorage.setItem('lastSignupUserType', 'patient');
                        sessionStorage.setItem('lastSignupUID', authState.data.user.id.toString());
                        // console.log('PatientSignup: Stored user type and UID for routing');
                    } catch (error) {
                        console.warn('PatientSignup: Could not store user type:', error);
                    }
                }

                // Redirect directly to patient dashboard without alert
                // console.log('PatientSignup: Signup successful, redirecting to patient dashboard');
                router.replace('/patient-dashboard');
            } else {
                throw new Error('User data not received after signup');
            }
        } catch (error: any) {
            // Only show errors if registration was not successful
            if (!registrationSuccessful) {
                SignUpErrorHandler.handleSignUpError(
                    error,
                    (validationErrors) => {
                        // Handle validation errors by setting them in state
                        setErrors(validationErrors as any);
                        // Scroll to first error field
                        setTimeout(() => {
                            scrollToFirstError(scrollViewRef, validationErrors, fieldRefs);
                        }, 100);
                    },
                    () => handleSignUp(), // Retry function
                    () => router.replace('/login') // Login function
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = async () => {
        if (step === 1) {
            if (validateStep1()) {
                // Send verification code when moving to step 2 (formerly step 3)
                try {
                    setIsSendingVerification(true);
                    await sendVerificationCode();
                    setStep(2);
                } catch (error) {
                    console.error('Failed to send verification code:', error);
                    // Don't move to step 2 if email sending fails
                } finally {
                    setIsSendingVerification(false);
                }
            }
        } else if (step === 2) {
            if (validateStep3()) {
                const isVerified = await verifyCode();
                if (isVerified) {
                    handleSignUp();
                }
            }
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
                        authMode={authMode}
                        setAuthMode={setAuthMode}
                        email={email}
                        setEmail={setEmail}
                        phone={phone}
                        setPhone={setPhone}
                        countryCode={countryCode}
                        setCountryCode={setCountryCode}
                        password={password}
                        setPassword={setPassword}
                        country={country}
                        setCountry={setCountry}
                        city={city}
                        setCity={setCity}
                        acceptPolicies={acceptPolicies}
                        setAcceptPolicies={setAcceptPolicies}
                        idType={idType}
                        setIdType={setIdType}
                        idDocument={idDocument}
                        setIdDocument={setIdDocument}
                        errors={errors}
                        fieldRefs={fieldRefs}
                        scrollViewRef={scrollViewRef}
                    />
                );
            case 2:
                return (
                    <Step3
                        email={email}
                        phone={phone}
                        authMode={authMode}
                        verificationCode={verificationCode}
                        setVerificationCode={setVerificationCode}
                        isVerifying={isVerifying}
                        onResendCode={sendVerificationCode}
                        errors={errors}
                        fieldRefs={fieldRefs}
                    />
                );
            default:
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
                        authMode={authMode}
                        setAuthMode={setAuthMode}
                        email={email}
                        setEmail={setEmail}
                        phone={phone}
                        setPhone={setPhone}
                        countryCode={countryCode}
                        setCountryCode={setCountryCode}
                        password={password}
                        setPassword={setPassword}
                        country={country}
                        setCountry={setCountry}
                        city={city}
                        setCity={setCity}
                        acceptPolicies={acceptPolicies}
                        setAcceptPolicies={setAcceptPolicies}
                        idType={idType}
                        setIdType={setIdType}
                        idDocument={idDocument}
                        setIdDocument={setIdDocument}
                        errors={errors}
                        fieldRefs={fieldRefs}
                        scrollViewRef={scrollViewRef}
                    />
                );
        }
    };

    const insets = useSafeAreaInsets();

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollContainer}
                contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 24) }}
                showsVerticalScrollIndicator={false}
            >
                {/* Modern Header with Gradient */}
                <View style={styles.modernHeader}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={styles.modernBackButton}
                            onPress={() => navigateToLogin({ userType: 'patient' })}
                        >
                            <View style={styles.backButtonIcon}>
                                <FontAwesome name="arrow-left" size={16} color="#FFFFFF" />
                            </View>
                            <Text style={styles.modernBackText}>Back to Login</Text>
                        </TouchableOpacity>

                        <View style={styles.headerTitleContainer}>
                            <View style={styles.titleIconContainer}>
                                <FontAwesome name="user-plus" size={24} color="#FFFFFF" />
                            </View>
                            <Text style={styles.modernHeaderText}>Create Patient Account</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.container}>
                    <View style={styles.modernProgressContainer}>
                        <View style={styles.modernProgressWrapper}>
                            <Text style={styles.modernProgressTitle}>Your Progress</Text>
                            <View style={styles.modernProgressBar}>
                                <View style={[styles.modernProgressStep, step >= 1 && styles.modernProgressStepActive]}>
                                    <View style={[styles.progressStepIcon, step >= 1 && styles.progressStepIconActive]}>
                                        <FontAwesome name={step >= 1 ? "check" : "user"} size={12} color={step >= 1 ? "#FFFFFF" : "#94A3B8"} />
                                    </View>
                                    <Text style={[styles.progressStepLabel, step >= 1 && styles.progressStepLabelActive]}>Personal Info</Text>
                                </View>
                                <View style={[styles.progressConnector, step >= 2 && styles.progressConnectorActive]} />
                                <View style={[styles.modernProgressStep, step >= 2 && styles.modernProgressStepActive]}>
                                    <View style={[styles.progressStepIcon, step >= 2 && styles.progressStepIconActive]}>
                                        <FontAwesome name={step >= 2 ? "check" : "envelope"} size={12} color={step >= 2 ? "#FFFFFF" : "#94A3B8"} />
                                    </View>
                                    <Text style={[styles.progressStepLabel, step >= 2 && styles.progressStepLabelActive]}>Verification</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Enhanced Progress Indicator */}
                    <ProgressIndicator
                        steps={[
                            { id: 1, title: 'Personal Information', completed: step > 1, current: step === 1 },
                            { id: 2, title: authMode === 'email' ? 'Email Verification' : 'Phone Verification', completed: step > 2, current: step === 2 }
                        ]}
                        currentStep={step}
                        totalSteps={2}
                        compact={true}
                        style={{ marginVertical: 10 }}
                    />

                    {renderStep()}

                    <View style={styles.buttonContainer}>
                        {step > 1 && (
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setStep(step - 1)}
                                disabled={loading}
                            >
                                <Text style={styles.backButtonText}>←</Text>
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
                                        {step === 2 ? 'Creating Account...' : 'Processing...'}
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
                                        {step === 2 ? 'Create Account' : 'Continue'}
                                    </Text>
                                    <Text style={styles.continueButtonText}>→</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                    <View style={{ height: Math.max(12, insets.bottom) }} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    authModeToggle: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        borderRadius: 25,
        padding: 4,
        marginBottom: 16,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    toggleButtonActive: {
        backgroundColor: '#4CAF50',
    },
    toggleIcon: {
        marginRight: 6,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    toggleTextActive: {
        color: '#FFFFFF',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    phoneInput: {
        flex: 1,
        paddingVertical: 14,
        paddingLeft: 8,
        fontSize: 16,
        color: '#333',
        ...Platform.select({
            android: {
                textAlignVertical: 'center',
            },
        }),
    },
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
        maxWidth: 280,
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
    formSection: {
        marginBottom: 30,
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
        borderColor: '#4CAF50',
    },
    genderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    genderButton: {
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
    genderButtonActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    genderButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
    genderButtonTextActive: {
        color: '#FFFFFF',
    },
    errorText: {
        color: '#4CAF50',
        fontSize: 12,
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '500',
    },
    idOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    idOption: {
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#F8F9FA',
        width: '32%',
        marginHorizontal: 2,
        borderWidth: 2,
        borderColor: 'transparent',
        minHeight: 100,
    },
    idOptionActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    idOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    idOptionIconActive: {
        backgroundColor: '#FFFFFF',
    },
    idOptionText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
    },
    idOptionTextActive: {
        color: '#FFFFFF',
    },
    uploadDescription: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    photoUpload: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 140,
        width: 140,
        borderRadius: 70,
        backgroundColor: '#F8F9FA',
        alignSelf: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
    },
    photoUploadUploading: {
        backgroundColor: '#E0E0E0',
        borderColor: '#4CAF50',
    },
    photoUploadText: {
        marginTop: 12,
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: '600',
    },
    securityNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 20,
        padding: 16,
        backgroundColor: '#F0F8FF',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#34C759',
    },
    securityNoteText: {
        marginLeft: 12,
        color: '#666',
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 24,
        paddingBottom: 24,
        marginTop: 16,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        minWidth: 100,
        justifyContent: 'center',
    },
    backButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    continueButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        flex: 1,
        marginLeft: 16,
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
    photoUploadSuccess: {
        backgroundColor: '#E8F5E9',
        borderColor: '#4CAF50',
        borderStyle: 'solid',
    },
    uploadSuccessNote: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        padding: 12,
        backgroundColor: '#E8F5E9',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#4CAF50',
    },
    uploadSuccessText: {
        marginLeft: 8,
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    skipNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 20,
        padding: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#666',
    },
    skipNoteText: {
        marginLeft: 12,
        color: '#666',
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
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
    // Modern Upload Section Styles
    modernUploadSection: {
        marginTop: 20,
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    modernUploadTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 20,
        textAlign: 'center',
    },
    modernUploadedContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    modernUploadedImageContainer: {
        alignItems: 'center',
        position: 'relative',
        marginBottom: 12,
        width: '100%',
    },
    modernUploadedImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    modernUploadSuccessOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        padding: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    modernUploadedText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '600',
    },
    modernChangeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F0F9FF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    modernChangeText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '500',
    },
    modernUploadOptions: {
        gap: 12,
        marginBottom: 16,
    },
    modernUploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        shadowColor: '#4CAF50',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    modernUploadButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    modernUploadButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    modernUploadButtonSecondaryText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: '600',
    },
}); 