import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants';

const NOTIFICATIONS = [
  {
    id: '1',
    title: 'Đội cứu hộ đang đến',
    message: 'Xe cứu hộ #0001 dự kiến sẽ đến trong 5 phút nữa.',
    time: 'Vừa xong',
    type: 'incoming',
  },
  {
    id: '2',
    title: 'Hoàn thành sự cố',
    message: 'Sự cố #0001 đã được xử lý xong.\nCảm ơn bạn.',
    time: 'Hôm qua',
    type: 'completed',
  },
];

export default function NotificationScreen() {

  const renderItem = ({ item }: { item: typeof NOTIFICATIONS[0] }) => {
    const isIncoming = item.type === 'incoming';
    const iconColor = isIncoming ? COLORS.primary : '#2ECC71';
    const iconName = isIncoming ? 'car-outline' : 'checkmark-circle-outline';
    const bgColor = isIncoming ? '#E6F0FF' : '#E8F8F5';

    return (
      <View style={styles.card}>
        <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMessage}>{item.message}</Text>
          <Text style={styles.cardTime}>{item.time}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>

      <FlatList
        data={NOTIFICATIONS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  listContainer: { paddingHorizontal: 20, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 4 },
  cardMessage: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 8 },
  cardTime: { fontSize: 12, color: '#A0A0A0' },
});