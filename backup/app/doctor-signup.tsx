import { SimpleIcons } from '../components/SimpleIcons';
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
import { authService } from '../services/authService';

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
    occupation: string;
    setOccupation: (occupation: string) => void;
    bio: string;
    setBio: (bio: string) => void;
    errors: any;
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

// Step 1 Component: Personal and Professional Information
const Step1: React.FC<Step1Props> = ({
    firstName, setFirstName, surname, setSurname, dob, setDob, gender, setGender,
    email, setEmail, password, setPassword, yearsOfExperience, setYearsOfExperience,
    occupation, setOccupation, bio, setBio, errors,
}) => {
    const genderOptions = ['Male', 'Female', 'Other'];

    return (
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.stepHeader}>
                <SimpleIcons.FontAwesome.user-md />
                <Text style={styles.stepTitle}>Personal & Professional Info</Text>
                <Text style={styles.stepSubtitle}>Tell us about yourself and your expertise</Text>
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Personal Information</Text>
                
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
                <TextInput 
                    style={[styles.input, errors.dob && styles.inputError]} 
                    placeholder="MM/DD/YYYY" 
                    placeholderTextColor="#999" 
                    value={dob} 
                    onChangeText={text => setDob(formatDateInput(text))} 
                />
                {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}

                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderContainer}>
                    {genderOptions.map(option => (
                        <TouchableOpacity 
                            key={option} 
                            style={[styles.genderButton, gender === option.toLowerCase() && styles.genderButtonActive]}
                            onPress={() => setGender(option.toLowerCase())}
                        >
                            <FontAwesome 
                                name={option.toLowerCase() === 'male' ? 'mars' : option.toLowerCase() === 'female' ? 'venus' : 'genderless'} 
                                size={16} 
                                color={gender === option.toLowerCase() ? '#FFFFFF' : '#666'} 
                            />
                            <Text style={[styles.genderButtonText, gender === option.toLowerCase() && styles.genderButtonTextActive]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Account Information</Text>
                
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput 
                    style={[styles.input, errors.email && styles.inputError]} 
                    placeholder="Enter your email address" 
                    placeholderTextColor="#999" 
                    value={email} 
                    onChangeText={setEmail} 
                    keyboardType="email-address" 
                    autoCapitalize="none" 
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput 
                    style={[styles.input, errors.password && styles.inputError]} 
                    placeholder="Create a secure password" 
                    placeholderTextColor="#999" 
                    value={password} 
                    onChangeText={setPassword} 
                    secureTextEntry 
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Professional Information</Text>
                
                <Text style={styles.inputLabel}>Specialization</Text>
                <TextInput 
                    style={[styles.input, errors.occupation && styles.inputError]} 
                    placeholder="e.g., Cardiologist, Pediatrician" 
                    placeholderTextColor="#999" 
                    value={occupation} 
                    onChangeText={setOccupation} 
                />
                {errors.occupation && <Text style={styles.errorText}>{errors.occupation}</Text>}

                <Text style={styles.inputLabel}>Years of Experience</Text>
                <TextInput 
                    style={[styles.input, errors.yearsOfExperience && styles.inputError]} 
                    placeholder="Enter number of years" 
                    placeholderTextColor="#999" 
                    value={yearsOfExperience} 
                    onChangeText={setYearsOfExperience} 
                    keyboardType="numeric" 
                />
                {errors.yearsOfExperience && <Text style={styles.errorText}>{errors.yearsOfExperience}</Text>}

                <Text style={styles.inputLabel}>Professional Bio</Text>
                <TextInput 
                    style={[styles.input, styles.multilineInput, errors.bio && styles.inputError]} 
                    placeholder="Tell us about your medical background, expertise, and approach to patient care..." 
                    placeholderTextColor="#999" 
                    value={bio} 
                    onChangeText={setBio} 
                    multiline 
                    numberOfLines={4}
                />
                {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
            </View>
        </ScrollView>
    );
};

// Step 2 Component: Document Submission
const Step2 = () => {
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = () => {
        setIsUploading(true);
        // Simulate upload process
        setTimeout(() => {
            setIsUploading(false);
            Alert.alert('Success', 'Document uploaded successfully!');
        }, 2000);
    };

    return (
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.stepHeader}>
                <SimpleIcons.FontAwesome.file-text />
                <Text style={styles.stepTitle}>Document Verification</Text>
                <Text style={styles.stepSubtitle}>Upload your credentials for verification</Text>
            </View>

            <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Required Documents</Text>
                <Text style={styles.uploadDescription}>
                    Please upload clear, high-quality photos of your medical credentials. 
                    This helps us verify your qualifications and ensure quality healthcare services.
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
                            <SimpleIcons.FontAwesome.graduation-cap />
                            <Text style={styles.photoUploadText}>Medical Degree</Text>
                            <Text style={styles.photoUploadSubtext}>Tap to Upload</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.photoUpload, isUploading && styles.photoUploadUploading]} 
                    onPress={handleUpload}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <ActivityIndicator size="large" color="#4CAF50" />
                    ) : (
                        <>
                            <SimpleIcons.FontAwesome.credit-card />
                            <Text style={styles.photoUploadText}>National ID</Text>
                            <Text style={styles.photoUploadSubtext}>Tap to Upload</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.photoUpload, styles.optionalUpload, isUploading && styles.photoUploadUploading]} 
                    onPress={handleUpload}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <ActivityIndicator size="large" color="#4CAF50" />
                    ) : (
                        <>
                            <SimpleIcons.FontAwesome.certificate />
                            <Text style={styles.photoUploadText}>Medical License</Text>
                            <Text style={styles.photoUploadSubtext}>Optional</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.securityNote}>
                    <SimpleIcons.FontAwesome.shield />
                    <Text style={styles.securityNoteText}>
                        Your documents are encrypted and secure. We follow strict privacy guidelines and HIPAA compliance.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
};

// Main Component: Doctor Sign-Up Page
export default function DoctorSignUp() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        surname: '',
        dob: '',
        gender: null as string | null,
        email: '',
        password: '',
        yearsOfExperience: '',
        occupation: '',
        bio: '',
    });
    const [errors, setErrors] = useState<any>({});
    
    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateStep1 = () => {
        const newErrors: any = {};
        
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required.';
        } else if (formData.firstName.length < 3) {
            newErrors.firstName = 'First name must be at least 3 characters.';
        }
        
        if (!formData.surname.trim()) {
            newErrors.surname = 'Surname is required.';
        } else if (formData.surname.length < 3) {
            newErrors.surname = 'Surname must be at least 3 characters.';
        }
        
        if (!formData.dob.trim()) {
            newErrors.dob = 'Date of Birth is required.';
        }
        
        if (!formData.gender) {
            newErrors.gender = 'Please select a gender.';
        }
        
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required.';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email.';
        }
        
        if (!formData.password) {
            newErrors.password = 'Password is required.';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters.';
        }
        
        if (!formData.occupation.trim()) {
            newErrors.occupation = 'Specialization is required.';
        }
        
        if (!formData.yearsOfExperience.trim()) {
            newErrors.yearsOfExperience = 'Years of experience is required.';
        } else if (isNaN(Number(formData.yearsOfExperience)) || Number(formData.yearsOfExperience) < 0) {
            newErrors.yearsOfExperience = 'Please enter a valid number of years.';
        }
        
        if (!formData.bio.trim()) {
            newErrors.bio = 'Professional bio is required.';
        } else if (formData.bio.length < 10) {
            newErrors.bio = 'Bio must be at least 10 characters.';
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
            await handleSignUp();
        }
    };

    const handleSignUp = async () => {
        setLoading(true);
        try {
            const userData = {
                userType: 'doctor' as const,
                firstName: formData.firstName,
                lastName: formData.surname,
                displayName: `${formData.firstName} ${formData.surname}`,
                dateOfBirth: formData.dob,
                gender: formData.gender || undefined,
                yearsOfExperience: parseInt(formData.yearsOfExperience),
                occupation: formData.occupation,
                bio: formData.bio,
            };

            // console.log('DoctorSignup: Starting signup with userType:', userData.userType);
            const user = await authService.signUp(formData.email, formData.password, userData);
            
            // Store user type immediately after successful signup for routing
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              try {
                sessionStorage.setItem('lastSignupUserType', 'doctor');
                sessionStorage.setItem('lastSignupUID', user.uid);
                // console.log('DoctorSignup: Stored user type and UID for routing');
              } catch (error) {
                console.warn('DoctorSignup: Could not store user type:', error);
              }
            }
            
            // console.log('DoctorSignup: Signup successful, navigating to pending approval');
            // Redirect to pending approval page after successful signup
            router.replace('/doctor-dashboard');
        } catch (error: any) {
            console.error('DoctorSignup: Sign up error:', error);
            let errorMessage = 'Sign up failed. Please try again.';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'An account with this email already exists.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please choose a stronger password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            }
            
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return <Step1 
                    {...formData}
                    setFirstName={(v) => handleInputChange('firstName', v)}
                    setSurname={(v) => handleInputChange('surname', v)}
                    setDob={(v) => handleInputChange('dob', v)}
                    setGender={(v) => handleInputChange('gender', v)}
                    setEmail={(v) => handleInputChange('email', v)}
                    setPassword={(v) => handleInputChange('password', v)}
                    setYearsOfExperience={(v) => handleInputChange('yearsOfExperience', v)}
                    setOccupation={(v) => handleInputChange('occupation', v)}
                    setBio={(v) => handleInputChange('bio', v)}
                    errors={errors}
                />;
            case 2:
                return <Step2 />;
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
                
                <View style={styles.buttonContainer}>
                    {step > 1 && (
                        <TouchableOpacity 
                            style={styles.backButton} 
                            onPress={() => setStep(step - 1)}
                            disabled={loading}
                        >
                            <SimpleIcons.FontAwesome.arrow-left />
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                        style={[styles.continueButton, loading && styles.continueButtonDisabled]} 
                        onPress={handleContinue}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <Text style={styles.continueButtonText}>
                                    {step === 2 ? 'Create Account' : 'Continue'}
                                </Text>
                                <SimpleIcons.FontAwesome.arrow-right />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

// Styles
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
        paddingTop: 20,
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
        maxWidth: 200,
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
        borderColor: '#FF3B30',
    },
    multilineInput: {
        height: 120,
        textAlignVertical: 'top',
        paddingTop: 16,
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
        color: '#FF3B30',
        fontSize: 12,
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '500',
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
    optionalUpload: {
        backgroundColor: '#F0F8FF',
        borderColor: '#4CAF50',
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
    photoUploadSubtext: {
        color: '#666',
        fontSize: 12,
        marginTop: 4,
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