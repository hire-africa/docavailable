import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle13() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Tuberculosis (TB) Isn\'t Just a Cough — Here\'s How It Really Spreads', url: 'https://docavailable.com/blog/tuberculosis-explained' });
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
        <Image source={require('../assets/images/articles/TB.jpg')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Tuberculosis (TB) Isn't Just a Cough — Here's How It Really Spreads</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>7 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>TB is one of the world's deadliest infectious diseases, yet many people misunderstand how it spreads and what it really means. Let's clear up the confusion.</Text>
            <Text style={styles.sectionTitle}>How TB Actually Spreads</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Airborne Transmission</Text></View>
              <Text style={styles.techniqueDescription}>TB spreads through the air when someone with active TB in their lungs coughs, sneezes, or even speaks. The bacteria float in tiny droplets that others can breathe in. Close, prolonged contact is usually needed — you can't get it from a quick handshake or sharing utensils.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Latent vs. Active TB</Text></View>
              <Text style={styles.techniqueDescription}>Not everyone with TB bacteria is contagious. In latent TB, the bacteria are dormant and you can't spread it. Active TB means the bacteria are multiplying and making you sick — this is when you're contagious.</Text>
            </View>
            <Text style={styles.sectionTitle}>Symptoms to Know</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Persistent Cough</Text></View>
              <Text style={styles.techniqueDescription}>A cough that lasts more than 3 weeks, sometimes with blood-streaked sputum (phlegm).</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Fever and Night Sweats</Text></View>
              <Text style={styles.techniqueDescription}>Low-grade fever, especially in the afternoon, and drenching night sweats.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Weight Loss and Fatigue</Text></View>
              <Text style={styles.techniqueDescription}>Unexplained weight loss, loss of appetite, and extreme fatigue.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Chest Pain</Text></View>
              <Text style={styles.techniqueDescription}>Pain in the chest, especially when breathing or coughing.</Text>
            </View>
            <Text style={styles.sectionTitle}>Testing for TB</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Tuberculin Skin Test (TST)</Text></View>
              <Text style={styles.techniqueDescription}>A small amount of fluid is injected under the skin. You return 2-3 days later to have the reaction checked. If positive, further tests are needed.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Blood Tests (IGRA)</Text></View>
              <Text style={styles.techniqueDescription}>Interferon-gamma release assays detect TB bacteria in a blood sample. More accurate than skin tests in some cases.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Chest X-ray and Sputum Test</Text></View>
              <Text style={styles.techniqueDescription}>To confirm active TB, doctors use chest X-rays and test sputum (phlegm) for TB bacteria.</Text>
            </View>
            <Text style={styles.sectionTitle}>Modern Treatment</Text>
            <Text style={styles.paragraph}>TB is curable with antibiotics, but treatment takes time — usually 6-9 months. It's crucial to take all medications as prescribed, even after you start feeling better. Stopping early allows the bacteria to develop drug resistance.</Text>
            <Text style={styles.sectionTitle}>Who's at Risk</Text>
            <Text style={styles.paragraph}>• Close contacts of someone with active TB{'\n'}• People with weakened immune systems (HIV, diabetes){'\n'}• Healthcare workers{'\n'}• People in crowded living conditions{'\n'}• Those from or who have traveled to areas with high TB rates</Text>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>TB spreads through the air when someone with active TB coughs or sneezes. If you have a persistent cough (especially with blood), fever, night sweats, or unexplained weight loss, get tested. TB is treatable, but early diagnosis and completing the full course of treatment are essential.</Text>
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

