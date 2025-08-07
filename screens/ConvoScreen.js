import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';

export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [userNames, setUserNames] = useState({});
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setChats(chatList);

      // Fetch user names
      const otherUserIds = chatList.map((chat) =>
        chat.participants.find((id) => id !== user.uid)
      );

      const namesMap = {};
      await Promise.all(
        otherUserIds.map(async (id) => {
          if (!userNames[id]) {
            const docSnap = await getDoc(doc(db, 'users', id));
            if (docSnap.exists()) {
              namesMap[id] = docSnap.data().name || id;
            }
          }
        })
      );

      setUserNames((prev) => ({ ...prev, ...namesMap }));
    });

    return () => unsubscribe();
  }, [user]);

  const openChat = (chat) => {
    const otherUserId = chat.participants.find((id) => id !== user.uid);
    navigation.navigate('ChatScreen', {
      senderId: user.uid,
      receiverId: otherUserId,
    });
  };

  const renderItem = ({ item }) => {
    const otherUserId = item.participants.find((id) => id !== user.uid);
    const otherUserName = userNames[otherUserId] || 'Loading...';
    const firstLetter = otherUserName.charAt(0).toUpperCase();

    return (
      <TouchableOpacity style={styles.item} onPress={() => openChat(item)}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.name}>{otherUserName}</Text>
            <Text style={styles.preview}>{item.lastMessage}</Text>
            <Text style={styles.time}>
              {new Date(item.updatedAt?.toDate()).toLocaleString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, }}>
      <Text style={styles.heading}>All Chats</Text>
      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No chats right now</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.container}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 10,
    marginTop:20,
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  item: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#00b05b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 2,
  },
  preview: {
    color: '#444',
    fontSize: 14,
  },
  time: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
