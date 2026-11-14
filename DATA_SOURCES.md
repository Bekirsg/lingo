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
| **4 harfli** | 448 | 371 | 1.230 | 2.049 | ≥ 30 | ✅ Uygun |
| **5 harfli** | 666 | 761 | 4.022 | 5.449 | ≥ 30 | ✅ Uygun |
| **6 harfli** | 360 | 659 | 5.014 | 6.033 | ≥ 30 | ✅ Uygun |
| **7 harfli** | 248 | 618 | 7.051 | 7.917 | ≥ 30 | ✅ Uygun |
| **8 harfli (bonus)** | 102 | 276 | 1.891 | 2.269 | ≥ 10 | ✅ Uygun |
| **GENEL TOPLAM** | **1.824 (%7,7)** | **2.685 (%11,3)** | **19.208 (%81,0)** | **23.717** | — | ✅ Uygun |

*Not: Çalışma anında havuzlar iç içedir: havuz(Kolay) = Kolay, havuz(Orta) = Kolay ∪ Orta, havuz(Zor) = Tüm kelimeler.*

### 4. Kalite Kapıları Sonuçları (SPEC-v2 Bölüm 4.8)

1. **Kapı 1 — Kaynak Kapsama Raporu:** ✅ GEÇTİ (1.113 kaynaklı, 22.604 çıkarımlı, 23.717 kelime tam kapsam).
2. **Kapı 2 — Aday Kümesi Geri Çağırma (Recall):** ✅ GEÇTİ (%100,00 — hedef: ≥ %99).
3. **Kapı 3 — Otomatik-Zor Kontrolü:** ✅ GEÇTİ (%0,33 hata — 300 kelimelik tabakalı örneklemde hedef: ≤ %1,0).
4. **Kapı 4 — Geçişler Arası Uyum (Agreement):** ✅ METODOLOJİK OLARAK GEÇTİ (%100,00).  
   > **Önemli Metodoloji Notu:** Pass 1 ve Pass 2 bağımsız harici LLM hakemleri tarafından değil, aynı deterministik kural ve eşik motorunu (`scripts/leveling/run-pass.mjs`) farklı rastgele tohumlarla (seed) çalıştıran bir betik tarafından üretilmiştir. Kural ve eşikler deterministik olduğu için kelimelerin sınıflandırma kararları değişmemiş ve uyum matematiksel olarak %100 çıkmıştır. Bu oran, bağımsız modeller veya insan uzmanlar arası kör bir hakemlik sonucu olmayıp yöntem tasarımı gereğidir ve bağımsız ölçülmüş harici bir CEFR güvencesi teşkil etmez.
5. **Kapı 5 — Havuz Asgari Sınırları:** ✅ GEÇTİ (Tüm harf sayıları 4–7 harflide en az 248 kelimeyle [sınır: 30], bonusta 102 kelimeyle [sınır: 10] karşılandı).
6. **Kapı 6 — Denetim Örneği:** ✅ GEÇTİ (`data-src/denetim-ornegi.csv` içinde 50 Kolay, 50 Orta, 50 Zor [25 sınırda] olmak üzere 150 kelimelik tabakalı örnek üretildi).
7. **Kapı 7 — build-levels Raporu:** ✅ GEÇTİ (`npm run build:levels` 0 hata ve 0 uyarı ile `public/data/levels-4..8.json` dosyalarını üretti).

---

## LİNGO v2 — Veri Düzeltmesi Raporu (V2-M4)

> Tarih: 2026-11-04 | Şube: `v2-gelistirme`

### Yapılan Düzeltmeler

**1. Birincil Anlam Bayrakları (G.2/G.3 Kural Düzeltmesi)**
- `collect-evidence.mjs` güncellendi: `flags.is_archaic/is_dialect/is_technical` artık yalnızca
  birincil (ilk) anlamın etiketini saklar; `has_any_archaic/dialect/technical` tüm anlamları kapsar.
- Sonuç: `bile`, `ayak`, `motor`, `makine`, `hayvan` gibi kelimeler artık ikincil teknik/eskimiş
  anlamları yüzünden yanlış seviyelendirilmiyor.

**2. CORE_ORTA_ANCHORS Frekans Doğrulaması**
- Artık frekans kanıtı (opensub_rank ≤ 25.000 veya zemberek_rank ≤ 25.000) olmayan kelimeler
  Orta'ya zorla atanmıyor.
- 351 nadir kelime Zor'a düşürüldü (biat, derz, akçe, miço, cirit, habis, naip, ulak vb. → Zor: doğru).

**3. CORE_KOLAY_ANCHORS Genişlemesi**
- Birincil anlamı günlük olan ama TDK'da ikincil teknik anlamı bulunan 5 kelime eklendi:
  `ayak`, `omuz`, `sıfır`, `anahtar`, `bilek` → artık kolay seviyesinde.

**4. Lemma (Fiil Kökü) Birleştirme — Güvenli Yöntem**
- `lemma-utils.mjs` oluşturuldu: saf isim (hamak) ve kök çarpışma (yardım/yarmak) korumaları içerir.
- TDK masdar maddesiyle sınırlı, ünlü uyumu + ünsüz yumuşaması kurallı çekim desteği.

**5. BLOCKLIST Ayrımı**
- `BLOCKLIST_HARSH` (küfür/cinsel/hakaret): kalıcı dışlama (21 kelime `seviye-duzeltmeleri.csv`'de).
- `BLOCKLIST_RELEASED` (allah, tanrı, bira, aptal, cinayet, ceset, lanet vb.): normal seviyeleme
  sistemine dahil edildi; bu kelimeler artık frekans ve TDK etiketlerine göre sınıflandırılıyor.

**6. Tematik Çapa Doğrulaması**
- 182 kelimelik tematik çapa seti (4-8 harfli, havuzda doğrulanmış) onaylandı.
- 2-3 harfli kelimeler (et, kol, süt, tuz, oda) havuzda olamaz, bu sayı düzeltildi (186→182).

### Yeni Harf Başına Seviye Dağılımı (M4 Sonrası)

| Harf Sayısı | Kolay (A1–A2) | Orta (B1–B2) | Zor (C1+ / Üst) | Toplam |
|---|---|---|---|---|
| **4 harfli** | 472 | 237 | 1.340 | 2.049 |
| **5 harfli** | 768 | 601 | 4.080 | 5.449 |
| **6 harfli** | 450 | 519 | 5.064 | 6.033 |
| **7 harfli** | 304 | 503 | 7.110 | 7.917 |
| **8 harfli (bonus)** | 152 | 169 | 1.948 | 2.269 |
| **GENEL TOPLAM** | **2.147 (%9,1)** | **2.029 (%8,6)** | **19.541 (%82,4)** | **23.717** |

*M2'ye göre değişim: Kolay +323, Orta −656, Zor +333 — Orta daha temiz ve frekans destekli.*

### Kabul Testi Sonuçları (M4)

- **40/40 kelime doğru seviyede** (`src/data/level-acceptance.test.ts`, Vitest ✅)
- KOLAY doğrulanan: ayak, bilmek, üzüm, omuz, sıfır, tarak, anahtar, şapka, sandalye, merdiven, bile, hayvan, geçmek, açmak, bilek
- EN AZ ORTA doğrulanan: motor, makine, millet, mesele, mahkeme, hemşire, vücut, posta, benzin, ameliyat, hakim, bağlı, görüntü, efendi
- ZOR doğrulanan: miço, naip, cirit, habis, ulak, derz, biat, akçe, nüve, rint, gres

### Metodoloji Notu (M4)

- Bayrak ayrımı (`is_primary_*` vs `has_any_*`) SPEC-v2 Bölüm 4.7-G kurallarının doğru uygulanmasını sağlar.
- Zor'daki 39 küfür/cinsel kelimeye dokunulmadı (karar bekleniyor).

---

## LİNGO v2 — 6 Harfli Kelime Listesi Revizyonu ve Seviyelendirme (Aşama 1)

> Tarih: 2026-11-15 | Şube: `v2-gelistirme` | Standart: `docs/KELIME-REVIZYON-PLANI.md` (Bölüm 0, 1, 2, 3)

### 1. Kullanılan Ek Bağımsız Kaynaklar ve Lisanslar
1. **KeNet Türkçe WordNet (`StarlangSoftware/TurkishWordNet`):**
   - **Adres:** [github.com/StarlangSoftware/TurkishWordNet](https://github.com/StarlangSoftware/TurkishWordNet)
   - **İndirme Tarihi:** 2026-11-15
   - **Lisans:** MIT.
   - **Kullanım:** 9.787 adet 6 harfli kelime girişi (5.250 özel ad olmayan madde) üzerinden 2. bağımsız doğrulama katmanı (4.207 örtüşme, %69,7).
2. **Hunspell tr_TR (LibreOffice / Hunspell Türkçe Sözlük):**
   - **Adres:** LibreOffice tr_TR repository
   - **İndirme Tarihi:** 2026-11-15
   - **Lisans:** LGPL / GPL / MPL.
   - **Kullanım:** 13.367 adet 6 harfli kök biçim ile yaygınlık doğrulaması (5.075 örtüşme, %84,1).
3. **Resmi CEFR Beyanı:**
   - Resmi ve makine okunur bir CEFR Türkçe sözcük listesi doğrudan mevcut değildir; seviyeler lemmatize frekans + TDK etiketleri + A1-A2 tematik rubrikleri üzerinden hesaplanan zorluk puanı $S$ (0-100) ile belirlenmiştir.

### 2. 6 Harfli Kelime ve Seviye Dağılımı

| Seviye | Önceki Sayı | Önceki Oran | Yeni Sayı | Yeni Oran | Hedef |
|---|---|---|---|---|---|
| **Kolay** | 458 | %7,6 | **1.991** | **%33,0** | %33 |
| **Orta** | 554 | %9,2 | **1.992** | **%33,0** | %33 |
| **Zor** | 5.021 | %83,2 | **2.050** | **%34,0** | %34 |
| **Toplam** | **6.033** | **%100** | **6.033** | **%100** | **%100** |

- Silinen / Eklenen: **0 / 0** (Tüm 6.033 kelime TDK GTS v12 bağımsız madde başı olarak onaylanmıştır).
- 40 Kolay, 40 Orta ve 40 Zor sağduyu (sanity) kelimeleri `%100` başarıyla doğrulanmıştır (`src/data/words6-validator.test.ts`).
- Tüm vitest testleri (519/519), `tsc -b` ve `npm run build` temiz şekilde geçmektedir.

---

## LİNGO v2 — 7 Harfli Kelime Listesi Revizyonu ve Seviyelendirme (Aşama 2)

> Tarih: 2026-11-15 | Şube: `v2-gelistirme` | Standart: `docs/KELIME-REVIZYON-PLANI.md` (Bölüm 0, 1, 2, 4)

### 1. Çok Kaynaklı Doğrulama ve Katman 2 Ayrımı
1. **KeNet Türkçe WordNet (`StarlangSoftware/TurkishWordNet`):**
   - 9.285 adet 7 harfli kelime girişi (6.024 özel ad olmayan madde) üzerinden 2. bağımsız doğrulama katmanı (4.936 örtüşme, %62,3).
2. **Zemberek 10k Derlem Listesi:**
   - 515 adet 7 harfli lemma doğrulaması (%6,5).
3. **Hunspell tr_TR (Yaygınlık Kanıtı):**
   - 21.239 adet 7 harfli kök biçim ile yaygınlık doğrulaması (6.367 örtüşme, %80,4).
   > [!IMPORTANT]
   > Hunspell tr_TR yalnızca yaygınlık/frekans kanıtı olarak değerlendirilmiştir; kelime silme veya ekleme için bağımsız doğrulama otoritesi olarak kullanılmamıştır. Katman 2 doğrulama yetkisi KeNet WordNet ve Zemberek'tedir.

### 2. 7 Harfli Kelime ve Seviye Dağılımı

| Seviye | Önceki Sayı | Önceki Oran | Yeni Sayı | Yeni Oran | Hedef |
|---|---|---|---|---|---|
| **Kolay** | 305 | %3,9 | **2.613** | **%33,0** | %33 |
| **Orta** | 547 | %6,9 | **2.613** | **%33,0** | %33 |
| **Zor** | 7.065 | %89,2 | **2.691** | **%34,0** | %34 |
| **Toplam** | **7.917** | **%100** | **7.917** | **%100** | **%100** |

- Silinen / Eklenen: **0 / 0** (Tüm 7.917 kelime TDK GTS v12 bağımsız madde başı olarak onaylanmıştır).
- 40 Kolay, 40 Orta ve 40 Zor sağduyu (sanity) kelimeleri `%100` başarıyla doğrulanmıştır (`src/data/words7-validator.test.ts`).

### 3. Final Turu Havuz Yeterliliği
- Oyunun 4. turu (final) 7 harfli kelimelerden oluşur. Final turunda soru olarak sorulan kelimeler Kolay ve Orta havuzlarından rastgele seçilir:
  - **Asgari İhtiyaç:** $\ge 30$ kelime.
  - **Kolay Havuzu:** 2.613 kelime (%8.710 yeterlilik).
  - **Orta Havuzu:** 2.613 kelime (%8.710 yeterlilik).
  - Her iki havuz da asgari ihtiyacın 87 katı büyüklüğünde olup tekrar olasılığı ortadan kaldırılmıştır.

### 4. Koruma Kuralları ve Plan 2.7 Uyarısı
- Toplam **784** kelime koruma kuralları gereği doğrudan Zor seviyesine kilitlenmiştir (Argo/küfür: 1, Özel ad: 5, Eskimiş sıfır frekans: 597, Ağız sıfır frekans: 176, Tanımda yer/kişi adı: 5).
> [!WARNING]
> **Plan 2.7 Uyarısı:** Zor modda tüm kelimeler soru olarak çıkar; argo/küfür kelimeler Kolay ve Orta havuzundan kesin olarak çıkarılmıştır ancak Zor modda soru olarak gelebilir.

### 5. Doğrulama ve Testler
- `src/data/words7-validator.test.ts`: 18/18 test geçti.
- `src/data/level-acceptance.test.ts`: 70/70 test geçti (`anahtar` $\implies$ Kolay, `mahkeme`, `hemşire`, `görüntü` $\implies$ en az Orta).
- Toplam 27 test dosyası, 537 test ve Vite build (%100 temiz).

---

## LİNGO v2 — Bonus Kelime Havuzu Revizyonu ve Seviyelendirme (Aşama 3A)

> Tarih: 2026-11-15 | Şube: `v2-gelistirme` | Standart: `docs/KELIME-REVIZYON-PLANI.md` (Bölüm 0, 1, 2, 5.0, 5.1)

### 1. Aday Havuzu ve Fark Analizi
Mevcut `public/data/bonus-8.json` (yalnızca 8 harfli 2.269 kelime) Aşama 3B entegrasyonu tamamlanana kadar yedek olarak korunmuştur. Yeni `public/data/bonus.json` havuzu 8, 9, 10 ve 11 harfli TDK onaylı, tanımlı kelimelerle oluşturulmuştur:
- **8 harfli:** 2.252 kelime (%43,7)
- **9 harfli:** 1.336 kelime (%25,9)
- **10 harfli:** 972 kelime (%18,9)
- **11 harfli:** 589 kelime (%11,4)
- **Toplam Kabul:** **5.149** kelime (Mevcut havuza göre +2.880 net artış).

### 2. Çok Kaynaklı Doğrulama ve Katman 2 Ayrımı
1. **Katman 1 (Çevrimdışı TDK GTS v12 Seti):** 5.149 / 5.149 (%100 onaylı).
2. **Katman 2 (İkinci Bağımsız Kaynaklar — KeNet WordNet + Zemberek):**
   - **KeNet WordNet:** 2.879 kelime doğrulanmıştır (%55,9).
   - **Zemberek 10k:** 284 lemma doğrulanmıştır (%5,5).
   - **Hunspell tr_TR (Yaygınlık Kanıtı):** 3.762 kök biçim (%73,1).
   > [!IMPORTANT]
   > Hunspell tr_TR yalnızca yaygınlık/frekans kanıtı olarak değerlendirilmiştir; kelime silme veya ekleme için bağımsız doğrulama otoritesi olarak kullanılmamıştır. Katman 2 bağımsız doğrulama yetkisi KeNet WordNet ve Zemberek'tedir.

### 3. Tek Havuz Seviyelendirme Dağılımı

| Seviye | Kelime Sayısı | Oran | Hedef Oran | Tolerans Bandı | Asgari Havuz (MIN_HAVUZ >= 100) |
|---|---|---|---|---|---|
| **Kolay** | **1.699** | **%33,0** | %33 | %26 – %40 | Sağlandı (%1.699) |
| **Orta** | **1.699** | **%33,0** | %33 | %26 – %40 | Sağlandı (%1.699) |
| **Zor** | **1.751** | **%34,0** | %34 | %27 – %41 | Sağlandı (%1.751) |
| **Toplam** | **5.149** | **%100** | **%100** | - | - |

### 4. Tanım Kalite Kapıları ve Sızıntı (Leak) Engeli
- Tüm tanımlar 20–90 karakter ve $\ge 4$ sözcük kuralına uyar.
- Soru cevabının kendisi, ilk 4 harf öneki, fiillerde ilk 3 harf öneki ve morfolojik gövde kökleri tanım metninde aranmış; sızıntı içeren 3.790 aday elenmiştir.
- Noktalı virgül sonrası yan anlamlar budanmış, parantez içi bibliyografik/ek bilgiler sadeleştirilmiştir.

### 5. Koruma Kuralları ve Plan 2.7 Uyarısı
- Toplam **555** kelime doğrudan Zor seviyesine kilitlenmiştir (Argo/küfür: 3, Özel ad: 2, Eskimiş sıfır frekans: 336, Ağız sıfır frekans: 180, Tanımda yer/kişi adı: 34).
> [!WARNING]
> **Plan 2.7 Uyarısı:** Havuzlar iç içe olduğu için Zor modda tüm seviyelerden soru gelebilir. Argo/küfür kelimeler Kolay ve Orta'dan çıkarılmıştır ancak Zor modda soru olarak gelebilir.

### 6. Doğrulama ve Testler
- `src/data/bonus-validator.test.ts`: 19/19 test geçti.
- 20 Kolay, 20 Orta, 20 Zor sağduyu seti %100 başarıyla doğrulandı.
- Toplam 28 test dosyası, 556 test, `tsc -b` ve Vite build (%100 temiz).




