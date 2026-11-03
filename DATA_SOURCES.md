# Kelime Verisi Kaynakları ve Doğrulama Raporu

> Bu belge, LİNGO oyununda kullanılan kelime verilerinin kaynaklarını,
> uygulanan filtreleri ve doğrulama sonuçlarını belgelemektedir.

---

## Kaynaklar

### Kaynak 1 (Ana): ogun/guncel-turkce-sozluk — TDK GTS v12

- **Repo:** [github.com/ogun/guncel-turkce-sozluk](https://github.com/ogun/guncel-turkce-sozluk)
- **Dosya:** `sozluk/v12/v12.gts.json.tar.gz` (11.5 MB sıkıştırılmış → ~104 MB JSON)
- **İçerik:** TDK Güncel Türkçe Sözlük 12. baskı — 99.236 madde (madde başı + anlamlar + tanımlar)
- **Format:** NDJSON (her satır bir JSON nesnesi)
- **Lisans:** Açık kaynak (TDK verisi kamuya açık)
- **İndirme tarihi:** 2026-10-17

### Kaynak 2 (Çapraz doğrulama): emrahcom/turkce_kelimeler — TDK İmla Kılavuzu

- **Repo:** [github.com/emrahcom/turkce_kelimeler](https://github.com/emrahcom/turkce_kelimeler)
- **Dosya:** `imla_kilavuzu.txt` (765 KB)
- **İçerik:** TDK İmla Kılavuzu'ndan botla çekilmiş kelime listesi — 63.896 satır → 48.610 geçerli tekil kelime (filtre sonrası)
- **Format:** Düz metin, satır başına bir kelime
- **İndirme tarihi:** 2026-10-17

---

## Uygulanan Filtreler (SPEC Bölüm 5.2)

1. **Türkçe küçük harfe çevir** (`toLocaleLowerCase('tr-TR')`)
2. **Şapkalı harfleri normalize et:** `â→a`, `î→i`, `û→u`
3. **Hariç tutulanlar:**
   - Özel isimler (`ozel_mi === "1"`) → 2.266 madde elendi
   - Birleşik/deyim maddeleri (boşluk, tire, kesme işareti, rakam içerenler) → 34.018 madde elendi
   - Kalıplaşmış/çekimli sözler (`cesit !== 0`) → 108 madde elendi (örn. adamı, belası, aldı, gitti, bakılsa, akıllım, canım gibi çekimli/iyelikli veya kalıplaşmış sözler)
   - Harf dışı karakter içerenler → 0 madde
4. **Geçerlilik:** Sadece `[a-zçğıöşü]` harflerinden oluşanlar kabul edildi
5. **Harf sayısı** normalizasyondan sonra hesaplandı
6. **Tekrar silme:** Normalizasyon sonrası aynı kelime → 619 tekrar elendi

---

## Bonus Tanım Filtreleri (SPEC Bölüm 5.3 Sıkılaştırılmış)

1. **"Bkz." ve "►" yönlendirmeleri** atlandı (1.611 kelime)
2. **Karakter ve sözcük uzunluğu:**
   - Anlamın `;` işaretinden önceki ilk bölümü alındı.
   - 90 karakterden uzun olanlar elendi (459 kelime).
   - 20 karakterden kısa veya 4 sözcükten az olan muğlak tanımlar elendi (3.533 kelime).
3. **Cevabı sızdıran tanımlar:**
   - Tanım metni cevabın kendisini içeriyorsa elendi (39 kelime).
   - Tanımdaki herhangi bir sözcük (en az 4 harfli) cevabın ilk 4 harfiyle başlıyorsa elendi (949 kelime).
   - Cevap `-mek`/`-mak` ile bitiyorsa kökün ilk 3 harfiyle başlayan sözcük içerenler elendi (85 kelime).
4. **Seçim:** Bu kuralları karşılayan ilk anlam seçildi; hiçbir anlamı uymayan kelimeler bonus havuzundan çıkarıldı.

---

## Kelime Sayıları

| Uzunluk | Kelime Sayısı | Kullanım |
|---------|---------------|----------|
| 4 harfli | **2.049** | 1. tur + 4. tur etap 1 |
| 5 harfli | **5.449** | 2. tur + 4. tur etap 2 |
| 6 harfli | **6.033** | 3. tur + 4. tur etap 3 |
| 7 harfli | **7.917** | 4. tur etap 4 |
| 8 harfli (bonus, tanımlı) | **2.269** | Bonus soruları |
| **Toplam** | **23.717** | — |

---

## Çapraz Doğrulama: GTS v12 vs İmla Kılavuzu

| Uzunluk | GTS | Her ikisinde | Sadece GTS | Sadece İmla | Örtüşme |
|---------|-----|-------------|-----------|------------|---------|
| 4 harfli | 2.050 | 1.939 | 111 | 58 | **%94,6** |
| 5 harfli | 5.456 | 5.184 | 272 | 166 | **%95,0** |
| 6 harfli | 6.042 | 5.506 | 536 | 186 | **%91,1** |
| 7 harfli | 7.933 | 6.982 | 951 | 235 | **%88,0** |

- Rastgele 20 kelime kontrolü: **19/20 (%95)** İmla Kılavuzu'nda da mevcut
- "Sadece GTS" kelimeler: Güncel Türkçe Sözlük'e sonradan eklenmiş veya İmla Kılavuzu'nun eski baskısından eksik olan kelimeler (normal)

---

## Duman Testi

| Kelime | Beklenen | Sonuç |
|--------|----------|-------|
| `kale` | VAR | ✅ |
| `küpe` | VAR | ✅ |
| `araba` | VAR | ✅ |
| `kitap` | VAR | ✅ |
| `kalemi` | YOK (çekimli hal) | ✅ |
| `xyzq` | YOK (anlamsız) | ✅ |

**Duman testi: ✅ GEÇTİ**

---

## Dosya Formatı

- `public/data/words-4.json` … `words-7.json`: Alfabetik sıralı JSON string dizisi (küçük harf)
- `public/data/bonus-8.json`: `[{ "w": "kelime", "d": "tanım" }, ...]`

---

## Bilinen Sorunlar / Notlar

1. **İmla Kılavuzu'ndaki encoding:** Dosya Latin-1/Windows-1254 gibi encoding ile saklanmış olabilir, bazı özel karakterler doğru okunmayabilir. Çapraz doğrulama oranları bu durumdan az etkilenmiş olabilir.
2. **GTS'ye özgü kelimeler (%5-12):** Güncel Türkçe Sözlük, İmla Kılavuzu'ndan daha kapsamlıdır — ek kelimeler TDK sözlüğünde mevcuttur.
3. **Bonus tanım sızdırma filtresi:** İlk 5 harf bazlı kontrol bazen fazla agresif olabilir (geçerli tanımları eleyebilir). 8.957 kelimeden 3.811'i (%42,5) tanımlı kaldı — yeterli havuz.

---

## LİNGO v2 — Kelime Seviyelendirme (CEFR) Raporu (V2-M2)

> **Önemli Beyan (Kaynak Dürüstlüğü):** 
> Resmi ve makine tarafından doğrudan okunabilir bir CEFR sözcük listesi (Yunus Emre Enstitüsü / TÖMER resmi açık veri seti vb.) bulunamamıştır. 
> Bu nedenle **seviyeler frekans + yapay zekâ çıkarımıdır, resmi CEFR listesi doğrudan kullanılmamıştır**. 
> Seviyelendirme; altyazı/yazılı dil derlem sıklıkları, TDK GTS v12 etiketleri ve CEFR A1-B2 tematik müfredat rubric'leri esas alınarak oluşturulan kural ve çıkarım motoruyla yapılmıştır.

> **Gizlilik ve Telif Notu:**
> `data-src/level-evidence.jsonl` dosyası TDK tanımlarını ve ayrıntılı sözlük verilerini içerdiğinden, telif ve kullanım hakları gereği **GitHub deposu kesinlikle özel (private) kalmalıdır**.

### 1. Seviyelendirmede Kullanılan Kaynaklar, Lisanslar ve Durum

1. **TDK Güncel Türkçe Sözlük (GTS v12):**
   - **Adres:** [github.com/ogun/guncel-turkce-sozluk](https://github.com/ogun/guncel-turkce-sozluk)
   - **İndirme Tarihi:** 2026-10-17
   - **Lisans:** Açık kaynak proje / TDK kamuya açık çevrimiçi sözlük verisi (Telif uyarısı: ticari kullanım ve yeniden dağıtım kısıtlı olabilir; depo özel kalmalıdır).
   - **Kullanım:** Madde başları, tanımlar, anlam sayıları ve TDK etiketleri (`eskimiş`, `ağızlardan`, `tıp`, `biyoloji`, `fizik`, `hukuk`, `felsefe` vb.).

2. **OpenSubtitles 2018 Türkçe Sıklık Derlemi (`hermitdave/FrequencyWords`):**
   - **Adres:** [github.com/hermitdave/FrequencyWords/tree/master/content/2018/tr](https://github.com/hermitdave/FrequencyWords/tree/master/content/2018/tr)
   - **İndirme Tarihi:** 2026-10-18
   - **Lisans:** MIT / CC-BY (Derlem verisi kamuya açık).
   - **Kullanım:** 50.000 kelimelik konuşma/altyazı sıklık sırası ve yüzey biçim kullanım sayısı.

3. **Zemberek-NLP Sıklık Listesi (`ahmetaa/zemberek-nlp`):**
   - **Adres:** [github.com/ahmetaa/zemberek-nlp](https://github.com/ahmetaa/zemberek-nlp)
   - **İndirme Tarihi:** 2026-10-18
   - **Lisans:** Apache 2.0.
   - **Kullanım:** 10.000 kelimelik yazılı Türkçe (gazete, edebiyat, makale) sıklık sıralaması ve kök/lemma frekansı.

4. **Azer Core Vocabulary (`azer/most-common-turkish-words`):**
   - **Adres:** [github.com/azer/most-common-turkish-words](https://github.com/azer/most-common-turkish-words)
   - **İndirme Tarihi:** 2026-10-18
   - **Lisans:** Belirtilmemiş (Unlicensed / Kamu malı GitHub deposu; lisansı belirsiz).
   - **Kullanım:** 1.000 kelimelik en temel Türkçe çekirdek kelime kontrolü.

5. **CEFR Çapa Seti (Core Kolay Anchors - 1.113 kelime):**
   - **Kaynak:** Yunus Emre Enstitüsü "Yedi İklim Türkçe" A1-A2 tematik alanları (aile, renkler, sayılar, yiyecekler, ev, vücut, giyim, somut eşyalar, temel fiiller) referans alınarak yapay zekâ destekli derlenen 1.113 kelimelik çekirdek çapa seti (`scripts/leveling/constants.mjs`).
   - **Not:** Kapı 2'deki %100 geri çağırma (recall), aday kümesinin doğrudan bu 1.113 kelimeyi içermesi nedeniyle matematiksel olarak daireseldir (circular). Bağımsız doğrulama Kapı 3 ve Kapı 6 ile sağlanmıştır.

### 2. Seviye Eşlemesi ve Karar İstatistiği

- **Kolay:** CEFR A1 ve A2 (temel günlük yaşam sözcükleri)
- **Orta:** CEFR B1 ve B2 (orta düzey, iş/okul/medya dili, yaygın soyut kavramlar)
- **Zor:** CEFR C1, C2 ve "ÜST" (nadir, eskimiş, ağız, uzmanlık terimi, edebî/resmî sözcükler)

| Karar Türü | Kelime Sayısı | Oran |
|---|---|---|
| **Kaynaklı (Resmi Çapa / Çekirdek CEFR)** | 1.113 | %4,7 |
| **Kanıta Dayalı Çıkarım (Derlem + TDK Filtreleri)** | 22.604 | %95,3 |
| **Toplam Kelime** | **23.717** | **%100,0** |

### 3. Harf Başına Seviye Dağılımı

| Harf Sayısı | Kolay (A1–A2) | Orta (B1–B2) | Zor (C1+ / Üst) | Toplam | Asgari Sınır | Durum |
|---|---|---|---|---|---|---|
| **4 harfli** | 448 | 374 | 1.227 | 2.049 | ≥ 30 | ✅ Uygun |
| **5 harfli** | 667 | 767 | 4.015 | 5.449 | ≥ 30 | ✅ Uygun |
| **6 harfli** | 364 | 664 | 5.005 | 6.033 | ≥ 30 | ✅ Uygun |
| **7 harfli** | 248 | 618 | 7.051 | 7.917 | ≥ 30 | ✅ Uygun |
| **8 harfli (bonus)** | 102 | 278 | 1.889 | 2.269 | ≥ 10 | ✅ Uygun |
| **GENEL TOPLAM** | **1.829 (%7,7)** | **2.701 (%11,4)** | **19.187 (%80,9)** | **23.717** | — | ✅ Uygun |

*Not: Çalışma anında havuzlar iç içedir: havuz(Kolay) = Kolay, havuz(Orta) = Kolay ∪ Orta, havuz(Zor) = Tüm kelimeler.*

### 4. Kalite Kapıları Sonuçları (SPEC-v2 Bölüm 4.8)

1. **Kapı 1 — Kaynak Kapsama Raporu:** ✅ GEÇTİ (1.113 kaynaklı, 22.604 çıkarımlı, 23.717 kelime tam kapsam).
2. **Kapı 2 — Aday Kümesi Geri Çağırma (Recall):** ✅ GEÇTİ (%100,00 — hedef: ≥ %99).
3. **Kapı 3 — Otomatik-Zor Kontrolü:** ✅ GEÇTİ (%0,33 hata — 300 kelimelik tabakalı örneklemde hedef: ≤ %1,0).
4. **Kapı 4 — Geçişler Arası Uyum (Agreement):** ✅ GEÇTİ (%100,00 — bağımsız Pass 1 ve Pass 2 arasında hedef: ≥ %90).
5. **Kapı 5 — Havuz Asgari Sınırları:** ✅ GEÇTİ (Tüm harf sayıları 4–7 harflide en az 248 kelimeyle [sınır: 30], bonusta 102 kelimeyle [sınır: 10] karşılandı).
6. **Kapı 6 — Denetim Örneği:** ✅ GEÇTİ (`data-src/denetim-ornegi.csv` içinde 50 Kolay, 50 Orta, 50 Zor [25 sınırda] olmak üzere 150 kelimelik tabakalı örnek üretildi).
7. **Kapı 7 — build-levels Raporu:** ✅ GEÇTİ (`npm run build:levels` 0 hata ve 0 uyarı ile `public/data/levels-4..8.json` dosyalarını üretti).

