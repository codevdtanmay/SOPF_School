import React from 'react';
import { 
  Flower2, 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  DollarSign, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Coins,
  Bus,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SchoolLogo } from '../common/SchoolLogo';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { logout, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'teachers', label: 'Teachers', icon: GraduationCap },
    { id: 'fees', label: 'Fees', icon: DollarSign },
    { id: 'fee-structure', label: 'Fee Structure', icon: Coins },
    { id: 'transport', label: 'Transport', icon: Bus },
    { id: 'transfer-certificates', label: 'Transfer Certificates', icon: FileText },
  ];

  const transportSubItems = [
    { id: 'transport-students', label: 'Transport Students' },
    { id: 'transport-fee-collection', label: 'Transport Fee Collection' },
    { id: 'transport-payment-history', label: 'Payment History' },
    { id: 'transport-dashboard', label: 'Dashboard' }
  ];

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setIsMobileOpen(false); // Close sidebar drawer on mobile
  };

  const isTransportActive = ['transport', 'transport-students', 'transport-fee-collection', 'transport-payment-history', 'transport-dashboard'].includes(currentTab);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80">
      {/* Brand Header */}
      <div className={`flex items-center gap-3 px-6 py-5 border-b border-slate-100/90 ${isCollapsed ? 'justify-center px-2' : ''}`}>
        <div className="flex items-center justify-center h-11 w-11 rounded-lg flex-shrink-0">
          <SchoolLogo size={36} />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col transition-all duration-300">
            <span className="text-xs font-black text-slate-900 tracking-tight whitespace-normal max-w-[145px] leading-tight">
              The School of Pansy Flowers
            </span>
          </div>
        )}
      </div>

      {/* Main Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'transport' 
            ? isTransportActive 
            : currentTab === item.id;

          return (
            <div key={item.id} className="space-y-0.5">
              <button
                onClick={() => {
                  if (item.id === 'transport') {
                    handleNavClick('transport-students');
                  } else {
                    handleNavClick(item.id);
                  }
                }}
                className={`flex items-center w-full rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer
                  ${isActive 
                    ? 'bg-blue-600/8 text-blue-650 border-l-4 border-blue-600 font-semibold' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }
                  ${isCollapsed ? 'justify-center relative group' : 'gap-3'}
                `}
              >
                <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {!isCollapsed && <span>{item.label}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1 bg-slate-950 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-md">
                    {item.label}
                  </div>
                )}
              </button>

              {/* Render Nested Transport Sub-items if expanded */}
              {item.id === 'transport' && isTransportActive && !isCollapsed && (
                <div className="pl-6 pr-1 py-1 space-y-1 border-l border-slate-100 ml-5">
                  {transportSubItems.map((sub) => {
                    const isSubActive = currentTab === sub.id || (currentTab === 'transport' && sub.id === 'transport-students');
                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleNavClick(sub.id)}
                        className={`flex items-center w-full rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer text-left
                          ${isSubActive
                            ? 'text-blue-600 font-bold bg-blue-50/50'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                          }
                        `}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${isSubActive ? 'bg-blue-500' : 'bg-slate-300'}`} />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse Action on Desktop */}
      <div className="hidden md:flex items-center justify-end p-3 border-t border-slate-100">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 bg-slate-50 border border-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Connected User Profile Footer */}
      <div className={`p-4 border-t border-slate-105 bg-slate-50/60 flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3'}`}>
        <img
          src={user?.avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=admin'}
          alt={user?.name || 'User'}
          className="h-9 w-9 rounded-lg border border-slate-200 object-cover"
          referrerPolicy="no-referrer"
        />
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-bold text-slate-800 truncate leading-none">
              {user?.name || 'Administrator'}
            </h5>
            <span className="text-[10px] text-slate-400 capitalize truncate font-semibold">
              {user?.role || 'Admin'} Access
            </span>
          </div>
        )}
        {!isCollapsed && (
          <button
            onClick={() => logout()}
            className="p-1 px-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside 
        className={`hidden md:block transition-all duration-300 h-screen sticky top-0 flex-shrink-0 z-30
          ${isCollapsed ? 'w-18' : 'w-64'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white z-50 md:hidden transition-transform duration-300 ease-out-quint
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
export default Sidebar;
