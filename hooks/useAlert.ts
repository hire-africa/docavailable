import { useState } from 'react';

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'processing';
  buttonText?: string;
}

export const useAlert = () => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttonText: 'OK'
  });

  const showAlert = (
    title: string, 
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'processing' = 'info',
    buttonText?: string
  ) => {
    setAlertState({
      visible: true,
      title,
      message,
      type,
      buttonText: buttonText || (type === 'success' ? 'OK' : type === 'error' ? 'Try Again' : 'OK')
    });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  const showSuccess = (title: string, message: string = '', buttonText?: string) => {
    showAlert(title, message, 'success', buttonText);
  };

  const showError = (title: string, message: string = '', buttonText?: string) => {
    showAlert(title, message, 'error', buttonText);
  };

  const showWarning = (title: string, message: string, buttonText?: string) => {
    showAlert(title, message, 'warning', buttonText);
  };

  const showInfo = (title: string, message: string, buttonText?: string) => {
    showAlert(title, message, 'info', buttonText);
  };

  const showProcessing = (title: string, message: string) => {
    showAlert(title, message, 'processing');
  };

  return {
    alertState,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showProcessing
  };
}; 