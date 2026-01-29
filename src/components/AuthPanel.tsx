'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function AuthPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null);
    });

    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setMessage(null);
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
  };

  const signUp = async () => {
    setMessage(null);
    const { error } = await supabaseBrowser.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else setMessage('Check your email to confirm the account.');
  };

  const signOut = async () => {
    await supabaseBrowser.auth.signOut();
  };

  if (userEmail) {
    return (
      <div className="card p-6 flex flex-col gap-4">
        <p className="text-lg">Signed in as {userEmail}</p>
        <button className="primary-button w-fit" onClick={signOut} type="button">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div>
        <label className="text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">Email</label>
        <input
          className="mt-2 w-full rounded-xl border border-black/10 px-4 py-2"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="you@domain.com"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">Password</label>
        <input
          className="mt-2 w-full rounded-xl border border-black/10 px-4 py-2"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="password"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" onClick={signIn} type="button">
          Sign in
        </button>
        <button className="secondary-button" onClick={signUp} type="button">
          Create account
        </button>
      </div>
      {message && <p className="text-sm text-[var(--ink-muted)]">{message}</p>}
    </div>
  );
}
