import React, { useState, useMemo } from 'react';
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
import ExcelJS from 'exceljs';
import { useApp } from '../../context/AppContext';

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
  const [filterType, setFilterType] = useState('ALL');

  // Computed properties mapping from live context
  const filtered = useMemo(() => {
    let list = incidents;
    if (filterType !== 'ALL') {
      list = list.filter(i => i.type === filterType);
    }
    return list;
  }, [incidents, filterType]);

  const typeDistribution = useMemo(() => {
    const counts = { ACCIDENT: 0, BREAKDOWN: 0, FLOOD: 0, FIRE: 0, OTHER: 0 };
    filtered.forEach(i => {
      counts[i.type] = (counts[i.type] || 0) + 1;
    });
    const total = Math.max(filtered.length, 1);
    
    return [
      { name: 'Tai nạn giao thông', count: counts.ACCIDENT, percentage: Math.round(counts.ACCIDENT/total*100), color: 'bg-red-500' },
      { name: 'Hỏng xe / Chết máy', count: counts.BREAKDOWN, percentage: Math.round(counts.BREAKDOWN/total*100), color: 'bg-blue-500' },
      { name: 'Ngập nước', count: counts.FLOOD, percentage: Math.round(counts.FLOOD/total*100), color: 'bg-cyan-500' },
      { name: 'Cháy nổ', count: counts.FIRE, percentage: Math.round(counts.FIRE/total*100), color: 'bg-orange-500' },
      { name: 'Khác', count: counts.OTHER, percentage: Math.round(counts.OTHER/total*100), color: 'bg-gray-500' },
    ].sort((a,b) => b.count - a.count);
  }, [filtered]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter(i => i.status === 'COMPLETED').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Find best team
    const teamCounts = {};
    filtered.forEach(i => {
      if (i.status === 'COMPLETED' && i.assignedTeam) {
        teamCounts[i.assignedTeam.name] = (teamCounts[i.assignedTeam.name] || 0) + 1;
      }
    });
    
    let bestTeam = 'Chưa có dữ liệu';
    let max = 0;
    for (const [t, c] of Object.entries(teamCounts)) {
      if (c > max) { max = c; bestTeam = t; }
    }

    return { total, rate, bestTeam };
  }, [filtered]);

  const handleExportFullReport = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Bao Cao Chi Tiet');
    
    ws.mergeCells('A1', 'F1');
    const title = ws.getCell('A1');
    title.value = 'BÁO CÁO THỐNG KÊ CHI TIẾT SỰ CỐ';
    title.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
    title.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.addRow([]);
    ws.addRow(['Tổng số ca:', stats.total, 'Tỷ lệ hoàn thành:', `${stats.rate}%`, 'Đội xuất sắc:', stats.bestTeam]);
    ws.addRow([]);

    const header = ws.addRow(['Mã ca', 'Thời gian báo', 'Khu vực', 'Loại sự cố', 'Đội tiếp nhận', 'Trạng thái']);
    header.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42A5F5' } };
    });

    const lbl = { ACCIDENT: 'Tai nạn', BREAKDOWN: 'Hỏng xe', FLOOD: 'Ngập nước', FIRE: 'Cháy nổ', OTHER: 'Khác' };
    filtered.forEach(call => {
       ws.addRow([
         call.code || 'N/A',
         new Date(call.createdAt).toLocaleString('vi-VN'),
         call.location?.address || 'N/A',
         lbl[call.type] || 'Khác',
         call.assignedTeam?.name || 'Trống',
         call.status
       ]);
    });

    ws.columns = [{ width: 15 }, { width: 22 }, { width: 45 }, { width: 15 }, { width: 30 }, { width: 15 }];
    downloadWorkbook(wb, `bao_cao_chi_tiet_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="h-full space-y-8 pt-2 animate-fade-in overflow-y-auto pb-8 pr-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Báo cáo chi tiết</h2>
          <p className="text-sm text-gray-500 font-medium font-sans italic opacity-70">Thống kê từ Dữ liệu Live</p>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={handleExportFullReport} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-black text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
             <Download size={18} />
             Xuất báo cáo tổng (.xlsx)
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
               <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-sm font-black text-gray-700 opacity-50 cursor-not-allowed">
                  <span>Toàn thời gian</span>
               </div>
            </div>
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                  <MapPin size={14} /> Khu vực
               </div>
               <select className="w-full bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-sm font-black text-gray-700 outline-none appearance-none cursor-pointer">
                  <option>Toàn thành phố</option>
               </select>
            </div>
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                  <AlertCircle size={14} /> Loại sự cố
               </div>
               <select 
                 value={filterType} 
                 onChange={e => setFilterType(e.target.value)}
                 className="w-full bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-sm font-black text-gray-700 outline-none appearance-none cursor-pointer"
               >
                  <option value="ALL">Tất cả</option>
                  <option value="ACCIDENT">Tai nạn</option>
                  <option value="BREAKDOWN">Hỏng xe</option>
                  <option value="FLOOD">Ngập nước</option>
                  <option value="FIRE">Cháy nổ</option>
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
               {typeDistribution.map(type => (
                 <div key={type.name} className="space-y-3">
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-black text-gray-800">{type.name}</span>
                       <span className="text-sm font-bold text-gray-400">{type.count} vụ ({type.percentage}%)</span>
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
               <h3 className="text-4xl font-black text-gray-900">{stats.total}</h3>
            </div>

            <div className="space-y-1">
               <p className="text-sm font-bold text-gray-400">Tỷ lệ hoàn thành</p>
               <h3 className="text-4xl font-black text-gray-900">{stats.rate}%</h3>
            </div>

            <div className="space-y-1">
               <p className="text-sm font-bold text-gray-400">Đội xuất sắc nhất</p>
               <h3 className="text-2xl font-black text-blue-600 truncate">{stats.bestTeam}</h3>
            </div>
         </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h4 className="text-lg font-black text-gray-900">Chi tiết các ca cứu hộ</h4>
            <button onClick={handleExportFullReport} className="flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-700 transition-all">
               <Download size={14} />
               Xuất bảng dữ liệu này (.xlsx)
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
                  {filtered.length === 0 && (
                     <tr><td colSpan="6" className="text-center py-8 text-gray-400 font-bold">Không có yêu cầu cứu hộ</td></tr>
                  )}
                  {filtered.map(call => {
                    const lbl = { ACCIDENT: 'Tai nạn', BREAKDOWN: 'Hỏng xe', FLOOD: 'Ngập nước', FIRE: 'Cháy nổ', OTHER: 'Khác' };
                    return (
                    <tr key={call._id} className="group hover:bg-gray-50/30 transition-colors">
                       <td className="px-8 py-6 text-sm font-black text-gray-900">{call.code || '...'}</td>
                       <td className="px-8 py-6 text-sm font-bold text-gray-700 italic">{new Date(call.createdAt).toLocaleString('vi-VN')}</td>
                       <td className="px-8 py-6 text-sm font-black text-gray-900 truncate max-w-[200px]" title={call.location?.address}>{call.location?.address?.split(',')[0] || '...'}</td>
                       <td className="px-8 py-6 text-sm font-bold text-gray-700">{lbl[call.type] || 'Khác'}</td>
                       <td className="px-8 py-6 text-sm font-bold text-blue-600 italic">{call.assignedTeam?.name || 'Chưa gán'}</td>
                       <td className="px-8 py-6">
                          <span className={`px-3 py-1.5 ${call.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-600'} border border-transparent rounded-lg text-[10px] font-black`}>
                             {call.status}
                          </span>
                       </td>
                    </tr>
                  )})}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
