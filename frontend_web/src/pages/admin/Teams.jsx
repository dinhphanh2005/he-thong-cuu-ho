import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  ChevronRight, 
  X, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  Briefcase,
  Trash2,
  Eye,
  Slash,
  History
} from 'lucide-react';

// --- MOCK DATA ---
const INITIAL_PARTNERS = [
  {
    _id: '1',
    code: '0001',
    name: 'Đội cứu hộ 1',
    contact: '0123456789',
    area: 'Đống Đa',
    vehicle: 'Sàn trượt',
    rating: '4.9/5.0',
    status: 'ACTIVE', // ACTIVE, PENDING, APPROVING, SUSPENDED
    personnelCount: 5,
    members: [
      { id: '0001', name: 'Nhân sự 1', phone: '0907654567', role: 'Lái chính', online: true },
      { id: '0002', name: 'Nhân sự 2', phone: '0937654567', role: 'Phụ xe', online: true },
    ]
  },
  {
    _id: '2',
    code: '0002',
    name: 'Đội cứu hộ 2',
    contact: '0123456789',
    area: 'Cầu Giấy',
    vehicle: 'Cứu hộ lốp',
    rating: '0',
    status: 'APPROVING',
    personnelCount: 0,
    members: []
  },
  {
    _id: '3',
    code: '0003',
    name: 'Đội cứu hộ 3',
    contact: '0123456789',
    area: 'Hoàn Kiếm',
    vehicle: 'Cẩu kéo',
    rating: '4.0/5.0',
    status: 'SUSPENDED',
    personnelCount: 8,
    members: []
  }
];

const STATUS_CONFIG = {
  ACTIVE: { label: 'Đang hoạt động', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  PENDING: { label: 'Chờ duyệt hồ sơ', cls: 'bg-orange-50 text-orange-600 border-orange-100' },
  APPROVING: { label: 'Phê duyệt', cls: 'bg-blue-50 text-blue-600 border-blue-100' },
  SUSPENDED: { label: 'Đang đình chỉ', cls: 'bg-pink-50 text-pink-600 border-pink-100' },
};

// --- Sub-components ---

function SuccessModal({ title, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[32px] p-10 w-full max-w-sm text-center shadow-2xl animate-scale-in">
        <h3 className="text-xl font-black text-gray-900 mb-6">{title}</h3>
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-200">
           <CheckCircle2 size={40} className="text-white" />
        </div>
        <button 
          onClick={onClose}
          className="w-full py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black text-gray-600 hover:bg-gray-100 transition-all"
        >
          Thoát
        </button>
      </div>
    </div>
  );
}

function AddPartnerModal({ onClose, onSucceed }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl relative animate-slide-up overflow-hidden">
        <div className="p-8 pb-4 flex justify-between items-center">
           <div>
              <h3 className="text-xl font-black text-gray-900">Thêm đối tác cứu hộ mới</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">Nhập thông tin cơ bản để tạo hồ sơ</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <form className="p-8 pt-4 space-y-5" onSubmit={(e) => { e.preventDefault(); onSucceed(); }}>
           <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 ml-1">Tên doanh nghiệp / Trung tâm cứu hộ *</label>
              <input type="text" placeholder="Vd: Gara Ô tô Thành Đạt" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Mã đội (Tự sinh)</label>
                 <input type="text" value="0001" disabled className="w-full px-5 py-3.5 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-gray-400 cursor-not-allowed"/>
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Hotline doanh nghiệp *</label>
                 <input type="text" placeholder="0911..." className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Khu vực phụ trách *</label>
                 <select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all appearance-none cursor-pointer">
                    <option>Cầu Giấy</option>
                    <option>Đống Đa</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Năng lực chính *</label>
                 <select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all appearance-none cursor-pointer">
                    <option>Xe Cẩu Kéo / Sàn Trượt</option>
                    <option>Cứu hộ lốp</option>
                 </select>
              </div>
           </div>

           <div className="p-4 bg-blue-50 rounded-2xl flex items-start gap-3 border border-blue-100">
              <CheckCircle2 size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                Hồ sơ đối tác sẽ được đưa vào trạng thái Chờ duyệt. Sau khi duyệt, bạn có thể cấp tài khoản cho từng nhân sự để họ tham gia vào đội này.
              </p>
           </div>

           <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-50 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all">Huỷ bỏ</button>
              <button type="submit" className="flex-1 py-4 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">Đẩy lên hệ thống</button>
           </div>
        </form>
      </div>
    </div>
  );
}

function AddPersonnelModal({ onClose, teamName, onSucceed }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl relative animate-slide-up overflow-hidden">
        <div className="p-8 pb-4 flex justify-between items-center">
           <div>
              <h3 className="text-xl font-black text-gray-900">Thêm nhân sự mới</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">Thêm vào đội: <span className="text-blue-600">{teamName}</span></p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <form className="p-8 pt-4 space-y-6" onSubmit={(e) => { e.preventDefault(); onSucceed(); }}>
           <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 ml-1">Họ và tên *</label>
              <input type="text" placeholder="Nhập tên nhân sự" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Số điện thoại *</label>
                 <input type="text" placeholder="02131..." className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Vai trò trong đội *</label>
                 <select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all appearance-none cursor-pointer">
                    <option>Lái chính</option>
                    <option>Phụ xe</option>
                 </select>
              </div>
           </div>

           <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 ml-1">Mật khẩu mặc định</label>
              <input type="text" value="cuuho123" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900" readOnly/>
              <p className="text-[10px] text-gray-400 ml-1 italic">Tài xế có thể đổi mật khẩu ngay trong Cài đặt của App Mobile.</p>
           </div>

           <div className="flex gap-4 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-50 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all">Huỷ bỏ</button>
              <button type="submit" className="flex-1 py-4 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">Đẩy lên hệ thống</button>
           </div>
        </form>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function Teams() {
  const [partners, setPartners] = useState(INITIAL_PARTNERS);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [modal, setModal] = useState(null); // 'ADD_PARTNER', 'ADD_MEMBER', 'SUCCESS_PARTNER', 'SUCCESS_MEMBER'
  const [activeTabPanel, setActiveTabPanel] = useState('INFO'); // INFO | PERSONNEL

  const filtered = useMemo(() => {
    return partners.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.code.includes(search) || 
      p.area.toLowerCase().includes(search.toLowerCase())
    );
  }, [partners, search]);

  const handleExportCSV = () => {
    const headers = ['Mã đội', 'Tên đội', 'Liên hệ', 'Khu vực', 'Phương tiện', 'Trạng thái'];
    const rows = filtered.map(p => [
      p.code,
      p.name,
      p.contact,
      p.area,
      p.vehicle,
      STATUS_CONFIG[p.status]?.label
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `danh_sach_doi_tac_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col pt-2 animate-fade-in relative overflow-hidden">
      
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Quản lý đối tác cứu hộ</h2>
          <p className="text-sm text-gray-500 font-medium">Báo cáo hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={handleExportCSV}
             className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
           >
              <Download size={18} />
              Xuất báo cáo (.csv)
           </button>
           <div className="relative group">
              <div className="absolute left-1/2 -bottom-10 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Admin Only</div>
              <img src="https://ui-avatars.com/api/?name=Admin&background=1f2937&color=fff" className="w-10 h-10 rounded-full border border-gray-200" alt="Avatar"/>
           </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm flex-1 flex flex-col overflow-hidden">
         
         {/* Table Toolbar */}
         <div className="p-6 border-b border-gray-50 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xl">
               <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="Tìm kiếm đối tác cứu hộ..."
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50/50 transition-all text-sm font-medium"
               />
            </div>
            <div className="flex items-center gap-3">
               <button className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-500 hover:bg-gray-50 transition-all shadow-sm"><Filter size={20}/></button>
               <button 
                 onClick={() => setModal('ADD_PARTNER')}
                 className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
               >
                  <Plus size={18} />
                  Thêm đối tác mới
               </button>
            </div>
         </div>

         {/* Table */}
         <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-gray-50 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                     <th className="px-6 py-4 w-16">STT</th>
                     <th className="px-6 py-4">Đối tác cứu hộ</th>
                     <th className="px-6 py-4">Liên hệ & Khu vực</th>
                     <th className="px-6 py-4">Phương tiện chính</th>
                     <th className="px-6 py-4">Đánh giá</th>
                     <th className="px-6 py-4">Trạng thái</th>
                     <th className="px-6 py-4 text-center">Thao tác</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {filtered.map((item, idx) => {
                     const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.ACTIVE;
                     return (
                        <tr key={item._id} className="group hover:bg-gray-50/50 transition-colors">
                           <td className="px-6 py-5 text-sm font-bold text-gray-400 italic">
                             {(idx + 1).toString().padStart(2, '0')}
                           </td>
                           <td className="px-6 py-5">
                              <div 
                                className="flex items-center gap-4 cursor-pointer" 
                                onClick={() => setSelectedPartner(item)}
                              >
                                 <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`} alt="Avatar"/>
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-sm font-black text-gray-900 truncate group-hover:text-blue-600 transition-colors">{item.name}</p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{item.code}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <p className="text-sm font-black text-gray-700">{item.area}</p>
                              <p className="text-[11px] font-medium text-gray-400 mt-0.5">{item.contact}</p>
                           </td>
                           <td className="px-6 py-5 text-sm font-bold text-gray-600">{item.vehicle}</td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-1.5 text-sm font-black text-gray-900 bg-gray-50 w-max px-2.5 py-1 rounded-full border border-gray-100">
                                 {item.rating}
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${status.cls}`}>
                                 {status.label}
                              </span>
                           </td>
                           <td className="px-6 py-5 text-center relative">
                              <button 
                                onClick={() => setActiveMenu(activeMenu === item._id ? null : item._id)}
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition-all border border-transparent hover:border-gray-200"
                              >
                                 <MoreVertical size={18} />
                              </button>
                              
                              {/* Action Menu */}
                              {activeMenu === item._id && (
                                 <>
                                    <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                                    <div className="absolute right-6 top-14 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-fade-in-down">
                                       <button className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                                          <Eye size={16} className="text-blue-500" /> Xem chi tiết
                                       </button>
                                       <button className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                                          <Slash size={16} className="text-orange-500" /> Ngừng hoạt động
                                       </button>
                                       <button className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                                          <History size={16} className="text-purple-500" /> Lịch sử hoạt động
                                       </button>
                                       <div className="h-px bg-gray-50 my-1 mx-2"/>
                                       <button className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3">
                                          <Trash2 size={16} /> Gỡ bỏ hồ sơ
                                       </button>
                                    </div>
                                 </>
                              )}
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {/* --- DETAILS SIDE PANEL --- */}
      {selectedPartner && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[60]" onClick={() => setSelectedPartner(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-[550px] bg-white z-[70] shadow-[-20px_0_40px_rgba(0,0,0,0.05)] animate-slide-left flex flex-col">
              {/* Profile Header */}
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden">
                       <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPartner.name)}&background=random`} alt="Avatar"/>
                    </div>
                    <div>
                       <h3 className="text-lg font-black text-gray-900">{selectedPartner.name}</h3>
                       <p className="text-xs font-bold text-gray-400 tracking-wide uppercase">Mã: {selectedPartner.code}</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border bg-emerald-50 text-emerald-600 border-emerald-100`}>Đang hoạt động</span>
                    <button onClick={() => setSelectedPartner(null)} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200 shadow-sm"><X size={18} /></button>
                 </div>
              </div>

              {/* Tabs */}
              <div className="flex px-6 pt-4 border-b border-gray-100">
                 <button 
                  onClick={() => setActiveTabPanel('INFO')}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-black transition-all border-b-2 ${activeTabPanel === 'INFO' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                 >
                    <Briefcase size={16} /> Thông tin tổ chức
                 </button>
                 <button 
                  onClick={() => setActiveTabPanel('PERSONNEL')}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-black transition-all border-b-2 ${activeTabPanel === 'PERSONNEL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                 >
                    <Users size={16} /> Quản lý nhân sự
                 </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8">
                 {activeTabPanel === 'INFO' ? (
                   <div className="space-y-8">
                      <div>
                         <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Hồ sơ Doanh nghiệp</h4>
                         <div className="space-y-4">
                            <div className="space-y-1.5">
                               <label className="text-xs font-bold text-gray-500">Tên doanh nghiệp</label>
                               <input type="text" value={selectedPartner.name} readOnly className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-800 focus:outline-none"/>
                            </div>
                            <div className="space-y-1.5">
                               <label className="text-xs font-bold text-gray-500">Hotline liên hệ</label>
                               <input type="text" value={selectedPartner.contact} readOnly className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-800 focus:outline-none"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-gray-500">Khu vực phụ trách</label>
                                  <div className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-800 flex items-center justify-between">
                                     {selectedPartner.area}
                                     <MapPin size={14} className="text-gray-400" />
                                  </div>
                               </div>
                               <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-gray-500">Năng lực chính</label>
                                  <input type="text" value={selectedPartner.vehicle} readOnly className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-800 focus:outline-none"/>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="p-5 rounded-[24px] bg-gray-50 border border-gray-100">
                         <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-blue-500 shadow-sm"><FileText size={20}/></div>
                                <div>
                                   <p className="text-sm font-black text-gray-900">Giấy phép đăng ký kinh doanh</p>
                                   <p className="text-[10px] font-bold text-gray-400">PDF • 1.2 MB. Tải lên 12/02/2026</p>
                                </div>
                             </div>
                             <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-600 hover:bg-gray-100 transition-all shadow-sm">Xem tệp đính kèm</button>
                         </div>
                      </div>

                      <div className="flex pt-6 border-t border-gray-50">
                         <button className="w-full py-4 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Lưu cập nhật hồ sơ</button>
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-2 relative h-full flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                         <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Nhân sự ({selectedPartner.members.length})</h4>
                         <button 
                           onClick={() => setModal('ADD_MEMBER')}
                           className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-black hover:bg-blue-100 transition-all"
                         >
                            <Plus size={14} /> Thêm nhân sự mới
                         </button>
                      </div>

                      <div className="space-y-3 flex-1">
                         {selectedPartner.members.map(member => (
                           <div key={member.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group hover:shadow-md hover:border-blue-100 transition-all">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 shrink-0 overflow-hidden relative">
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} alt="Avatar"/>
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${member.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                                 </div>
                                 <div>
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-black text-gray-400">Mã: {member.id}</span>
                                       <span className="text-[10px] font-bold text-gray-500 tracking-wider">• {member.phone}</span>
                                    </div>
                                    <p className="text-sm font-black text-gray-900">{member.name}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3 text-right">
                                 <div>
                                    <p className="text-[11px] font-black text-gray-700">{member.role}</p>
                                    <p className={`text-[10px] font-bold ${member.online ? 'text-green-500' : 'text-gray-400'}`}>
                                       {member.online ? '● Online' : '○ Offline'}
                                    </p>
                                 </div>
                                 <button className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                              </div>
                           </div>
                         ))}
                      </div>

                      <div className="mt-8 p-5 bg-blue-50/50 rounded-2xl border border-dashed border-blue-200">
                         <p className="text-[11px] text-blue-700 text-center font-medium leading-relaxed italic">
                           Mỗi nhân sự sử dụng Số điện thoại để đăng nhập vào ứng dụng dành cho nhân viên (App Mobile). Hệ thống Auto-Assign sẽ quét GPS của các tài xế đang ở trạng thái Online để điều phối sự cố.
                         </p>
                      </div>
                   </div>
                 )}
              </div>
          </div>
        </>
      )}

      {/* --- MODALS --- */}
      {modal === 'ADD_PARTNER' && (
        <AddPartnerModal 
          onClose={() => setModal(null)} 
          onSucceed={() => { setModal('SUCCESS_PARTNER'); }}
        />
      )}
      
      {modal === 'ADD_MEMBER' && (
        <AddPersonnelModal 
          onClose={() => setModal(null)} 
          teamName={selectedPartner?.name}
          onSucceed={() => { setModal('SUCCESS_MEMBER'); }}
        />
      )}

      {(modal === 'SUCCESS_PARTNER' || modal === 'SUCCESS_MEMBER') && (
        <SuccessModal 
          title={modal === 'SUCCESS_PARTNER' ? 'Tạo đối tác thành công' : 'Thêm nhân sự thành công'} 
          onClose={() => setModal(null)}
        />
      )}

    </div>
  );
}
