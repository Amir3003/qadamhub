import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate, useSearchParams } from "react-router-dom";
import { NetworkAccess } from "../components/NetworkAccess";
import {
  checked,
  emptyNetworkProfile,
  inviteUrl,
  isOnline,
  lastSeenLabel,
  networkClient,
  type FriendRequest,
  type NetworkMessage,
  type NetworkProfile,
  type NetworkTeam,
} from "../lib/network";
import {
  markChannelRead,
  refreshInbox,
  useNetworkInbox,
  type ChannelKey,
} from "../lib/networkInbox";
import { USER_ROLES } from "../db/userProfile";
import {
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  LogOutIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
} from "../components/Icons";

type Tab = "discover" | "chats" | "requests" | "profile";
const TABS: { id: Tab; label: string; icon: typeof UserIcon }[] = [
  { id: "discover", label: "Discover", icon: SearchIcon },
  { id: "chats", label: "Chats & Groups", icon: MessageSquareIcon },
  { id: "requests", label: "Requests", icon: UserPlusIcon },
  { id: "profile", label: "My Profile", icon: UserIcon },
];

type Relation = "self" | "friend" | "outgoing" | "incoming" | "none";

const button =
  "h-10 px-4 rounded-btn bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-mini font-mono font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2";
const ghostButton =
  "h-10 px-4 rounded-btn bg-white hover:bg-slate-50 border border-teal-200 text-teal-950 text-mini font-mono font-semibold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2";
const linkButton =
  "text-mini font-mono text-teal-800 hover:text-emerald-700 underline cursor-pointer disabled:opacity-50";
const dangerLink =
  "text-mini font-mono text-rose-600 hover:text-rose-700 underline cursor-pointer disabled:opacity-50";
const input =
  "w-full h-11 px-3.5 bg-white border border-teal-200/90 rounded-xl text-base md:text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none shadow-xs transition-colors";
const label =
  "block space-y-1 text-mini font-mono uppercase tracking-wider text-teal-900 font-semibold";
const panel =
  "rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-[0_16px_40px_-12px_rgba(6,182,212,0.18)] p-5 sm:p-6 text-slate-900";
const heading = "text-[17px] font-bold text-indigo-950";

const AVATAR_COLORS = [
  "from-emerald-400 to-teal-600",
  "from-indigo-400 to-violet-600",
  "from-amber-400 to-orange-500",
  "from-cyan-400 to-sky-600",
  "from-rose-400 to-pink-600",
  "from-lime-400 to-emerald-600",
];

function Avatar({
  name,
  seed,
  size = 40,
  group = false,
  online = false,
}: {
  name: string;
  seed: string;
  size?: number;
  group?: boolean;
  online?: boolean;
}) {
  const hash = [...seed].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const dot = Math.max(10, Math.round(size * 0.26));
  return (
    <span className="relative flex-shrink-0 inline-flex" style={{ width: size, height: size }} aria-hidden="true">
      <span
        className={`w-full h-full inline-flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[hash % AVATAR_COLORS.length]} text-white font-bold shadow-sm ${group ? "rounded-xl" : "rounded-full"}`}
        style={{ fontSize: size * 0.38 }}
      >
        {group ? <UsersIcon size={size * 0.45} /> : initials || "?"}
      </span>
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-emerald-500 ring-2 ring-white"
          style={{ width: dot, height: dot }}
        />
      )}
    </span>
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

// Centered dialog with backdrop click-to-close and bounded, scrollable height.
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="animate-modal-in w-full max-w-md max-h-[85vh] my-auto overflow-y-auto rounded-card bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300/60 shadow-2xl text-slate-900">
        <div className="sticky top-0 z-10 px-5 py-3 border-b border-teal-200/80 bg-white/85 backdrop-blur flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-indigo-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
            aria-label="Close"
          >
            <CloseIcon size={15} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

type ConfirmRequest = {
  title: string;
  message: string;
  action: string;
  onConfirm: () => void;
};

// In-app replacement for window.confirm. Sits above Modal; closes only through its buttons.
function ConfirmDialog({ request, onClose }: { request: ConfirmRequest; onClose: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="w-full max-w-sm my-auto rounded-card bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300/60 shadow-2xl text-slate-900 p-6">
        <h2 id="confirm-title" className="text-[16px] font-bold text-indigo-950">
          {request.title}
        </h2>
        <p id="confirm-message" className="mt-2 text-[13px] leading-relaxed text-slate-600">
          {request.message}
        </p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" className={ghostButton} onClick={onClose}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="h-10 px-4 rounded-btn bg-rose-600 hover:bg-rose-500 text-white text-mini font-mono font-semibold shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center"
            onClick={() => {
              onClose();
              request.onConfirm();
            }}
          >
            {request.action}
          </button>
        </div>
      </div>
    </div>
  );
}

export const NetworkPage: React.FC = () => (
  <NetworkAccess>{(user) => <NetworkWorkspace user={user} />}</NetworkAccess>
);

export function NetworkWorkspace({
  user,
  joinCode,
}: {
  user: User;
  joinCode?: string;
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inbox = useNetworkInbox();
  const [profile, setProfile] = useState<NetworkProfile>(() =>
    emptyNetworkProfile(user.id),
  );
  const [savedProfile, setSavedProfile] = useState<NetworkProfile | null>(null);
  const [profiles, setProfiles] = useState<NetworkProfile[]>([]);
  const [connections, setConnections] = useState<string[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [requestsReady, setRequestsReady] = useState(true);
  const [teams, setTeams] = useState<NetworkTeam[]>([]);
  const [members, setMembers] = useState<
    { team_id: string; user_id: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [skills, setSkills] = useState("");
  const [goals, setGoals] = useState("");
  const [link, setLink] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [preview, setPreview] = useState<{
    creator: string;
    team: string | null;
    expires_at: string;
  } | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [channel, setChannel] = useState<{
    type: "team" | "dm";
    id: string;
    name: string;
  } | null>(null);
  const [messages, setMessages] = useState<NetworkMessage[]>([]);
  const [chatError, setChatError] = useState("");
  const [text, setText] = useState("");
  const [chatFilter, setChatFilter] = useState("");
  const [viewing, setViewing] = useState<string | null>(null);
  const [groupModal, setGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupGoal, setGroupGoal] = useState("");
  const [groupPicks, setGroupPicks] = useState<string[]>([]);
  const [membersModal, setMembersModal] = useState<string | null>(null);
  const [confirmBox, setConfirmBox] = useState<ConfirmRequest | null>(null);
  const closeConfirm = useCallback(() => setConfirmBox(null), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const tabParam = searchParams.get("tab") as Tab | null;
  const tab: Tab = !savedProfile
    ? "profile"
    : TABS.some((t) => t.id === tabParam)
      ? (tabParam as Tab)
      : "discover";
  const selectTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
    setNotice("");
    setError("");
  };

  const reload = useCallback(async () => {
    const db = networkClient!;
    const results = await Promise.all([
      db.from("network_profiles").select("*").eq("id", user.id).maybeSingle(),
      db.from("network_profiles").select("*").order("name").limit(200),
      db.from("network_connections").select("user_a,user_b"),
      db
        .from("network_teams")
        .select("*")
        .order("created_at", { ascending: false }),
      db.from("network_members").select("team_id,user_id"),
    ]);
    const own = checked(results[0]) as NetworkProfile | null;
    setSavedProfile(own);
    setProfiles((checked(results[1]) || []) as NetworkProfile[]);
    setConnections(
      (checked(results[2]) || []).map((c) =>
        c.user_a === user.id ? c.user_b : c.user_a,
      ),
    );
    setTeams((checked(results[3]) || []) as NetworkTeam[]);
    setMembers(checked(results[4]) || []);
    // Friend requests arrive with the social migration; before that the tab explains it.
    const pending = await db
      .from("network_friend_requests")
      .select("sender_id,recipient_id,created_at")
      .order("created_at", { ascending: false });
    setRequestsReady(!pending.error);
    setRequests(!pending.error && Array.isArray(pending.data) ? (pending.data as FriendRequest[]) : []);
    return own;
  }, [user.id]);

  useEffect(() => {
    let alive = true;
    reload()
      .then((own) => {
        if (alive) {
          setProfile(own || emptyNetworkProfile(user.id));
          setSkills(own?.skills.join(", ") || "");
          setGoals(own?.goals.join(", ") || "");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reload, user.id]);

  useEffect(() => {
    if (!joinCode) return;
    let alive = true;
    networkClient!
      .rpc("network_preview_invite", { invite_code: joinCode })
      .then((result) => {
        if (!alive) return;
        if (result.error) setError(result.error.message);
        else setPreview(result.data);
      });
    return () => {
      alive = false;
    };
  }, [joinCode]);

  // Refresh people, requests and presence while visible.
  useEffect(() => {
    if (!savedProfile) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        reload().catch((e) => setError(e.message));
    }, 15000);
    return () => window.clearInterval(timer);
  }, [reload, !!savedProfile]);

  // A new request, or a message from a new friend or group, refreshes the lists right away.
  useEffect(() => {
    if (!savedProfile) return;
    const incoming = requests.filter((r) => r.recipient_id === user.id).length;
    const unknown = Object.keys(inbox.channels).some((key) => {
      const [type, id] = key.split(":");
      return type === "dm" ? !connections.includes(id) : !teams.some((t) => t.id === id);
    });
    if (unknown || inbox.incomingRequests !== incoming) reload().catch(() => undefined);
  }, [inbox.channels, inbox.incomingRequests]);

  const channelKey: ChannelKey | null = channel ? (`${channel.type}:${channel.id}` as ChannelKey) : null;

  useEffect(() => {
    setMessages([]);
    setChatError("");
    setText("");
    stickToBottom.current = true;
    if (!channel) return;
    let alive = true;
    const load = async () => {
      let query = networkClient!
        .from("network_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(100);
      if (channel.type === "team") query = query.eq("team_id", channel.id);
      else
        query = query
          .is("team_id", null)
          .or(
            `and(sender_id.eq.${user.id},recipient_id.eq.${channel.id}),and(sender_id.eq.${channel.id},recipient_id.eq.${user.id})`,
          );
      const rows = checked(await query) as NetworkMessage[];
      if (alive) {
        setMessages([...rows].reverse());
        setChatError("");
      }
    };
    const refresh = () =>
      load().catch((e) => {
        if (alive) setChatError(e.message);
      });
    refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [channel?.id, channel?.type, user.id]);

  // An open chat is read: clear its badge as messages arrive.
  useEffect(() => {
    if (!channelKey || !messages.length || tab !== "chats") return;
    markChannelRead(channelKey, messages[messages.length - 1].created_at);
  }, [channelKey, messages, tab]);

  // Keep the newest message in view unless the user scrolled up to read history.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      const list = (value: string) => [
        ...new Set(
          value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ];
      const safe: NetworkProfile = {
        id: user.id,
        name: profile.name.trim(),
        role: profile.role,
        university: profile.university.trim(),
        location: profile.location.trim(),
        bio: profile.bio.trim(),
        skills: list(skills),
        goals: list(goals),
        is_public: profile.is_public,
      };
      if (safe.skills.length > 30 || safe.goals.length > 20)
        throw new Error("Use up to 30 skills and 20 goals.");
      const firstSave = !savedProfile;
      checked(await networkClient!.from("network_profiles").upsert(safe));
      setProfile(safe);
      await reload();
      setNotice("Network profile saved.");
      if (firstSave && !joinCode) selectTab("discover");
    });
  }

  async function createInvite(team?: NetworkTeam) {
    await run(async () => {
      const code = checked(
        await networkClient!.rpc("network_create_invite", {
          target_team: team?.id || null,
        }),
      );
      setLink(inviteUrl(code));
      setLinkLabel(team ? `Group invite: ${team.name}` : "Friend invite");
      setNotice("Invitation link created. It expires in 7 days.");
    });
  }

  const relationOf = (id: string): Relation => {
    if (id === user.id) return "self";
    if (connections.includes(id)) return "friend";
    if (requests.some((r) => r.sender_id === user.id && r.recipient_id === id)) return "outgoing";
    if (requests.some((r) => r.sender_id === id && r.recipient_id === user.id)) return "incoming";
    return "none";
  };

  const sendRequest = (target: NetworkProfile) =>
    run(async () => {
      const result = checked(
        await networkClient!.rpc("network_send_friend_request", { target: target.id }),
      ) as string;
      await reload();
      refreshInbox();
      setNotice(
        result === "connected"
          ? `You and ${target.name} are now friends.`
          : result === "already"
            ? `You are already friends with ${target.name}.`
            : `Friend request sent to ${target.name}.`,
      );
    });

  const respond = (requester: NetworkProfile | undefined, requesterId: string, accept: boolean) =>
    run(async () => {
      checked(
        await networkClient!.rpc("network_respond_friend_request", {
          requester: requesterId,
          accept,
        }),
      );
      await reload();
      refreshInbox();
      setNotice(
        accept
          ? `You and ${requester?.name || "your new friend"} are now friends.`
          : "Request declined.",
      );
    });

  const cancelRequest = (target: NetworkProfile | undefined, targetId: string) =>
    run(async () => {
      checked(await networkClient!.rpc("network_cancel_friend_request", { target: targetId }));
      await reload();
      setNotice(`Request to ${target?.name || "this person"} cancelled.`);
    });

  const removeFriend = (target: NetworkProfile) =>
    run(async () => {
      checked(
        await networkClient!
          .from("network_connections")
          .delete()
          .eq("user_a", user.id < target.id ? user.id : target.id)
          .eq("user_b", user.id < target.id ? target.id : user.id),
      );
      await reload();
      if (channel?.id === target.id) setChannel(null);
      setNotice(`${target.name} removed from friends.`);
    });

  function sendMessage() {
    if (!channel || !text.trim()) return;
    const current = channel;
    const content = text.trim();
    stickToBottom.current = true;
    run(async () => {
      const row = checked(
        await networkClient!
          .from("network_messages")
          .insert({
            sender_id: user.id,
            content,
            team_id: current.type === "team" ? current.id : null,
            recipient_id: current.type === "dm" ? current.id : null,
          })
          .select()
          .single(),
      ) as NetworkMessage;
      setMessages((prev) =>
        [...prev.filter((m) => m.id !== row.id), row].slice(-100),
      );
      setText("");
      refreshInbox();
    });
  }

  const createGroup = () =>
    run(async () => {
      const teamId = checked(
        await networkClient!.rpc("network_create_team", {
          team_name: groupName.trim(),
          opportunity: groupGoal.trim(),
        }),
      ) as string;
      for (const member of groupPicks) {
        checked(
          await networkClient!.rpc("network_add_team_member", {
            target_team: teamId,
            member,
          }),
        );
      }
      await reload();
      setGroupModal(false);
      setGroupName("");
      setGroupGoal("");
      setGroupPicks([]);
      setChannel({ type: "team", id: teamId, name: groupName.trim() });
      selectTab("chats");
      setNotice("Group created.");
    });

  const addToGroup = (teamId: string, member: string) =>
    run(async () => {
      checked(
        await networkClient!.rpc("network_add_team_member", {
          target_team: teamId,
          member,
        }),
      );
      await reload();
      setNotice(`${nameFor(member)} added to the group.`);
    });

  const profileOf = (id: string) => profiles.find((p) => p.id === id);
  const nameFor = (id: string) =>
    profileOf(id)?.name || (id === user.id ? profile.name : "Teammate");

  const conversations = useMemo(() => {
    const items = [
      ...connections.map((id) => {
        const p = profiles.find((x) => x.id === id);
        return {
          type: "dm" as const,
          id,
          name: p?.name || "Teammate",
          subtitle: p ? [p.role, p.university].filter(Boolean).join(" · ") : "",
          online: isOnline(p),
        };
      }),
      ...teams.map((t) => ({
        type: "team" as const,
        id: t.id,
        name: t.name,
        subtitle: `${members.filter((m) => m.team_id === t.id).length} members`,
        online: false,
      })),
    ].map((item) => ({ ...item, summary: inbox.channels[`${item.type}:${item.id}`] }));
    return items
      .filter((item) => item.name.toLowerCase().includes(chatFilter.toLowerCase()))
      .sort((a, b) =>
        (b.summary?.last.created_at || "").localeCompare(a.summary?.last.created_at || ""),
      );
  }, [connections, profiles, teams, members, inbox.channels, chatFilter]);

  if (loading)
    return (
      <p role="status" className="p-8 text-teal-100 font-mono text-mini text-center">
        Loading shared network...
      </p>
    );

  const people = profiles
    .filter(
      (p) =>
        p.id !== user.id &&
        [p.name, p.role, p.university, p.location, ...p.skills]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)));
  const friends = connections
    .map((id) => profileOf(id))
    .filter((p): p is NetworkProfile => Boolean(p));
  const incoming = requests.filter((r) => r.recipient_id === user.id);
  const outgoing = requests.filter((r) => r.sender_id === user.id);
  const openChat = (type: "dm" | "team", id: string, name: string) => {
    setViewing(null);
    setChannel({ type, id, name });
    selectTab("chats");
  };
  const viewed = viewing ? profileOf(viewing) : undefined;
  const membersTeam = membersModal ? teams.find((t) => t.id === membersModal) : undefined;

  // Primary action for a person, shared by cards, the profile dialog and request lists.
  const RelationActions = ({ p, compact = false }: { p: NetworkProfile; compact?: boolean }) => {
    const relation = relationOf(p.id);
    const size = compact ? "!h-9 !px-3" : "";
    if (relation === "friend")
      return (
        <button className={`${button} ${size}`} onClick={() => openChat("dm", p.id, p.name)}>
          <MessageSquareIcon size={14} />
          Message
        </button>
      );
    if (relation === "outgoing")
      return (
        <button className={`${ghostButton} ${size}`} disabled={busy} onClick={() => cancelRequest(p, p.id)}>
          Requested · Cancel
        </button>
      );
    if (relation === "incoming")
      return (
        <span className="inline-flex gap-2">
          <button className={`${button} ${size}`} disabled={busy} onClick={() => respond(p, p.id, true)}>
            <CheckIcon size={14} />
            Accept
          </button>
          <button className={`${ghostButton} ${size}`} disabled={busy} onClick={() => respond(p, p.id, false)}>
            Decline
          </button>
        </span>
      );
    if (relation === "none")
      return (
        <button
          className={`${button} ${size}`}
          disabled={busy || !requestsReady}
          title={requestsReady ? undefined : "Friend requests are not set up yet"}
          onClick={() => sendRequest(p)}
        >
          <UserPlusIcon size={14} />
          Add friend
        </button>
      );
    return null;
  };

  const requestBadge = inbox.incomingRequests || incoming.length;

  return (
    <div className="relative z-10 p-4 sm:p-6 pb-28 lg:pb-8 space-y-5 max-w-6xl w-full mx-auto">
      {/* Header with account summary and section tabs */}
      <header className={`${panel} !p-4 sm:!p-5 space-y-4`}>
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <button
            type="button"
            onClick={() => savedProfile && selectTab("profile")}
            className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
          >
            <Avatar name={profile.name || user.email || "Me"} seed={user.id} size={44} online />
            <span className="min-w-0">
              <span className="block text-[20px] font-bold text-indigo-950 leading-tight">
                Teammates & Network
              </span>
              <span className="block text-mini font-mono text-teal-800 truncate">
                {profile.name || user.email} · {connections.length} friends · {teams.length} groups
              </span>
            </span>
          </button>
          <button
            className="h-9 px-3 rounded-btn text-mini font-mono text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const result = await networkClient!.auth.signOut();
                if (result.error) throw result.error;
              })
            }
          >
            <LogOutIcon size={13} />
            <span>Sign out of network</span>
          </button>
        </div>
        <nav
          className="flex items-center gap-1.5 p-1 rounded-btn bg-white/70 border border-teal-200/80 overflow-x-auto no-scrollbar max-w-full"
          aria-label="Network sections"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const locked = !savedProfile && t.id !== "profile";
            const count = t.id === "chats" ? inbox.totalUnread : t.id === "requests" ? requestBadge : 0;
            return (
              <button
                key={t.id}
                type="button"
                disabled={locked}
                title={locked ? "Save your network profile first" : undefined}
                onClick={() => selectTab(t.id)}
                className={`h-9 px-3.5 rounded-btn text-mini font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                  active
                    ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold shadow-xs"
                    : "text-teal-900 hover:text-indigo-950 hover:bg-white"
                }`}
              >
                <Icon size={13} />
                <span>{t.label}</span>
                {count > 0 && (
                  <span
                    className={`min-w-[18px] h-[18px] px-1 rounded-full text-[12px] font-bold flex items-center justify-center ${
                      active ? "bg-white text-emerald-700" : "bg-rose-500 text-white"
                    }`}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-btn bg-rose-50 border border-rose-200 text-mini font-mono text-rose-700"
        >
          {error}
          <button
            className="ml-4 underline cursor-pointer"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await reload();
              })
            }
          >
            Retry
          </button>
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="p-3 rounded-btn bg-emerald-50 border border-emerald-200 text-mini font-mono text-emerald-800 flex items-center gap-2"
        >
          <CheckIcon size={13} />
          {notice}
        </p>
      )}

      {joinCode && (
        <section className={`${panel} space-y-3 border-emerald-300`}>
          <h2 className={heading}>Invitation</h2>
          {preview ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar name={preview.team || preview.creator} seed={preview.creator} group={!!preview.team} />
                <p className="text-[13px] text-teal-950 leading-relaxed">
                  <b>{preview.creator}</b> invited you{" "}
                  {preview.team ? <>to join <b>{preview.team}</b></> : "to connect on QADAM"}.
                  Accepting shares your network profile with{" "}
                  {preview.team ? "the group members" : "this person"}.
                </p>
              </div>
              <p className="text-mini font-mono text-teal-800">
                Expires {new Date(preview.expires_at).toLocaleString()}
              </p>
              {accepted ? (
                <button className={button} onClick={() => navigate("/network?tab=chats")}>
                  Open network
                </button>
              ) : (
                <button
                  className={button}
                  disabled={busy || !savedProfile}
                  onClick={() =>
                    run(async () => {
                      checked(
                        await networkClient!.rpc("network_accept_invite", {
                          invite_code: joinCode,
                        }),
                      );
                      await reload();
                      setAccepted(true);
                      setNotice("Invitation accepted. You are now connected.");
                    })
                  }
                >
                  Accept invitation
                </button>
              )}
              {!savedProfile && (
                <p className="text-mini font-mono text-amber-800">
                  Save your network profile below before accepting.
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-teal-950">Checking invitation...</p>
          )}
        </section>
      )}

      {/* ===================== DISCOVER ===================== */}
      {tab === "discover" && (
        <section className="space-y-4">
          <div className={`${panel} !p-4 space-y-3`}>
            <div className="relative">
              <SearchIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search teammates"
                className={`${input} pl-10`}
                placeholder="Search people by name, role, university, city or skills"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-mini font-mono text-teal-800">
              {people.length} {people.length === 1 ? "person" : "people"} ·{" "}
              {people.filter((p) => isOnline(p)).length} online now
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {people.map((p) => {
              const relation = relationOf(p.id);
              return (
                <article
                  key={p.id}
                  className="group rounded-card bg-white/95 border border-teal-200/80 shadow-sm hover:shadow-[0_16px_40px_-12px_rgba(6,182,212,0.3)] hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => setViewing(p.id)}
                    className="text-left cursor-pointer"
                    aria-label={`View ${p.name}'s profile`}
                  >
                    <div className="h-16 bg-gradient-to-r from-emerald-100 via-teal-50 to-indigo-100" />
                    <div className="px-4 -mt-8 flex items-end justify-between">
                      <span className="rounded-full ring-4 ring-white">
                        <Avatar name={p.name} seed={p.id} size={64} online={isOnline(p)} />
                      </span>
                      {relation === "friend" && (
                        <span className="mb-1 text-[12px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Friend
                        </span>
                      )}
                      {relation === "incoming" && (
                        <span className="mb-1 text-[12px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Wants to connect
                        </span>
                      )}
                    </div>
                    <div className="px-4 pt-2 space-y-1">
                      <h3 className="text-[16px] font-bold text-indigo-950 truncate">{p.name}</h3>
                      <p className="text-mini font-mono text-emerald-700 font-semibold truncate">{p.role}</p>
                      <p className={`text-[12px] ${isOnline(p) ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                        {lastSeenLabel(p)}
                      </p>
                      {(p.university || p.location) && (
                        <p className="text-[13px] text-teal-950 truncate">
                          {[p.university, p.location].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {p.bio && <p className="text-[13px] text-slate-600 line-clamp-2">{p.bio}</p>}
                    </div>
                    {p.skills.length > 0 && (
                      <div className="px-4 pt-2 flex flex-wrap gap-1.5">
                        {p.skills.slice(0, 5).map((skill) => (
                          <span key={skill} className="text-[12px] font-mono px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                            {skill}
                          </span>
                        ))}
                        {p.skills.length > 5 && (
                          <span className="text-[12px] font-mono px-2 py-0.5 text-teal-700">+{p.skills.length - 5}</span>
                        )}
                      </div>
                    )}
                  </button>
                  <div className="mt-auto p-4 flex flex-wrap gap-2 items-center">
                    <RelationActions p={p} compact />
                    <button type="button" className={linkButton} onClick={() => setViewing(p.id)}>
                      View profile
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {!people.length && (
            <div className={`${panel} text-center space-y-3`}>
              <p className="text-[13px] text-teal-950">
                {search
                  ? "Nobody matches your search."
                  : "No one else is here yet. Invite friends with a link from the Requests tab."}
              </p>
              {!search && (
                <button className={button} onClick={() => selectTab("requests")}>
                  <UserPlusIcon size={14} />
                  Invite friends
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* ===================== CHATS & GROUPS ===================== */}
      {tab === "chats" && (
        <section className="rounded-card bg-white/95 border border-teal-300/50 shadow-[0_16px_40px_-12px_rgba(6,182,212,0.25)] overflow-hidden text-slate-900 grid md:grid-cols-[320px_1fr] h-[min(720px,calc(100dvh-230px))] min-h-[480px]">
          <aside
            className={`flex flex-col border-r border-slate-200 bg-slate-50/80 min-h-0 ${channel ? "hidden md:flex" : "flex"}`}
          >
            <div className="p-3 border-b border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-indigo-950">Chats</h2>
                <button
                  type="button"
                  onClick={() => setGroupModal(true)}
                  className="h-8 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-mini font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Create a group with your friends"
                >
                  <PlusIcon size={13} />
                  New group
                </button>
              </div>
              <div className="relative">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  aria-label="Search chats"
                  placeholder="Search chats"
                  value={chatFilter}
                  onChange={(e) => setChatFilter(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-full bg-white border border-slate-200 text-base md:text-[13px] focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {conversations.map((c) => {
                const active = channel?.type === c.type && channel.id === c.id;
                const unread = c.summary?.unread || 0;
                const last = c.summary?.last;
                const preview = last
                  ? `${last.sender_id === user.id ? "You: " : c.type === "team" ? `${nameFor(last.sender_id).split(" ")[0]}: ` : ""}${last.content}`
                  : c.subtitle || "No messages yet";
                return (
                  <button
                    key={`${c.type}:${c.id}`}
                    type="button"
                    onClick={() => setChannel({ type: c.type, id: c.id, name: c.name })}
                    className={`w-full px-3 py-3 flex items-center gap-3 text-left transition-colors cursor-pointer border-l-2 ${
                      active ? "bg-emerald-50 border-emerald-500" : "border-transparent hover:bg-white"
                    }`}
                  >
                    <Avatar name={c.name} seed={c.id} size={44} group={c.type === "team"} online={c.online} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[14px] ${unread ? "font-bold text-indigo-950" : "font-semibold text-slate-800"}`}>
                          {c.name}
                        </span>
                        {last && (
                          <span className={`flex-shrink-0 text-[12px] ${unread ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                            {formatTime(last.created_at)}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center justify-between gap-2 mt-0.5">
                        <span className={`truncate text-[12px] ${unread ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                          {preview}
                        </span>
                        {unread > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[12px] font-bold flex items-center justify-center">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
              {!conversations.length && (
                <div className="p-6 text-center space-y-3">
                  <p className="text-[13px] text-slate-600">
                    {chatFilter ? "No chats match your search." : "No chats yet. Add friends in Discover to start talking."}
                  </p>
                  {!chatFilter && (
                    <button type="button" className={button} onClick={() => selectTab("discover")}>
                      <SearchIcon size={14} />
                      Find people
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>

          <div className={`flex-col min-h-0 min-w-0 ${channel ? "flex" : "hidden md:flex"}`}>
            {channel ? (
              <>
                <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 bg-white">
                  <button
                    type="button"
                    onClick={() => setChannel(null)}
                    className="md:hidden w-8 h-8 -ml-1 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer"
                    aria-label="Back to chats"
                  >
                    <ChevronRightIcon size={16} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    onClick={() => (channel.type === "dm" ? setViewing(channel.id) : setMembersModal(channel.id))}
                  >
                    <Avatar
                      name={channel.name}
                      seed={channel.id}
                      size={38}
                      group={channel.type === "team"}
                      online={channel.type === "dm" && isOnline(profileOf(channel.id))}
                    />
                    <span className="min-w-0">
                      <span className="block text-[15px] font-bold text-indigo-950 truncate">{channel.name}</span>
                      <span className="block text-[12px] text-slate-500 truncate">
                        {channel.type === "team"
                          ? members
                              .filter((m) => m.team_id === channel.id)
                              .map((m) => nameFor(m.user_id))
                              .join(", ")
                          : lastSeenLabel(profileOf(channel.id))}
                      </span>
                    </span>
                  </button>
                  {channel.type === "team" && (
                    <button className={`${ghostButton} !h-8 !px-3`} onClick={() => setMembersModal(channel.id)}>
                      <UsersIcon size={13} />
                      <span className="hidden sm:inline">Members</span>
                    </button>
                  )}
                </div>
                {chatError && (
                  <p role="alert" className="px-4 pt-3 text-mini font-mono text-rose-700">
                    {chatError}
                  </p>
                )}
                <div
                  ref={scrollRef}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                  }}
                  className="flex-1 overflow-y-auto min-h-0 px-4 py-4 bg-gradient-to-b from-[#F3F8F7] to-[#EEF3FB]"
                  aria-live="polite"
                >
                  {messages.map((m, i) => {
                    const mine = m.sender_id === user.id;
                    const prev = messages[i - 1];
                    const next = messages[i + 1];
                    const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
                    const firstOfGroup = newDay || !prev || prev.sender_id !== m.sender_id;
                    const lastOfGroup =
                      !next || next.sender_id !== m.sender_id || dayLabel(next.created_at) !== dayLabel(m.created_at);
                    return (
                      <React.Fragment key={m.id}>
                        {newDay && (
                          <div className="flex justify-center my-3">
                            <span className="px-3 py-1 rounded-full bg-white/80 border border-slate-200 text-[12px] text-slate-500">
                              {dayLabel(m.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${firstOfGroup ? "mt-3" : "mt-0.5"}`}>
                          {!mine && channel.type === "team" && (
                            <span className="w-7 flex-shrink-0">
                              {lastOfGroup && <Avatar name={nameFor(m.sender_id)} seed={m.sender_id} size={28} />}
                            </span>
                          )}
                          <div
                            className={`max-w-[78%] px-3.5 py-2 shadow-sm ${
                              mine
                                ? `bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl ${lastOfGroup ? "rounded-br-md" : ""}`
                                : `bg-white text-slate-900 border border-slate-200 rounded-2xl ${lastOfGroup ? "rounded-bl-md" : ""}`
                            }`}
                          >
                            {!mine && channel.type === "team" && firstOfGroup && (
                              <div className="text-[12px] font-semibold text-emerald-700 mb-0.5">
                                {nameFor(m.sender_id)}
                              </div>
                            )}
                            <p className="text-[14px] leading-snug whitespace-pre-wrap break-words">
                              {m.content}
                              <span className={`ml-2 align-bottom text-[12px] ${mine ? "text-emerald-50/80" : "text-slate-400"}`}>
                                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  {!messages.length && !chatError && (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-slate-500">
                      <Avatar name={channel.name} seed={channel.id} size={64} group={channel.type === "team"} />
                      <p className="text-[13px]">No messages yet. Say hi to {channel.name}.</p>
                    </div>
                  )}
                </div>
                <form
                  className="p-3 border-t border-slate-200 bg-white flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                >
                  <textarea
                    aria-label="Message"
                    rows={1}
                    maxLength={2000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Write a message..."
                    className="flex-1 max-h-32 min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-100 border border-transparent focus:bg-white focus:border-emerald-500 focus:outline-none text-base md:text-[14px] resize-none"
                  />
                  <button
                    className="w-11 h-11 flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white flex items-center justify-center shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    disabled={busy || !text.trim()}
                    aria-label="Send"
                    title="Send (Enter)"
                  >
                    <SendIcon size={17} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3 bg-gradient-to-b from-[#F3F8F7] to-[#EEF3FB]">
                <span className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageSquareIcon size={28} />
                </span>
                <p className="text-[15px] font-semibold text-indigo-950">Select a chat</p>
                <p className="text-[13px] text-slate-500 max-w-xs">
                  Pick a friend or a group on the left, or create a new group with your friends.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===================== REQUESTS ===================== */}
      {tab === "requests" && (
        <div className="grid lg:grid-cols-[1fr_380px] gap-5 items-start">
          <div className="space-y-5">
            <section className={`${panel} space-y-3`}>
              <h2 className={heading}>Friend requests {incoming.length > 0 && `(${incoming.length})`}</h2>
              {!requestsReady && (
                <p className="p-3 rounded-btn bg-amber-50 border border-amber-200 text-mini font-mono text-amber-800">
                  Friend requests are being set up. Until then, connect with an invite link.
                </p>
              )}
              {incoming.map((r) => {
                const p = profileOf(r.sender_id);
                return (
                  <div key={r.sender_id} className="p-3 rounded-xl bg-white/90 border border-teal-200/80 flex flex-wrap items-center gap-3">
                    <button type="button" className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer" onClick={() => setViewing(r.sender_id)}>
                      <Avatar name={p?.name || "?"} seed={r.sender_id} size={44} online={isOnline(p)} />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold text-indigo-950 truncate">{p?.name || "QADAM user"}</span>
                        <span className="block text-mini font-mono text-teal-800 truncate">
                          {[p?.role, p?.university].filter(Boolean).join(" · ")} · {formatTime(r.created_at)}
                        </span>
                      </span>
                    </button>
                    <span className="inline-flex gap-2">
                      <button className={`${button} !h-9`} disabled={busy} onClick={() => respond(p, r.sender_id, true)}>
                        <CheckIcon size={14} />
                        Accept
                      </button>
                      <button className={`${ghostButton} !h-9`} disabled={busy} onClick={() => respond(p, r.sender_id, false)}>
                        Decline
                      </button>
                    </span>
                  </div>
                );
              })}
              {requestsReady && !incoming.length && (
                <p className="text-[13px] text-teal-900">No new requests.</p>
              )}
            </section>

            <section className={`${panel} space-y-3`}>
              <h2 className={heading}>Sent requests</h2>
              {outgoing.map((r) => {
                const p = profileOf(r.recipient_id);
                return (
                  <div key={r.recipient_id} className="p-3 rounded-xl bg-white/90 border border-teal-200/80 flex flex-wrap items-center gap-3">
                    <button type="button" className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer" onClick={() => setViewing(r.recipient_id)}>
                      <Avatar name={p?.name || "?"} seed={r.recipient_id} size={40} online={isOnline(p)} />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold text-indigo-950 truncate">{p?.name || "QADAM user"}</span>
                        <span className="block text-mini font-mono text-teal-800">Waiting · {formatTime(r.created_at)}</span>
                      </span>
                    </button>
                    <button className={`${ghostButton} !h-9`} disabled={busy} onClick={() => cancelRequest(p, r.recipient_id)}>
                      Cancel
                    </button>
                  </div>
                );
              })}
              {!outgoing.length && <p className="text-[13px] text-teal-900">No pending sent requests.</p>}
            </section>

            <section className={`${panel} space-y-3`}>
              <h2 className={heading}>Friends ({friends.length})</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {friends.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-white/90 border border-teal-200/80 flex items-center gap-3">
                    <button type="button" className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer" onClick={() => setViewing(p.id)}>
                      <Avatar name={p.name} seed={p.id} size={40} online={isOnline(p)} />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold text-indigo-950 truncate">{p.name}</span>
                        <span className={`block text-[12px] ${isOnline(p) ? "text-emerald-600" : "text-slate-400"}`}>{lastSeenLabel(p)}</span>
                      </span>
                    </button>
                    <button
                      className="w-9 h-9 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center cursor-pointer"
                      aria-label={`Message ${p.name}`}
                      onClick={() => openChat("dm", p.id, p.name)}
                    >
                      <MessageSquareIcon size={15} />
                    </button>
                  </div>
                ))}
              </div>
              {!friends.length && <p className="text-[13px] text-teal-900">No friends yet. Find people in Discover.</p>}
            </section>
          </div>

          <section className={`${panel} space-y-4`}>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 flex-shrink-0 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UserPlusIcon size={18} />
              </span>
              <div>
                <h2 className={heading}>Invite by link</h2>
                <p className="text-[13px] text-teal-950">
                  For friends who are not on QADAM yet. They open the link, sign up and accept.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <button className={button} disabled={busy} onClick={() => createInvite()}>
                Create connection link
              </button>
              <button
                className={linkButton}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    checked(await networkClient!.rpc("network_revoke_invites", { target_team: null }));
                    setLink("");
                    setNotice("Your invitation links have been revoked.");
                  })
                }
              >
                Revoke links
              </button>
            </div>
            {link && (
              <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-2">
                <label className={label}>
                  <span>Invitation link{linkLabel ? ` · ${linkLabel}` : ""}</span>
                  <input readOnly className={input} value={link} onFocus={(e) => e.target.select()} />
                </label>
                <button
                  className={ghostButton}
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await navigator.clipboard.writeText(link);
                      setNotice("Link copied.");
                    })
                  }
                >
                  Copy link
                </button>
                <p className="text-mini font-mono text-teal-800">Valid for 7 days.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ===================== MY PROFILE ===================== */}
      {tab === "profile" && (
        <form onSubmit={save} className={`${panel} space-y-5`}>
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={profile.name || "?"} seed={user.id} size={64} online={!!savedProfile} />
              <div>
                <h2 className={heading}>
                  {savedProfile ? "My profile" : "Create your network profile"}
                </h2>
                <p className="text-[13px] text-teal-950 leading-relaxed max-w-xl">
                  This is what other students see in Discover. CVs, passwords, email, phone
                  numbers and identity documents are never shared.
                </p>
              </div>
            </div>
            <button className={button} disabled={busy}>
              Save network profile
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className={label}>
              <span>Name</span>
              <input
                className={input}
                required
                minLength={2}
                maxLength={120}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </label>
            <label className={label}>
              <span>Role</span>
              <select
                className={input}
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              >
                {USER_ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className={label}>
              <span>University</span>
              <input
                className={input}
                maxLength={160}
                value={profile.university}
                onChange={(e) => setProfile({ ...profile, university: e.target.value })}
              />
            </label>
            <label className={label}>
              <span>City / location</span>
              <input
                className={input}
                maxLength={120}
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              />
            </label>
          </div>
          <label className={label}>
            <span>Skills, separated by commas</span>
            <input
              className={input}
              maxLength={1500}
              placeholder="Python, PyTorch, React"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </label>
          <label className={label}>
            <span>Goals, separated by commas</span>
            <input
              className={input}
              maxLength={1500}
              placeholder="Win a hackathon, find a research internship"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
            />
          </label>
          <label className={label}>
            <span>Short bio</span>
            <textarea
              className={`${input} h-24 py-2.5`}
              maxLength={1000}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </label>
          <label className="flex gap-3 items-center p-3 rounded-xl bg-white/70 border border-teal-200/80 text-[13px] text-teal-950 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-emerald-600"
              checked={profile.is_public}
              onChange={(e) => setProfile({ ...profile, is_public: e.target.checked })}
            />
            Show my profile in Discover so other students can find me and send friend requests
          </label>
          {savedProfile && (
            <div className="pt-4 border-t border-teal-200/80">
              <button
                type="button"
                className={dangerLink}
                disabled={busy}
                onClick={() =>
                  setConfirmBox({
                    title: "Delete network data?",
                    message:
                      "This removes your shared network profile, friends, sent messages and groups you own. Your local workspace stays on this device.",
                    action: "Delete data",
                    onConfirm: () =>
                      run(async () => {
                        checked(await networkClient!.from("network_profiles").delete().eq("id", user.id));
                        setChannel(null);
                        setLink("");
                        setProfile(emptyNetworkProfile(user.id));
                        setSkills("");
                        setGoals("");
                        await reload();
                        setNotice("Shared network data deleted.");
                      }),
                  })
                }
              >
                Delete my network data
              </button>
            </div>
          )}
        </form>
      )}

      {/* ===================== PROFILE DIALOG ===================== */}
      {viewing && viewed && (
        <Modal title="Profile" onClose={() => setViewing(null)}>
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center gap-2">
              <Avatar name={viewed.name} seed={viewed.id} size={88} online={isOnline(viewed)} />
              <h3 className="text-[20px] font-bold text-indigo-950">{viewed.name}</h3>
              <p className="text-mini font-mono text-emerald-700 font-semibold">{viewed.role}</p>
              <p className={`text-[12px] ${isOnline(viewed) ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                {lastSeenLabel(viewed)}
              </p>
              <div className="pt-1 flex flex-wrap justify-center gap-2">
                <RelationActions p={viewed} />
              </div>
            </div>
            {(viewed.university || viewed.location) && (
              <p className="text-[13px] text-teal-950 text-center">
                {[viewed.university, viewed.location].filter(Boolean).join(" · ")}
              </p>
            )}
            {viewed.bio && (
              <div className="p-3 rounded-xl bg-white/80 border border-teal-200/80">
                <div className="text-mini font-mono uppercase tracking-wider text-teal-800 font-semibold mb-1">About</div>
                <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{viewed.bio}</p>
              </div>
            )}
            {viewed.skills.length > 0 && (
              <div>
                <div className="text-mini font-mono uppercase tracking-wider text-teal-800 font-semibold mb-1.5">Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {viewed.skills.map((skill) => (
                    <span key={skill} className="text-[12px] font-mono px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {viewed.goals.length > 0 && (
              <div>
                <div className="text-mini font-mono uppercase tracking-wider text-teal-800 font-semibold mb-1.5">Goals</div>
                <ul className="space-y-1">
                  {viewed.goals.map((goal) => (
                    <li key={goal} className="text-[13px] text-slate-700 flex gap-2">
                      <CheckIcon size={13} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {relationOf(viewed.id) === "friend" && (
              <div className="pt-3 border-t border-teal-200/80 text-center">
                <button
                  className={dangerLink}
                  disabled={busy}
                  onClick={() =>
                    setConfirmBox({
                      title: `Remove ${viewed.name}?`,
                      message: "They will be removed from your friends list. You can send a new friend request later.",
                      action: "Remove",
                      onConfirm: () => {
                        removeFriend(viewed);
                        setViewing(null);
                      },
                    })
                  }
                >
                  Remove from friends
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ===================== NEW GROUP DIALOG ===================== */}
      {groupModal && (
        <Modal title="New group" onClose={() => setGroupModal(false)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createGroup();
            }}
          >
            <label className={label}>
              <span>Group name</span>
              <input
                className={input}
                aria-label="Team name"
                required
                minLength={2}
                maxLength={100}
                placeholder="NVIDIA Hackathon team"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </label>
            <label className={label}>
              <span>Hackathon or goal (optional)</span>
              <input
                className={input}
                maxLength={200}
                value={groupGoal}
                onChange={(e) => setGroupGoal(e.target.value)}
              />
            </label>
            <div>
              <div className={label}>Add friends</div>
              <div className="mt-2 space-y-1.5 max-h-60 overflow-y-auto">
                {friends.map((p) => {
                  const picked = groupPicks.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-colors ${
                        picked ? "bg-emerald-50 border-emerald-300" : "bg-white border-teal-200/80 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-emerald-600"
                        checked={picked}
                        onChange={() =>
                          setGroupPicks((prev) => (picked ? prev.filter((id) => id !== p.id) : [...prev, p.id]))
                        }
                      />
                      <Avatar name={p.name} seed={p.id} size={32} online={isOnline(p)} />
                      <span className="text-[13px] font-semibold text-slate-800 truncate">{p.name}</span>
                    </label>
                  );
                })}
                {!friends.length && (
                  <p className="text-[13px] text-teal-900">
                    Add friends first, or create the group and share its invite link.
                  </p>
                )}
              </div>
            </div>
            <button className={`${button} w-full`} disabled={busy || groupName.trim().length < 2}>
              Create group{groupPicks.length ? ` with ${groupPicks.length} ${groupPicks.length === 1 ? "friend" : "friends"}` : ""}
            </button>
          </form>
        </Modal>
      )}

      {/* ===================== GROUP MEMBERS DIALOG ===================== */}
      {membersModal && membersTeam && (
        <Modal title={membersTeam.name} onClose={() => setMembersModal(null)}>
          <div className="space-y-4">
            {membersTeam.opportunity_title && (
              <p className="text-[13px] text-teal-950">{membersTeam.opportunity_title}</p>
            )}
            <div>
              <div className={label}>Members</div>
              <div className="mt-2 space-y-1.5">
                {members
                  .filter((m) => m.team_id === membersTeam.id)
                  .map((m) => {
                    const p = profileOf(m.user_id);
                    return (
                      <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-xl bg-white border border-teal-200/80">
                        <Avatar name={nameFor(m.user_id)} seed={m.user_id} size={32} online={m.user_id === user.id || isOnline(p)} />
                        <span className="text-[13px] font-semibold text-slate-800 truncate flex-1">
                          {nameFor(m.user_id)}
                          {m.user_id === membersTeam.owner_id && (
                            <span className="ml-2 text-[12px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">owner</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
            {membersTeam.owner_id === user.id && (
              <>
                <div>
                  <div className={label}>Add friends</div>
                  <div className="mt-2 space-y-1.5">
                    {friends
                      .filter((p) => !members.some((m) => m.team_id === membersTeam.id && m.user_id === p.id))
                      .map((p) => (
                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl bg-white border border-teal-200/80">
                          <Avatar name={p.name} seed={p.id} size={32} online={isOnline(p)} />
                          <span className="text-[13px] font-semibold text-slate-800 truncate flex-1">{p.name}</span>
                          <button className={`${button} !h-8 !px-3`} disabled={busy} onClick={() => addToGroup(membersTeam.id, p.id)}>
                            <PlusIcon size={13} />
                            Add
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <button className={`${ghostButton} w-full`} disabled={busy} onClick={() => createInvite(membersTeam)}>
                    Create team invite
                  </button>
                  {link && linkLabel === `Group invite: ${membersTeam.name}` && (
                    <input readOnly aria-label="Group invite link" className={input} value={link} onFocus={(e) => e.target.select()} />
                  )}
                </div>
              </>
            )}
            <div className="pt-3 border-t border-teal-200/80 text-center">
              <button
                className={dangerLink}
                disabled={busy}
                onClick={() => {
                  const owner = membersTeam.owner_id === user.id;
                  setConfirmBox({
                    title: owner ? "Delete this group?" : "Leave this group?",
                    message: owner
                      ? "The group and its chat will be deleted for all members."
                      : "You will stop receiving messages from this group.",
                    action: owner ? "Delete group" : "Leave group",
                    onConfirm: () =>
                      run(async () => {
                        checked(await networkClient!.rpc("network_leave_team", { target_team: membersTeam.id }));
                        if (channel?.id === membersTeam.id) setChannel(null);
                        setMembersModal(null);
                        await reload();
                        setNotice(owner ? "Group deleted." : "You left the group.");
                      }),
                  });
                }}
              >
                {membersTeam.owner_id === user.id ? "Delete group" : "Leave group"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmBox && <ConfirmDialog request={confirmBox} onClose={closeConfirm} />}
    </div>
  );
}
