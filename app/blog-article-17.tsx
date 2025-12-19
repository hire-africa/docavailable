import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle17() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Stroke Warning Signs Everyone Should Know (FAST Could Save a Life)', url: 'https://docavailable.com/blog/stroke-warning-signs-fast' });
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
        <Image source={require('../assets/images/articles/stroke.png')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Stroke Warning Signs Everyone Should Know (FAST Could Save a Life)</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>6 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>A stroke is a medical emergency. Every minute counts. Recognizing the signs and getting help immediately can mean the difference between life and death, or between full recovery and permanent disability.</Text>
            <Text style={styles.sectionTitle}>Remember FAST</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Text style={[styles.techniqueTitle, { marginLeft: 0 }]}>F - Face Drooping</Text></View>
              <Text style={styles.techniqueDescription}>Ask the person to smile. Does one side of the face droop or feel numb? Is the smile uneven?</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Text style={[styles.techniqueTitle, { marginLeft: 0 }]}>A - Arm Weakness</Text></View>
              <Text style={styles.techniqueDescription}>Ask the person to raise both arms. Does one arm drift downward? Is one arm weak or numb?</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Text style={[styles.techniqueTitle, { marginLeft: 0 }]}>S - Speech Difficulty</Text></View>
              <Text style={styles.techniqueDescription}>Ask the person to repeat a simple phrase. Is speech slurred, strange, or hard to understand? Can they speak at all?</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Text style={[styles.techniqueTitle, { marginLeft: 0 }]}>T - Time to Call Emergency</Text></View>
              <Text style={styles.techniqueDescription}>If you see ANY of these signs, even if they go away, call emergency services immediately. Note the time when symptoms first appeared — this is critical for treatment.</Text>
            </View>
            <Text style={styles.sectionTitle}>Other Stroke Warning Signs</Text>
            <Text style={styles.paragraph}>• Sudden numbness or weakness in the face, arm, or leg (especially on one side){'\n'}• Sudden confusion or trouble understanding{'\n'}• Sudden trouble seeing in one or both eyes{'\n'}• Sudden trouble walking, dizziness, loss of balance or coordination{'\n'}• Sudden severe headache with no known cause</Text>
            <Text style={styles.sectionTitle}>Why Minutes Matter</Text>
            <Text style={styles.paragraph}>Strokes happen when blood flow to part of the brain is blocked (ischemic stroke) or when a blood vessel bursts (hemorrhagic stroke). Brain cells begin dying within minutes. The sooner treatment begins, the better the chance of survival and recovery.</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Clot-Busting Drugs</Text></View>
              <Text style={styles.techniqueDescription}>For ischemic strokes, clot-busting medications (tPA) can dissolve the clot and restore blood flow, but they must be given within 3-4 hours of symptom onset.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Endovascular Procedures</Text></View>
              <Text style={styles.techniqueDescription}>Doctors can physically remove clots in some cases, but this also requires rapid treatment.</Text>
            </View>
            <Text style={styles.sectionTitle}>What to Do</Text>
            <Text style={styles.paragraph}>1. Call emergency services IMMEDIATELY — don't wait to see if symptoms go away{'\n'}2. Note the time symptoms started{'\n'}3. Don't let the person drive themselves{'\n'}4. Don't give them anything to eat or drink{'\n'}5. Stay calm and reassure them help is coming</Text>
            <Text style={styles.sectionTitle}>Transient Ischemic Attack (TIA) - "Mini Stroke"</Text>
            <Text style={styles.paragraph}>If stroke symptoms appear but go away quickly (within minutes or hours), it might be a TIA. This is still a medical emergency — it's a warning that a full stroke may follow. Get immediate medical attention.</Text>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>Learn FAST and act FAST. If you see face drooping, arm weakness, or speech difficulty, call emergency services immediately. Don't wait. Every minute counts. Quick action can save a life and prevent permanent disability.</Text>
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

