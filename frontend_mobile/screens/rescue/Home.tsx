import React, { useEffect, useMemo, useState, useRef } from 'react';
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
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getSocket, updateRescueLocation } from '../../src/services/socket';
import { COLORS, INCIDENT_TYPES } from '../../src/constants';
import { RootState } from '../../src/store/store';
import { incidentAPI, rescueAPI } from '../../src/services/api';

const { width } = Dimensions.get('window');

type IncidentStage = 'IDLE' | 'OFFERING' | 'ACCEPTED' | 'ARRIVED' | 'PROCESSING';

function mapIncidentToStage(incident: any): IncidentStage {
  if (!incident) return 'IDLE';
  if (incident.status === 'OFFERING') return 'OFFERING';
  if (incident.status === 'ASSIGNED') return 'ACCEPTED';
  if (incident.status === 'ARRIVED') return 'ARRIVED';
  if (incident.status === 'PROCESSING') return 'PROCESSING';
  
  // Robust fallback: if incident exists and is not completed/cancelled, 
  // allow it to show as PROCESSING so rescue team can finish it.
  if (!['COMPLETED', 'CANCELLED', 'HANDLED_BY_EXTERNAL', 'PENDING'].includes(incident.status)) {
    return 'PROCESSING';
  }
  
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
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<MapView>(null);
  // Keep a ref to always access current team/incident in socket callbacks (avoid stale closures)
  const teamRef = useRef<any>(null);
  const currentIncidentRef = useRef<any>(null);

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
      teamRef.current = nextTeam;
      setMemberAvailability(nextMemberAvailability);
      setCurrentIncident(nextIncident);
      currentIncidentRef.current = nextIncident;
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
    if (incidentStage === 'OFFERING' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Auto-refuse when timer runs out: notify backend immediately
            // so it can fall back to Team 2 without waiting for the Bull job
            const expiredIncident = currentIncidentRef.current;
            if (expiredIncident?._id) {
              console.log('[Timer] Het gio - tu dong tu choi:', expiredIncident._id);
              incidentAPI.refuse(expiredIncident._id, 'Hết thời gian xác nhận (35s)').catch((err: any) => {
                console.warn('[Timer] Loi khi tu dong tu choi:', err?.response?.data?.message || err?.message);
              });
            }
            setIncidentStage('IDLE');
            currentIncidentRef.current = null;
            setCurrentIncident(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (incidentStage !== 'OFFERING') {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [incidentStage, timeLeft]);


  // Framer to automatically fit both team and incident on the screen
  useEffect(() => {
    if (incidentStage !== 'IDLE' && mapRef.current && currentCoordinates && currentIncident?.location?.coordinates) {
      // Small timeout to allow MapView to layout properly before framing
      setTimeout(() => {
        mapRef.current?.fitToCoordinates([
          { latitude: currentCoordinates[1], longitude: currentCoordinates[0] },
          { latitude: currentIncident.location.coordinates[1], longitude: currentIncident.location.coordinates[0] }
        ], {
          edgePadding: { top: 50, right: 50, bottom: 350, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, [incidentStage, currentIncident?.location?.coordinates]);

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
      const interval = incidentStage !== 'IDLE' ? 5000 : 15000;
      intervalId = setInterval(syncOnce, interval);
    };

    startLocationSync();

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOnline, incidentStage]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleIncidentOffer = (payload: any) => {
      // Use ref so we always have the latest team data, avoiding stale closure
      const latestTeam = teamRef.current;
      const currentUserRole = latestTeam?.members?.find((m: any) => m.userId?._id === user?._id)?.role;
      console.log('[Socket] incident:offer received. User role in team:', currentUserRole, 'Team:', latestTeam?.name);

      // All rescue members see the offer, but only LEADER can act on it
      const incident = normalizeIncident(payload.incident);
      if (!incident) {
        console.warn('[Socket] incident:offer — invalid payload', payload);
        return;
      }
      setCurrentIncident(incident);
      currentIncidentRef.current = incident;
      setIncidentStage('OFFERING');
      setTimeLeft(payload.timeoutSec || 35);
      if (currentUserRole === 'LEADER') {
        Alert.alert('Nhiệm vụ mới', `Bạn có 35 giây để chấp nhận sự cố ${incident.code}`);
      } else {
        Alert.alert('Đội có nhiệm vụ mới', `Đội bạn được đề xuất xử lý sự cố ${incident.code}. Đang chờ đội trưởng xác nhận.`);
      }
    };

    const handleAssignedIncident = (payload: any) => {
      const incident = normalizeIncident(payload);
      if (!incident) return;
      
      console.log('Force assignment received for:', incident.code);
      setCurrentIncident(incident);
      currentIncidentRef.current = incident;
      setIncidentStage('ACCEPTED');
      setTeam((prev: any) => {
        const updated = prev ? { ...prev, activeIncident: { _id: incident._id, code: incident.code } } : prev;
        teamRef.current = updated;
        return updated;
      });
      
      // Thông báo cho user biết họ đã được chỉ định (đặc biệt quan trọng khi force assign)
      Alert.alert('Nhiệm vụ được chỉ định', `Dispatcher đã chỉ định đội của bạn xử lý sự cố ${incident.code}`);
    };

    const handleIncidentUpdated = (payload: any) => {
      const incidentId = payload?._id || payload?.id;
      if (!incidentId) return;

      const latestTeam = teamRef.current;
      const latestIncident = currentIncidentRef.current;

      // DISCOVERY: if incident is now assigned to our team but we don't have it yet
      const belongsToMyTeam = payload.assignedTeam?.toString() === latestTeam?._id?.toString();
      
      if (latestIncident?._id !== incidentId && !belongsToMyTeam) {
        return; // Not our incident
      }

      console.log('Incident update received:', payload.status, 'Belongs to me:', belongsToMyTeam);

      if (!latestIncident && belongsToMyTeam) {
        loadRescueState();
        return;
      }

      setCurrentIncident((prev: any) => {
        const updated = prev ? { ...prev, ...payload, _id: incidentId } : prev;
        currentIncidentRef.current = updated;
        return updated;
      });

      if (['COMPLETED', 'CANCELLED', 'HANDLED_BY_EXTERNAL', 'PENDING'].includes(payload.status)) {
        setCurrentIncident(null);
        currentIncidentRef.current = null;
        setIncidentStage('IDLE');
        loadRescueState();
        return;
      }

      if (payload.status === 'ASSIGNED') setIncidentStage('ACCEPTED');
      if (payload.status === 'ARRIVED') setIncidentStage('ARRIVED');
      if (payload.status === 'PROCESSING') setIncidentStage('PROCESSING');
    };

    const handleIncidentRefused = ({ incidentId }: any) => {
      if (currentIncidentRef.current?._id !== incidentId) return;
      setCurrentIncident(null);
      currentIncidentRef.current = null;
      setIncidentStage('IDLE');
      loadRescueState();
    };

    socket.on('incident:offer', handleIncidentOffer);
    socket.on('incident:assigned-to-me', handleAssignedIncident);
    socket.on('incident:updated', handleIncidentUpdated);
    socket.on('incident:refused', handleIncidentRefused);

    // Chủ động join team room ngay khi team loaded
    if (team?._id) {
      socket.emit('rescue:join-team', team._id);
    }

    return () => {
      socket.off('incident:offer', handleIncidentOffer);
      socket.off('incident:assigned-to-me', handleAssignedIncident);
      socket.off('incident:updated', handleIncidentUpdated);
      socket.off('incident:refused', handleIncidentRefused);
    };
  }, [currentIncident?._id, team?._id, user?._id]);

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

  const handleAcceptIncident = async () => {
    if (!currentIncident?._id) return;
    setSubmittingTask(true);
    try {
      await incidentAPI.accept(currentIncident._id);
      setIncidentStage('ACCEPTED');
      await loadRescueState();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể chấp nhận sự cố');
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleAdvanceTask = async () => {
    if (incidentStage === 'OFFERING') {
      await handleAcceptIncident();
      return;
    }
    if (incidentStage === 'ACCEPTED') {
      // Notify arrival
      await submitIncidentStatus('ARRIVED', 'Đội cứu hộ đã đến hiện trường', 'ARRIVED');
      return;
    }
    if (incidentStage === 'ARRIVED') {
      // Move to processing
      await submitIncidentStatus('PROCESSING', 'Đội cứu hộ đang xử lý sự cố', 'PROCESSING');
      return;
    }
    if (incidentStage === 'PROCESSING') {
      // Final step: completion
      await submitIncidentStatus('COMPLETED', 'Đội cứu hộ đã hoàn thành xử lý sự cố', 'IDLE');
    }
  };

  const handleRefuseIncident = async () => {
    if (!currentIncident?._id) return;

    setSubmittingTask(true);
    try {
      await incidentAPI.refuse(currentIncident._id, 'Đội cứu hộ từ chối tiếp nhận sự cố');
      setCurrentIncident(null);
      setIncidentStage('IDLE');
      setTimeLeft(0);
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

  const renderOfferingCard = () => (
    <View style={styles.cardBase}>
      <View style={styles.alertHeaderRow}>
        <View style={styles.timerCircle}>
          <Text style={styles.timerText}>{timeLeft}</Text>
        </View>
        <Text style={[styles.alertTitle, { color: COLORS.primary }]}>Nhiệm vụ mới</Text>
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
          <Text style={styles.alertTypeSubLabel}>
            {currentIncident?.code || 'Chưa có mã sự cố'} • {currentIncident?.distance || '??'} km
          </Text>
        </View>
        <View style={styles.alertIconCircle}>
          <Ionicons name="flash" size={24} color={COLORS.primary} />
        </View>
      </View>
      <View style={styles.addressRow}>
        <Ionicons name="location" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
        <Text style={styles.addressText}>
          {currentIncident?.location?.address || 'Đang xác định vị trí...'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.actionBtnFull, { backgroundColor: COLORS.primary, marginTop: 24 }]}
        onPress={handleAcceptIncident}
        disabled={submittingTask}
      >
        <Text style={styles.actionBtnText}>
          {submittingTask ? 'Đang cập nhật...' : 'Chấp nhận ngay'}
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
        
        {/* Nút chỉ đường Native Google Maps/Apple Maps */}
        <TouchableOpacity
          style={[styles.actionBtnFull, { backgroundColor: '#3498DB', marginTop: 16 }]}
          onPress={() => {
            if (!currentCoordinates || !currentIncident?.location?.coordinates) {
              Alert.alert('Chưa có tọa độ', 'Không thể chỉ đường vì thiếu tọa độ GPS.');
              return;
            }
            const [lngOrigin, latOrigin] = currentCoordinates;
            const [lngDest, latDest] = currentIncident.location.coordinates;
            const url = `https://www.google.com/maps/dir/?api=1&origin=${latOrigin},${lngOrigin}&destination=${latDest},${lngDest}&travelmode=driving`;
            Linking.openURL(url);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="navigate-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Chỉ đường</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnFull, { backgroundColor: btnColor, marginTop: 12 }]}
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
    const currentUserRole = team?.members?.find((m: any) => m.userId?._id === user?._id)?.role;
    const isLeader = currentUserRole === 'LEADER';

    switch (incidentStage) {
      case 'OFFERING':
        return isLeader ? renderOfferingCard() : renderDashboardCard();
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
            ref={mapRef}
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
            {currentIncident?.routingPath && currentIncident.routingPath.length > 0 && (
              <Polyline
                coordinates={currentIncident.routingPath.map((p: any) => ({ latitude: p[1], longitude: p[0] }))}
                strokeColor="#3498DB"
                strokeWidth={5}
                lineDashPattern={[0]}
              />
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
  timerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  alertIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
