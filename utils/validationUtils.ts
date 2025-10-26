export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export class ValidationUtils {
  /**
   * Validate a single field against its rules
   */
  static validateField(value: any, rules: ValidationRule): string | null {
    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return rules.message || 'This field is required.';
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // Min length validation
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      return rules.message || `Must be at least ${rules.minLength} characters long.`;
    }

    // Max length validation
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      return rules.message || `Must be no more than ${rules.maxLength} characters long.`;
    }

    // Pattern validation
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      return rules.message || 'Invalid format.';
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  }

  /**
   * Validate multiple fields against their rules
   */
  static validateFields(data: any, rules: ValidationRules): { [key: string]: string } {
    const errors: { [key: string]: string } = {};

    Object.keys(rules).forEach(field => {
      const fieldRules = rules[field];
      const fieldValue = data[field];
      const error = this.validateField(fieldValue, fieldRules);
      
      if (error) {
        errors[field] = error;
      }
    });

    return errors;
  }

  /**
   * Common validation patterns
   */
  static patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\+]?[1-9][\d]{0,15}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    name: /^[a-zA-Z\s'-]+$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    numeric: /^\d+$/,
    verificationCode: /^\d{6}$/
  };

  /**
   * Common validation rules for signup forms
   */
  static getSignUpRules(userType: 'patient' | 'doctor' | 'admin'): ValidationRules {
    const baseRules: ValidationRules = {
      firstName: {
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: this.patterns.name,
        message: 'First name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes.'
      },
      surname: {
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: this.patterns.name,
        message: 'Last name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes.'
      },
      email: {
        required: true,
        pattern: this.patterns.email,
        message: 'Please enter a valid email address.'
      },
      password: {
        required: true,
        minLength: 8,
        pattern: this.patterns.strongPassword,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.'
      },
      dateOfBirth: {
        required: true,
        custom: (value: string) => {
          if (!value) return 'Date of birth is required.';
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            // Adjust age if birthday hasn't occurred this year
            return age - 1 < 13 ? 'You must be at least 13 years old to register.' : null;
          }
          
          return age < 13 ? 'You must be at least 13 years old to register.' : null;
        }
      },
      gender: {
        required: true,
        message: 'Please select a gender.'
      },
      country: {
        required: true,
        message: 'Please select a country.'
      },
      city: {
        required: true,
        minLength: 2,
        maxLength: 100,
        message: 'City must be 2-100 characters long.'
      },
      acceptPolicies: {
        required: true,
        custom: (value: boolean) => value ? null : 'You must accept the platform policies.',
        message: 'You must accept the platform policies.'
      }
    };

    // Add doctor-specific rules
    if (userType === 'doctor') {
      return {
        ...baseRules,
        specializations: {
          required: true,
          custom: (value: string[]) => {
            if (!value || value.length === 0) {
              return 'Please select at least one specialization.';
            }
            if (value.length > 5) {
              return 'You can select up to 5 specializations.';
            }
            return null;
          }
        },
        yearsOfExperience: {
          required: true,
          custom: (value: number) => {
            if (!value && value !== 0) return 'Years of experience is required.';
            if (value < 0) return 'Years of experience cannot be negative.';
            if (value > 50) return 'Years of experience cannot exceed 50.';
            return null;
          }
        },
        professionalBio: {
          required: true,
          minLength: 50,
          maxLength: 1000,
          message: 'Professional bio must be 50-1000 characters long.'
        },
        languagesSpoken: {
          required: true,
          custom: (value: string[]) => {
            if (!value || value.length === 0) {
              return 'Please select at least one language.';
            }
            if (value.length > 10) {
              return 'You can select up to 10 languages.';
            }
            return null;
          }
        }
      };
    }

    return baseRules;
  }

  /**
   * Validate email verification code
   */
  static validateVerificationCode(code: string): string | null {
    if (!code || code.trim() === '') {
      return 'Verification code is required.';
    }
    
    if (!this.patterns.verificationCode.test(code)) {
      return 'Verification code must be exactly 6 digits.';
    }
    
    return null;
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): { score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Lowercase letter');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Uppercase letter');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Number');
    }

    if (/[@$!%*?&]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Special character (@$!%*?&)');
    }

    return { score, feedback };
  }

  /**
   * Get password strength description
   */
  static getPasswordStrengthDescription(score: number): string {
    switch (score) {
      case 0:
      case 1:
        return 'Very Weak';
      case 2:
        return 'Weak';
      case 3:
        return 'Fair';
      case 4:
        return 'Good';
      case 5:
        return 'Strong';
      default:
        return 'Unknown';
    }
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file: any, options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    required?: boolean;
  } = {}): string | null {
    const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'], required = false } = options;

    if (required && !file) {
      return 'File upload is required.';
    }

    if (!file) {
      return null; // Not required and no file provided
    }

    if (file.size && file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB.`;
    }

    if (file.type && !allowedTypes.includes(file.type)) {
      return `File type must be one of: ${allowedTypes.join(', ')}.`;
    }

    return null;
  }
}

export default ValidationUtils;


