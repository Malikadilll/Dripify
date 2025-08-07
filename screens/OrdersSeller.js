
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AntDesign } from '@expo/vector-icons';

const humanDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : ts;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const StatusBadge = ({ status }) => {
  const mapping = {
    pending: { label: 'Pending', bg: '#fff4e5', color: '#a66300' },
    confirmed: { label: 'Dispatched', bg: '#d1ecf1', color: '#0c5460' },
    completed: { label: 'Completed', bg: '#d4edda', color: '#155724' },
    cancelled: { label: 'Cancelled', bg: '#f8d7da', color: '#721c24' },
  };
  const m = mapping[status] || { label: status, bg: '#eee', color: '#444' };
  return (
    <View style={[badgeStyles.badge, { backgroundColor: m.bg }]}>
      <Text style={[badgeStyles.text, { color: m.color }]}>{m.label}</Text>
    </View>
  );
};

const OrderCard = ({ order, onUpdate, isUpdating }) => {
  const quantity = order.quantity ?? 1;
  const total = (order.price ?? 0) * quantity;

  const [buyerAddress, setBuyerAddress] = useState(null);

  useEffect(() => {
    const fetchBuyerAddress = async () => {
      try {
        const buyerRef = doc(db, 'users', order.buyerId);
        const snap = await getDoc(buyerRef);
        if (snap.exists()) {
          const data = snap.data();
          setBuyerAddress(data.address || 'No address found.');
        } else {
          setBuyerAddress('No address found.');
        }
      } catch (e) {
        console.error('Failed to fetch buyer address:', e);
        setBuyerAddress('Error fetching address.');
      }
    };

    if (order.buyerId) {
      fetchBuyerAddress();
    }
  }, [order.buyerId]);

  return (
    <View style={styles.card}>
      <View style={styles.imageWrapper}>
        {order.imageUrl ? (
          <Image
            source={{ uri: order.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.fallbackImage}>
            <AntDesign name="picture" size={32} color="#888" />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {order.title}
          </Text>
          <Text style={styles.date}>{humanDate(order.createdAt)}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
          <Text style={styles.info}>Qty: {quantity}</Text>
          <Text style={styles.info}>Total: ${total.toFixed(2)}</Text>
        </View>
        {buyerAddress === null ? (
          <ActivityIndicator size="small" color="#888" style={{ marginTop: 8 }} />
        ) : (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#444' }}>Shipping to:</Text>
            <Text style={{ fontSize: 13, color: '#333', marginTop: 2 }}>
              {buyerAddress}
            </Text>
          </View>
        )}

        <View style={styles.statusRow}>
          <StatusBadge status={order.status} />
          <Text style={styles.smallText}>ID: {order.id.slice(0, 6)}</Text>
        </View>

        <View style={styles.actions}>
          {order.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionBtn, isUpdating && styles.disabledBtn]}
              onPress={() => onUpdate(order.id, 'confirmed')}
              disabled={isUpdating}
            >
              <Text style={styles.actionText}>
                {isUpdating ? 'Updating...' : 'Mark as Dispatched'}
              </Text>
            </TouchableOpacity>
          )}
          {order.status === 'confirmed' && (
            <TouchableOpacity
              style={[styles.actionBtn, isUpdating && styles.disabledBtn]}
              onPress={() => onUpdate(order.id, 'completed')}
              disabled={isUpdating}
            >
              <Text style={styles.actionText}>
                {isUpdating ? 'Updating...' : 'Mark as Completed'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default function SellerOrderManagementScreen() {
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingIds, setUpdatingIds] = useState(new Set());

  const sellerId = auth.currentUser?.uid;
  if (!sellerId) {
    return (
      <View style={styles.center}>
        <Text>Please log in to view your orders.</Text>
      </View>
    );
  }

  const partitionOrders = (all) => {
    const active = all.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
    const completed = all.filter((o) => o.status === 'completed' || o.status === 'cancelled');
    setActiveOrders(active);
    setCompletedOrders(completed);
  };

  const fetchOnce = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'orders'),
        where('sellerId', '==', sellerId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const allOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      partitionOrders(allOrders);
    } catch (e) {
      Alert.alert('Error fetching orders', e.message);
    }
  }, [sellerId]);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'orders'),
      where('sellerId', '==', sellerId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const allOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        partitionOrders(allOrders);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        Alert.alert('Sync error', err.message);
        setLoading(false);
        setRefreshing(false);
      }
    );
    return () => unsub();
  }, [sellerId]);

  const onManualRefresh = async () => {
    setRefreshing(true);
    await fetchOnce();
    setRefreshing(false);
  };

  const updateStatus = async (orderId, newStatus) => {
    setUpdatingIds((prev) => new Set(prev).add(orderId));
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (e) {
      Alert.alert('Failed to update order', e.message);
    } finally {
      setUpdatingIds((prev) => {
        const copy = new Set(prev);
        copy.delete(orderId);
        return copy;
      });
    }
  };

  const sections = [
    { title: '📦 Active Orders', data: activeOrders },
    { title: '✅ Completed / Cancelled', data: completedOrders },
  ];

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Loading seller orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Order Management</Text>
        <TouchableOpacity onPress={onManualRefresh} disabled={refreshing}>
          <Text style={styles.reload}>{refreshing ? '' : ''}</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onUpdate={updateStatus}
            isUpdating={updatingIds.has(item.id)}
          />
        )}
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {data.length === 0 && (
              <Text style={styles.emptyText}>
                {title.includes('Active') ? 'No active orders.' : 'No past orders.'}
              </Text>
            )}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} />}
        ListEmptyComponent={
          !loading && activeOrders.length + completedOrders.length === 0 ? (
            <View style={styles.center}>
              <Text style={{ fontSize: 16 }}>You have no orders yet.</Text>
            </View>
          ) : null
        }
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  text: { fontSize: 12, fontWeight: '600' },
});

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: 'white' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    marginTop:15,

  },
  header: { fontSize: 24, fontWeight: '700' },
  reload: { color: '#007aff', fontWeight: '600' },
  sectionHeader: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  imageWrapper: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f3f9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  date: { fontSize: 12, color: '#666' },
  info: { fontSize: 13, color: '#444' },
  smallText: { fontSize: 11, color: '#666', marginLeft: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  actions: { marginTop: 10, flexDirection: 'row', gap: 12 },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#00b05b',
    alignItems: 'center',
    flex: 1,
  },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  disabledBtn: { opacity: 0.6 },
});
