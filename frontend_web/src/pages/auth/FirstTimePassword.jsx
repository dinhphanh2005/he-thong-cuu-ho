import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  authAPI,
  canAccessWebRole,
  clearAuth,
  getStoredUser,
  hasAccessToken,
  isPasswordChangeRequired,
  storeAuthSession,
} from '../../services/api';

export default function FirstTimePassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasAccessToken() || !isPasswordChangeRequired()) {
      navigate('/login', { replace: true });
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới tối thiểu 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await authAPI.changePassword(newPassword);
      storeAuthSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        mustChangePassword: false,
        user: getStoredUser(),
      });

      const meResponse = await authAPI.getMe();
      const user = meResponse.data?.data || null;

      if (!canAccessWebRole(user)) {
        clearAuth();
        setError('Tài khoản này không có quyền truy cập giao diện điều phối');
        return;
      }

      storeAuthSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user,
        mustChangePassword: false,
      });

      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Không thể đổi mật khẩu'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-10">
        <div className="text-center mb-8">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-amber-600">First Login</p>
          <h1 className="text-2xl font-black text-gray-900 mt-3">Đổi mật khẩu mặc định</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Tài khoản điều phối phải cập nhật mật khẩu trước khi vào hệ thống.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block">Mật khẩu mới</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Tối thiểu 6 ký tự"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Nhập lại mật khẩu"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F1C40F] hover:bg-[#F39C12] disabled:opacity-60 text-gray-900 font-bold py-3 rounded-lg shadow-md transition-all"
          >
            {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full mt-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Quay lại đăng nhập
        </button>
      </div>
    </div>
  );
}
