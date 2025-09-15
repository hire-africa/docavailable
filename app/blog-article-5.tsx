import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';


export default function BlogArticle5() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out this great article from DocAvailable: Healthy Eating Habits for a Balanced Diet',
        url: 'https://docavailable.com/blog/healthy-eating-habits',
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
          source={require('../assets/images/healthy diet.jpg')} 
          style={styles.heroImage}
        />

        {/* Article Content */}
        <View style={styles.articleContainer}>
          {/* Title */}
          <Text style={styles.articleTitle}>
            Healthy Eating Habits for a Balanced Diet
          </Text>

          {/* Meta Info */}
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Text style={{ fontSize: 14, color: '#888' }}>??</Text>
              <Text style={styles.metaText}>June 2025</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={{ fontSize: 14, color: '#888' }}>?</Text>
              <Text style={styles.metaText}>5 min read</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={{ fontSize: 14, color: '#888' }}>??</Text>
              <Text style={styles.metaText}>DocAvailable Team</Text>
            </View>
          </View>

          {/* Article Body */}
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>
              You've probably heard it before: "Eat a balanced diet!" But what does that actually mean in real life not just on a poster?
            </Text>

            <Text style={styles.paragraph}>
              Here's a simple guide to essential nutrients and how to build healthier eating habits that stick:
            </Text>

            <View style={styles.nutrientCard}>
              <View style={styles.nutrientHeader}>
                <Icon name="heart" size={14} color="#4CAF50" />
                <Text style={styles.nutrientTitle}>1. Protein: The Body's Building Block</Text>
              </View>
              <Text style={styles.nutrientSubtitle}>Why you need it:</Text>
              <Text style={styles.nutrientDescription}>For muscles, skin, hair, and recovery.</Text>
              <Text style={styles.nutrientSubtitle}>Where to get it:</Text>
              <Text style={styles.nutrientDescription}>Eggs, chicken, beans, tofu, nuts.</Text>
            </View>

            <View style={styles.nutrientCard}>
              <View style={styles.nutrientHeader}>
                <Icon name="apple" size={14} color="#4CAF50" />
                <Text style={styles.nutrientTitle}>2. Carbs: Your Energy Source (Yes, You Still Need Them)</Text>
              </View>
              <Text style={styles.nutrientSubtitle}>Why you need them:</Text>
              <Text style={styles.nutrientDescription}>For focus, energy, and brain power.</Text>
              <Text style={styles.nutrientSubtitle}>Where to get them:</Text>
              <Text style={styles.nutrientDescription}>Whole grains, oats, sweet potatoes, fruits.</Text>
            </View>

            <View style={styles.nutrientCard}>
              <View style={styles.nutrientHeader}>
                <Icon name="heart" size={14} color="#4CAF50" />
                <Text style={styles.nutrientTitle}>3. Healthy Fats: Not the Enemy</Text>
              </View>
              <Text style={styles.nutrientSubtitle}>Why you need them:</Text>
              <Text style={styles.nutrientDescription}>For heart health, hormones, and brain function.</Text>
              <Text style={styles.nutrientSubtitle}>Where to get them:</Text>
              <Text style={styles.nutrientDescription}>Avocados, olive oil, nuts, seeds.</Text>
            </View>

            <View style={styles.nutrientCard}>
              <View style={styles.nutrientHeader}>
                <Icon name="star" size={14} color="#4CAF50" />
                <Text style={styles.nutrientTitle}>4. Vitamins & Minerals: The Invisible Helpers</Text>
              </View>
              <Text style={styles.nutrientSubtitle}>Why you need them:</Text>
              <Text style={styles.nutrientDescription}>For immunity, skin health, and energy levels.</Text>
              <Text style={styles.nutrientSubtitle}>Where to get them:</Text>
              <Text style={styles.nutrientDescription}>Leafy greens, fruits, veggies, dairy.</Text>
            </View>

            <View style={styles.nutrientCard}>
              <View style={styles.nutrientHeader}>
                <Icon name="heart" size={14} color="#4CAF50" />
                <Text style={styles.nutrientTitle}>5. Water: The One People Forget</Text>
              </View>
              <Text style={styles.nutrientSubtitle}>Why you need it:</Text>
              <Text style={styles.nutrientDescription}>Literally everything your body does depends on it.</Text>
              <Text style={styles.nutrientSubtitle}>Pro tip:</Text>
              <Text style={styles.nutrientDescription}>Aim for 6–8 glasses a day minimum.</Text>
            </View>

            <Text style={styles.sectionTitle}>Quick Habits to Build a Balanced Plate:</Text>

            <View style={styles.habitsList}>
              <View style={styles.habitItem}>
                <Icon name="check" size={16} color="#4CAF50" />
                <Text style={styles.habitText}>Fill half your plate with veggies.</Text>
              </View>
              <View style={styles.habitItem}>
                <Icon name="check" size={14} color="#4CAF50" />
                <Text style={styles.habitText}>Add a lean protein source.</Text>
              </View>
              <View style={styles.habitItem}>
                <Icon name="check" size={16} color="#4CAF50" />
                <Text style={styles.habitText}>Choose whole grains over processed carbs.</Text>
              </View>
              <View style={styles.habitItem}>
                <Icon name="check" size={16} color="#4CAF50" />
                <Text style={styles.habitText}>Don't skip healthy fats.</Text>
              </View>
            </View>

            {/* Bottom Line */}
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>
                Healthy eating doesn't have to be complicated. Start small, balance your plate, and keep it consistent. And if you need extra help—nutrition advice is just one telehealth appointment away.
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 16,
    marginBottom: 16,
  },
  nutrientCard: {
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
  nutrientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nutrientTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 12,
    flex: 1,
  },
  nutrientSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
    marginBottom: 4,
  },
  nutrientDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
  habitsList: {
    marginTop: 8,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  habitText: {
    fontSize: 16,
    color: '#444',
    marginLeft: 12,
    flex: 1,
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
