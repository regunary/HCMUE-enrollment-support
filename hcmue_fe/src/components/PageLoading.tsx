export function PageLoading() {
  return (
    <div className="grid place-items-center min-h-[40vh] p-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted">Đang tải trang…</p>
      </div>
    </div>
  )
}
