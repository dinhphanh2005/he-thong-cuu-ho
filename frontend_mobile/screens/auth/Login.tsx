import React, { useState } from 'react';
import {
  View, Text, Image, TextInput, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { setUser } from '../../src/store/authSlice';
import { authAPI } from '../../src/services/api';
import { COLORS } from '../../src/constants';

export default function Login({ navigation }: any) {
  const dispatch = useDispatch();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // 1. Validate
    if (!loginId.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin đăng nhập');
      return;
    }

    // 2. Call API
    setLoading(true);
    try {
      const { data } = await authAPI.login(loginId.trim(), password);

      // 3. Cần đổi mật khẩu
      if (data.mustChangePassword) {
        await AsyncStorage.setItem('access_token', data.accessToken);
        navigation.navigate('ChangePassword');
        return;
      }

      // 4. Lưu tokens + role vào AsyncStorage
      await AsyncStorage.multiSet([
        ['access_token', data.accessToken],
        ['refresh_token', data.refreshToken],
        ['user_role', data.data.role],
      ]);

      // 5. Lấy thông tin user đầy đủ
      const meRes = await authAPI.getMe();
      dispatch(setUser(meRes.data.data));

      // 6. Navigate theo role
      const role = data.data.role;
      if (role === 'CITIZEN') {
        navigation.reset({ index: 0, routes: [{ name: 'CitizenTabs' }] });
      } else if (role === 'RESCUE') {
        navigation.reset({ index: 0, routes: [{ name: 'RescueTabs' }] });
      } else {
        Alert.alert('Thông báo', 'Role này không được hỗ trợ trên mobile');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      Alert.alert('Đăng nhập thất bại', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={styles.appName}>CỨU HỘ GIAO THÔNG</Text>
            <Text style={styles.subtitle}>Đăng nhập</Text>

            {/* Form */}
            <View style={styles.form}>
              {/* Username */}
              <Text style={styles.label}>Tên đăng nhập</Text>
              <TextInput
                style={styles.input}
                placeholder="Số điện thoại hoặc email"
                placeholderTextColor="#aaa"
                onChangeText={setLoginId}
                value={loginId}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              {/* Password */}
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#aaa"
                  onChangeText={setPassword}
                  value={password}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotContainer} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#1a1a1a" />
                ) : (
                  <Text style={styles.loginButtonText}>Đăng nhập</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>hoặc</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Register */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Không có tài khoản? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerLink}>Đăng ký</Text>
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
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginTop: 60, marginBottom: 24 },
  logo: { width: 90, height: 90, borderRadius: 20 },
  appName: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: COLORS.dark, letterSpacing: 1, marginBottom: 6 },
  subtitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', color: '#555', marginBottom: 36 },
  form: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.dark, backgroundColor: COLORS.background },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.background },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.dark },
  eyeButton: { paddingHorizontal: 14, paddingVertical: 12 },
  forgotContainer: { alignSelf: 'flex-end', marginTop: 10, marginBottom: 4 },
  forgotText: { color: '#496FC0', fontSize: 13, fontWeight: '600' },
  loginButton: { backgroundColor: "#EDCA30", paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { color: COLORS.dark, fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#eee' },
  dividerText: { color: '#aaa', fontSize: 13 },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { color: '#666', fontSize: 14 },
  registerLink: { color: '#496FC0', fontSize: 14, fontWeight: '700' },
});