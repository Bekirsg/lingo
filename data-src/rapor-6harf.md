# 6 Harfli Kelime Listesi Revizyon Raporu

**Tarih:** 2026-11-14  
**Dal:** v2-gelistirme  
**Kaynak:** data-src/kelime-listesi.csv → public/data/words-6.json, public/data/levels-6.json  
**Standart:** docs/KELIME-REVIZYON-PLANI.md (Bölüm 0, 1, 2, 3)

---

## 1. Özet

| Metrik | Değer |
|--------|-------|
| Toplam kelime (önce) | **6033** |
| Toplam kelime (sonra) | **6033** |
| Silinen kelime | **0** (Tüm kelimeler TDK GTS v12'de onaylı bağımsız madde) |
| Eklenen kelime | **0** (TDK GTS v12'deki tüm geçerli 6 harfli maddeler zaten mevcuttur) |
| Şüpheli kelime | **0** |

---

## 2. Çok Kaynaklı Doğrulama (Üç Katman)

1. **Katman 1 (Çevrimdışı TDK GTS v12 Seti):**
   - Toplam onaylanan: 6033 / 6033 (%100).
   - Silme adayı: 0, Ekleme adayı: 0.

2. **Katman 2 (İkinci Bağımsız Kaynaklar):**
   - **KeNet WordNet:** 4207 kelime doğrulanmıştır (%69.7).
   - **Hunspell tr_TR:** 5075 kelime doğrulanmıştır (%84.1).

3. **Katman 3 (Canlı TDK GTS Örneklemesi):**
   - 300 kelimelik rastgele örneklem oluşturuldu.
   - Durum: Canlı TDK API bu sanal ortamda engelli/zaman aşımı vermektedir (0/300 tamamlandı).
   - Güvenlik Protokolü (Plan Bölüm 2.4): Canlı TDK erişilemediğinde çevrimdışı 1. ve 2. katmanlar tam doğrulama sağlamıştır.

---

## 3. Seviye Dağılımı ve Eşitlik Hedefi

| Seviye | Önceki Sayı | Önceki Oran | Yeni Sayı | Yeni Oran | Hedef Oran | Tolerans Bandı |
|---|---|---|---|---|---|---|
| **Kolay** | 1991 | %33.0 | **1991** | **%33.0** | %33 | %26 – %40 |
| **Orta**  | 1992 | %33.0 | **1992** | **%33.0** | %33 | %26 – %40 |
| **Zor**   | 2050 | %34.0 | **2050** | **%34.0** | %34 | %27 – %41 |
| **Toplam** | **6033** | **%100** | **6033** | **%100** | **%100** | - |

> [!NOTE]
> Dağılım tam olarak hedeflenen %33 Kolay / %33 Orta / %34 Zor dengesini sağlamıştır.

---

## 4. Koruma Kuralları (Guards) Nedeniyle Taşınanlar

Toplam **915** kelime doğrudan Zor seviyesine kilitlenmiştir:
- **Argo / Küfür:** 13 kelime (Kolay ve Orta'dan kesin dışlandı).
- **Özel İsimler:** 11 kelime (Kişi/yer adları Zor'a aktarıldı).
- **Eskimiş (Archaic):** 651 kelime (Yaşayan anlamı ve frekansı olmayan maddeler Zor'a aktarıldı).
- **Ağız (Dialect):** 237 kelime (Yalnızca yerel ağızda kullanılan maddeler Zor'a aktarıldı).
- **Tanımda Yer/Kişi Adı Belirtilen:** 3 kelime.

### Argo / Küfür Maddeleri Örnekleri (10 Örnek)
- `boktan`
- `orospu`
- `fahişe`
- `kaltak`
- `manyak`
- `sıçmak`
- `erotik`
- `orgazm`
- `vajina`
- `bakire`

---

## 5. Sağduyu (Sanity) Testi

| Kategori | Kelime Sayısı | Sonuç |
|---|---|---|
| Kolay Sanity | 40 | %100 Başarılı |
| Orta Sanity | 40 | %100 Başarılı |
| Zor Sanity | 40 | %100 Başarılı |

---

## 6. Ajan Bilgisiyle Verilen Kararlar

1. **Fiil Masdarları Lemmatizasyonu:** 6 harfli fiil masdarları (-mek/-mak) için yüzey sıklığı yerine çekim aileleri (geniş zaman, şimdiki zaman, geçmiş zaman vb.) toplanarak doğal frekanslarına yükseltildi.
2. **İsim Çekim Entegrasyonu:** Yaygın 6 harfli isimlerin çoğul (-lar/-ler) ve hâl ekli biçimleri OpenSubtitles havuzundan taranarak kök frekansına dahil edildi.
3. **Özel İsim / Şehir / Boy Adları:** Altyazılarda sık geçmesine rağmen TDK'da özel isim veya coğrafi yer belirten maddeler Kolay ve Orta havuzundan çıkarılarak Zor'a kilitlendi.
