import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Shield, 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  Star, 
  ChevronRight, 
  Map as MapIcon, 
  FileText,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import ExcelJS from 'exceljs';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../../context/AppContext';
import HeatmapLayer from '../../components/HeatmapLayer';

function Card({ title, value, subValue, icon: Icon, trend, trendValue, color, bg }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center shrink-0`}>
          <Icon size={22} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trendValue}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-black text-gray-900">{value}</h3>
          {subValue && <span className="text-sm font-medium text-gray-400">{subValue}</span>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [view, setView] = useState('MAIN'); // MAIN | HEATMAP
  const { incidents, dashboard, loading } = useApp();

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bao Cao');

    worksheet.mergeCells('A1', 'H1');
    const titleRow = worksheet.getCell('A1');
    titleRow.value = 'BÁO CÁO HOẠT ĐỘNG HỆ THỐNG CỨU HỘ';
    titleRow.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D47A1' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow(['Ngày xuất biên bản:', new Date().toLocaleDateString('vi-VN')]);
    worksheet.addRow(['Tổng sự cố:', dashboard?.totalIncidents || 0]);
    worksheet.addRow(['Sự cố hôm nay:', dashboard?.todayIncidents || 0]);
    worksheet.addRow(['Tổng đội cứu hộ:', dashboard?.totalTeams || 0]);
    worksheet.addRow([]); // Blank row

    const headerRow = worksheet.addRow(['STT', 'Mã Sự Cố', 'Loại Sự Cố', 'Mức Độ', 'Trạng Thái', 'Ngày Báo', 'Địa Chỉ', 'Đội Xử Lý']);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    const typeLabels = { ACCIDENT: 'Tai nạn', BREAKDOWN: 'Hỏng xe', FLOOD: 'Ngập nước', FIRE: 'Cháy nổ' };

    incidents.forEach((inc, index) => {
      worksheet.addRow([
        index + 1,
        inc.code || 'N/A',
        typeLabels[inc.type] || 'Sự cố khác',
        inc.severity,
        inc.status,
        new Date(inc.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' }),
        inc.location?.address || 'Không xác định',
        inc.assignedTeam?.name || 'Chưa phân công'
      ]);
    });

    worksheet.columns = [
      { width: 6 }, { width: 14 }, { width: 18 }, { width: 14 }, { width: 18 }, { width: 22 }, { width: 45 }, { width: 25 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bao_cao_cuu_ho_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
  };

  const chartData = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push({
        dateObj: d,
        day: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
        value: 0
      });
    }

    incidents.forEach(inc => {
      const incDate = new Date(inc.createdAt);
      const matched = result.find(r => 
        r.dateObj.getDate() === incDate.getDate() && 
        r.dateObj.getMonth() === incDate.getMonth() && 
        r.dateObj.getFullYear() === incDate.getFullYear()
      );
      if (matched) matched.value++;
    });
    return result;
  }, [incidents]);

  const hotspotsData = useMemo(() => {
    const districts = ['Cầu Giấy', 'Đống Đa', 'Thanh Xuân', 'Hà Đông', 'Hoàn Kiếm', 'Hai Bà Trưng', 'Ba Đình', 'Hoàng Mai', 'Tây Hồ', 'Nam Từ Liêm', 'Bắc Từ Liêm'];
    const counts = {};
    districts.forEach(d => counts[d] = 0);

    incidents.forEach(inc => {
      if (!inc.location?.address) return;
      const addr = inc.location.address;
      for (let d of districts) {
        if (addr.includes(d)) {
          counts[d]++;
          break;
        }
      }
    });

    // Handle case with no matched incidents
    if (Object.values(counts).every(c => c === 0)) {
      return [
        { name: 'Cầu Giấy', count: 0, percentage: 0, color: 'bg-blue-500' },
        { name: 'Đống Đa', count: 0, percentage: 0, color: 'bg-gray-200' },
        { name: 'Thanh Xuân', count: 0, percentage: 0, color: 'bg-gray-200' },
        { name: 'Hà Đông', count: 0, percentage: 0, color: 'bg-gray-200' }
      ];
    }

    const maxCount = Math.max(...Object.values(counts));
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const colors = ['bg-blue-500', 'bg-blue-400', 'bg-blue-300', 'bg-blue-200', 'bg-blue-100'];
    
    return sorted.map(([name, count], idx) => ({
      name,
      count,
      percentage: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0,
      color: colors[idx] || colors[4]
    }));
  }, [incidents]);

  if (view === 'HEATMAP') {
    return (
      <div className="space-y-6 animate-fade-in flex flex-col h-full">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Bản đồ nhiệt</h2>
            <p className="text-sm text-gray-500 font-medium">Theo dõi Tọa độ thực của các Sự cố</p>
          </div>
          <button 
            onClick={() => setView('MAIN')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            ← Quay lại Tổng quan
          </button>
        </div>

        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden relative flex-1 min-h-[500px]">
          {/* Legend */}
          <div className="absolute top-6 right-8 z-[500] bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-gray-100 shadow-lg flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" /> Cao
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" /> Trung bình
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" /> Thấp
            </span>
          </div>

          <div className="absolute inset-0 bg-[#f0f2f5] z-0">
            <MapContainer center={[21.028511, 105.804817]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <HeatmapLayer 
                 points={incidents.filter(i => i.location?.coordinates).map(i => ({
                    lat: i.location.coordinates[1],
                    lng: i.location.coordinates[0],
                    intensity: i.severity === 'CRITICAL' ? 1.0 : i.severity === 'HIGH' ? 0.7 : 0.4
                 }))} 
                 radius={30} 
                 blur={18} 
                 maxZoom={15} 
              />
            </MapContainer>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-8 py-4 rounded-3xl border border-gray-100 shadow-2xl text-center z-[500]">
             <p className="text-sm font-black text-gray-900 mb-1">Dữ liệu mật độ sự cố hiện hữu</p>
             <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">● Cập nhật Trực tiếp (Live)</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 font-sans">Tổng quan hoạt động</h2>
          <p className="text-sm text-gray-500 font-medium font-sans">Thời gian thực (Live Dashboard)</p>
        </div>
        <button 
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-blue-100"
        >
          <FileText size={18} />
          Xuất báo cáo (.xlsx)
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
           <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card 
              title="Tổng sự cố ghi nhận" 
              value={dashboard?.totalIncidents || 0} 
              trend="up" 
              trendValue={`Hôm nay: +${dashboard?.todayIncidents || 0}`} 
              icon={AlertCircle} 
              color="text-blue-600" 
              bg="bg-blue-50" 
            />
            <Card 
              title="Sự cố đang xử lý" 
              value={dashboard?.activeIncidents || 0} 
              subValue="vụ" 
              trend="up" 
              trendValue="Live" 
              icon={Clock} 
              color="text-green-600" 
              bg="bg-green-50" 
            />
            <Card 
              title="Tổng số đội cứu hộ" 
              value={dashboard?.totalTeams || 0} 
              trend="up" 
              trendValue={dashboard?.activeTeams + " Sẵn sàng"} 
              icon={Users} 
              color="text-orange-600" 
              bg="bg-orange-50" 
            />
            <Card 
              title="Tổng người dùng" 
              value={dashboard?.totalUsers || 0} 
              subValue="User" 
              trend="up" 
              trendValue="Active" 
              icon={Star} 
              color="text-purple-600" 
              bg="bg-purple-50" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-lg font-black text-gray-900">Tần suất sự cố theo ngày</h4>
                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
                   <button className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white shadow-sm text-gray-900">7 ngày qua</button>
                </div>
              </div>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 700 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#F9FAFB' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                      labelStyle={{ fontWeight: 800, marginBottom: '4px' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value > 10 ? '#10B981' : '#3B82F6'} fillOpacity={index === 6 ? 1 : 0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hotspots */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col">
              <h4 className="text-lg font-black text-gray-900 mb-8">Điểm nóng sự cố</h4>
              <div className="space-y-6 flex-1">
                {hotspotsData.map((h, i) => (
                  <div key={h.name + i} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-gray-700">{h.name}</span>
                      <span className="font-black text-gray-900">{h.count} vụ</span>
                    </div>
                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                       <div 
                        className={`h-full ${h.color} rounded-full transition-all duration-1000`} 
                        style={{ width: `${h.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setView('HEATMAP')}
                className="w-full mt-8 py-4 bg-gray-50 hover:bg-gray-100 transition-all rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-gray-600"
              >
                <MapIcon size={18} />
                Xem bản đồ nhiệt
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
