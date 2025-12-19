import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle24() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Epilepsy Explained: What Seizures Look Like and How Treatment Works', url: 'https://docavailable.com/blog/epilepsy-explained' });
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
        <Image source={require('../assets/images/articles/epilipsy.webp')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Epilepsy Explained: What Seizures Look Like and How Treatment Works</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>7 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>Epilepsy is a neurological condition that causes recurring seizures. Seizures don't always look like the dramatic convulsions shown in movies. Understanding what seizures really look like and how modern treatment works can help reduce stigma and support those living with epilepsy.</Text>
            <Text style={styles.sectionTitle}>What Are Seizures?</Text>
            <Text style={styles.paragraph}>Seizures happen when there's abnormal electrical activity in the brain. This can cause changes in movement, behavior, sensation, or awareness. Epilepsy is diagnosed when someone has two or more unprovoked seizures.</Text>
            <Text style={styles.sectionTitle}>Types of Seizures</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Focal (Partial) Seizures</Text></View>
              <Text style={styles.techniqueDescription}>Start in one area of the brain. The person may remain aware (focal aware) or lose awareness (focal impaired awareness). Symptoms include staring, repetitive movements (lip-smacking, hand-rubbing), confusion, or unusual sensations.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Generalized Seizures</Text></View>
              <Text style={styles.techniqueDescription}>Affect both sides of the brain. Types include:{'\n'}• Tonic-clonic (grand mal): Loss of consciousness, muscle stiffness, then jerking movements{'\n'}• Absence (petit mal): Brief staring spells, common in children{'\n'}• Myoclonic: Brief jerks or twitches{'\n'}• Atonic: Sudden loss of muscle tone (drop attacks)</Text>
            </View>
            <Text style={styles.sectionTitle}>What Seizures Really Look Like</Text>
            <Text style={styles.paragraph}>Not all seizures involve convulsions. Many look like:{'\n'}• Staring spells or "zoning out"{'\n'}• Confusion or inability to respond{'\n'}• Repetitive movements (blinking, chewing){'\n'}• Feeling "strange" or having unusual sensations{'\n'}• Sudden jerking or muscle stiffness</Text>
            <Text style={styles.sectionTitle}>Modern Treatment Options</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Medications (AEDs)</Text></View>
              <Text style={styles.techniqueDescription}>Anti-epileptic drugs (AEDs) can control seizures in about 70% of people. There are many types, and finding the right one (or combination) may take time. Most people can live seizure-free with medication.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Surgery</Text></View>
              <Text style={styles.techniqueDescription}>If medications don't work and seizures start in a specific brain area, surgery to remove that area may be an option.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Dietary Therapy</Text></View>
              <Text style={styles.techniqueDescription}>The ketogenic diet (high fat, low carb) can help control seizures, especially in children, when medications don't work.</Text>
            </View>
            <Text style={styles.sectionTitle}>What to Do If Someone Has a Seizure</Text>
            <Text style={styles.paragraph}>1. Stay calm{'\n'}2. Clear the area of dangerous objects{'\n'}3. Don't restrain them or put anything in their mouth{'\n'}4. Gently roll them onto their side if possible{'\n'}5. Time the seizure{'\n'}6. Call emergency services if the seizure lasts more than 5 minutes, they have another seizure immediately, or they're injured</Text>
            <Text style={styles.sectionTitle}>Breaking the Stigma</Text>
            <Text style={styles.paragraph}>Epilepsy is a medical condition, not a mental illness or curse. With proper treatment, most people with epilepsy live normal, productive lives. Education and understanding help reduce fear and discrimination.</Text>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>Epilepsy causes seizures, but seizures don't always look dramatic. Most people with epilepsy can control seizures with medication and live normal lives. If you or someone you know has seizures, see a neurologist for proper diagnosis and treatment. Understanding epilepsy helps reduce stigma and support those affected.</Text>
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

