import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  X, 
  Users,
  MapPin, 
  FileText, 
  CheckCircle2, 
  Briefcase,
  Trash2,
  Eye,
  Slash,
  History,
  Shield
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { adminAPI } from '../../services/api';

const STATUS_CONFIG = {
  AVAILABLE: { label: 'Đang hoạt động', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  BUSY: { label: 'Đang làm việc', cls: 'bg-orange-50 text-orange-600 border-orange-100' },
  OFFLINE: { label: 'Ngoại tuyến', cls: 'bg-gray-50 text-gray-500 border-gray-100' },
  SUSPENDED: { label: 'Đang đình chỉ', cls: 'bg-pink-50 text-pink-600 border-pink-100' },
};

// --- Sub-components ---

function AddPartnerModal({ onClose, onSucceed }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [zone, setZone] = useState('Cầu Giấy');
  const [capability, setCapability] = useState('Xe Cẩu Kéo / Sàn Trượt');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contact || contact.length < 9) {
      alert('Hotline không hợp lệ'); return;
    }
    try {
      setLoading(true);
      const code = 'RES-' + Math.floor(1000 + Math.random() * 9000);
      await adminAPI.createRescueTeam({
        name,
        code,
        type: 'MULTI',
        zone,
        capabilities: [capability],
        coordinates: [105.8412, 21.0245] // Default Hanoi
      });
      onSucceed();
    } catch(err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi tạo đối tác');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl relative animate-slide-up overflow-hidden">
        <div className="p-8 pb-4 flex justify-between items-center">
           <div>
              <h3 className="text-xl font-black text-gray-900">Thêm đối tác cứu hộ mới</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">Nhập thông tin cơ bản để tạo hồ sơ</p>
           </div>
           <button type="button" onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <form className="p-8 pt-4 space-y-5" onSubmit={handleSubmit}>
           <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 ml-1">Tên doanh nghiệp / Trung tâm cứu hộ *</label>
              <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Vd: Gara Ô tô Thành Đạt" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Mã đội (Tự sinh)</label>
                 <input type="text" value="RES-XXXX" disabled className="w-full px-5 py-3.5 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-gray-400 cursor-not-allowed"/>
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Hotline doanh nghiệp *</label>
                 <input type="text" value={contact} onChange={e=>setContact(e.target.value)} placeholder="0911..." className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Khu vực phụ trách *</label>
                 <select value={zone} onChange={e=>setZone(e.target.value)} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all appearance-none cursor-pointer">
                    <option>Cầu Giấy</option>
                    <option>Đống Đa</option>
                    <option>Hoàn Kiếm</option>
                    <option>Thanh Xuân</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Năng lực chính *</label>
                 <select value={capability} onChange={e=>setCapability(e.target.value)} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all appearance-none cursor-pointer">
                    <option>Xe Cẩu Kéo / Sàn Trượt</option>
                    <option>Cứu hộ lốp</option>
                    <option>Cứu hộ ắc quy</option>
                 </select>
              </div>
           </div>

           <div className="p-4 bg-blue-50 rounded-2xl flex items-start gap-3 border border-blue-100">
              <CheckCircle2 size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                Hồ sơ đối tác sẽ được lưu vào hệ thống. Bạn có thể cấp tài khoản cho nhân sự sau khi tạo thành công.
              </p>
           </div>

           <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-50 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all">Huỷ bỏ</button>
              <button disabled={loading} type="submit" className="flex-1 py-4 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:bg-blue-400">
                 {loading ? 'Đang tạo...' : 'Đẩy lên hệ thống'}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}

function AddPersonnelModal({ onClose, teamId, teamName, onSucceed }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Lái chính');
  const [loading, setLoading] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      alert('Số điện thoại không hợp lệ'); return;
    }
    try {
       setLoading(true);
       const res = await adminAPI.createRescueMember({
          name, phone, email: `${phone}@cuuho.vn`, teamId, memberRole: role === 'Lái chính' ? 'LEADER' : 'MEMBER'
       });
       setCreatedInfo(res.data.data);
       onSucceed(); // Tell AppContext to refresh teams
    } catch(err) {
       alert(err.response?.data?.message || 'Có lỗi khi thêm nhân sự');
    } finally {
       setLoading(false);
    }
  };

  if (createdInfo) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
        <div className="bg-white rounded-[40px] p-12 w-full max-w-sm text-center shadow-2xl animate-scale-in">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">Thêm tài xế thành công!</h3>
          <p className="text-sm text-gray-500 mb-8">Tài xế đã được gắn vào <b>{createdInfo.teamName}</b></p>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left mb-6">
            <p className="text-xs font-bold text-gray-400 mb-1">Họ tên</p>
            <p className="text-sm font-black text-gray-900 mb-4">{createdInfo.name}</p>
            <p className="text-xs font-bold text-gray-400 mb-1">Mật khẩu tạm thời mở App Mobile</p>
            <p className="text-xl font-black text-blue-600 tracking-widest">{createdInfo.defaultPassword}</p>
          </div>
          <button type="button" onClick={onClose} className="w-full py-4 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all">Đóng</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl relative animate-slide-up overflow-hidden">
        <div className="p-8 pb-4 flex justify-between items-center">
           <div>
              <h3 className="text-xl font-black text-gray-900">Thêm nhân sự mới</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">Thêm vào đội: <span className="text-blue-600">{teamName}</span></p>
           </div>
           <button type="button" onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <form className="p-8 pt-4 space-y-6" onSubmit={handleSubmit}>
           <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 ml-1">Họ và tên *</label>
              <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nhập tên nhân sự" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Số điện thoại *</label>
                 <input type="text" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0913..." className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Vai trò trong đội *</label>
                 <select value={role} onChange={e=>setRole(e.target.value)} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all appearance-none cursor-pointer">
                    <option>Lái chính</option>
                    <option>Phụ xe</option>
                 </select>
              </div>
           </div>

           <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 ml-1">Mật khẩu mặc định</label>
              <input type="text" value="CuuHo@[4 số cuối SDT]" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black text-gray-900" readOnly/>
              <p className="text-[10px] text-gray-400 ml-1 italic">Tài xế sẽ dùng SĐT và Pass này để đăng nhập App Mobile.</p>
           </div>

           <div className="flex gap-4 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-50 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all">Huỷ bỏ</button>
              <button disabled={loading} type="submit" className="flex-1 py-4 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:bg-blue-400">
                 {loading ? 'Đang gọi API...' : 'Đẩy lên hệ thống'}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}

function HistoryModal({ onClose, teamId, teamName }) {
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    adminAPI.getPartnerHistory(teamId).then(res => {
      if (isMounted) {
        setHistory(res.data.data);
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) setLoading(false);
    });
    return () => isMounted = false;
  }, [teamId]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
      <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl relative animate-slide-up flex flex-col max-h-[85vh]">
        <div className="p-8 pb-4 flex justify-between items-center border-b border-gray-50 flex-shrink-0">
           <div>
              <h3 className="text-xl font-black text-gray-900">Lịch sử hoạt động</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">Đội: <span className="text-blue-600">{teamName}</span></p>
           </div>
           <button type="button" onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto flex-1">
          {loading ? (
             <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 flex border-4 border-t-transparent border-blue-500 rounded-full"/></div>
          ) : history.length === 0 ? (
             <p className="text-center text-gray-400 font-medium italic p-8">Chưa có lịch sử xử lý sự cố nào.</p>
          ) : (
            <div className="space-y-4">
               {history.map(inc => (
                 <div key={inc._id} className="p-5 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col gap-2 relative">
                   <div className="flex justify-between items-start">
                     <p className="text-sm font-black text-gray-900">Mã ca: {inc.code || '...'}</p>
                     <span className={`px-2 py-1 text-[10px] font-black rounded ${inc.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                        {inc.status}
                     </span>
                   </div>
                   <p className="text-xs text-gray-600">Loại: <b>{inc.type}</b></p>
                   <p className="text-xs text-gray-500">Vị trí: {inc.location?.address || 'Chưa rõ'}</p>
                   <p className="text-[10px] text-gray-400 mt-2">Ghi nhận: {new Date(inc.createdAt).toLocaleString('vi-VN')} {inc.completedAt ? `• Hoàn thành: ${new Date(inc.completedAt).toLocaleString('vi-VN')}` : ''}</p>
                 </div>
               ))}
            </div>
          )}
        </div>
        
        <div className="p-5 border-t border-gray-50 flex justify-end">
          <button type="button" onClick={onClose} className="px-6 py-3 bg-gray-100 rounded-xl text-sm font-black text-gray-600 hover:bg-gray-200 transition-all">Đóng</button>
        </div>
      </div>
    </div>
  );
}

function DummyPDFViewer({ onClose, title }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[200] p-4">
      <div className="bg-[#1e1e1e] rounded-[24px] w-full max-w-4xl shadow-2xl relative animate-scale-in flex flex-col h-[80vh] overflow-hidden border border-gray-800">
        <div className="p-4 bg-[#2d2d2d] border-b border-black flex justify-between items-center shadow-md z-10">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center"><FileText size={16}/></div>
              <h3 className="text-sm font-bold text-gray-200">{title}</h3>
           </div>
           <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 bg-[#323639] flex flex-col items-center overflow-y-auto p-8 relative">
           <div className="bg-white w-full max-w-2xl min-h-[800px] shadow-2xl mb-8 flex flex-col items-center justify-center relative select-none">
              <div className="absolute inset-0 opacity-5 flex flex-wrap justify-center items-center pointer-events-none overflow-hidden">
                 {Array.from({length: 20}).map((_, i) => <span key={i} className="text-4xl font-black transform -rotate-45 m-4">SAMPLE</span>)}
              </div>
              <Shield size={64} className="text-blue-200 mb-6" />
              <h1 className="text-3xl font-black text-gray-800 border-b-4 border-blue-600 pb-2 mb-4">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
              <h2 className="text-xl font-bold text-gray-600 mb-12">Độc lập - Tự do - Hạnh phúc</h2>
              <div className="text-center space-y-4">
                 <h3 className="text-2xl font-black text-red-600 mb-6 uppercase">Giấy chứng nhận đăng ký doanh nghiệp</h3>
                 <p className="text-gray-500">Mã số doanh nghiệp: <strong>0101234567</strong></p>
                 <p className="text-gray-500">Đăng ký lần đầu: ngày 12 tháng 02 năm 2026</p>
                 <p className="text-gray-500 mt-8 italic">(Bản sao điện tử phục vụ mục đích thẩm định Hệ thống Cứu hộ Giao thông)</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function Teams() {
  const { teams, fetchTeams } = useApp();
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [modal, setModal] = useState(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [activeTabPanel, setActiveTabPanel] = useState('INFO');
  const [historyModalPartner, setHistoryModalPartner] = useState(null);
  const [pdfTitle, setPdfTitle] = useState(null);

  const handleToggleSuspend = async (e, id, currentStatus) => {
    e.stopPropagation();
    const action = currentStatus === 'SUSPENDED' ? 'kích hoạt lại' : 'đình chỉ';
    if(window.confirm(`Xác nhận ${action} đội cứu hộ này?`)) {
       try {
          await adminAPI.toggleSuspendTeam(id);
          fetchTeams();
          setActiveMenu(null);
       } catch(err) {
          alert(err.response?.data?.message || 'Không thể thực hiện thao tác.');
       }
    }
  };

  const handleDeleteTeam = async (e, id) => {
    e.stopPropagation();
    if(window.confirm('Hành động này không thể hoàn tác. Xác nhận xóa đội cứu hộ?')) {
       try {
          await adminAPI.deleteRescueTeam(id);
          fetchTeams();
          setActiveMenu(null);
       } catch(err) {
          alert(err.response?.data?.message || 'Đội đang xử lý sự cố, không thể xóa.');
       }
    }
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return teams.filter(p => 
      (p.name || '').toLowerCase().includes(s) || 
      (p.code || '').toLowerCase().includes(s) || 
      (p.zone || p.area || '').toLowerCase().includes(s)
    );
  }, [teams, search]);

  const selectedPartner = useMemo(() => teams.find(t => t._id === selectedPartnerId), [teams, selectedPartnerId]);

  const handleExportCSV = () => {
    const headers = ['Mã đội', 'Tên đội', 'Liên hệ', 'Khu vực', 'Phương tiện', 'Trạng thái'];
    const rows = filtered.map(p => [
      p.code || '',
      p.name || '',
      p.contact || '',
      p.zone || p.area || '',
      p.capabilities?.length > 0 ? p.capabilities.join(', ') : (p.vehicle || ''),
      STATUS_CONFIG[p.status]?.label || p.status
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
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Quản lý đối tác cứu hộ</h2>
          <p className="text-sm text-gray-500 font-medium font-sans italic opacity-70">Trung tâm điều hành Đội cứu hộ (Live)</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={handleExportCSV}
             className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
           >
              <Download size={18} />
              Xuất báo cáo (.csv)
           </button>
           <div className="w-10 h-10 rounded-full border border-gray-200 overflow-hidden shrink-0 shadow-sm">
              <img src="https://ui-avatars.com/api/?name=AD&background=1f2937&color=fff" alt="User" />
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm flex-1 flex flex-col overflow-hidden">
         
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

         <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-gray-50 text-[11px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/30">
                     <th className="px-6 py-4 w-16">STT</th>
                     <th className="px-6 py-4">Đối tác cứu hộ</th>
                     <th className="px-6 py-4">Liên hệ & Khu vực</th>
                     <th className="px-6 py-4">Năng lực chính</th>
                     <th className="px-6 py-4">Đánh giá</th>
                     <th className="px-6 py-4">Trạng thái</th>
                     <th className="px-6 py-4 text-center">Thao tác</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 && (
                     <tr><td colSpan="7" className="text-center py-10 text-gray-400 text-sm font-bold">Không tìm thấy kết quả</td></tr>
                  )}
                  {filtered.map((item, idx) => {
                     const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.OFFLINE;
                     return (
                        <tr 
                          key={item._id || item.id} 
                          className="group hover:bg-gray-50/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedPartnerId(item._id || item.id)}
                        >
                           <td className="px-6 py-5 text-sm font-bold text-gray-400 italic">
                             {(idx + 1).toString().padStart(2, '0')}
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                 <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200 shadow-sm">
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`} alt="Avatar"/>
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-sm font-black text-gray-900 truncate group-hover:text-blue-600 transition-colors">{item.name}</p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{item.code}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <p className="text-sm font-black text-gray-700">{item.zone || item.area || 'Chưa gán'}</p>
                              <p className="text-[11px] font-medium text-gray-400 mt-0.5">{item.contact || 'Không có'}</p>
                           </td>
                           <td className="px-6 py-5 text-sm font-bold text-gray-600">
                              {item.capabilities?.length > 0 ? item.capabilities.join(', ') : (item.vehicle || 'Chưa rõ')}
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-1.5 text-sm font-black text-gray-900 bg-gray-50 w-max px-2.5 py-1 rounded-full border border-gray-100 shadow-sm">
                                 {item.rating || '4.5'}
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${status.cls}`}>
                                 {status.label}
                              </span>
                           </td>
                           <td className="px-6 py-5 text-center relative">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === (item._id || item.id) ? null : (item._id || item.id)); }}
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition-all border border-transparent hover:border-gray-200"
                              >
                                 <MoreVertical size={18} />
                              </button>
                              
                              {activeMenu === (item._id || item.id) && (
                                 <>
                                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }} />
                                    <div className="absolute right-6 top-14 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-slide-up" onClick={(e) => e.stopPropagation()}>
                                       <button 
                                         onClick={() => { setSelectedPartnerId(item._id || item.id); setActiveMenu(null); }}
                                         className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                       >
                                          <Eye size={16} className="text-blue-500" /> Xem chi tiết
                                       </button>
                                       <button 
                                         onClick={(e) => handleToggleSuspend(e, item._id || item.id, item.status)}
                                         className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                       >
                                          <Slash size={16} className={item.status === 'SUSPENDED' ? 'text-green-500' : 'text-orange-500'} /> 
                                          {item.status === 'SUSPENDED' ? 'Kích hoạt lại' : 'Ngừng hoạt động'}
                                       </button>
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setHistoryModalPartner(item); }}
                                         className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                       >
                                          <History size={16} className="text-purple-500" /> Lịch sử hoạt động
                                       </button>
                                       <div className="h-px bg-gray-50 my-1 mx-2"/>
                                       <button 
                                         onClick={(e) => handleDeleteTeam(e, item._id || item.id)}
                                         className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3"
                                       >
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
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[60]" onClick={() => setSelectedPartnerId(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-[550px] bg-white z-[70] shadow-[-20px_0_40px_rgba(0,0,0,0.05)] animate-slide-left flex flex-col">
              
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
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${STATUS_CONFIG[selectedPartner.status]?.cls || 'bg-gray-50 text-gray-400'}`}>
                       {STATUS_CONFIG[selectedPartner.status]?.label || selectedPartner.status}
                    </span>
                    <button onClick={() => setSelectedPartnerId(null)} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200 shadow-sm"><X size={18} /></button>
                 </div>
              </div>

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
                                     {selectedPartner.zone || selectedPartner.area || 'Chưa gán'}
                                     <MapPin size={14} className="text-gray-400" />
                                  </div>
                               </div>
                               <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-gray-500">Năng lực chính</label>
                                  <input type="text" value={selectedPartner.capabilities?.length > 0 ? selectedPartner.capabilities.join(', ') : (selectedPartner.vehicle || 'Chưa rõ')} readOnly className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-800 focus:outline-none"/>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="p-5 rounded-[24px] bg-gray-50 border border-gray-100 shadow-sm">
                         <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-blue-500 shadow-sm"><FileText size={20}/></div>
                                <div>
                                   <p className="text-sm font-black text-gray-900">Giấy phép đăng ký kinh doanh</p>
                                   <p className="text-[10px] font-bold text-gray-400">PDF • 1.2 MB. Tải lên 12/02/2026</p>
                                </div>
                             </div>
                             <button 
                               onClick={() => setPdfTitle(`GPDKKD_${selectedPartner.code}.pdf`)} 
                               className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-600 hover:bg-gray-100 transition-all shadow-sm"
                             >
                               Xem tệp
                             </button>
                         </div>
                      </div>

                      <div className="flex pt-6 border-t border-gray-50">
                         <button className="w-full py-4 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Cập nhật hồ sơ</button>
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-2 relative h-full flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                         <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Nhân sự ({selectedPartner.members?.length || 0})</h4>
                         <button 
                           onClick={() => setModal('ADD_MEMBER')}
                           className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-black hover:bg-blue-100 transition-all shadow-sm"
                         >
                            <Plus size={14} /> Thêm mới
                         </button>
                      </div>

                      <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-2xl shadow-sm">
                         <table className="w-full text-left border-collapse">
                            <thead>
                               <tr className="border-b border-gray-50 text-[11px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                                  <th className="px-5 py-3">Tên & ID</th>
                                  <th className="px-5 py-3">SĐT</th>
                                  <th className="px-5 py-3">Vai trò</th>
                                  <th className="px-5 py-3 text-right">App Status</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                               {selectedPartner.members?.map((member, idx) => {
                                  const memberName = member.name || member.userId?.name || 'Vô danh';
                                  const memberId = member.userId?._id?.slice(-4) || member.id || '...';
                                  const memberPhone = member.phone || member.userId?.phone || 'Chưa có';
                                  const isOnline = member.online || member.userId?.availabilityStatus === 'ONLINE';
                                  
                                  return (
                                     <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                           <p className="text-sm font-black text-gray-900">{memberName}</p>
                                           <div className="flex items-center gap-1 mt-0.5">
                                             <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1 rounded">Mã: {memberId}</span>
                                           </div>
                                        </td>
                                        <td className="px-5 py-4 text-xs font-bold text-gray-600">{memberPhone}</td>
                                        <td className="px-5 py-4">
                                           <span className="text-[11px] font-black text-gray-700 bg-gray-100 px-2 py-1 rounded inline-block">
                                              {member.role || 'Thành viên'}
                                           </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                           <div className="flex items-center justify-end gap-1.5">
                                              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                                              <span className={`text-[10px] font-bold ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                                                 {isOnline ? 'Online' : 'Offline'}
                                              </span>
                                           </div>
                                        </td>
                                     </tr>
                                  );
                               })}
                               {(!selectedPartner.members || selectedPartner.members.length === 0) && (
                                  <tr>
                                    <td colSpan="4" className="text-center py-8 text-xs text-gray-400 font-medium italic">Chưa có nhân viên trực thuộc</td>
                                  </tr>
                               )}
                            </tbody>
                          </table>
                      </div>

                      <div className="mt-8 p-5 bg-blue-50/50 rounded-2xl border border-dashed border-blue-200">
                         <p className="text-[11px] text-blue-700 text-center font-medium leading-relaxed italic">
                           Hệ thống điều phối sẽ quét tọa độ của tài xế đang Online để phân công sự cố một cách tối ưu nhất.
                         </p>
                      </div>
                   </div>
                 )}
              </div>
          </div>
        </>
      )}

      {modal === 'ADD_PARTNER' && (
        <AddPartnerModal 
          onClose={() => setModal(null)} 
          onSucceed={() => { fetchTeams(); setModal(null); }}
        />
      )}
      
      {modal === 'ADD_MEMBER' && (
        <AddPersonnelModal 
          onClose={() => setModal(null)} 
          teamId={selectedPartner?._id}
          teamName={selectedPartner?.name}
          onSucceed={() => { fetchTeams(); }}
        />
      )}

      {historyModalPartner && (
        <HistoryModal 
          onClose={() => setHistoryModalPartner(null)} 
          teamId={historyModalPartner._id || historyModalPartner.id}
          teamName={historyModalPartner.name}
        />
      )}

      {pdfTitle && (
        <DummyPDFViewer onClose={() => setPdfTitle(null)} title={pdfTitle} />
      )}

    </div>
  );
}
