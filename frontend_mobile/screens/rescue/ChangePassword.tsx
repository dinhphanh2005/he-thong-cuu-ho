import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants';
import { authAPI } from '../../src/services/api';

export default function ChangePassword({ navigation }: any) {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentPass || !newPass || !confirmPass) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPass.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu tối thiểu 6 ký tự');
      return;
    }

    setSaving(true);
    try {
      await authAPI.changePassword(newPass);
      Alert.alert(
        'Thành công',
        'Đã đổi mật khẩu thành công.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Phiên đăng nhập hết hạn. Vui lòng đăng xuất và đăng nhập lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Vì lý do bảo mật, vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu hiện tại</Text>
              <TextInput
                style={styles.input}
                value={currentPass}
                onChangeText={setCurrentPass}
                secureTextEntry
                placeholder="Nhập mật khẩu được cấp"
                placeholderTextColor="#8A8A8A"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                value={newPass}
                onChangeText={setNewPass}
                secureTextEntry
                placeholder="Tối thiểu 6 ký tự"
                placeholderTextColor="#8A8A8A"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                value={confirmPass}
                onChangeText={setConfirmPass}
                secureTextEntry
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="#8A8A8A"
              />
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
          onPress={handleSave} 
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveBtnText}>Xác nhận đổi mật khẩu</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  scrollContent: { padding: 20 },
  infoBox: { flexDirection: 'row', backgroundColor: '#E6F0FF', padding: 16, borderRadius: 16, marginBottom: 24, alignItems: 'center' },
  infoText: { flex: 1, marginLeft: 12, fontSize: 13, color: COLORS.primary, lineHeight: 20, fontWeight: '500' },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginBottom: 8 },
  input: { backgroundColor: '#F8FBFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: COLORS.dark },
  footer: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#F5F7FA' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});