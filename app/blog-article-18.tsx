import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle18() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Heart Attacks Don\'t Always Look Like the Movies', url: 'https://docavailable.com/blog/heart-attack-real-symptoms' });
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
        <Image source={require('../assets/images/articles/heart attack.png')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Heart Attacks Don't Always Look Like the Movies</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>8 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>In movies, heart attacks are dramatic: someone clutches their chest and collapses. In real life, heart attack symptoms are often much more subtle — and they can be different in men and women. Knowing the real signs could save your life.</Text>
            <Text style={styles.sectionTitle}>Classic Symptoms (More Common in Men)</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Chest Pain or Pressure</Text></View>
              <Text style={styles.techniqueDescription}>A feeling of pressure, squeezing, fullness, or pain in the center or left side of the chest. It may come and go, or last for several minutes. Often described as "an elephant sitting on my chest."</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Pain in Other Areas</Text></View>
              <Text style={styles.techniqueDescription}>Pain or discomfort in one or both arms, the back, neck, jaw, or stomach. It can radiate from the chest.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Shortness of Breath</Text></View>
              <Text style={styles.techniqueDescription}>Difficulty breathing, with or without chest discomfort. May feel like you can't catch your breath.</Text>
            </View>
            <Text style={styles.sectionTitle}>Symptoms in Women (Often Different)</Text>
            <Text style={styles.paragraph}>Women are more likely than men to experience heart attack symptoms WITHOUT chest pain. Their symptoms are often more subtle and easily dismissed:</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Unusual Fatigue</Text></View>
              <Text style={styles.techniqueDescription}>Extreme, unexplained fatigue that may last for days. Activities that were easy suddenly become exhausting.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Shortness of Breath</Text></View>
              <Text style={styles.techniqueDescription}>Breathing problems without chest pain, especially during routine activities.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Nausea or Vomiting</Text></View>
              <Text style={styles.techniqueDescription}>Feeling sick to your stomach, sometimes with actual vomiting. Often mistaken for food poisoning or the flu.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Back or Jaw Pain</Text></View>
              <Text style={styles.techniqueDescription}>Pain in the upper back, shoulders, neck, or jaw — often without any chest pain at all.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Dizziness or Lightheadedness</Text></View>
              <Text style={styles.techniqueDescription}>Feeling faint or like you might pass out.</Text>
            </View>
            <Text style={styles.sectionTitle}>Common Myths</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="timesCircle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Myth: Heart attacks are always sudden and dramatic</Text></View>
              <Text style={styles.techniqueDescription}>Reality: Many heart attacks start slowly with mild symptoms that come and go. People often wait too long because they think it's "just indigestion" or "muscle strain."</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="timesCircle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Myth: Only older people have heart attacks</Text></View>
              <Text style={styles.techniqueDescription}>Reality: Heart attacks can happen at any age, especially if you have risk factors like smoking, diabetes, high blood pressure, or a family history.</Text>
            </View>
            <Text style={styles.sectionTitle}>What to Do</Text>
            <Text style={styles.paragraph}>If you think you're having a heart attack:{'\n'}1. Call emergency services IMMEDIATELY — don't drive yourself{'\n'}2. Chew and swallow an aspirin (unless you're allergic){'\n'}3. Stay calm and rest while waiting for help{'\n'}4. Don't ignore symptoms or hope they'll go away</Text>
            <Text style={styles.sectionTitle}>Time Matters</Text>
            <Text style={styles.paragraph}>Every minute counts during a heart attack. The longer you wait, the more heart muscle dies. Early treatment can save your life and limit damage to your heart.</Text>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>Don't wait for movie-dramatic symptoms. If you have chest discomfort (especially with other symptoms), unusual fatigue, shortness of breath, nausea, or pain in your arms, back, neck, or jaw — especially if you're a woman — call emergency services immediately. Better to be wrong than to wait too long.</Text>
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

