export default function Loading() {
  return (
    <div className="page-container">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-lg bg-muted" />
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}