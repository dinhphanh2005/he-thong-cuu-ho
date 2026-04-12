import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants';
import { notificationAPI } from '../../src/services/api';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const getIconByStatus = (status?: string): { icon: IoniconName; color: string; bg: string } => {
  switch (status) {
    case 'ASSIGNED':
    case 'OFFERING':
      return { icon: 'car-outline', color: '#3498DB', bg: '#EBF5FF' };
    case 'ARRIVED':
      return { icon: 'location-outline', color: '#9B59B6', bg: '#F5EEFF' };
    case 'PROCESSING':
      return { icon: 'construct-outline', color: '#E67E22', bg: '#FEF0E7' };
    case 'COMPLETED':
      return { icon: 'checkmark-circle-outline', color: '#27AE60', bg: '#E8F8F0' };
    case 'CANCELLED':
      return { icon: 'close-circle-outline', color: '#95A5A6', bg: '#F2F3F4' };
    default:
      return { icon: 'notifications-outline', color: COLORS.primary, bg: '#EBF5FF' };
  }
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit',
  });
};

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = async (pageNum = 1, refresh = false) => {
    try {
      const { data } = await notificationAPI.getAll({ page: pageNum, limit: 20 });
      if (refresh) setNotifications(data.data);
      else setNotifications(prev => [...prev, ...data.data]);
      setHasMore(pageNum < (data.pages || 1));
    } catch (err) {
      console.log('Fetch notifications Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    setPage(1);
    fetchNotifications(1, true);
  }, []));

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const next = page + 1;
      setPage(next);
      fetchNotifications(next);
    }
  };

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) { console.log(err); }
  };

  const renderItem = ({ item }: { item: any }) => {
    const { icon, color, bg } = getIconByStatus(item.incident?.status);
    const time = formatTime(item.createdAt);

    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.unreadCard]}
        activeOpacity={0.75}
        onPress={() => handleMarkAsRead(item._id, item.isRead)}
      >
        {/* Left accent bar for unread */}
        {!item.isRead && <View style={styles.accentBar} />}

        {/* Icon */}
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !item.isRead && { color: COLORS.dark }]} numberOfLines={2}>
              {item.title || 'Thông báo mới'}
            </Text>
            {!item.isRead && <View style={[styles.dot, { backgroundColor: color }]} />}
          </View>
          {!!item.message && (
            <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          )}
          <Text style={styles.time}>{time}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && page === 1) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
        {notifications.some(n => !n.isRead) && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notifications.filter(n => !n.isRead).length} mới</Text>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  badge: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#FAFCFF',
  },
  accentBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  iconBox: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, flexShrink: 0,
  },
  content: { flex: 1 },
  titleRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 8, marginBottom: 4,
  },
  title: { fontSize: 14, fontWeight: '600', color: '#555', flex: 1, lineHeight: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  message: { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 6 },
  time: { fontSize: 11, color: '#B0B7C3', fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#B0B7C3' },
});