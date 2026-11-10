/**
 * LİNGO v2 — Analizler Boş Durum Bileşeni
 */

interface EmptyStateProps {
  message?: string
  subtext?: string
}

export function EmptyState({ message, subtext }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-white/5 border border-white/5 my-4">
      <span className="text-3xl mb-2">📊</span>
      <p className="text-sm font-bold text-slate-300">
        {message || 'Henüz veri yok'}
      </p>
      <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
        {subtext || 'Yarışma veya Çalışma modunda oynadıkça analizlerin ve istatistiklerin burada görünecektir.'}
      </p>
    </div>
  )
}
