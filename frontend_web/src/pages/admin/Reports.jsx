import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Download, Calendar, Search, Filter, MoreVertical, CheckCircle2,
  TrendingUp, MapPin, AlertCircle, Clock, Zap, Users, Activity,
  RefreshCw, BarChart2, Target
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend
} from 'recharts';
import ExcelJS from 'exceljs';
import { useApp } from '../../context/AppContext';
import { reportAPI, adminAPI } from '../../services/api';

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ title, value, unit, sub, icon: Icon, color, bg, trend }) {
  return (
    <div className="bg-white rounded-[28px] border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-2xl ${bg} ${color} flex items-center justify-center`}>
          <Icon size={18} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-gray-900">{value ?? '—'}</span>
          {unit && <span className="text-sm font-bold text-gray-400">{unit}</span>}
        </div>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

const TYPE_LABELS = {
  ACCIDENT: 'Tai nạn', BREAKDOWN: 'Hỏng xe',
  FLOOD: 'Ngập nước', FIRE: 'Cháy nổ', OTHER: 'Khác',
};
const TYPE_COLORS = {
  ACCIDENT: '#EF4444', BREAKDOWN: '#3B82F6',
  FLOOD: '#06B6D4', FIRE: '#F97316', OTHER: '#6B7280',
};
const STATUS_VN = {
  PENDING: 'Chờ xử lý', ASSIGNED: 'Đã phân công',
  ARRIVED: 'Đến nơi', PROCESSING: 'Xử lý', OFFERING: 'Đề xuất',
  COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
};

function downloadWorkbook(workbook, filename) {
  workbook.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  });
}

export default function Reports() {
  const { incidents } = useApp();

  // ── API Data state ──────────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [teamPerf, setTeamPerf] = useState([]);
  const [loadingApi, setLoadingApi] = useState(true);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filterType, setFilterType] = useState('ALL');
  const [dateRange, setDateRange] = useState('7d'); // 7d | 30d | 90d | all

  // ── Fetch Report APIs ───────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setLoadingApi(true);
    try {
      const now = new Date();
      const fromDate = (() => {
        if (dateRange === '7d') { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString(); }
        if (dateRange === '30d') { const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString(); }
        if (dateRange === '90d') { const d = new Date(now); d.setDate(d.getDate() - 90); return d.toISOString(); }
        return undefined;
      })();

      const params = {};
      if (fromDate) params.from = fromDate;
      if (filterType !== 'ALL') params.type = filterType;

      const [summaryRes, timelineRes, perfRes] = await Promise.allSettled([
        reportAPI.getSummary(params),
        reportAPI.getTimeline({ ...params, groupBy: dateRange === '90d' ? 'month' : 'day' }),
        reportAPI.getTeamPerformance(),
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data.data);
      if (timelineRes.status === 'fulfilled') setTimeline(timelineRes.value.data.data || []);
      if (perfRes.status === 'fulfilled') setTeamPerf(perfRes.value.data.data?.slice(0, 5) || []);
    } catch (e) {
      console.error('[Reports] fetch error:', e.message);
    } finally {
      setLoadingApi(false);
    }
  }, [dateRange, filterType]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Computed KPIs ────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!summary) return null;
    const completedCount = (summary.byStatus || []).find(s => s._id === 'COMPLETED')?.count || 0;
    const total = summary.total || 0;
    const rate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    return {
      total,
      completed: completedCount,
      rate,
      avgResponse: summary.avgResponseTimeMinutes || 0,
      minResponse: summary.minResponseTimeMinutes || 0,
      maxResponse: summary.maxResponseTimeMinutes || 0,
      sosCount: summary.sosCount || 0,
    };
  }, [summary]);

  // ── Type distribution từ byType ─────────────────────────────────────────────
  const typeDistribution = useMemo(() => {
    if (!summary?.byType) return [];
    const total = Math.max(summary.total, 1);
    return summary.byType.map(b => ({
      name: TYPE_LABELS[b._id] || b._id,
      count: b.count,
      percentage: Math.round((b.count / total) * 100),
      color: TYPE_COLORS[b._id] || '#6B7280',
      _id: b._id,
    })).sort((a, b) => b.count - a.count);
  }, [summary]);

  // ── Status distribution ────────────────────────────────────────────────────
  const statusDist = useMemo(() => {
    if (!summary?.byStatus) return [];
    return summary.byStatus.map(b => ({
      name: STATUS_VN[b._id] || b._id,
      value: b.count,
      fill: b._id === 'COMPLETED' ? '#10B981'
        : b._id === 'PENDING' ? '#F59E0B'
        : b._id === 'CANCELLED' ? '#6B7280' : '#3B82F6',
    }));
  }, [summary]);

  // ── Timeline chart data ─────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    return timeline.map(t => ({
      date: t._id,
      'Tổng': t.total,
      'Hoàn thành': t.completed,
      'SOS': t.sos,
    }));
  }, [timeline]);

  // ── Export Excel ────────────────────────────────────────────────────────────
  const handleExportFullReport = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('KPI Bao Cao');

    ws.mergeCells('A1', 'H1');
    const title = ws.getCell('A1');
    title.value = 'BÁO CÁO HIỆU SUẤT HỆ THỐNG CỨU HỘ — KPI';
    title.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
    title.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.addRow([]);
    ws.addRow(['KPI', 'Giá trị']);
    if (kpis) {
      ws.addRow(['Tổng sự cố', kpis.total]);
      ws.addRow(['Hoàn thành', kpis.completed]);
      ws.addRow(['Tỷ lệ hoàn thành', `${kpis.rate}%`]);
      ws.addRow(['Thời gian phản hồi TB (phút)', kpis.avgResponse]);
      ws.addRow(['Nhanh nhất (phút)', kpis.minResponse]);
      ws.addRow(['Chậm nhất (phút)', kpis.maxResponse]);
      ws.addRow(['Tổng SOS', kpis.sosCount]);
    }
    ws.addRow([]);

    // Detail table
    const header = ws.addRow(['Mã ca', 'Thời gian báo', 'Khu vực', 'Loại sự cố', 'Đội tiếp nhận', 'Trạng thái']);
    header.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42A5F5' } };
    });
    incidents.forEach(call => {
      ws.addRow([
        call.code || 'N/A',
        new Date(call.createdAt).toLocaleString('vi-VN'),
        call.location?.address || 'N/A',
        TYPE_LABELS[call.type] || call.type,
        call.assignedTeam?.name || 'Chưa gán',
        call.status,
      ]);
    });
    ws.columns = [{ width: 16 }, { width: 22 }, { width: 44 }, { width: 15 }, { width: 28 }, { width: 14 }];
    downloadWorkbook(wb, `bao_cao_KPI_${new Date().getTime()}.xlsx`);
  };

  const dateRangeOptions = [
    { value: '7d', label: '7 ngày qua' },
    { value: '30d', label: '30 ngày' },
    { value: '90d', label: '3 tháng' },
    { value: 'all', label: 'Toàn thời gian' },
  ];

  return (
    <div className="h-full space-y-6 pt-2 animate-fade-in overflow-y-auto pb-8 pr-2">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Báo cáo & Chỉ số KPI</h2>
          <p className="text-sm text-gray-500 font-medium italic opacity-70">Hiệu suất xử lý theo thời gian thực</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchReports} disabled={loadingApi}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50">
            <RefreshCw size={15} className={loadingApi ? 'animate-spin' : ''} /> Làm mới
          </button>
          <button onClick={async () => {
            try { await adminAPI.triggerReports({}); alert('Đã đồng bộ số liệu!'); } catch {}
          }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-2xl text-sm font-bold text-blue-700 hover:bg-blue-100 transition-all shadow-sm">
            <Activity size={15} /> Đồng bộ hệ thống
          </button>
          <button onClick={handleExportFullReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            <Download size={15} /> Xuất KPI (.xlsx)
          </button>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-400">Khoảng thời gian:</span>
        </div>
        <div className="flex gap-2">
          {dateRangeOptions.map(o => (
            <button key={o.value} onClick={() => setDateRange(o.value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateRange === o.value ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">Loại:</span>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-xs font-bold text-gray-700 outline-none">
            <option value="ALL">Tất cả</option>
            <option value="ACCIDENT">Tai nạn</option>
            <option value="BREAKDOWN">Hỏng xe</option>
            <option value="FLOOD">Ngập nước</option>
            <option value="FIRE">Cháy nổ</option>
          </select>
        </div>
      </div>

      {loadingApi ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={28} className="animate-spin text-blue-500" />
          <span className="ml-3 text-gray-500 font-medium">Đang tải số liệu...</span>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Tổng sự cố ghi nhận" value={kpis?.total ?? 0}
              icon={AlertCircle} color="text-blue-600" bg="bg-blue-50" />
            <KpiCard title="Tỷ lệ hoàn thành" value={`${kpis?.rate ?? 0}`} unit="%"
              sub={`${kpis?.completed ?? 0} / ${kpis?.total ?? 0} ca`}
              icon={Target} color="text-green-600" bg="bg-green-50" />
            <KpiCard title="Thời gian phản hồi TB" value={kpis?.avgResponse ?? 0} unit="phút"
              sub={`Min: ${kpis?.minResponse ?? 0} | Max: ${kpis?.maxResponse ?? 0} phút`}
              icon={Clock} color="text-orange-600" bg="bg-orange-50" />
            <KpiCard title="Tổng tín hiệu SOS" value={kpis?.sosCount ?? 0}
              sub="Sự cố khẩn cấp 1 chạm"
              icon={Zap} color="text-red-600" bg="bg-red-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Timeline Chart ─────────────────────────────────────────── */}
            <div className="lg:col-span-2 bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <BarChart2 size={18} className="text-gray-700" />
                <h4 className="text-base font-black text-gray-900">Biểu đồ sự cố theo thời gian</h4>
              </div>
              {chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false}
                      tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '10px' }}
                      labelStyle={{ fontWeight: 800, marginBottom: 4 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                    <Bar dataKey="Tổng" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="Hoàn thành" fill="#10B981" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="SOS" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Type Distribution ──────────────────────────────────────── */}
            <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={18} className="text-gray-700" />
                <h4 className="text-base font-black text-gray-900">Phân bổ loại sự cố</h4>
              </div>
              <div className="space-y-5">
                {typeDistribution.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Chưa có dữ liệu</p>
                ) : typeDistribution.map(t => (
                  <div key={t._id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-gray-700">{t.name}</span>
                      <span className="font-black text-gray-900 text-xs">{t.count} vụ · {t.percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${t.percentage}%`, backgroundColor: t.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Status Distribution ────────────────────────────────────── */}
            <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Activity size={18} className="text-gray-700" />
                <h4 className="text-base font-black text-gray-900">Phân bổ theo trạng thái</h4>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={statusDist} layout="vertical" margin={{ left: 20, right: 10 }}>
                  <XAxis type="number" axisLine={false} tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fill: '#374151', fontSize: 11, fontWeight: 700 }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                    {statusDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── Team Performance ───────────────────────────────────────── */}
            <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Users size={18} className="text-gray-700" />
                <h4 className="text-base font-black text-gray-900">Top đội cứu hộ xuất sắc</h4>
              </div>
              {teamPerf.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Chưa có dữ liệu hiệu suất</p>
              ) : (
                <div className="space-y-4">
                  {teamPerf.map((team, i) => (
                    <div key={team._id} className="flex items-center gap-4">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 ${
                        i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : 'bg-orange-300'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{team.name}</p>
                        <p className="text-xs text-gray-400">{team.zone} · {team.type}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-green-600">{team.stats?.totalCompleted ?? 0} ca</p>
                        <p className="text-xs text-gray-400">{team.stats?.avgResponseTime ?? 0} phút TB</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Detail Table ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-[28px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h4 className="text-base font-black text-gray-900">Chi tiết các ca cứu hộ</h4>
              <button onClick={handleExportFullReport}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700">
                <Download size={13} /> Xuất (.xlsx)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                    {['Mã ca', 'Thời gian', 'Khu vực', 'Loại sự cố', 'Đội tiếp nhận', 'Trạng thái'].map(h => (
                      <th key={h} className="px-6 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {incidents.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm font-bold">Không có dữ liệu</td></tr>
                  )}
                  {incidents
                    .filter(i => filterType === 'ALL' || i.type === filterType)
                    .slice(0, 50)
                    .map(call => (
                      <tr key={call._id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-black text-gray-900">{call.code || '—'}</td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-500">
                          {new Date(call.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-700 max-w-[180px] truncate">
                          {call.location?.address?.split(',')[0] || '—'}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold" style={{ color: TYPE_COLORS[call.type] }}>
                          {TYPE_LABELS[call.type] || call.type}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-blue-600">
                          {call.assignedTeam?.name || <span className="text-gray-400">Chưa gán</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                            call.status === 'COMPLETED' ? 'bg-green-50 text-green-600'
                            : call.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500'
                            : 'bg-blue-50 text-blue-600'
                          }`}>
                            {STATUS_VN[call.status] || call.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
