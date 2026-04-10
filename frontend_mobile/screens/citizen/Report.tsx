import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Image, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { COLORS } from '../../src/constants';
import { incidentAPI } from '../../src/services/api';

const INCIDENT_TYPES = [
  { id: 'ACCIDENT', icon: 'car-sport-outline', label: 'Tai nạn giao thông' },
  { id: 'BREAKDOWN', icon: 'construct-outline', label: 'Hỏng xe / Chết máy' },
  { id: 'FLOOD', icon: 'water-outline', label: 'Ngập nước' },
  { id: 'FIRE', icon: 'flame-outline', label: 'Cháy nổ' },
  { id: 'OTHER', icon: 'help-circle-outline', label: 'Sự cố khác' },
];

const SEVERITY_OPTIONS = [
  { id: 'LOW', label: 'Nhẹ', color: '#2ecc71' },
  { id: 'MEDIUM', label: 'Trung bình', color: '#f39c12' },
  { id: 'HIGH', label: 'Nghiêm trọng', color: '#e67e22' },
  { id: 'CRITICAL', label: 'Nguy hiểm', color: '#e74c3c' },
];

export default function ReportIncident({ navigation, route }: any) {
  const [selectedType, setSelectedType] = useState<string>(route?.params?.type || '');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('MEDIUM');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [address, setAddress] = useState('Đang lấy địa chỉ...');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setAddress('Không có quyền truy cập vị trí');
          setLoadingLocation(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        setLocation({ latitude, longitude });
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo[0]) {
          const g = geo[0];
          setAddress([g.street, g.district, g.city].filter(Boolean).join(', ') || 'Vị trí hiện tại');
        }
      } catch {
        setAddress('Không thể lấy vị trí');
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Cần quyền truy cập camera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotos((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Thêm ảnh', 'Chọn nguồn ảnh', [
      { text: 'Chụp ảnh', onPress: pickFromCamera },
      { text: 'Chọn từ thư viện', onPress: pickFromGallery },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const removePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const handleSubmit = async () => {
    if (!selectedType) { Alert.alert('Lỗi', 'Vui lòng chọn loại sự cố'); return; }
    if (!description.trim()) { Alert.alert('Lỗi', 'Vui lòng mô tả sự cố'); return; }
    if (!location) { Alert.alert('Lỗi', 'Chưa lấy được vị trí'); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', selectedType);
      formData.append('severity', selectedSeverity);
      formData.append('coordinates', JSON.stringify([location.longitude, location.latitude]));
      formData.append('address', address);
      formData.append('description', description.trim());

      photos.forEach((uri, index) => {
        const filename = uri.split('/').pop() || `photo_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('photos', { uri, name: filename, type } as any);
      });

      const { data } = await incidentAPI.create(formData);
      Alert.alert(
        '✅ Gửi thành công!',
        `Mã sự cố: ${data.data.code}\n\nHệ thống đang điều phối đội cứu hộ đến vị trí của bạn.`,
        [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'CitizenTabs' }] }) }]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể gửi báo cáo');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = selectedType && description.trim() && !submitting;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={COLORS.dark} />
          <Text style={styles.backText}>Trở về</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Báo cáo</Text>
        <View style={{ width: 80 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Text style={styles.sectionLabel}>VỊ TRÍ HIỆN TẠI</Text>
          <View style={styles.locationCard}>
            
            <View style={styles.mapThumb}>
              {loadingLocation ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : location ? (
                <MapView
                  style={{ width: '100%', height: '100%' }}
                  initialRegion={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.008,
                    longitudeDelta: 0.008,
                  }}
                  scrollEnabled={false} 
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} />
                </MapView>
              ) : (
                <Ionicons name="location" size={36} color={COLORS.primary} />
              )}
            </View>

            <View style={styles.locationInfo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationTitle}>Vị trí của bạn</Text>
                <Text style={styles.locationAddr} numberOfLines={2}>{address}</Text>
              </View>
              <TouchableOpacity 
                style={styles.editBtn}
                onPress={() => Alert.alert('Thông báo', 'Tính năng chọn vị trí trên bản đồ đang được phát triển.')}
              >
                <Text style={styles.editBtnText}>Sửa</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionLabel}>LOẠI SỰ CỐ</Text>
          <View style={styles.card}>
            {INCIDENT_TYPES.map((item, i) => (
              <React.Fragment key={item.id}>
                <TouchableOpacity
                  style={[styles.typeRow, selectedType === item.id && styles.typeRowActive]}
                  onPress={() => setSelectedType(item.id)}
                >
                  <Ionicons name={item.icon as any} size={22} color={selectedType === item.id ? COLORS.primary : COLORS.dark} />
                  <Text style={[styles.typeLabel, selectedType === item.id && styles.typeLabelActive]}>{item.label}</Text>
                  {selectedType === item.id && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
                {i < INCIDENT_TYPES.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>

          <Text style={styles.sectionLabel}>MỨC ĐỘ NGHIÊM TRỌNG</Text>
          <View style={styles.severityRow}>
            {SEVERITY_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.severityBtn, selectedSeverity === s.id && { backgroundColor: s.color, borderColor: s.color }]}
                onPress={() => setSelectedSeverity(s.id)}
              >
                <Text style={[styles.severityText, selectedSeverity === s.id && { color: '#fff' }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>ẢNH HIỆN TRƯỜNG</Text>
          <View style={styles.card}>
            <View style={styles.photosGrid}>
              {photos.length === 0 ? (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={showPhotoOptions}>
                  <Ionicons name="camera-outline" size={36} color={COLORS.primary} />
                  <Text style={styles.addPhotoText}>Thêm ảnh hiện trường{'\n'}(Tuỳ chọn)</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.photoRow}>
                  {photos.map((uri) => (
                    <View key={uri} style={styles.photoWrapper}>
                      <Image source={{ uri }} style={styles.photoThumb} />
                      <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(uri)}>
                        <Ionicons name="close-circle" size={20} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {photos.length < 5 && (
                    <TouchableOpacity style={styles.addPhotoSmall} onPress={showPhotoOptions}>
                      <Ionicons name="add" size={28} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>

          <Text style={styles.sectionLabel}>MÔ TẢ SỰ CỐ</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.textInput}
              placeholder="Mô tả sự cố, biển số xe, tình trạng nạn nhân..."
              placeholderTextColor="#A0A0A0"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, canSubmit && styles.submitBtnActive]}
          disabled={!canSubmit}
          onPress={handleSubmit}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>Gửi yêu cầu cứu hộ</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const PHOTO_SIZE = 80;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  backText: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginLeft: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#8A8A8A',
    marginTop: 20, marginBottom: 10, letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.white, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  locationCard: {
    backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  mapThumb: { height: 120, backgroundColor: '#EEF3F8', alignItems: 'center', justifyContent: 'center' },
  locationInfo: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  locationTitle: { fontSize: 13, fontWeight: '700', color: COLORS.dark, marginBottom: 2 },
  locationAddr: { fontSize: 12, color: '#8A8A8A', lineHeight: 18 },
  editBtn: { backgroundColor: '#E6F0FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, marginLeft: 8 },
  editBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  typeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 18,
  },
  typeRowActive: { backgroundColor: '#F0F5FF' },
  typeLabel: { fontSize: 15, color: COLORS.dark, marginLeft: 14 },
  typeLabelActive: { fontWeight: '600', color: COLORS.primary },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 18 },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#ddd',
    alignItems: 'center', backgroundColor: COLORS.white,
  },
  severityText: { fontSize: 11, fontWeight: '600', color: COLORS.gray },
  photosGrid: { padding: 14 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrapper: { position: 'relative' },
  photoThumb: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 10 },
  removePhotoBtn: { position: 'absolute', top: -6, right: -6 },
  addPhotoBtn: {
    width: '100%', height: 110, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#C8D8E8', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F8FBFF',
  },
  addPhotoText: { fontSize: 13, color: COLORS.primary, textAlign: 'center', lineHeight: 18, fontWeight: '500' },
  textInput: {
    padding: 14, fontSize: 14, color: COLORS.dark,
    minHeight: 110, textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: 20, paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    backgroundColor: '#F5F7FA',
  },
  submitBtn: {
    backgroundColor: '#D1D5DB', paddingVertical: 15,
    borderRadius: 16, alignItems: 'center',
  },
  submitBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  addPhotoSmall: {
    width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#C8D8E8', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FBFF',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});