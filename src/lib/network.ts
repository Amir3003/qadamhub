import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createNeonClient } from "@neon/neon-js/supabase";
import { createClient as createNeonNativeClient } from "@neon/neon-js";

const neonUrl = import.meta.env.VITE_NEON_URL?.trim();
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const networkClient: SupabaseClient | null = neonUrl
  ? (createNeonClient(neonUrl, { auth: { allowAnonymous: true } }) as unknown as SupabaseClient)
  : url && key
    ? createSupabaseClient(url, key, {
        auth: {
          // Persist the network sign-in on this device until the user signs out.
          storage: window.localStorage,
          storageKey: "qadam-network-auth",
          detectSessionInUrl: false,
        },
      })
    : null;

// Neon’s compatibility adapter does not always notify same-tab subscribers.
export async function signOutNetwork() {
  if (!networkClient) return;
  const result = await networkClient.auth.signOut();
  if (result.error) throw result.error;
  window.dispatchEvent(new Event("qadam-network-signed-out"));
}

// The Neon Supabase adapter currently discards errors returned when sending an OTP.
// Use the native method for this step so the UI cannot claim an email was sent on failure.
export async function sendSignInCode(email: string): Promise<void> {
  if (neonUrl) {
    // The SDK bundles the OTP plugin at runtime, but its vanilla client type omits it.
    const auth = createNeonNativeClient(neonUrl).auth as unknown as {
      emailOtp: { sendVerificationOtp: (args: { email: string; type: 'sign-in' }) => Promise<{ error: { message?: string } | null }> };
    };
    const { error } = await auth.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
    if (error) throw new Error(error.message || 'Unable to send the sign-in code.');
    return;
  }
  if (!networkClient) throw new Error('The account service is not configured.');
  checked(await networkClient.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }));
}

export interface NetworkProfile {
  id: string;
  name: string;
  role: string;
  university: string;
  location: string;
  bio: string;
  skills: string[];
  goals: string[];
  is_public: boolean;
  last_seen_at?: string | null;
}
export interface NetworkTeam {
  id: string;
  owner_id: string;
  name: string;
  opportunity_title: string;
  created_at: string;
}
export interface NetworkMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  team_id: string | null;
  content: string;
  created_at: string;
}
export const emptyNetworkProfile = (id: string): NetworkProfile => ({
  id,
  name: "",
  role: "Student / Learner",
  university: "",
  location: "",
  bio: "",
  skills: [],
  goals: [],
  is_public: true,
});
export interface FriendRequest {
  sender_id: string;
  recipient_id: string;
  created_at: string;
}

// Presence comes from a heartbeat every minute (networkInbox); two missed beats mean offline.
const ONLINE_WINDOW_MS = 150_000;
export const isOnline = (profile?: { last_seen_at?: string | null } | null) =>
  Boolean(profile?.last_seen_at && Date.now() - new Date(profile.last_seen_at).getTime() < ONLINE_WINDOW_MS);

export function lastSeenLabel(profile?: { last_seen_at?: string | null } | null) {
  if (!profile?.last_seen_at) return "Offline";
  if (isOnline(profile)) return "Online";
  const minutes = Math.round((Date.now() - new Date(profile.last_seen_at).getTime()) / 60000);
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  return `Active ${Math.round(hours / 24)}d ago`;
}

export function checked<T>(result: {
  data: T;
  error: { message: string } | null;
}): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
export function inviteUrl(code: string) {
  // Fragment prevents invitation codes being sent to web server access logs/referrers.
  return `${window.location.origin}/join#code=${encodeURIComponent(code)}`;
}
export function invitationCode() {
  const code =
    new URLSearchParams(window.location.hash.slice(1)).get("code") ||
    new URLSearchParams(window.location.search).get("code");
  return code && /^[a-f0-9]{64}$/.test(code) ? code : null;
}
