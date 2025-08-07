import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 36) / 2;

const CATEGORY_STRUCTURE = [
  { name: 'bottom', subcategories: ['Jeans', 'Shorts', 'Dress Pants', 'Trousers'] },
  { name: 'upper', subcategories: ['Polo', 'T-Shirt', 'Dress Shirt'] },
  { name: 'suits', subcategories: ['Mens', 'Womans'] },
  { name: 'shoes', subcategories: ['Slippers', 'Casual Shoes', 'Dress Shoes', 'Joggers'] },
  { name: 'accessories', subcategories: ['Hats', 'Rings', 'Watches'] },
];

export default function BuyerProductsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      setLoading(false);
      setRefreshing(false);
    }, err => {
      console.error('Error fetching products:', err);
      Alert.alert('Error', 'Could not load products.');
      setLoading(false);
      setRefreshing(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsub = fetchProducts();
    return () => unsub?.();
  }, [fetchProducts]);

  useEffect(() => {
    let data = [...products];

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      data = data.filter(item =>
        item.title?.toLowerCase().includes(lower) ||
        item.category?.toLowerCase().includes(lower) ||
        item.subCategory?.toLowerCase().includes(lower)
      );
    }

    if (selectedCategory) {
      data = data.filter(item => item.category === selectedCategory);
    }

    if (selectedSubCategory) {
      data = data.filter(item => item.subCategory === selectedSubCategory);
    }

    setFilteredProducts(data);
  }, [searchText, selectedCategory, selectedSubCategory, products]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const renderCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <Text style={styles.date}>{new Date(item.createdAt?.toDate()).toDateString()}</Text>
      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.price}>${(item.price ?? 0).toFixed(2)}</Text>
      <Text style={styles.code}>#{item.id?.slice(0, 10)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        numColumns={2}
        contentContainerStyle={{ padding: 12 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <Text style={styles.header}>Browse Products</Text>
            <TextInput
              placeholder="Search..."
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
            />
            {/* Category Chips */}
            <View style={styles.categories}>
              {CATEGORY_STRUCTURE.map(cat => (
                <TouchableOpacity
                  key={cat.name}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.name && styles.selectedChip
                  ]}
                  onPress={() => {
                    const newCat = selectedCategory === cat.name ? null : cat.name;
                    setSelectedCategory(newCat);
                    setSelectedSubCategory(null);
                  }}
                >
                  <Text style={[
                    styles.chipText,
                    selectedCategory === cat.name && { color: 'white' }
                  ]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Subcategory Chips */}
            {selectedCategory && (
              <View style={styles.categories}>
                {CATEGORY_STRUCTURE.find(c => c.name === selectedCategory)?.subcategories.map(sub => (
                  <TouchableOpacity
                    key={sub}
                    style={[
                      styles.categoryChip,
                      selectedSubCategory === sub && styles.selectedChip
                    ]}
                    onPress={() => {
                      setSelectedSubCategory(
                        selectedSubCategory === sub ? null : sub
                      );
                    }}
                  >
                    <Text style={[
                      styles.chipText,
                      selectedSubCategory === sub && { color: 'white' }
                    ]}>{sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.center}>
              <Text>No products found.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 20,
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 10,
    elevation: 1,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  categoryChip: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: '#00b05b',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    width: CARD_WIDTH,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  image: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    marginBottom: 10,
  },
  date: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  code: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  center: {
    alignItems: 'center',
    marginTop: 40,
  },
});
