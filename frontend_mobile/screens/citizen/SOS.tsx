import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { incidentAPI } from '../../src/services/api';
import { COLORS } from '../../src/constants';

export default function SOS({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [sending, setSending] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (!sending) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSendSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sending]);

  const handleSendSOS = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập vị trí để gửi SOS');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { longitude, latitude } = location.coords;
      const { data } = await incidentAPI.sos([longitude, latitude]);
      Alert.alert(
        'SOS Đã Gửi!',
        `Mã sự cố: ${data.data.code}\n\nĐội cứu hộ đang trên đường đến vị trí của bạn.`,
        [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'CitizenTabs' }] }) }]
      );
    } catch (error: any) {
      Alert.alert('Loi', error.response?.data?.message || 'Không thể gửi SOS');
    } finally {
      setLoading(false);
      setSending(false);
      setCountdown(3);
    }
  };

  const handleCancel = () => {
    setSending(false);
    setCountdown(3);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Title */}
        <View style={styles.titleRow}>
          <Ionicons name="warning" size={32} color={COLORS.white} />
          <Text style={styles.title}>SOS KHẨN CẤP</Text>
        </View>

        <Text style={styles.description}>
          Hệ thống sẽ tự động gửi tín hiệu khẩn cấp và điều phối đội cứu hộ gần nhất đến vị trí của bạn.
        </Text>

        {/* SOS Button */}
        <Animated.View style={[styles.pulseContainer, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={() => !sending && setSending(true)}
            disabled={loading || sending}
          >
            {sending ? (
              <Text style={styles.countdown}>{countdown}</Text>
            ) : (
              <>
                <Text style={styles.sosIcon}>!</Text>
                <Text style={styles.sosText}>SOS</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {sending && (
          <Text style={styles.sendingText}>
            Đang gửi trong {countdown} giây...
          </Text>
        )}

        {/* Cancel / Back Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={sending ? handleCancel : () => navigation.goBack()}
        >
          <Text style={styles.cancelText}>{sending ? 'Huỷ' : 'Quay lại'}</Text>
        </TouchableOpacity>

        {/* Note */}
        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.6)" style={{ marginRight: 6 }} />
          <Text style={styles.noteText}>
            Cảnh báo: Chỉ dùng khi thực sự cần thiết. Mọi hành vi giả mạo SOS sẽ phải chịu trách nhiệm trước pháp luật.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c0392b' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.white, letterSpacing: 2 },
  description: {
    fontSize: 15, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 22, marginBottom: 48,
  },
  pulseContainer: { marginBottom: 32 },
  sosButton: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  sosIcon: { fontSize: 64, fontWeight: '900', color: '#c0392b', lineHeight: 70 },
  sosText: { fontSize: 24, fontWeight: '900', color: '#c0392b', letterSpacing: 4 },
  countdown: { fontSize: 80, fontWeight: '900', color: '#c0392b' },
  sendingText: { color: COLORS.white, fontSize: 18, fontWeight: '600', marginBottom: 24 },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14, paddingHorizontal: 48,
    borderRadius: 30, borderWidth: 2, borderColor: COLORS.white, marginBottom: 32,
  },
  cancelText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 10 },
  noteText: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 18, flex: 1 },
});
