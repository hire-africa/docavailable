import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useProfilePictureCache } from '../hooks/useProfilePictureCache';

interface CacheManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

const CacheManagementModal: React.FC<CacheManagementModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    cacheStats,
    isLoading,
    clearCache,
    formatCacheSize,
    isCacheEmpty,
    getCacheUsagePercentage,
    getCacheStats,
  } = useProfilePictureCache();

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached profile pictures. Images will need to be downloaded again when you visit pages. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            await clearCache();
            Alert.alert('Success', 'Cache cleared successfully!');
          },
        },
      ]
    );
  };

  const handleRefreshStats = async () => {
    await getCacheStats();
  };

  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return 'N/A';
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cache Management</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Cache Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cache Overview</Text>
            
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading cache statistics...</Text>
              </View>
            ) : isCacheEmpty() ? (
              <View style={styles.emptyContainer}>
                <FontAwesome name="image" size={40} color="#ccc" />
                <Text style={styles.emptyText}>No cached images</Text>
                <Text style={styles.emptySubtext}>
                  Profile pictures will be cached automatically when you browse the app
                </Text>
              </View>
            ) : (
              <View style={styles.statsContainer}>
                {/* Cache Usage Bar */}
                <View style={styles.usageContainer}>
                  <Text style={styles.usageLabel}>Cache Usage</Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${getCacheUsagePercentage()}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.usageText}>
                    {getCacheUsagePercentage()}% used
                  </Text>
                </View>

                {/* Statistics */}
                <View style={styles.statRow}>
                  <FontAwesome name="images" size={16} color="#4CAF50" />
                  <Text style={styles.statLabel}>Total Images:</Text>
                  <Text style={styles.statValue}>
                    {cacheStats?.totalImages || 0}
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <FontAwesome name="hdd-o" size={16} color="#4CAF50" />
                  <Text style={styles.statLabel}>Total Size:</Text>
                  <Text style={styles.statValue}>
                    {formatCacheSize(cacheStats?.totalSize || 0)}
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <FontAwesome name="calendar" size={16} color="#4CAF50" />
                  <Text style={styles.statLabel}>Oldest Image:</Text>
                  <Text style={styles.statValue}>
                    {formatDate(cacheStats?.oldestImage || 0)}
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <FontAwesome name="clock-o" size={16} color="#4CAF50" />
                  <Text style={styles.statLabel}>Newest Image:</Text>
                  <Text style={styles.statValue}>
                    {formatDate(cacheStats?.newestImage || 0)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleRefreshStats}
              disabled={isLoading}
            >
              <FontAwesome name="refresh" size={16} color="#4CAF50" />
              <Text style={styles.actionButtonText}>Refresh Statistics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClearCache}
              disabled={isLoading || isCacheEmpty()}
            >
              <FontAwesome name="trash" size={16} color="#fff" />
              <Text style={[styles.actionButtonText, styles.clearButtonText]}>
                Clear All Cached Images
              </Text>
            </TouchableOpacity>
          </View>

          {/* Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Caching</Text>
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                • Profile pictures are automatically cached to improve loading speed
              </Text>
              <Text style={styles.infoText}>
                • Cached images are stored locally on your device
              </Text>
              <Text style={styles.infoText}>
                • Cache automatically expires after 7 days
              </Text>
              <Text style={styles.infoText}>
                • Maximum cache size is 50MB
              </Text>
              <Text style={styles.infoText}>
                • Clearing cache will free up storage space
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 20,
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usageContainer: {
    marginBottom: 20,
  },
  usageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  usageText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    backgroundColor: '#dc3545',
  },
  clearButtonText: {
    color: '#fff',
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default CacheManagementModal;
