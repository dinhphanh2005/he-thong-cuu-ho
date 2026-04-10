import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { clearUser, setUser } from '../../src/store/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../src/services/api';
import { disconnectSocket } from '../../src/services/socket';
import { COLORS } from '../../src/constants';
import { RootState } from '../../src/store/store';

const { height } = Dimensions.get('window');

function EditProfileScreen({ user, onClose, onSave }: any) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Lỗi', 'Tên không được để trống'); return; }
    setSaving(true);
    try {
      const { data } = await authAPI.getMe(); 
      onSave(data.data);
      Alert.alert('Thành công', 'Đã cập nhật thông tin');
      onClose();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin');
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
        <TextInput style={modalStyles.input} value={name} onChangeText={setName} placeholder="Nhập tên" placeholderTextColor="#8A8A8A" />
        <Text style={modalStyles.label}>Số điện thoại</Text>
        <TextInput style={modalStyles.input} value={phone} onChangeText={setPhone} placeholder="Nhập SĐT" keyboardType="phone-pad" placeholderTextColor="#8A8A8A" />
        <Text style={modalStyles.label}>Email</Text>
        <TextInput style={[modalStyles.input, { color: '#aaa' }]} value={user?.email || ''} editable={false} placeholderTextColor="#8A8A8A" />
        <Text style={modalStyles.helperText}>Email không thể thay đổi</Text>
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
        <Text style={modalStyles.title}>Phương tiện cứu hộ</Text>
        <TouchableOpacity onPress={() => { Alert.alert('Đã lưu'); onClose(); }}>
          <Text style={modalStyles.saveBtn}>Lưu</Text>
        </TouchableOpacity>
      </View>
      <View style={{ padding: 20, gap: 16 }}>
        <View>
          <Text style={modalStyles.label}>Biển số xe</Text>
          <TextInput style={modalStyles.input} value={plate} onChangeText={setPlate} placeholder="VD: 30A-12345" autoCapitalize="characters" placeholderTextColor="#8A8A8A" />
        </View>
        <View>
          <Text style={modalStyles.label}>Hãng xe / Dòng xe</Text>
          <TextInput style={modalStyles.input} value={brand} onChangeText={setBrand} placeholder="VD: Isuzu NQR" placeholderTextColor="#8A8A8A" />
        </View>
        <View>
          <Text style={modalStyles.label}>Loại xe cứu hộ</Text>
          <TextInput style={modalStyles.input} value={type} onChangeText={setType} placeholder="VD: Xe kéo, Xe cẩu..." placeholderTextColor="#8A8A8A" />
        </View>
      </View>
    </View>
  );
}

type ModalType = 'profile' | 'vehicle' | null;

export default function RescueAccount({ navigation }: any) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const userName = user?.name || 'Nguyễn Văn A';
  const userCode = user?.rescueTeam?.code || 'Mã NV: 0001';

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất', style: 'destructive', onPress: async () => {
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_role']);
          disconnectSocket();
          dispatch(clearUser());
          // FIX: Added navigation reset to actually kick the user out visually
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const renderModal = () => {
    if (!activeModal) return null;
    const close = () => setActiveModal(null);
    const content = {
      profile: <EditProfileScreen user={user} onClose={close} onSave={(u: any) => dispatch(setUser(u))} />,
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
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => navigation.goBack()} />
      
      <View style={styles.floatingHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={COLORS.gray} />
        </View>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.userCode}>{userCode}</Text>
      </View>

      <View style={styles.sheetContainer}>
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <Text style={styles.title}>Tài Khoản & Cài đặt</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.dark} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Thông tin cá nhân</Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity style={styles.actionRow} onPress={() => setActiveModal('profile')}>
              <View style={styles.actionLeft}>
                <Ionicons name="person-outline" size={20} color={COLORS.dark} style={styles.actionIcon} />
                <Text style={styles.actionText}>Cập nhật thông tin</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Thông tin phương tiện</Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity style={styles.actionRow} onPress={() => setActiveModal('vehicle')}>
              <View style={styles.actionLeft}>
                <Ionicons name="bus-outline" size={20} color={COLORS.dark} style={styles.actionIcon} />
                <Text style={styles.actionText}>Phương tiện của tôi</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Ứng dụng</Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('ChangePassword')}>
              <View style={styles.actionLeft}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.dark} style={styles.actionIcon} />
                <Text style={styles.actionText}>Đổi mật khẩu</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.actionRow} onPress={() => Alert.alert('Thông báo', 'Hotline hỗ trợ kỹ thuật: 1900-1234')}>
              <View style={styles.actionLeft}>
                <Ionicons name="help-circle-outline" size={20} color={COLORS.dark} style={styles.actionIcon} />
                <Text style={styles.actionText}>Trung tâm hỗ trợ</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
          
          <View style={{ height: 60 }} />
        </ScrollView>
      </View>

      {renderModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  floatingHeader: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  userName: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  userCode: { fontSize: 13, color: '#D1D5DB', marginTop: 4 },
  sheetContainer: { backgroundColor: '#F5F7FA', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, minHeight: height * 0.65 },
  handleContainer: { alignItems: 'center', paddingVertical: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  closeButton: { padding: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#8A8A8A', marginBottom: 8, marginLeft: 8, marginTop: 8 },
  cardGroup: { backgroundColor: COLORS.white, borderRadius: 20, paddingVertical: 4, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16 },
  actionLeft: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { marginRight: 12 },
  actionText: { fontSize: 15, color: COLORS.dark, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 16 },
  logoutButton: { marginTop: 16, backgroundColor: COLORS.white, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#FFEBEB' },
  logoutText: { color: '#E74C3C', fontSize: 15, fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: COLORS.white },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.dark },
  saveBtn: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginBottom: 8 },
  input: { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.dark, borderWidth: 1, borderColor: '#E0E0E0' },
  helperText: { fontSize: 11, color: '#aaa', marginTop: 4 },
});