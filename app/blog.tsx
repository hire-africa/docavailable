import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Removed expo-web-browser - now using in-app WebView instead
import BottomNavigation from '../components/BottomNavigation';
import Icon from '../components/Icon';
import apiService from './services/apiService';

type BlogSource = 'internal' | 'web';

interface BlogItem {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  author: string;
  readTime: string;
  isBookmarked: boolean;
  source: BlogSource;
  route?: string;
  url?: string;
  image?: any;
  imageUrl?: string;
}

const featuredBlogs: BlogItem[] = [
  {
    id: 'featured-1',
    title: 'The Doctor Will See You… Through Your Selfie Camera',
    description: 'Funny but real — emphasizes video consultations',
    image: require('../assets/images/video.jpg'),
    category: 'Telemedicine',
    date: '2024-01-15',
    author: 'DocAvailable Team',
    readTime: '5 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-2',
  },
  {
    id: 'featured-2',
    title: 'The Future of Healthcare: Telemedicine and AI',
    description: 'Explore the advantages of telemedicine and AI in healthcare.',
    image: require('../assets/images/ai.jpg'),
    category: 'Technology',
    date: '2024-01-10',
    author: 'DocAvailable Team',
    readTime: '8 min read',
    isBookmarked: true,
    source: 'internal',
    route: '/blog-article-3',
  },
  {
    id: 'featured-3',
    title: 'Your Phone = Your Doctor: 7 Health Services You Didn\'t Know You Could Get Online',
    description: 'Discover how your smartphone can provide essential healthcare services from the comfort of your home.',
    image: require('../assets/images/your phone.jpg'),
    category: 'Digital Health',
    date: '2024-01-05',
    author: 'DocAvailable Team',
    readTime: '6 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article',
  },
];

const articles: BlogItem[] = [
  {
    id: 'internal-1',
    category: 'Mental Health',
    title: 'Coping with Stress and Anxiety: Tips to Manage It in Everyday Life',
    description: 'Stress and anxiety happen. Work, school, family—sometimes it all feels like too much. But small things done daily can help you stay in control.',
    image: require('../assets/images/stressed.jpg'),
    date: '2024-01-12',
    author: 'DocAvailable Team',
    readTime: '7 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-4',
  },
  {
    id: 'internal-2',
    category: 'Nutrition',
    title: 'Healthy Eating Habits for a Balanced Diet',
    description: 'Learn about the essential nutrients and foods for a healthy and balanced diet.',
    image: require('../assets/images/healthy diet.jpg'),
    date: '2024-01-08',
    author: 'DocAvailable Team',
    readTime: '4 min read',
    isBookmarked: true,
    source: 'internal',
    route: '/blog-article-5',
  },
  {
    id: 'internal-3',
    category: 'Fitness',
    title: 'From Couch to 5K: Building Fitness Habits That Actually Stick',
    description: 'Transform your fitness journey with practical tips and exercises that fit into your busy lifestyle.',
    image: require('../assets/images/marathon.jpg'),
    date: '2024-01-03',
    author: 'DocAvailable Team',
    readTime: '9 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-6',
  },
  {
    id: 'internal-4',
    category: 'Infectious Disease',
    title: 'Cholera Explained Simply: Symptoms, Treatment, and When to Seek Help',
    description: 'What actually happens in the body—and what saves lives fast. Learn the critical signs and immediate steps to take.',
    image: require('../assets/images/articles/chorela.jpg.webp'),
    date: '2024-01-20',
    author: 'DocAvailable Team',
    readTime: '6 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-7',
  },
  {
    id: 'internal-5',
    category: 'Infectious Disease',
    title: 'Diarrhea Isn\'t Always "Normal": Warning Signs You Should Never Ignore',
    description: 'When common symptoms become dangerous. Know when to seek immediate medical attention.',
    image: require('../assets/images/articles/Diarrhea.jpg'),
    date: '2024-01-18',
    author: 'DocAvailable Team',
    readTime: '5 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-8',
  },
  {
    id: 'internal-6',
    category: 'Infectious Disease',
    title: 'Malaria Symptoms Can Look Mild — Until They\'re Not',
    description: 'How to spot malaria early and why timing matters. Early detection can be lifesaving.',
    image: require('../assets/images/articles/Mosquito-insect-feeding-on-human-culex-pipiens.webp'),
    date: '2024-01-16',
    author: 'DocAvailable Team',
    readTime: '7 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-9',
  },
  {
    id: 'internal-7',
    category: 'Infectious Disease',
    title: 'Fever, Chills, Headache: Is It Malaria, Flu, or Something Else?',
    description: 'A simple guide to telling the difference between these common but serious conditions.',
    image: require('../assets/images/articles/headech.webp'),
    date: '2024-01-14',
    author: 'DocAvailable Team',
    readTime: '6 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-10',
  },
  {
    id: 'internal-8',
    category: 'Women\'s Health',
    title: 'Cervical Cancer: Early Symptoms Most Women Miss',
    description: 'Why screening saves lives even before symptoms appear. Know the signs and protect your health.',
    image: require('../assets/images/articles/cervical cancer.avif'),
    date: '2024-01-22',
    author: 'DocAvailable Team',
    readTime: '8 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-11',
  },
  {
    id: 'internal-9',
    category: 'Infectious Disease',
    title: 'HIV Today: Symptoms, Treatment, and Why Life Expectancy Has Changed',
    description: 'HIV is no longer a death sentence — here\'s what\'s different now and how modern treatment works.',
    image: require('../assets/images/articles/HIV.avif'),
    date: '2024-01-19',
    author: 'DocAvailable Team',
    readTime: '9 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-12',
  },
  {
    id: 'internal-10',
    category: 'Infectious Disease',
    title: 'Tuberculosis (TB) Isn\'t Just a Cough — Here\'s How It Really Spreads',
    description: 'Symptoms, testing, and modern treatment explained. Understanding TB prevention and care.',
    image: require('../assets/images/articles/TB.jpg'),
    date: '2024-01-17',
    author: 'DocAvailable Team',
    readTime: '7 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-13',
  },
  {
    id: 'internal-11',
    category: 'Respiratory Health',
    title: 'Pneumonia Explained: When a Cough Turns Serious',
    description: 'Who is most at risk and when to get urgent care. Recognizing the signs of a serious lung infection.',
    image: require('../assets/images/articles/pnemunonia.jpg'),
    date: '2024-01-15',
    author: 'DocAvailable Team',
    readTime: '6 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-14',
  },
  {
    id: 'internal-12',
    category: 'Cardiovascular',
    title: 'High Blood Pressure Has No Symptoms — Until It\'s Too Late',
    description: 'Why hypertension is called the "silent killer" and what you can do to protect yourself.',
    image: require('../assets/images/articles/headech.webp'),
    date: '2024-01-21',
    author: 'DocAvailable Team',
    readTime: '5 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-15',
  },
  {
    id: 'internal-13',
    category: 'Chronic Disease',
    title: 'Diabetes Symptoms Start Quietly: Early Signs Most People Miss',
    description: 'Thirst, fatigue, and slow healing explained. Recognizing diabetes before complications develop.',
    image: require('../assets/images/articles/diabetes.jpeg'),
    date: '2024-01-13',
    author: 'DocAvailable Team',
    readTime: '7 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-16',
  },
  {
    id: 'internal-14',
    category: 'Emergency',
    title: 'Stroke Warning Signs Everyone Should Know (FAST Could Save a Life)',
    description: 'Minutes matter more than you think. Learn the FAST method and act quickly to save lives.',
    image: require('../assets/images/articles/stroke.png'),
    date: '2024-01-11',
    author: 'DocAvailable Team',
    readTime: '6 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-17',
  },
  {
    id: 'internal-15',
    category: 'Emergency',
    title: 'Heart Attacks Don\'t Always Look Like the Movies',
    description: 'Common myths and real symptoms in men and women. Know what a heart attack actually feels like.',
    image: require('../assets/images/articles/heart attack.png'),
    date: '2024-01-09',
    author: 'DocAvailable Team',
    readTime: '8 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-18',
  },
  {
    id: 'internal-16',
    category: 'Respiratory Health',
    title: 'Asthma Attacks Explained: Triggers, Symptoms, and Emergency Care',
    description: 'What to do when breathing becomes difficult. Managing asthma and preventing severe attacks.',
    image: require('../assets/images/articles/asthma.jpg'),
    date: '2024-01-07',
    author: 'DocAvailable Team',
    readTime: '7 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-19',
  },
  {
    id: 'internal-17',
    category: 'Pediatrics',
    title: 'Why Children Get Dehydrated Faster — and How to Treat It at Home',
    description: 'A simple guide for parents and caregivers. Recognizing and treating dehydration in children.',
    image: require('../assets/images/articles/children dehydrated.webp'),
    date: '2024-01-25',
    author: 'DocAvailable Team',
    readTime: '5 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-20',
  },
  {
    id: 'internal-18',
    category: 'Infectious Disease',
    title: 'Food Poisoning vs. Stomach Flu: How to Tell the Difference',
    description: 'Similar symptoms, very different causes. Learn when to seek help and how to recover faster.',
    image: require('../assets/images/articles/food poisoing.jpg'),
    date: '2024-01-23',
    author: 'DocAvailable Team',
    readTime: '6 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-21',
  },
  {
    id: 'internal-19',
    category: 'Dermatology',
    title: 'Skin Rashes Explained: When It\'s Harmless and When It\'s Serious',
    description: 'From allergies to infections. Understanding what your skin is telling you.',
    image: require('../assets/images/articles/rashes.jpg'),
    date: '2024-01-06',
    author: 'DocAvailable Team',
    readTime: '6 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-22',
  },
  {
    id: 'internal-20',
    category: 'Mental Health',
    title: 'Mental Health Isn\'t "Just Stress": Signs of Depression and Anxiety',
    description: 'Symptoms, treatment options, and when to seek help. Breaking the stigma around mental health.',
    image: require('../assets/images/articles/manage-stress-in-the-workplace-min.png'),
    date: '2024-01-04',
    author: 'DocAvailable Team',
    readTime: '8 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-23',
  },
  {
    id: 'internal-21',
    category: 'Neurology',
    title: 'Epilepsy Explained: What Seizures Look Like and How Treatment Works',
    description: 'Breaking myths and reducing stigma. Understanding epilepsy and modern treatment options.',
    image: require('../assets/images/articles/epilipsy.webp'),
    date: '2024-01-02',
    author: 'DocAvailable Team',
    readTime: '7 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-24',
  },
  {
    id: 'internal-22',
    category: 'Hematology',
    title: 'Anemia Explained: Why You\'re Always Tired',
    description: 'Symptoms, causes, and treatment options. Understanding why fatigue might be more than just being busy.',
    image: require('../assets/images/articles/anemia.jpeg'),
    date: '2024-01-01',
    author: 'DocAvailable Team',
    readTime: '6 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-25',
  },
  {
    id: 'internal-23',
    category: 'General Medicine',
    title: 'Antibiotics Explained: When They Work — and When They Don\'t',
    description: 'Why misuse makes infections harder to treat. Understanding proper antibiotic use and antibiotic resistance.',
    image: require('../assets/images/articles/antiobitics.jpg'),
    date: '2023-12-30',
    author: 'DocAvailable Team',
    readTime: '7 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-26',
  },
];

const excitingArticles: BlogItem[] = [
  {
    id: 'exciting-1',
    category: 'Emergency',
    title: 'Stroke Warning Signs Everyone Should Know (FAST Could Save a Life)',
    description: 'Minutes matter more than you think. Learn the FAST method and act quickly to save lives.',
    image: require('../assets/images/articles/stroke.png'),
    date: '2024-01-26',
    author: 'DocAvailable Team',
    readTime: '6 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-17',
  },
  {
    id: 'exciting-2',
    category: 'Emergency',
    title: 'Heart Attacks Don\'t Always Look Like the Movies',
    description: 'Common myths and real symptoms in men and women. Know what a heart attack actually feels like.',
    image: require('../assets/images/articles/heart attack.png'),
    date: '2024-01-24',
    author: 'DocAvailable Team',
    readTime: '8 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-18',
  },
  {
    id: 'exciting-3',
    category: 'Emergency',
    title: 'High Blood Pressure Has No Symptoms — Until It\'s Too Late',
    description: 'Why hypertension is called the "silent killer" and what you can do to protect yourself.',
    image: require('../assets/images/articles/headech.webp'),
    date: '2024-01-21',
    author: 'DocAvailable Team',
    readTime: '5 min read',
    isBookmarked: false,
    source: 'internal',
    route: '/blog-article-15',
  },
];

interface BlogProps {
  hideBottomNav?: boolean;
  headerContent?: React.ReactNode;
}

export default function Blog({ hideBottomNav, headerContent }: BlogProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [bookmarkedArticles, setBookmarkedArticles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [webArticles, setWebArticles] = useState<BlogItem[]>([]);
  const [webArticlesError, setWebArticlesError] = useState<string | null>(null);

  // Combine all blogs for search - memoized
  const allBlogs = useMemo(() => [...featuredBlogs, ...excitingArticles, ...webArticles, ...articles], [webArticles]);

  // Filter blogs by search query - memoized
  const filteredBlogs = useMemo(() => {
    let filtered = allBlogs;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(blog => {
        const title = (blog.title || '').toLowerCase();
        const description = (blog.description || '').toLowerCase();
        const category = (blog.category || '').toLowerCase();
        const author = (blog.author || '').toLowerCase();
        return title.includes(query) || description.includes(query) || category.includes(query) || author.includes(query);
      });
    }

    // Sort by date (newest first) by default
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allBlogs, searchQuery]);

  const getBlogImageSource = useCallback((blog: BlogItem) => {
    // For web articles, prioritize imageUrl (remote image from RSS feed)
    if (blog.imageUrl && typeof blog.imageUrl === 'string' && blog.imageUrl.trim() !== '') {
      return { uri: blog.imageUrl.trim() };
    }
    // For internal articles, use the local image asset
    if (blog.image) return blog.image;
    // Fallback to icon.png instead of logo
    return require('../assets/images/icon.png');
  }, []);

  const openBlog = useCallback(async (blog: BlogItem) => {
    if (blog.source === 'internal' && blog.route) {
      router.push(blog.route as any);
      return;
    }

    if (blog.url) {
      // Navigate to in-app WebView instead of external browser
      router.push({
        pathname: '/blog-article-web',
        params: {
          url: blog.url,
          title: blog.title || 'Article',
        },
      } as any);
      return;
    }

    Alert.alert('Coming Soon', 'This article will be available soon!');
  }, [router]);

  const fetchWebArticles = React.useCallback(async () => {
    try {
      setWebArticlesError(null);
      setIsLoading(true);

      const res = await apiService.get<{ articles: Array<any> }>('/blog/feed', { limit: 3 });
      if (!res?.success) {
        setWebArticlesError(res?.message || 'Failed to load web articles');
        setWebArticles([]);
        setIsLoading(false);
        return;
      }

      if (!res.data?.articles) {
        setWebArticlesError('Web feed returned an unexpected response');
        setWebArticles([]);
        setIsLoading(false);
        return;
      }

      const mapped: BlogItem[] = res.data.articles.map((a) => {
        const publishedAt = typeof a.publishedAt === 'string' ? a.publishedAt : null;
        const date = publishedAt ? publishedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
        
        // Ensure imageUrl is a valid string (not null, not empty)
        const imageUrl = (a.imageUrl && typeof a.imageUrl === 'string' && a.imageUrl.trim() !== '') 
          ? a.imageUrl.trim() 
          : undefined;

        return {
          id: `web-${a.id || Math.random().toString(36).slice(2)}`,
          title: a.title || 'Untitled',
          description: a.description || '',
          category: a.source || 'WHO News',
          date,
          author: a.source || 'External',
          readTime: 'Read',
          isBookmarked: false,
          source: 'web',
          url: a.url,
          imageUrl: imageUrl,
        };
      });

      setWebArticles(mapped.filter((x) => !!x.url));
    } catch (e: any) {
      setWebArticlesError(e?.message || 'Failed to load web articles');
      setWebArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle refresh
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchWebArticles().finally(() => setRefreshing(false));
  }, []);

  // Toggle bookmark
  const toggleBookmark = useCallback((articleId: string) => {
    setBookmarkedArticles(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  }, []);

  React.useEffect(() => {
    fetchWebArticles();
  }, [fetchWebArticles]);

  // Empty state component
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIcon}>
        <Icon name="file" size={48} color="#E0E0E0" />
      </View>
      <Text style={styles.emptyStateTitle}>No articles found</Text>
      <Text style={styles.emptyStateDescription}>
        {searchQuery.trim() 
          ? `No articles match "${searchQuery}"` 
          : 'No articles found'
        }
      </Text>
      <TouchableOpacity 
        style={styles.emptyStateButton}
        onPress={() => {
          setSearchQuery('');
        }}
      >
        <Text style={styles.emptyStateButtonText}>View All Articles</Text>
      </TouchableOpacity>
    </View>
  );

  // Loading state component
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.loadingText}>Loading articles...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header (from parent) */}
      {headerContent}
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
        <Icon name="search" size={22} color="#4CAF50" />
        <TextInput
            style={styles.searchInput}
            placeholder="Search articles, authors, or topics..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Icon name="times" size={22} color="#666" />
          </TouchableOpacity>
        )}
        </View>
      </View>



      <ScrollView 
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Loading State */}
        {isLoading && renderLoadingState()}

        {/* Empty State */}
        {!isLoading && filteredBlogs.length === 0 && renderEmptyState()}

        {/* Search Results */}
        {!isLoading && searchQuery.trim() && filteredBlogs.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsTitle}>
              Search Results ({filteredBlogs.length})
            </Text>
            <View style={styles.searchResultsList}>
              {filteredBlogs.map(blog => (
                <TouchableOpacity 
                  key={blog.id} 
                  style={styles.searchResultItem}
                  onPress={() => openBlog(blog)}
                >
                  <Image 
                    source={getBlogImageSource(blog)} 
                    style={styles.searchResultImage}
                    resizeMode="cover"
                  />
                  <View style={styles.searchResultContent}>
                    <View style={styles.searchResultHeader}>
                    <Text style={styles.searchResultCategory}>{blog.category}</Text>
                    </View>
                    <Text style={styles.searchResultTitle}>{blog.title}</Text>
                    <Text style={styles.searchResultDesc}>{blog.description}</Text>
                    <View style={styles.searchResultMeta}>
                      <Text style={styles.searchResultAuthor}>{blog.author}</Text>
                      <Text style={styles.searchResultReadTime}>{blog.readTime}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Featured Blogs Horizontal Scroll (only show when not searching) */}
        {!isLoading && !searchQuery.trim() && (
          <>
            <Text style={styles.sectionTitle}>Featured Articles</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.featuredScroll}
            removeClippedSubviews={true}
            scrollEventThrottle={16}
          >
            {featuredBlogs.map(blog => (
              <TouchableOpacity 
                key={blog.id} 
                style={styles.featuredCard}
                onPress={() => openBlog(blog)}
              >
                  <View style={styles.featuredImageContainer}>
                <Image 
                  source={getBlogImageSource(blog)} 
                  style={styles.featuredImage}
                  resizeMode="cover"
                />
                  </View>
                  <View style={styles.featuredContent}>
                    <Text style={styles.featuredCategory}>{blog.category}</Text>
                <Text style={styles.featuredTitle}>{blog.title}</Text>
                <Text style={styles.featuredDesc}>{blog.description}</Text>
                    <View style={styles.featuredMeta}>
                      <Text style={styles.featuredAuthor}>{blog.author}</Text>
                      <Text style={styles.featuredReadTime}>{blog.readTime}</Text>
                    </View>
                  </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          </>
        )}

        {/* Health Alerts Section (only show when not searching) */}
        {!isLoading && !searchQuery.trim() && (
          <>
            <Text style={styles.sectionHeader}>Health Alerts</Text>
            <View style={styles.articlesList}>
              {excitingArticles.slice(0, 2).map(article => (
                <TouchableOpacity
                  key={article.id}
                  style={styles.articleRow}
                  onPress={() => openBlog(article)}
                >
                  <View style={styles.articleContent}>
                    <View style={styles.articleHeader}>
                      <Text style={styles.articleCategory}>{article.category}</Text>
                    </View>
                    <Text style={styles.articleTitle}>{article.title}</Text>
                    <Text style={styles.articleDesc}>{article.description}</Text>
                    <View style={styles.articleMeta}>
                      <Text style={styles.articleAuthor}>{article.author}</Text>
                      <Text style={styles.articleReadTime}>{article.readTime}</Text>
                    </View>
                  </View>
                  <Image 
                    source={getBlogImageSource(article)} 
                    style={styles.articleImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* World Health Organization News (only show when not searching) */}
        {!isLoading && !searchQuery.trim() && (
          <>
            <Text style={styles.sectionHeader}>World Health Organization News</Text>
            {webArticlesError ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateTitle}>Couldn’t load web articles</Text>
                <Text style={styles.emptyStateDescription}>{webArticlesError}</Text>
                <TouchableOpacity style={styles.emptyStateButton} onPress={fetchWebArticles}>
                  <Text style={styles.emptyStateButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : webArticles.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateTitle}>No web articles right now</Text>
                <Text style={styles.emptyStateDescription}>
                  Pull to refresh, or try again in a moment.
                </Text>
                <TouchableOpacity style={styles.emptyStateButton} onPress={fetchWebArticles}>
                  <Text style={styles.emptyStateButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.articlesList}>
                {webArticles.slice(0, 3).map(article => (
                  <TouchableOpacity
                    key={article.id}
                    style={styles.articleRow}
                    onPress={() => openBlog(article)}
                  >
                    <View style={styles.articleContent}>
                      <View style={styles.articleHeader}>
                        <Text style={styles.articleCategory}>{article.category}</Text>
                      </View>
                      <Text style={styles.articleTitle}>{article.title}</Text>
                      <Text style={styles.articleDesc}>{article.description}</Text>
                      <View style={styles.articleMeta}>
                        <Text style={styles.articleAuthor}>{article.author}</Text>
                        <Text style={styles.articleReadTime}>{article.readTime}</Text>
                      </View>
                    </View>
                    <Image 
                    source={getBlogImageSource(article)} 
                    style={styles.articleImage}
                    resizeMode="cover"
                  />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* All Articles Section (only show when not searching) */}
        {!isLoading && !searchQuery.trim() && (
          <>
            <Text style={styles.sectionHeader}>All Articles</Text>
            <View style={styles.articlesList}>
              {articles.map(article => (
                <TouchableOpacity 
                  key={article.id} 
                  style={styles.articleRow}
                  onPress={() => openBlog(article)}
                >
                  <View style={styles.articleContent}>
                    <View style={styles.articleHeader}>
                    <Text style={styles.articleCategory}>{article.category}</Text>
                    </View>
                    <Text style={styles.articleTitle}>{article.title}</Text>
                    <Text style={styles.articleDesc}>{article.description}</Text>
                    <View style={styles.articleMeta}>
                      <Text style={styles.articleAuthor}>{article.author}</Text>
                      <Text style={styles.articleReadTime}>{article.readTime}</Text>
                    </View>
                  </View>
                  <Image 
                    source={getBlogImageSource(article)} 
                    style={styles.articleImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      {/* Bottom Navigation */}
      {!hideBottomNav && (
        <BottomNavigation
          tabs={[
            {
              icon: "home",
              label: "Home",
              isActive: false,
              onPress: () => router.push('/')
            },
            {
              icon: "calendar",
              label: "Appointments",
              isActive: false,
              onPress: () => router.push('/my-appointments')
            },
            {
              icon: "message",
              label: "Messages",
              isActive: false,
              onPress: () => router.push('/chat/123')
            },
            {
              icon: "file",
              label: "Blog",
              isActive: true,
              onPress: () => router.push('/blog')
            },
            {
              icon: "user",
              label: "Profile",
              isActive: false,
              onPress: () => router.push('/patient-profile')
            }
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingBottom: 80, // Space for bottom navigation
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
    marginLeft: 12,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 20,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 20,
    marginBottom: 16,
    marginTop: 8,
  },
  featuredScroll: {
    paddingLeft: 20,
    marginBottom: 24,
  },
  featuredCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  featuredImageContainer: {
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  featuredContent: {
    padding: 20,
  },
  featuredCategory: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 22,
  },
  featuredDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  featuredMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredAuthor: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  featuredReadTime: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  articlesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  articleRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  articleContent: {
    flex: 1,
    marginRight: 12,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  articleCategory: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 22,
  },
  articleDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleAuthor: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  articleReadTime: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  articleImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  searchResultsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  searchResultsList: {},
  searchResultItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchResultImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 14,
    resizeMode: 'cover',
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  searchResultCategory: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 22,
  },
  searchResultDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  searchResultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultAuthor: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  searchResultReadTime: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 
