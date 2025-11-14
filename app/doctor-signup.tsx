import authService from '@/services/authService';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import customAlertService from '../services/customAlertService';
import DatePickerField from '../components/DatePickerField';
import LocationPicker from '../components/LocationPicker';
import MultipleLanguagePicker from '../components/MultipleLanguagePicker';
import MultipleSpecializationPicker from '../components/MultipleSpecializationPicker';
import ProfilePicturePicker from '../components/ProfilePicturePicker';
import { navigateToLogin } from '../utils/navigationUtils';
import { createFieldRefs, scrollToFirstError } from '../utils/scrollToError';
import SignUpErrorHandler from '../utils/errorHandler';
import ValidationUtils from '../utils/validationUtils';
import EnhancedValidation from '../utils/enhancedValidation';

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
                customAlertService.error('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5, // Compress to 50% to reduce file size
            });

            if (!result.canceled && result.assets[0]) {
                setter(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            customAlertService.error('Error', 'Failed to upload file. Please try again.');
        }
    };

    const handleCameraCapture = async (type: 'nationalIdPassport' | 'highestMedicalCertificate' | 'specialistCertificate', setter: (uri: string | null) => void) => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                customAlertService.error('Permission needed', 'Sorry, we need camera permissions to take photos!');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5, // Compress to 50% to reduce file size
            });

            if (!result.canceled && result.assets[0]) {
                setter(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            customAlertService.error('Error', 'Failed to take photo. Please try again.');
        }
    };

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [currentUploadType, setCurrentUploadType] = useState<'nationalIdPassport' | 'highestMedicalCertificate' | 'specialistCertificate' | null>(null);
    const [currentUploadSetter, setCurrentUploadSetter] = useState<((uri: string | null) => void) | null>(null);

    const showUploadOptions = (type: 'nationalIdPassport' | 'highestMedicalCertificate' | 'specialistCertificate', setter: (uri: string | null) => void) => {
        setCurrentUploadType(type);
        setCurrentUploadSetter(() => setter);
        setShowUploadModal(true);
    };

    const handleUploadOption = (option: 'camera' | 'library') => {
        setShowUploadModal(false);
        if (currentUploadType && currentUploadSetter) {
            if (option === 'camera') {
                handleCameraCapture(currentUploadType, currentUploadSetter);
            } else {
                handleFileUpload(currentUploadType, currentUploadSetter);
            }
        }
    };

    const getDocumentTitle = (type: 'nationalIdPassport' | 'highestMedicalCertificate' | 'specialistCertificate') => {
        switch (type) {
            case 'nationalIdPassport':
                return 'National ID / Passport';
            case 'highestMedicalCertificate':
                return 'Highest Medical Certificate';
            case 'specialistCertificate':
                return 'Specialist Certificate';
            default:
                return 'Document';
        }
    };

    return (
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.modernStepHeader}>
                <View style={styles.modernStepIconContainer}>
                    <FontAwesome name="file-text-o" size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.modernStepTitle}>Required Documents</Text>
                <Text style={styles.modernStepSubtitle}>Upload your professional credentials to complete verification</Text>
                <View style={styles.modernStepInstruction}>
                    <FontAwesome name="info-circle" size={14} color="#4CAF50" />
                    <Text style={styles.modernStepInstructionText}>
                        Tap any upload area to choose between camera or photo library
                    </Text>
                </View>
            </View>

            <View style={styles.modernDocumentSection}>
                <View style={styles.modernDocumentCard}>
                    <View style={styles.modernDocumentHeader}>
                        <View style={styles.modernDocumentIcon}>
                            <FontAwesome name="id-card-o" size={20} color="#4CAF50" />
                        </View>
                        <View style={styles.modernDocumentInfo}>
                            <Text style={styles.modernDocumentLabel}>National ID / Passport</Text>
                            <Text style={styles.modernDocumentRequired}>Required</Text>
                        </View>
                        {nationalIdPassport && (
                            <View style={styles.modernDocumentStatus}>
                                <FontAwesome name="check-circle" size={20} color="#4CAF50" />
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        ref={fieldRefs?.nationalIdPassport}
                        style={[styles.modernUploadArea, nationalIdPassport && styles.modernUploadAreaSuccess]}
                        onPress={() => showUploadOptions('nationalIdPassport', setNationalIdPassport)}
                        disabled={isUploading}
                    >
                        <View style={styles.modernUploadContent}>
                            <View style={styles.modernUploadIconContainer}>
                                <FontAwesome
                                    name={nationalIdPassport ? "check-circle" : "cloud-upload"}
                                    size={24}
                                    color={nationalIdPassport ? "#4CAF50" : "#666"}
                                />
                            </View>
                            <Text style={styles.modernUploadText}>
                                {nationalIdPassport ? 'Document uploaded successfully' : 'Tap to upload document'}
                            </Text>
                            <Text style={styles.modernUploadSubtext}>
                                {nationalIdPassport ? 'Ready for verification' : 'Camera or Photo Library'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {errors.nationalIdPassport && <Text style={styles.modernErrorText}>{errors.nationalIdPassport}</Text>}
                </View>

                <View style={styles.modernDocumentCard}>
                    <View style={styles.modernDocumentHeader}>
                        <View style={styles.modernDocumentIcon}>
                            <FontAwesome name="graduation-cap" size={20} color="#4CAF50" />
                        </View>
                        <View style={styles.modernDocumentInfo}>
                            <Text style={styles.modernDocumentLabel}>Highest Medical Certificate</Text>
                            <Text style={styles.modernDocumentRequired}>Required</Text>
                        </View>
                        {highestMedicalCertificate && (
                            <View style={styles.modernDocumentStatus}>
                                <FontAwesome name="check-circle" size={20} color="#4CAF50" />
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        ref={fieldRefs?.highestMedicalCertificate}
                        style={[styles.modernUploadArea, highestMedicalCertificate && styles.modernUploadAreaSuccess]}
                        onPress={() => showUploadOptions('highestMedicalCertificate', setHighestMedicalCertificate)}
                        disabled={isUploading}
                    >
                        <View style={styles.modernUploadContent}>
                            <View style={styles.modernUploadIconContainer}>
                                <FontAwesome
                                    name={highestMedicalCertificate ? "check-circle" : "cloud-upload"}
                                    size={24}
                                    color={highestMedicalCertificate ? "#4CAF50" : "#666"}
                                />
                            </View>
                            <Text style={styles.modernUploadText}>
                                {highestMedicalCertificate ? 'Document uploaded successfully' : 'Tap to upload document'}
                            </Text>
                            <Text style={styles.modernUploadSubtext}>
                                {highestMedicalCertificate ? 'Ready for verification' : 'Camera or Photo Library'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {errors.highestMedicalCertificate && <Text style={styles.modernErrorText}>{errors.highestMedicalCertificate}</Text>}
                </View>

                <View style={styles.modernDocumentCard}>
                    <View style={styles.modernDocumentHeader}>
                        <View style={styles.modernDocumentIcon}>
                            <FontAwesome name="certificate" size={20} color="#4CAF50" />
                        </View>
                        <View style={styles.modernDocumentInfo}>
                            <Text style={styles.modernDocumentLabel}>Specialist Certificate</Text>
                            <Text style={styles.modernDocumentOptional}>Optional</Text>
                        </View>
                        {specialistCertificate && (
                            <View style={styles.modernDocumentStatus}>
                                <FontAwesome name="check-circle" size={20} color="#4CAF50" />
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.modernUploadArea, specialistCertificate && styles.modernUploadAreaSuccess]}
                        onPress={() => showUploadOptions('specialistCertificate', setSpecialistCertificate)}
                        disabled={isUploading}
                    >
                        <View style={styles.modernUploadContent}>
                            <View style={styles.modernUploadIconContainer}>
                                <FontAwesome
                                    name={specialistCertificate ? "check-circle" : "cloud-upload"}
                                    size={24}
                                    color={specialistCertificate ? "#4CAF50" : "#666"}
                                />
                            </View>
                            <Text style={styles.modernUploadText}>
                                {specialistCertificate ? 'Document uploaded successfully' : 'Tap to upload document'}
                            </Text>
                            <Text style={styles.modernUploadSubtext}>
                                {specialistCertificate ? 'Ready for verification' : 'Camera or Photo Library'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {errors.specialistCertificate && <Text style={styles.modernErrorText}>{errors.specialistCertificate}</Text>}
                </View>
            </View>

            {/* Modern Upload Modal */}
            <Modal
                visible={showUploadModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowUploadModal(false)}
            >
                <View style={styles.modernModalOverlay}>
                    <View style={styles.modernModalContainer}>
                        <View style={styles.modernModalHeader}>
                            <View style={styles.modernModalIcon}>
                                <FontAwesome name="cloud-upload" size={24} color="#4CAF50" />
                            </View>
                            <Text style={styles.modernModalTitle}>Upload Document</Text>
                            <Text style={styles.modernModalSubtitle}>
                                {currentUploadType ? getDocumentTitle(currentUploadType) : 'Choose how you want to upload your document'}
                            </Text>
                        </View>

                        <View style={styles.modernModalOptions}>
                            <TouchableOpacity
                                style={styles.modernModalOption}
                                onPress={() => handleUploadOption('camera')}
                            >
                                <View style={styles.modernModalOptionIcon}>
                                    <FontAwesome name="camera" size={24} color="#4CAF50" />
                                </View>
                                <View style={styles.modernModalOptionContent}>
                                    <Text style={styles.modernModalOptionTitle}>Take Photo</Text>
                                    <Text style={styles.modernModalOptionSubtitle}>Use camera to capture document</Text>
                                </View>
                                <FontAwesome name="chevron-right" size={16} color="#CCCCCC" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modernModalOption}
                                onPress={() => handleUploadOption('library')}
                            >
                                <View style={styles.modernModalOptionIcon}>
                                    <FontAwesome name="photo" size={24} color="#4CAF50" />
                                </View>
                                <View style={styles.modernModalOptionContent}>
                                    <Text style={styles.modernModalOptionTitle}>Choose from Library</Text>
                                    <Text style={styles.modernModalOptionSubtitle}>Select from photo gallery</Text>
                                </View>
                                <FontAwesome name="chevron-right" size={16} color="#CCCCCC" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.modernModalCancel}
                            onPress={() => setShowUploadModal(false)}
                        >
                            <Text style={styles.modernModalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        const formData = {
            firstName,
            surname,
            email,
            password,
            dateOfBirth: dob,
            gender,
            country,
            city,
            specializations,
            yearsOfExperience: Number(yearsOfExperience),
            professionalBio,
            languagesSpoken,
            acceptPolicies
        };

        const rules = ValidationUtils.getSignUpRules('doctor');
        const newErrors = ValidationUtils.validateFields(formData, rules);

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

    const validateStep2 = () => {
        const newErrors: any = {};

        // Validate required documents
        if (!nationalIdPassport) {
            newErrors.nationalIdPassport = 'National ID or Passport is required.';
        } else {
            const fileError = ValidationUtils.validateFileUpload(nationalIdPassport, {
                maxSize: 10 * 1024 * 1024, // 10MB
                allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
                required: true
            });
            if (fileError) {
                newErrors.nationalIdPassport = fileError;
            }
        }

        if (!highestMedicalCertificate) {
            newErrors.highestMedicalCertificate = 'Highest Medical Certificate is required.';
        } else {
            const fileError = ValidationUtils.validateFileUpload(highestMedicalCertificate, {
                maxSize: 10 * 1024 * 1024, // 10MB
                allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
                required: true
            });
            if (fileError) {
                newErrors.highestMedicalCertificate = fileError;
            }
        }

        // Validate optional specialist certificate
        if (specialistCertificate) {
            const fileError = ValidationUtils.validateFileUpload(specialistCertificate, {
                maxSize: 10 * 1024 * 1024, // 10MB
                allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
                required: false
            });
            if (fileError) {
                newErrors.specialistCertificate = fileError;
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
            const response = await authService.sendVerificationCode(email);
            
            if (response.success) {
                // No modal - just proceed silently
                console.log('Verification code sent successfully');
            } else {
                throw new Error(response.message || 'Failed to send verification code');
            }
        } catch (error) {
            console.error('Error sending verification code:', error);
            customAlertService.error('Error', 'Failed to send verification code. Please try again.');
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
            customAlertService.error('Error', error.message || 'Invalid verification code. Please try again.');
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
                router.replace('/doctor-dashboard' as any);
                return;
            }
            
            // Only throw error if we get an unexpected response
            throw new Error('Unexpected response from registration');
        } catch (error: any) {
            // Only show errors if registration was not successful
            if (!registrationSuccessful) {
                SignUpErrorHandler.handleSignUpError(
                    error,
                    (validationErrors) => {
                        // Handle validation errors by setting them in state
                        setErrors(validationErrors);
                        // Use enhanced validation for better scrolling
                        const validationConfig = EnhancedValidation.createConfig(scrollViewRef, fieldRefs, {
                            showAlert: false,
                            scrollDelay: 100
                        });
                        EnhancedValidation.validateAndScroll(validationErrors, validationConfig);
                    },
                    () => handleSignUp(), // Retry function
                    () => router.replace('/login') // Login function
                );
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
    // Modern Step2 Styles
    modernStepHeader: {
        alignItems: 'center',
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    modernStepIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#4CAF50',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    modernStepTitle: {
        fontSize: isLargeScreen ? 28 : 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 12,
        textAlign: 'center',
    },
    modernStepSubtitle: {
        fontSize: isLargeScreen ? 16 : 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 16,
    },
    modernStepInstruction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9F0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E8F5E9',
    },
    modernStepInstructionText: {
        fontSize: 12,
        color: '#4CAF50',
        marginLeft: 8,
        fontWeight: '500',
    },
    modernDocumentSection: {
        paddingHorizontal: 20,
    },
    modernDocumentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 20,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
            web: {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            },
        }),
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    modernDocumentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    modernDocumentIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F9F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    modernDocumentInfo: {
        flex: 1,
    },
    modernDocumentLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    modernDocumentRequired: {
        fontSize: 12,
        color: '#FF6B6B',
        fontWeight: '500',
        backgroundColor: '#FFF5F5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    modernDocumentOptional: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '500',
        backgroundColor: '#F0F9F0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    modernDocumentStatus: {
        marginLeft: 12,
    },
    modernUploadArea: {
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 24,
        backgroundColor: '#FAFAFA',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
    },
    modernUploadAreaSuccess: {
        borderColor: '#4CAF50',
        borderStyle: 'solid',
        backgroundColor: '#F0F9F0',
    },
    modernUploadContent: {
        alignItems: 'center',
    },
    modernUploadIconContainer: {
        marginBottom: 12,
    },
    modernUploadText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
        textAlign: 'center',
    },
    modernUploadSubtext: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    modernErrorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 8,
        marginLeft: 4,
        fontWeight: '500',
    },
    // Modern Upload Modal Styles
    modernModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modernModalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
            },
            android: {
                elevation: 20,
            },
        }),
    },
    modernModalHeader: {
        alignItems: 'center',
        paddingTop: 32,
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    modernModalIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F0F9F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modernModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 8,
        textAlign: 'center',
    },
    modernModalSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    modernModalOptions: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    modernModalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: '#FAFAFA',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    modernModalOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F0F9F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    modernModalOptionContent: {
        flex: 1,
    },
    modernModalOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    modernModalOptionSubtitle: {
        fontSize: 12,
        color: '#666',
    },
    modernModalCancel: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        alignItems: 'center',
    },
    modernModalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
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