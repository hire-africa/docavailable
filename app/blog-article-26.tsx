import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle26() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Antibiotics Explained: When They Work — and When They Don\'t', url: 'https://docavailable.com/blog/antibiotics-explained' });
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
        <Image source={require('../assets/images/articles/antiobitics.jpg')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Antibiotics Explained: When They Work — and When They Don't</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>December 2023</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>7 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>Antibiotics are life-saving medications, but they're not cure-alls. Using them incorrectly — taking them for viral infections, stopping early, or using the wrong type — creates antibiotic resistance, making infections harder to treat. Understanding when antibiotics work and when they don't is crucial for your health and public health.</Text>
            <Text style={styles.sectionTitle}>When Antibiotics Work</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Bacterial Infections</Text></View>
              <Text style={styles.techniqueDescription}>Antibiotics only work against bacterial infections. Examples include: strep throat, urinary tract infections (UTIs), bacterial pneumonia, whooping cough, and bacterial skin infections.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Prescribed by a Doctor</Text></View>
              <Text style={styles.techniqueDescription}>Only take antibiotics when a doctor diagnoses a bacterial infection and prescribes them specifically for you. Different bacteria need different antibiotics.</Text>
            </View>
            <Text style={styles.sectionTitle}>When Antibiotics DON'T Work</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="timesCircle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Viral Infections</Text></View>
              <Text style={styles.techniqueDescription}>Antibiotics do NOT work against viruses. Common viral infections include: colds, flu (influenza), most sore throats (except strep), most sinus infections, most coughs, and COVID-19. Taking antibiotics for these won't help and can cause harm.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="timesCircle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Fungi or Parasites</Text></View>
              <Text style={styles.techniqueDescription}>Antibiotics don't work against fungal infections (like athlete's foot or yeast infections) or parasitic infections (like malaria). Different medications are needed.</Text>
            </View>
            <Text style={styles.sectionTitle}>The Problem: Antibiotic Resistance</Text>
            <Text style={styles.paragraph}>When antibiotics are overused or misused, bacteria can develop resistance — they learn to survive the antibiotic. This means:{'\n'}• The antibiotic stops working{'\n'}• Infections become harder or impossible to treat{'\n'}• People stay sick longer or die{'\n'}• We need stronger, more expensive antibiotics{'\n'}• Common infections become deadly again</Text>
            <Text style={styles.sectionTitle}>Common Mistakes</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Demanding Antibiotics for Colds/Flu</Text></View>
              <Text style={styles.techniqueDescription}>Many people ask for antibiotics when they have a cold or flu, but these are viral and antibiotics won't help. Rest, fluids, and symptom relief are what you need.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Stopping Early</Text></View>
              <Text style={styles.techniqueDescription}>Even if you feel better, finish the full course of antibiotics as prescribed. Stopping early allows some bacteria to survive and develop resistance.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Sharing or Saving Antibiotics</Text></View>
              <Text style={styles.techniqueDescription}>Never share antibiotics with others or save them for later. Each infection needs the right antibiotic at the right dose for the right duration.</Text>
            </View>
            <Text style={styles.sectionTitle}>What You Can Do</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Trust Your Doctor</Text></View>
              <Text style={styles.techniqueDescription}>If your doctor says you don't need antibiotics, trust their judgment. They know the difference between bacterial and viral infections.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Take as Prescribed</Text></View>
              <Text style={styles.techniqueDescription}>If antibiotics are prescribed, take them exactly as directed — the right dose, at the right times, for the full duration, even if you feel better.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Prevent Infections</Text></View>
              <Text style={styles.techniqueDescription}>Wash hands regularly, get vaccinated, practice safe food handling, and avoid close contact with sick people to reduce the need for antibiotics.</Text>
            </View>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>Antibiotics work against bacteria, not viruses. Only take them when a doctor prescribes them for a bacterial infection, and always finish the full course. Misuse creates antibiotic resistance, making infections harder to treat. Trust your doctor's judgment — if they say you don't need antibiotics, there's a good reason.</Text>
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

