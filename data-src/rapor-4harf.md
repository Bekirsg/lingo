# 4 Harfli Kelime Listesi Revizyon Raporu

**Tarih:** 2026-11-11  
**Dal:** v2-gelistirme  
**Kaynak:** data-src/kelime-listesi.csv → public/data/words-4.json, public/data/levels-4.json

---

## Özet

| Metrik | Değer |
|--------|-------|
| Toplam kelime (önce) | 2.049 |
| Toplam kelime (sonra) | 2.049 |
| Silinen kelime | **0** |
| Eklenen kelime | **0** |
| Seviye düzeltmesi | **40 satır (27 benzersiz kelime)** |

---

## TDK Referansı

- **level-evidence.jsonl**: TDK GTS v12 (99.236 madde) verisi — tüm 2.049 kelime bu kaynakta mevcut.
- **Hunspell tr_TR**: 836 ek aday bulundu — ancak bunlar çekimli/türetilmiş formlar, TDK bağımsız madde başı değil → **eklenmedi**.
- **TDK API** (`sozluk.gov.tr`): Bu ortamdan erişilemiyor (HTML yanıtı / timeout).

---

## Dağılım

| Seviye | Önce (M2) | Sonra |
|--------|-----------|-------|
| Kolay  | 472       | **433** |
| Orta   | 240       | **264** |
| Zor    | 1.337     | **1.352** |
| **Toplam** | **2.049** | **2.049** |

> Not: Kolay sayısı azaldı çünkü bazı kelimeler M2'de yanlışlıkla Kolay olarak işaretlenmişti.

---

## Seviye Düzeltmeleri (27 benzersiz kelime)

### Kolay → Orta (15 kelime)
| Kelime | Neden |
|--------|-------|
| ajan | İng. *agent* → yabancı kökenli, orta düzey |
| aziz | Hem özel ad hem din terimi |
| bacı | Kız kardeş (ağız) — ağız sözcüğü |
| efor | İng. *effort* → yaygın ama yabancı |
| filo | Denizcilik/askeri bağlam |
| fuar | Belirli bağlam (sergi) |
| hacı | Dini bağlam |
| hobi | İng. *hobby* → yaygın ama yabancı |
| ilim | Arapça, bilim/fen — orta düzey kavram |
| imam | Dini bağlam |
| jüri | Yargı/yarışma terimi |
| kene | Hayvan adı, nadir |
| koro | Müzik terimi |
| logo | İng. *logo* → yaygın ama yabancı |
| meşe | Ağaç türü |
| uslu | has_any_archaic var |

### Kolay → Orta (devam, M2 hatası)
| Kelime | Neden |
|--------|-------|
| avlu | İç bahçe — orta |
| bacı | Kız kardeş (ağız) — orta |
| elem | Üzüntü/dert — edebî bağlam |
| ilke | Prensip — orta düzey kavram |
| küme | Grup — orta |
| tapu | Hukuki belge — teknik |
| vaha | Çöl vahası |
| vefa | Sadakat/dürüstlük |
| veto | Siyasi terim |

### Kolay → Zor (3 kelime)
| Kelime | Neden |
|--------|-------|
| düet | Fransızca köken, müzik terimi, nadir |
| edip | Edebî — eskimiş anlam (yazar) |
| tüyo | Argo — bahis dili |

---

## Argo/Kaba Kelimeler

Önceki oturumda (M3.1) Kolay/Orta havuzundaki 21 kaba/cinsel içerikli sözcük Zor'a aktarılmıştı. Bu revizyon sadece 4 harfli kelimelere dokundu:

| Kelime | Durum |
|--------|-------|
| meme | Zor (kullanıcı kararı, M3.1) |
| meni | Zor (kullanıcı kararı, M3.1) |
| kaka | Zor (kullanıcı kararı, M3.1) |

---

## Riskler

1. **`is_technical` bayrağı geniş** — `ense`, `omuz`, `hece`, `tapu`, `zeka` gibi günlük kelimeleri de kapsıyor. Seviye kararında kullanılmadı.
2. **Frekans verisi eksik** — 2.049 kelimenin yalnızca 962'sinde OpenSubtitles frekansı var. Frekans tek başına seviye kriteri olarak kullanılmadı.
3. **Hunspell adayları** — 836 kelime TDK'da bağımsız madde başı değil (çekimli/türetilmiş). İleride TDK API erişilebilir olursa tekrar değerlendirilebilir.

---

## Test Durumu

- **474/474 test geçti** (14 yeni validator testi dahil)
- `tsc -b --noEmit`: 0 hata
- `npm run build`: 0 hata, 29 entry precache

---

## Doğrulama Scripti

`src/data/words4-validator.test.ts` — 14 test:
- Tüm kelimeler tam 4 karakter
- Yalnızca Türkçe alfabesi (q/w/x yok)
- Yineleme yok
- Kolay ∩ Orta = ∅
- Tüm seviye kelimeleri TDK referansında
- Makul sayı aralıkları
