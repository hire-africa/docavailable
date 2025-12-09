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

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export interface FilterOptions {
    showOnlyOnline: boolean;
    selectedSpecialization: string;
    sortBy: string;
}

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    filters: FilterOptions;
    onApplyFilters: (filters: FilterOptions) => void;
    availableSpecializations: string[];
}

const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    onClose,
    filters,
    onApplyFilters,
    availableSpecializations
}) => {
    const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

    // Update local filters when modal opens with new filter values
    React.useEffect(() => {
        if (visible) {
            setLocalFilters(filters);
            console.log('FilterModal opened with:', {
                filters,
                specializationsCount: availableSpecializations?.length || 0
            });
        }
    }, [visible, filters, availableSpecializations]);

    const handleApply = () => {
        onApplyFilters(localFilters);
        onClose();
    };

    const handleReset = () => {
        const resetFilters: FilterOptions = {
            showOnlyOnline: false,
            selectedSpecialization: '',
            sortBy: 'name'
        };
        setLocalFilters(resetFilters);
    };

    const sortOptions = [
        { value: 'name', label: 'Name (A-Z)' },
        { value: 'rating', label: 'Rating (High to Low)' },
        { value: 'experience', label: 'Experience (High to Low)' },
        { value: 'specialization', label: 'Specialization (A-Z)' },
        { value: 'location', label: 'Location (A-Z)' }
    ];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <FontAwesome name="sliders" size={20} color="#4CAF50" style={{ marginRight: 10 }} />
                            <Text style={styles.headerTitle}>Filter & Sort Doctors</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <FontAwesome name="times" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                        {/* Availability Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Availability</Text>
                            <TouchableOpacity
                                style={[
                                    styles.toggleOption,
                                    localFilters.showOnlyOnline && styles.toggleOptionActive
                                ]}
                                onPress={() => setLocalFilters({
                                    ...localFilters,
                                    showOnlyOnline: !localFilters.showOnlyOnline
                                })}
                            >
                                <View style={styles.toggleLeft}>
                                    <FontAwesome 
                                        name="circle" 
                                        size={12} 
                                        color="#4CAF50" 
                                        style={styles.onlineIcon}
                                    />
                                    <Text style={[
                                        styles.toggleText,
                                        localFilters.showOnlyOnline && styles.toggleTextActive
                                    ]}>
                                        Show Online Doctors Only
                                    </Text>
                                </View>
                                <View style={[
                                    styles.checkbox,
                                    localFilters.showOnlyOnline && styles.checkboxActive
                                ]}>
                                    {localFilters.showOnlyOnline && (
                                        <FontAwesome name="check" size={14} color="#fff" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Specialization Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Specialization</Text>
                            <View style={styles.chipsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.chip,
                                        !localFilters.selectedSpecialization && styles.chipActive
                                    ]}
                                    onPress={() => setLocalFilters({
                                        ...localFilters,
                                        selectedSpecialization: ''
                                    })}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        !localFilters.selectedSpecialization && styles.chipTextActive
                                    ]}>
                                        All Specializations
                                    </Text>
                                </TouchableOpacity>
                                {availableSpecializations && availableSpecializations.length > 0 ? (
                                    availableSpecializations.map((spec) => (
                                        <TouchableOpacity
                                            key={spec}
                                            style={[
                                                styles.chip,
                                                localFilters.selectedSpecialization === spec && styles.chipActive
                                            ]}
                                            onPress={() => setLocalFilters({
                                                ...localFilters,
                                                selectedSpecialization: spec
                                            })}
                                        >
                                            <Text style={[
                                                styles.chipText,
                                                localFilters.selectedSpecialization === spec && styles.chipTextActive
                                            ]}>
                                                {spec}
                                            </Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={styles.noSpecializationsText}>
                                        Loading specializations...
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Sort By Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Sort By</Text>
                            {sortOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.sortOption,
                                        localFilters.sortBy === option.value && styles.sortOptionActive
                                    ]}
                                    onPress={() => setLocalFilters({
                                        ...localFilters,
                                        sortBy: option.value
                                    })}
                                >
                                    <Text style={[
                                        styles.sortOptionText,
                                        localFilters.sortBy === option.value && styles.sortOptionTextActive
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {localFilters.sortBy === option.value && (
                                        <FontAwesome name="check" size={18} color="#4CAF50" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={handleReset}
                        >
                            <Text style={styles.resetButtonText}>Reset All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={handleApply}
                        >
                            <Text style={styles.applyButtonText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: height * 0.85,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#222',
    },
    closeButton: {
        padding: 4,
    },
    scrollView: {
        flexGrow: 1,
    },
    section: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 16,
    },
    toggleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E8F5E8',
    },
    toggleOptionActive: {
        backgroundColor: '#E8F5E8',
        borderColor: '#4CAF50',
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    onlineIcon: {
        marginRight: 10,
    },
    toggleText: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    toggleTextActive: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#DDD',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    chipActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    chipText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    noSpecializationsText: {
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
        paddingVertical: 10,
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginBottom: 8,
        backgroundColor: '#F8F9FA',
    },
    sortOptionActive: {
        backgroundColor: '#E8F5E8',
    },
    sortOptionText: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    sortOptionTextActive: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    resetButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    applyButton: {
        flex: 2,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});

export default FilterModal;
