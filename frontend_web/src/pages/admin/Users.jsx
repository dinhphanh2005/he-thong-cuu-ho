import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  X, 
  UserPlus, 
  Shield, 
  Key, 
  Trash2, 
  FileEdit,
  CheckCircle2,
  Mail,
  UserCheck,
  Download,
  Phone
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { adminAPI } from '../../services/api';

const ROLE_CONFIG = {
  ADMIN: { label: 'Quản trị viên', badge: 'bg-purple-100 text-purple-600', icon: Shield },
  DISPATCHER: { label: 'Điều phối viên', badge: 'bg-blue-100 text-blue-600', icon: UserCheck },
  CITIZEN: { label: 'Người dân', badge: 'bg-gray-100 text-gray-500', icon: null },
  RESCUE: { label: 'Cứu hộ', badge: 'bg-orange-100 text-orange-600', icon: Plus },
};

function SuccessModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
      <div className="bg-white rounded-[40px] p-12 w-full max-w-sm text-center shadow-2xl animate-scale-in">
        <h3 className="text-xl font-black text-gray-900 mb-8">Thao tác thành công</h3>
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-10 shadow-lg shadow-emerald-200">
           <CheckCircle2 size={48} className="text-white" />
        </div>
        <button 
          onClick={onClose}
          className="w-full py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black text-gray-600 hover:bg-gray-100 transition-all shadow-sm"
        >
          Thoát
        </button>
      </div>
    </div>
  );
}

function AddUserModal({ onClose, onSucceed }) {
  const [role, setRole] = useState('DISPATCHER');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null); // hold {name, defaultPassword}

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Standard Vietnamese Phone Regex (Matching Backend: 03, 05, 07, 08, 09 + 8 digits)
    const phoneRegex = /^0[35789][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      alert('Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 chữ số (vd: 0912345678).');
      return;
    }
    try {
      setLoading(true);
      const res = await adminAPI.createDispatcher({ name, phone, email, role });
      setCreated(res.data.data); // { name, defaultPassword, role, ... }
      onSucceed(); // refresh list in parent
    } catch (err) {
      // Improved error feedback: Show specific field errors if available
      const errMsg = err.response?.data?.errors?.[0]?.message 
                  || err.response?.data?.message 
                  || 'Lỗi khi tạo nhân sự';
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Show success card with generated password
  if (created) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
        <div className="bg-white rounded-[40px] p-12 w-full max-w-sm text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">Tạo tài khoản thành công!</h3>
          <p className="text-sm text-gray-500 mb-8">Giao mật khẩu này cho nhân sự để đăng nhập lần đầu.</p>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left mb-6">
            <p className="text-xs font-bold text-gray-400 mb-1">Tên tài khoản</p>
            <p className="text-sm font-black text-gray-900 mb-4">{created.name}</p>
            <p className="text-xs font-bold text-gray-400 mb-1">Mật khẩu tạm thời</p>
            <p className="text-lg font-black text-blue-600 tracking-widest">{created.defaultPassword}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-4 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl relative animate-slide-up overflow-hidden">
        <div className="p-10 pb-4 flex justify-between items-center">
           <h3 className="text-xl font-black text-gray-900">Thêm tài khoản nội bộ</h3>
           <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        <form className="p-10 pt-4 space-y-8" onSubmit={handleSubmit}>
           <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 ml-1">Họ và tên *</label>
              <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nhập tên nhân sự" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Số điện thoại *</label>
                 <input type="text" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="09988..." className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Email nội bộ *</label>
                 <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="@cuuho.vn" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
              </div>
           </div>

           <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 ml-1">Phân quyền *</label>
              <div className="grid grid-cols-2 gap-4">
                 <button 
                  type="button"
                  onClick={() => setRole('DISPATCHER')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${role === 'DISPATCHER' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                 >
                    <div className="flex items-center gap-2 mb-1">
                       <UserCheck size={16} className={role === 'DISPATCHER' ? 'text-blue-600' : 'text-gray-400'} />
                       <span className={`text-sm font-black ${role === 'DISPATCHER' ? 'text-blue-700' : 'text-gray-900'}`}>Điều phối viên</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-tight">Nhận, trực tổng đài và điều phối nếu cần thiết.</p>
                 </button>
                 <button 
                  type="button"
                  onClick={() => setRole('ADMIN')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${role === 'ADMIN' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                 >
                    <div className="flex items-center gap-2 mb-1">
                       <Shield size={16} className={role === 'ADMIN' ? 'text-blue-600' : 'text-gray-400'} />
                       <span className={`text-sm font-black ${role === 'ADMIN' ? 'text-blue-700' : 'text-gray-900'}`}>Quản trị viên</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-tight">Full quyền, xem báo cáo và xoá data.</p>
                 </button>
              </div>
           </div>

           <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 ml-1">Mật khẩu tạm thời *</label>
              <input type="text" value="DieuPhoi@[4 số cuối SDT]" readOnly className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black text-gray-900 outline-none"/>
              <p className="text-[11px] text-gray-400 ml-1 italic">Người dùng sẽ phải đổi mật khẩu ở lần đăng nhập đầu tiên.</p>
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

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'ADD_USER', 'SUCCESS'
  const [activeMenu, setActiveMenu] = useState(null);
  const [loadingList, setLoadingList] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoadingList(true);
      const res = await adminAPI.getUsers({ limit: 500 });
      setUsers(res.data.data || []);
    } catch (e) {
      console.error(e);
      setUsers([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NguoiDung');

    worksheet.mergeCells('A1', 'E1');
    const titleRow = worksheet.getCell('A1');
    titleRow.value = 'DANH SÁCH NGƯỜI DÙNG & ĐIỀU PHỐI VIÊN';
    titleRow.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow([]);

    const header = worksheet.addRow(['STT', 'Họ Tên', 'Email', 'SĐT', 'Vai Trò', 'Trạng Thái', 'Đăng nhập']);
    header.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      cell.border = { bottom: { style: 'thin' } };
    });

    filtered.forEach((u, i) => {
      worksheet.addRow([
        i + 1,
        u.name || '',
        u.email || '',
        u.phone || '',
        ROLE_CONFIG[u.role]?.label || u.role,
        u.isActive !== false ? 'Hoạt động' : 'Đã khóa',
        u.lastLogin ? new Date(u.lastLogin).toLocaleString('vi-VN') : 'Trống'
      ]);
    });

    worksheet.columns = [{ width: 5 }, { width: 25 }, { width: 25 }, { width: 15 }, { width: 18 }, { width: 15 }, { width: 25 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Danh_sach_nguoi_dung_${new Date().getTime()}.xlsx`;
    link.click();
  };

  const toggleUserLocal = async (id) => {
    try {
       await adminAPI.toggleActive(id);
       fetchUsers();
       setActiveMenu(null);
    } catch(e) {
       console.error(e);
    }
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return users.filter(u => 
      (u.name || '').toLowerCase().includes(s) || 
      (u.email || '').toLowerCase().includes(s) ||
      (u.phone || '').toLowerCase().includes(s)
    );
  }, [users, search]);

  return (
    <div className="h-full flex flex-col pt-2 animate-fade-in relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Quản lý người dùng và ĐPV</h2>
          <p className="text-sm text-gray-500 font-medium font-sans italic opacity-70">Luồng Live Data (Admin Role)</p>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={handleExportExcel} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-black text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
             <Download size={18} />
             Xuất báo cáo (.xlsx)
           </button>
           <div className="w-10 h-10 rounded-full border border-gray-200 overflow-hidden shrink-0 shadow-sm">
              <img src="https://ui-avatars.com/api/?name=AD&background=1f2937&color=fff" alt="User" />
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm flex-1 flex flex-col overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xl">
               <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" />
               <input 
                 type="text" 
                 placeholder="Tìm kiếm tài khoản..."
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-blue-50/50 transition-all text-sm font-medium"
               />
            </div>
            <div className="flex items-center gap-4">
               <button className="p-3.5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:bg-gray-50 transition-all"><Filter size={24}/></button>
               <button 
                 onClick={() => setModal('ADD_USER')}
                 className="flex items-center gap-2 px-6 py-4 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
               >
                  Thêm tài khoản Admin/ĐPV
               </button>
            </div>
         </div>

         <div className="flex-1 overflow-auto">
            {loadingList ? (
               <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 flex border-4 border-t-transparent border-blue-500 rounded-full"/>
               </div>
            ) : (
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50/30 text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                     <th className="px-10 py-5">Tài khoản</th>
                     <th className="px-10 py-5 text-center">Vai trò</th>
                     <th className="px-10 py-5 text-center">Trạng thái</th>
                     <th className="px-10 py-5 text-center">Đăng nhập lần cuối</th>
                     <th className="px-10 py-5 text-right">Thao tác</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 && (
                     <tr><td colSpan="5" className="text-center py-10 text-gray-400 text-sm font-bold">Không tìm thấy kết quả</td></tr>
                  )}
                  {filtered.map((user) => {
                     const role = ROLE_CONFIG[user.role] || ROLE_CONFIG.CITIZEN;
                     return (
                        <tr key={user._id || user.id} className="group hover:bg-gray-50/30 transition-colors">
                           <td className="px-10 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Vô danh')}&background=random`} alt="Avatar"/>
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-sm font-black text-gray-900 truncate mb-0.5">{user.name}</p>
                                    <p className="text-[10px] font-bold text-gray-400 tracking-tight">{user.email || 'Chưa có Email'}</p>
                                    <p className="text-[10px] font-bold text-gray-400 italic mt-0.5">{user.phone || 'Chưa có SĐT'}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-10 py-6 text-center">
                              <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${role.badge}`}>
                                 {role.label}
                              </span>
                           </td>
                           <td className="px-10 py-6 text-center">
                              <div className="flex items-center justify-center gap-2 text-[11px] font-black text-gray-600">
                                 <div className={`w-2 h-2 rounded-full ${user.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                                 {user.isActive !== false ? 'Hoạt động' : 'Bị Khóa'}
                              </div>
                           </td>
                           <td className="px-10 py-6 text-center text-xs font-bold text-gray-400 italic">
                             {user.lastLogin ? new Date(user.lastLogin).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                           </td>
                           <td className="px-10 py-6 text-right relative">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === user._id ? null : user._id); }}
                                className="p-2 text-gray-300 hover:text-gray-900 hover:bg-white rounded-full transition-all"
                              >
                                 <MoreVertical size={20} />
                              </button>
                              
                              {activeMenu === user._id && (
                                <>
                                 <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }} />
                                 <div className="absolute right-12 top-12 mt-1 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
                                   <button onClick={() => toggleUserLocal(user._id)} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                                      <Key size={14} /> Khóa/Mở tài khoản
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
            )}
         </div>
      </div>

      {modal === 'ADD_USER' && (
        <AddUserModal 
          onClose={() => setModal(null)} 
          onSucceed={() => fetchUsers()}
        />
      )}
    </div>
  );
}
