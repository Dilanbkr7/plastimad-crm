export default function LoadingCRM() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="mb-8">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="mt-3 h-9 w-72 rounded bg-slate-300" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200" />
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>

        <div className="h-96 rounded-2xl border border-slate-200 bg-white" />
      </div>
    </main>
  );
}