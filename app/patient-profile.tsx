import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import ProfilePictureDisplay from '../components/ProfilePictureDisplay';
import { useAuth } from '../contexts/AuthContext';

export default function PatientProfile() {
    const { user } = useAuth();

    if (!user) {
        return null;
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.profileSection}>
                    <ProfilePictureDisplay
                        imageUri={user.profile_picture}
                        profilePictureUrl={user.profile_picture_url}
                        size={120}
                    />
                    <Text style={styles.name}>{user.display_name}</Text>
                    <Text style={styles.email}>{user.email}</Text>
                </View>

                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => router.push('/edit-patient-profile')}
                >
                    <FontAwesome name="pencil" size={16} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Gender</Text>
                    <Text style={styles.infoValue}>{user.gender || 'Not specified'}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Date of Birth</Text>
                    <Text style={styles.infoValue}>
                        {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not specified'}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Location</Text>
                    <Text style={styles.infoValue}>
                        {user.city && user.country ? `${user.city}, ${user.country}` : 'Not specified'}
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: '#4CAF50',
        padding: 20,
        alignItems: 'center',
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginTop: 12,
    },
    email: {
        fontSize: 16,
        color: '#E8F5E9',
        marginTop: 4,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    editButtonText: {
        color: '#FFFFFF',
        marginLeft: 8,
        fontSize: 16,
    },
    infoSection: {
        padding: 20,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    infoLabel: {
        fontSize: 16,
        color: '#666666',
    },
    infoValue: {
        fontSize: 16,
        color: '#333333',
        fontWeight: '500',
    },
}); 