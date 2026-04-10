import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Bell, 
  Database, 
  Settings2, 
  AppWindow,
  Download,
  Info,
  ChevronRight,
  Database as DbIcon,
  CircleDot
} from 'lucide-react';
import { authAPI, clearAuth } from '../../services/api';
import { disconnectSocket } from '../../services/socket';

const CATEGORIES = [
  { id: 'GENERAL', name: 'Hệ thống chung', icon: AppWindow },
  { id: 'NOTI', name: 'Cấu hình thông báo', icon: Bell },
  { id: 'ALGO', name: 'Thuật toán điều phối', icon: Settings2 },
  { id: 'SECURITY', name: 'Bảo mật và phân quyền', icon: ShieldCheck },
  { id: 'BACKUP', name: 'Sao lưu dữ liệu', icon: Database },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('BACKUP');
  
  const renderContent = () => {
    switch (activeTab) {
      case 'GENERAL':
        return (
          <div className="space-y-10 animate-fade-in px-4">
             <div className="space-y-1">
                <h3 className="text-lg font-black text-gray-900">Cài đặt hệ thống chung</h3>
                <p className="text-sm font-medium text-gray-400">Thay đổi các được áp dụng trên toàn bộ hệ thống.</p>
             </div>
             
             <div className="space-y-6 max-w-lg">
                <div className="space-y-2">
                   <label className="text-sm font-black text-gray-700 ml-1">Tên hệ thống</label>
                   <input type="text" defaultValue="Cứu hộ giao thông" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-black text-gray-900" />
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-black text-gray-700 ml-1">Hotline tổng đài</label>
                   <input type="text" defaultValue="1900 1234" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-black text-gray-900" />
                </div>
             </div>

             <div className="p-8 bg-red-50/50 rounded-[40px] border border-red-50 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-red-600 mb-1">Chế độ bảo trì hệ thống</h4>
                  <p className="text-[11px] font-bold text-red-400">Người dùng và đối tác sẽ không thể đăng nhập.<br/>Chỉ có Admin có quyền truy cập.</p>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500"></div>
                </div>
             </div>
          </div>
        );
      
      case 'NOTI':
        return (
          <div className="space-y-10 animate-fade-in px-4">
             <div className="space-y-1">
                <h3 className="text-lg font-black text-gray-900">Cấu hình thông báo</h3>
                <p className="text-sm font-medium text-gray-400">Thay đổi và được áp dụng trên toàn bộ hệ thống.</p>
             </div>

             <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-50 flex items-start gap-4">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-blue-800 leading-relaxed italic opacity-80">
                  Cấu hình các kênh liên lạc đến Tài xế. Khuyến nghị bật số SMS Fallback để đảm bảo tài xế nhận được đơn khi vào khu vực sóng 3G/4G yếu.
                </p>
             </div>

             <div className="space-y-6">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Các kênh phân phối</h4>
                <div className="space-y-3">
                   <div className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[30px]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500"><AppWindow size={20}/></div>
                        <div>
                           <p className="text-sm font-black text-gray-900">Push notification (Firebase FCM)</p>
                           <p className="text-[10px] font-bold text-gray-400 tracking-tight">Thông báo trực tiếp qua App.</p>
                        </div>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                      </div>
                   </div>
                   <div className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[30px]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 font-sans font-black tracking-tighter italic">SMS</div>
                        <div>
                           <p className="text-sm font-black text-gray-900">Tin nhắn SMS</p>
                           <p className="text-[10px] font-bold text-gray-400 tracking-tight">Gửi tin nhắn SMS khi tài xế offline.</p>
                        </div>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                      </div>
                   </div>
                </div>

                <div className="space-y-3 pt-4">
                   <h4 className="text-xs font-black text-gray-700 ml-4 italic">Mẫu tin nhắn tự động</h4>
                   <textarea 
                     rows="3"
                     className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[30px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-gray-700 leading-relaxed"
                     defaultValue="[CUUHO.VN] Bạn có 1 đơn cứu hộ mới: Mã {incident_id} tại {location}. Vui lòng mở App để xác nhận."
                   />
                </div>
             </div>
          </div>
        );

      case 'ALGO':
        return (
          <div className="space-y-10 animate-fade-in px-4">
             <div className="space-y-1">
                <h3 className="text-lg font-black text-gray-900">Cấu hình thuật toán Auto-Assign</h3>
                <p className="text-sm font-medium text-gray-400">Thay đổi và được áp dụng trên toàn bộ hệ thống.</p>
             </div>

             <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-50 flex items-start gap-4">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-blue-800 leading-relaxed italic opacity-80 font-sans">
                   Các tham số dưới đây sẽ điều khiển logic của Worker Poll Queue. Hãy cẩn trọng khi thay đổi vì nó ảnh hưởng trực tiếp đến thời gian phản hồi của ứng dụng.
                </p>
             </div>

             <div className="space-y-10">
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                     <h4 className="text-sm font-black text-gray-900 italic tracking-tight">Cấu hình quét vị trí</h4>
                     <span className="text-xs font-black text-blue-600">5km</span>
                   </div>
                   <div className="relative h-2 w-full bg-gray-100 rounded-full">
                      <div className="absolute h-full w-[40%] bg-blue-600 rounded-full" />
                      <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full cursor-pointer shadow-md" />
                   </div>
                   <p className="text-[10px] text-gray-400 font-bold tracking-tight">Hệ thống sẽ chỉ tìm kiếm các đối tác nằm trong bán kính này khi bắt đầu sự cố.</p>
                </div>

                <div className="space-y-4">
                    <h4 className="text-sm font-black text-gray-900 italic tracking-tight">Chế độ mở rộng bán kính (Fallback)</h4>
                    <select className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-gray-700 outline-none appearance-none cursor-pointer">
                       <option>Tự động +2km nếu không tìm thấy sau 3 lần</option>
                       <option>Không mở rộng</option>
                    </select>
                </div>

                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                     <h4 className="text-sm font-black text-gray-900 italic tracking-tight">Cấu hình Timeout & Phân công</h4>
                     <span className="text-xs font-black text-blue-600">60s</span>
                   </div>
                   <div className="relative h-2 w-full bg-gray-100 rounded-full">
                      <div className="absolute h-full w-[60%] bg-blue-600 rounded-full" />
                      <div className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full cursor-pointer shadow-md" />
                   </div>
                   <p className="text-[10px] text-gray-400 font-bold tracking-tight italic">Thời gian giới hạn cho mỗi đối tác để phản hồi (Chấp nhận/Từ chối) trước khi chuyển cho đối tác khác.</p>
                </div>
             </div>
          </div>
        );

      case 'SECURITY':
        return (
          <div className="space-y-10 animate-fade-in px-4">
             <div className="space-y-1">
                <h3 className="text-lg font-black text-gray-900">Bảo mật & Giới hạn API</h3>
                <p className="text-sm font-medium text-gray-400">Thay đổi và được áp dụng trên toàn bộ hệ thống.</p>
             </div>

             <div className="space-y-8">
                <div className="space-y-4">
                   <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Chính sách truy cập</h4>
                   <div className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[30px]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500"><ShieldCheck size={20}/></div>
                        <div>
                           <p className="text-sm font-black text-gray-900">Bắt buộc xác thực 2 lớp (2FA)</p>
                           <p className="text-[10px] font-bold text-gray-400 tracking-tight">Áp dụng cho tài khoản ADMIN và DISPATCHER.</p>
                        </div>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                      </div>
                   </div>
                </div>

                <div className="space-y-2 max-w-xs">
                   <label className="text-sm font-black text-gray-700 ml-1">JWT Session Timeout (Phút)</label>
                   <input type="number" defaultValue="120" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-center font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                   <p className="text-[10px] text-gray-400 font-bold ml-1 italic italic">Tự động đăng xuất Điều phối viên nếu không thao tác sau X phút.</p>
                </div>

                <div className="space-y-4 pt-4">
                   <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Giới hạn API (Rate Limiting)</h4>
                   <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-[10px] font-bold text-orange-700 leading-normal">
                      Tính năng này giúp chống người dùng spam hoặc các cuộc tấn công DDoS quy mô nhỏ.
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Max Request (App User)</label>
                         <input type="number" defaultValue="100" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-center font-black text-gray-900" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Cửa sổ phút (WindowMin)</label>
                        <div className="relative">
                          <input type="number" defaultValue="15" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-center font-black text-gray-900" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 italic">phút</span>
                        </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        );

      case 'BACKUP':
      default:
        return (
          <div className="space-y-10 animate-fade-in px-4">
             <div className="space-y-1 text-left">
                <h3 className="text-lg font-black text-gray-900">Sao lưu & Khôi phục</h3>
                <p className="text-sm font-medium text-gray-400">Theo dõi và được áp dụng trên toàn bộ hệ thống.</p>
             </div>

             <div className="bg-[#1e293b] p-8 rounded-[30px] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-1000" />
                <div className="relative flex items-center justify-between">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 shadow-inner">
                         <DbIcon size={28} />
                      </div>
                      <div className="text-left">
                         <h4 className="text-white font-black text-lg tracking-tight">MongoDB Atlas (Cluster 0)</h4>
                         <div className="flex items-center gap-4 mt-1 opacity-70">
                            <span className="flex items-center gap-2 text-[11px] font-bold text-gray-400 italic">
                               <CircleDot size={8} className="text-emerald-500 fill-emerald-500 animate-pulse" />
                               Lưu trữ: 1.2GB/5GB
                            </span>
                            <span className="text-[11px] font-bold text-gray-400 italic">Cập nhật cuối: 5 phút trước</span>
                         </div>
                      </div>
                   </div>
                   <button className="px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[11px] font-black text-white transition-all shadow-lg shadow-blue-900/40 active:scale-95">
                      Backup ngay
                   </button>
                </div>
             </div>

             <div className="space-y-6">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Lịch trình Tự động (Auto-Backup)</h4>
                <div className="bg-white border border-gray-100 rounded-[30px] p-8 flex items-center justify-between">
                   <div className="text-left">
                      <p className="text-sm font-black text-gray-900 mb-1">Bật sao lưu tự động hàng ngày</p>
                      <p className="text-[11px] font-medium text-gray-400 leading-relaxed italic opacity-80">
                         Dữ liệu sẽ được đóng và tải lên AWS S3 Bucket<br/>lúc 03:00 AM.
                      </p>
                   </div>
                   <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-16 h-9 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4">
                   <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4 italic">Chính sách lưu giữ (Retention)</label>
                      <div className="relative">
                         <select className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-gray-700 outline-none appearance-none cursor-pointer">
                            <option>Giữ lại 7 ngày gần nhất</option>
                            <option>Giữ lại 30 ngày gần nhất</option>
                         </select>
                         <ChevronRight size={16} className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400" />
                      </div>
                   </div>
                   <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4 italic group-hover:text-blue-500 transition-colors">Dọn dẹp Log hệ thống</label>
                      <div className="relative">
                         <select className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-gray-700 outline-none appearance-none cursor-pointer">
                            <option>Xoá log cũ hơn 3 tháng</option>
                            <option>Xoá log cũ hơn 6 tháng</option>
                         </select>
                         <ChevronRight size={16} className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400" />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col pt-2 animate-fade-in relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Cài đặt chung</h2>
          <p className="text-sm text-gray-500 font-medium font-sans italic opacity-70">Báo cáo hệ thống</p>
        </div>
        <div className="flex items-center gap-4">
           <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-black text-gray-700 hover:bg-gray-50 transition-all shadow-sm active:scale-95">
             <Download size={18} />
             Xuất báo cáo (.csv)
           </button>
           <div className="w-10 h-10 rounded-full border border-gray-200 overflow-hidden shrink-0 shadow-sm">
              <img src="https://ui-avatars.com/api/?name=AD&background=1f2937&color=fff" alt="User" />
           </div>
        </div>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
         {/* Sidebar Navigation */}
         <div className="w-80 bg-white border border-gray-100 rounded-[40px] p-6 shadow-sm flex flex-col overflow-hidden shrink-0">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-6 pt-4">Cài đặt</h3>
            <div className="space-y-2 flex-1 overflow-y-auto pr-2">
               {CATEGORIES.map(cat => {
                 const Icon = cat.icon;
                 const isActive = activeTab === cat.id;
                 return (
                   <button 
                    key={cat.id} 
                    onClick={() => setActiveTab(cat.id)}
                    className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-300 group ${isActive ? 'bg-blue-50/50 text-blue-600 shadow-sm' : 'hover:bg-gray-50 text-gray-500 hover:text-gray-900'}`}
                   >
                     <Icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-900'} />
                     <span className={`text-[13px] ${isActive ? 'font-black' : 'font-bold'}`}>{cat.name}</span>
                   </button>
                 );
               })}
            </div>
         </div>

         {/* Detail Pane */}
         <div className="flex-1 bg-white border border-gray-100 rounded-[40px] shadow-sm relative overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
               {renderContent()}
            </div>
            
            <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex justify-end">
               <button className="px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-sm font-black text-white transition-all shadow-xl shadow-blue-200 active:scale-95 font-sans italic overflow-hidden group relative">
                  <span className="relative z-10">Lưu thay đổi</span>
                  <div className="absolute inset-0 bg-white/10 group-active:bg-transparent transition-colors" />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
