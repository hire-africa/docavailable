import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import DatePickerField from './DatePickerField';
import LocationPicker from './LocationPicker';

const { width } = Dimensions.get('window');

const INPUT_WIDTH_MOBILE = width * 0.8;
const INPUT_WIDTH_WEB = 320;

export default function PatientSignUpPage() {
    const [step, setStep] = useState(1);
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');

    const renderStep = () => {
        switch (step) {
            case 1:
                return <Step1 country={country} setCountry={setCountry} city={city} setCity={setCity} />;
            case 2:
                return <Step3 />;
            default:
                return <Step1 country={country} setCountry={setCountry} city={city} setCity={setCity} />;
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>Create Patient Account</Text>
            <View style={styles.progressBar}>
                <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]} />
                <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]} />
            </View>
            {renderStep()}
            <View style={styles.buttonContainer}>
                {step > 1 && (
                    <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.continueButton} onPress={() => step < 2 && setStep(step + 1)}>
                    <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const Step1 = ({ country, setCountry, city, setCity }: { 
    country: string; 
    setCountry: (country: string) => void; 
    city: string; 
    setCity: (city: string) => void; 
}) => {
    const [idType, setIdType] = useState<string | null>(null);
    const [idDocument, setIdDocument] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleIdUpload = async () => {
        if (!idType) {
            Alert.alert('Select ID Type', 'Please select an ID type first.');
            return;
        }

        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera roll permissions are needed to upload ID documents.');
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
                Alert.alert('Success', 'ID document uploaded successfully!');
            }
        } catch (error) {
            console.error('Error uploading ID:', error);
            Alert.alert('Upload Error', 'Failed to upload ID document. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleTakePhoto = async () => {
        if (!idType) {
            Alert.alert('Select ID Type', 'Please select an ID type first.');
            return;
        }

        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera permissions are needed to take photos.');
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
                Alert.alert('Success', 'ID photo captured successfully!');
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Camera Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };
    
    return (
    <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Personal Information</Text>
        <TouchableOpacity style={styles.photoUpload}>
            <FontAwesome name="camera" size={24} color="gray" />
            <Text style={styles.photoUploadText}>Upload Photo</Text>
        </TouchableOpacity>
        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="gray" />
        <DatePickerField
            value=""
            onChange={() => {}}
        />
        <LocationPicker
            country={country}
            setCountry={setCountry}
            city={city}
            setCity={setCity}
        />
        <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Health History"
            placeholderTextColor="gray"
            multiline
        />
            
            {/* Enhanced ID Verification Section */}
            <View style={styles.idVerificationSection}>
                <View style={styles.idSectionHeader}>
                    <FontAwesome name="shield" size={20} color="#4A90E2" />
                    <Text style={styles.idSectionTitle}>Identity Verification</Text>
                    <View style={styles.optionalBadge}>
                        <Text style={styles.optionalText}>Optional</Text>
                    </View>
    </View>
                <Text style={styles.idSectionDescription}>
                    Verify your identity for enhanced security and faster consultations
                </Text>
                
                <View style={styles.modernIdOptionsContainer}>
                <TouchableOpacity
                        style={[styles.modernIdOption, idType === 'dl' && styles.modernIdOptionSelected]}
                    onPress={() => setIdType('dl')}
                >
                        <View style={styles.idOptionIconContainer}>
                            <FontAwesome name="car" size={20} color={idType === 'dl' ? "#FFFFFF" : "#4A90E2"} />
                        </View>
                        <Text style={[styles.modernIdOptionText, idType === 'dl' && styles.modernIdOptionTextSelected]}>
                            Driver's License
                        </Text>
                </TouchableOpacity>
                    
                <TouchableOpacity
                        style={[styles.modernIdOption, idType === 'nid' && styles.modernIdOptionSelected]}
                    onPress={() => setIdType('nid')}
                >
                        <View style={styles.idOptionIconContainer}>
                            <FontAwesome name="id-card" size={20} color={idType === 'nid' ? "#FFFFFF" : "#4A90E2"} />
                        </View>
                        <Text style={[styles.modernIdOptionText, idType === 'nid' && styles.modernIdOptionTextSelected]}>
                            National ID
                        </Text>
                </TouchableOpacity>
                    
                <TouchableOpacity
                        style={[styles.modernIdOption, idType === 'passport' && styles.modernIdOptionSelected]}
                    onPress={() => setIdType('passport')}
                >
                        <View style={styles.idOptionIconContainer}>
                            <FontAwesome name="globe" size={20} color={idType === 'passport' ? "#FFFFFF" : "#4A90E2"} />
                        </View>
                        <Text style={[styles.modernIdOptionText, idType === 'passport' && styles.modernIdOptionTextSelected]}>
                            Passport
                        </Text>
                    </TouchableOpacity>
                </View>
                
                {idType && (
                    <View style={styles.uploadSection}>
                        <Text style={styles.uploadSectionTitle}>Upload Your {idType === 'dl' ? 'Driver\'s License' : idType === 'nid' ? 'National ID' : 'Passport'}</Text>
                        
                        {idDocument ? (
                            <View style={styles.uploadedImageContainer}>
                                <Image source={{ uri: idDocument }} style={styles.uploadedImage} />
                                <TouchableOpacity style={styles.changeImageButton} onPress={() => setIdDocument(null)}>
                                    <FontAwesome name="edit" size={16} color="#4A90E2" />
                                    <Text style={styles.changeImageText}>Change</Text>
                </TouchableOpacity>
            </View>
                        ) : (
                            <View style={styles.uploadOptionsContainer}>
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
                                        <ActivityIndicator size="small" color="#4A90E2" />
                                    ) : (
                                        <>
                                            <FontAwesome name="upload" size={20} color="#4A90E2" />
                                            <Text style={styles.modernUploadButtonSecondaryText}>Choose from Gallery</Text>
                                        </>
                                    )}
            </TouchableOpacity>
                            </View>
                        )}
                        
                        <View style={styles.securityNote}>
                            <FontAwesome name="lock" size={14} color="#10B981" />
                            <Text style={styles.securityNoteText}>
                                Your documents are encrypted and secure. We follow strict privacy guidelines.
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};

const Step3 = () => (
    <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Payment Information</Text>
        <TextInput style={styles.input} placeholder="Card Number" placeholderTextColor="gray" keyboardType="numeric" />
        <View style={styles.row}>
            <TextInput style={[styles.input, styles.halfInput]} placeholder="Expiry Date (MM/YY)" placeholderTextColor="gray" />
            <TextInput style={[styles.input, styles.halfInput]} placeholder="CVV" placeholderTextColor="gray" keyboardType="numeric" />
        </View>
        <TextInput style={styles.input} placeholder="Cardholder Name" placeholderTextColor="gray" />
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#D32F2F',
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
    photoUpload: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 120,
        width: 120,
        borderRadius: 60,
        backgroundColor: '#F5F5F5',
        alignSelf: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    photoUploadText: {
        marginTop: 8,
        color: 'gray',
    },
    input: {
        height: 50,
        borderColor: '#E0E0E0',
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        ...Platform.select({
            web: {
                width: INPUT_WIDTH_WEB,
            },
            default: {
                width: '100%',
            }
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
        backgroundColor: '#D32F2F',
        borderColor: '#D32F2F',
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
        backgroundColor: '#D32F2F',
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        width: 150,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Modern ID Verification Styles
    idVerificationSection: {
        marginTop: 30,
        padding: 20,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    idSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    idSectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
        marginLeft: 8,
        flex: 1,
    },
    optionalBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    optionalText: {
        fontSize: 12,
        color: '#3B82F6',
        fontWeight: '500',
    },
    idSectionDescription: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 20,
        lineHeight: 20,
    },
    modernIdOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 8,
    },
    modernIdOption: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        minHeight: 90,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    modernIdOptionSelected: {
        backgroundColor: '#4A90E2',
        borderColor: '#4A90E2',
        shadowColor: '#4A90E2',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    idOptionIconContainer: {
        marginBottom: 8,
    },
    modernIdOptionText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '500',
        textAlign: 'center',
    },
    modernIdOptionTextSelected: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    uploadSection: {
        marginTop: 20,
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    uploadSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 16,
        textAlign: 'center',
    },
    uploadedImageContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    uploadedImage: {
        width: 200,
        height: 120,
        borderRadius: 8,
        marginBottom: 12,
        backgroundColor: '#F1F5F9',
    },
    changeImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#EFF6FF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    changeImageText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#4A90E2',
        fontWeight: '500',
    },
    uploadOptionsContainer: {
        gap: 12,
        marginBottom: 16,
    },
    modernUploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#4A90E2',
        borderRadius: 12,
        shadowColor: '#4A90E2',
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
        borderColor: '#4A90E2',
    },
    modernUploadButtonSecondaryText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#4A90E2',
        fontWeight: '600',
    },
    securityNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        backgroundColor: '#ECFDF5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    securityNoteText: {
        marginLeft: 8,
        fontSize: 12,
        color: '#065F46',
        lineHeight: 16,
        flex: 1,
    },
}); 