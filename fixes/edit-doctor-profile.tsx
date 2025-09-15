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
import { SimpleIcons } from '../../components/SimpleIcons';
import { apiService } from '../app/services/apiService';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;
const isLargeScreen = width > 768;

export default function EditDoctorProfile() {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [subSpecialization, setSubSpecialization] = useState('');
    const [yearsOfExperience, setYearsOfExperience] = useState('');
    const [bio, setBio] = useState('');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    
    // Validation errors
    const [errors, setErrors] = useState<any>({});

    useEffect(() => {
        if (!user) {
            router.replace('/');
            return;
        }
        loadUserData();
    }, [user]);

    const loadUserData = () => {
        if (user) {
            setFirstName(userData?.first_name || user.first_name || '');
            setLastName(userData?.last_name || user.last_name || '');
            setSpecialization(user.specialization || '');
            setSubSpecialization(user.sub_specialization || '');
            setYearsOfExperience(user.years_of_experience ? user.years_of_experience.toString() : '');
            setBio(user.bio || '');
            setCountry(user.country || '');
            setCity(user.city || '');
        }
        setLoading(false);
    };

    const validateForm = () => {
        const newErrors: any = {};

        if (!firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        if (!specialization.trim()) {
            newErrors.specialization = 'Specialization is required';
        }



        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setSaving(true);
        try {
            const updateData: any = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                specialization: specialization.trim(),
            };

            if (subSpecialization) {
                updateData.sub_specialization = subSpecialization.trim();
            }



            if (bio) {
                updateData.bio = bio.trim();
            }

            if (country) {
                updateData.country = country;
            }

            if (city) {
                updateData.city = city;
            }

            const response = await apiService.updateProfile(updateData);
            
            if (response.success) {
                Alert.alert(
                    'Success!',
                    'Your profile has been updated successfully.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                Alert.alert('Error', response.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <SimpleIcons.FontAwesome.spinner />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <SimpleIcons.FontAwesome.arrowLeft />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <TouchableOpacity 
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <SimpleIcons.FontAwesome.spinner />
                        ) : (
                            <SimpleIcons.FontAwesome.check />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Personal Information Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>First Name *</Text>
                        <TextInput
                            style={[styles.input, errors.firstName && styles.inputError]}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="Enter your first name"
                            placeholderTextColor="#999"
                        />
                        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Last Name *</Text>
                        <TextInput
                            style={[styles.input, errors.lastName && styles.inputError]}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Enter your last name"
                            placeholderTextColor="#999"
                        />
                        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                    </View>
                </View>

                {/* Professional Information Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Professional Information</Text>
                    
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Specialization *</Text>
                        <TextInput
                            style={[styles.input, errors.specialization && styles.inputError]}
                            value={specialization}
                            onChangeText={setSpecialization}
                            placeholder="e.g., Cardiology, Pediatrics, Surgery"
                            placeholderTextColor="#999"
                        />
                        {errors.specialization && <Text style={styles.errorText}>{errors.specialization}</Text>}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Sub-Specialization</Text>
                        <TextInput
                            style={styles.input}
                            value={subSpecialization}
                            onChangeText={setSubSpecialization}
                            placeholder="e.g., Interventional Cardiology, Neonatology"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Years of Experience</Text>
                        <TextInput
                            style={[styles.input, styles.readOnlyInput]}
                            value={yearsOfExperience}
                            editable={false}
                            placeholder="Years of experience"
                            placeholderTextColor="#999"
                        />
                        <Text style={styles.readOnlyNote}>Years of experience cannot be edited</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Professional Bio</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Tell patients about your experience, expertise, and approach to care..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>
                </View>

                {/* Location Information Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Location Information</Text>
                    
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Country</Text>
                        <TextInput
                            style={styles.input}
                            value={country}
                            onChangeText={setCountry}
                            placeholder="Enter your country"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>City</Text>
                        <TextInput
                            style={styles.input}
                            value={city}
                            onChangeText={setCity}
                            placeholder="Enter your city"
                            placeholderTextColor="#999"
                        />
                    </View>
                </View>

                {/* Save Button */}
                <View style={styles.section}>
                    <TouchableOpacity 
                        style={[styles.saveButtonLarge, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <View style={styles.saveButtonContent}>
                                <SimpleIcons.FontAwesome.spinner />
                                <Text style={styles.saveButtonText}>Saving...</Text>
                            </View>
                        ) : (
                            <View style={styles.saveButtonContent}>
                                <SimpleIcons.FontAwesome.check />
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        marginTop: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#222',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 40,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#CCC',
    },
    section: {
        marginHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 16,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#222',
    },
    inputError: {
        borderColor: '#F44336',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    errorText: {
        fontSize: 14,
        color: '#F44336',
        marginTop: 4,
    },
    saveButtonLarge: {
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    readOnlyInput: {
        backgroundColor: '#F5F5F5',
        color: '#666',
    },
    readOnlyNote: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        fontStyle: 'italic',
    },
}); 