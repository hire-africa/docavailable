import authService from '@/services/authService';
import { FontAwesome } from '@expo/vector-icons';
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
    View
} from 'react-native';
import DatePickerField from '../components/DatePickerField';
import LocationPicker from '../components/LocationPicker';
import ProfilePicturePicker from '../components/ProfilePicturePicker';

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
    email: string;
    setEmail: (email: string) => void;
    password: string;
    setPassword: (password: string) => void;
    country: string;
    setCountry: (country: string) => void;
    city: string;
    setCity: (city: string) => void;
    errors: any;
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
    email,
    setEmail,
    password,
    setPassword,
    country,
    setCountry,
    city,
    setCity,
    errors,
}) => {
    const genderOptions = ['Male', 'Female', 'Other'];

    return (
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.stepHeader}>
                <FontAwesome name="user" size={32} color="#4CAF50" />
                <Text style={styles.stepTitle}>Personal Information</Text>
                <Text style={styles.stepSubtitle}>Tell us about yourself</Text>
            </View>

            <View style={styles.formSection}>
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
                            style={[styles.input, errors?.firstName && styles.inputError]}
                            placeholder="Enter your first name"
                            placeholderTextColor="#999"
                            value={firstName}
                            onChangeText={setFirstName}
                        />
                                                    {errors?.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
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
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Gender</Text>
                <View style={styles.genderContainer}>
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

const Step2 = () => {
    const [idType, setIdType] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = () => {
        setIsUploading(true);
        // Simulate upload process
        setTimeout(() => {
            setIsUploading(false);
            Alert.alert('Success', 'ID uploaded successfully!');
        }, 2000);
    };

    return (
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.stepHeader}>
                <FontAwesome name="shield" size={32} color="#4CAF50" />
                <Text style={styles.stepTitle}>Identity Verification</Text>
                <Text style={styles.stepSubtitle}>Secure and confidential verification</Text>
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Choose ID Type</Text>
                <View style={styles.idOptionsContainer}>
                    <TouchableOpacity 
                        style={[styles.idOption, idType === 'drivers' && styles.idOptionActive]}
                        onPress={() => setIdType('drivers')}
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
                        onPress={() => setIdType('passport')}
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
                        onPress={() => setIdType('national')}
                    >
                        <View style={[styles.idOptionIcon, idType === 'national' && styles.idOptionIconActive]}>
                            <FontAwesome name="flag" size={24} color={idType === 'national' ? "#4CAF50" : "#666"} />
                        </View>
                        <Text style={[styles.idOptionText, idType === 'national' && styles.idOptionTextActive]}>
                            National ID
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Upload ID Photo</Text>
                <Text style={styles.uploadDescription}>
                    Please upload a clear, high-quality photo of your government-issued ID. 
                    This helps us verify your identity and ensure secure healthcare services.
                </Text>
                
                <TouchableOpacity 
                    style={[styles.photoUpload, isUploading && styles.photoUploadUploading]} 
                    onPress={handleUpload}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <ActivityIndicator size="large" color="#4CAF50" />
                    ) : (
                        <>
                            <FontAwesome name="camera" size={48} color="#4CAF50" />
                            <Text style={styles.photoUploadText}>Tap to Upload</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.securityNote}>
                    <FontAwesome name="lock" size={20} color="#4CAF50" />
                    <Text style={styles.securityNoteText}>
                        Your information is encrypted and secure. We follow strict privacy guidelines.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
};

export default function PatientSignUp() {
    const [step, setStep] = useState(1);
    const [firstName, setFirstName] = useState('');
    const [surname, setSurname] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({
        firstName: null,
        surname: null,
        dob: null,
        gender: null,
        email: null,
        password: null,
        country: null,
        city: null,
    });

    const validateStep1 = () => {
        const newErrors: any = {};
        let isValid = true;

        if (firstName.length < 3) {
            newErrors.firstName = 'First name must be at least 3 characters.';
            isValid = false;
        }
        if (surname.length < 3) {
            newErrors.surname = 'Surname must be at least 3 characters.';
            isValid = false;
        }
        if (!dob) {
            newErrors.dob = 'Please enter your Date of Birth.';
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
        if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters long.';
            isValid = false;
        }
        if (!country) {
            newErrors.country = 'Please select a country.';
            isValid = false;
        }
        if (!city.trim()) {
            newErrors.city = 'Please enter your city.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
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
            console.log('Email:', email);
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
            console.error('Sign up error:', error);
            
            // Only show errors if registration was not successful
            if (!registrationSuccessful) {
                let errorMessage = 'Sign up failed. Please try again.';
                
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
                
                // Handle Laravel backend validation errors
                if (error.response?.status === 422) {
                    console.log('PatientSignup: 422 Validation error details:', error.response.data);
                    if (error.response.data && error.response.data.errors) {
                        const validationErrors = error.response.data.errors;
                        console.log('PatientSignup: Validation errors:', validationErrors);
                        const errorFields = Object.keys(validationErrors);
                        if (errorFields.length > 0) {
                            const firstError = validationErrors[errorFields[0]][0];
                            errorMessage = firstError;
                        }
                    } else {
                        errorMessage = 'Please check your input and try again.';
                    }
                } else if (error.message && error.message.includes('Validation failed')) {
                    if (error.data && error.data.errors) {
                        const validationErrors = error.data.errors;
                        const errorFields = Object.keys(validationErrors);
                        if (errorFields.length > 0) {
                            const firstError = validationErrors[errorFields[0]][0];
                            errorMessage = firstError;
                        }
                    } else {
                        errorMessage = 'Please check your input and try again.';
                    }
                } else if (error.message && error.message.includes('email already exists')) {
                    errorMessage = 'An account with this email already exists.';
                } else if (error.message && error.message.includes('password')) {
                    errorMessage = 'Password is too weak. Please choose a stronger password.';
                } else if (error.message && error.message.includes('email')) {
                    errorMessage = 'Please enter a valid email address.';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                Alert.alert('Error', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = () => {
        if (step === 1) {
            if (validateStep1()) {
                setStep(step + 1);
            }
        } else if (step === 2) {
            handleSignUp();
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
                        country={country}
                        setCountry={setCountry}
                        city={city}
                        setCity={setCity}
                        errors={errors}
                    />
                );
            case 2:
                return <Step2 />;
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
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        country={country}
                        setCountry={setCountry}
                        city={city}
                        setCity={setCity}
                        errors={errors}
                    />
                );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backToSignupButton}
                        onPress={() => router.push('/signup')}
                    >
                        <Text style={styles.backToSignupText}>← Back to Sign Up</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerText}>Create Patient Account</Text>
                    <Text style={styles.headerSubtext}>Join our healthcare platform</Text>
                </View>
                
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]} />
                        <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]} />
                    </View>
                    <Text style={styles.progressText}>Step {step} of 2</Text>
                </View>
                
                {renderStep()}
                
                <View style={styles.buttonContainer}>
                    {step > 1 && (
                        <TouchableOpacity 
                            style={styles.backButton} 
                            onPress={() => setStep(step - 1)}
                            disabled={loading}
                        >
                            <Text style={styles.arrowIcon}>←</Text>
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                        style={[styles.continueButton, loading && styles.continueButtonDisabled]} 
                        onPress={handleContinue}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <ActivityIndicator color="#FFFFFF" size="small" />
                                <Text style={[styles.continueButtonText, { marginLeft: 8 }]}>
                                    {step === 2 ? 'Creating Account...' : 'Processing...'}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.continueButtonText}>
                                    {step === 2 ? 'Create Account' : 'Continue'}
                                </Text>
                                <Text style={styles.arrowIcon}>→</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

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
        // paddingTop: 20, // Removed to eliminate extra gap
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
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
        paddingTop: 20,
        paddingBottom: 20,
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
}); 