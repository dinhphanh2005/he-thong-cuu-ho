/**
 * Utils & Token Tests — 100% coverage cho pure functions
 */
const { haversineDistance, isValidCoordinates, formatDistance } = require('../src/utils/geoUtils');
const { generateAccessToken, generateRefreshToken, generateToken } = require('../src/utils/generateToken');
const jwt = require('jsonwebtoken');

describe('[UTILS] geoUtils', () => {

  describe('haversineDistance', () => {
    test('Cùng một điểm → 0m', () => {
      const d = haversineDistance([105.84, 21.02], [105.84, 21.02]);
      expect(d).toBe(0);
    });

    test('Hà Nội → TP.HCM ≈ 1,143km (đường chim bay)', () => {
      const hanoi = [105.8412, 21.0245];
      const hcm = [106.6602, 10.7769];
      const d = haversineDistance(hanoi, hcm);
      // Khoảng cách thực tế đường chim bay ~1,143km
      expect(d).toBeGreaterThan(1_000_000); // > 1,000km
      expect(d).toBeLessThan(1_300_000);    // < 1,300km
    });

    test('Khoảng cách ngắn ~100m', () => {
      const p1 = [105.8412, 21.0245];
      const p2 = [105.8420, 21.0245]; // ~70m về phía đông
      const d = haversineDistance(p1, p2);
      expect(d).toBeGreaterThan(50);
      expect(d).toBeLessThan(1000);
    });

    test('Đối xứng: dist(A,B) == dist(B,A)', () => {
      const a = [105.84, 21.02];
      const b = [106.66, 10.77];
      expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 0);
    });
  });

  describe('isValidCoordinates', () => {
    test('Tọa độ Hà Nội hợp lệ', () => {
      expect(isValidCoordinates([105.8412, 21.0245])).toBe(true);
    });

    test('Tọa độ TP.HCM hợp lệ', () => {
      expect(isValidCoordinates([106.6602, 10.7769])).toBe(true);
    });

    test('null → false', () => {
      expect(isValidCoordinates(null)).toBe(false);
    });

    test('Mảng rỗng → false', () => {
      expect(isValidCoordinates([])).toBe(false);
    });

    test('Chỉ 1 phần tử → false', () => {
      expect(isValidCoordinates([105.84])).toBe(false);
    });

    test('String → false', () => {
      expect(isValidCoordinates(['abc', 21.02])).toBe(false);
    });

    test('lat > 90 → false', () => {
      expect(isValidCoordinates([105.84, 91])).toBe(false);
    });

    test('lng > 180 → false', () => {
      expect(isValidCoordinates([181, 21.02])).toBe(false);
    });

    test('Cực Bắc (lat=90) → true', () => {
      expect(isValidCoordinates([0, 90])).toBe(true);
    });

    test('Cực Nam (lat=-90) → true', () => {
      expect(isValidCoordinates([0, -90])).toBe(true);
    });
  });

  describe('formatDistance', () => {
    test('< 1000m → "xxx m"', () => {
      expect(formatDistance(500)).toBe('500 m');
      expect(formatDistance(999)).toBe('999 m');
      expect(formatDistance(0)).toBe('0 m');
    });

    test('>= 1000m → "x.x km"', () => {
      expect(formatDistance(1000)).toBe('1.0 km');
      expect(formatDistance(1500)).toBe('1.5 km');
      expect(formatDistance(10000)).toBe('10.0 km');
    });

    test('Round về nearest meter', () => {
      expect(formatDistance(999.6)).toBe('1000 m');
    });
  });
});

describe('[UTILS] generateToken', () => {
  describe('generateAccessToken', () => {
    test('Tạo JWT hợp lệ cho userId', () => {
      const token = generateAccessToken('user123');
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // header.payload.signature

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe('user123');
    });

    test('Có sessionId thì payload chứa sid', () => {
      const token = generateAccessToken('user456', 'session-abc');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.sid).toBe('session-abc');
    });

    test('Không có sessionId → không có sid trong payload', () => {
      const token = generateAccessToken('user789');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.sid).toBeUndefined();
    });

    test('Override expiresIn hoạt động', () => {
      const token = generateAccessToken('user000', null, '1h');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.exp - decoded.iat).toBe(3600); // 1h = 3600s
    });

    test('generateToken là alias của generateAccessToken', () => {
      const t1 = generateToken('u1');
      const t2 = generateAccessToken('u1');
      // Cả hai đều tạo token hợp lệ với cùng structure
      const d1 = jwt.decode(t1);
      const d2 = jwt.decode(t2);
      expect(d1.id).toBe(d2.id);
    });
  });

  describe('generateRefreshToken', () => {
    test('Tạo refresh token hợp lệ', () => {
      const token = generateRefreshToken('user123');
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe('user123');
    });

    test('Refresh token có sessionId', () => {
      const token = generateRefreshToken('user456', 'sess-xyz');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.sid).toBe('sess-xyz');
    });

    test('Refresh token sống lâu hơn access token', () => {
      const access = generateAccessToken('u1', null, '1h');
      const refresh = generateRefreshToken('u1');
      const da = jwt.decode(access);
      const dr = jwt.decode(refresh);
      expect(dr.exp - dr.iat).toBeGreaterThan(da.exp - da.iat);
    });
  });
});
