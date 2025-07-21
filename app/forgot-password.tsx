import { authService } from '@/services/authService';
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
    View,
} from 'react-native';
import DatePickerField from '../components/DatePickerField';

const { width } = Dimensions.get('window');

const INPUT_WIDTH_WEB = 320;

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber: string;
    healthHistory: string;
}

const Step1 = ({ formData, setFormData, errors }: { 
    formData: FormData; 
    setFormData: (data: FormData) => void; 
    errors: Partial<FormData>;
}) => (
    <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Personal Information</Text>
        <TextInput 
            style={[styles.input, errors.firstName && styles.inputError]} 
            placeholder="First Name" 
            placeholderTextColor="black"
            value={formData.firstName}
            onChangeText={(text) => setFormData({ ...formData, firstName: text })}
        />
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
        
        <TextInput 
            style={[styles.input, errors.lastName && styles.inputError]} 
            placeholder="Last Name" 
            placeholderTextColor="black"
            value={formData.lastName}
            onChangeText={(text) => setFormData({ ...formData, lastName: text })}
        />
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
        
        <TextInput 
            style={[styles.input, errors.email && styles.inputError]} 
            placeholder="Email" 
            placeholderTextColor="black"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        
        <TextInput 
            style={[styles.input, errors.password && styles.inputError]} 
            placeholder="Password" 
            placeholderTextColor="black"
            secureTextEntry
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        
        <TextInput 
            style={[styles.input, errors.confirmPassword && styles.inputError]} 
            placeholder="Confirm Password" 
            placeholderTextColor="black"
            secureTextEntry
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
        />
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        
        <DatePickerField
            value={formData.dateOfBirth}
            onChange={(text) => setFormData({ ...formData, dateOfBirth: text })}
            error={errors.dateOfBirth}
            minimumDate={new Date(1900, 0, 1)}
        />
        
        <TextInput 
            style={styles.input} 
            placeholder="Gender" 
            placeholderTextColor="black"
            value={formData.gender}
            onChangeText={(text) => setFormData({ ...formData, gender: text })}
        />
        
        <TextInput 
            style={styles.input} 
            placeholder="Phone Number" 
            placeholderTextColor="black"
            keyboardType="phone-pad"
            value={formData.phoneNumber}
            onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
        />
        
        <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Health History (Optional)"
            placeholderTextColor="black"
            multiline
            value={formData.healthHistory}
            onChangeText={(text) => setFormData({ ...formData, healthHistory: text })}
        />
    </View>
);

const Step2 = () => {
    const [idType, setIdType] = useState<string | null>(null);
    return (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Identity Verification</Text>
            <View style={styles.idOptionsContainer}>
                <TouchableOpacity
                    style={[styles.idOption, idType === 'dl' && styles.idOptionSelected]}
                    onPress={() => setIdType('dl')}
                >
                    <Text style={styles.idOptionText}>Driving License</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.idOption, idType === 'nid' && styles.idOptionSelected]}
                    onPress={() => setIdType('nid')}
                >
                    <Text style={styles.idOptionText}>National ID</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.idOption, idType === 'passport' && styles.idOptionSelected]}
                    onPress={() => setIdType('passport')}
                >
                    <Text style={styles.idOptionText}>Passport</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.uploadButton}>
                <FontAwesome name="upload" size={24} color="gray" />
                <Text style={styles.uploadButtonText}>Upload ID Photo</Text>
            </TouchableOpacity>
        </View>
    );
};

const Step3 = () => (
    <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Payment Information</Text>
        <TextInput style={styles.input} placeholder="Card Number" placeholderTextColor="black" keyboardType="numeric" />
        <View style={styles.row}>
            <TextInput style={[styles.input, styles.halfInput]} placeholder="Expiry Date (MM/YY)" placeholderTextColor="black" />
            <TextInput style={[styles.input, styles.halfInput]} placeholder="CVV" placeholderTextColor="black" keyboardType="numeric" />
        </View>
        <TextInput style={styles.input} placeholder="Cardholder Name" placeholderTextColor="black" />
    </View>
);

export default function PatientSignUp() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: '',
        gender: '',
        phoneNumber: '',
        healthHistory: '',
    });
    const [errors, setErrors] = useState<Partial<FormData>>({});

    const validateStep1 = (): boolean => {
        const newErrors: Partial<FormData> = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleContinue = async () => {
        if (step === 1) {
            if (!validateStep1()) {
                return;
            }
            setStep(2);
        } else if (step === 2) {
            setStep(3);
        } else if (step === 3) {
            await handleSignUp();
        }
    };

    const handleSignUp = async () => {
        setLoading(true);
        try {
            const formDataObj = new FormData();
            formDataObj.append('first_name', formData.firstName);
            formDataObj.append('last_name', formData.lastName);
            formDataObj.append('email', formData.email);
            formDataObj.append('password', formData.password);
            formDataObj.append('password_confirmation', formData.password);
            formDataObj.append('date_of_birth', formData.dateOfBirth);
            formDataObj.append('gender', formData.gender);
            formDataObj.append('user_type', 'patient');

            await authService.signUp(formDataObj);
            
            Alert.alert(
                'Success!',
                'Your account has been created successfully.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/')
                    }
                ]
            );
        } catch (error: any) {
            console.error('Sign up error:', error);
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
                return <Step1 formData={formData} setFormData={setFormData} errors={errors} />;
            case 2:
                return <Step2 />;
            case 3:
                return <Step3 />;
            default:
                return <Step1 formData={formData} setFormData={setFormData} errors={errors} />;
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.container}>
                    <Text style={styles.headerText}>Create Patient Account</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]} />
                        <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]} />
                        <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]} />
                    </View>
                    {renderStep()}
                    <View style={styles.buttonContainer}>
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
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.continueButtonText}>
                                    {step === 3 ? 'Create Account' : 'Continue'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
    },
    progressBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    progressStep: {
        flex: 1,
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        marginHorizontal: 5,
    },
    progressStepActive: {
        backgroundColor: '#4CAF50',
    },
    stepContainer: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        height: 50,
        borderColor: '#E0E0E0',
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        ...Platform.select({
            web: {
                width: INPUT_WIDTH_WEB,
                alignSelf: 'center',
            },
            default: {
                width: '100%',
            }
        }),
    },
    inputError: {
        borderColor: '#4CAF50',
    },
    errorText: {
        color: '#4CAF50',
        fontSize: 12,
        marginBottom: 8,
        marginLeft: 4,
        ...Platform.select({
            web: {
                width: INPUT_WIDTH_WEB,
                alignSelf: 'center',
            },
        }),
    },
    multilineInput: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 16,
    },
    idOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    idOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    idOptionSelected: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    idOptionText: {
        color: '#000',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    uploadButtonText: {
        marginLeft: 10,
        fontSize: 16,
        color: 'gray',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    backButton: {
        backgroundColor: '#E0E0E0',
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        width: 150,
        marginRight: 10,
    },
    backButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    continueButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        width: 150,
    },
    continueButtonDisabled: {
        backgroundColor: '#B0B0B0',
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
}); 