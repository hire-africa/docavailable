import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BlogArticle() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blog</Text>
        <TouchableOpacity style={styles.shareButton}>
          <FontAwesome name="share" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <Image 
          source={require('../assets/images/your phone.jpg')} 
          style={styles.heroImage}
        />

        {/* Article Content */}
        <View style={styles.articleContainer}>
          {/* Title */}
          <Text style={styles.articleTitle}>
            Your Phone = Your Doctor: 7 Health Services You Didn't Know You Could Get Online
          </Text>

          {/* Meta Info */}
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <FontAwesome name="calendar" size={14} color="#888" />
              <Text style={styles.metaText}>December 2024</Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome name="clock-o" size={14} color="#888" />
              <Text style={styles.metaText}>5 min read</Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome name="user" size={14} color="#888" />
              <Text style={styles.metaText}>Health Team</Text>
            </View>
          </View>

          {/* Article Body */}
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>
              Let's be real—most people think telehealth is just for cold symptoms or getting quick prescriptions. But modern telemedical apps offer way more than that. If you've got a phone and an internet connection, here are 7 services you can access without stepping foot in a clinic:
            </Text>

            {/* Service 1 */}
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceIcon}>
                  <FontAwesome name="camera" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.serviceTitle}>Skin Check-Ups (Dermatology)</Text>
              </View>
              <Text style={styles.serviceDescription}>
                Got a rash, acne, or a weird mole? Snap a photo, upload it, and get expert advice.
              </Text>
            </View>

            {/* Service 2 */}
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceIcon}>
                  <FontAwesome name="heart" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.serviceTitle}>Mental Health Support</Text>
              </View>
              <Text style={styles.serviceDescription}>
                Therapy, anxiety check-ins, stress management—all from your couch, no awkward waiting rooms.
              </Text>
            </View>

            {/* Service 3 */}
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceIcon}>
                  <FontAwesome name="apple" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.serviceTitle}>Nutrition & Diet Consultations</Text>
              </View>
              <Text style={styles.serviceDescription}>
                Whether you're looking to lose weight, gain muscle, or manage diabetes, nutrition experts are now just a video call away.
              </Text>
            </View>

            {/* Service 4 */}
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceIcon}>
                  <FontAwesome name="stethoscope" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.serviceTitle}>Chronic Condition Management</Text>
              </View>
              <Text style={styles.serviceDescription}>
                Things like hypertension, asthma, or diabetes can be monitored and managed through regular online check-ins.
              </Text>
            </View>

            {/* Service 5 */}
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceIcon}>
                  <FontAwesome name="flask" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.serviceTitle}>Lab Test Orders & Reviews</Text>
              </View>
              <Text style={styles.serviceDescription}>
                Book lab tests and get results reviewed by a professional—no extra trip needed.
              </Text>
            </View>

            {/* Service 6 */}
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceIcon}>
                  <FontAwesome name="shield" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.serviceTitle}>Sexual Health Services</Text>
              </View>
              <Text style={styles.serviceDescription}>
                Birth control, STI checks, private consultations: handled online with discretion.
              </Text>
            </View>

            {/* Service 7 */}
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceIcon}>
                  <FontAwesome name="bed" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.serviceTitle}>Sleep Consultations</Text>
              </View>
              <Text style={styles.serviceDescription}>
                Trouble sleeping? Telehealth apps can now connect you with sleep specialists without you having to get out of bed.
              </Text>
            </View>

            {/* Bottom Line */}
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>
                Telehealth isn't just an emergency backup. It's a full toolkit for your day-to-day health, always in your pocket. Next time you're wondering if you really need to visit a clinic, check your app first. Chances are—you don't.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  articleContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    lineHeight: 32,
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 6,
  },
  articleBody: {
    gap: 20,
  },
  paragraph: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
    marginBottom: 8,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
  },
  serviceDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  bottomLineCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  bottomLineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  bottomLineText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    opacity: 0.95,
  },
}); 