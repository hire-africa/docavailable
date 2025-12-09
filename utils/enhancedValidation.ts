import React from 'react';
import { ScrollView, TextInput, View, Alert } from 'react-native';
import { scrollToFirstError } from './scrollToError';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  firstErrorField?: string;
}

export interface ValidationConfig {
  scrollViewRef: React.RefObject<ScrollView>;
  fieldRefs: Record<string, React.RefObject<TextInput | View>>;
  showAlert?: boolean;
  alertTitle?: string;
  scrollDelay?: number;
}

export class EnhancedValidation {
  /**
   * Validate form data and automatically scroll to first error
   */
  static validateAndScroll(
    errors: Record<string, any>,
    config: ValidationConfig
  ): boolean {
    const { scrollViewRef, fieldRefs, showAlert = false, alertTitle = 'Validation Error', scrollDelay = 100 } = config;
    
    // Filter out null/undefined errors
    const validErrors = Object.keys(errors).reduce((acc, key) => {
      if (errors[key]) {
        acc[key] = errors[key];
      }
      return acc;
    }, {} as Record<string, string>);

    const hasErrors = Object.keys(validErrors).length > 0;

    if (hasErrors) {
      // Show alert if requested
      if (showAlert) {
        const firstError = Object.values(validErrors)[0];
        Alert.alert(alertTitle, firstError);
      }

      // Scroll to first error with delay to ensure DOM is ready
      setTimeout(() => {
        this.scrollToError(scrollViewRef, validErrors, fieldRefs);
      }, scrollDelay);

      return false;
    }

    return true;
  }

  /**
   * Enhanced scroll to error with better error handling
   */
  static scrollToError(
    scrollViewRef: React.RefObject<ScrollView>,
    errors: Record<string, string>,
    fieldRefs: Record<string, React.RefObject<TextInput | View>>
  ): void {
    const firstErrorField = Object.keys(errors)[0];
    
    console.log('🔍 EnhancedValidation: Attempting to scroll to error field:', firstErrorField);
    console.log('🔍 Available field refs:', Object.keys(fieldRefs));
    console.log('🔍 Errors:', errors);
    
    if (!firstErrorField || !scrollViewRef.current) {
      console.warn('EnhancedValidation: Cannot scroll - missing scrollView or error field');
      return;
    }

    const fieldRef = fieldRefs[firstErrorField];
    
    if (!fieldRef?.current) {
      console.warn(`EnhancedValidation: Field ref not found for ${firstErrorField}, available refs:`, Object.keys(fieldRefs));
      console.warn('EnhancedValidation: Scrolling to top as fallback');
      // Fallback: scroll to top
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
      return;
    }

    console.log('✅ EnhancedValidation: Found field ref for', firstErrorField, 'attempting scroll...');
    
    try {
      // Use the existing scrollToFirstError utility
      scrollToFirstError(scrollViewRef, errors, fieldRefs);
      console.log('✅ EnhancedValidation: Successfully called scrollToFirstError');
    } catch (error) {
      console.warn('EnhancedValidation: Error during scroll, falling back to top:', error);
      // Fallback: scroll to top
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }

  /**
   * Validate required fields and scroll to first missing field
   */
  static validateRequiredFields(
    data: Record<string, any>,
    requiredFields: string[],
    config: ValidationConfig
  ): boolean {
    const errors: Record<string, string> = {};

    requiredFields.forEach(field => {
      const value = data[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors[field] = `${this.formatFieldName(field)} is required`;
      }
    });

    return this.validateAndScroll(errors, config);
  }

  /**
   * Validate email format and scroll if invalid
   */
  static validateEmail(
    email: string,
    config: ValidationConfig
  ): boolean {
    const errors: Record<string, string> = {};
    
    if (!email || email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    return this.validateAndScroll(errors, config);
  }

  /**
   * Validate password strength and scroll if invalid
   */
  static validatePassword(
    password: string,
    config: ValidationConfig
  ): boolean {
    const errors: Record<string, string> = {};
    
    if (!password || password.trim() === '') {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    return this.validateAndScroll(errors, config);
  }

  /**
   * Validate verification code and scroll if invalid
   */
  static validateVerificationCode(
    code: string,
    config: ValidationConfig
  ): boolean {
    const errors: Record<string, string> = {};
    
    if (!code || code.trim() === '') {
      errors.verificationCode = 'Verification code is required';
    } else if (code.length !== 6) {
      errors.verificationCode = 'Verification code must be 6 digits';
    } else if (!/^\d{6}$/.test(code)) {
      errors.verificationCode = 'Verification code must contain only numbers';
    }

    return this.validateAndScroll(errors, config);
  }

  /**
   * Validate file upload and scroll if invalid
   */
  static validateFileUpload(
    file: any,
    options: {
      required?: boolean;
      maxSize?: number;
      allowedTypes?: string[];
      fieldName?: string;
    },
    config: ValidationConfig
  ): boolean {
    const { required = false, maxSize = 5 * 1024 * 1024, allowedTypes = [], fieldName = 'file' } = options;
    const errors: Record<string, string> = {};

    if (required && !file) {
      errors[fieldName] = `${this.formatFieldName(fieldName)} is required`;
    } else if (file) {
      // Check file size
      if (file.size && file.size > maxSize) {
        errors[fieldName] = `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`;
      }
      
      // Check file type
      if (allowedTypes.length > 0 && file.type && !allowedTypes.includes(file.type)) {
        const allowedExtensions = allowedTypes.map(type => type.split('/')[1]).join(', ');
        errors[fieldName] = `Only ${allowedExtensions} files are allowed`;
      }
    }

    return this.validateAndScroll(errors, config);
  }

  /**
   * Show validation error with scroll
   */
  static showValidationError(
    fieldName: string,
    message: string,
    config: ValidationConfig
  ): void {
    const errors = { [fieldName]: message };
    this.validateAndScroll(errors, { ...config, showAlert: true });
  }

  /**
   * Format field name for display
   */
  private static formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Create validation config helper
   */
  static createConfig(
    scrollViewRef: React.RefObject<ScrollView>,
    fieldRefs: Record<string, React.RefObject<TextInput | View>>,
    options?: {
      showAlert?: boolean;
      alertTitle?: string;
      scrollDelay?: number;
    }
  ): ValidationConfig {
    return {
      scrollViewRef,
      fieldRefs,
      showAlert: options?.showAlert ?? false,
      alertTitle: options?.alertTitle ?? 'Validation Error',
      scrollDelay: options?.scrollDelay ?? 100
    };
  }

  /**
   * Scroll to top of form (useful for general errors)
   */
  static scrollToTop(scrollViewRef: React.RefObject<ScrollView>): void {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }

  /**
   * Scroll to specific field
   */
  static scrollToField(
    fieldName: string,
    scrollViewRef: React.RefObject<ScrollView>,
    fieldRefs: Record<string, React.RefObject<TextInput | View>>
  ): void {
    const errors = { [fieldName]: 'Focus field' };
    this.scrollToError(scrollViewRef, errors, fieldRefs);
  }
}

export default EnhancedValidation;
