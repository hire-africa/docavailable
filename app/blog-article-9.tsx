import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';


export default function BlogArticle9() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out this great article from DocAvailable: Malaria Symptoms Can Look Mild — Until They\'re Not',
        url: 'https://docavailable.com/blog/malaria-symptoms',
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrowLeft" size={16} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blog</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.bookmarkButton} onPress={toggleBookmark}>
            <Icon name={isBookmarked ? "bookmark" : "bookmarkO"} size={18} color={isBookmarked ? "#4CAF50" : "#666"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Icon name="share" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={require('../assets/images/articles/Mosquito-insect-feeding-on-human-culex-pipiens.webp')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Malaria Symptoms Can Look Mild — Until They're Not</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>7 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>Malaria often starts with symptoms that feel like a bad flu or just being "under the weather." But what starts mild can quickly become severe — and timing matters enormously. Early detection and treatment can be lifesaving.</Text>
            
            <Text style={styles.sectionTitle}>Early Symptoms (The Ones You Might Miss)</Text>
            
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Fever and Chills</Text></View>
              <Text style={styles.techniqueDescription}>Often comes in cycles — fever, then chills, then sweating. This can happen every 48-72 hours with some types of malaria. At first, you might just think it's a regular fever.</Text>
            </View>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Headache and Body Aches</Text></View>
              <Text style={styles.techniqueDescription}>Feels like a bad flu. Muscle aches, joint pain, and a pounding headache. Easy to dismiss as "just feeling unwell."</Text>
            </View>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Nausea and Vomiting</Text></View>
              <Text style={styles.techniqueDescription}>Upset stomach, loss of appetite, and sometimes vomiting. Again, feels like a stomach bug.</Text>
            </View>

            <Text style={styles.sectionTitle}>Why Timing Matters</Text>
            <Text style={styles.paragraph}>Malaria parasites multiply in your red blood cells. The longer you wait, the more they multiply. Within days, mild symptoms can progress to severe malaria, which can be fatal.</Text>

            <Text style={styles.sectionTitle}>Severe Malaria (Warning Signs)</Text>
            
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF0000" /><Text style={styles.techniqueTitle}>Severe Anemia</Text></View>
              <Text style={styles.techniqueDescription}>Parasites destroy red blood cells. Look for extreme fatigue, pale skin, shortness of breath, or dizziness.</Text>
            </View>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF0000" /><Text style={styles.techniqueTitle}>Cerebral Malaria</Text></View>
              <Text style={styles.techniqueDescription}>When parasites affect the brain: seizures, confusion, coma. This is a medical emergency.</Text>
            </View>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF0000" /><Text style={styles.techniqueTitle}>Organ Failure</Text></View>
              <Text style={styles.techniqueDescription}>Kidney failure, respiratory distress, or severe jaundice. These indicate life-threatening complications.</Text>
            </View>

            <Text style={styles.sectionTitle}>When to Get Tested</Text>
            <Text style={styles.paragraph}>If you've been in a malaria area and develop fever or flu-like symptoms — even if mild — get tested immediately. Don't wait for symptoms to get worse. A simple blood test can confirm malaria in minutes.</Text>

            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>Malaria starts mild but can turn severe fast. If you've been in a malaria-risk area and have any symptoms (even if they seem like "just a fever"), get tested right away. Early treatment with antimalarial drugs is highly effective. Waiting can be deadly.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F8FF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  bookmarkButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F8FF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  shareButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F8FF', alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row' },
  content: { flex: 1 },
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

