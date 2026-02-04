import TopNav from '@/components/TopNav';
import HiddenList from '@/components/HiddenList';

export default function HiddenPage() {
  return (
    <div className="container">
      <TopNav />
      <section className="mt-10">
        <div className="card p-6">
          <h2 className="text-2xl font-semibold">Hidden roles</h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Review roles you hid from the live feed.
          </p>
        </div>
      </section>
      <section className="mt-8">
        <HiddenList />
      </section>
    </div>
  );
}
