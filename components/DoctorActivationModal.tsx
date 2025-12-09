import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import authService from '@/services/authService';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface DoctorActivationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userData: any;
}

const DoctorActivationModal: React.FC<DoctorActivationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  userData
}) => {
  const [nationalId, setNationalId] = useState<string | null>(null);
  const [medicalDegree, setMedicalDegree] = useState<string | null>(null);
  const [medicalLicence, setMedicalLicence] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImagePicker = async (type: 'nationalId' | 'medicalDegree' | 'medicalLicence') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsUploading(true);
        
        // Convert to base64
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        switch (type) {
          case 'nationalId':
            setNationalId(base64);
            break;
          case 'medicalDegree':
            setMedicalDegree(base64);
            break;
          case 'medicalLicence':
            setMedicalLicence(base64);
            break;
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!nationalId || !medicalDegree || !medicalLicence) {
      Alert.alert('Missing Documents', 'Please upload all required documents to activate your account.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const updateData = {
        national_id: nationalId,
        medical_degree: medicalDegree,
        medical_licence: medicalLicence,
        status: 'active' // Activate the account
      };

      const response = await authService.updateProfile(updateData);
      
      if (response.success) {
        Alert.alert(
          'Account Activated!',
          'Your account has been successfully activated. You can now receive patient requests.',
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess();
                onClose();
              }
            }
          ]
        );
      } else {
        throw new Error(response.message || 'Failed to activate account');
      }
    } catch (error) {
      console.error('Error activating account:', error);
      Alert.alert('Error', 'Failed to activate account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDocumentUpload = (
    title: string,
    description: string,
    value: string | null,
    onPress: () => void,
    icon: string
  ) => (
    <View style={styles.documentSection}>
      <Text style={styles.documentTitle}>{title}</Text>
      <Text style={styles.documentDescription}>{description}</Text>
      
      <TouchableOpacity
        style={[styles.uploadButton, value && styles.uploadButtonSuccess]}
        onPress={onPress}
        disabled={isUploading}
      >
        <FontAwesome
          name={value ? 'check-circle' : icon}
          size={24}
          color={value ? '#4CAF50' : '#666'}
        />
        <Text style={[styles.uploadButtonText, value && styles.uploadButtonTextSuccess]}>
          {value ? 'Document Uploaded' : 'Upload Document'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Activate Your Account</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.introSection}>
            <FontAwesome name="user-md" size={48} color="#2196F3" />
            <Text style={styles.introTitle}>Complete Your Doctor Profile</Text>
            <Text style={styles.introText}>
              To activate your account and start receiving patient requests, please upload the following documents:
            </Text>
          </View>

          {renderDocumentUpload(
            'National ID or Passport',
            'Upload a clear photo of your national ID or passport',
            nationalId,
            () => handleImagePicker('nationalId'),
            'id-card'
          )}

          {renderDocumentUpload(
            'Medical Degree Certificate',
            'Upload your medical degree or qualification certificate',
            medicalDegree,
            () => handleImagePicker('medicalDegree'),
            'graduation-cap'
          )}

          {renderDocumentUpload(
            'Medical License',
            'Upload your current medical practice license',
            medicalLicence,
            () => handleImagePicker('medicalLicence'),
            'certificate'
          )}

          <View style={styles.noteSection}>
            <FontAwesome name="info-circle" size={20} color="#2196F3" />
            <Text style={styles.noteText}>
              All documents will be securely stored and verified by our admin team. 
              Your account will be activated once verification is complete.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!nationalId || !medicalDegree || !medicalLicence || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!nationalId || !medicalDegree || !medicalLicence || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Activate Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  introSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  documentSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  uploadButtonSuccess: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8e9',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  uploadButtonTextSuccess: {
    color: '#4CAF50',
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  noteText: {
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DoctorActivationModal;
