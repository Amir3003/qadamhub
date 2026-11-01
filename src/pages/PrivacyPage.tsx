import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldIcon, CheckIcon } from '../components/Icons';
import { LegalSection, LegalShell, OperatorBlock, legalCard } from '../components/legal/LegalShell';
import { CookieSettingsButton } from '../components/legal/Consent';
import { DataRequestForm } from '../components/legal/DataRequestForm';
import { legal } from '../lib/legal';

// Keep this page in sync with what the app actually does. Update it whenever
// a feature starts sending user data anywhere.
const STORED_LOCALLY = [
  ['Profile', 'Name, email, university, major, city, role, skills and goals you enter.'],
  ['CV text', 'The resume text you paste in Profile or during registration.'],
  ['Password', 'Saved in this browser only. It is not a server account and is not encrypted, so do not reuse a password from other services.'],
  ['Agent Memory', 'The directives you write, saved as MEMORY.md.'],
  ['Teammates and teams', 'People you add manually, teams you create and local chat messages.'],
  ['Progress', 'Verified skills, quiz scores, application checklists and the status you set on opportunities.'],
  ['Notification settings', 'Your Telegram handle or Discord webhook, if you add them.'],
  ['Sign-in session', 'After you sign in with an email code, a session token keeps you signed in on this device until you log out.'],
  ['Your analytics choice', 'Whether you accepted or declined analytics, so the banner does not reappear.'],
];

const SENT = [
  ['Your institution account', 'You sign in with your email (a one-time code) and join your cohort with an invite code from your institution. Your email and cohort membership are stored on our server.'],
  ['What your institution staff see', 'Your name, track, how complete your profile is (a percentage), your email, and the opportunities you marked as saved, preparing or applied, with their deadlines. Staff do not see your CV text, skills details, messages or anything else in your profile.'],
  ['Teammates and Network', 'If you create a network profile, its name, role, university, city, bio, skills and goals are stored on our server. A public profile (the default, you can switch it off) is visible to other signed-in users. Connections, friend requests, teams and messages are stored so the people involved can see them.'],
  ['Sign-in emails', 'The one-time sign-in code is emailed to you through our email provider.'],
  ['Loading opportunities', 'The app downloads the public opportunity list. This request contains none of your data.'],
  ['Hosting', 'Like any website, our hosting provider receives your IP address, browser type and the pages you open, to deliver the site and protect it from abuse.'],
  ['Fonts', 'The site loads its fonts from Google Fonts, so your browser sends your IP address to Google when the page opens.'],
  ['Analytics, only if you accept', 'Vercel Web Analytics counts page views. It sets no cookies and is not used for advertising. If you decline, it is never loaded.'],
  ['Error reports', 'If the app crashes, a technical error report (error message, page address, browser type) is sent to Sentry so we can fix it. It does not include your name, email, IP address, CV or profile fields.'],
  ['Telegram and Discord bots', 'If you message our bots, the messenger delivers your messages under its own privacy policy. If you link your profile, the Telegram bot keeps your chat id, name and username in memory to personalize replies; it is cleared when the bot restarts. If you send /subscribe or tap Track in the Telegram bot, it also saves your Telegram chat id and the listings you track on its server, only to send you the messages you asked for (a daily note about new listings and reminders before deadlines). /unsubscribe deletes all of it. Bot replies use only the public opportunity list.'],
  ['Test notification', 'Only if a QADAM server is configured: the channel name and your first name are sent so the bot can message you.'],
  ['Pilot request form', 'If an institution requests a pilot, the details typed into the form (institution, name, email, phone, city, cohort size, message) are stored so we can reply. They are used for nothing else.'],
  ['Opportunity suggestions', 'If you suggest an opportunity, its title, link, type, deadline and your note are stored so we can review it. If you are signed in, your account id is attached.'],
  ['Feedback and ratings', 'If you send feedback or a star rating from the Feedback button, your message or comment, the type you chose, the page path (without any query or code), your browser type and, if you are signed in to the network, your account id are stored so we can fix and improve the product. No profile fields or CV text are sent.'],
  ['Data requests and support', 'A data request from this page goes to our team chat; a support ticket opens your own email app. We use them only to answer you.'],
  ['Official site links', 'Opening an organizer site is a normal visit to that site. Its own privacy policy applies.'],
];

const PROVIDERS = [
  ['Vercel', 'hosting, the data request and feedback forms and, if you accept, analytics'],
  ['Supabase', 'database and email sign-in for accounts, cohorts, the network and feedback'],
  ['Google', 'sending sign-in emails (Gmail) and serving fonts (Google Fonts)'],
  ['Sentry', 'crash reports'],
  ['Oracle Cloud', 'the server that runs our Telegram and Discord bots'],
  ['Telegram, Discord', 'delivering bot messages, only if you use the bots'],
];

export const PrivacyPage: React.FC = () => {
  const { hash } = useLocation();

  // Links like /privacy#data-request open the page at that section.
  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (target) window.setTimeout(() => target.scrollIntoView({ block: 'start' }), 50);
  }, [hash]);

  return (
    <LegalShell path="/privacy"
      title="Privacy & Your Data"
      intro="What QADAM Hub saves, what leaves your device, who processes it and how to get it deleted."
    >
      <OperatorBlock />

      <div className={`${legalCard} flex items-start gap-3`}>
        <ShieldIcon size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
        <p className="text-[14px] leading-relaxed text-slate-800">
          Your profile and CV stay in your browser's local storage on this device. Our server keeps your email, your
          cohort, a short progress summary that your institution staff can see, and your network profile if you create
          one. Your CV and profile are <strong>not</strong> sent to AI models. The AI scan that finds opportunities
          reads public web pages only.
        </p>
      </div>

      <section className={`${legalCard} space-y-3`}>
        <h2 className="text-[17px] font-bold text-indigo-950">Saved on this device</h2>
        <ul className="space-y-2.5">
          {STORED_LOCALLY.map(([title, text]) => (
            <li key={title} className="flex items-start gap-2.5">
              <CheckIcon size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-[13px] leading-relaxed">
                <strong className="text-slate-900">{title}.</strong> <span className="text-slate-600">{text}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-slate-500 leading-relaxed pt-1">
          Anyone who uses this browser profile can see this data. On a shared computer, log out when you finish.
        </p>
      </section>

      <section className={`${legalCard} space-y-3`}>
        <h2 className="text-[17px] font-bold text-indigo-950">What leaves your device</h2>
        <ul className="space-y-2.5">
          {SENT.map(([title, text]) => (
            <li key={title} className="text-[13px] leading-relaxed">
              <strong className="text-slate-900">{title}.</strong> <span className="text-slate-600">{text}</span>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-slate-700 leading-relaxed pt-1">
          QADAM Hub does not use advertising trackers and does not sell your data.
        </p>
      </section>

      <LegalSection id="cookies" title="Cookies and local storage">
        <p>
          QADAM Hub itself sets no cookies. It uses your browser's local storage for the items listed under "Saved on
          this device". The sign-in session and your profile are needed for the app to work, so they do not require
          consent. Analytics is optional and runs only after you press Accept.
        </p>
        <p>
          You can change or withdraw your analytics choice at any time:{' '}
          <CookieSettingsButton className="font-semibold text-emerald-700 underline underline-offset-2" />.
        </p>
      </LegalSection>

      <LegalSection title="Why we use your data">
        <ul className="list-disc pl-5 space-y-1">
          <li>To provide the service you or your institution signed up for: accounts, cohorts, the network and reminders.</li>
          <li>To keep the site running and secure: hosting logs and crash reports.</li>
          <li>To answer pilot requests, suggestions and data requests.</li>
          <li>Analytics only with your consent, which you can withdraw at any time.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Service providers and transfers">
        <p>These companies process data for us, each only for the purpose shown:</p>
        <ul className="list-disc pl-5 space-y-1">
          {PROVIDERS.map(([name, purpose]) => (
            <li key={name}>
              <strong className="text-slate-900">{name}:</strong> {purpose}.
            </li>
          ))}
        </ul>
        <p>
          Their servers may be outside the country where you live. We do not sell or rent personal data
          to anyone.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          Your account, cohort membership, progress summary and network data stay until you ask us to delete them. Staff
          can remove you from a cohort at any time. Pilot requests, suggestions and data requests are kept as long as
          needed to answer them and to show they were handled. Data on your device stays until you log out, reset it
          or clear your browser. Hosting, analytics and crash report retention is set by those providers.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          You can ask for a copy of your personal data, have it corrected or deleted, withdraw consent and object to
          processing, under the personal data law that applies to you, for example the GDPR in the European Union and
          the United Kingdom, the CCPA and CPRA in California, PIPEDA in Canada, the APPI in Japan or the PIPA in South
          Korea. You can also complain to your data protection authority.
        </p>
      </LegalSection>

      <section className={`${legalCard} space-y-3`}>
        <h2 className="text-[17px] font-bold text-indigo-950">How to delete your data</h2>
        <ol className="space-y-2 text-[13px] text-slate-700 leading-relaxed list-decimal pl-5">
          <li>
            <strong>Settings → Reset Local Data</strong> erases your profile, CV, memory, teammates and chats.
          </li>
          <li>
            <strong>Log Out</strong> does the same and returns you to the start page.
          </li>
          <li>Clearing this site's data in your browser settings removes everything stored on this device.</li>
          <li>
            To delete your account, cohort membership, progress summary and network data from our server, use the form
            below or email us from the address you signed in with.
          </li>
        </ol>
        <p className="text-[12px] text-slate-500">Deleted data cannot be recovered.</p>
      </section>

      <LegalSection id="data-request" title="Data request">
        <p>
          Ask for a copy of your data, its deletion or a correction. You can also write to{' '}
          <a href={`mailto:${legal.contactEmail}`} className="text-emerald-700 font-semibold hover:underline">
            {legal.contactEmail}
          </a>
          .
        </p>
        <DataRequestForm />
      </LegalSection>

      <LegalSection title="Children">
        <p>
          QADAM Hub is made for learners aged 16 and over who join through their institution. We do not knowingly
          collect data from children under 16. If you are under 18, ask a parent or guardian before signing up where
          the law requires their consent. A parent or guardian can send a data request for their child.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>We update this page before any change in how we use data goes live, and change the date at the top.</p>
      </LegalSection>
    </LegalShell>
  );
};

export default PrivacyPage;
