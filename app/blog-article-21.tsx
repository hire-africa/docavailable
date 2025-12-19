import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle21() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Food Poisoning vs. Stomach Flu: How to Tell the Difference', url: 'https://docavailable.com/blog/food-poisoning-vs-stomach-flu' });
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
        <Image source={require('../assets/images/articles/food poisoing.jpg')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Food Poisoning vs. Stomach Flu: How to Tell the Difference</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>6 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>Vomiting, diarrhea, nausea — the symptoms look the same, but food poisoning and stomach flu have different causes and timelines. Knowing the difference helps you treat it correctly and know when to seek help.</Text>
            <Text style={styles.sectionTitle}>Food Poisoning: Quick Onset</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Caused By</Text></View>
              <Text style={styles.techniqueDescription}>Bacteria, viruses, or toxins in contaminated food or drinks. Common culprits include E. coli, Salmonella, norovirus, and Staphylococcus aureus.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Timeline</Text></View>
              <Text style={styles.techniqueDescription}>Symptoms usually appear within hours (2-6 hours is common, sometimes up to 24 hours) after eating contaminated food. The illness typically lasts 1-3 days.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Symptoms</Text></View>
              <Text style={styles.techniqueDescription}>Often sudden and severe: nausea, vomiting, diarrhea (sometimes bloody), stomach cramps, fever, and sometimes chills. Multiple people who ate the same food may get sick.</Text>
            </View>
            <Text style={styles.sectionTitle}>Stomach Flu (Viral Gastroenteritis): Gradual Start</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Caused By</Text></View>
              <Text style={styles.techniqueDescription}>Viruses (most commonly norovirus or rotavirus). It's contagious and spreads from person to person, not from food.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Timeline</Text></View>
              <Text style={styles.techniqueDescription}>Symptoms usually appear 24-48 hours after exposure to the virus. The illness typically lasts 1-3 days, sometimes longer.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Symptoms</Text></View>
              <Text style={styles.techniqueDescription}>Gradual onset: watery diarrhea (usually not bloody), nausea, vomiting, stomach cramps, mild fever, body aches, and headache. Often spreads through families or groups.</Text>
            </View>
            <Text style={styles.sectionTitle}>Key Differences</Text>
            <Text style={styles.paragraph}>• Food poisoning: Quick onset (hours), often linked to specific food, may have bloody diarrhea{'\n'}• Stomach flu: Slower onset (1-2 days), contagious to others, usually spreads through contact{'\n'}• Both: Usually resolve on their own with rest and fluids</Text>
            <Text style={styles.sectionTitle}>Treatment for Both</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Stay Hydrated</Text></View>
              <Text style={styles.techniqueDescription}>Drink clear fluids (water, broth, electrolyte solutions). Take small sips frequently. Avoid dairy, caffeine, and alcohol.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Rest</Text></View>
              <Text style={styles.techniqueDescription}>Let your body recover. Avoid solid foods until vomiting stops, then gradually reintroduce bland foods (bananas, rice, toast).</Text>
            </View>
            <Text style={styles.sectionTitle}>When to See a Doctor</Text>
            <Text style={styles.paragraph}>Seek medical attention if:{'\n'}• Symptoms last more than 3 days{'\n'}• Signs of severe dehydration{'\n'}• Bloody diarrhea or vomit{'\n'}• High fever (over 101.5°F/38.6°C){'\n'}• Severe abdominal pain{'\n'}• Can't keep fluids down</Text>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>Food poisoning hits fast (hours) and is linked to food; stomach flu comes on slower (1-2 days) and spreads person-to-person. Both usually resolve with rest and fluids, but see a doctor if symptoms are severe or last more than 3 days.</Text>
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

