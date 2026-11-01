import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  RadarIcon,
  MemoryIcon,
  CvIcon,
  SettingsIcon,
  CloseIcon,
  UsersIcon,
  UserIcon,
  BellIcon,
  HelpCircleIcon,
  LogOutIcon,
} from './Icons';
import { useApp } from '../context/AppContext';
import { useNetworkInbox } from '../lib/networkInbox';

export const Sidebar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const gearBtnRef = useRef<HTMLButtonElement>(null);
  const userCardRef = useRef<HTMLDivElement>(null);

  const { userProfile, resetToDefaultProfile } = useApp();
  const inbox = useNetworkInbox();
  const totalUnread = inbox.totalUnread + inbox.incomingRequests;
  const unreadLabel = totalUnread > 99 ? '99+' : String(totalUnread);
  const location = useLocation();
  const navigate = useNavigate();

  // Exactly 5 core workspace navigation modules
  const navItems = [
    { to: '/', label: 'Opportunity Radar', icon: RadarIcon },
    { to: '/cv', label: 'CV & Skill Lab', icon: CvIcon },
    { to: '/memory', label: 'Agent Memory', icon: MemoryIcon },
    { to: '/network', label: 'Teammates & Network', icon: UsersIcon },
    { to: '/notifications', label: 'Notifications & Bots', icon: BellIcon },
  ];

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        gearBtnRef.current &&
        !gearBtnRef.current.contains(event.target as Node) &&
        userCardRef.current &&
        !userCardRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopoverOpen]);

  // Derive initials from name
  const initials = [userProfile.name?.[0], userProfile.surname?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'Q';

  const displayName = userProfile.name
    ? `${userProfile.name} ${userProfile.surname || ''}`.trim()
    : 'New Candidate';

  const handleNavigatePortal = (tab: 'profile' | 'settings' | 'support') => {
    setIsPopoverOpen(false);
    setIsMobileMenuOpen(false);
    navigate(`/account?tab=${tab}`);
  };

  const handleLogOut = () => {
    setIsPopoverOpen(false);
    setIsMobileMenuOpen(false);
    resetToDefaultProfile();
    navigate('/students');
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-teal-500/20 sticky top-0 z-30 shadow-md">
        <Link to="/students" className="flex items-center gap-2">
          <img src="/brand/qadam-icon.png" alt="QADAM Logo" className="w-6 h-6 object-contain rounded-md" />
          <span className="font-semibold text-white tracking-tight text-[15px] font-mono">QADAM</span>
        </Link>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          className="h-9 w-9 flex items-center justify-center rounded-btn bg-white/10 text-teal-100 hover:text-white cursor-pointer transition-colors"
        >
          {isMobileMenuOpen ? <CloseIcon size={16} /> : <span className="text-sm font-mono">☰</span>}
        </button>
      </div>

      {/* Main Left Sidebar */}
      <aside
        className={`
          ${isMobileMenuOpen ? 'block' : 'hidden'}
          lg:flex flex-col w-full lg:w-[248px] lg:min-w-[248px] bg-gradient-to-b from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl min-h-screen lg:sticky lg:top-0 lg:h-screen z-20 select-none border-r border-teal-300/40 shadow-[4px_0_24px_rgba(6,182,212,0.12)]
        `}
      >
        {/* Top Brand Header */}
        <div className="p-4 border-b border-teal-200/80 flex items-center justify-between bg-white/50">
          <Link
            to="/students"
            title="QADAM: Return to Welcome Page"
            className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
          >
            <img src="/brand/qadam-icon.png" alt="QADAM Logo" className="w-7 h-7 object-contain rounded-md drop-shadow-xs" />
            <div className="flex items-baseline gap-1.5">
              <h1 className="text-[16px] font-bold text-indigo-950 tracking-tight font-sans">QADAM</h1>
            </div>
          </Link>
          <span className="text-[12px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/60 font-semibold">
            ACTIVE
          </span>
        </div>

        {/* Clean, Focused 5 Core Navigation Modules */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === '/'
                ? location.pathname === '/' || location.pathname === '/application-studio'
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 h-10 rounded-btn text-[13px] font-medium transition-all cursor-pointer group
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/15 text-teal-950 font-bold border border-teal-300/70 shadow-xs'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-white/70'
                  }
                `}
              >
                <Icon size={16} className={isActive ? 'text-emerald-700' : 'text-teal-700/70 group-hover:text-emerald-700'} />
                <span>{item.label}</span>
                {item.to === '/network' && totalUnread > 0 && (
                  <span
                    className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[12px] font-mono font-bold flex items-center justify-center"
                    aria-label={`${totalUnread} unread messages and friend requests`}
                  >
                    {unreadLabel}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Gear & Profile Trigger Section */}
        <div className="p-3 border-t border-teal-200/80 bg-white/40 relative">
          {/* Popover Menu (Appears directly above the footer card) */}
          {isPopoverOpen && (
            <div
              ref={popoverRef}
              role="menu"
              aria-orientation="vertical"
              className="absolute bottom-[calc(100%+8px)] left-3 right-3 bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] rounded-card shadow-2xl p-1.5 z-50 animate-pop-in origin-bottom space-y-0.5 border border-teal-200/90"
            >
              <div className="px-3 py-2 border-b border-teal-200/60 text-[12px] font-mono text-teal-800 font-semibold">
                ACCOUNT & PREFERENCES
              </div>

              {/* 1. Profile */}
              <button
                type="button"
                role="menuitem"
                onClick={() => handleNavigatePortal('profile')}
                className="w-full px-3 py-2.5 rounded-btn flex items-center gap-3 text-left hover:bg-white/80 transition-colors cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-btn bg-white flex items-center justify-center text-teal-700 group-hover:text-emerald-700 group-hover:bg-emerald-50 border border-teal-200/60">
                  <UserIcon size={14} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-indigo-950">Profile</div>
                  <div className="text-[12px] font-mono text-teal-800">Identity, stack, CV</div>
                </div>
              </button>

              {/* 2. Settings */}
              <button
                type="button"
                role="menuitem"
                onClick={() => handleNavigatePortal('settings')}
                className="w-full px-3 py-2.5 rounded-btn flex items-center gap-3 text-left hover:bg-white/80 transition-colors cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-btn bg-white flex items-center justify-center text-teal-700 group-hover:text-emerald-700 group-hover:bg-emerald-50 border border-teal-200/60">
                  <SettingsIcon size={14} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-indigo-950">Settings</div>
                  <div className="text-[12px] font-mono text-teal-800">Privacy, OpenShell logs</div>
                </div>
              </button>

              {/* 3. Tech Support */}
              <button
                type="button"
                role="menuitem"
                onClick={() => handleNavigatePortal('support')}
                className="w-full px-3 py-2.5 rounded-btn flex items-center gap-3 text-left hover:bg-white/80 transition-colors cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-btn bg-white flex items-center justify-center text-teal-700 group-hover:text-emerald-700 group-hover:bg-emerald-50 border border-teal-200/60">
                  <HelpCircleIcon size={14} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-indigo-950">Tech Support</div>
                  <div className="text-[12px] font-mono text-teal-800">Guides, bug report, FAQ</div>
                </div>
              </button>

              <div className="pt-1 border-t border-teal-200/60">
                {/* 4. Log Out */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogOut}
                  className="w-full px-3 py-2 rounded-btn flex items-center gap-3 text-left hover:bg-rose-50 text-slate-700 hover:text-rose-600 transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-btn bg-white flex items-center justify-center text-rose-500 group-hover:bg-rose-100 border border-rose-200/60">
                    <LogOutIcon size={14} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold">Log Out</div>
                    <div className="text-[12px] font-mono text-rose-700">End session & lock</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Trigger User Card + Gear Button */}
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-card bg-white/80 hover:bg-white transition-colors border border-teal-200/80 shadow-xs">
            <div
              ref={userCardRef}
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1"
            >
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={displayName}
                  className="w-7 h-7 rounded-full object-cover border border-emerald-500/60 flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[12px] font-mono font-bold text-emerald-800 flex-shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-indigo-950 truncate">{displayName}</div>
                <div className="text-[12px] font-mono text-teal-800 truncate">
                  {userProfile.university || 'Account Portal'}
                </div>
              </div>
            </div>

            <button
              ref={gearBtnRef}
              type="button"
              aria-label="Account Settings Menu"
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              className={`
                w-8 h-8 flex items-center justify-center rounded-btn transition-colors cursor-pointer
                ${isPopoverOpen ? 'bg-emerald-50 text-emerald-700' : 'text-teal-700 hover:text-emerald-700 hover:bg-white'}
              `}
            >
              <SettingsIcon size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Fixed Bottom Navigation Bar (Anchored at Bottom with Safe Area Inset) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-lg border-t border-teal-500/20 px-2 py-1 flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === '/'
              ? location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/application-studio'
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`
                min-h-[44px] min-w-[48px] px-2 py-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95
                ${
                  isActive
                    ? 'text-emerald-400 font-bold bg-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }
              `}
            >
              <span className="relative">
                <Icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
                {item.to === '/network' && totalUnread > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[12px] font-mono font-bold flex items-center justify-center"
                    aria-label={`${totalUnread} unread messages and friend requests`}
                  >
                    {unreadLabel}
                  </span>
                )}
              </span>
              <span className="text-[12px] font-mono tracking-tight leading-none mt-0.5">
                {item.label === 'Opportunity Radar'
                  ? 'Radar'
                  : item.label === 'CV & Skill Lab'
                  ? 'CV Lab'
                  : item.label === 'Agent Memory'
                  ? 'Memory'
                  : item.label === 'Teammates & Network'
                  ? 'Network'
                  : 'Alerts'}
              </span>
            </NavLink>
          );
        })}

        {/* Profile / Account Nav Link */}
        <NavLink
          to="/account?tab=profile"
          className={`
            min-h-[44px] min-w-[48px] px-2 py-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95
            ${
              location.pathname.startsWith('/account')
                ? 'text-emerald-400 font-bold bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }
          `}
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center text-[12px] font-bold">
            {initials}
          </div>
          <span className="text-[12px] font-mono tracking-tight leading-none mt-0.5">Profile</span>
        </NavLink>
      </nav>
    </>
  );
};

export default Sidebar;
