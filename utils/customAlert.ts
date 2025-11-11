/**
 * Custom Alert Utility
 * Drop-in replacement for React Native's Alert.alert()
 * 
 * Usage:
 * import { Alert } from '../utils/customAlert';
 * 
 * // Simple alert
 * Alert.alert('Title', 'Message');
 * 
 * // Alert with buttons
 * Alert.alert('Title', 'Message', [
 *   { text: 'Cancel', onPress: () => console.log('Cancel') },
 *   { text: 'OK', onPress: () => console.log('OK') }
 * ]);
 * 
 * // Typed alerts
 * Alert.success('Success!', 'Operation completed');
 * Alert.error('Error', 'Something went wrong');
 * Alert.warning('Warning', 'Please be careful');
 * Alert.confirm('Confirm', 'Are you sure?', () => console.log('Confirmed'));
 */

import customAlertService, { CustomAlertButton } from '../services/customAlertService';

export const Alert = {
  /**
   * Drop-in replacement for Alert.alert()
   */
  alert: (
    title: string,
    message?: string,
    buttons?: CustomAlertButton[],
    options?: { 
      cancelable?: boolean; 
      type?: 'success' | 'error' | 'warning' | 'info' | 'confirm' 
    }
  ) => {
    customAlertService.alert(title, message, buttons, options);
  },

  /**
   * Show a success alert
   */
  success: (title: string, message: string, onClose?: () => void) => {
    customAlertService.success(title, message, onClose);
  },

  /**
   * Show an error alert
   */
  error: (title: string, message: string, onClose?: () => void) => {
    customAlertService.error(title, message, onClose);
  },

  /**
   * Show a warning alert
   */
  warning: (title: string, message: string, onClose?: () => void) => {
    customAlertService.warning(title, message, onClose);
  },

  /**
   * Show an info alert
   */
  info: (title: string, message: string, onClose?: () => void) => {
    customAlertService.info(title, message, onClose);
  },

  /**
   * Show a confirmation dialog
   */
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    customAlertService.confirm(title, message, onConfirm, onCancel, confirmText, cancelText);
  },
};

export default Alert;
