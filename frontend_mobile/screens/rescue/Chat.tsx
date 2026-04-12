import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Platform, KeyboardAvoidingView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants';
import { chatAPI, incidentAPI } from '../../src/services/api';
import { getSocket } from '../../src/services/socket';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store/store';

export default function RescueChat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const user = useSelector((state: RootState) => state.auth.user);
  const flatListRef = useRef<FlatList>(null);

  // 1. Fetch Active Incident
  useEffect(() => {
    const fetchActive = async () => {
      try {
        const { data } = await incidentAPI.getActiveRescue();
        if (data && data.data) {
          setActiveIncidentId(data.data._id);
        }
      } catch (err) {
        console.log('Lỗi fetch active incident:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActive();
  }, []);

  // 2. Fetch Messages and subscribe socket
  useEffect(() => {
    if (!activeIncidentId) return;
    
    const fetchMessages = async () => {
      try {
        const { data } = await chatAPI.getMessages(activeIncidentId);
        setMessages(data.data || []);
      } catch (err) {
        console.log('Lỗi fetch messages:', err);
      }
    };

    fetchMessages();

    // Setup Socket
    const socket = getSocket();
    if (socket) {
      socket.emit('chat:join', activeIncidentId);

      const handleNewMessage = (msg: any) => {
        if (msg.incidentId === activeIncidentId) {
          setMessages(prev => {
            if (prev.find(m => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      };

      socket.on('chat:message', handleNewMessage);

      return () => {
        socket.emit('chat:leave', activeIncidentId);
        socket.off('chat:message', handleNewMessage);
      };
    }
  }, [activeIncidentId]);

  const handleSend = async () => {
    if (!message.trim() || !activeIncidentId) return;
    const txt = message;
    setMessage('');
    
    try {
      await chatAPI.sendMessage(activeIncidentId, txt);
    } catch (err) {
      console.log('Lỗi gửi tin nhắn', err);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMe = item.sender?._id === user?._id;
    const isSystem = item.messageType === 'SYSTEM';

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }

    const timeString = new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={isMe ? styles.rowRight : styles.rowLeft}>
        {!isMe && (
          <View style={styles.avatar}>
            <Ionicons name="person" size={16} color={COLORS.gray} />
          </View>
        )}
        <View style={isMe ? styles.bubbleOut : styles.bubbleIn}>
          {!isMe && <Text style={{fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 4}}>{item.sender?.name}</Text>}
          <Text style={isMe ? styles.msgTextOut : styles.msgTextIn}>{item.text}</Text>
          <Text style={isMe ? styles.msgTimeOut : styles.msgTimeIn}>{timeString}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Luồng điều phối</Text>
        </View>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!activeIncidentId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Luồng điều phối</Text>
        </View>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20}}>
          <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
          <Text style={{textAlign: 'center', color: COLORS.gray, marginTop: 16, fontSize: 16, fontWeight: '600'}}>Bạn chưa nhận xử lý sự cố nào.</Text>
          <Text style={{textAlign: 'center', color: '#8A8A8A', marginTop: 8}}>Tính năng chat chỉ khả dụng khi bạn đang thực hiện nhiệm vụ.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Ionicons name="people" size={20} color={COLORS.gray} />
        </View>
        <Text style={styles.headerTitle}>Trung tâm điều phối</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#A0A0A0"
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={styles.sendBtn}
            disabled={!message.trim()}
            onPress={handleSend}
          >
            <Ionicons
              name="send"
              size={20}
              color={message.trim() ? '#2ECC71' : COLORS.lightGray}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
    backgroundColor: '#F5F7FA',
  },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EBEBEB', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  systemMessageText: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
    color: '#6B7280',
    overflow: 'hidden',
  },
  rowLeft: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 20, maxWidth: '80%',
  },
  rowRight: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginBottom: 20, maxWidth: '80%', alignSelf: 'flex-end',
  },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#EBEBEB', alignItems: 'center', justifyContent: 'center', marginRight: 8,
    marginTop: 4,
  },
  bubbleIn: {
    backgroundColor: '#FFFFFF', borderRadius: 20, borderTopLeftRadius: 4, padding: 14,
    borderWidth: 1, borderColor: '#EEE'
  },
  bubbleOut: {
    backgroundColor: '#2ECC71', borderRadius: 20, borderTopRightRadius: 4, padding: 14,
  },
  msgTextIn: { fontSize: 14, color: COLORS.dark, lineHeight: 20 },
  msgTextOut: { fontSize: 14, color: '#FFF', lineHeight: 20 },
  msgTimeIn: { fontSize: 10, color: '#8A8A8A', marginTop: 6 },
  msgTimeOut: { fontSize: 10, color: '#E8F8F5', marginTop: 6 },

  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  textInput: {
    flex: 1, backgroundColor: '#F5F7FA',
    borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12,
    fontSize: 15, color: COLORS.dark,
  },
  sendBtn: { marginLeft: 14, padding: 8 },
});