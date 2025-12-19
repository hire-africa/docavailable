import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle15() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: High Blood Pressure Has No Symptoms — Until It\'s Too Late', url: 'https://docavailable.com/blog/high-blood-pressure' });
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
          <Text style={styles.articleTitle}>High Blood Pressure Has No Symptoms — Until It's Too Late</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>5 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>High blood pressure (hypertension) is called the "silent killer" for a reason: it usually has no symptoms until it causes serious damage. By the time you notice something's wrong, your heart, brain, kidneys, and blood vessels may already be affected.</Text>
            <Text style={styles.sectionTitle}>Why It's Called the "Silent Killer"</Text>
            <Text style={styles.paragraph}>High blood pressure damages your arteries and organs over time, but you feel nothing. Most people don't know they have it until they get their blood pressure checked or develop complications like a heart attack, stroke, or kidney disease.</Text>
            <Text style={styles.sectionTitle}>What Is High Blood Pressure?</Text>
            <Text style={styles.paragraph}>Blood pressure is the force of blood pushing against your artery walls. Normal is typically below 120/80 mmHg. High blood pressure is 130/80 or higher. The higher the numbers, the harder your heart has to work and the more damage occurs.</Text>
            <Text style={styles.sectionTitle}>Rare Symptoms (When Pressure Is Very High)</Text>
            <Text style={styles.paragraph}>In extreme cases (hypertensive crisis), you might notice:{'\n'}• Severe headaches{'\n'}• Shortness of breath{'\n'}• Nosebleeds{'\n'}• Severe anxiety{'\n'}• Chest pain{'\n'}• Vision changes{'\n'}• Confusion</Text>
            <Text style={styles.paragraph}>These require immediate medical attention — call emergency services.</Text>
            <Text style={styles.sectionTitle}>The Damage High Blood Pressure Does</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Heart Disease</Text></View>
              <Text style={styles.techniqueDescription}>Forces your heart to work harder, leading to heart failure, heart attack, or irregular heartbeat.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Stroke</Text></View>
              <Text style={styles.techniqueDescription}>Weakens blood vessels in the brain, causing them to burst or clog, leading to stroke.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Kidney Damage</Text></View>
              <Text style={styles.techniqueDescription}>Damages the small blood vessels in your kidneys, leading to kidney failure.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Vision Loss</Text></View>
              <Text style={styles.techniqueDescription}>Damages blood vessels in the eyes, causing vision problems or blindness.</Text>
            </View>
            <Text style={styles.sectionTitle}>How to Protect Yourself</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Get Checked Regularly</Text></View>
              <Text style={styles.techniqueDescription}>Have your blood pressure checked at least once a year (more often if it's high). Many pharmacies offer free checks.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Lifestyle Changes</Text></View>
              <Text style={styles.techniqueDescription}>Eat a healthy diet (less salt, more fruits/vegetables), exercise regularly, maintain a healthy weight, limit alcohol, don't smoke, and manage stress.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Take Medications If Prescribed</Text></View>
              <Text style={styles.techniqueDescription}>If lifestyle changes aren't enough, medications can effectively lower blood pressure. Take them as prescribed.</Text>
            </View>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>Don't wait for symptoms — high blood pressure usually has none. Get your blood pressure checked regularly, especially if you're over 40, have a family history, are overweight, or have other risk factors. Early detection and treatment can prevent serious complications.</Text>
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

