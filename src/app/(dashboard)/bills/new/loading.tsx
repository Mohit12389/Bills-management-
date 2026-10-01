export default function Loading() {
  return (
    <div className="page-container">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-4 w-56 rounded bg-muted" />
        <div className="mx-auto max-w-2xl space-y-4 rounded-lg border p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
