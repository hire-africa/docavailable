import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

interface CheckoutWebViewModalProps {
    visible: boolean;
    checkoutUrl: string;
    onClose: () => void;
}

/**
 * A simple modal that displays the PayChangu checkout WebView.
 * The parent component handles payment detection via polling and closes this modal when done.
 */
export default function CheckoutWebViewModal({
    visible,
    checkoutUrl,
    onClose,
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

    const handleError = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        console.error('❌ CheckoutWebViewModal error:', nativeEvent);
        setError(nativeEvent.description || 'Failed to load payment page');
        setIsLoading(false);
    };

    const handleNavigationStateChange = (navState: any) => {
        console.log('📍 CheckoutWebViewModal navigation:', navState.url);
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
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
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
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        thirdPartyCookiesEnabled={true}
                        mixedContentMode="compatibility"
                        allowsBackForwardNavigationGestures={true}
                        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
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
