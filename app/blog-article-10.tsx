import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle10() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Fever, Chills, Headache: Is It Malaria, Flu, or Something Else?', url: 'https://docavailable.com/blog/fever-chills-difference' });
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
        <Image source={require('../assets/images/articles/headech.webp')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Fever, Chills, Headache: Is It Malaria, Flu, or Something Else?</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>6 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>Fever, chills, and a headache — these symptoms could be anything from a common flu to something more serious like malaria. Here's how to tell the difference and when to worry.</Text>
            <Text style={styles.sectionTitle}>Malaria: The Cyclical Pattern</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Cyclical Fever Pattern</Text></View>
              <Text style={styles.techniqueDescription}>Malaria often follows a pattern: intense chills for 1-2 hours, then high fever (104°F/40°C) for 2-6 hours, followed by heavy sweating. This cycle repeats every 48-72 hours. If you've been in a malaria area, this pattern is a red flag.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Key Indicator: Travel History</Text></View>
              <Text style={styles.techniqueDescription}>Have you been in a malaria-endemic area (Africa, Asia, Latin America) in the past few weeks? If yes, any fever needs immediate testing for malaria.</Text>
            </View>
            <Text style={styles.sectionTitle}>Flu: More Gradual Onset</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Sudden but Consistent Symptoms</Text></View>
              <Text style={styles.techniqueDescription}>Flu symptoms come on quickly but don't cycle. You'll have fever, chills, body aches, fatigue, and often respiratory symptoms (cough, sore throat, runny nose). Symptoms usually peak within 2-3 days and improve over a week.</Text>
            </View>
            <Text style={styles.sectionTitle}>Other Possibilities</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Dengue Fever</Text></View>
              <Text style={styles.techniqueDescription}>Similar to malaria but often includes severe joint/muscle pain ("breakbone fever"), rash, and pain behind the eyes. Also travel-related.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Typhoid</Text></View>
              <Text style={styles.techniqueDescription}>Gradual onset, sustained high fever, and often includes rose-colored spots on the chest and severe constipation or diarrhea.</Text>
            </View>
            <Text style={styles.sectionTitle}>When to See a Doctor Immediately</Text>
            <Text style={styles.paragraph}>• You've been in a malaria-endemic area and have any fever{'\n'}• Symptoms are severe or getting worse rapidly{'\n'}• You have signs of dehydration or confusion{'\n'}• Fever lasts more than 3 days{'\n'}• You're in a high-risk group (pregnant, elderly, chronic illness)</Text>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>If you've traveled to a malaria area, any fever needs testing for malaria — don't assume it's just flu. For others, flu usually improves in a few days. If symptoms persist or worsen, see a doctor. When in doubt, get tested.</Text>
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

