export default function Loading() {
  return (
    <div className="page-container">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
        </div>
        <div className="h-9 w-48 rounded bg-muted" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-48 rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
