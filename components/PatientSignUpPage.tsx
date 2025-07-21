import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
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
                return <Step2 />;
            case 3:
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
                <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]} />
            </View>
            {renderStep()}
            <View style={styles.buttonContainer}>
                {step > 1 && (
                    <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.continueButton} onPress={() => step < 3 && setStep(step + 1)}>
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
}) => (
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
}); 