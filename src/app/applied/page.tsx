import TopNav from '@/components/TopNav';
import AppliedList from '@/components/AppliedList';

export default function AppliedPage() {
  return (
    <div className="container">
      <TopNav />
      <section className="mt-10">
        <div className="card p-6">
          <h2 className="text-2xl font-semibold">Applied roles</h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Keep a running log of roles you've already applied to.
          </p>
        </div>
      </section>
      <section className="mt-8">
        <AppliedList />
      </section>
    </div>
  );
}
