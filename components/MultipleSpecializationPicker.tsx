import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
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

// Main specializations only (no sub-specializations)
const mainSpecializations = [
    'General Medicine',
    'Heart & Blood (Cardiology)',
    'Children\'s Health',
    'Women\'s Health',
    'Brain & Nerves',
    'Bones & Joints',
    'Mental Health',
    'Skin Care',
    'Eye Care',
    'Ear, Nose & Throat',
    'Sexual Health',
    'Oncology (Cancer Care)',
    'Endocrinology (Hormones & Metabolism)',
    'Gastroenterology (Digestive Health)'
];

interface MultipleSpecializationPickerProps {
    selectedSpecializations: string[];
    onSpecializationsChange: (specializations: string[]) => void;
    error?: string;
    maxSelections?: number;
}

const MultipleSpecializationPicker: React.FC<MultipleSpecializationPickerProps> = ({
    selectedSpecializations,
    onSpecializationsChange,
    error,
    maxSelections = 3
}) => {
    const [isModalVisible, setModalVisible] = useState(false);

    const handleSpecializationToggle = (specialization: string) => {
        let newSpecializations: string[];
        
        if (selectedSpecializations.includes(specialization)) {
            // Remove specialization
            newSpecializations = selectedSpecializations.filter(s => s !== specialization);
        } else {
            // Add specialization if under limit
            if (selectedSpecializations.length < maxSelections) {
                newSpecializations = [...selectedSpecializations, specialization];
            } else {
                // Don't add if at limit
                return;
            }
        }
        
        onSpecializationsChange(newSpecializations);
    };

    const removeSpecialization = (specialization: string) => {
        const newSpecializations = selectedSpecializations.filter(s => s !== specialization);
        onSpecializationsChange(newSpecializations);
    };

    const getDisplayText = () => {
        if (selectedSpecializations.length === 0) {
            return 'Select your specializations (up to 3)';
        }
        if (selectedSpecializations.length === 1) {
            return selectedSpecializations[0];
        }
        return `${selectedSpecializations.length} specializations selected`;
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.pickerButton, error && styles.pickerButtonError]}
                onPress={() => setModalVisible(true)}
            >
                <Text style={[styles.pickerButtonText, selectedSpecializations.length === 0 && styles.placeholderText]}>
                    {getDisplayText()}
                </Text>
                <FontAwesome name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>

            {/* Display selected specializations as chips */}
            {selectedSpecializations.length > 0 && (
                <View style={styles.chipsContainer}>
                    {selectedSpecializations.map((spec, index) => (
                        <View key={index} style={styles.chip}>
                            <Text style={styles.chipText}>{spec}</Text>
                            <TouchableOpacity
                                style={styles.chipRemoveButton}
                                onPress={() => removeSpecialization(spec)}
                            >
                                <FontAwesome name="times" size={12} color="#666" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Selection count indicator */}
            {selectedSpecializations.length > 0 && (
                <Text style={styles.selectionCount}>
                    {selectedSpecializations.length}/{maxSelections} specializations selected
                </Text>
            )}

            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Specializations</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                                <FontAwesome name="times" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.modalSubtitle}>
                            Choose up to {maxSelections} specializations
                        </Text>
                        
                        <ScrollView style={styles.modalScrollView}>
                            {mainSpecializations.map((specialization) => (
                                <TouchableOpacity
                                    key={specialization}
                                    style={[
                                        styles.modalItem,
                                        selectedSpecializations.includes(specialization) && styles.modalItemSelected,
                                        !selectedSpecializations.includes(specialization) && 
                                        selectedSpecializations.length >= maxSelections && styles.modalItemDisabled
                                    ]}
                                    onPress={() => handleSpecializationToggle(specialization)}
                                    disabled={!selectedSpecializations.includes(specialization) && selectedSpecializations.length >= maxSelections}
                                >
                                    <Text style={[
                                        styles.modalItemText,
                                        selectedSpecializations.includes(specialization) && styles.modalItemTextSelected,
                                        !selectedSpecializations.includes(specialization) && 
                                        selectedSpecializations.length >= maxSelections && styles.modalItemTextDisabled
                                    ]}>
                                        {specialization}
                                    </Text>
                                    {selectedSpecializations.includes(specialization) && (
                                        <FontAwesome name="check" size={18} color="#fff" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.doneButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.doneButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        marginBottom: 8,
    },
    pickerButtonError: {
        borderColor: '#FF3B30',
    },
    pickerButtonText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    placeholderText: {
        color: '#999',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    chipText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        marginRight: 6,
    },
    chipRemoveButton: {
        padding: 2,
    },
    selectionCount: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        marginLeft: 4,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: isWeb ? Math.min(500, width - 40) : width - 40,
        maxHeight: 600,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
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
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalItemSelected: {
        backgroundColor: '#4CAF50',
    },
    modalItemDisabled: {
        backgroundColor: '#F5F5F5',
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
    },
    modalItemTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    modalItemTextDisabled: {
        color: '#999',
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    doneButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default MultipleSpecializationPicker; 