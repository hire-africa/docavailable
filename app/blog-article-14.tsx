import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle14() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Pneumonia Explained: When a Cough Turns Serious', url: 'https://docavailable.com/blog/pneumonia-explained' });
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
        <Image source={require('../assets/images/articles/pnemunonia.jpg')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Pneumonia Explained: When a Cough Turns Serious</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>6 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>Pneumonia is an infection that inflames the air sacs in your lungs. It can be mild or life-threatening, depending on your age, health, and the type of infection. Knowing the signs can help you get treatment before it becomes serious.</Text>
            <Text style={styles.sectionTitle}>What Is Pneumonia?</Text>
            <Text style={styles.paragraph}>Pneumonia occurs when bacteria, viruses, or fungi infect the air sacs (alveoli) in your lungs. These sacs fill with fluid or pus, making it hard to breathe and get enough oxygen into your bloodstream.</Text>
            <Text style={styles.sectionTitle}>Symptoms to Watch For</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Cough</Text></View>
              <Text style={styles.techniqueDescription}>Persistent cough that may produce phlegm (mucus) that's green, yellow, or bloody.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Fever and Chills</Text></View>
              <Text style={styles.techniqueDescription}>High fever (often above 101°F/38°C), sweating, and shaking chills.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Shortness of Breath</Text></View>
              <Text style={styles.techniqueDescription}>Difficulty breathing, especially during normal activities. Rapid, shallow breathing.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Chest Pain</Text></View>
              <Text style={styles.techniqueDescription}>Sharp or stabbing chest pain that worsens when you breathe deeply or cough.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Fatigue and Confusion</Text></View>
              <Text style={styles.techniqueDescription}>Extreme tiredness, weakness, and in older adults, confusion or changes in mental awareness.</Text>
            </View>
            <Text style={styles.sectionTitle}>Who Is Most at Risk</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Children Under 2 and Adults Over 65</Text></View>
              <Text style={styles.techniqueDescription}>Immune systems are weaker at the extremes of age, making them more vulnerable.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>People with Weakened Immune Systems</Text></View>
              <Text style={styles.techniqueDescription}>HIV/AIDS, cancer treatment, organ transplants, or long-term use of steroids.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Chronic Diseases</Text></View>
              <Text style={styles.techniqueDescription}>Asthma, COPD, diabetes, heart disease, or chronic kidney disease.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Smoking</Text></View>
              <Text style={styles.techniqueDescription}>Damages the lungs' natural defenses against infection.</Text>
            </View>
            <Text style={styles.sectionTitle}>When to Get Urgent Care</Text>
            <Text style={styles.paragraph}>Seek immediate medical attention if you have:{'\n'}• Difficulty breathing or shortness of breath{'\n'}• Chest pain{'\n'}• Persistent fever above 102°F (39°C){'\n'}• Persistent cough, especially if coughing up pus{'\n'}• Confusion (in adults 65+)</Text>
            <Text style={styles.sectionTitle}>Treatment</Text>
            <Text style={styles.paragraph}>Bacterial pneumonia is treated with antibiotics. Viral pneumonia usually resolves on its own, but antiviral medications may help in some cases. Rest, fluids, and fever-reducing medications help manage symptoms.</Text>
            <Text style={styles.sectionTitle}>Prevention</Text>
            <Text style={styles.paragraph}>Vaccines can prevent some types of pneumonia. Get vaccinated for pneumococcal disease and flu. Also: wash hands frequently, don't smoke, and manage chronic health conditions.</Text>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>Pneumonia is serious but treatable. If you have a persistent cough with fever, chest pain, or difficulty breathing, see a doctor — especially if you're in a high-risk group. Early treatment can prevent complications and speed recovery.</Text>
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

