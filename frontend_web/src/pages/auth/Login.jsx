import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI, canAccessWebRole, clearAuth, storeAuthSession } from '../../services/api';

// ─── Shared Modal Wrapper ─────────────────────────────────────────────────────
function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

// ─── Forgot Password Flow ─────────────────────────────────────────────────────
function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new pass, 4: success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 3) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleStep1 = async () => {
    if (!email.trim()) { setError('Vui lòng nhập email'); return; }
    setLoading(true);
    setError('');
    try {
      await authAPI.sendOTP(email);
      setLoading(false);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể liên kết tài khoản');
      setLoading(false);
    }
  };

  const handleStep2 = () => {
    if (otp.some(d => !d)) { setError('Vui lòng nhập đủ 6 chữ số OTP'); return; }
    setStep(3);
  };

  const handleStep3 = async () => {
    if (!newPassword || !confirmPassword) { setError('Vui lòng điền đủ thông tin'); return; }
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
    if (newPassword.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
    
    setLoading(true);
    setError('');
    try {
      await authAPI.resetPassword(email, otp.join(''), newPassword);
      setLoading(false);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đổi mật khẩu');
      setLoading(false);
    }
  };

  const titles = {
    1: 'Xác minh đăng nhập',
    2: 'Xác minh đăng nhập',
    3: 'Xác minh đăng nhập',
    4: 'Xác minh đăng nhập',
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-bold text-center text-gray-900 mb-6">{titles[step]}</h3>

      {/* Step 1 — Email */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 block">Nhập email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
              placeholder="example@email.com"
              onKeyDown={e => e.key === 'Enter' && handleStep1()}
              autoFocus
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            onClick={handleStep1}
            disabled={loading}
            className="w-full bg-[#F1C40F] hover:bg-[#F39C12] disabled:opacity-60 text-gray-900 font-bold py-2.5 rounded-lg transition-all mt-2"
          >
            {loading ? 'Đang gửi...' : 'Tiếp tục'}
          </button>
        </div>
      )}

      {/* Step 2 — OTP */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex justify-center gap-3">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={otpRefs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className="w-12 h-12 text-center text-xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                autoFocus={i === 0}
              />
            ))}
          </div>
          <p className="text-center text-xs text-gray-500 leading-relaxed">
            Chúng tôi đã gửi mã OTP vào email của bạn.<br />
            Hãy kiểm tra email để thay đổi mật khẩu.
          </p>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button
            onClick={handleStep2}
            className="w-full bg-[#F1C40F] hover:bg-[#F39C12] text-gray-900 font-bold py-2.5 rounded-lg transition-all"
          >
            Tiếp tục
          </button>
          <button
            onClick={() => { setOtp(['', '', '', '']); setError(''); }}
            className="w-full text-xs text-blue-600 hover:underline"
          >
            Gửi lại mã OTP
          </button>
        </div>
      )}

      {/* Step 3 — New Password */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 block">Nhập mật khẩu mới</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
              placeholder="Tối thiểu 6 ký tự"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 block">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
              placeholder="Nhập lại mật khẩu"
              onKeyDown={e => e.key === 'Enter' && handleStep3()}
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            onClick={handleStep3}
            disabled={loading}
            className="w-full bg-[#F1C40F] hover:bg-[#F39C12] disabled:opacity-60 text-gray-900 font-bold py-2.5 rounded-lg transition-all"
          >
            {loading ? 'Đang lưu...' : 'Tiếp tục'}
          </button>
        </div>
      )}

      {/* Step 4 — Success */}
      {step === 4 && (
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-3xl font-bold">✓</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Thay đổi mật khẩu thành công!<br />
            Hãy tiếp tục đăng nhập.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-[#F1C40F] hover:bg-[#F39C12] text-gray-900 font-bold py-2.5 rounded-lg transition-all"
          >
            Tiếp tục
          </button>
        </div>
      )}
    </Modal>
  );
}

// ─── Request Access Flow ──────────────────────────────────────────────────────
function RequestAccessModal({ onClose }) {
  const [step, setStep] = useState(1); // 1: email, 2: success
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Vui lòng nhập email'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Email không hợp lệ'); return; }
    setLoading(true);
    setError('');
    try {
      await authAPI.requestAccess({ email, name: email.split('@')[0] });
      setLoading(false);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi yêu cầu');
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-bold text-center text-gray-900 mb-6">Yêu cầu truy cập</h3>

      {/* Step 1 — Email */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 block">Nhập email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
              placeholder="example@email.com"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#F1C40F] hover:bg-[#F39C12] disabled:opacity-60 text-gray-900 font-bold py-2.5 rounded-lg transition-all mt-2"
          >
            {loading ? 'Đang gửi...' : 'Tiếp tục'}
          </button>
        </div>
      )}

      {/* Step 2 — Success */}
      {step === 2 && (
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-3xl font-bold">✓</span>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Đã gửi yêu cầu truy cập thành công!
          </p>
          <button
            onClick={onClose}
            className="w-full bg-[#F1C40F] hover:bg-[#F39C12] text-gray-900 font-bold py-2.5 rounded-lg transition-all"
          >
            Tiếp tục
          </button>
        </div>
      )}
    </Modal>
  );
}

// ─── Two-Factor Authentication Flow ──────────────────────────────────────────
function TwoFactorModal({ onClose, userId, message, onSuccess }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (otp.some(d => !d)) { setError('Vui lòng nhập đủ 6 chữ số OTP'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await authAPI.verify2FA(userId, otp.join(''));
      onSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Xác thực 2FA thất bại');
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-bold text-center text-gray-900 mb-6">Xác thực bảo mật</h3>
      <div className="space-y-4">
        <div className="flex justify-center gap-2">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={otpRefs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => handleOtpKeyDown(i, e)}
              className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              autoFocus={i === 0}
            />
          ))}
        </div>
        <p className="text-center text-xs text-gray-500 leading-relaxed">
          {message || 'Vui lòng kiểm tra email để lấy mã OTP.'}
        </p>
        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#F1C40F] hover:bg-[#F39C12] disabled:opacity-60 text-gray-900 font-bold py-2.5 rounded-lg transition-all"
        >
          {loading ? 'Đang xác thực...' : 'Xác nhận đăng nhập'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portal = searchParams.get('portal') || 'dispatch';
  const sessionReason = searchParams.get('reason');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null | 'forgot' | 'access' | '2fa'
  const [twoFactorUserId, setTwoFactorUserId] = useState(null);
  const [twoFactorMessage, setTwoFactorMessage] = useState('');
  const [sessionBanner, setSessionBanner] = useState(sessionReason || '');

  // Auto-dismiss session banner after 8 seconds
  useEffect(() => {
    if (!sessionBanner) return;
    const timer = setTimeout(() => setSessionBanner(''), 8000);
    return () => clearTimeout(timer);
  }, [sessionBanner]);


  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setLoading(true);
    setError('');
    try {
      clearAuth();
      const { data } = await authAPI.login(username.trim(), password);

      if (data.mustChangePassword) {
        storeAuthSession({
          accessToken: data.accessToken,
          mustChangePassword: true,
          user: null,
        });
        navigate('/change-password', { replace: true });
        return;
      }

      if (data.require2FA) {
        setTwoFactorUserId(data.userId);
        setTwoFactorMessage(data.message);
        setModal('2fa');
        return;
      }

      const user = data.data || null;
      if (!canAccessWebRole(user)) {
        clearAuth();
        setError('Tài khoản này không có quyền truy cập hệ thống');
        return;
      }

      storeAuthSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user,
        mustChangePassword: false,
      });

      if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Đăng nhập thất bại'
      );
    } finally {
      setLoading(false);
    }
  };

  const handle2FASuccess = (data) => {
    setModal(null);
    const user = data.data || null;
    if (!canAccessWebRole(user)) {
      clearAuth();
      setError('Tài khoản này không có quyền truy cập hệ thống');
      return;
    }

    storeAuthSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user,
      mustChangePassword: false,
    });

    if (user.role === 'ADMIN') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-4 font-sans">
      {/* Brand Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Cứu hộ giao thông
        </h1>
        <p className="text-xl font-semibold text-gray-700">
          {portal === 'admin' ? 'Admin System' : 'Trung Tâm Điều Phối'}
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-lg p-12 border border-white">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-10">Đăng nhập</h3>

        {/* Session invalidated banner */}
        {sessionBanner && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium px-4 py-3 rounded-xl">
            <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
            <span className="flex-1">{sessionBanner}</span>
            <button
              type="button"
              onClick={() => setSessionBanner('')}
              className="text-amber-400 hover:text-amber-600 font-bold ml-2 leading-none"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-3">
            <label className="text-base font-bold text-gray-800 block">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg placeholder:text-gray-400"
              placeholder="Nhập tên đăng nhập"
            />
          </div>

          <div className="space-y-3">
            <label className="text-base font-bold text-gray-800 block">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg placeholder:text-gray-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl font-medium">{error}</p>
          )}

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setModal('forgot')}
              className="text-sm font-bold text-blue-600 hover:underline transition-colors"
            >
              Quên mật khẩu?
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#F1C40F] hover:bg-[#F39C12] disabled:opacity-60 text-gray-900 font-bold py-3.5 px-10 rounded-xl shadow-[0_4px_14px_0_rgba(241,196,15,0.39)] transition-all active:scale-95 text-base"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-10 text-center text-sm text-gray-500 font-medium">
        Hệ thống cứu hộ giao thông thông minh • 2026
      </div>

      {/* Modals */}
      {modal === 'forgot' && <ForgotPasswordModal onClose={() => setModal(null)} />}
      {modal === 'access' && <RequestAccessModal onClose={() => setModal(null)} />}
      {modal === '2fa' && (
        <TwoFactorModal
          onClose={() => setModal(null)}
          userId={twoFactorUserId}
          message={twoFactorMessage}
          onSuccess={handle2FASuccess}
        />
      )}
    </div>
  );
}
