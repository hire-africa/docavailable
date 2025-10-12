import React from 'react';
import { ScrollView, TextInput, View } from 'react-native';

/**
 * Scrolls to the first field with an error in a form
 * @param scrollViewRef - Reference to the ScrollView component
 * @param errors - Object containing field errors
 * @param fieldRefs - Object containing references to form fields
 */
export const scrollToFirstError = (
  scrollViewRef: React.RefObject<ScrollView>,
  errors: Record<string, any>,
  fieldRefs: Record<string, React.RefObject<TextInput | View>>
) => {
  // Find the first field with an error
  const firstErrorField = Object.keys(errors).find(field => errors[field]);
  
  if (firstErrorField && fieldRefs[firstErrorField]?.current && scrollViewRef.current) {
    // Get the field reference
    const fieldRef = fieldRefs[firstErrorField].current;
    
    // Measure the field position and scroll to it
    fieldRef.measureLayout(
      scrollViewRef.current as any,
      (x, y, width, height) => {
        // Scroll to the field with some padding
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, y - 100), // 100px padding from top
          animated: true,
        });
      },
      (error) => {
        console.warn('Error measuring field layout:', error);
        // Fallback: scroll to top if measurement fails
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    );
  }
};

/**
 * Creates field references for form validation
 * @param fields - Array of field names
 * @returns Object with field references
 */
export const createFieldRefs = (fields: string[]) => {
  const refs: Record<string, React.RefObject<TextInput | View>> = {};
  fields.forEach(field => {
    refs[field] = React.createRef<TextInput | View>();
  });
  return refs;
};
