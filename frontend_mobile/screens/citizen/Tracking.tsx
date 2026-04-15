import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ActivityIndicator, Image, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS } from '../../src/constants';
import { incidentAPI } from '../../src/services/api';
import { getSocket } from '../../src/services/socket';

const { width, height } = Dimensions.get('window');

const STATUS_MAP: Record<string, any> = {
  PENDING: { label: 'Đang chờ xử lý', color: '#F39C12', icon: 'clock-outline' },
  ASSIGNED: { label: 'Đội cứu hộ đang đến', color: '#3498DB', icon: 'car-speed-limiter' },
  ARRIVED: { label: 'Đã đến hiện trường', color: '#9B59B6', icon: 'map-marker-check' },
  PROCESSING: { label: 'Đang thực hiện cứu hộ', color: '#2ECC71', icon: 'progress-wrench' },
  COMPLETED: { label: 'Hoàn thành', color: '#27AE60', icon: 'check-circle' },
  CANCELLED: { label: 'Đã hủy', color: '#E74C3C', icon: 'close-circle' },
};

export default function Tracking({ route, navigation }: any) {
  const { incidentId } = route.params;
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rescueLocation, setRescueLocation] = useState<any>(null);
  const mapRef = useRef<MapView>(null);
  // Refs to avoid stale closures in socket callbacks
  const incidentRef = useRef<any>(null);
  const assignedTeamIdRef = useRef<string | null>(null);

  const fetchDetail = async () => {
    try {
      const { data } = await incidentAPI.getById(incidentId);
      if (data.success) {
        const inc = data.data;
        setIncident(inc);
        incidentRef.current = inc;
        assignedTeamIdRef.current = inc.assignedTeam?._id?.toString() || null;
        if (inc.assignedTeam?.currentLocation?.coordinates) {
          setRescueLocation({
            latitude: inc.assignedTeam.currentLocation.coordinates[1],
            longitude: inc.assignedTeam.currentLocation.coordinates[0],
          });
        }
      }
    } catch (err) {
      console.log('Error fetching incident detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();

    const socket = getSocket();
    if (socket) {
      // Join incident room to receive targeted updates
      socket.emit('track:join', incidentId);

      socket.on('rescue:location', (data: any) => {
        // Use ref to avoid stale closure on assignedTeam._id
        if (assignedTeamIdRef.current && data.teamId?.toString() === assignedTeamIdRef.current) {
          setRescueLocation({
            latitude: data.coordinates[1],
            longitude: data.coordinates[0],
          });
        }
      });

      socket.on('incident:updated', (data: any) => {
        if (data.id === incidentId || data._id === incidentId) {
          fetchDetail();
        }
      });

      socket.on('incident:status-change', (data: any) => {
        if (data.message) {
          Alert.alert('Thông báo sự cố', data.message);
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('track:leave', incidentId);
        socket.off('rescue:location');
        socket.off('incident:updated');
        socket.off('incident:status-change');
      }
    };
  }, [incidentId]);

  // Tự động fit bản đồ khi có dữ liệu
  useEffect(() => {
    if (incident && mapRef.current) {
      const markers = [
        { latitude: incident.location.coordinates[1], longitude: incident.location.coordinates[0] }
      ];
      if (rescueLocation) {
        markers.push(rescueLocation);
      }
      
      mapRef.current.fitToCoordinates(markers, {
        edgePadding: { top: 100, right: 100, bottom: 300, left: 100 },
        animated: true,
      });
    }
  }, [incident, rescueLocation]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải dữ liệu theo dõi...</Text>
      </View>
    );
  }

  if (!incident) return null;

  const currentStatus = STATUS_MAP[incident.status] || STATUS_MAP.PENDING;
  const incidentCoords = {
    latitude: incident.location.coordinates[1],
    longitude: incident.location.coordinates[0],
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          ...incidentCoords,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {/* Điểm sự cố */}
        <Marker coordinate={incidentCoords}>
          <View style={styles.incidentMarker}>
            <View style={styles.markerInner}>
              <FontAwesome5 name="exclamation-triangle" size={12} color="#fff" />
            </View>
            <View style={styles.markerArrow} />
          </View>
        </Marker>

        {/* Xe cứu hộ (nếu đã phân công) */}
        {rescueLocation && (
          <Marker coordinate={rescueLocation}>
            <View style={styles.rescueMarker}>
              <Image 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1048/1048315.png' }} 
                style={styles.rescueIcon} 
              />
            </View>
          </Marker>
        )}

        {/* Đường đi (Routing path) */}
        {incident.routingPath && incident.routingPath.length > 0 && (
          <Polyline
            coordinates={incident.routingPath.map((p: any) => ({ latitude: p[1], longitude: p[0] }))}
            strokeColor={COLORS.primary}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* Header Overlay */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <View style={styles.statusBadge}>
          <View style={[styles.statusPulse, { backgroundColor: currentStatus.color }]} />
          <Text style={[styles.statusText, { color: currentStatus.color }]}>{currentStatus.label}</Text>
        </View>
      </SafeAreaView>

      {/* Nút định vị lại — fit lại bản đồ về đội cứu hộ + điểm sự cố */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          right: 16,
          top: 140,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: 'white',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5,
          zIndex: 10,
        }}
        onPress={() => {
          if (mapRef.current) {
            const markers = [incidentCoords];
            if (rescueLocation) markers.push(rescueLocation);
            mapRef.current.fitToCoordinates(markers, {
              edgePadding: { top: 100, right: 100, bottom: 300, left: 100 },
              animated: true,
            });
          }
        }}
      >
        <Ionicons name="locate" size={22} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Bottom Information Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />
        
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.teamInfo}>
            {incident.assignedTeam ? (
              <View style={styles.flexRow}>
                <View style={styles.avatar}>
                  <Ionicons name="car-sport" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.teamName}>{incident.assignedTeam.name}</Text>
                  <Text style={styles.teamCode}>{incident.assignedTeam.code} • {incident.assignedTeam.type}</Text>
                </View>
                <TouchableOpacity style={styles.callBtn}>
                  <Ionicons name="call" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noTeam}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.noTeamText}>Đang điều phối đội cứu hộ gần nhất...</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.addressSection}>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color="#E74C3C" />
              <Text style={styles.addressText} numberOfLines={2}>{incident.location.address}</Text>
            </View>
            
            {incident.estimatedArrival && incident.status === 'ASSIGNED' && (
              <View style={styles.etaCard}>
                <View style={styles.etaIconBox}>
                  <Ionicons name="time" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={styles.etaLabel}>Thời gian dự kiến</Text>
                  <Text style={styles.etaTime}>
                    {new Date(incident.estimatedArrival).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Progress Timeline */}
          <View style={styles.timelineContainer}>
             <Text style={styles.timelineTitle}>Tiến độ xử lý</Text>
             {incident.timeline.slice().reverse().map((item: any, idx: number) => (
               <View key={idx} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, idx === 0 && styles.activeDot]} />
                  {idx !== incident.timeline.length - 1 && <View style={styles.timelineLine} />}
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineStatus, idx === 0 && styles.activeStatus]}>{item.note || item.status}</Text>
                    <Text style={styles.timelineTime}>
                      {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
               </View>
             ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: COLORS.gray, fontWeight: '600' },
  header: {
    position: 'absolute', top: 0, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  statusBadge: {
    backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusPulse: { width: 8, height: 8, borderRadius: 4, marginRight: 2 },
  incidentMarker: { alignItems: 'center', justifyContent: 'center' },
  markerInner: {
    backgroundColor: '#E74C3C', padding: 8, borderRadius: 20,
    borderWidth: 2, borderColor: '#fff',
  },
  markerArrow: {
    width: 0, height: 0, backgroundColor: 'transparent',
    borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#E74C3C',
    marginTop: -1,
  },
  rescueMarker: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  rescueIcon: { width: 36, height: 36, resizeMode: 'contain' },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 25, paddingBottom: 40, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -15 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 20,
    maxHeight: height * 0.5,
  },
  sheetHandle: {
    width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3,
    alignSelf: 'center', marginBottom: 20,
  },
  teamInfo: { marginBottom: 20 },
  flexRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  flex1: { flex: 1 },
  avatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F7FF',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D0E1FF'
  },
  teamName: { fontSize: 18, fontWeight: '800', color: COLORS.dark },
  teamCode: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  callBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#2ECC71',
    justifyContent: 'center', alignItems: 'center',
  },
  noTeam: { paddingVertical: 10, alignItems: 'center', flexDirection: 'row', gap: 10 },
  noTeamText: { fontSize: 14, color: COLORS.gray, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 20 },
  addressSection: { marginBottom: 24 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addressText: { fontSize: 14, color: COLORS.dark, fontWeight: '600', lineHeight: 20, flex: 1 },
  etaCard: {
    marginTop: 20, backgroundColor: '#F8FAFF', borderRadius: 20,
    padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#EBF2FF',
  },
  etaIconBox: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  etaLabel: { fontSize: 11, color: COLORS.gray, fontWeight: '600', marginBottom: 2 },
  etaTime: { fontSize: 16, fontWeight: '900', color: COLORS.dark },
  timelineContainer: { marginTop: 10 },
  timelineTitle: { fontSize: 15, fontWeight: '800', color: COLORS.dark, marginBottom: 15 },
  timelineItem: { flexDirection: 'row', paddingBottom: 25, minHeight: 60 },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#E0E0E0',
    marginTop: 4, zIndex: 1,
  },
  activeDot: { backgroundColor: COLORS.primary, width: 12, height: 12, marginLeft: -1 },
  timelineLine: {
    position: 'absolute', top: 14, left: 4.5, bottom: 0,
    width: 1, backgroundColor: '#F0F0F0',
  },
  timelineContent: { marginLeft: 20, flex: 1 },
  timelineStatus: { fontSize: 14, color: COLORS.gray, fontWeight: '600' },
  activeStatus: { color: COLORS.dark, fontWeight: '800' },
  timelineTime: { fontSize: 11, color: '#A0A0A0', marginTop: 4 },
});
