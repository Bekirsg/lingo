# Kelime Verisi Kaynakları ve Doğrulama Raporu

> Bu belge, BEKİR-EREN oyununda kullanılan kelime verilerinin kaynaklarını,
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
   - Harf dışı karakter içerenler → 36 madde elendi
4. **Geçerlilik:** Sadece `[a-zçğıöşü]` harflerinden oluşanlar kabul edildi
5. **Harf sayısı** normalizasyondan sonra hesaplandı
6. **Tekrar silme:** Normalizasyon sonrası aynı kelime → 621 tekrar elendi

---

## Bonus Tanım Filtreleri (SPEC Bölüm 5.3)

1. **"Bkz." yönlendirmeleri** atlandı
2. **"►" işaretli kısa yönlendirmeler** atlandı (bunlar da bkz. niteliğinde)
3. **5 karakterden kısa tanımlar** atlandı
4. **Cevabı sızdıran tanımlar** elendi:
   - Tanım metni cevabın kendisini içeriyorsa → atla
   - Tanım metni cevabın ilk 5 harfini paylaşan bir sözcük içeriyorsa → atla
   - Tüm anlamlar sızdırıyorsa kelime bonus havuzundan çıkarıldı

---

## Kelime Sayıları

| Uzunluk | Kelime Sayısı | Kullanım |
|---------|---------------|----------|
| 4 harfli | **2.050** | 1. tur + 4. tur etap 1 |
| 5 harfli | **5.456** | 2. tur + 4. tur etap 2 |
| 6 harfli | **6.042** | 3. tur + 4. tur etap 3 |
| 7 harfli | **7.933** | 4. tur etap 4 |
| 8 harfli (bonus, tanımlı) | **3.811** | Bonus soruları |
| **Toplam** | **25.292** | — |

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
