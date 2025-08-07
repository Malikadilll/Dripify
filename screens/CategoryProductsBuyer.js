import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export default function CategoryProductsScreen({ route, navigation }) {
  const { category } = route.params;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef,
      where('category', '==', category.toLowerCase()),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProducts(items);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to fetch category products', err);
        Alert.alert('Error', 'Could not load products.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [category]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading {category}...</Text>
      </View>
    );
  }

  if (!products.length) {
    return (
      <View style={styles.center}>
        <Text>No products found in {category}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>${item.price?.toFixed(2)}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    margin: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
  },
  image: { width: 100, height: 100, resizeMode: 'cover' },
  info: { flex: 1, padding: 10, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 14, color: '#555', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
