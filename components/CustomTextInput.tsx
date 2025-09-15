import React from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';

interface CustomTextInputProps extends TextInputProps {
  // Add any custom props here if needed
}

export default function CustomTextInput({ style, ...props }: CustomTextInputProps) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor="#999"
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#333',
  },
}); 