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
import DatePickerField from '../components/DatePickerField';
import { Icon } from '../components/Icon';
import LocationPicker from '../components/LocationPicker';
import ProfilePicturePicker from '../components/ProfilePicturePicker';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../app/services/apiService';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;
const isLargeScreen = width > 768;

export default function EditPatientProfile() {
    const { user, userData, refreshUserData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    
    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('');
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
        
        // Load existing data first, then try to refresh in background
        const initializeData = async () => {
            try {
                // First load with existing data
                loadUserData();
                
                // Only refresh if we don't have complete user data
                const hasCompleteData = user && user.first_name && user.last_name;
                
                if (!hasCompleteData) {
                    // Then try to refresh in background (don't block UI)
                    setTimeout(async () => {
                        try {
                            // console.log('EditPatientProfile: Refreshing user data in background...');
                            await refreshUserData();
                            // Reload data after refresh
                            loadUserData();
                        } catch (error) {
                            console.error('EditPatientProfile: Background refresh failed:', error);
                            // Don't clear data on refresh failure
                        }
                    }, 100);
                } else {
                    // console.log('EditPatientProfile: User data already complete, skipping refresh');
                }
            } catch (error) {
                console.error('EditPatientProfile: Error in initialization:', error);
                // Still try to load with existing data
                loadUserData();
            }
        };
        
        initializeData();
    }, [user]);

    // Reload data when userData changes
    useEffect(() => {
        if (userData) {
            loadUserData();
        }
    }, [userData]);

    const loadUserData = () => {
        // console.log('EditPatientProfile: Loading user data...');
        // console.log('EditPatientProfile: userData:', userData);
        // console.log('EditPatientProfile: user:', user);
        // console.log('EditPatientProfile: userData type:', typeof userData);
        // console.log('EditPatientProfile: user type:', typeof user);
        
        try {
            if (userData || user) {
                // Use userData first, then fallback to user
                const currentUser = userData || user;
                
                // console.log('EditPatientProfile: Using currentUser:', currentUser);
                // console.log('EditPatientProfile: currentUser keys:', Object.keys(currentUser || {}));
                
                // Validate that we have the expected user data structure
                if (!currentUser || typeof currentUser !== 'object') {
                    console.error('EditPatientProfile: Invalid user data structure:', currentUser);
                    Alert.alert('Error', 'Invalid user data. Please try again.');
                    return;
                }
                
                setFirstName(currentUser?.first_name || '');
                setLastName(currentUser?.last_name || '');
                setDateOfBirth(currentUser?.date_of_birth || '');
                setGender(currentUser?.gender || '');
                setBio(currentUser?.bio || '');
                setCountry(currentUser?.country || '');
                setCity(currentUser?.city || '');
                setProfilePicture(currentUser?.profile_picture_url || currentUser?.profile_picture || null);
                
                // console.log('EditPatientProfile: Loaded data:', {
                //   firstName: currentUser?.first_name,
                //   lastName: currentUser?.last_name,
                //   dateOfBirth: currentUser?.date_of_birth,
                //   gender: currentUser?.gender,
                //   bio: currentUser?.bio,
                //   country: currentUser?.country,
                //   city: currentUser?.city,
                //   profilePicture: currentUser?.profile_picture || currentUser?.profile_picture_url
                // });
            } else {
                // console.log('EditPatientProfile: No user data available');
                Alert.alert('Error', 'No user data available. Please log in again.');
            }
        } catch (error) {
            console.error('EditPatientProfile: Error loading user data:', error);
            Alert.alert('Error', 'Failed to load user data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelected = async (imageUri: string) => {
        try {
            setUploadingImage(true);
            
            // console.log('EditPatientProfile: Starting image upload...');
            // console.log('EditPatientProfile: Image URI:', imageUri);
            
            // Debug: Check authentication token
            const token = await apiService.getAuthToken();
            console.log('EditPatientProfile: Auth token available:', !!token);
            
            // Create form data for image upload
            const formData = new FormData();
            formData.append('profile_picture', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'profile_picture.jpg'
            } as any);

            // console.log('EditPatientProfile: FormData created, making API request...');

            const response = await apiService.uploadFile('/upload/profile-picture', formData);

            // console.log('EditPatientProfile: Upload response:', response);

            if (response.success) {
                const newProfilePictureUrl = response.data?.profile_picture_url || imageUri;
                setProfilePicture(newProfilePictureUrl);
                // console.log('EditPatientProfile: Profile picture updated successfully:', newProfilePictureUrl);
                
                // Refresh user data to update the profile picture in AuthContext
                try {
                    await refreshUserData();
                    // console.log('EditPatientProfile: User data refreshed after upload');
                    
                    // Force a re-render by updating local state
                    setTimeout(() => {
                        // console.log('EditPatientProfile: Forcing re-render after profile picture update');
                        setProfilePicture(newProfilePictureUrl);
                    }, 100);
                } catch (error) {
                    console.error('EditPatientProfile: Error refreshing user data after upload:', error);
                }
                
                Alert.alert('Success', 'Profile picture updated successfully!');
            } else {
                console.error('EditPatientProfile: Upload failed:', response.message || 'Unknown error');
                Alert.alert('Error', response.message || 'Failed to upload profile picture');
            }
        } catch (error: any) {
            console.error('EditPatientProfile: Error uploading profile picture:', error);
            console.error('EditPatientProfile: Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText
            });
            
            let errorMessage = 'Failed to upload profile picture. Please try again.';
            
            // Check for file size error
            if (error.response?.data?.message && error.response.data.message.includes('2048 kilobytes')) {
                errorMessage = 'Image file is too large. Please select a smaller image (under 2MB).';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            Alert.alert('Error', errorMessage);
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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setSaving(true);
        try {
            // console.log('EditPatientProfile: Starting profile update...');
            
            const updateData: any = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
            };

            if (dateOfBirth) {
                updateData.date_of_birth = dateOfBirth;
            }

            if (gender) {
                updateData.gender = gender;
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

            // console.log('EditPatientProfile: Update data:', updateData);

            const response = await apiService.patch('/profile', updateData);

            // console.log('EditPatientProfile: Profile update response:', response);

            if (response.success) {
                // Refresh user data to get the updated information
                await refreshUserData();
                
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
                console.error('EditPatientProfile: Profile update failed:', response.message);
                Alert.alert('Error', response.message || 'Failed to update profile');
            }
        } catch (error: any) {
            console.error('EditPatientProfile: Error updating profile:', error);
            console.error('EditPatientProfile: Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText
            });
            
            let errorMessage = 'Failed to update profile. Please try again.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            Alert.alert('Error', errorMessage);
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

                    {/* Personal Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Personal Information</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Date of Birth</Text>
                            <DatePickerField
                                value={dateOfBirth}
                                onChange={setDateOfBirth}
                                error={errors.dateOfBirth}
                                minimumDate={new Date(1900, 0, 1)}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Gender</Text>
                            <View style={styles.genderContainer}>
                                {['Male', 'Female', 'Other'].map((option) => (
                                    <TouchableOpacity
                                        key={option}
                                        style={[
                                            styles.genderOption,
                                            gender === option && styles.genderOptionSelected
                                        ]}
                                        onPress={() => setGender(option)}
                                    >
                                        <Text style={[
                                            styles.genderOptionText,
                                            gender === option && styles.genderOptionTextSelected
                                        ]}>
                                            {option}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {errors.gender && (
                                <Text style={styles.errorText}>{errors.gender}</Text>
                            )}
                        </View>
                    </View>

                    {/* Location Information */}
                    <View style={styles.section}>
                        <LocationPicker
                            country={country}
                            setCountry={setCountry}
                            city={city}
                            setCity={setCity}
                            errors={errors}
                        />
                    </View>

                    {/* Bio */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About Me</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Personal Bio</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Tell us about yourself, your health concerns, or any relevant information..."
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
    genderContainer: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    genderOption: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    genderOptionSelected: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    genderOptionText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    genderOptionTextSelected: {
        color: '#fff',
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