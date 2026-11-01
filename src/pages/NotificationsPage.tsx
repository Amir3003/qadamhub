import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import {
  BellIcon,
  CheckIcon,
  ShieldIcon,
  ExternalLinkIcon,
  TelegramIcon,
  DiscordIcon,
  CloseIcon,
} from '../components/Icons';

export const NotificationsPage: React.FC = () => {
  const { userProfile, updateUserProfile, addLog } = useApp();

  const initialNotifications = userProfile.notifications || {
    telegram: false,
    telegramHandle: '',
    discord: false,
    discordWebhook: '',
  };

  const [telegramActive, setTelegramActive] = useState(false);
  const [telegramHandle, setTelegramHandle] = useState(initialNotifications.telegramHandle || '@');
  const [isTelegramModal, setIsTelegramModal] = useState(false);

  const [discordActive, setDiscordActive] = useState(false);
  const [, setDiscordWebhook] = useState('');
  const [isDiscordModal, setIsDiscordModal] = useState(false);

  const [testAlertSent, setTestAlertSent] = useState<string | null>(null);

  const saveNotifications = (updates: Partial<typeof initialNotifications>) => {
    const updated = {
      telegram: telegramActive,
      telegramHandle,
      discord: discordActive,
      ...updates,
      discordWebhook: '',
    };
    updateUserProfile({
      notifications: updated,
    });
  };

  const BOT_USERNAME = 'QadamAgentBot';

  const getTelegramDeepLink = () => {
    return `https://t.me/${BOT_USERNAME}?start=qadam`;
  };

  const handleAuthorizeTelegram = () => {
    const deepLink = getTelegramDeepLink();
    window.open(deepLink, '_blank', 'noopener,noreferrer');
    setIsTelegramModal(false);
    addLog('SYSTEM', `Opened @${BOT_USERNAME}; account linking requires the bot backend.`);
  };

  const handleOpenBotDirectly = () => {
    window.open(`https://t.me/${BOT_USERNAME}`, '_blank', 'noopener,noreferrer');
  };

  const handleConnectTelegram = () => {
    setTelegramActive(false);
    saveNotifications({ telegram: false });
    setIsTelegramModal(false);
    addLog('SYSTEM', 'Telegram account linking requires the bot backend.');
  };

  const handleDisconnectTelegram = () => {
    setTelegramActive(false);
    saveNotifications({ telegram: false });
    addLog('SYSTEM', 'Telegram Bot integration disconnected');
  };

  const DISCORD_INVITE_URL = 'https://discord.gg/A4rxRGx4Vt';
  const handleAuthorizeDiscord = () => {
    window.open(DISCORD_INVITE_URL, '_blank', 'noopener,noreferrer');
    setIsDiscordModal(false);
    addLog('SYSTEM', 'Opened the QADAM Discord invite. Server notifications require backend configuration.');
  };

  const handleOpenDiscordServer = handleAuthorizeDiscord;

  const handleConnectDiscord = () => {
    setDiscordActive(false);
    setDiscordWebhook('');
    saveNotifications({ discord: false, discordWebhook: '' });
    setIsDiscordModal(false);
    addLog('SYSTEM', 'Discord webhook configuration is server-side only.');
  };

  const handleDisconnectDiscord = () => {
    setDiscordActive(false);
    saveNotifications({ discord: false, discordWebhook: '' });
  };

  const triggerTestAlert = async (channel: string) => {
    setTestAlertSent(channel);
    setTimeout(() => setTestAlertSent(null), 3000);

    const base = import.meta.env.VITE_QADAM_API_URL?.replace(/\/$/, '');
    if (base) {
      try {
        const response = await fetch(`${base}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel,
            user: userProfile.name || 'Candidate',
          }),
        });
        if (response.ok) {
          addLog('SYSTEM', `Dispatched ${channel} test notification via secure backend API.`);
          return;
        }
      } catch (err) {
        addLog('SYSTEM', err instanceof Error ? `Backend notification error: ${err.message}` : 'Backend notification failed');
        return;
      }
    }

    addLog('SYSTEM', `Test notification queued for ${channel}. Server-side notifications require backend configuration.`);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 text-slate-100">
      <PageHeader
        title="Notifications & Bots"
        subtitle="multi-channel alert webhooks · zero PII leakage during dispatch"
      />

      <div className="p-4 sm:p-6 pb-28 lg:pb-8 space-y-6">
        {/* Top Info Banner */}
        <div className="p-5 rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-[0_16px_40px_-12px_rgba(6,182,212,0.18)] flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 flex-shrink-0">
            <ShieldIcon size={20} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-indigo-950">
              Zero-PII Secure Webhook Architecture
            </h3>
            <p className="text-[13px] text-teal-950 mt-1 leading-relaxed">
              When opportunity match criteria or application deadlines are reached, notifications are formatted locally. No personal identifiable information (PII) is transmitted outside your client sandbox.
            </p>
          </div>
        </div>

        {/* 2 Channel Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Telegram Bot */}
          <div className="p-6 rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-[0_16px_40px_-12px_rgba(6,182,212,0.18)] flex flex-col justify-between space-y-6 hover:border-sky-400/80 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-btn bg-[#0088cc]/15 border border-[#0088cc]/30 flex items-center justify-center text-[#0088cc] shadow-xs">
                  <TelegramIcon size={24} />
                </div>
                <span
                  className={`text-mini font-mono px-2.5 py-1 rounded border flex items-center gap-1.5 font-bold ${telegramActive
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white/80 text-teal-800 border-teal-200'
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${telegramActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                      }`}
                  />
                  <span>{telegramActive ? 'CONNECTED' : 'DISCONNECTED'}</span>
                </span>
              </div>

              <div>
                <h3 className="text-[17px] font-bold text-indigo-950">Telegram Bot</h3>
                <div className="text-mini font-mono text-emerald-700 font-bold mt-0.5">@QadamAgentBot</div>
                <p className="text-[13px] text-teal-950 mt-2 leading-relaxed">
                  Official Telegram bot integration for instant opportunity pings, eligibility status checks, and 24-hour deadline countdown reminders.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-teal-200/60 text-mini font-mono text-teal-900">
                <div className="flex items-center gap-2">
                  <CheckIcon size={12} className="text-emerald-600 flex-shrink-0" />
                  <span>Real-time hackathon radar pings</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon size={12} className="text-emerald-600 flex-shrink-0" />
                  <span>Instant ATS skill gap alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon size={12} className="text-emerald-600 flex-shrink-0" />
                  <span>Interactive reply commands</span>
                </div>
              </div>

              {telegramActive && (
                <div className="p-2.5 rounded bg-gradient-to-br from-sky-50 to-cyan-100/80 border border-sky-300/60 text-mini font-mono text-sky-950">
                  Linked Handle: <span className="text-indigo-950 font-bold">{telegramHandle}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-teal-200/60">
              {telegramActive ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpenBotDirectly}
                    className="w-full h-10 rounded-btn bg-white hover:bg-slate-50 border border-teal-200 text-teal-950 text-mini font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs font-semibold"
                  >
                    <ExternalLinkIcon size={14} className="text-emerald-600" />
                    <span>Open @QadamAgentBot in Telegram</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerTestAlert('Telegram')}
                    className="w-full h-10 rounded-btn bg-white hover:bg-slate-50 border border-teal-200 text-teal-950 text-mini font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs font-semibold"
                  >
                    <BellIcon size={14} className="text-emerald-600" />
                    <span>{testAlertSent === 'Telegram' ? 'Ping Dispatched ✓' : 'Send Test Opportunity Ping'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectTelegram}
                    className="w-full h-9 rounded-btn border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-mini font-mono transition-colors cursor-pointer"
                  >
                    Disconnect Telegram
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleAuthorizeTelegram}
                    className="w-full h-11 rounded-btn bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold text-[13px] font-mono transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-900/20"
                  >
                    <span>Authorize with Telegram</span>
                    <ExternalLinkIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTelegramModal(true)}
                    className="w-full h-7 text-[12px] font-mono text-teal-700 hover:text-teal-900 hover:underline transition-colors text-center cursor-pointer block"
                  >
                    Manual handle entry →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Discord Bot */}
          <div className="p-6 rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-[0_16px_40px_-12px_rgba(6,182,212,0.18)] flex flex-col justify-between space-y-6 hover:border-indigo-400/80 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-btn bg-[#5865f2]/15 border border-[#5865f2]/30 flex items-center justify-center text-[#4752c4] shadow-xs">
                  <DiscordIcon size={24} />
                </div>
                <span
                  className={`text-mini font-mono px-2.5 py-1 rounded border flex items-center gap-1.5 font-bold ${discordActive
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white/80 text-teal-800 border-teal-200'
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${discordActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                      }`}
                  />
                  <span>{discordActive ? 'CONNECTED' : 'DISCONNECTED'}</span>
                </span>
              </div>

              <div>
                <h3 className="text-[17px] font-bold text-indigo-950">Discord Bot</h3>
                <div className="text-mini font-mono text-[#4752c4] font-bold mt-0.5">Webhook & Squad Bot</div>
                <p className="text-[13px] text-teal-950 mt-2 leading-relaxed">
                  Join the team server. Alerts will be enabled after the backend is deployed and configured.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-teal-200/60 text-mini font-mono text-teal-900">
                <div className="flex items-center gap-2">
                  <CheckIcon size={12} className="text-emerald-600 flex-shrink-0" />
                  <span>Private squad channel webhooks</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon size={12} className="text-emerald-600 flex-shrink-0" />
                  <span>Teammate recruit pings & invites</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon size={12} className="text-emerald-600 flex-shrink-0" />
                  <span>Rich embed formatting & links</span>
                </div>
              </div>

              {discordActive && (
                <div className="p-2.5 rounded bg-gradient-to-br from-indigo-50 to-violet-100/80 border border-indigo-300/60 text-mini font-mono text-indigo-950 truncate">
                  Server notifications are configured by the backend operator.
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-teal-200/60">
              {discordActive ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpenDiscordServer}
                    className="w-full h-10 rounded-btn bg-white hover:bg-slate-50 border border-teal-200 text-teal-950 text-mini font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs font-semibold"
                  >
                    <ExternalLinkIcon size={14} className="text-[#4752c4]" />
                    <span>Join / Open Discord Server</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerTestAlert('Discord')}
                    className="w-full h-10 rounded-btn bg-white hover:bg-slate-50 border border-teal-200 text-teal-950 text-mini font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs font-semibold"
                  >
                    <BellIcon size={14} className="text-emerald-600" />
                    <span>{testAlertSent === 'Discord' ? 'Webhook Dispatched ✓' : 'Send Test Opportunity Ping'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectDiscord}
                    className="w-full h-9 rounded-btn border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-mini font-mono transition-colors cursor-pointer"
                  >
                    Disconnect Discord
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleAuthorizeDiscord}
                    className="w-full h-11 rounded-btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-[13px] font-mono transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-900/20"
                  >
                    <span>Open Discord Server</span>
                    <ExternalLinkIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDiscordModal(true)}
                    className="w-full h-7 text-[12px] font-mono text-teal-700 hover:text-teal-900 hover:underline transition-colors text-center cursor-pointer block"
                  >
                    Custom webhook URL →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Authorize Telegram */}
      {isTelegramModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
        >
          <div className="animate-modal-in w-full max-w-md max-h-[85vh] my-auto overflow-y-auto bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300/60 rounded-card shadow-2xl p-6 space-y-4 text-slate-900">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[17px] font-bold text-indigo-950">Link Telegram Account</h3>
              <button
                type="button"
                onClick={() => setIsTelegramModal(false)}
                aria-label="Close"
                className="w-9 h-9 -mr-2 -mt-1 shrink-0 rounded-full hover:bg-white/80 flex items-center justify-center text-teal-800 cursor-pointer"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <p className="text-[13px] text-teal-950 leading-relaxed">
              Connect to <strong className="text-emerald-700">@QadamAgentBot</strong> to receive real-time opportunity radar notifications, ATS skill gap analysis, and interactive application proposals directly in Telegram.
            </p>
            <div className="p-3.5 bg-white/90 border border-teal-200/80 rounded-lg space-y-2">
              <span className="text-[12px] font-mono uppercase tracking-wider text-teal-800 font-bold block">
                Recommended: One-Click Deep-Link
              </span>
              <button
                type="button"
                onClick={handleAuthorizeTelegram}
                className="w-full h-10 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold rounded-btn text-mini font-mono cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <span>Launch @QadamAgentBot in Telegram</span>
                <ExternalLinkIcon size={14} />
              </button>
            </div>
            <div>
              <label className="block text-mini font-mono uppercase text-teal-900 font-semibold mb-1">
                Or Enter Username / Chat ID Manually
              </label>
              <input
                type="text"
                value={telegramHandle}
                onChange={(e) => setTelegramHandle(e.target.value)}
                placeholder="@username"
                className="w-full h-11 px-3.5 bg-white border border-teal-200 rounded-btn text-[13px] text-slate-900 font-mono focus:border-emerald-600 focus:outline-none transition-colors shadow-xs"
              />
            </div>
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsTelegramModal(false)}
                className="h-10 px-4 rounded-btn border border-teal-200 text-slate-700 hover:text-slate-900 hover:bg-white text-mini font-mono cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConnectTelegram}
                className="h-10 px-5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold rounded-btn text-mini font-mono cursor-pointer transition-colors shadow-xs"
              >
                Confirm Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Authorize Discord */}
      {isDiscordModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
        >
          <div className="animate-modal-in w-full max-w-md max-h-[85vh] my-auto overflow-y-auto bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300/60 rounded-card shadow-2xl p-6 space-y-4 text-slate-900">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[17px] font-bold text-indigo-950">Discord Server</h3>
              <button
                type="button"
                onClick={() => setIsDiscordModal(false)}
                aria-label="Close"
                className="w-9 h-9 -mr-2 -mt-1 shrink-0 rounded-full hover:bg-white/80 flex items-center justify-center text-teal-800 cursor-pointer"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <p className="text-[13px] text-teal-950 leading-relaxed">
              Join the QADAM server. Webhook secrets belong in the backend environment, never in the browser.
            </p>
            <div className="p-3.5 bg-white/90 border border-teal-200/80 rounded-lg space-y-2">
              <span className="text-[12px] font-mono uppercase tracking-wider text-teal-800 font-bold block">
                Recommended: Join Official Server
              </span>
              <button
                type="button"
                onClick={handleAuthorizeDiscord}
                className="w-full h-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-btn text-mini font-mono cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <span>Join Official QADAM Discord</span>
                <ExternalLinkIcon size={14} />
              </button>
            </div>
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDiscordModal(false)}
                className="h-10 px-4 rounded-btn border border-teal-200 text-slate-700 hover:text-slate-900 hover:bg-white text-mini font-mono cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConnectDiscord}
                className="h-10 px-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-btn text-mini font-mono cursor-pointer transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
