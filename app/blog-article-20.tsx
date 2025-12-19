import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle20() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Why Children Get Dehydrated Faster — and How to Treat It at Home', url: 'https://docavailable.com/blog/child-dehydration' });
    } catch (error) {
      Alert.alert('Error', 'Unable to share article');
    }
  };
  const toggleBookmark = () => setIsBookmarked(!isBookmarked);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Icon name="arrowLeft" size={16} color="#222" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Blog</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.bookmarkButton} onPress={toggleBookmark}><Icon name={isBookmarked ? "bookmark" : "bookmarkO"} size={18} color={isBookmarked ? "#4CAF50" : "#666"} /></TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}><Icon name="share" size={18} color="#666" /></TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={require('../assets/images/articles/children dehydrated.webp')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Why Children Get Dehydrated Faster — and How to Treat It at Home</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>5 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>Children are more vulnerable to dehydration than adults. Their smaller bodies have less fluid reserve, and they lose water faster. Knowing the signs and how to treat dehydration at home can prevent serious complications.</Text>
            <Text style={styles.sectionTitle}>Why Children Are at Higher Risk</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Smaller Body Size</Text></View>
              <Text style={styles.techniqueDescription}>Children have less total body water, so losing even a small amount can be significant. A toddler who loses 1 cup of fluid loses a much larger percentage of their body water than an adult losing the same amount.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Higher Metabolism</Text></View>
              <Text style={styles.techniqueDescription}>Children's bodies work faster, generating more heat and losing more water through breathing and sweating.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Less Efficient Kidneys</Text></View>
              <Text style={styles.techniqueDescription}>Young children's kidneys are still developing and don't conserve water as efficiently as adult kidneys.</Text>
            </View>
            <Text style={styles.sectionTitle}>Signs of Dehydration in Children</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Mild to Moderate</Text></View>
              <Text style={styles.techniqueDescription}>Dry mouth and tongue, fewer wet diapers (or not urinating for 6+ hours), crying without tears, sunken eyes, irritability, and listlessness. In babies, a sunken soft spot on the head.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF0000" /><Text style={styles.techniqueTitle}>Severe (Get Medical Help Immediately)</Text></View>
              <Text style={styles.techniqueDescription}>Very dry mouth and skin, no urination for 12+ hours, extreme fussiness or sleepiness, sunken eyes and cheeks, cool or blotchy hands and feet, rapid breathing or heartbeat, and in severe cases, unconsciousness.</Text>
            </View>
            <Text style={styles.sectionTitle}>How to Treat Dehydration at Home</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Oral Rehydration Solution (ORS)</Text></View>
              <Text style={styles.techniqueDescription}>Use commercial ORS (like Pedialyte) or make your own: mix 6 teaspoons of sugar and 1/2 teaspoon of salt in 1 liter (about 4 cups) of clean, boiled water. Give small sips frequently — don't force large amounts at once.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Continue Breastfeeding or Formula</Text></View>
              <Text style={styles.techniqueDescription}>For babies, continue normal feedings and offer extra ORS between feeds. Don't dilute formula or breastmilk.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Avoid Certain Drinks</Text></View>
              <Text style={styles.techniqueDescription}>Avoid soda, fruit juices (too much sugar), sports drinks (unless specifically designed for rehydration), and plain water alone (it doesn't replace electrolytes).</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Start Slowly</Text></View>
              <Text style={styles.techniqueDescription}>Give 1-2 teaspoons of ORS every few minutes. If they keep it down, gradually increase the amount. If they vomit, wait 10-15 minutes and try again with smaller amounts.</Text>
            </View>
            <Text style={styles.sectionTitle}>When to Seek Medical Help</Text>
            <Text style={styles.paragraph}>Get immediate medical attention if:{'\n'}• Your child shows signs of severe dehydration{'\n'}• They can't keep fluids down{'\n'}• They have persistent vomiting or diarrhea{'\n'}• They're very sleepy or hard to wake{'\n'}• They have blood in their stool or vomit{'\n'}• Dehydration lasts more than 24 hours{'\n'}• You're concerned — trust your instincts</Text>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>Children dehydrate faster than adults, so watch for signs like dry mouth, fewer wet diapers, and unusual sleepiness or fussiness. Start rehydration early with ORS given in small, frequent sips. If symptoms worsen or your child can't keep fluids down, seek medical help immediately.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F8FF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  bookmarkButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F8FF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  shareButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F8FF', alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row' }, content: { flex: 1 },
  heroImage: { width: '100%', height: 200, resizeMode: 'cover' },
  articleContainer: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  articleTitle: { fontSize: 24, fontWeight: 'bold', color: '#222', lineHeight: 32, marginBottom: 16 },
  metaInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20, marginBottom: 8 },
  metaText: { fontSize: 14, color: '#888', marginLeft: 6 },
  articleBody: { gap: 20 },
  paragraph: { fontSize: 16, color: '#444', lineHeight: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#222', marginTop: 16, marginBottom: 16 },
  techniqueCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  techniqueHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  techniqueTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', marginLeft: 12, flex: 1 },
  techniqueDescription: { fontSize: 15, color: '#666', lineHeight: 22 },
  bottomLineCard: { backgroundColor: '#4CAF50', borderRadius: 16, padding: 20, marginTop: 8 },
  bottomLineTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  bottomLineText: { fontSize: 15, color: '#FFFFFF', lineHeight: 22, opacity: 0.95, marginBottom: 8 },
});

