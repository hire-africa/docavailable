import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';


export default function BlogArticle7() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out this great article from DocAvailable: Cholera Explained Simply: Symptoms, Treatment, and When to Seek Help',
        url: 'https://docavailable.com/blog/cholera-explained',
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
              name={isBookmarked ? "bookmark" : "bookmarkO"} 
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
          source={require('../assets/images/articles/chorela.jpg.webp')} 
          style={styles.heroImage}
        />

        {/* Article Content */}
        <View style={styles.articleContainer}>
          {/* Title */}
          <Text style={styles.articleTitle}>
            Cholera Explained Simply: Symptoms, Treatment, and When to Seek Help
          </Text>

          {/* Meta Info */}
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Icon name="calendar" size={14} color="#888" />
              <Text style={styles.metaText}>January 2024</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="clock" size={14} color="#888" />
              <Text style={styles.metaText}>6 min read</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="userMd" size={14} color="#888" />
              <Text style={styles.metaText}>DocAvailable Team</Text>
            </View>
          </View>

          {/* Article Body */}
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>
              Cholera is a serious bacterial infection that can kill within hours if left untreated. But here's the good news: with quick action, it's highly treatable. Let's break down what actually happens in your body and what saves lives fast.
            </Text>

            <Text style={styles.sectionTitle}>What Is Cholera?</Text>

            <Text style={styles.paragraph}>
              Cholera is caused by the bacterium Vibrio cholerae, usually found in contaminated water or food. When it enters your body, it releases a toxin that makes your intestines flush out massive amounts of water and electrolytes.
            </Text>

            <Text style={styles.sectionTitle}>Symptoms to Watch For</Text>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}>
                <Icon name="exclamationTriangle" size={14} color="#FF6B6B" />
                <Text style={styles.techniqueTitle}>Severe Watery Diarrhea</Text>
              </View>
              <Text style={styles.techniqueDescription}>
                This isn't normal diarrhea. It looks like "rice water" — pale, milky, and happens very frequently (10-20 times per day). This is the body's way of flushing out the bacteria, but it also flushes out vital fluids.
              </Text>
            </View>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}>
                <Icon name="exclamationTriangle" size={14} color="#FF6B6B" />
                <Text style={styles.techniqueTitle}>Vomiting</Text>
              </View>
              <Text style={styles.techniqueDescription}>
                Often comes with the diarrhea, making it even harder to keep fluids down.
              </Text>
            </View>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}>
                <Icon name="exclamationTriangle" size={14} color="#FF6B6B" />
                <Text style={styles.techniqueTitle}>Dehydration Signs</Text>
              </View>
              <Text style={styles.techniqueDescription}>
                Dry mouth, extreme thirst, sunken eyes, rapid heartbeat, low blood pressure, and muscle cramps. In severe cases, the skin loses elasticity — if you pinch it, it stays pinched.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>What Saves Lives: Treatment</Text>

            <Text style={styles.paragraph}>
              The key to surviving cholera is replacing the fluids and electrolytes your body is losing. This needs to happen fast.
            </Text>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}>
                <Icon name="checkCircle" size={14} color="#4CAF50" />
                <Text style={styles.techniqueTitle}>Oral Rehydration Solution (ORS)</Text>
              </View>
              <Text style={styles.techniqueDescription}>
                This simple mix of clean water, salt, and sugar can save lives. If available, use a commercial ORS packet. If not, mix 6 teaspoons of sugar and 1/2 teaspoon of salt in 1 liter of clean, boiled water. Drink this continuously.
              </Text>
            </View>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}>
                <Icon name="checkCircle" size={14} color="#4CAF50" />
                <Text style={styles.techniqueTitle}>Intravenous (IV) Fluids</Text>
              </View>
              <Text style={styles.techniqueDescription}>
                In severe cases, IV fluids are needed immediately. This is why getting to a medical facility is critical.
              </Text>
            </View>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}>
                <Icon name="checkCircle" size={14} color="#4CAF50" />
                <Text style={styles.techniqueTitle}>Antibiotics</Text>
              </View>
              <Text style={styles.techniqueDescription}>
                Doctors may prescribe antibiotics like doxycycline or azithromycin to shorten the illness and reduce fluid loss. But rehydration is still the priority.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>When to Seek Help Immediately</Text>

            <Text style={styles.paragraph}>
              Don't wait. Seek medical help right away if you or someone you know has:
            </Text>

            <Text style={styles.paragraph}>
              • Severe, watery diarrhea (especially if it looks like rice water){'\n'}
              • Signs of dehydration (dry mouth, sunken eyes, rapid pulse){'\n'}
              • Can't keep fluids down{'\n'}
              • Muscle cramps or weakness{'\n'}
              • Been in an area with known cholera outbreaks
            </Text>

            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>
                Cholera moves fast, but treatment works fast too. The key is recognizing the symptoms early and getting medical help immediately. Rehydration is everything — start with ORS if you can't get to a doctor right away, but get to a healthcare facility as soon as possible.
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
  bookmarkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 16,
    marginBottom: 16,
  },
  techniqueCard: {
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
  techniqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  techniqueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 12,
    flex: 1,
  },
  techniqueDescription: {
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
    marginBottom: 8,
  },
});

