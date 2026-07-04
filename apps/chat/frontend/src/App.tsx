import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppHeader, FreshnessStamp, KillMirror, NavRail } from './components/ds';
import type { NavItem } from './components/ds';
import { ChatProvider, useChat } from './state/ChatProvider';
import { Feed } from './screens/Feed';
import { NoteDetail } from './screens/NoteDetail';
import { Broadcast } from './screens/Broadcast';
import { Health } from './screens/Health';
import type { Route, Nav } from './screens/nav';
import type { Envelope } from './lib/types';

/* Chat — shell + router (a faithful port of the chat kit's app.jsx).
   NavRail (Doorbell nav) + AppHeader with a READ-ONLY KillMirror (Chat is NOT in
   the kill chain — the mirror only reflects suite posture and links out; the feed
   keeps flowing under a stop). Routing is local state, dependency-free. */
function Shell() {
  const ctx = useChat();
  const [route, setRoute] = useState<Route>('feed');
  const [collapsed, setCollapsed] = useState(false);
  const [note, setNote] = useState<Envelope | null>(null);

  const nav: Nav = useMemo(
    () => ({
      goto: (r) => setRoute(r),
      openNote: (n) => {
        setNote(n);
        setRoute('note');
      },
    }),
    [],
  );

  const unacked = ctx.notifications.filter((n) => !n.acked_at).length;

  const items: NavItem[] = [
    { group: 'Doorbell' },
    { key: 'feed', label: 'Feed', icon: '◈', badge: unacked > 0 ? unacked : undefined, active: route === 'feed' || route === 'note', onClick: () => setRoute('feed') },
    { key: 'broadcast', label: 'Broadcast', icon: '📣', active: route === 'broadcast', onClick: () => setRoute('broadcast') },
    { key: 'health', label: 'Health', icon: '⟳', active: route === 'health', onClick: () => setRoute('health') },
  ];

  let screen: ReactNode = null;
  if (route === 'feed') screen = <Feed nav={nav} />;
  else if (route === 'note' && note) screen = <NoteDetail note={note} nav={nav} />;
  else if (route === 'broadcast') screen = <Broadcast />;
  else if (route === 'health') screen = <Health />;
  else screen = <Feed nav={nav} />;

  // Chat is not in the kill chain and has no live kill signal in its API contract,
  // so the mirror reflects nominal posture (read-only). If a suite-wide stop
  // signal is later surfaced to Chat, it would flip engaged here — still read-only.
  const systemState = ctx.offline ? (
    <FreshnessStamp state="stale" reading="OFFLINE" />
  ) : ctx.connected ? (
    <FreshnessStamp age="nominal · live" />
  ) : (
    <FreshnessStamp state="stale" reading="RECONNECTING" />
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
      <NavRail current="chat" posture="nominal" items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppHeader appName="Chat" identity="notifications & broadcast" systemState={systemState}>
          <KillMirror engaged={false} href="#" />
        </AppHeader>
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ChatProvider>
      <Shell />
    </ChatProvider>
  );
}
