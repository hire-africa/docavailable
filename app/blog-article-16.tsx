import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle16() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Diabetes Symptoms Start Quietly: Early Signs Most People Miss', url: 'https://docavailable.com/blog/diabetes-early-signs' });
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
        <Image source={require('../assets/images/articles/diabetes.jpeg')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Diabetes Symptoms Start Quietly: Early Signs Most People Miss</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>7 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>Diabetes doesn't always announce itself loudly. Early symptoms are often subtle and easy to dismiss as "just getting older" or "being busy." But recognizing these quiet signs early can prevent serious complications.</Text>
            <Text style={styles.sectionTitle}>Early Signs (That Are Easy to Miss)</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Excessive Thirst and Frequent Urination</Text></View>
              <Text style={styles.techniqueDescription}>High blood sugar pulls fluid from tissues, making you constantly thirsty. Your kidneys work overtime to filter and absorb excess sugar, leading to frequent urination. You might think you're just drinking more water "because it's hot" or "because you're trying to be healthy."</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Fatigue</Text></View>
              <Text style={styles.techniqueDescription}>When cells can't get enough sugar (glucose) for energy because insulin isn't working properly, you feel tired all the time. Many people attribute this to stress, work, or just "being busy."</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Blurred Vision</Text></View>
              <Text style={styles.techniqueDescription}>High blood sugar can cause fluid to shift into and out of the lens of your eye, affecting your ability to focus. Vision may be blurry, then clear, then blurry again. People often think they just need new glasses.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Slow-Healing Sores or Cuts</Text></View>
              <Text style={styles.techniqueDescription}>High blood sugar affects circulation and the body's ability to heal. A small cut or blister that should heal in days takes weeks. Frequent infections (especially skin infections) are also common.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Increased Hunger</Text></View>
              <Text style={styles.techniqueDescription}>Even after eating, you might still feel hungry because your muscles and organs aren't getting enough energy from the food you eat. Your body thinks it's starving.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Unexplained Weight Loss</Text></View>
              <Text style={styles.techniqueDescription}>Despite eating more, you might lose weight because your body burns fat and muscle for energy when it can't use glucose properly.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Tingling or Numbness in Hands/Feet</Text></View>
              <Text style={styles.techniqueDescription}>High blood sugar can damage nerves, especially in extremities. Early diabetic neuropathy causes tingling, numbness, or burning sensations.</Text>
            </View>
            <Text style={styles.sectionTitle}>Why Early Recognition Matters</Text>
            <Text style={styles.paragraph}>Diabetes that goes undiagnosed or untreated damages blood vessels and nerves throughout your body, leading to:{'\n'}• Heart disease and stroke{'\n'}• Kidney disease{'\n'}• Vision loss and blindness{'\n'}• Foot problems and amputation{'\n'}• Nerve damage{'\n'}• Skin conditions</Text>
            <Text style={styles.sectionTitle}>When to Get Tested</Text>
            <Text style={styles.paragraph}>Get tested if you have any of these symptoms, especially if you're also:{'\n'}• Over 45{'\n'}• Overweight{'\n'}• Have a family history of diabetes{'\n'}• Are inactive{'\n'}• Had gestational diabetes{'\n'}• Have high blood pressure or high cholesterol</Text>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>Don't dismiss subtle symptoms. If you're constantly thirsty, urinating frequently, always tired, or have slow-healing cuts, get your blood sugar tested. Early diagnosis and treatment can prevent or delay serious complications and help you live a healthy life with diabetes.</Text>
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

