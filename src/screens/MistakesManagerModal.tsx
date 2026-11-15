/**
 * LİNGO v2 — Hatalarım ve Sözlük Dışı Kelimeleri Düzenleme Ekranı (Aşama 4)
 * SPEC-v2 Bölüm 6.3 & 12/Aşama 4
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { loadAnalytics } from '../analytics/storage'
import {
  loadStudyData,
  hideMistakeWord,
  unhideMistakeWord,
  hideInvalidWord,
  unhideInvalidWord,
  setWordLearned,
  type StudyData,
} from '../game/mistakes/studyStorage'
import { getStudyList } from '../game/mistakes/mistakeSelector'
import { turkishUpper } from '../utils/turkish'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

export const SWIPE_THRESHOLD = 72

export function isSwipeThresholdReached(deltaX: number): boolean {
  return deltaX <= -SWIPE_THRESHOLD
}

export interface MistakesManagerModalProps {
  onClose: () => void
  initialTab?: 'missed' | 'invalid'
  onDataChanged?: () => void
}

interface InvalidListItem {
  word: string
  total: number
  y: number
  c: number
  h: number
  last: number
  length: number
  isHidden: boolean
}

export default function MistakesManagerModal({
  onClose,
  initialTab = 'missed',
  onDataChanged,
}: MistakesManagerModalProps) {
  const [tab, setTab] = useState<'missed' | 'invalid'>(initialTab)
  const [viewMode, setViewMode] = useState<'active' | 'hidden'>('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [lengthFilter, setLengthFilter] = useState<number | 'all'>('all')

  // Toplu düzenleme modu
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())

  // Satır menüsü
  const [openMenuWord, setOpenMenuWord] = useState<string | null>(null)

  // 5 saniyelik Geri Al bildirimi (Toast)
  const [undoToast, setUndoToast] = useState<{
    word: string
    isInvalid: boolean
    timerId: ReturnType<typeof setTimeout>
  } | null>(null)

  // Veri durumu
  const [studyData, setStudyData] = useState<StudyData>(() => loadStudyData())
  const analyticsData = useMemo(() => loadAnalytics(), [studyData])

  const refreshData = useCallback(() => {
    setStudyData(loadStudyData())
    onDataChanged?.()
  }, [onDataChanged])

  // Toast temizleme
  useEffect(() => {
    return () => {
      if (undoToast?.timerId) {
        clearTimeout(undoToast.timerId)
      }
    }
  }, [undoToast])

  // ─── Kaçırılan Kelimeler Listesi ──────────────────────────────
  const missedList = useMemo(() => {
    const raw = getStudyList({
      missedWordsMap: analyticsData.missedWords || {},
      studyData,
      minThreshold: 1, // Tüm kaçırılan kelimeler (Plan 6.1)
      includeHidden: true,
      includeLearned: true,
    })

    return raw.filter((item) => {
      // Aktif / Gizlenen filtre
      if (viewMode === 'active' && item.isHidden) return false
      if (viewMode === 'hidden' && !item.isHidden) return false

      // Harf sayısı filtre
      if (lengthFilter !== 'all') {
        if (lengthFilter === 8) {
          if (item.length < 8) return false
        } else {
          if (item.length !== lengthFilter) return false
        }
      }

      // Arama filtresi
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLocaleLowerCase('tr-TR')
        if (!item.word.includes(term)) return false
      }

      return true
    })
  }, [analyticsData.missedWords, studyData, viewMode, lengthFilter, searchTerm])

  // ─── Sözlük Dışı Denemeler Listesi ───────────────────────────
  const invalidList = useMemo(() => {
    const items: InvalidListItem[] = []
    const invalidMap = analyticsData.invalidWords || {}

    for (const [word, rec] of Object.entries(invalidMap)) {
      const total = (rec.y || 0) + (rec.c || 0) + (rec.h || 0)
      if (total <= 0) continue

      const lower = word.toLocaleLowerCase('tr-TR')
      const isHidden = Boolean(studyData.invalidHidden && studyData.invalidHidden[lower] !== undefined)

      if (viewMode === 'active' && isHidden) continue
      if (viewMode === 'hidden' && !isHidden) continue

      const len = Array.from(word).length
      if (lengthFilter !== 'all') {
        if (lengthFilter === 8) {
          if (len < 8) continue
        } else {
          if (len !== lengthFilter) continue
        }
      }

      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLocaleLowerCase('tr-TR')
        if (!lower.includes(term)) continue
      }

      items.push({
        word: lower,
        total,
        y: rec.y || 0,
        c: rec.c || 0,
        h: rec.h || 0,
        last: rec.last || 0,
        length: len,
        isHidden,
      })
    }

    items.sort((a, b) => b.total - a.total || b.last - a.last || a.word.localeCompare(b.word, 'tr-TR'))
    return items
  }, [analyticsData.invalidWords, studyData, viewMode, lengthFilter, searchTerm])

  // ─── Eylem Bildirimi & Geri Al Yönetimi ────────────────────────
  const showUndoToast = useCallback((word: string, isInvalid: boolean) => {
    if (undoToast?.timerId) {
      clearTimeout(undoToast.timerId)
    }

    const timerId = setTimeout(() => {
      setUndoToast(null)
    }, 5000)

    setUndoToast({ word, isInvalid, timerId })
  }, [undoToast])

  const handleUndo = useCallback(() => {
    if (!undoToast) return
    playSound('key_press')
    triggerHaptic('tap')

    if (undoToast.isInvalid) {
      unhideInvalidWord(undoToast.word)
    } else {
      unhideMistakeWord(undoToast.word)
    }

    clearTimeout(undoToast.timerId)
    setUndoToast(null)
    refreshData()
  }, [undoToast, refreshData])

  // ─── Tekil Eylemler ──────────────────────────────────────────
  const handleHideWord = useCallback((word: string) => {
    playSound('key_press')
    triggerHaptic('tap')
    hideMistakeWord(word)
    showUndoToast(word, false)
    setOpenMenuWord(null)
    refreshData()
  }, [showUndoToast, refreshData])

  const handleUnhideWord = useCallback((word: string) => {
    playSound('key_press')
    triggerHaptic('tap')
    unhideMistakeWord(word)
    setOpenMenuWord(null)
    refreshData()
  }, [refreshData])

  const handleToggleLearned = useCallback((word: string, currentLearned: boolean) => {
    playSound('key_press')
    triggerHaptic('tap')
    setWordLearned(word, !currentLearned)
    setOpenMenuWord(null)
    refreshData()
  }, [refreshData])

  const handleHideInvalid = useCallback((word: string) => {
    playSound('key_press')
    triggerHaptic('tap')
    hideInvalidWord(word)
    showUndoToast(word, true)
    setOpenMenuWord(null)
    refreshData()
  }, [showUndoToast, refreshData])

  const handleUnhideInvalid = useCallback((word: string) => {
    playSound('key_press')
    triggerHaptic('tap')
    unhideInvalidWord(word)
    setOpenMenuWord(null)
    refreshData()
  }, [refreshData])

  // ─── Çoklu Seçim Eylemleri ────────────────────────────────────
  const handleToggleSelectWord = (word: string) => {
    playSound('key_press')
    setSelectedWords((prev) => {
      const next = new Set(prev)
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return next
    })
  }

  const handleSelectAll = () => {
    playSound('key_press')
    const currentList = tab === 'missed' ? missedList.map((x) => x.word) : invalidList.map((x) => x.word)
    if (selectedWords.size === currentList.length) {
      setSelectedWords(new Set())
    } else {
      setSelectedWords(new Set(currentList))
    }
  }

  const handleBatchAction = () => {
    if (selectedWords.size === 0) return
    playSound('key_press')
    triggerHaptic('tap')

    for (const w of Array.from(selectedWords)) {
      if (tab === 'missed') {
        if (viewMode === 'active') hideMistakeWord(w)
        else unhideMistakeWord(w)
      } else {
        if (viewMode === 'active') hideInvalidWord(w)
        else unhideInvalidWord(w)
      }
    }

    setSelectedWords(new Set())
    setIsMultiSelect(false)
    refreshData()
  }

  // ─── Sola Kaydırma (Swipe) State & Handler'ları ────────────────
  const [swipingWord, setSwipingWord] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const swipeStartRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false })

  const handlePointerDown = (e: React.PointerEvent, word: string) => {
    if (isMultiSelect) return
    // iOS ekran kenarı geri hareketini engellememek için ekranın en sol/sağ 20px alanını yok say
    if (e.clientX < 20 || (typeof window !== 'undefined' && e.clientX > window.innerWidth - 20)) {
      return
    }

    swipeStartRef.current = { x: e.clientX, y: e.clientY, active: true }
    setSwipingWord(word)
    setSwipeOffset(0)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!swipeStartRef.current.active) return
    const dx = e.clientX - swipeStartRef.current.x
    const dy = e.clientY - swipeStartRef.current.y

    // Dikey kaydırmayı engelleme: dikey hareket daha belirginse swipe iptal
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      swipeStartRef.current.active = false
      setSwipeOffset(0)
      return
    }

    // Yalnızca sola kaydırmaya izin ver (dx <= 0)
    if (dx < 0) {
      setSwipeOffset(Math.max(-100, dx))
    }
  }

  const handlePointerEnd = () => {
    if (!swipeStartRef.current.active) return
    swipeStartRef.current.active = false

    if (swipingWord && isSwipeThresholdReached(swipeOffset)) {
      // Eşik aşıldı: gizle veya geri al
      if (tab === 'missed') {
        if (viewMode === 'active') handleHideWord(swipingWord)
        else handleUnhideWord(swipingWord)
      } else {
        if (viewMode === 'active') handleHideInvalid(swipingWord)
        else handleUnhideInvalid(swipingWord)
      }
    }

    setSwipingWord(null)
    setSwipeOffset(0)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-[430px] h-full sm:h-[92dvh] sm:max-h-[850px] sm:rounded-3xl flex flex-col bg-[var(--color-bg-primary)] text-white select-none relative overflow-hidden shadow-2xl border-0 sm:border sm:border-white/10"
        style={{
          maxHeight: 'var(--app-height, 100dvh)',
        }}
      >
        {/* ─── Başlık Çubuğu ────────────────────────────────────── */}
        <header
          className="px-4 pb-2.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-900/90 backdrop-blur-md"
          style={{
            paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
          }}
        >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playSound('key_press')
              triggerHaptic('tap')
              onClose()
            }}
            className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center text-lg font-bold"
            aria-label="Kapat"
          >
            ✕
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
              Hatalarım ve Kelimeler
            </h2>
            <p className="text-[11px] text-slate-400">
              Listeyi düzenle • Kaydırarak veya menüden gizle
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              playSound('key_press')
              triggerHaptic('tap')
              setIsMultiSelect((prev) => !prev)
              setSelectedWords(new Set())
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center ${
              isMultiSelect
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            {isMultiSelect ? 'Vazgeç' : 'Seç'}
          </button>
        </div>
      </header>

      {/* ─── Ana Sekmeler: Kaçırılanlar vs Sözlük Dışı ──────────── */}
      <div className="px-4 pt-2.5 pb-2 shrink-0 flex gap-2 border-b border-white/5 bg-slate-900/40">
        <button
          type="button"
          onClick={() => {
            playSound('key_press')
            triggerHaptic('tap')
            setTab('missed')
            setSelectedWords(new Set())
          }}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
            tab === 'missed'
              ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white bg-white/[0.02]'
          }`}
        >
          <span>❌</span> Kaçırılan Kelimeler
        </button>

        <button
          type="button"
          onClick={() => {
            playSound('key_press')
            triggerHaptic('tap')
            setTab('invalid')
            setSelectedWords(new Set())
          }}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
            tab === 'invalid'
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white bg-white/[0.02]'
          }`}
        >
          <span>🚫</span> Sözlük Dışı ({Object.keys(analyticsData.invalidWords || {}).length})
        </button>
      </div>

      {/* ─── Görünüm (Aktif / Gizlenenler) & Arama & Harf Filtreleri ─ */}
      <div className="px-4 py-2 shrink-0 space-y-2 border-b border-white/5 bg-slate-950/40">
        {/* Aktif vs Gizlenenler Toggle */}
        <div className="flex items-center justify-between">
          <div className="inline-flex p-0.5 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                playSound('key_press')
                triggerHaptic('tap')
                setViewMode('active')
                setSelectedWords(new Set())
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'active'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Aktifler
            </button>
            <button
              type="button"
              onClick={() => {
                playSound('key_press')
                triggerHaptic('tap')
                setViewMode('hidden')
                setSelectedWords(new Set())
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'hidden'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gizlenenler
            </button>
          </div>

          <span className="text-xs text-slate-400 font-mono font-bold">
            {tab === 'missed' ? missedList.length : invalidList.length} Öğe
          </span>
        </div>

        {/* Arama Girişi */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Kelime veya harf ara..."
            className="w-full px-3 py-2 pl-9 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500 transition-all"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Harf Filtre Çipleri */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(['all', 4, 5, 6, 7, 8] as const).map((len) => (
            <button
              key={len}
              type="button"
              onClick={() => {
                playSound('key_press')
                triggerHaptic('tap')
                setLengthFilter(len)
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                lengthFilter === len
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {len === 'all' ? 'Tümü' : len === 8 ? '8+ Harfli' : `${len} Harf`}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Liste İçeriği ───────────────────────────────────────── */}
      <main className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 overscroll-contain">
        {tab === 'missed' ? (
          missedList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-white/[0.02] rounded-2xl border border-white/5 p-6">
              {viewMode === 'active'
                ? 'Aktif kaçırılan kelime bulunmuyor. Tüm kelimeler öğrenildi veya gizlendi!'
                : 'Gizlenmiş herhangi bir kelime bulunmuyor.'}
            </div>
          ) : (
            missedList.map((item) => {
              const isSelected = selectedWords.has(item.word)
              const isCurrentSwiping = swipingWord === item.word
              const offset = isCurrentSwiping ? swipeOffset : 0
              const isMenuOpen = openMenuWord === item.word

              return (
                <div
                  key={item.word}
                  className="relative rounded-2xl overflow-hidden touch-pan-y"
                  onPointerDown={(e) => handlePointerDown(e, item.word)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                >
                  {/* Arka plan Kaydırma Eylemi (Kırmızı Sil / Geri Al) */}
                  <div
                    className={`absolute inset-0 flex items-center justify-end px-5 font-black text-xs transition-colors ${
                      viewMode === 'active' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    <span>{viewMode === 'active' ? '🗑️ Listeden Çıkar' : '↩️ Listeye Al'}</span>
                  </div>

                  {/* Ön Kart */}
                  <div
                    style={{ transform: `translateX(${offset}px)` }}
                    className={`relative p-3 rounded-2xl border transition-transform duration-100 flex items-center justify-between ${
                      isSelected
                        ? 'bg-violet-950/70 border-violet-500/60'
                        : 'bg-slate-900/90 border-white/10 hover:border-white/20'
                    }`}
                    onClick={() => {
                      if (isMultiSelect) handleToggleSelectWord(item.word)
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {isMultiSelect && (
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs ${
                            isSelected
                              ? 'bg-violet-600 border-violet-400 text-white'
                              : 'border-white/30 bg-white/5'
                          }`}
                        >
                          {isSelected && '✓'}
                        </div>
                      )}

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black tracking-wider uppercase text-white font-mono">
                            {turkishUpper(item.word)}
                          </span>
                          {item.isLearned && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              ✓ Öğrenildi
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          {item.length} Harfli • Yarışma: {item.y}×, Çalışma: {item.c}×
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        ×{item.total}
                      </span>

                      {/* ⋯ Eylem Menüsü Düğmesi (En az 44x44px dokunma alanı) */}
                      {!isMultiSelect && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            playSound('key_press')
                            setOpenMenuWord((prev) => (prev === item.word ? null : item.word))
                          }}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl active:scale-95 transition-all text-base font-black -mr-1"
                          aria-label="İşlemler menüsü"
                        >
                          ⋯
                        </button>
                      )}
                    </div>

                    {/* Satır İçi Açılır Menü */}
                    {isMenuOpen && (
                      <div
                        className="absolute right-3 top-12 z-20 bg-slate-800 border border-white/20 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[160px] animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {viewMode === 'active' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleHideWord(item.word)}
                              className="px-3 py-2 text-left text-xs font-bold text-rose-300 hover:bg-rose-500/20 rounded-xl transition-all"
                            >
                              🗑️ Listeden Çıkar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLearned(item.word, item.isLearned)}
                              className="px-3 py-2 text-left text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 rounded-xl transition-all"
                            >
                              {item.isLearned ? '↩️ Öğrenildi Durumunu Kaldır' : '✓ Öğrenildi Say'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUnhideWord(item.word)}
                            className="px-3 py-2 text-left text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 rounded-xl transition-all"
                          >
                            ↩️ Listeye Geri Al
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )
        ) : invalidList.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white/[0.02] rounded-2xl border border-white/5 p-6">
            {viewMode === 'active'
              ? 'Aktif sözlük dışı deneme bulunmuyor.'
              : 'Gizlenmiş sözlük dışı deneme bulunmuyor.'}
          </div>
        ) : (
          invalidList.map((item) => {
            const isSelected = selectedWords.has(item.word)
            const isCurrentSwiping = swipingWord === item.word
            const offset = isCurrentSwiping ? swipeOffset : 0
            const isMenuOpen = openMenuWord === item.word

            return (
              <div
                key={item.word}
                className="relative rounded-2xl overflow-hidden touch-pan-y"
                onPointerDown={(e) => handlePointerDown(e, item.word)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              >
                {/* Arka plan Kaydırma Eylemi */}
                <div
                  className={`absolute inset-0 flex items-center justify-end px-5 font-black text-xs transition-colors ${
                    viewMode === 'active' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  <span>{viewMode === 'active' ? '🗑️ Listeden Çıkar' : '↩️ Listeye Al'}</span>
                </div>

                {/* Ön Kart */}
                <div
                  style={{ transform: `translateX(${offset}px)` }}
                  className={`relative p-3 rounded-2xl border transition-transform duration-100 flex items-center justify-between ${
                    isSelected
                      ? 'bg-violet-950/70 border-violet-500/60'
                      : 'bg-slate-900/90 border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => {
                    if (isMultiSelect) handleToggleSelectWord(item.word)
                  }}
                >
                  <div className="flex items-center gap-3">
                    {isMultiSelect && (
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs ${
                          isSelected
                            ? 'bg-violet-600 border-violet-400 text-white'
                            : 'border-white/30 bg-white/5'
                        }`}
                      >
                        {isSelected && '✓'}
                      </div>
                    )}

                    <div className="flex flex-col">
                      <span className="text-sm font-black tracking-wider uppercase text-rose-300 font-mono">
                        {item.word}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        {item.length} Harfli • {item.total} deneme
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ×{item.total}
                    </span>

                    {!isMultiSelect && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          playSound('key_press')
                          setOpenMenuWord((prev) => (prev === item.word ? null : item.word))
                        }}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl active:scale-95 transition-all text-base font-black -mr-1"
                        aria-label="İşlemler menüsü"
                      >
                        ⋯
                      </button>
                    )}
                  </div>

                  {/* Satır İçi Menü */}
                  {isMenuOpen && (
                    <div
                      className="absolute right-3 top-12 z-20 bg-slate-800 border border-white/20 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[150px] animate-scale-up"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {viewMode === 'active' ? (
                        <button
                          type="button"
                          onClick={() => handleHideInvalid(item.word)}
                          className="px-3 py-2 text-left text-xs font-bold text-rose-300 hover:bg-rose-500/20 rounded-xl transition-all"
                        >
                          🗑️ Listeden Çıkar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUnhideInvalid(item.word)}
                          className="px-3 py-2 text-left text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 rounded-xl transition-all"
                        >
                          ↩️ Listeye Geri Al
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </main>

      {/* ─── Çoklu Seçim Alt Eylem Çubuğu ────────────────────────── */}
      {isMultiSelect && (
        <div
          className="p-3 border-t border-white/10 bg-slate-900/95 flex items-center justify-between shrink-0 gap-3"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          <button
            type="button"
            onClick={handleSelectAll}
            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 min-h-[44px]"
          >
            {selectedWords.size > 0 ? 'Seçimi Kaldır' : 'Tümünü Seç'}
          </button>

          <button
            type="button"
            disabled={selectedWords.size === 0}
            onClick={handleBatchAction}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all min-h-[44px] ${
              selectedWords.size > 0
                ? viewMode === 'active'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-white/5 text-slate-500 opacity-50 cursor-not-allowed'
            }`}
          >
            {viewMode === 'active'
              ? `Seçilenleri Çıkar (${selectedWords.size})`
              : `Seçilenleri Listeye Al (${selectedWords.size})`}
          </button>
        </div>
      )}

      {/* ─── 5 Saniyelik Geri Al Bildirimi (Toast) ──────────────── */}
      {undoToast && (
        <aside
          role="status"
          aria-live="polite"
          className="absolute left-4 right-4 z-50 flex items-center justify-between p-3.5 bg-slate-800/95 border border-rose-500/50 rounded-2xl shadow-2xl backdrop-blur-md animate-slide-up"
          style={{
            bottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🗑️</span>
            <span className="text-xs font-bold text-white">
              <strong className="uppercase font-mono">{undoToast.word}</strong> listeden çıkarıldı
            </span>
          </div>

          <button
            type="button"
            onClick={handleUndo}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all active:scale-95 min-h-[36px]"
          >
            Geri Al
          </button>
        </aside>
      )}
      </div>
    </div>
  )
}
