import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Bell, 
  Menu, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { studentApi } from '../../api/studentApi';

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
  const [showNextSessionModal, setShowNextSessionModal] = useState(false);
  const [creatingNextSession, setCreatingNextSession] = useState(false);
  const [settingCurrentSession, setSettingCurrentSession] = useState(false);
  const [nextSessionError, setNextSessionError] = useState('');
  const [academicYears, setAcademicYears] = useState<{ id: string; label: string; isCurrent: boolean }[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const currentYear = new Date().getFullYear();

  // Hardcoded notifications corresponding to latest server notice updates
  const notifications = [
    { id: 1, text: `New High Priority Notice: "Pansy Fest ${currentYear}"`, type: 'notice', read: false, time: '10 mins ago' },
    { id: 2, text: 'Dr. Clara Rivers join date scheduled for tomorrow', type: 'system', read: false, time: '2 hours ago' },
    { id: 3, text: 'Quarterly Audit: Financial ledger updated', type: 'fee', read: true, time: '1 day ago' },
  ];

  useEffect(() => {
    if (!showNextSessionModal) {
      setNextSessionError('');
      return;
    }

    let cancelled = false;
    const loadAcademicYears = async () => {
      try {
        const years = await studentApi.getAcademicYears();
        if (cancelled) {
          return;
        }

        setAcademicYears(years.map((year) => ({
          id: year.id,
          label: year.label,
          isCurrent: year.isCurrent
        })));
        const currentYearEntry = years.find((year) => year.isCurrent) || years[0];
        setCurrentSessionId(currentYearEntry?.id || '');
      } catch (error: any) {
        if (!cancelled) {
          setNextSessionError(error?.message || 'Failed to load academic sessions');
        }
      }
    };

    loadAcademicYears();

    return () => {
      cancelled = true;
    };
  }, [showNextSessionModal]);

  const handleAddNextSession = async () => {
    return handleSessionAction(false);
  };

  const handleCreateAndSetCurrentSession = async () => {
    return handleSessionAction(true);
  };

  const handleSetExistingCurrentSession = async () => {
    if (!currentSessionId) {
      setNextSessionError('Select a session first.');
      return;
    }

    const selected = academicYears.find((year) => year.id === currentSessionId);
    if (!selected) {
      setNextSessionError('Selected session not found.');
      return;
    }

    if (selected.isCurrent) {
      setNextSessionError(`"${selected.label}" is already current.`);
      return;
    }

    setSettingCurrentSession(true);
    setNextSessionError('');

    try {
      await studentApi.setCurrentAcademicYear(selected.id);
      setShowNextSessionModal(false);
      setShowProfileDropdown(false);
      window.dispatchEvent(
        new CustomEvent('school:academic-year-updated', {
          detail: {
            message: `Academic year "${selected.label}" set as current`
          }
        })
      );
    } catch (error: any) {
      setNextSessionError(
        error?.response?.data?.message || error?.message || 'Failed to update the current academic year'
      );
    } finally {
      setSettingCurrentSession(false);
    }
  };

  const handleSessionAction = async (setCurrent: boolean) => {
    setCreatingNextSession(true);
    setNextSessionError('');

    try {
      const response = await studentApi.addNextAcademicYear();
      if (setCurrent && response.academicYear?.id) {
        await studentApi.setCurrentAcademicYear(response.academicYear.id);
      }
      setShowNextSessionModal(false);
      setShowProfileDropdown(false);
      window.dispatchEvent(
        new CustomEvent('school:academic-year-updated', {
          detail: {
            message: setCurrent
              ? `Academic year "${response.academicYear?.label || 'selected'}" set as current`
              : response.message || 'Next academic year created successfully'
          }
        })
      );
    } catch (error: any) {
      setNextSessionError(
        error?.response?.data?.message || error?.message || 'Failed to create the next academic year'
      );
    } finally {
      setCreatingNextSession(false);
    }
  };

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
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setShowNextSessionModal(true);
                    }}
                    className="flex items-center w-full gap-2 px-3 py-1.5 text-xs text-blue-700 hover:text-blue-950 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Sparkles size={14} className="text-blue-500" />
                    <span className="font-semibold">Add next session</span>
                  </button>
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

      <Modal
        isOpen={showNextSessionModal}
        onClose={() => {
          if (!creatingNextSession) {
            setShowNextSessionModal(false);
          }
        }}
        title="Add next academic session"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowNextSessionModal(false)}
              disabled={creatingNextSession || settingCurrentSession}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleCreateAndSetCurrentSession}
              isLoading={creatingNextSession || settingCurrentSession}
              leftIcon={<Sparkles size={14} />}
            >
              Create & Set Current
            </Button>
            <Button
              onClick={handleAddNextSession}
              isLoading={creatingNextSession}
              leftIcon={<Sparkles size={14} />}
            >
              Create next session
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">This creates the next academic year only.</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              The new session is created as inactive. An admin can mark it current later.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            Promotion, fees, and attendance will continue to use the currently selected year until you switch it. You can also create the next session and mark it current from this modal.
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Mark an existing session current</p>
              <p className="text-xs text-slate-500 mt-1">
                Use this if the new session already exists and you want to activate it later.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={currentSessionId}
                onChange={(e) => setCurrentSessionId(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white"
              >
                <option value="">Select a session</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.label}{year.isCurrent ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={handleSetExistingCurrentSession}
                isLoading={settingCurrentSession}
                disabled={!currentSessionId || settingCurrentSession}
              >
                Set Current
              </Button>
            </div>
          </div>
          {nextSessionError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {nextSessionError}
            </div>
          )}
        </div>
      </Modal>
    </header>
  );
};
export default Topbar;
