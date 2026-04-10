import React, { useState } from 'react';
import { 
  Download, 
  Calendar, 
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  MapPin,
  AlertCircle
} from 'lucide-react';

const INCIDENT_TYPES = [
  { name: 'Hỏng xe / Chết máy', count: 50, percentage: 85, color: 'bg-blue-500' },
  { name: 'Tai nạn giao thông', count: 38, percentage: 65, color: 'bg-blue-500' },
  { name: 'Hết nhiên liệu', count: 20, percentage: 35, color: 'bg-blue-500' },
  { name: 'Ngập nước', count: 11, percentage: 20, color: 'bg-blue-500' },
];

const RECENT_CALLS = [
  { id: '0001', time: '29/01/2026', area: 'Cầu Giấy', type: 'Tai nạn giao thông', team: '0001', status: 'COMPLETED' },
  { id: '0002', time: '29/01/2026', area: 'Đống Đa', type: 'Hỏng xe', team: '0003', status: 'COMPLETED' },
  { id: '0003', time: '29/01/2026', area: 'Thanh Xuân', type: 'Hết nhiên liệu', team: '0002', status: 'COMPLETED' },
];

export default function Reports() {
  return (
    <div className="h-full space-y-8 pt-2 animate-fade-in overflow-y-auto pb-8 pr-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Báo cáo chi tiết</h2>
          <p className="text-sm text-gray-500 font-medium font-sans italic opacity-70">Báo cáo hệ thống</p>
        </div>
        <div className="flex items-center gap-4">
           <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-black text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
             <Download size={18} />
             Xuất báo cáo (.csv)
           </button>
           <div className="w-10 h-10 rounded-full border border-gray-200 overflow-hidden shrink-0 shadow-sm">
              <img src="https://ui-avatars.com/api/?name=AD&background=1f2937&color=fff" alt="User" />
           </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-6">
         <div className="flex-1 grid grid-cols-3 gap-6">
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                  <Calendar size={14} /> Khoảng thời gian
               </div>
               <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-sm font-black text-gray-700">
                  <span>01/03/2026</span>
                  <span className="text-gray-300 font-normal">-</span>
                  <span>31/03/2026</span>
               </div>
            </div>
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                  <MapPin size={14} /> Khu vực
               </div>
               <select className="w-full bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-sm font-black text-gray-700 outline-none appearance-none cursor-pointer">
                  <option>Toàn thành phố</option>
                  <option>Cầu Giấy</option>
               </select>
            </div>
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                  <AlertCircle size={14} /> Loại sự cố
               </div>
               <select className="w-full bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-sm font-black text-gray-700 outline-none appearance-none cursor-pointer">
                  <option>Tất cả</option>
                  <option>Tai nạn</option>
               </select>
            </div>
         </div>
         <button className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-500 hover:bg-gray-50 transition-all shadow-sm">
            <Filter size={20} />
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Incident Distribution */}
         <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-gray-50 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-8">
               <TrendingUp size={22} className="text-gray-900" />
               <h4 className="text-lg font-black text-gray-900">Phân bổ loại sự cố</h4>
            </div>
            <div className="space-y-8 flex-1">
               {INCIDENT_TYPES.map(type => (
                 <div key={type.name} className="space-y-3">
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-black text-gray-800">{type.name}</span>
                       <span className="text-sm font-bold text-gray-400">{type.count} vụ</span>
                    </div>
                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                       <div 
                         className={`h-full ${type.color} rounded-full transition-all duration-1000`} 
                         style={{ width: `${type.percentage}%` }}
                       />
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Summary Results */}
         <div className="bg-white p-10 rounded-[40px] border border-gray-50 shadow-sm space-y-10">
            <h4 className="text-lg font-black text-gray-900">Kết quả báo cáo</h4>
            
            <div className="space-y-1">
               <p className="text-sm font-bold text-gray-400">Tổng số ca ghi nhận</p>
               <h3 className="text-4xl font-black text-gray-900">112</h3>
            </div>

            <div className="space-y-1">
               <p className="text-sm font-bold text-gray-400">Tỷ lệ hoàn thành</p>
               <h3 className="text-4xl font-black text-gray-900">90%</h3>
            </div>

            <div className="space-y-1">
               <p className="text-sm font-bold text-gray-400">Đội xuất sắc nhất</p>
               <h3 className="text-2xl font-black text-blue-600">Đội cứu hộ 1</h3>
            </div>
         </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h4 className="text-lg font-black text-gray-900">Chi tiết các ca cứu hộ</h4>
            <button className="flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-700 transition-all">
               <Download size={14} />
               Xuất bảng dữ liệu này (.csv)
            </button>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50/50 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                     <th className="px-8 py-5">Mã ca</th>
                     <th className="px-8 py-5">Thời gian báo</th>
                     <th className="px-8 py-5">Khu vực</th>
                     <th className="px-8 py-5">Loại sự cố</th>
                     <th className="px-8 py-5">Đội tiếp nhận</th>
                     <th className="px-8 py-5">Trạng thái</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {RECENT_CALLS.map(call => (
                    <tr key={call.id} className="group hover:bg-gray-50/30 transition-colors">
                       <td className="px-8 py-6 text-sm font-black text-gray-900">{call.id}</td>
                       <td className="px-8 py-6 text-sm font-bold text-gray-700 italic">{call.time}</td>
                       <td className="px-8 py-6 text-sm font-black text-gray-900">{call.area}</td>
                       <td className="px-8 py-6 text-sm font-bold text-gray-700">{call.type}</td>
                       <td className="px-8 py-6 text-sm font-bold text-gray-900 italic">{call.team}</td>
                       <td className="px-8 py-6">
                          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-black">
                             Hoàn thành
                          </span>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
