import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import {
  collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc
} from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function CommentsScreen({ route }) {
  const { productId } = route.params;
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'products', productId, 'comments'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setComments(arr.filter(c => !c.deleted));
    });
    return unsub;
  }, [productId]);

  const handlePost = async () => {
    const user = auth.currentUser;
    if (!user) return Alert.alert('Error', 'You must be logged in.');
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'products', productId, 'comments'), {
        userId: user.uid,
        userName: user.displayName || user.email,
        text: trimmed,
        createdAt: serverTimestamp(),
        deleted: false,
      });
      setText('');
    } catch (e) {
      Alert.alert('Error', 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, userId) => {
    if (auth.currentUser?.uid !== userId) return;
    try {
      await deleteDoc(doc(db, 'products', productId, 'comments', id));
    } catch (e) {
      Alert.alert('Error', 'Failed to delete.');
    }
  };

  const renderItem = ({ item }) => {
    const initial = item.userName?.charAt(0)?.toUpperCase() || '?';
    return (
      <View style={styles.comment}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.commentContent}>
          <Text style={styles.user}>{item.userName}</Text>
          <Text style={styles.commentText}>{item.text}</Text>
          {item.userId === auth.currentUser?.uid && (
            <TouchableOpacity onPress={() => handleDelete(item.id, item.userId)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.inputBox}>
            <TextInput
              placeholder="Write a comment..."
              placeholderTextColor="#999"
              value={text}
              onChangeText={setText}
              style={styles.input}
              multiline
            />
            <TouchableOpacity
              onPress={handlePost}
              disabled={submitting || !text.trim()}
              style={[styles.postButton, (submitting || !text.trim()) && styles.disabledButton]}
            >
              <Text style={styles.postButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  inputBox: {
    marginBottom: 16,
    backgroundColor: '#f1f1f1',
    padding: 12,
    borderRadius: 10,
    marginTop: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    color: '#333',
    backgroundColor: '#fff',
    fontSize: 15,
    marginBottom: 10,
  },
  postButton: {
    backgroundColor: '#00b05b',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  comment: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 1,
  },
  avatar: {
    backgroundColor: '#00b05b',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  commentContent: {
    flex: 1,
  },
  user: {
    fontWeight: '600',
    color: '#00b05b',
    marginBottom: 4,
    fontSize: 15,
  },
  commentText: {
    color: '#333',
    fontSize: 14,
  },
  deleteText: {
    color: 'red',
    marginTop: 6,
    fontSize: 13,
  },
});
