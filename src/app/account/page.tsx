import TopNav from '@/components/TopNav';
import AuthPanel from '@/components/AuthPanel';

export default function AccountPage() {
  return (
    <div className="container">
      <TopNav />
      <section className="mt-10 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-6">
          <h2 className="text-2xl font-semibold">Your account</h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Sign in to track applied roles, hide listings, and sync your scan history.
          </p>
        </div>
        <AuthPanel />
      </section>
    </div>
  );
}
