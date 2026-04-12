import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Paperclip, Send, MessageSquare, CheckCheck, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { chatAPI } from '../../services/api';
import { connectSocket } from '../../services/socket';

const TEAM_TYPE_LABELS = {
  AMBULANCE: 'Cứu thương',
  TOW_TRUCK: 'Xe kéo',
  FIRE: 'Cứu hỏa',
  POLICE: 'Cảnh sát',
  MULTI: 'Đa năng',
};

export default function Contacts() {
  const { state } = useLocation();
  const { incidents, user } = useApp();
  const [search, setSearch] = useState('');
  const [activeIncidentId, setActiveIncidentId] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const chatBottomRef = useRef(null);

  // Filter Active Incidents
  const activeIncidents = useMemo(() => {
    return incidents.filter(i => ['PENDING', 'ASSIGNED', 'ARRIVED', 'PROCESSING'].includes(i.status) && i.assignedTeam);
  }, [incidents]);

  const visibleContacts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return activeIncidents;
    return activeIncidents.filter((inc) =>
      [inc.assignedTeam?.name, inc.code, inc.assignedTeam?.vehicle, inc.type].some((field) =>
        field && field.toLowerCase().includes(keyword)
      )
    );
  }, [activeIncidents, search]);

  const activeIncident = activeIncidents.find(i => i._id === activeIncidentId) || visibleContacts[0];

  // Initial selection
  useEffect(() => {
    if (state?.incidentId) {
      setActiveIncidentId(state.incidentId);
      if (state.prefillMessage) {
        setMessage(state.prefillMessage);
      }
    } else if (activeIncidents.length > 0 && !activeIncidentId) {
      setActiveIncidentId(activeIncidents[0]._id);
    }
  }, [state, activeIncidents.length]);

  // Fetch messages
  useEffect(() => {
    if (!activeIncident?._id) return;
    
    let isMounted = true;
    const fetchMsgs = async () => {
      setLoadingMessages(true);
      try {
        const { data } = await chatAPI.getMessages(activeIncident._id);
        if (isMounted) setMessages(data.data || []);
      } catch (err) {
        console.error('Lỗi tải tin nhắn:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };
    fetchMsgs();
    return () => { isMounted = false; };
  }, [activeIncident?._id]);

  // Socket setup
  useEffect(() => {
    if (!activeIncident?._id) return;
    
    const socket = connectSocket();
    socket.emit('chat:join', activeIncident._id);
    
    const handleNewMessage = (msg) => {
      if (msg.incidentId === activeIncident._id) {
        setMessages(prev => {
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };
    
    socket.on('chat:message', handleNewMessage);
    
    return () => {
      socket.emit('chat:leave', activeIncident._id);
      socket.off('chat:message', handleNewMessage);
    };
  }, [activeIncident?._id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSelectContact = (id) => {
    setActiveIncidentId(id);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || !activeIncident?._id) return;

    setMessage(''); // Optimistic clear
    
    try {
      // Backend automatically broadcasts it via socket
      await chatAPI.sendMessage(activeIncident._id, text);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn', err);
    }
  };

  function getAvatar(name) {
    if (!name) return `https://ui-avatars.com/api/?name=U&background=E8EEF9&color=17324D`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E8EEF9&color=17324D`;
  }

  if (activeIncidents.length === 0) {
    return (
      <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold">Không có cuộc hội thoại nào</h3>
          <p className="text-sm">Chỉ có thể trò chuyện với các đội cứu hộ đang trong quá trình thực hiện sự cố.</p>
        </div>
      </div>
    );
  }

  if (!activeIncident) return null;

  const getStatusLabel = (status) => {
    if (status === 'ASSIGNED' || status === 'PENDING') return 'Đang di chuyển';
    if (status === 'PROCESSING' || status === 'ARRIVED') return 'Đang xử lý';
    return status;
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)]">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[320px] border-r border-gray-100 flex flex-col bg-white shrink-0">
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm mã vụ việc, đội xe..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {visibleContacts.map((inc) => {
              const isActive = activeIncident._id === inc._id;
              const teamName = inc.assignedTeam?.name || 'Đội chưa xác định';
              return (
                <button
                  key={inc._id}
                  type="button"
                  onClick={() => handleSelectContact(inc._id)}
                  className={`w-full p-3 rounded-2xl text-left flex items-center gap-3 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#F0F7FF] border border-blue-100 shadow-sm'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0 overflow-hidden relative">
                    <img src={getAvatar(teamName)} alt={teamName} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h5 className={`text-sm font-bold truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                        {teamName}
                      </h5>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate font-semibold text-blue-600 mb-0.5">Sự cố {inc.code}</p>
                    <p className="text-[11px] text-gray-400 truncate">{TEAM_TYPE_LABELS[inc.type] || inc.type}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col bg-[#F5F7FB] relative">
          <div className="h-20 border-b border-gray-100 bg-white flex justify-between items-center px-6 shrink-0 z-10 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900">{activeIncident.assignedTeam?.name || 'Chưa gán'} (Sự cố {activeIncident.code})</h4>
                <span className="text-[10px] px-2 py-1 rounded-full font-bold bg-[#E8F8F5] text-[#149B5F]">
                  {getStatusLabel(activeIncident.status)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{TEAM_TYPE_LABELS[activeIncident.type] || activeIncident.type} • Luồng trao đổi điều phối chung</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {loadingMessages && (
              <div className="flex justify-center my-4">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            )}
            
            {!loadingMessages && messages.length === 0 && (
               <div className="text-center text-sm text-gray-400 my-4">Chưa có tin nhắn trong luồng này. Bắt đầu trao đổi!</div>
            )}

            {messages.map((entry) => {
              const isMe = entry.sender?._id === user?._id || entry.sender?.role === 'DISPATCHER' || entry.sender?.role === 'ADMIN'; 
              const time = new Date(entry.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              
              return (
                <div
                  key={entry._id}
                  className={`flex gap-3 max-w-[82%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                    <img
                      src={isMe ? getAvatar('Điều phối') : getAvatar(entry.sender?.name || 'User')}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className={`flex flex-col ${isMe ? 'items-end' : ''}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-sm leading-relaxed mb-1 inline-block shadow-sm ${
                        isMe
                          ? 'bg-[#0F62FE] text-white rounded-tr-sm'
                          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                      }`}
                    >
                      {entry.text}
                    </div>
                    <div className={`text-[10px] font-bold text-gray-400 flex items-center gap-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                      {entry.sender?.name} • {time}
                      {isMe && <CheckCheck size={12} className="text-blue-400" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <form
              onSubmit={handleSend}
              className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-full px-2 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all"
            >
              <button type="button" className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0 cursor-pointer">
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                placeholder="Nhập nội dung điều phối..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="flex-1 bg-transparent py-1.5 focus:outline-none text-sm text-gray-800"
              />
              <button
                type="submit"
                className={`h-10 min-w-10 rounded-full shrink-0 flex items-center justify-center transition-colors ${
                  message.trim().length > 0
                    ? 'bg-[#00A8FF] text-white hover:bg-blue-600 cursor-pointer'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
                disabled={!message.trim() || loadingMessages}
              >
                {message.trim() ? <Send size={18} className="-ml-0.5 mt-0.5" /> : <MessageSquare size={18} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
