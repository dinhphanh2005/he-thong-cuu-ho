import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
// ADDED: useSafeAreaInsets
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../src/store/store';
import { clearUser, setUser } from '../../src/store/authSlice';
import { authAPI } from '../../src/services/api';
import { disconnectSocket } from '../../src/services/socket';
import { COLORS } from '../../src/constants';

function EditProfileScreen({ user, onClose, onSave }: any) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Lỗi', 'Tên không được để trống'); return; }
    setSaving(true);
    try {
      // Gọi API thực sự để lưu tên mới
      await authAPI.updateSettings({ name: name.trim() });
      // Sau đó lấy lại thông tin mới nhất từ server
      const { data } = await authAPI.getMe();
      onSave(data.data);
      Alert.alert('Thành công', 'Đã cập nhật thông tin');
      onClose();
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={modalStyles.container}>
      <View style={modalStyles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={modalStyles.title}>Chỉnh sửa thông tin</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.primary} /> : <Text style={modalStyles.saveBtn}>Lưu</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView style={{ padding: 20 }}>
        <Text style={modalStyles.label}>Họ và tên</Text>
        <TextInput 
          style={modalStyles.input} 
          value={name} 
          onChangeText={setName} 
          placeholder="Nhập tên" 
          placeholderTextColor="#8A8A8A"
        />
        <Text style={modalStyles.label}>Số điện thoại</Text>
        <TextInput 
          style={[modalStyles.input, { color: '#aaa' }]} 
          value={phone} 
          editable={false}
          placeholderTextColor="#8A8A8A"
        />
        <Text style={modalStyles.helperText}>Số điện thoại không thể thay đổi. Liên hệ admin để cập nhật.</Text>
        <Text style={[modalStyles.label, { marginTop: 16 }]}>Email</Text>
        <TextInput 
          style={[modalStyles.input, { color: '#aaa' }]} 
          value={user?.email || ''} 
          editable={false} 
          placeholderTextColor="#8A8A8A"
        />
        <Text style={modalStyles.helperText}>Email không thể thay đổi</Text>
      </ScrollView>
    </View>
  );
}

function ChangePasswordScreen({ onClose }: any) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!current || !newPass || !confirm) { Alert.alert('Lỗi', 'Điền đầy đủ thông tin'); return; }
    if (newPass !== confirm) { Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp'); return; }
    if (newPass.length < 6) { Alert.alert('Lỗi', 'Mật khẩu tối thiểu 6 ký tự'); return; }
    setSaving(true);
    try {
      await authAPI.changePassword(newPass);
      Alert.alert('Thành công', 'Đã đổi mật khẩu', [{ text: 'OK', onPress: onClose }]);
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể đổi mật khẩu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={modalStyles.container}>
      <View style={modalStyles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={modalStyles.title}>Đổi mật khẩu</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.primary} /> : <Text style={modalStyles.saveBtn}>Lưu</Text>}
        </TouchableOpacity>
      </View>
      <View style={{ padding: 20, gap: 16 }}>
        <View>
          <Text style={modalStyles.label}>Mật khẩu hiện tại</Text>
          <TextInput 
            style={modalStyles.input} 
            value={current} 
            onChangeText={setCurrent} 
            secureTextEntry 
            placeholder="Nhập mật khẩu hiện tại" 
            placeholderTextColor="#8A8A8A"
          />
        </View>
        <View>
          <Text style={modalStyles.label}>Mật khẩu mới</Text>
          <TextInput 
            style={modalStyles.input} 
            value={newPass} 
            onChangeText={setNewPass} 
            secureTextEntry 
            placeholder="Tối thiểu 6 ký tự" 
            placeholderTextColor="#8A8A8A"
          />
        </View>
        <View>
          <Text style={modalStyles.label}>Xác nhận mật khẩu mới</Text>
          <TextInput 
            style={modalStyles.input} 
            value={confirm} 
            onChangeText={setConfirm} 
            secureTextEntry 
            placeholder="Nhập lại mật khẩu mới" 
            placeholderTextColor="#8A8A8A"
          />
        </View>
      </View>
    </View>
  );
}

function EmergencyContactScreen({ onClose }: any) {
  const [contacts] = useState([
    { name: 'Cảnh sát giao thông', phone: '113' },
    { name: 'Cứu thương', phone: '115' },
    { name: 'Phòng cháy chữa cháy', phone: '114' },
  ]);

  return (
    <View style={modalStyles.container}>
      <View style={modalStyles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={modalStyles.title}>Liên hệ khẩn cấp</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ padding: 20 }}>
        {contacts.map((c, i) => (
          <View key={i} style={modalStyles.contactCard}>
            <View style={modalStyles.contactIcon}>
              <Ionicons name="call" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.contactName}>{c.name}</Text>
              <Text style={modalStyles.contactPhone}>{c.phone}</Text>
            </View>
            <TouchableOpacity style={modalStyles.callBtn}>
              <Text style={modalStyles.callBtnText}>Gọi</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function MyVehicleScreen({ onClose }: any) {
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [type, setType] = useState('');

  return (
    <View style={modalStyles.container}>
      <View style={modalStyles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={modalStyles.title}>Phương tiện của tôi</Text>
        <TouchableOpacity onPress={() => Alert.alert('Thông báo', 'Chức năng quản lý phương tiện đang được phát triển.')}>
          <Text style={modalStyles.saveBtn}>OK</Text>
        </TouchableOpacity>
      </View>
      <View style={{ padding: 20, gap: 16 }}>
        <View>
          <Text style={modalStyles.label}>Biển số xe</Text>
          <TextInput 
            style={modalStyles.input} 
            value={plate} 
            onChangeText={setPlate} 
            placeholder="VD: 30A-12345" 
            autoCapitalize="characters" 
            placeholderTextColor="#8A8A8A"
          />
        </View>
        <View>
          <Text style={modalStyles.label}>Hãng xe</Text>
          <TextInput 
            style={modalStyles.input} 
            value={brand} 
            onChangeText={setBrand} 
            placeholder="VD: Toyota, Honda..." 
            placeholderTextColor="#8A8A8A"
          />
        </View>
        <View>
          <Text style={modalStyles.label}>Loại xe</Text>
          <TextInput 
            style={modalStyles.input} 
            value={type} 
            onChangeText={setType} 
            placeholder="VD: Ô tô, Xe máy..." 
            placeholderTextColor="#8A8A8A"
          />
        </View>
      </View>
    </View>
  );
}

type ModalType = 'profile' | 'password' | 'emergency' | 'vehicle' | null;

export default function AccountScreen({ navigation }: any) {
  const insets = useSafeAreaInsets(); // ADDED: Get dynamic notch/status bar height
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất', style: 'destructive', onPress: async () => {
          try { await authAPI.logout(); } catch {}
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_role']);
          disconnectSocket();
          dispatch(clearUser());
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const MenuItem = ({ icon, label, onPress, danger = false }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={20} color={danger ? COLORS.danger : COLORS.gray} />
        <Text style={[styles.menuLabel, danger && { color: COLORS.danger }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  );

  const renderModal = () => {
    if (!activeModal) return null;
    const close = () => setActiveModal(null);
    const content = {
      profile: <EditProfileScreen user={user} onClose={close} onSave={(u: any) => dispatch(setUser(u))} />,
      password: <ChangePasswordScreen onClose={close} />,
      emergency: <EmergencyContactScreen onClose={close} />,
      vehicle: <MyVehicleScreen onClose={close} />,
    }[activeModal];
    
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
          {content}
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    // UPDATED: Ignore the top edge automatically...
    <SafeAreaView edges={['right', 'bottom', 'left']} style={styles.container}>
      
      {/* UPDATED: ...and manually apply the exact safe area measurement to the padding */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.dark} />
          <Text style={styles.backText}>Trở về</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.profileName}>{user?.name || 'Người dùng'}</Text>
          <Text style={styles.profileRole}>Người dân</Text>
          <Text style={styles.profilePhone}>{user?.phone || ''}</Text>
          <TouchableOpacity style={styles.editProfileBtn} onPress={() => setActiveModal('profile')}>
            <Text style={styles.editProfileText}>Chỉnh sửa thông tin</Text>
          </TouchableOpacity>
        </View>

        {/* Rescue Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cứu hộ</Text>
          <View style={styles.menuCard}>
            <MenuItem icon="car-outline" label="Phương tiện của tôi" onPress={() => setActiveModal('vehicle')} />
            <View style={styles.divider} />
            <MenuItem icon="alert-circle-outline" label="Liên hệ khẩn cấp" onPress={() => setActiveModal('emergency')} />
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ứng dụng</Text>
          <View style={styles.menuCard}>
            <MenuItem icon="lock-closed-outline" label="Đổi mật khẩu" onPress={() => setActiveModal('password')} />
            <View style={styles.divider} />
            <MenuItem icon="notifications-outline" label="Cài đặt thông báo" onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')} />
            <View style={styles.divider} />
            <MenuItem icon="help-circle-outline" label="Trung tâm hỗ trợ" onPress={() => Alert.alert('Hỗ trợ', 'Hotline: 1900-1234')} />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.menuCard}>
            <MenuItem icon="log-out-outline" label="Đăng xuất" onPress={handleLogout} danger />
          </View>
        </View>

        <Text style={styles.version}>Cứu hộ Giao thông v1.0.0</Text>
      </ScrollView>

      {renderModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  headerRow: {
    paddingHorizontal: 20,
    // Note: paddingTop is now handled dynamically in the component inline styles
    paddingBottom: 10,
    backgroundColor: COLORS.white,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginLeft: 4,
  },
  profileHeader: {
    backgroundColor: COLORS.white, alignItems: 'center',
    paddingVertical: 28, paddingHorizontal: 20, marginBottom: 8,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: COLORS.dark },
  profileName: { fontSize: 20, fontWeight: '700', color: COLORS.dark, marginBottom: 4 },
  profileRole: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginBottom: 2 },
  profilePhone: { fontSize: 13, color: COLORS.gray, marginBottom: 14 },
  editProfileBtn: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 20,
    paddingVertical: 7, paddingHorizontal: 20,
  },
  editProfileText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.gray,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  menuCard: {
    backgroundColor: COLORS.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 16,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, color: COLORS.dark },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16 },
  version: { textAlign: 'center', color: COLORS.lightGray, fontSize: 12, paddingVertical: 24 },
  danger: { color: COLORS.danger },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    backgroundColor: COLORS.white,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.dark },
  saveBtn: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    fontSize: 15, color: COLORS.dark, borderWidth: 1, borderColor: '#E0E0E0',
  },
  helperText: { fontSize: 11, color: '#aaa', marginTop: 4 },
  contactCard: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  contactIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E6F0FF', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  contactName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  contactPhone: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  callBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 14,
  },
  callBtnText: { color: COLORS.dark, fontWeight: '700', fontSize: 13 },
});