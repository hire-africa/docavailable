import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';


export default function BlogArticle2() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out this great article from DocAvailable: The Doctor Will See You… Through Your Selfie Camera',
        url: 'https://docavailable.com/blog/doctor-selfie-camera',
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
          source={require('../assets/images/video.jpg')} 
          style={styles.heroImage}
        />

        {/* Article Content */}
        <View style={styles.articleContainer}>
          {/* Title */}
          <Text style={styles.articleTitle}>
            The Doctor Will See You… Through Your Selfie Camera
          </Text>

          {/* Meta Info */}
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Icon name="calendar" size={14} color="#888" />
              <Text style={styles.metaText}>July 2025</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="clock" size={14} color="#888" />
              <Text style={styles.metaText}>3 min read</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="userMd" size={14} color="#888" />
              <Text style={styles.metaText}>DocAvailable Team</Text>
            </View>
          </View>

          {/* Article Body */}
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>
              We've gotten used to selfies for everything: Instagram, passport photos, even virtual interviews. But here's one you might not have tried yet seeing your doctor.
            </Text>

            <Text style={styles.paragraph}>
              That's right. With doc available, video consultations aren't just a backup option anymore they're the main event.
            </Text>

            <Text style={styles.sectionTitle}>Here's how it works:</Text>

            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Open the app</Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Book an appointment</Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Hop on a secure video call, face-to-face with a licensed doctor</Text>
            </View>

            <Text style={styles.paragraph}>
              No traffic. No waiting room. No awkward small talk with strangers.
            </Text>

            <Text style={styles.paragraph}>
              And yes, doctors can actually see a lot via video—skin issues, throat swelling, eye redness, breathing patterns, you name it.
            </Text>

            <Text style={styles.sectionTitle}>What Kind of Stuff Can Be Handled Over Video?</Text>

            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Icon name="heart" size={14} color="#4CAF50" />
                <Text style={styles.bulletText}>Colds, flu, headaches</Text>
              </View>
              <View style={styles.bulletItem}>
                <Icon name="camera" size={14} color="#4CAF50" />
                <Text style={styles.bulletText}>Skin concerns (rashes, acne, allergies)</Text>
              </View>
              <View style={styles.bulletItem}>
                <Icon name="heart" size={14} color="#4CAF50" />
                <Text style={styles.bulletText}>Mental health check-ins</Text>
              </View>
              <View style={styles.bulletItem}>
                <Icon name="file" size={14} color="#4CAF50" />
                <Text style={styles.bulletText}>Prescription refills</Text>
              </View>
            </View>

            <View style={styles.bonusCard}>
              <Text style={styles.bonusTitle}>Bonus:</Text>
              <Text style={styles.bonusText}>
                Most video consultations are way quicker than in-person ones. Think 10–15 minutes instead of an hour out of your day.
              </Text>
            </View>

            {/* Bottom Line */}
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>
                If your camera's good enough for selfies, it's good enough for healthcare. Try it—your future self will thank you.
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
    borderBottomColor: '#E8F5E8',
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
    gap: 20,
  },
  paragraph: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 16,
    marginBottom: 12,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 16,
    color: '#222',
    flex: 1,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulletText: {
    fontSize: 16,
    color: '#444',
    marginLeft: 12,
    flex: 1,
  },
  bonusCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  bonusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  bonusText: {
    fontSize: 15,
    color: '#856404',
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
