import React, { useState, useMemo } from 'react';
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

const INITIAL_USERS = [
  { id: '1', name: 'Điều phối viên 1', email: 'dpv1@gmail.com', phone: '09123123123', role: 'DISPATCHER', status: 'ACTIVE', lastLogin: '10 phút trước' },
  { id: '2', name: 'Quản trị viên', email: 'qtv@gmail.com', phone: '09123123123', role: 'ADMIN', status: 'ACTIVE', lastLogin: 'Vừa xong' },
  { id: '3', name: 'Người dân 1', email: 'nd1@gmail.com', phone: '09123123123', role: 'CITIZEN', status: 'ACTIVE', lastLogin: '2 ngày trước' },
];

const ROLE_CONFIG = {
  ADMIN: { label: 'Quản trị viên', badge: 'bg-purple-100 text-purple-600', icon: Shield },
  DISPATCHER: { label: 'Điều phối viên', badge: 'bg-blue-100 text-blue-600', icon: UserCheck },
  CITIZEN: { label: 'Người dân', badge: 'bg-gray-100 text-gray-500', icon: null },
};

function SuccessModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
      <div className="bg-white rounded-[40px] p-12 w-full max-w-sm text-center shadow-2xl animate-scale-in">
        <h3 className="text-xl font-black text-gray-900 mb-8">Tạo tài khoản thành công</h3>
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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl relative animate-slide-up overflow-hidden">
        <div className="p-10 pb-4 flex justify-between items-center">
           <h3 className="text-xl font-black text-gray-900">Thêm tài khoản nội bộ</h3>
           <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        <form className="p-10 pt-4 space-y-8" onSubmit={(e) => { e.preventDefault(); onSucceed(); }}>
           <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 ml-1">Họ và tên *</label>
              <input type="text" placeholder="Nhập tên nhân sự" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Số điện thoại *</label>
                 <input type="text" placeholder="09988..." className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">Email nội bộ *</label>
                 <input type="text" placeholder="@cuuho.vn" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" required/>
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
              <input type="text" value="cuuho123" readOnly className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black text-gray-900"/>
              <p className="text-[11px] text-gray-400 ml-1 italic">Người dùng sẽ phải đổi mật khẩu ở lần đăng nhập đầu tiên.</p>
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

export default function Users() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'ADD_USER', 'SUCCESS'
  const [activeMenu, setActiveMenu] = useState(null);

  const filtered = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  return (
    <div className="h-full flex flex-col pt-2 animate-fade-in relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Quản lý người dùng và ĐPV</h2>
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
                  {filtered.map((user) => {
                     const role = ROLE_CONFIG[user.role];
                     return (
                        <tr key={user.id} className="group hover:bg-gray-50/30 transition-colors">
                           <td className="px-10 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} alt="Avatar"/>
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-sm font-black text-gray-900 truncate mb-0.5">{user.name}</p>
                                    <p className="text-[10px] font-bold text-gray-400 tracking-tight">{user.email}</p>
                                    <p className="text-[10px] font-bold text-gray-400 italic mt-0.5">{user.phone}</p>
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
                                 <div className={`w-2 h-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                 Hoạt động
                              </div>
                           </td>
                           <td className="px-10 py-6 text-center text-xs font-bold text-gray-400 italic">
                             {user.lastLogin}
                           </td>
                           <td className="px-10 py-6 text-right relative">
                              <button 
                                onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                                className="p-2 text-gray-300 hover:text-gray-900 hover:bg-white rounded-full transition-all"
                              >
                                 <MoreVertical size={20} />
                              </button>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {modal === 'ADD_USER' && (
        <AddUserModal 
          onClose={() => setModal(null)} 
          onSucceed={() => { setModal('SUCCESS'); }}
        />
      )}

      {modal === 'SUCCESS' && (
        <SuccessModal 
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
