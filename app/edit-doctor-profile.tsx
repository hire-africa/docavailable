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
import { Icon } from '../components/Icon';
import ProfilePicturePicker from '../components/ProfilePicturePicker';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from './services/apiService';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;
const isLargeScreen = width > 768;

export default function EditDoctorProfile() {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    
    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [subSpecialization, setSubSpecialization] = useState('');
    const [yearsOfExperience, setYearsOfExperience] = useState('');
    const [bio, setBio] = useState('');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    
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
            setProfilePicture(user.profile_picture || user.profile_picture_url || null);
        }
        setLoading(false);
    };

    const handleImageSelected = async (imageUri: string) => {
        try {
            setUploadingImage(true);
            
            // Create form data for image upload
            const formData = new FormData();
            formData.append('profile_picture', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'profile_picture.jpg'
            } as any);

            const response = await apiService.post('/upload/profile-picture', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            if (response.success) {
                setProfilePicture(response.data.profile_picture_url || imageUri);
                Alert.alert('Success', 'Profile picture updated successfully!');
            } else {
                Alert.alert('Error', response.message || 'Failed to upload profile picture');
            }
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
        } finally {
            setUploadingImage(false);
        }
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

            if (yearsOfExperience) {
                updateData.years_of_experience = parseInt(yearsOfExperience);
            }

            if (bio) {
                updateData.bio = bio.trim();
            }

            if (country) {
                updateData.country = country.trim();
            }

            if (city) {
                updateData.city = city.trim();
            }

            const response = await apiService.patch('/profile', updateData);

            if (response.success) {
                Alert.alert(
                    'Success',
                    'Profile updated successfully!',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back()
                        }
                    ]
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
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.content, { maxWidth }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Icon name="back" size={20} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Edit Profile</Text>
                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Icon name="save" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Profile Picture Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Profile Picture</Text>
                        <View style={styles.profilePictureContainer}>
                            <ProfilePicturePicker
                                imageUri={profilePicture}
                                onImageSelected={handleImageSelected}
                                size={120}
                                showEditButton={true}
                            />
                            {uploadingImage && (
                                <View style={styles.uploadingOverlay}>
                                    <Text style={styles.uploadingText}>Uploading...</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Basic Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Basic Information</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>First Name *</Text>
                            <TextInput
                                style={[styles.input, errors.firstName && styles.inputError]}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="Enter your first name"
                                placeholderTextColor="#999"
                            />
                            {errors.firstName && (
                                <Text style={styles.errorText}>{errors.firstName}</Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Last Name *</Text>
                            <TextInput
                                style={[styles.input, errors.lastName && styles.inputError]}
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Enter your last name"
                                placeholderTextColor="#999"
                            />
                            {errors.lastName && (
                                <Text style={styles.errorText}>{errors.lastName}</Text>
                            )}
                        </View>
                    </View>

                    {/* Professional Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Professional Information</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Specialization *</Text>
                            <TextInput
                                style={[styles.input, errors.specialization && styles.inputError]}
                                value={specialization}
                                onChangeText={setSpecialization}
                                placeholder="e.g., Cardiology, Neurology"
                                placeholderTextColor="#999"
                            />
                            {errors.specialization && (
                                <Text style={styles.errorText}>{errors.specialization}</Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Sub-specialization</Text>
                            <TextInput
                                style={styles.input}
                                value={subSpecialization}
                                onChangeText={setSubSpecialization}
                                placeholder="e.g., Interventional Cardiology"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Years of Experience</Text>
                            <TextInput
                                style={styles.input}
                                value={yearsOfExperience}
                                onChangeText={setYearsOfExperience}
                                placeholder="e.g., 5"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Location Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Location</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Country</Text>
                            <TextInput
                                style={styles.input}
                                value={country}
                                onChangeText={setCountry}
                                placeholder="Enter your country"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>City</Text>
                            <TextInput
                                style={styles.input}
                                value={city}
                                onChangeText={setCity}
                                placeholder="Enter your city"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    {/* Bio */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Professional Bio</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>About Me</Text>
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

                    {/* Save Button */}
                    <View style={styles.saveSection}>
                        <TouchableOpacity
                            style={[styles.saveButtonLarge, saving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Icon name="save" size={20} color="#fff" />
                            <Text style={styles.saveButtonText}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 20,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30,
        marginTop: 20,
        paddingHorizontal: 10,
    },
    backButton: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    saveButton: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    section: {
        marginBottom: 25,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#fff',
    },
    inputError: {
        borderColor: '#ff3b30',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 14,
        marginTop: 4,
    },
    saveSection: {
        marginTop: 20,
        marginBottom: 40,
    },
    saveButtonLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        color: '#666',
    },
    profilePictureContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 120,
    },
    uploadingText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
}); 