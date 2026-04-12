import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { incidentAPI } from '../../src/services/api';
import { COLORS, INCIDENT_TYPES } from '../../src/constants';

export default function RescueHistory() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchIncidents = async (pageNum = 1, refresh = false) => {
    try {
      const { data } = await incidentAPI.getRescueHistory({ page: pageNum, limit: 20 });
      let incomingData = data?.data || [];
      
      if (refresh) {
        setIncidents(incomingData);
      } else {
        setIncidents((prev) => [...prev, ...incomingData]);
      }
      setHasMore(pageNum < (data?.pages || 1));
    } catch (err) {
      console.log('Error fetching history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchIncidents(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchIncidents(nextPage);
    }
  };

  const getStatusDisplay = (item: any) => {
    if (item.status === 'COMPLETED') return { text: 'Hoàn thành', color: '#2ECC71', bg: '#E8F8F5' };
    if (item.status === 'CANCELLED') return { text: 'Đã hủy', color: COLORS.gray, bg: '#EEE' };
    return { text: 'Đang xử lý', color: COLORS.primary, bg: '#E6F0FF' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusDisp = getStatusDisplay(item);
    
    // The design shows blue bus/car icon
    const iconName = 'bus-outline';
    const iconColor = COLORS.primary;
    const iconBg = '#E6F0FF';

    const incidentName = INCIDENT_TYPES[item.type as keyof typeof INCIDENT_TYPES] || 'Hỏng xe / Chết máy';

    return (
      <View style={styles.card}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.typeTitle}>{incidentName}</Text>
            
            <View style={[styles.statusBadge, { backgroundColor: statusDisp.bg }]}>
              <Text style={[styles.statusText, { color: statusDisp.color }]}>{statusDisp.text}</Text>
            </View>
          </View>
          
          <Text style={styles.metadata}>
            Mã: {item.code || '#0000'} - {new Date(item.createdAt || Date.now()).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          
          <Text style={styles.address} numberOfLines={2}>
            {item.location?.address || 'Không có địa chỉ'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading && page === 1) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch sử cứu hộ</Text>
      </View>

      {/* List */}
      <FlatList
        data={incidents}
        keyExtractor={(item, index) => item._id || index.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có lịch sử</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.dark },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  
  card: { 
    backgroundColor: COLORS.white, 
    borderRadius: 24, 
    padding: 16, 
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 
  },
  iconBox: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, flex: 1 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  
  metadata: { fontSize: 13, color: '#8A8A8A', marginBottom: 6 },
  address: { fontSize: 13, color: COLORS.dark, lineHeight: 18 },
  
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.gray, marginTop: 16 },
});
