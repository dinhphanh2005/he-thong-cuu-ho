import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Paperclip, Send, MessageSquare, CheckCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const INITIAL_CONTACTS = [
  {
    id: 1,
    name: 'Nguyễn Văn A',
    team: 'Đội cứu hộ 1',
    vehicle: '29H-123.45',
    status: 'Đang di chuyển',
    online: true,
    unread: 2,
    messages: [
      { id: '1-1', sender: 'them', text: 'Bên em đã nhận nhiệm vụ, đang rời bến.', time: '08:57' },
      { id: '1-2', sender: 'me', text: 'Xác nhận ETA giúp tôi.', time: '08:59' },
      { id: '1-3', sender: 'them', text: 'Khoảng 12 phút, hiện đang qua cầu vượt Mai Dịch.', time: '09:01' },
      { id: '1-4', sender: 'them', text: 'Khu vực hiện trường khá đông, cần giữ luồng liên lạc mở.', time: '09:03' },
    ],
  },
  {
    id: 2,
    name: 'Trần Minh B',
    team: 'Đội cứu hộ 2',
    vehicle: '51A-782.16',
    status: 'Sẵn sàng',
    online: true,
    unread: 0,
    messages: [
      { id: '2-1', sender: 'me', text: 'Đội 2 standby tại khu vực Cầu Giấy nhé.', time: '08:40' },
      { id: '2-2', sender: 'them', text: 'Đã rõ. Đủ quân số, xe và dụng cụ đầy đủ.', time: '08:42' },
    ],
  },
  {
    id: 3,
    name: 'Lê Quốc C',
    team: 'Đội cứu hộ 3',
    vehicle: '30G-456.88',
    status: 'Ngoại tuyến',
    online: false,
    unread: 0,
    messages: [
      { id: '3-1', sender: 'them', text: 'Máy bộ đàm đang kiểm tra lại pin, sẽ online sau 10 phút.', time: '07:55' },
    ],
  },
];

function getAvatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E8EEF9&color=17324D`;
}

function getLastMessage(contact) {
  return contact.messages[contact.messages.length - 1];
}

export default function Contacts() {
  const { state } = useLocation();
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [activeContact, setActiveContact] = useState(INITIAL_CONTACTS[0].id);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const chatBottomRef = useRef(null);

  const visibleContacts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return contacts;
    return contacts.filter((contact) =>
      [contact.name, contact.team, contact.vehicle, contact.status].some((field) =>
        field.toLowerCase().includes(keyword)
      )
    );
  }, [contacts, search]);

  const activeConversation = visibleContacts.find((contact) => contact.id === activeContact)
    || contacts.find((contact) => contact.id === activeContact)
    || contacts[0];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length]);

  useEffect(() => {
    const prefillMessage = state?.prefillMessage?.trim();
    if (!prefillMessage) return;

    setActiveContact(INITIAL_CONTACTS[0].id);
    setMessage(prefillMessage);
  }, [state]);

  const handleSelectContact = (contactId) => {
    setActiveContact(contactId);
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === contactId ? { ...contact, unread: 0 } : contact
      )
    );
  };

  const handleSend = (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || !activeConversation) return;

    const now = new Date();
    const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === activeConversation.id
          ? {
              ...contact,
              messages: [
                ...contact.messages,
                { id: `${contact.id}-${Date.now()}`, sender: 'me', text, time },
              ],
              status: contact.online ? 'Đang phản hồi' : contact.status,
            }
          : contact
      )
    );
    setMessage('');

    window.setTimeout(() => {
      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === activeConversation.id
            ? {
                ...contact,
                messages: [
                  ...contact.messages,
                  {
                    id: `${contact.id}-${Date.now()}-reply`,
                    sender: 'them',
                    text: text.toLowerCase().includes('eta')
                      ? 'ETA hiện tại khoảng 8 phút. Tôi sẽ cập nhật khi vào gần hiện trường.'
                      : text.toLowerCase().includes('sự cố')
                        ? 'Đã nhận nội dung. Tôi đang trao đổi trực tiếp với lái xe và sẽ phản hồi thêm.'
                        : 'Đã nhận. Tôi sẽ kiểm tra thực địa và nhắn lại ngay khi có thay đổi.',
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                  },
                ],
              }
            : contact
        )
      );
    }, 1200);
  };

  if (!activeConversation) return null;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)]">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex overflow-hidden">
        <div className="w-[320px] border-r border-gray-100 flex flex-col bg-white shrink-0">
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm cứu hộ, đội xe, biển số..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {visibleContacts.map((contact) => {
              const lastMessage = getLastMessage(contact);
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleSelectContact(contact.id)}
                  className={`w-full p-3 rounded-2xl text-left flex items-center gap-3 cursor-pointer transition-all ${
                    activeConversation.id === contact.id
                      ? 'bg-[#F0F7FF] border border-blue-100 shadow-sm'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0 overflow-hidden relative">
                    <img src={getAvatar(contact.name)} alt={contact.name} className="w-full h-full object-cover" />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${contact.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h5 className={`text-sm font-bold truncate ${activeConversation.id === contact.id ? 'text-blue-900' : 'text-gray-900'}`}>
                        {contact.name}
                      </h5>
                      <span className="text-[10px] font-medium text-gray-400 shrink-0">{lastMessage?.time}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{contact.team} • {contact.vehicle}</p>
                    <div className="flex items-center justify-between gap-3 mt-1.5">
                      <p className="text-xs text-gray-600 truncate">{lastMessage?.text}</p>
                      {contact.unread > 0 && (
                        <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                          {contact.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[#F5F7FB] relative">
          <div className="h-20 border-b border-gray-100 bg-white flex justify-between items-center px-6 shrink-0 z-10 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900">{activeConversation.name} ({activeConversation.vehicle})</h4>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${activeConversation.online ? 'bg-[#E8F8F5] text-[#149B5F]' : 'bg-gray-100 text-gray-500'}`}>
                  {activeConversation.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{activeConversation.team} • Luồng trao đổi điều phối trực tiếp</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-[11px] font-bold text-blue-700">Tin nhắn trực tiếp</p>
              <p className="text-[10px] text-blue-500">Ưu tiên cập nhật ETA, hiện trường, nhu cầu hỗ trợ</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-gray-400 border border-gray-100 shadow-sm">
                Hôm nay
              </div>
            </div>

            {activeConversation.messages.map((entry) => (
              <div
                key={entry.id}
                className={`flex gap-3 max-w-[82%] ${entry.sender === 'me' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                  <img
                    src={entry.sender === 'me' ? getAvatar('Điều phối') : getAvatar(activeConversation.name)}
                    alt={entry.sender === 'me' ? 'Điều phối' : activeConversation.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className={`flex flex-col ${entry.sender === 'me' ? 'items-end' : ''}`}>
                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed mb-1 inline-block shadow-sm ${
                      entry.sender === 'me'
                        ? 'bg-[#0F62FE] text-white rounded-tr-sm'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                    }`}
                  >
                    {entry.text}
                  </div>
                  <div className={`text-[10px] font-bold text-gray-400 flex items-center gap-1 ${entry.sender === 'me' ? 'mr-1' : 'ml-1'}`}>
                    {entry.time}
                    {entry.sender === 'me' && <CheckCheck size={12} className="text-blue-400" />}
                  </div>
                </div>
              </div>
            ))}
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
                disabled={!message.trim()}
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
