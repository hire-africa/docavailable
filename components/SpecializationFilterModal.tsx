import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import {
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface SpecializationFilterModalProps {
    visible: boolean;
    onClose: () => void;
    selectedSpecialization: string;
    onSpecializationChange: (specialization: string) => void;
    availableSpecializations: string[];
}

const SpecializationFilterModal: React.FC<SpecializationFilterModalProps> = ({
    visible,
    onClose,
    selectedSpecialization,
    onSpecializationChange,
    availableSpecializations
}) => {
    const handleSpecializationSelect = (specialization: string) => {
        onSpecializationChange(specialization);
        onClose();
    };

    const handleClearFilter = () => {
        onSpecializationChange('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Specialization</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <FontAwesome name="times" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.modalScrollView}>
                        {/* Clear Filter Option */}
                        <TouchableOpacity
                            style={[
                                styles.modalItem,
                                !selectedSpecialization && styles.modalItemSelected
                            ]}
                            onPress={handleClearFilter}
                        >
                            <Text style={[
                                styles.modalItemText,
                                !selectedSpecialization && styles.modalItemTextSelected
                            ]}>
                                All Specializations
                            </Text>
                            {!selectedSpecialization && (
                                <FontAwesome name="check" size={18} color="#fff" />
                            )}
                        </TouchableOpacity>

                        {/* Specialization Options */}
                        {availableSpecializations.map((specialization) => (
                            <TouchableOpacity
                                key={specialization}
                                style={[
                                    styles.modalItem,
                                    selectedSpecialization === specialization && styles.modalItemSelected
                                ]}
                                onPress={() => handleSpecializationSelect(specialization)}
                            >
                                <Text style={[
                                    styles.modalItemText,
                                    selectedSpecialization === specialization && styles.modalItemTextSelected
                                ]}>
                                    {specialization}
                                </Text>
                                {selectedSpecialization === specialization && (
                                    <FontAwesome name="check" size={18} color="#fff" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: isWeb ? Math.min(500, width - 40) : width - 40,
        maxHeight: 500,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 5,
    },
    modalScrollView: {
        maxHeight: 400,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalItemSelected: {
        backgroundColor: '#4CAF50',
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
    },
    modalItemTextSelected: {
        color: '#fff',
    },
});

export default SpecializationFilterModal; 