import React from 'react';
import { DeviceEventEmitter } from 'react-native';

export interface CustomAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  buttons?: CustomAlertButton[];
  cancelable?: boolean;
}

class CustomAlertService {
  private static instance: CustomAlertService;

  static getInstance(): CustomAlertService {
    if (!CustomAlertService.instance) {
      CustomAlertService.instance = new CustomAlertService();
    }
    return CustomAlertService.instance;
  }

  /**
   * Show a custom alert dialog
   * Drop-in replacement for Alert.alert()
   */
  alert(
    title: string,
    message?: string,
    buttons?: CustomAlertButton[],
    options?: { cancelable?: boolean; type?: 'success' | 'error' | 'warning' | 'info' | 'confirm' }
  ): void {
    const alertOptions: CustomAlertOptions = {
      title,
      message: message || '',
      type: options?.type || 'info',
      buttons: buttons || [{ text: 'OK' }],
      cancelable: options?.cancelable ?? true,
    };

    DeviceEventEmitter.emit('customAlert:show', alertOptions);
  }

  /**
   * Show a success alert
   */
  success(title: string, message: string, onClose?: () => void): void {
    this.alert(title, message, [{ text: 'OK', onPress: onClose }], { type: 'success' });
  }

  /**
   * Show an error alert
   */
  error(title: string, message: string, onClose?: () => void): void {
    this.alert(title, message, [{ text: 'OK', onPress: onClose }], { type: 'error' });
  }

  /**
   * Show a warning alert
   */
  warning(title: string, message: string, onClose?: () => void): void {
    this.alert(title, message, [{ text: 'OK', onPress: onClose }], { type: 'warning' });
  }

  /**
   * Show an info alert
   */
  info(title: string, message: string, onClose?: () => void): void {
    this.alert(title, message, [{ text: 'OK', onPress: onClose }], { type: 'info' });
  }

  /**
   * Show a confirmation dialog with Yes/No buttons
   */
  confirm(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText: string = 'Yes',
    cancelText: string = 'No'
  ): void {
    this.alert(
      title,
      message,
      [
        { text: cancelText, onPress: onCancel, style: 'cancel' },
        { text: confirmText, onPress: onConfirm, style: 'default' },
      ],
      { type: 'confirm', cancelable: true }
    );
  }
}

export default CustomAlertService.getInstance();
