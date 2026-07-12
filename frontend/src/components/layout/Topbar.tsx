import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Menu, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TopbarProps {
  setIsMobileOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  setIsMobileOpen,
  searchQuery,
  setSearchQuery,
}) => {
  const { logout, user } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const currentYear = new Date().getFullYear();

  // Hardcoded notifications corresponding to latest server notice updates
  const notifications = [
    { id: 1, text: `New High Priority Notice: "Pansy Fest ${currentYear}"`, type: 'notice', read: false, time: '10 mins ago' },
    { id: 2, text: 'Dr. Clara Rivers join date scheduled for tomorrow', type: 'system', read: false, time: '2 hours ago' },
    { id: 3, text: 'Quarterly Audit: Financial ledger updated', type: 'fee', read: true, time: '1 day ago' },
  ];

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/85 backdrop-blur-md sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Mobile Menu Button & Search Wrapper */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Global Filter Bar */}
        <div className="relative w-full max-w-sm hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 select-none pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students, teachers, notices..."
            className="w-full text-xs font-medium pl-9 pr-4 py-2 border border-slate-200 hover:border-slate-300/80 bg-slate-50/60 focus:bg-white rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Utilities Action Group */}
      

      <div className="flex items-center gap-3">
        {/* Notifications Icon & Drawer */}
        <div className="relative">
          <button 
            onClick={() => { setShowNotifications(!showNotifications); setShowProfileDropdown(false); }}
            className={`p-2.5 rounded-lg border border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer relative
              ${showNotifications ? 'bg-slate-100 text-slate-900 border-slate-200' : ''}
            `}
          >
            <Bell size={17} />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse border-2 border-white" />
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 py-2 origin-top-right transition-all">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Notifications</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">3 Alert Units</span>
                </div>
                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div key={notif.id} className={`p-3 text-xs ${notif.read ? 'bg-white' : 'bg-blue-50/20'} hover:bg-slate-50/80 transition-colors`}>
                      <p className="font-medium text-slate-700 leading-normal">{notif.text}</p>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">{notif.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Account Quick Dropdown */}
        <div className="relative">
          <button 
            onClick={() => { setShowProfileDropdown(!showProfileDropdown); setShowNotifications(false); }}
            className="flex items-center gap-1.5 p-1 px-2 rounded-lg hover:bg-slate-50 hover:border-slate-200 border border-transparent transition-all cursor-pointer"
          >
            <img 
              src={user?.avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=admin'}
              alt={user?.name || 'Administrator'}
              className="h-7 w-7 rounded-md object-cover border border-slate-200 flex-shrink-0"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs font-bold text-slate-700 max-w-28 truncate hidden md:block select-none">
              {user?.name || 'Pansy Admin'}
            </span>
            <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
          </button>

          {showProfileDropdown && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowProfileDropdown(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-40 py-1.5 origin-top-right transition-all">
                {/* Panel Info */}
                <div className="px-4 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Administrative Staff'}</p>
                  <p className="text-[10px] text-slate-400 capitalize truncate">{user?.role || 'admin'} Portal</p>
                </div>

                <div className="px-1 space-y-0.5">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-950 hover:bg-slate-50 rounded-lg cursor-not-allowed select-none">
                    <User size={14} className="text-slate-400" />
                    <span>My Profile</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-950 hover:bg-slate-50 rounded-lg cursor-not-allowed select-none">
                    <Settings size={14} className="text-slate-400" />
                    <span>System Sync</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 my-1 px-1">
                  <button
                    onClick={() => { setShowProfileDropdown(false); logout(); }}
                    className="flex items-center w-full gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span className="font-semibold">Log Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
export default Topbar;
