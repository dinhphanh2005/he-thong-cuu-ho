import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../src/services/api';
import { COLORS } from '../../src/constants';

export default function Register({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (!/^0[35789][0-9]{8}$/.test(phone)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu tối thiểu 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      await authAPI.register(name.trim(), email.trim(), phone.trim(), password);
      Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng đăng nhập.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Đăng ký thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
            </TouchableOpacity>

            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Đăng ký để sử dụng dịch vụ cứu hộ</Text>

            {/* Form */}
            <View style={styles.form}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput style={styles.input} placeholder="Nguyễn Văn A" placeholderTextColor="#aaa" onChangeText={setName} value={name} />

              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} placeholder="example@gmail.com" placeholderTextColor="#aaa" onChangeText={setEmail} value={email} autoCapitalize="none" keyboardType="email-address" />

              <Text style={styles.label}>Số điện thoại</Text>
              <TextInput style={styles.input} placeholder="0901234567" placeholderTextColor="#aaa" onChangeText={setPhone} value={phone} keyboardType="phone-pad" />

              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.passwordContainer}>
                <TextInput style={styles.passwordInput} placeholder="Tối thiểu 6 ký tự" placeholderTextColor="#aaa" onChangeText={setPassword} value={password} secureTextEntry={!showPassword} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#888" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.registerButton, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.dark} /> : <Text style={styles.registerButtonText}>Đăng ký</Text>}
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Đã có tài khoản? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>Đăng nhập</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },
  backButton: { marginTop: 16, marginBottom: 8, width: 40 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.dark, marginBottom: 8, marginTop: 16 },
  subtitle: { fontSize: 14, color: COLORS.gray, marginBottom: 32 },
  form: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.dark, backgroundColor: COLORS.background },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.background },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.dark },
  eyeButton: { paddingHorizontal: 14, paddingVertical: 12 },
  registerButton: { backgroundColor: "#EDCA30", paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 24, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  registerButtonText: { color: COLORS.dark, fontSize: 16, fontWeight: '700' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { color: '#666', fontSize: 14 },
  loginLink: { color: '#496FC0', fontSize: 14, fontWeight: '700' },
});
