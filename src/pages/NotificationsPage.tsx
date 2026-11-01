import React from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { CheckIcon, ShieldIcon, ExternalLinkIcon, TelegramIcon, DiscordIcon } from '../components/Icons';

// The two QADAM bots, described as they really work: they answer commands. Linking a web account
// to a bot is not built, so this page has no connection status and no sign-in step.

const BOT_USERNAME = 'QadamAgentBot';
const TELEGRAM_URL = `https://t.me/${BOT_USERNAME}?start=qadam`;
const DISCORD_INVITE_URL = 'https://discord.gg/A4rxRGx4Vt';

const card =
  'p-6 rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-[0_16px_40px_-12px_rgba(6,182,212,0.18)] flex flex-col justify-between space-y-6 transition-all';

const Feature: React.FC<{ command: string; text: string }> = ({ command, text }) => (
  <div className="flex items-start gap-2">
    <CheckIcon size={12} className="text-emerald-600 flex-shrink-0 mt-1" />
    <span>
      <span className="font-bold text-indigo-950">{command}</span> {text}
    </span>
  </div>
);

export const NotificationsPage: React.FC = () => {
  const { addLog } = useApp();

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 text-slate-100">
      <PageHeader title="Notifications & Bots" subtitle="Telegram and Discord bots for the QADAM radar" />

      <div className="p-4 sm:p-6 pb-28 lg:pb-8 space-y-6">
        <div className="p-5 rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-[0_16px_40px_-12px_rgba(6,182,212,0.18)] flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 flex-shrink-0">
            <ShieldIcon size={20} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-indigo-950">Your profile stays in your browser</h3>
            <p className="text-[13px] text-teal-950 mt-1 leading-relaxed">
              The bots show the public radar and write application drafts. This site does not send your profile or your CV to Telegram or Discord.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`${card} hover:border-sky-400/80`}>
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-btn bg-[#0088cc]/15 border border-[#0088cc]/30 flex items-center justify-center text-[#0088cc] shadow-xs">
                <TelegramIcon size={24} />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-indigo-950">Telegram Bot</h3>
                <div className="text-mini font-mono text-emerald-700 font-bold mt-0.5">@{BOT_USERNAME}</div>
                <p className="text-[13px] text-teal-950 mt-2 leading-relaxed">
                  Ask the bot for the current radar and an application draft, right in Telegram. Send /subscribe and it also writes to you once a day at 09:00 Astana time when something new appears, and reminds you before the deadline of the listings you track.
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t border-teal-200/60 text-mini font-mono text-teal-900">
                <Feature command="/radar" text="current hackathons, grants and internships, with a Track button" />
                <Feature command="/subscribe" text="a daily note when new listings appear" />
                <Feature command="/tracking" text="reminders 7, 3 and 1 day before a deadline" />
                <Feature command="/draft" text="an application draft for the top opportunity" />
              </div>
            </div>
            <div className="pt-4 border-t border-teal-200/60">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => addLog('SYSTEM', `Opened @${BOT_USERNAME} in Telegram.`)}
                className="w-full h-11 rounded-btn bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold text-[13px] font-mono transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20"
              >
                <span>Open the bot in Telegram</span>
                <ExternalLinkIcon size={14} />
              </a>
            </div>
          </div>

          <div className={`${card} hover:border-indigo-400/80`}>
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-btn bg-[#5865f2]/15 border border-[#5865f2]/30 flex items-center justify-center text-[#5865f2] shadow-xs">
                <DiscordIcon size={24} />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-indigo-950">Discord Bot</h3>
                <div className="text-mini font-mono text-[#4752c4] font-bold mt-0.5">QADAM Discord server</div>
                <p className="text-[13px] text-teal-950 mt-2 leading-relaxed">
                  Join the QADAM server and ask the bot in chat. The team posts the top radar opportunity to the announcement channel.
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t border-teal-200/60 text-mini font-mono text-teal-900">
                <Feature command="!radar" text="current hackathons, grants and internships" />
                <Feature command="!draft <number>" text="an application draft, sent to your DMs" />
                <Feature command="!gaps, !privacy" text="how the site works and how data is handled" />
              </div>
            </div>
            <div className="pt-4 border-t border-teal-200/60">
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => addLog('SYSTEM', 'Opened the QADAM Discord invite.')}
                className="w-full h-11 rounded-btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-[13px] font-mono transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-900/20"
              >
                <span>Join the QADAM Discord</span>
                <ExternalLinkIcon size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
