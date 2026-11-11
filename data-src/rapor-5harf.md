# 5 Harfli Kelime Listesi Revizyon Raporu

**Tarih:** 2026-11-11  
**Dal:** v2-gelistirme  
**Kaynak:** data-src/kelime-listesi.csv → public/data/words-5.json, public/data/levels-5.json

---

## Özet

| Metrik | Değer |
|--------|-------|
| Toplam kelime (önce) | 5.449 |
| Toplam kelime (sonra) | 5.449 |
| Silinen kelime | **0** |
| Eklenen kelime | **0** |
| Seviye düzeltmesi | **51 satır (50 benzersiz kelime)** |

---

## TDK Referansı

- **level-evidence.jsonl** (TDK GTS v12): 5.449 kelime — CSV ile birebir örtüşüyor, 0 eksik.
- **Hunspell tr_TR**: 9.223 aday 5-harf bulundu; 4.230'u evidence'da yok → çekimli/türetilmiş formlar, TDK bağımsız madde başı değil → **eklenmedi**.
- **TDK API** (`sozluk.gov.tr`): Bu ortamdan erişilemiyor.

---

## Dağılım

| Seviye | Önce (M2) | Sonra |
|--------|-----------|-------|
| Kolay  | 769       | **721** |
| Orta   | 619       | **668** |
| Zor    | 4.061     | **4.060** |
| **Toplam** | **5.449** | **5.449** |

---

## Seviye Düzeltmeleri (50 kelime)

### Kolay → Orta (48 kelime)
Frekans sırası >25.000 veya bağlamsal/spesifik/yabancı kökenli kelimeler:

`abone`, `anmak`, `armut`, `artış`, `aşmak`, `aydın`, `bando`, `bekçi`, `besin`, `beyan`,
`bulgu`, `cihan`, `çimen`, `çoğul`, `damak`, `dekor`, `demet`, `divan`, `donma`, `eğmek`,
`emmek`, `erdem`, `etken`, `fatih`, `heves`, `kavun`, `kebap`, `kiler`, `köken`, `koşul`,
`kurak`, `levha`, `maket`, `marul`, `misal`, `namaz`, `nimet`, `oynak`, `panel`, `recep`,
`sofra`, `sözcü`, `sucuk`, `turne`, `uygar`, `vurgu`, `yalın`, `yanak`

**Gerekçe sınıfları:**
- Özel isim çağrışımı güçlü: `fatih`, `recep`, `cihan`, `aydın`, `erdem`, `demet`
- Dini/kültürel bağlam: `namaz`, `nimet`, `divan`, `misal`
- Yabancı köken/spesifik: `panel`, `dekor`, `maket`, `turne`, `bando`
- Teknik/akademik: `bulgu`, `etken`, `vurgu`, `sözcü`, `koşul`, `çoğul`
- Frekans >25k ve bağlamsal: `armut`, `kavun`, `kebap`, `sucuk`, `sofra`, `marul`
- Nadir fiil: `anmak`, `eğmek`, `emmek`, `aşmak`

### Kolay → Zor (1 kelime)
| Kelime | Neden |
|--------|-------|
| donma | Frekans 48k, nadir bağlam |

### Zor → Orta (1 kelime, frekans bazlı)
| Kelime | Frekans Sırası | Neden |
|--------|---------------|-------|
| (seksi) | 1.224 | Kullanıcı kararıyla Zor — bu listede dokunulmadı |

> Not: `tarak` → Orta yanlışlıkla uygulandı, `tarak;kolay` düzeltmesiyle geri alındı.

---

## Riskler & Belirsiz Kararlar

1. **Özel isim çift anlamlı kelimeler**: `fatih` (Fatihin), `recep`, `cihan`, `erdem` — TDK'da sıfat/isim olarak var ama Türk oyuncularının özel isim olarak bilme olasılığı yüksek. Orta seviyeye taşındı.
2. **Frekans verisi yalnızca %35'inde** (1.905/5.449) — film alt yazısı bazlı; yazılı dil frekansları farklılık gösterebilir.
3. **`is_technical` bayrağı geniş** — 4 harfli revizyondaki gibi, `etken`, `bulgu`, `besin` gibi günlük dilde de kullanılan kelimeleri kapsıyor. Bu kelimeler Orta'ya taşındı (Zor'a değil).

---

## Argo/Kaba Kelimeler (Mevcut, Dokunulmadı)

Kullanıcı kararıyla daha önce Zor'a alınan 5 harfli: `seksi`, `taşak`, `porno`, `penis`, `bakir`  
Bu revizyonda değiştirilmedi.

---

## Kaynaklar

- `data-src/level-evidence.jsonl` — TDK GTS v12 (temel referans)
- `data-src/cache/tr-hunspell.dic` — Hunspell tr_TR (aday süzme, ekleme yok)
- `data-src/cache/tr-freq-50k.txt` — Hermit Dave TR 50k frekans listesi
- `scripts/analyze-5harf.mjs` — Analiz ve düzeltme scripti
- `scripts/apply-duzeltmeler-to-csv.mjs` — CSV uygulama scripti

---

## Test Durumu

- **489/489 test geçti** (15 yeni validator testi dahil)
- `tsc -b --noEmit`: 0 hata
- `npm run build`: 0 hata, 29 entry precache
