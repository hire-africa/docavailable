import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from '../components/Icon';


const featuredBlogs = [
  {
    id: 1,
    title: 'The Doctor Will See You… Through Your Selfie Camera',
    description: 'Funny but real — emphasizes video consultations',
    image: require('../assets/images/video.jpg'),
    category: 'Telemedicine',
    date: '2024-01-15',
    author: 'DocAvailable Team',
    readTime: '5 min read',
    isBookmarked: false,
  },
  {
    id: 2,
    title: 'The Future of Healthcare: Telemedicine and AI',
    description: 'Explore the advantages of telemedicine and AI in healthcare.',
    image: require('../assets/images/ai.jpg'),
    category: 'Technology',
    date: '2024-01-10',
    author: 'DocAvailable Team',
    readTime: '8 min read',
    isBookmarked: true,
  },
  {
    id: 3,
    title: 'Your Phone = Your Doctor: 7 Health Services You Didn\'t Know You Could Get Online',
    description: 'Discover how your smartphone can provide essential healthcare services from the comfort of your home.',
    image: require('../assets/images/your phone.jpg'),
    category: 'Digital Health',
    date: '2024-01-05',
    author: 'DocAvailable Team',
    readTime: '6 min read',
    isBookmarked: false,
  },
];

const articles = [
  {
    id: 1,
    category: 'Mental Health',
    title: 'Coping with Stress and Anxiety: Tips to Manage It in Everyday Life',
    description: 'Stress and anxiety happen. Work, school, family—sometimes it all feels like too much. But small things done daily can help you stay in control.',
    image: require('../assets/images/stressed.jpg'),
    date: '2024-01-12',
    author: 'DocAvailable Team',
    readTime: '7 min read',
    isBookmarked: false,
  },
  {
    id: 2,
    category: 'Nutrition',
    title: 'Healthy Eating Habits for a Balanced Diet',
    description: 'Learn about the essential nutrients and foods for a healthy and balanced diet.',
    image: require('../assets/images/healthy diet.jpg'),
    date: '2024-01-08',
    author: 'DocAvailable Team',
    readTime: '4 min read',
    isBookmarked: true,
  },
  {
    id: 3,
    category: 'Fitness',
    title: 'From Couch to 5K: Building Fitness Habits That Actually Stick',
    description: 'Transform your fitness journey with practical tips and exercises that fit into your busy lifestyle.',
    image: require('../assets/images/marathon.jpg'),
    date: '2024-01-03',
    author: 'DocAvailable Team',
    readTime: '9 min read',
    isBookmarked: false,
  },
];

interface BlogProps {
  hideBottomNav?: boolean;
  headerContent?: React.ReactNode;
}

export default function Blog({ hideBottomNav, headerContent }: BlogProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [refreshing, setRefreshing] = useState(false);
  const [bookmarkedArticles, setBookmarkedArticles] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pressedSortChip, setPressedSortChip] = useState<string | null>(null);

  // Combine all blogs for search
  const allBlogs = [...featuredBlogs, ...articles];

  // Filter and sort blogs
  const getFilteredBlogs = () => {
    let filteredBlogs = allBlogs;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredBlogs = filteredBlogs.filter(blog => {
        const title = (blog.title || '').toLowerCase();
        const description = (blog.description || '').toLowerCase();
        const category = (blog.category || '').toLowerCase();
        const author = (blog.author || '').toLowerCase();
        return title.includes(query) || description.includes(query) || category.includes(query) || author.includes(query);
      });
    }

    // Sort blogs based on selected criteria
    switch (sortBy) {
      case 'date':
        return filteredBlogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'title':
        return filteredBlogs.sort((a, b) => a.title.localeCompare(b.title));
      case 'category':
        return filteredBlogs.sort((a, b) => a.category.localeCompare(b.category));
      case 'readTime':
        return filteredBlogs.sort((a, b) => {
          const aTime = parseInt(a.readTime) || 0;
          const bTime = parseInt(b.readTime) || 0;
          return aTime - bTime;
        });
      case 'author':
        return filteredBlogs.sort((a, b) => a.author.localeCompare(b.author));
      default:
    return filteredBlogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  };

  // Handle refresh
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Toggle bookmark
  const toggleBookmark = (articleId: number) => {
    setBookmarkedArticles(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const filteredBlogs = getFilteredBlogs();

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


      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortTitle}>Sort by</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortContent}
          decelerationRate="fast"
          snapToInterval={90}
          snapToAlignment="start"
        >
          <Pressable
            style={({ pressed }) => [
              styles.sortChip,
              sortBy === 'date' && styles.selectedSortChip,
              pressed && styles.sortChipPressed
            ]}
            onPress={() => setSortBy('date')}
            onPressIn={() => setPressedSortChip('date')}
            onPressOut={() => setPressedSortChip(null)}
          >
            <Text 
              style={[
                styles.sortChipText,
                sortBy === 'date' && styles.selectedSortChipText
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Latest
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sortChip,
              sortBy === 'title' && styles.selectedSortChip,
              pressed && styles.sortChipPressed
            ]}
            onPress={() => setSortBy('title')}
            onPressIn={() => setPressedSortChip('title')}
            onPressOut={() => setPressedSortChip(null)}
          >
            <Text 
              style={[
                styles.sortChipText,
                sortBy === 'title' && styles.selectedSortChipText
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Title A-Z
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sortChip,
              sortBy === 'category' && styles.selectedSortChip,
              pressed && styles.sortChipPressed
            ]}
            onPress={() => setSortBy('category')}
            onPressIn={() => setPressedSortChip('category')}
            onPressOut={() => setPressedSortChip(null)}
          >
            <Text 
              style={[
                styles.sortChipText,
                sortBy === 'category' && styles.selectedSortChipText
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Category
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sortChip,
              sortBy === 'readTime' && styles.selectedSortChip,
              pressed && styles.sortChipPressed
            ]}
            onPress={() => setSortBy('readTime')}
            onPressIn={() => setPressedSortChip('readTime')}
            onPressOut={() => setPressedSortChip(null)}
          >
            <Text 
              style={[
                styles.sortChipText,
                sortBy === 'readTime' && styles.selectedSortChipText
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Read Time
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sortChip,
              sortBy === 'author' && styles.selectedSortChip,
              pressed && styles.sortChipPressed
            ]}
            onPress={() => setSortBy('author')}
            onPressIn={() => setPressedSortChip('author')}
            onPressOut={() => setPressedSortChip(null)}
          >
            <Text 
              style={[
                styles.sortChipText,
                sortBy === 'author' && styles.selectedSortChipText
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Author
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
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
                  onPress={() => {
                    // Handle navigation based on blog ID
                    if (blog.id === 3) {
                      router.push('/blog-article');
                    } else if (blog.id === 1) {
                      router.push('/blog-article-2');
                    } else if (blog.id === 2) {
                      router.push('/blog-article-3');
                    } else {
                      Alert.alert('Coming Soon', 'This article will be available soon!');
                    }
                  }}
                >
                  <Image source={blog.image} style={styles.searchResultImage} />
                  <View style={styles.searchResultContent}>
                    <View style={styles.searchResultHeader}>
                    <Text style={styles.searchResultCategory}>{blog.category}</Text>
                      <TouchableOpacity 
                        onPress={() => toggleBookmark(blog.id)}
                        style={styles.bookmarkButton}
                      >
                        <Icon 
                          name={bookmarkedArticles.includes(blog.id) ? "bookmark" : "bookmark-o"} 
                          size={16} 
                          color={bookmarkedArticles.includes(blog.id) ? "#4CAF50" : "#999"} 
                        />
                      </TouchableOpacity>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
            {featuredBlogs.map(blog => (
              <TouchableOpacity 
                key={blog.id} 
                style={styles.featuredCard}
                onPress={() => {
                  if (blog.id === 3) {
                    router.push('/blog-article');
                  } else if (blog.id === 1) {
                    router.push('/blog-article-2');
                  } else if (blog.id === 2) {
                    router.push('/blog-article-3');
                  } else {
                    Alert.alert('Coming Soon', 'This article will be available soon!');
                  }
                }}
              >
                  <View style={styles.featuredImageContainer}>
                <Image source={blog.image} style={styles.featuredImage} />
                    <TouchableOpacity 
                      onPress={() => toggleBookmark(blog.id)}
                      style={styles.featuredBookmarkButton}
                    >
                      <Icon 
                        name={bookmarkedArticles.includes(blog.id) ? "bookmark" : "bookmark-o"} 
                        size={16} 
                        color={bookmarkedArticles.includes(blog.id) ? "#4CAF50" : "#fff"} 
                      />
                    </TouchableOpacity>
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

        {/* All Articles Section (only show when not searching) */}
        {!isLoading && !searchQuery.trim() && (
          <>
            <Text style={styles.sectionHeader}>All Articles</Text>
            <View style={styles.articlesList}>
              {articles.map(article => (
                <TouchableOpacity 
                  key={article.id} 
                  style={styles.articleRow}
                  onPress={() => {
                    if (article.id === 1) {
                      router.push('/blog-article-4');
                    } else if (article.id === 2) {
                      router.push('/blog-article-5');
                    } else if (article.id === 3) {
                      router.push('/blog-article-6');
                    } else {
                      Alert.alert('Coming Soon', 'This article will be available soon!');
                    }
                  }}
                >
                  <View style={styles.articleContent}>
                    <View style={styles.articleHeader}>
                    <Text style={styles.articleCategory}>{article.category}</Text>
                      <TouchableOpacity 
                        onPress={() => toggleBookmark(article.id)}
                        style={styles.articleBookmarkButton}
                      >
                        <Icon 
                          name={bookmarkedArticles.includes(article.id) ? "bookmark" : "bookmark-o"} 
                          size={16} 
                          color={bookmarkedArticles.includes(article.id) ? "#4CAF50" : "#999"} 
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.articleTitle}>{article.title}</Text>
                    <Text style={styles.articleDesc}>{article.description}</Text>
                    <View style={styles.articleMeta}>
                      <Text style={styles.articleAuthor}>{article.author}</Text>
                      <Text style={styles.articleReadTime}>{article.readTime}</Text>
                    </View>
                  </View>
                  <Image source={article.image} style={styles.articleImage} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      {/* Bottom Navigation */}
      {!hideBottomNav && (
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/')}> 
          <Icon name="home" size={16} color="#888" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/my-appointments')}> 
          <Icon name="calendar" size={14} color="#888" />
          <Text style={styles.navLabel}>Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/chat/123')}> 
          <Icon name="message" size={16} color="#888" />
          <Text style={styles.navLabel}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]} onPress={() => router.push('/blog')}> 
          <Icon name="file" size={16} color="#4CAF50" />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Blog</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/patient-profile')}> 
          <Icon name="user" size={14} color="#888" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  sortContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sortTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sortContent: {
    paddingRight: 16,
    paddingLeft: 4,
  },
  sortChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E8F5E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minWidth: 80,
    maxWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  selectedSortChip: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  sortChipText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  selectedSortChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sortChipPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
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
  featuredBookmarkButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
  articleBookmarkButton: {
    padding: 4,
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
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E8',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  activeNavItem: {},
  activeNavLabel: {
    color: '#4CAF50',
    fontWeight: '700',
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
  bookmarkButton: {
    padding: 4,
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
