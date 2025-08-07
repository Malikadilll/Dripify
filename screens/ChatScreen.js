import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform
} from 'react-native';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { useNavigation } from '@react-navigation/native';

export default function ChatScreen({ route }) {
  const { senderId, receiverId } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [receiverData, setReceiverData] = useState(null);
  const flatListRef = useRef(null);
  const navigation = useNavigation();

  const chatId = [senderId, receiverId].sort().join('_');

  // Fetch receiver info
  useEffect(() => {
    const fetchReceiver = async () => {
      const docRef = doc(db, 'users', receiverId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setReceiverData(snap.data());
      }
    };
    fetchReceiver();
  }, [receiverId]);

  // Load messages
  useEffect(() => {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return () => unsub();
  }, [chatId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const message = {
      senderId,
      text: input,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'chats', chatId, 'messages'), message);

    await setDoc(doc(db, 'chats', chatId), {
      participants: [senderId, receiverId],
      lastMessage: input,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    setInput('');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderItem = ({ item }) => {
    const isSender = item.senderId === senderId;
    return (
      <View style={[styles.messageBubble, isSender ? styles.myMessage : styles.theirMessage]}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 ,}}
      behavior={Platform.select({ ios: 'padding' })}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        {receiverData && (
          <>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {receiverData.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.receiverName}>{receiverData.name}</Text>
          </>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          style={styles.input}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <AntDesign name="arrowright" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop:40,
    borderColor:"grey",
    borderBottomWidth:1,
  },
  backBtn: {
    marginRight: 12,
    color: '#00b05b',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00b05b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  receiverName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'black',
  },
  messageList: {
    padding: 10,
    paddingBottom: 80,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 10,
    marginBottom: 8,
    borderRadius: 10,
  },
  myMessage: {
    backgroundColor: '#00b05b',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: 'grey',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: 'white',
    fontWeight:'600'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: '#00b05b',
    padding: 12,
    borderRadius: 20,
  },
});
