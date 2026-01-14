import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';

interface CheckoutWebViewModalProps {
    visible: boolean;
    checkoutUrl: string;
    onClose: () => void;
    onPaymentDetected?: () => void;
}

/**
 * A simple modal that displays the PayChangu checkout WebView.
 * The parent component handles payment detection via polling and closes this modal when done.
 */
export default function CheckoutWebViewModal({
    visible,
    checkoutUrl,
    onClose,
    onPaymentDetected,
}: CheckoutWebViewModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const webViewRef = useRef<WebView>(null);

    const handleLoadStart = () => {
        setIsLoading(true);
    };

    const handleLoadEnd = () => {
        setIsLoading(false);
    };

    const isSuccessUrl = (url: string) => {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        return lowerUrl.includes('paychangu/return') ||
            lowerUrl.includes('paychangu/callback') ||
            lowerUrl.includes('payments/status') ||
            lowerUrl.includes('payment-result') ||
            lowerUrl.includes('callback') ||
            lowerUrl.includes('return') ||
            lowerUrl.includes('status') ||
            lowerUrl.includes('success') ||
            lowerUrl.startsWith('com.docavailable.app://');
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('📨 WebView message received:', data);

            // Instantly detect success from backend's close_window message
            if (data.type === 'close_window' ||
                data.status === 'completed' ||
                data.status === 'success' ||
                data.type === 'payment_success') {
                console.log('✅ Success signal received from WebView message! Closing modal...');
                onPaymentDetected?.();
            }
        } catch (e) {
            // Not a JSON message or not for us
        }
    };

    const handleError = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;

        // If the error is on a success URL or local redirect, ignore it
        if (nativeEvent.url && isSuccessUrl(nativeEvent.url)) {
            console.log('✅ Success path detected, ignoring WebView error:', nativeEvent.description);
            onPaymentDetected?.(); // Treat as success if we reached the success path
            return;
        }

        console.error('❌ CheckoutWebViewModal error:', nativeEvent);
        setError(nativeEvent.description || 'Failed to load payment page');
        setIsLoading(false);
    };

    const handleNavigationStateChange = (navState: any) => {
        console.log('📍 CheckoutWebViewModal navigation:', navState.url);

        // Intercept navigation to any known success-related keyword
        if (navState.url && isSuccessUrl(navState.url)) {
            console.log('✅ Success navigation keyword detected, triggering closure');
            onPaymentDetected?.();
        }
    };

    // Reset state when modal opens
    React.useEffect(() => {
        if (visible) {
            setIsLoading(true);
            setError(null);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Modal Handle Line */}
                    <View style={styles.modalHandle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>Secure Payment</Text>
                        <View style={styles.placeholder} />
                    </View>

                    {/* Loading Overlay */}
                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#4CAF50" />
                            <Text style={styles.loadingText}>Loading payment page...</Text>
                        </View>
                    )}

                    {/* Error State */}
                    {error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorTitle}>Payment Error</Text>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={() => {
                                    setError(null);
                                    setIsLoading(true);
                                    webViewRef.current?.reload();
                                }}
                            >
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={onClose}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* WebView */
                        <WebView
                            ref={webViewRef}
                            source={{ uri: checkoutUrl }}
                            style={styles.webview}
                            onLoadStart={handleLoadStart}
                            onLoadEnd={handleLoadEnd}
                            onError={handleError}
                            onNavigationStateChange={handleNavigationStateChange}
                            onMessage={handleMessage}
                            onShouldStartLoadWithRequest={(request) => {
                                console.log('🔄 Checking if should load:', request.url);

                                if (isSuccessUrl(request.url)) {
                                    console.log('🚫 Blocking success/return URL from loading in WebView');
                                    onPaymentDetected?.();
                                    return false; // Block the request
                                }
                                return true;
                            }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            thirdPartyCookiesEnabled={true}
                            mixedContentMode="compatibility"
                            allowsBackForwardNavigationGestures={true}
                            userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker backdrop for better modal contrast
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 700,
        height: '92%',
        maxHeight: 900,
        backgroundColor: '#fff',
        borderRadius: 30,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 2,
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#fff',
    },
    closeButton: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        minWidth: 60,
    },
    closeText: {
        fontSize: 16,
        color: '#FF3B30',
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
    },
    placeholder: {
        minWidth: 60,
    },
    webview: {
        flex: 1,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#4CAF50',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF3B30',
        marginBottom: 12,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 10,
        marginBottom: 12,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        paddingHorizontal: 32,
        paddingVertical: 14,
    },
    cancelText: {
        color: '#666',
        fontSize: 16,
    },
});
