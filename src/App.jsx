import { useState, useEffect, useCallback } from 'react';
import { getToken } from './api';
import Login from './Login';
import Sidebar from './Sidebar';
import Overview from './pages/Overview';
import Campaigns from './pages/Campaigns';
import Customers from './pages/Customers';
import Transactions from './pages/Transactions';
import Team from './pages/Team';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';

const PAGES = {
  overview: Overview,
  reports: Reports,
  analytics: Analytics,
  campaigns: Campaigns,
  customers: Customers,
  transactions: Transactions,
  team: Team,
};

// The current page lives in the URL hash (e.g. #campaigns) instead of only
// in React state. Plain useState always resets to its initial value on a
// full page reload, which is why refreshing used to always land back on
// Overview - there was nowhere else for "which page am I on" to live.
// Reading/writing the hash means a refresh, a bookmark, or the browser's
// back/forward buttons all land on the right page.
function pageFromHash() {
  const key = window.location.hash.replace('#', '');
  return PAGES[key] ? key : 'overview';
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [page, setPage] = useState(pageFromHash);

  // Keep state in sync if the hash changes from outside a nav click, e.g.
  // the user hits the browser's back/forward button.
  useEffect(() => {
    function onHashChange() {
      setPage(pageFromHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((key) => {
    if (window.location.hash.replace('#', '') !== key) {
      window.location.hash = key;
    }
    setPage(key);
  }, []);

  if (!loggedIn) {
    return <Login onLoggedIn={() => setLoggedIn(true)} />;
  }

  const Page = PAGES[page] || Overview;

  return (
    <div className="flex h-screen bg-bone max-[860px]:flex-col max-[860px]:h-auto max-[860px]:min-h-screen">
      <Sidebar page={page} onNavigate={navigate} onLoggedOut={() => setLoggedIn(false)} />
      <main className="flex-1 overflow-y-auto px-10 py-8 max-[860px]:px-5 max-[860px]:py-5">
        <Page />
      </main>
    </div>
  );
}