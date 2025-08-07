
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
  Modal,
  TextInput,
} from 'react-native';
import { auth, db } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  orderBy,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';

export default function MyProductsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [priceInput, setPriceInput] = useState('');
  const [stockInput, setStockInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentUser = auth.currentUser;
  const sellerId = currentUser?.uid;

  const fetchProducts = useCallback(() => {
    if (!sellerId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef,
      where('sellerId', '==', sellerId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(items);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error('Failed to fetch seller products', err);
        Alert.alert('Error', 'Could not load your products.');
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, [sellerId]);

  useEffect(() => {
    const unsub = fetchProducts();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [fetchProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setPriceInput(item.price?.toString() ?? '');
    setStockInput((item.stock ?? 0).toString());
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setPriceInput('');
    setStockInput('');
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    const newPrice = parseFloat(priceInput);
    const newStock = parseInt(stockInput, 10);
    if (isNaN(newPrice) || newPrice <= 0) {
      setErrorMessage('Validation, '+ 'Price must be a positive number.');
      return;
    }
    if (isNaN(newStock) || newStock < 0) {
      setErrorMessage('Validation, '+ 'Stock must be zero or greater.');
      return;
    }

    setSaving(true);
    try {
      const productRef = doc(db, 'products', editingItem.id);
      await updateDoc(productRef, {
        price: newPrice,
        stock: newStock,
        updatedAt: serverTimestamp(),
      });
      setErrorMessage('Updated, '+ 'Product updated successfully.');
      cancelEdit();
    } catch (e) {
      console.error('Update failed', e);
      setErrorMessage('Error, '+ 'Could not update product.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item) => {
    setDeletingItem(item);
  };

  const cancelDelete = () => {
    setDeletingItem(null);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'products', deletingItem.id));
      setErrorMessage('Deleted, '+ 'Product has been deleted.');
      setDeletingItem(null);
    } catch (e) {
      console.error('Delete failed', e);
      setErrorMessage('Error, '+ 'Could not delete product.');
    } finally {
      setDeleting(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={{ flex: 1, flexDirection: 'row' }}
        onPress={() =>
          navigation.navigate('SellerProductDetails', { productId: item.id })
        }
      >
        <Image source={{ uri: item.imageUrl }} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.sub}>
            {item.category} / {item.subCategory}
          </Text>
          <Text style={styles.price}>${(item.price ?? 0).toFixed(2)}</Text>
          <Text style={styles.status}>
            {item.isActive ? 'Active' : 'Inactive'} • Stock: {item.stock ?? 0}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.smallBtn}
          onPress={() => startEdit(item)}
        >
          <AntDesign name="edit" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.smallBtn, { backgroundColor: '#d9534f' }]}
          onPress={() => confirmDelete(item)}
        >
          <MaterialIcons name="delete" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Loading your products...</Text>
      </View>
    );
  }

  if (!products.length) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 16, marginBottom: 12 }}>
          You haven't listed any products yet.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('AddProduct')}
        >
          <Text style={styles.primaryText}>Add New Product</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
    <View style={styles.body}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          
        </TouchableOpacity>
        <Text style={styles.header}>My Products</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.reload}>
            {refreshing ? '' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 140 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
  </View>
      {/* Edit Modal */}
      <Modal visible={!!editingItem} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Edit "{editingItem?.title}"
              </Text>
              <TouchableOpacity onPress={cancelEdit}>
                <AntDesign name="close" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Price</Text>
            <TextInput
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="decimal-pad"
              style={styles.modalInput}
              placeholder="e.g., 49.99"
            />

            <Text style={styles.fieldLabel}>Stock</Text>
            <TextInput
              value={stockInput}
              onChangeText={setStockInput}
              keyboardType="number-pad"
              style={styles.modalInput}
              placeholder="e.g., 10"
            />
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={cancelEdit}
                disabled={saving}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={saveEdit}
                disabled={saving}
              >
                <Text style={styles.primaryText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deletingItem} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Delete "{deletingItem?.title}"
              </Text>
              <TouchableOpacity onPress={cancelDelete}>
                <AntDesign name="close" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={{ marginTop: 4, fontSize: 14, color: '#444' }}>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={cancelDelete}
                disabled={deleting}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, backgroundColor: '#d9534f' }]}
                onPress={handleDelete}
                disabled={deleting}
              >
                <Text style={styles.primaryText}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  body:{
    backgroundColor:"white"
  },
  headerRow: {
    marginTop:20,
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  errorText: {
  color: 'red',
  textAlign: 'center',
  marginBottom: 16,
},

  header: { fontSize: 22, fontWeight: '700' },
  reload: { color: '#007aff', fontWeight: '600' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 14,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },
  info: { flex: 1, paddingHorizontal: 8 },
  title: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 12, color: '#555', marginTop: 4 },
  price: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  status: { fontSize: 12, color: '#777', marginTop: 4 },
  actionButtons: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 8,
    justifyContent: 'space-between',
  },
  smallBtn: {
    backgroundColor: '#007aff',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#00b05b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  primaryText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#888',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  secondaryText: { color: '#444', fontWeight: '600', textAlign: 'center' },

  // modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  fieldLabel: { marginTop: 8, fontWeight: '600', fontSize: 14 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d1d6',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
});
