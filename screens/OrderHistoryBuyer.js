import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(null);
  const [cancellingIds, setCancellingIds] = useState(new Set());

  const uid = auth.currentUser?.uid;

  const fetchOrders = useCallback(() => {
    if (!uid) return;
    setLoading(true);
    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOrders(data);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        Alert.alert('Error', err.message);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsub;
  }, [uid]);

  useEffect(() => {
    const unsub = fetchOrders();
    return () => unsub && unsub();
  }, [fetchOrders]);

  const onManualRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const initiateCancel = (order) => {
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      Alert.alert('Cannot cancel', 'Only pending or confirmed orders can be cancelled.');
      return;
    }
    setConfirmingCancel(order);
  };

  const confirmCancelOrder = async () => {
    if (!confirmingCancel) return;
    const orderId = confirmingCancel.id;
    setCancellingIds((prev) => new Set(prev).add(orderId));
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
    } catch (e) {
      Alert.alert('Cancel Failed', e.message);
    } finally {
      setCancellingIds((prev) => {
        const copy = new Set(prev);
        copy.delete(orderId);
        return copy;
      });
      setConfirmingCancel(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffcc00';
      case 'confirmed': return '#007aff';
      case 'dispatched': return '#00b05b';
      case 'completed': return '#4cd964';
      case 'cancelled': return '#d9534f';
      default: return '#ccc';
    }
  };

  const renderItem = ({ item: order }) => {
    const quantity = order.quantity ?? 1;
    const unitPrice = Number(order.price ?? 0);
    const totalPrice = quantity * unitPrice;
    const isCancelling = cancellingIds.has(order.id);

    return (
      <View style={styles.card}>
        <View style={[styles.statusBar, { backgroundColor: getStatusColor(order.status) }]} />
        <TouchableOpacity
          activeOpacity={0.9}
          style={{ flex: 1, flexDirection: 'row' }}
          onPress={() => navigation.navigate('ProductDetails', { productId: order.productId })}
        >
          <Image source={{ uri: order.imageUrl }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.title}>{order.title}</Text>
            <Text style={styles.sub}>Qty: {quantity} • ${unitPrice.toFixed(2)} each</Text>
            <Text style={styles.price}>Total: ${totalPrice.toFixed(2)}</Text>
            <Text style={styles.statusText}>Status: {order.status}</Text>
          </View>
        </TouchableOpacity>

        {(order.status === 'pending' || order.status === 'confirmed') && (
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: '#d9534f' }]}
            onPress={() => initiateCancel(order)}
            disabled={isCancelling}
          >
            <AntDesign name="close" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!uid) {
    return (
      <View style={styles.center}>
        <Text>Please log in to view your orders.</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          
        </TouchableOpacity>
        <Text style={styles.header}>Order History</Text>
        <TouchableOpacity onPress={onManualRefresh}>
          <Text style={styles.reload}>{refreshing ? 'Refreshing...' : ''}</Text>
        </TouchableOpacity>
      </View>

      {orders.length === 0 ? (
        <View style={styles.center}>
          <Text>No orders found</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 140 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Confirm Cancel Modal */}
      <Modal visible={!!confirmingCancel} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Order</Text>
              <TouchableOpacity onPress={() => setConfirmingCancel(null)}>
                <AntDesign name="close" size={20} />
              </TouchableOpacity>
            </View>
            <Text style={{ marginTop: 8, fontSize: 14, color: '#333' }}>
              Are you sure you want to cancel "{confirmingCancel?.title}"?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={() => setConfirmingCancel(null)}
              >
                <Text style={styles.secondaryText}>No</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, backgroundColor: '#d9534f' }]}
                onPress={confirmCancelOrder}
              >
                <Text style={styles.primaryText}>
                  {cancellingIds.has(confirmingCancel?.id) ? 'Cancelling...' : 'Yes, Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  body:{backgroundColor:'white', flex: 1},
  headerRow: {
    marginTop:20,
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
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
    alignItems: 'center',
    gap: 12,
  },
  statusBar: { width: 6, height: '100%' },
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
  statusText: { fontSize: 12, color: '#777', marginTop: 4 },
  smallBtn: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
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
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalButtons: { flexDirection: 'row', marginTop: 18 },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#888',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  secondaryText: { color: '#444', fontWeight: '600' },
});
