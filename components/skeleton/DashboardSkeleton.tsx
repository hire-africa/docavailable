import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { SkeletonBox, SkeletonCircle, SkeletonText } from './';

const { width } = Dimensions.get('window');

interface DashboardSkeletonProps {
  tab?: 'home' | 'discover' | 'appointments' | 'profile';
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  tab = 'home',
}) => {
  const renderHomeTab = () => (
    <View style={styles.tabContent}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <SkeletonText
          lines={2}
          lineHeight={20}
          spacing={8}
          width={width * 0.7}
          lastLineWidth={width * 0.5}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <SkeletonBox width={width * 0.45} height={100} borderRadius={12} />
        <SkeletonBox width={width * 0.45} height={100} borderRadius={12} />
      </View>

      {/* Recent Appointments */}
      <View style={styles.section}>
        <SkeletonBox width={150} height={20} style={styles.sectionTitle} />
        <View style={styles.appointmentList}>
          {Array.from({ length: 3 }, (_, index) => (
            <View key={index} style={styles.appointmentCard}>
              <SkeletonCircle size={50} />
              <View style={styles.appointmentInfo}>
                <SkeletonText
                  lines={2}
                  lineHeight={16}
                  spacing={4}
                  width={width * 0.6}
                  lastLineWidth={width * 0.4}
                />
              </View>
              <SkeletonBox width={60} height={24} borderRadius={12} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderDiscoverTab = () => (
    <View style={styles.tabContent}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SkeletonBox width="100%" height={50} borderRadius={25} />
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBox
            key={index}
            width={80}
            height={32}
            borderRadius={16}
            style={styles.filterPill}
          />
        ))}
      </View>

      {/* Doctors List */}
      <View style={styles.doctorsList}>
        {Array.from({ length: 5 }, (_, index) => (
          <View key={index} style={styles.doctorCard}>
            <SkeletonCircle size={60} />
            <View style={styles.doctorInfo}>
              <SkeletonText
                lines={2}
                lineHeight={18}
                spacing={4}
                width={width * 0.5}
                lastLineWidth={width * 0.3}
              />
              <SkeletonBox width={100} height={14} style={styles.specialization} />
            </View>
            <View style={styles.doctorActions}>
              <SkeletonBox width={80} height={32} borderRadius={16} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderAppointmentsTab = () => (
    <View style={styles.tabContent}>
      {/* Appointments List */}
      <View style={styles.appointmentsList}>
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} style={styles.appointmentCard}>
            <SkeletonCircle size={50} />
            <View style={styles.appointmentInfo}>
              <SkeletonText
                lines={3}
                lineHeight={16}
                spacing={4}
                width={width * 0.6}
                lastLineWidth={width * 0.4}
              />
            </View>
            <SkeletonBox width={60} height={24} borderRadius={12} />
          </View>
        ))}
      </View>
    </View>
  );

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <SkeletonCircle size={80} />
        <View style={styles.profileInfo}>
          <SkeletonText
            lines={2}
            lineHeight={20}
            spacing={8}
            width={width * 0.6}
            lastLineWidth={width * 0.4}
          />
        </View>
      </View>

      {/* Profile Sections */}
      <View style={styles.profileSections}>
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} style={styles.profileSection}>
            <SkeletonBox width={120} height={20} style={styles.sectionTitle} />
            <SkeletonText
              lines={2}
              lineHeight={16}
              spacing={4}
              width="100%"
              lastLineWidth="70%"
            />
          </View>
        ))}
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (tab) {
      case 'discover':
        return renderDiscoverTab();
      case 'appointments':
        return renderAppointmentsTab();
      case 'profile':
        return renderProfileTab();
      default:
        return renderHomeTab();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonBox width={120} height={24} style={styles.headerTitle} />
        <SkeletonCircle size={40} />
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} style={styles.navItem}>
            <SkeletonBox width={24} height={24} borderRadius={12} />
            <SkeletonBox width={40} height={12} style={styles.navLabel} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E9EE',
  },
  headerTitle: {
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    borderRadius: 4,
  },
  appointmentList: {
    gap: 12,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchContainer: {
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  filterPill: {
    // Additional filter pill styles
  },
  doctorsList: {
    gap: 16,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  specialization: {
    marginTop: 4,
    borderRadius: 2,
  },
  doctorActions: {
    // Additional doctor actions styles
  },
  appointmentsList: {
    gap: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileSections: {
    gap: 20,
  },
  profileSection: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E9EE',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1E9EE',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    borderRadius: 2,
  },
});
