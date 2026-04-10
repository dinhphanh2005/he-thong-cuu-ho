import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { incidentAPI } from '../../src/services/api';
import { COLORS, INCIDENT_TYPES } from '../../src/constants';

export default function History({ navigation }: any) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const fetchIncidents = async (pageNum = 1, refresh = false) => {
    try {
      const { data } = await incidentAPI.getMy({ page: pageNum, limit: 20 });
      if (refresh) {
        setIncidents(data.data);
      } else {
        setIncidents((prev) => [...prev, ...data.data]);
      }
      setHasMore(pageNum < data.pages);
    } catch (err) {
      console.log('Error:', err);
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

  const displayedIncidents = incidents.filter(item => {
    const isCompleted = ['COMPLETED', 'CANCELLED', 'HANDLED_BY_EXTERNAL'].includes(item.status);
    if (activeTab === 'active') return !isCompleted;
    return isCompleted;
  });

  const getStatusDisplay = (item: any) => {
    if (item.status === 'COMPLETED') return { text: 'Hoàn thành', color: '#2ECC71', bg: '#E8F8F5' };
    if (item.status === 'CANCELLED') return { text: 'Đã hủy', color: COLORS.gray, bg: '#EEE' };
    if (item.status === 'ASSIGNED') return { text: 'Đang đến', color: COLORS.primary, bg: '#E6F0FF' };
    if (item.status === 'ARRIVED') return { text: 'Đã đến hiện trường', color: '#7C3AED', bg: '#F3E8FF' };
    if (item.status === 'PROCESSING' || item.status === 'IN_PROGRESS') return { text: 'Đang xử lý', color: COLORS.primary, bg: '#E6F0FF' };
    return { text: 'Đang chờ', color: '#F39C12', bg: '#FEF5E7' }; 
  };

  const getIcon = (item: any) => {
    if (item.status === 'COMPLETED') return { name: 'checkmark-circle-outline', color: '#2ECC71', bg: '#E8F8F5' };
    if (item.code.startsWith('SOS')) return { name: 'alert-circle-outline', color: '#E74C3C', bg: '#FDEDEC' };
    return { name: 'car-outline', color: COLORS.primary, bg: '#E6F0FF' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusDisp = getStatusDisplay(item);
    const iconDisp = getIcon(item);

    return (
      // Changed from TouchableOpacity to View to disable clicking
      <View style={styles.card}>
        <View style={[styles.iconBox, { backgroundColor: iconDisp.bg as string }]}>
          <Ionicons name={iconDisp.name as any} size={24} color={iconDisp.color} />
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.typeTitle}>
              {item.code.startsWith('SOS') ? 'SOS Khẩn cấp' : (INCIDENT_TYPES[item.type as keyof typeof INCIDENT_TYPES] || 'Sự cố')}
            </Text>
            
            {activeTab === 'active' && (
              <View style={[styles.statusBadge, { backgroundColor: statusDisp.bg }]}>
                <Text style={[styles.statusText, { color: statusDisp.color }]}>{statusDisp.text}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.metadata}>
            Mã: {item.code} • {new Date(item.createdAt).toLocaleDateString('vi-VN')}
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
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch sử</Text>
      </View>

      <View style={styles.tabsContainer}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'active' && styles.tabActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
              Đang xử lý
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
              Đã hoàn thành
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={displayedIncidents}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có sự cố nào</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  tabsContainer: { paddingHorizontal: 20, marginBottom: 16 },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#EBEBEB', borderRadius: 20, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 16, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#8A8A8A' },
  tabTextActive: { color: COLORS.dark },
  list: { paddingHorizontal: 20, paddingBottom: 100, gap: 16 }, // Increased bottom padding to account for the floating navbar
  card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  typeTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  metadata: { fontSize: 13, color: '#8A8A8A', marginBottom: 6 },
  address: { fontSize: 13, color: COLORS.dark, lineHeight: 18 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.gray, marginTop: 16 },
});
