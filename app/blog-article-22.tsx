import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle22() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Skin Rashes Explained: When It\'s Harmless and When It\'s Serious', url: 'https://docavailable.com/blog/skin-rashes-explained' });
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
        <Image source={require('../assets/images/articles/rashes.jpg')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Skin Rashes Explained: When It's Harmless and When It's Serious</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>6 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>Skin rashes are common and usually harmless, but sometimes they signal something serious. Knowing when a rash is just an irritation versus when it needs medical attention can help you take the right action.</Text>
            <Text style={styles.sectionTitle}>Harmless Rashes (Usually)</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Allergic Contact Dermatitis</Text></View>
              <Text style={styles.techniqueDescription}>Red, itchy rash from contact with irritants (soap, jewelry, plants like poison ivy). Usually clears up when you avoid the trigger and use mild treatments.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Heat Rash</Text></View>
              <Text style={styles.techniqueDescription}>Small red bumps in sweaty areas. Common in hot, humid weather. Usually resolves with cooling and staying dry.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Eczema</Text></View>
              <Text style={styles.techniqueDescription}>Dry, itchy patches that can flare up. Chronic but manageable with moisturizers and avoiding triggers.</Text>
            </View>
            <Text style={styles.sectionTitle}>When to Worry: Serious Rashes</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF0000" /><Text style={styles.techniqueTitle}>Rash with Fever</Text></View>
              <Text style={styles.techniqueDescription}>A rash accompanied by high fever could indicate a serious infection like meningitis, measles, or scarlet fever. Seek immediate medical attention.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF0000" /><Text style={styles.techniqueTitle}>Rash That Spreads Quickly</Text></View>
              <Text style={styles.techniqueDescription}>A rash that spreads rapidly over your body could indicate an allergic reaction (anaphylaxis), infection, or autoimmune condition. Get medical help.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF0000" /><Text style={styles.techniqueTitle}>Painful Blisters or Sores</Text></View>
              <Text style={styles.techniqueDescription}>Blistering rashes, especially with pain, could indicate shingles, severe allergic reaction, or infection. See a doctor.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF0000" /><Text style={styles.techniqueTitle}>Rash with Breathing Problems</Text></View>
              <Text style={styles.techniqueDescription}>If a rash is accompanied by difficulty breathing, swelling of the face or throat, or dizziness, this could be anaphylaxis — call emergency services immediately.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF0000" /><Text style={styles.techniqueTitle}>Purple or Dark Red Spots</Text></View>
              <Text style={styles.techniqueDescription}>Petechiae (small purple spots) or purpura (larger purple areas) that don't fade when pressed could indicate bleeding under the skin — see a doctor immediately.</Text>
            </View>
            <Text style={styles.sectionTitle}>Common Infectious Rashes</Text>
            <Text style={styles.paragraph}>• Chickenpox: Itchy blisters all over body{'\n'}• Measles: Red spots starting on face, spreading down{'\n'}• Shingles: Painful blisters in a band on one side{'\n'}• Impetigo: Honey-colored crusty sores{'\n'}• Ringworm: Circular, scaly patches</Text>
            <Text style={styles.sectionTitle}>When to See a Doctor</Text>
            <Text style={styles.paragraph}>See a doctor if:{'\n'}• Rash is painful or spreading rapidly{'\n'}• You have a fever with the rash{'\n'}• Rash covers large areas of your body{'\n'}• You have trouble breathing or swallowing{'\n'}• Rash appears after starting a new medication{'\n'}• Rash doesn't improve after a few days of home treatment</Text>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>Most rashes are harmless and resolve on their own or with simple treatments. But if a rash is painful, spreading quickly, accompanied by fever or breathing problems, or has purple spots, see a doctor immediately. When in doubt, it's better to get it checked.</Text>
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

