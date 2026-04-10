import React, { useState } from 'react';
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

const DATA_LATEST = [
  { day: 'T2', value: 45 },
  { day: 'T3', value: 52 },
  { day: 'T4', value: 38 },
  { day: 'T5', value: 65 },
  { day: 'T6', value: 48 },
  { day: 'T7', value: 72 },
  { day: 'CN', value: 58 },
];

const HOTSPOTS = [
  { name: 'Cầu Giấy', count: 58, percentage: 80, color: 'bg-blue-500' },
  { name: 'Đống Đa', count: 38, percentage: 60, color: 'bg-blue-400' },
  { name: 'Thanh Xuân', count: 33, percentage: 55, color: 'bg-blue-300' },
  { name: 'Hà Đông', count: 21, percentage: 35, color: 'bg-blue-200' },
  { name: 'Hoàn Kiếm', count: 9, percentage: 15, color: 'bg-blue-100' },
];

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

  if (view === 'HEATMAP') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Bản đồ nhiệt</h2>
            <p className="text-sm text-gray-500 font-medium">Báo cáo hệ thống</p>
          </div>
          <button 
            onClick={() => setView('MAIN')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            ← Quay lại
          </button>
        </div>

        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden relative min-h-[600px]">
          {/* Legend */}
          <div className="absolute top-6 right-8 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-gray-100 shadow-lg flex items-center gap-4 text-xs font-bold">
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

          {/* Placeholder for Map/Heatmap */}
          <div className="absolute inset-0 bg-[#f0f2f5] flex items-center justify-center">
             <div className="w-full h-full opacity-60 grayscale scale-110">
                <img 
                  src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=2000" 
                  alt="Map Placeholder" 
                  className="w-full h-full object-cover"
                />
             </div>
             {/* Heat spots */}
             <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-red-500/30 rounded-full blur-3xl animate-pulse" />
             <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-yellow-500/30 rounded-full blur-3xl animate-pulse delay-700" />
             <div className="absolute bottom-1/4 right-1/3 w-36 h-36 bg-red-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-8 py-4 rounded-3xl border border-gray-100 shadow-2xl text-center">
             <p className="text-sm font-black text-gray-900 mb-1">Dữ liệu mật độ sự cố 7 ngày qua</p>
             <p className="text-xs text-gray-500">Cập nhật lúc {new Date().toLocaleTimeString('vi-VN')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 font-sans">Tổng quan hoạt động</h2>
          <p className="text-sm text-gray-500 font-medium font-sans">Báo cáo hệ thống</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
          <FileText size={18} />
          Xuất báo cáo (.csv)
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Tổng sự cố tháng này" 
          value="1,284" 
          trend="up" 
          trendValue="+12.5%" 
          icon={AlertCircle} 
          color="text-blue-600" 
          bg="bg-blue-50" 
        />
        <Card 
          title="TO phản hồi TB" 
          value="4.2" 
          subValue="phút" 
          trend="down" 
          trendValue="-0.5 phút" 
          icon={Clock} 
          color="text-green-600" 
          bg="bg-green-50" 
        />
        <Card 
          title="Tài xế đang hoạt động" 
          value="40/60" 
          trend="up" 
          trendValue="+3" 
          icon={Users} 
          color="text-orange-600" 
          bg="bg-orange-50" 
        />
        <Card 
          title="Đánh giá hài lòng" 
          value="4.7" 
          subValue="/ 5.0" 
          trend="up" 
          trendValue="+0.1" 
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
               <button className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white shadow-sm text-gray-900">Tuần này</button>
               <button className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-400 hover:text-gray-600">Tháng này</button>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DATA_LATEST} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  {DATA_LATEST.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value > 60 ? '#10B981' : '#3B82F6'} fillOpacity={index === 5 ? 1 : 0.8} />
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
            {HOTSPOTS.map((h) => (
              <div key={h.name} className="space-y-2">
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
    </div>
  );
}
