import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';


export default function BlogArticle() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out this great article from DocAvailable: Your Phone = Your Doctor: 7 Health Services You Didn\'t Know You Could Get Online',
        url: 'https://docavailable.com/blog/your-phone-your-doctor',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share article');
    }
  };

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Icon name="arrowLeft" size={16} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blog</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.bookmarkButton} 
            onPress={toggleBookmark}
          >
            <Icon 
              name={isBookmarked ? "bookmark" : "bookmark-o"} 
              size={18} 
              color={isBookmarked ? "#4CAF50" : "#666"} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Icon name="share" size={18} color="#666" />
          </TouchableOpacity>
        </View>
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
              <Icon name="calendar" size={14} color="#888" />
              <Text style={styles.metaText}>December 2024</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="clock" size={14} color="#888" />
              <Text style={styles.metaText}>5 min read</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="userMd" size={14} color="#888" />
              <Text style={styles.metaText}>DocAvailable Team</Text>
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
                  <Icon name="camera" size={16} color="#4CAF50" />
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
                  <Icon name="heart" size={16} color="#4CAF50" />
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
                  <Icon name="apple" size={16} color="#4CAF50" />
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
                  <Icon name="heart" size={16} color="#4CAF50" />
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
                  <Icon name="file" size={16} color="#4CAF50" />
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
                  <Icon name="heart" size={16} color="#4CAF50" />
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
                  <Icon name="clock" size={16} color="#4CAF50" />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookmarkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  content: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  articleContainer: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
  },
  articleTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 36,
    marginBottom: 20,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    flexWrap: 'wrap',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  articleBody: {
    gap: 24,
  },
  paragraph: {
    fontSize: 17,
    color: '#444',
    lineHeight: 26,
    marginBottom: 12,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    lineHeight: 24,
  },
  serviceDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  bottomLineCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 24,
    marginTop: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  bottomLineTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  bottomLineText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    opacity: 0.95,
  },
}); 
