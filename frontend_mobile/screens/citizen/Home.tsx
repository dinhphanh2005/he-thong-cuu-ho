import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Dimensions, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store/store';
import { COLORS } from '../../src/constants';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { rescueAPI, incidentAPI } from '../../src/services/api';
import { connectSocket, getSocket } from '../../src/services/socket';

const { width } = Dimensions.get('window');

const INCIDENT_TYPES = [
  { id: 'ACCIDENT', icon: 'car-sport-outline', label: 'Tai nạn giao thông' },
  { id: 'BREAKDOWN', icon: 'construct-outline', label: 'Hỏng xe / Chết máy' },
  { id: 'FLOOD', icon: 'water-outline', label: 'Ngập nước' },
  { id: 'FIRE', icon: 'flame-outline', label: 'Cháy nổ' },
  { id: 'OTHER', icon: 'alert-circle-outline', label: 'Sự cố khác' },
];

export default function CitizenHome({ navigation }: any) {
  const user = useSelector((state: RootState) => state.auth.user);
  const [location, setLocation] = useState<any>(null);
  
  const mapRef = useRef<MapView>(null);
  const [currentRegion, setCurrentRegion] = useState<any>(null);
  const [activeTeams, setActiveTeams] = useState<any[]>([]);
  const [activeIncident, setActiveIncident] = useState<any>(null);

  useEffect(() => {
    let socketRef: any = null;

    (async () => {
      // 1. Get Location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      setCurrentRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05, // Phóng to hơn một chút để dễ nhìn thấy các đội xung quanh
        longitudeDelta: 0.05,
      });

      // 2. Fetch Nearby Active Teams & My Active Incident
      try {
        const [teamsRes, incRes] = await Promise.all([
          rescueAPI.getActiveTeams(loc.coords.latitude, loc.coords.longitude),
          incidentAPI.getActiveMy()
        ]);

        if (teamsRes.data?.success) setActiveTeams(teamsRes.data.data);
        if (incRes.data?.success) setActiveIncident(incRes.data.data);

      } catch (err) {
        console.log('Error fetching initial data:', err);
      }

      // 3. Connect Socket for Live Updates
      await connectSocket();
      socketRef = getSocket();
      
      if (socketRef) {
        socketRef.on('rescue:location', (data: any) => {
          setActiveTeams((prev) => {
            const exists = prev.find(t => t._id === data.teamId);
            if (exists) {
              return prev.map(t => 
                t._id === data.teamId 
                  ? { ...t, currentLocation: { ...t.currentLocation, coordinates: data.coordinates } } 
                  : t
              );
            }
            // Nếu chưa có, coi như phát hiện mới và add vào (optional, nhưng giúp map luôn live)
            return [...prev, {
              _id: data.teamId,
              name: data.teamName,
              currentLocation: { type: 'Point', coordinates: data.coordinates }
            }];
          });
        });

        socketRef.on('rescue:assigned', (data: any) => {
          // If this incident matches the one we reported (need to check if we can verify or just reload)
          incidentAPI.getActiveMy().then(res => {
            if (res.data?.success) setActiveIncident(res.data.data);
          });
        });

        socketRef.on('incident:updated', (data: any) => {
          incidentAPI.getActiveMy().then(res => {
            if (res.data?.success) setActiveIncident(res.data.data);
          });
        });
      }
    })();

    return () => {
      if (socketRef) {
        socketRef.off('rescue:location');
      }
    };
  }, []);

  const handleSOS = () => {
    Alert.alert(
      '🚨 SOS Khẩn cấp',
      'Bạn có chắc muốn gửi tín hiệu SOS? Hệ thống sẽ ngay lập tức điều phối đội cứu hộ.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Gửi SOS', style: 'destructive', onPress: () => navigation.navigate('SOS') },
      ]
    );
  };

  const handleZoom = (zoomIn: boolean) => {
    if (!currentRegion || !mapRef.current) return;
    
    const multiplier = zoomIn ? 0.5 : 2; 
    const newRegion = {
      ...currentRegion,
      latitudeDelta: currentRegion.latitudeDelta * multiplier,
      longitudeDelta: currentRegion.longitudeDelta * multiplier,
    };
    
    mapRef.current.animateToRegion(newRegion, 300);
    setCurrentRegion(newRegion);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Cứu hộ giao thông</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Account')}>
            <Ionicons name="person-circle" size={38} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        {/* Action Cards */}
        <View style={styles.cards}>
          {activeIncident && (
            <TouchableOpacity 
              style={styles.trackingCard} 
              onPress={() => navigation.navigate('Tracking', { incidentId: activeIncident._id })}
            >
              <View style={styles.cardInner}>
                <View style={[styles.reportBox, { backgroundColor: '#EBF5FF' }]}>
                  <Ionicons name="map" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.cardText}>
                   <View style={styles.flexRow}>
                      <Text style={styles.trackingTitle}>Đang xử lý sự cố</Text>
                      <View style={styles.livePulse} />
                   </View>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {activeIncident.location.address}
                  </Text>
                </View>
              </View>
              <View style={styles.goTracking}>
                 <Text style={styles.goText}>Theo dõi</Text>
                 <Ionicons name="chevron-forward" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.sosCard} onPress={handleSOS}>
            <View style={styles.cardInner}>
              <View style={styles.sosBox}>
                <Text style={styles.sosText}>SOS</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.sosTitle}>SOS Khẩn cấp</Text>
                <Text style={styles.cardSub}>Tự động gửi vị trí ngay lập tức</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reportCard}
            onPress={() => navigation.navigate('ReportIncident')}
          >
            <View style={styles.cardInner}>
              <View style={styles.reportBox}>
                <Ionicons name="location" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.reportTitle}>Báo cáo chi tiết</Text>
                <Text style={styles.cardSub}>Mô tả sự cố chi tiết</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Map Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bản đồ khu vực</Text>
          <View style={styles.mapCard}>
            {location && currentRegion ? (
              <MapView
                ref={mapRef}
                style={{ width: '100%', height: '100%' }}
                initialRegion={currentRegion}
                onRegionChangeComplete={(region) => setCurrentRegion(region)}
                showsUserLocation={true}
              >
                <Marker 
                  coordinate={{ latitude: location.latitude, longitude: location.longitude }} 
                  title="Vị trí của bạn" 
                />
                
                {/* Render các điểm cứu hộ lân cận */}
                {activeTeams.map((team) => {
                  if (!team.currentLocation?.coordinates) return null;
                  return (
                    <Marker
                      key={team._id}
                      coordinate={{
                        latitude: team.currentLocation.coordinates[1],
                        longitude: team.currentLocation.coordinates[0],
                      }}
                      title={team.name}
                      description="Đội cứu hộ đang hoạt động"
                    >
                      <View style={{
                        width: 30, height: 30, borderRadius: 15,
                        backgroundColor: '#1C294F',
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: '#fff'
                      }}>
                        <Ionicons name="car-sport" size={16} color="#fff" />
                      </View>
                    </Marker>
                  );
                })}
              </MapView>
            ) : (
              <View style={styles.mapInner}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.mapCoord}>Đang tải bản đồ...</Text>
              </View>
            )}
            
            <View style={styles.mapBadge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>Có {activeTeams.length} đội cứu hộ gần bạn</Text>
            </View>

            <View style={styles.mapControls}>
              <TouchableOpacity style={styles.ctrlBtn} onPress={() => handleZoom(false)}>
                <Ionicons name="remove" size={16} color={COLORS.dark} />
              </TouchableOpacity>
              <View style={styles.ctrlDivider} />
              <TouchableOpacity style={styles.ctrlBtn} onPress={() => handleZoom(true)}>
                <Ionicons name="add" size={16} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Incident Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loại sự cố</Text>
          <View style={styles.typeGrid}>
            {INCIDENT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.typeCard}
                onPress={() => navigation.navigate('ReportIncident', { type: t.id })}
              >
                <Ionicons name={t.icon as any} size={26} color={COLORS.primary} />
                <Text style={styles.typeLabel} numberOfLines={2}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_W = (width - 40 - 12) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  appTitle: { fontSize: 22, fontWeight: '800', color: COLORS.dark },
  cards: { paddingHorizontal: 20, gap: 12 },
  trackingCard: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
    marginBottom: 8,
  },
  flexRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trackingTitle: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  livePulse: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#E74C3C',
  },
  goTracking: {
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  goText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  sosCard: {
    backgroundColor: '#FFF5F5', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#FFD5D5',
  },
  reportCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sosBox: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: '#E74C3C',
    alignItems: 'center', justifyContent: 'center',
  },
  sosText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  reportBox: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: '#E6F0FF',
    alignItems: 'center', justifyContent: 'center',
  },
  cardText: { marginLeft: 14, flex: 1 },
  sosTitle: { fontSize: 16, fontWeight: '700', color: '#E74C3C', marginBottom: 2 },
  reportTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#8A8A8A' },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginBottom: 12 },
  mapCard: {
    height: 200, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#D6E4EF', position: 'relative',
  },
  mapInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  mapCoord: { fontSize: 11, color: '#789aaf', marginTop: 8 },
  mapBadge: {
    position: 'absolute', top: 10, left: 10, right: 10,
    backgroundColor: COLORS.white, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ECC71', marginRight: 8 },
  badgeText: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  mapControls: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8, overflow: 'hidden',
  },
  ctrlBtn: { padding: 12, paddingHorizontal: 14 }, 
  ctrlDivider: { width: 1, backgroundColor: '#ddd' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeCard: {
    width: CARD_W, backgroundColor: COLORS.white, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 12,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  typeLabel: { fontSize: 12, fontWeight: '600', color: COLORS.dark, textAlign: 'center' },
});