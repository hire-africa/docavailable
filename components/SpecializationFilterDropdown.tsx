import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SpecializationFilterDropdownProps {
  selectedSpecialization?: string;
  onSelectSpecialization: (specialization: string) => void;
  specializations?: string[];
}

const SpecializationFilterDropdown: React.FC<SpecializationFilterDropdownProps> = ({ 
  selectedSpecialization, 
  onSelectSpecialization, 
  specializations = [] 
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Filter by Specialization</Text>
      <TouchableOpacity style={styles.dropdown}>
        <Text style={styles.dropdownText}>
          {selectedSpecialization || 'All Specializations'}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  arrow: {
    fontSize: 12,
    color: '#666',
  },
});

export default SpecializationFilterDropdown; 