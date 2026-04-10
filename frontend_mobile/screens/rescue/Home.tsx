import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { getSocket, updateRescueLocation } from '../../src/services/socket';
import { COLORS, INCIDENT_TYPES } from '../../src/constants';
import { RootState } from '../../src/store/store';
import { incidentAPI, rescueAPI } from '../../src/services/api';

const { width } = Dimensions.get('window');

type IncidentStage = 'IDLE' | 'NEW_ALERT' | 'ACCEPTED' | 'ARRIVED' | 'PROCESSING';

function mapIncidentToStage(incident: any): IncidentStage {
  if (!incident) return 'IDLE';
  if (incident.status === 'ASSIGNED') return 'NEW_ALERT';
  if (incident.status === 'IN_PROGRESS') return 'ACCEPTED';
  if (incident.status === 'ARRIVED') return 'ARRIVED';
  if (incident.status === 'PROCESSING') return 'PROCESSING';
  return 'IDLE';
}

function normalizeIncident(payload: any) {
  const incident = payload?.incident || payload;
  if (!incident?._id) return null;
  return {
    ...incident,
    user: incident.reportedBy || incident.user || null,
    status: incident.status || 'ASSIGNED',
  };
}

export default function Home({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);

  const [location, setLocation] = useState<any>(null);
  const [memberAvailability, setMemberAvailability] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [incidentStage, setIncidentStage] = useState<IncidentStage>('IDLE');
  const [currentIncident, setCurrentIncident] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [submittingTask, setSubmittingTask] = useState(false);

  const userCode = team?.code || user?.rescueTeam?.code || 'Đội chưa gắn mã';
  const userName = user?.name || 'Nhân viên cứu hộ';

  const teamMembers = team?.members || [];
  const isOnline = memberAvailability === 'ONLINE';
  const currentCoordinates = location
    ? [location.longitude, location.latitude]
    : team?.currentLocation?.coordinates || null;

  const loadRescueState = async () => {
    setLoadingTeam(true);
    try {
      const [teamRes, activeIncidentRes] = await Promise.all([
        rescueAPI.getMyTeam(),
        incidentAPI.getActiveRescue(),
      ]);

      const nextTeam = teamRes.data?.data || null;
      const nextIncident = normalizeIncident(activeIncidentRes.data?.data);
      const nextMemberAvailability = nextTeam?.members?.find((member: any) => member.userId?._id === user?._id)?.userId?.availabilityStatus
        || user?.availabilityStatus
        || 'OFFLINE';

      setTeam(nextTeam);
      setMemberAvailability(nextMemberAvailability);
      setCurrentIncident(nextIncident);
      setIncidentStage(mapIncidentToStage(nextIncident));
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không tải được thông tin đội cứu hộ');
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    loadRescueState();
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let mounted = true;

    const startLocationSync = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const syncOnce = async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          if (!mounted) return;

          const nextLocation = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };

          setLocation(nextLocation);

          if (isOnline) {
            await rescueAPI.updateLocation([nextLocation.longitude, nextLocation.latitude]);
            updateRescueLocation(nextLocation.latitude, nextLocation.longitude);
          }
        } catch {}
      };

      await syncOnce();
      intervalId = setInterval(syncOnce, 15000);
    };

    startLocationSync();

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOnline]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleAssignedIncident = (payload: any) => {
      const incident = normalizeIncident(payload);
      if (!incident) return;
      setCurrentIncident(incident);
      setIncidentStage(mapIncidentToStage(incident));
      setTeam((prev: any) => prev ? { ...prev, activeIncident: { _id: incident._id, code: incident.code } } : prev);
    };

    const handleIncidentUpdated = (payload: any) => {
      const incidentId = payload?._id || payload?.id;
      if (!incidentId || currentIncident?._id !== incidentId) return;

      setCurrentIncident((prev: any) => prev ? { ...prev, ...payload, _id: incidentId } : prev);

      if (payload.status === 'PENDING' || payload.status === 'COMPLETED' || payload.status === 'CANCELLED' || payload.status === 'HANDLED_BY_EXTERNAL') {
        setCurrentIncident(null);
        setIncidentStage('IDLE');
        loadRescueState();
        return;
      }

      if (payload.status === 'ASSIGNED') setIncidentStage('NEW_ALERT');
      if (payload.status === 'ARRIVED') setIncidentStage('ARRIVED');
      if (payload.status === 'PROCESSING') setIncidentStage('PROCESSING');
    };

    const handleIncidentRefused = ({ incidentId }: any) => {
      if (currentIncident?._id !== incidentId) return;
      setCurrentIncident(null);
      setIncidentStage('IDLE');
      loadRescueState();
    };

    socket.on('incident:assigned-to-me', handleAssignedIncident);
    socket.on('incident:updated', handleIncidentUpdated);
    socket.on('incident:refused', handleIncidentRefused);

    return () => {
      socket.off('incident:assigned-to-me', handleAssignedIncident);
      socket.off('incident:updated', handleIncidentUpdated);
      socket.off('incident:refused', handleIncidentRefused);
    };
  }, [currentIncident?._id]);

  const handleToggleOnline = async () => {
    const nextStatus = isOnline ? 'OFFLINE' : 'ONLINE';
    setSyncingStatus(true);
    try {
      const { data } = await rescueAPI.updateAvailability(nextStatus);
      setMemberAvailability(data.data?.availabilityStatus || nextStatus);
      setTeam((prev: any) => prev ? {
        ...prev,
        status: data.data?.teamStatus || prev.status,
        onlineMembersCount: data.data?.onlineMembersCount ?? prev.onlineMembersCount,
      } : prev);
    } catch (error: any) {
      Alert.alert('Không thể cập nhật trạng thái', error.response?.data?.message || 'Vui lòng thử lại');
    } finally {
      setSyncingStatus(false);
    }
  };

  const submitIncidentStatus = async (status: string, note: string, nextStage: IncidentStage) => {
    if (!currentIncident?._id) return;
    setSubmittingTask(true);
    try {
      const { data } = await incidentAPI.updateStatus(currentIncident._id, status, note);
      const nextIncident = normalizeIncident(data.data);
      setCurrentIncident(nextStage === 'IDLE' ? null : nextIncident);
      setIncidentStage(nextStage);
      await loadRescueState();
    } catch (error: any) {
      Alert.alert('Không thể cập nhật nhiệm vụ', error.response?.data?.message || 'Vui lòng thử lại');
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleAdvanceTask = async () => {
    if (incidentStage === 'NEW_ALERT') {
      setIncidentStage('ACCEPTED');
      return;
    }
    if (incidentStage === 'ACCEPTED') {
      await submitIncidentStatus('ARRIVED', 'Đội cứu hộ đã đến hiện trường', 'ARRIVED');
      return;
    }
    if (incidentStage === 'ARRIVED') {
      await submitIncidentStatus('PROCESSING', 'Đội cứu hộ đang xử lý sự cố', 'PROCESSING');
      return;
    }
    if (incidentStage === 'PROCESSING') {
      await submitIncidentStatus('COMPLETED', 'Đội cứu hộ đã hoàn thành xử lý sự cố', 'IDLE');
    }
  };

  const handleRefuseIncident = async () => {
    if (!currentIncident?._id || incidentStage !== 'NEW_ALERT') return;

    setSubmittingTask(true);
    try {
      await incidentAPI.refuse(currentIncident._id, 'Đội cứu hộ từ chối tiếp nhận sự cố');
      setCurrentIncident(null);
      setIncidentStage('IDLE');
      await loadRescueState();
    } catch (error: any) {
      Alert.alert('Không thể từ chối sự cố', error.response?.data?.message || 'Vui lòng thử lại');
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleCallReporter = async () => {
    const phone = currentIncident?.user?.phone;
    if (!phone) {
      Alert.alert('Thiếu thông tin', 'Không có số điện thoại người báo cáo');
      return;
    }

    const supported = await Linking.canOpenURL(`tel:${phone}`);
    if (!supported) {
      Alert.alert('Không thể gọi điện', phone);
      return;
    }

    await Linking.openURL(`tel:${phone}`);
  };

  const dashboardMetrics = useMemo(() => ([
    {
      label: 'Trạng thái cá nhân',
      value: isOnline ? 'Trực tuyến' : 'Ngoại tuyến',
      icon: 'shield-checkmark-outline',
      color: isOnline ? '#2ECC71' : '#8A8A8A',
      bg: isOnline ? '#E8F8F5' : '#F2F2F2',
    },
    {
      label: 'Đội online',
      value: `${team?.onlineMembersCount || 0}/${teamMembers.length}`,
      icon: 'people-outline',
      color: COLORS.primary,
      bg: '#E6F0FF',
    },
  ]), [isOnline, team?.onlineMembersCount, teamMembers.length]);

  const renderDashboardCard = () => (
    <View style={styles.cardBase}>
      <View style={styles.dashboardHeaderRow}>
        <View>
          <Text style={[styles.dashboardTitle, { marginBottom: 4, textAlign: 'left' }]}>Tổng quan đội</Text>
          <Text style={styles.teamSubTitle}>
            {team?.name || 'Chưa tải thông tin đội'} • {userCode}
          </Text>
        </View>
        {loadingTeam && <ActivityIndicator color={COLORS.primary} />}
      </View>

      <View style={styles.metricsRow}>
        {dashboardMetrics.map((item, index) => (
          <React.Fragment key={item.label}>
            {index > 0 && <View style={styles.metricDivider} />}
            <View style={styles.metricItem}>
              <View style={[styles.metricIconBox, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={styles.metricValue}>{item.value}</Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <View style={styles.infoBlock}>
        <Text style={styles.infoLine}>Khu vực: {team?.zone || 'Chưa gán'}</Text>
        <Text style={styles.infoLine}>Loại đội: {team?.type || 'Chưa gán'}</Text>
        <Text style={styles.infoLine}>Sự cố đang nhận: {team?.activeIncident?.code || 'Không có'}</Text>
        <Text style={styles.infoLine}>
          Điều kiện nhận nhiệm vụ: {(team?.onlineMembersCount || 0) >= (team?.minimumOnlineMembers || 2) ? 'Đủ người online' : `Cần tối thiểu ${team?.minimumOnlineMembers || 2} người online`}
        </Text>
      </View>

      {currentCoordinates && (
        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color="#2ecc71" />
          <Text style={styles.locationText}>
            GPS: {currentCoordinates[1].toFixed(4)}, {currentCoordinates[0].toFixed(4)}
          </Text>
        </View>
      )}
    </View>
  );

  const renderNewAlertCard = () => (
    <View style={styles.cardBase}>
      <View style={styles.alertHeaderRow}>
        <View style={{ width: 24 }} />
        <Text style={styles.alertTitle}>Nhiệm vụ mới</Text>
        <TouchableOpacity onPress={loadRescueState}>
          <Ionicons name="refresh" size={22} color={COLORS.dark} />
        </TouchableOpacity>
      </View>
      <View style={styles.alertInfoRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTypeLabel}>
            {currentIncident?.type
              ? INCIDENT_TYPES[currentIncident.type as keyof typeof INCIDENT_TYPES] || currentIncident.type
              : 'Sự cố mới'}
          </Text>
          <Text style={styles.alertTypeSubLabel}>{currentIncident?.code || 'Chưa có mã sự cố'}</Text>
        </View>
        <View style={styles.alertIconCircleRed}>
          <Ionicons name="car-outline" size={24} color="#E74C3C" />
        </View>
      </View>
      <View style={styles.addressRow}>
        <Ionicons name="location" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
        <Text style={styles.addressText}>
          {currentIncident?.location?.address || 'Đang xác định vị trí...'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.actionBtnFull, { backgroundColor: '#1C294F', marginTop: 24 }]}
        onPress={handleAdvanceTask}
        disabled={submittingTask}
      >
        <Text style={styles.actionBtnText}>
          {submittingTask ? 'Đang cập nhật...' : 'Nhận nhiệm vụ'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionBtnFull, styles.refuseBtn]}
        onPress={handleRefuseIncident}
        disabled={submittingTask}
      >
        <Text style={styles.actionBtnText}>
          {submittingTask ? 'Đang cập nhật...' : 'Từ chối'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderActiveTaskCard = () => {
    let btnColor = '#1C294F';
    let btnText = 'Đã đến hiện trường';

    if (incidentStage === 'ARRIVED') {
      btnColor = '#F39C12';
      btnText = 'Đang xử lý';
    } else if (incidentStage === 'PROCESSING') {
      btnColor = '#2ECC71';
      btnText = 'Hoàn thành';
    }

    return (
      <View style={styles.cardBase}>
        <View style={styles.activeUserRow}>
          <View style={styles.alertIconCircleRed}>
            <Ionicons name="alert" size={20} color="#E74C3C" />
          </View>
          <View style={styles.activeUserMeta}>
            <Text style={styles.activeUserSubtitle}>Người báo cáo</Text>
            <Text style={styles.activeUserName}>{currentIncident?.user?.name || 'Công dân'}</Text>
          </View>
          <TouchableOpacity style={styles.phoneCircle} onPress={handleCallReporter}>
            <Ionicons name="call" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <View style={[styles.addressRow, { marginBottom: 8 }]}>
          <Ionicons name="location" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.addressText}>
            {currentIncident?.location?.address || 'Đang xác định vị trí...'}
          </Text>
        </View>
        <Text style={styles.taskCode}>{currentIncident?.code || 'Sự cố đang xử lý'}</Text>
        <TouchableOpacity
          style={[styles.actionBtnFull, { backgroundColor: btnColor, marginTop: 16 }]}
          onPress={handleAdvanceTask}
          disabled={submittingTask}
        >
          <Text style={styles.actionBtnText}>
            {submittingTask ? 'Đang cập nhật...' : btnText}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBottomCard = () => {
    switch (incidentStage) {
      case 'NEW_ALERT':
        return renderNewAlertCard();
      case 'ACCEPTED':
      case 'ARRIVED':
      case 'PROCESSING':
        return renderActiveTaskCard();
      default:
        return renderDashboardCard();
    }
  };

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        {currentCoordinates ? (
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: currentCoordinates[1],
              longitude: currentCoordinates[0],
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
          >
            <Marker
              coordinate={{
                latitude: currentCoordinates[1],
                longitude: currentCoordinates[0],
              }}
              title={team?.name || 'Đội cứu hộ'}
            >
              <View style={[styles.incidentMarker, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="car-outline" size={18} color={COLORS.white} />
              </View>
            </Marker>

            {currentIncident?.location?.coordinates && incidentStage !== 'IDLE' && (
              <Marker
                coordinate={{
                  latitude: currentIncident.location.coordinates[1],
                  longitude: currentIncident.location.coordinates[0],
                }}
                title="Vị trí sự cố"
              >
                <View style={styles.incidentMarker}>
                  <Ionicons name="warning" size={18} color={COLORS.white} />
                </View>
              </Marker>
            )}
          </MapView>
        ) : (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 10, color: COLORS.gray }}>Đang tải bản đồ...</Text>
          </View>
        )}
      </View>

      <View style={[styles.topControls, { top: Math.max(insets.top, 20) }]}>
        <TouchableOpacity
          style={styles.userPill}
          onPress={() => navigation.navigate('RescueAccount')}
        >
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={COLORS.gray} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
            <Text style={styles.userCode}>{userCode}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusToggle, isOnline ? styles.statusOnline : styles.statusOffline]}
          onPress={handleToggleOnline}
          disabled={syncingStatus}
        >
          {syncingStatus ? (
            <ActivityIndicator size="small" color={isOnline ? '#2ECC71' : '#8A8A8A'} />
          ) : (
            <Ionicons name="power" size={24} color={isOnline ? '#2ECC71' : '#8A8A8A'} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomCardContainer}>
        {renderBottomCard()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8eef5' },
  mapLoading: {
    flex: 1,
    backgroundColor: '#e8eef5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  offlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  offlineIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E6E6E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  offlineTitle: { fontSize: 24, fontWeight: '800', color: COLORS.dark, marginBottom: 8 },
  offlineSubtitle: { fontSize: 14, color: COLORS.dark, fontWeight: '500' },
  topControls: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 6,
    paddingRight: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: width * 0.6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userInfo: { justifyContent: 'center' },
  userName: { fontSize: 14, fontWeight: '700', color: COLORS.dark, marginBottom: 2 },
  userCode: { fontSize: 11, color: COLORS.gray, fontWeight: '500' },
  statusToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statusOnline: { borderWidth: 2, borderColor: '#E8F8F5' },
  statusOffline: { borderWidth: 2, borderColor: '#EEEEEE' },
  bottomCardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 10,
  },
  cardBase: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  dashboardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dashboardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, textAlign: 'center', marginBottom: 16 },
  teamSubTitle: { fontSize: 12, color: '#8A8A8A', fontWeight: '500' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 16 },
  metricItem: { alignItems: 'center', flex: 1 },
  metricIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  metricValue: { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginBottom: 4 },
  metricLabel: { fontSize: 12, color: '#8A8A8A', fontWeight: '500' },
  metricDivider: { width: 1, height: 40, backgroundColor: '#EEEEEE' },
  infoBlock: { backgroundColor: '#F7F9FC', borderRadius: 16, padding: 12, marginBottom: 12 },
  infoLine: { fontSize: 12, color: COLORS.dark, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  locationText: { fontSize: 11, color: '#2ecc71', fontWeight: '500' },
  actionBtnFull: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  actionBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  refuseBtn: { backgroundColor: '#E74C3C', marginTop: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  addressText: { flex: 1, fontSize: 13, color: '#8A8A8A', lineHeight: 20 },
  alertHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  alertTitle: { fontSize: 18, fontWeight: '700', color: '#E74C3C' },
  alertInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  alertTypeLabel: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 4 },
  alertTypeSubLabel: { fontSize: 12, color: '#8A8A8A' },
  alertIconCircleRed: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDEDEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeUserRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  activeUserMeta: { flex: 1, marginLeft: 12 },
  activeUserSubtitle: { fontSize: 12, color: '#8A8A8A', marginBottom: 2 },
  activeUserName: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  taskCode: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginTop: 8 },
  phoneCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
