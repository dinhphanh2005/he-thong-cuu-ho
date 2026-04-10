import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants';

const INITIAL_MESSAGES = [
  { id: '1', text: 'Chào đồng chí, có một yêu cầu cứu hộ khẩn cấp tại khu vực Vành đai 3. Lốp xe bị nổ trên đường cao tốc.', time: '20:00', isMe: false },
  { id: '2', text: 'Nhận lệnh. Tôi đang di chuyển từ Khuất Duy Tiến, dự kiến khoảng 15 phút nữa sẽ tiếp cận hiện trường.', time: '20:03', isMe: true },
  { id: '3', text: 'Cập nhật: Nạn nhân đang chờ sát lề đường. Hãy chú ý an toàn vì xe đang chắn ở làn ngoài cùng.', time: '20:05', isMe: false },
];

export default function RescueChat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (!message.trim()) return;
    const newMsg = {
      id: Date.now().toString(),
      text: message.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setMessage('');
    // Scroll to end after send
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderItem = ({ item }: { item: typeof INITIAL_MESSAGES[0] }) => (
    <View style={item.isMe ? styles.rowRight : styles.rowLeft}>
      {!item.isMe && (
        <View style={styles.avatar}>
          <Ionicons name="person" size={16} color={COLORS.gray} />
        </View>
      )}
      <View style={item.isMe ? styles.bubbleOut : styles.bubbleIn}>
        <Text style={styles.msgText}>{item.text}</Text>
        <Text style={styles.msgTime}>{item.time}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Ionicons name="person" size={20} color={COLORS.gray} />
        </View>
        <Text style={styles.headerTitle}>Trung tâm điều phối</Text>
      </View>

      {/* KAV wraps messages + input together */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages — stick to bottom with justifyContent */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />

        {/* Input bar — no extra bottom padding */}
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

  // Header
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

  // Messages
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    flexGrow: 1,
    justifyContent: 'flex-end', // ← messages hug the bottom
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
    backgroundColor: '#E6E6E6', borderRadius: 20, borderTopLeftRadius: 4, padding: 14,
  },
  bubbleOut: {
    backgroundColor: '#2ECC71', borderRadius: 20, borderTopRightRadius: 4, padding: 14,
  },
  msgText: { fontSize: 14, color: COLORS.dark, lineHeight: 20 },
  msgTime: { fontSize: 10, color: '#8A8A8A', marginTop: 6 },

  // Input bar — NO paddingBottom, KAV handles it
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