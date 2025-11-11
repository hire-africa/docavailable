import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import CustomAlertDialog, { AlertButton } from './CustomAlertDialog';
import { CustomAlertOptions } from '../services/customAlertService';

export default function CustomAlertProvider({ children }: { children: React.ReactNode }) {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertOptions, setAlertOptions] = useState<CustomAlertOptions>({
    title: '',
    message: '',
    type: 'info',
    buttons: [{ text: 'OK' }],
    cancelable: true,
  });

  useEffect(() => {
    const handleShow = (options: CustomAlertOptions) => {
      setAlertOptions(options);
      setAlertVisible(true);
    };

    const subscription = DeviceEventEmitter.addListener('customAlert:show', handleShow);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleClose = () => {
    setAlertVisible(false);
  };

  return (
    <>
      {children}
      <CustomAlertDialog
        visible={alertVisible}
        onClose={handleClose}
        title={alertOptions.title}
        message={alertOptions.message}
        type={alertOptions.type}
        buttons={alertOptions.buttons}
        cancelable={alertOptions.cancelable}
      />
    </>
  );
}
