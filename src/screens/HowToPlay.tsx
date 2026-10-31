import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

interface HowToPlayProps {
  onBack: () => void
}

export default function HowToPlay({ onBack }: HowToPlayProps) {
  return (
    <div className="flex flex-col min-h-dvh bg-[var(--color-bg-primary)] px-5 py-6">
      {/* Üst bar */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => {
            playSound('key_press')
            triggerHaptic('tap')
            onBack()
          }}
          className="text-[var(--color-accent)] text-2xl font-bold mr-3 active:scale-90 transition-transform"
          aria-label="Geri"
        >
          ←
        </button>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
          Nasıl Oynanır
        </h2>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-y-auto space-y-5 text-[var(--color-text-secondary)] text-sm leading-relaxed pb-8">
        {/* Genel */}
        <Section title="🎯 Amaç">
          Türkçe kelimeleri tahmin ederek puan topla! 4 tur boyunca kasanı büyüt ve
          büyük finalde tüm puanını katla.
        </Section>

        {/* Turlar */}
        <Section title="📋 Turlar">
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>1. Tur:</strong> 5 adet 4 harfli kelime (1.000 puan/kelime)</li>
            <li><strong>2. Tur:</strong> 5 adet 5 harfli kelime (2.000 puan/kelime)</li>
            <li><strong>3. Tur:</strong> 5 adet 6 harfli kelime (3.000 puan/kelime)</li>
            <li><strong>4. Tur:</strong> Büyük Final — 120 saniyede 4→5→6→7 harfli kelimeler</li>
          </ul>
        </Section>

        {/* Renkler */}
        <Section title="🎨 Harf Renkleri">
          <div className="space-y-2 mt-2">
            <ColorExample color="bg-[var(--color-correct)]" label="Yeşil" desc="Doğru harf, doğru yer" />
            <ColorExample color="bg-[var(--color-present)]" label="Sarı" desc="Harf var ama yeri yanlış" />
            <ColorExample color="bg-[var(--color-absent)]" label="Kırmızı" desc="Harf kelimede yok" />
          </div>
        </Section>

        {/* Kurallar */}
        <Section title="📏 Kurallar">
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Her kelime için <strong>5 tahmin hakkın</strong> var</li>
            <li>İlk harf her zaman verilir (kilitli ve yeşil)</li>
            <li>Her tahmin için <strong>10 saniye</strong> süren var</li>
            <li>TDK'da olmayan kelime yazarsan kelimeyi <strong>kaybedersin</strong></li>
          </ul>
        </Section>

        {/* Bonus */}
        <Section title="⭐ Bonus Soru">
          Her turun sonunda 8 harfli bir kelimenin tanımı verilir. Harfler birer birer
          açılır ve puan 3.000'den düşer. <strong>BİL</strong> butonuna bastığın anda
          puan donar ve kelimeyi yazmak için <strong>5 saniye</strong> süren olur! Doğru
          bilirsen donmuş puan kasana eklenir; yanlışta veya süre dolarsa 0 puan.
        </Section>

        {/* Final */}
        <Section title="🏆 4. Tur — Büyük Final">
          Toplam <strong>120 saniye</strong> tek sayaçla sırasıyla 4, 5, 6 ve 7 harfli kelimeleri çöz.
          Kelime bilinince sayaç donar ve duraklama ekranı açılır. Kelime kaybedilirse doğru cevap
          gösterilip sayaç <strong>~3 saniye donar</strong> ve otomatik yeni kelimeye geçilir.
          Kazanç kasanın <strong>yerine geçer</strong>; süre dolduğunda hiçbir etap tamamlanmamışsa{' '}
          <strong className="text-red-400">0 puan</strong> (kasa yanar). 7 harfli etabı bitirirsen{' '}
          <strong className="text-emerald-400">250.000 + 2×Kasa</strong> kazanırsın!
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5">
      <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-2">{title}</h3>
      {children}
    </div>
  )
}

function ColorExample({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white text-xs font-bold`}>
        A
      </div>
      <div>
        <span className="font-semibold text-[var(--color-text-primary)]">{label}:</span>{' '}
        {desc}
      </div>
    </div>
  )
}
