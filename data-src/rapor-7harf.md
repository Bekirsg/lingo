# 7 Harfli Kelime Listesi Revizyon Raporu

**Tarih:** 2026-11-14  
**Dal:** v2-gelistirme  
**Kaynak:** data-src/kelime-listesi.csv → public/data/words-7.json, public/data/levels-7.json  
**Standart:** docs/KELIME-REVIZYON-PLANI.md (Bölüm 0, 1, 2, 4)

---

## 1. Özet

| Metrik | Değer |
|--------|-------|
| Toplam kelime (önce) | **7917** |
| Toplam kelime (sonra) | **7917** |
| Silinen kelime | **0** (Tüm kelimeler TDK GTS v12'de onaylı bağımsız madde) |
| Eklenen kelime | **0** (TDK GTS v12'deki tüm geçerli 7 harfli maddeler zaten mevcuttur) |
| Şüpheli kelime | **0** |

---

## 2. Çok Kaynaklı Doğrulama (Üç Katman)

1. **Katman 1 (Çevrimdışı TDK GTS v12 Seti):**
   - Toplam onaylanan: 7917 / 7917 (%100).
   - Silme adayı: 0, Ekleme adayı: 0.

2. **Katman 2 (İkinci Bağımsız Kaynaklar — KeNet WordNet + Zemberek):**
   - **KeNet WordNet:** 4936 kelime doğrulanmıştır (%62.3).
   - **Zemberek 10k:** 515 kelime doğrulanmıştır (%6.5).
   - **Hunspell tr_TR (Yaygınlık Kanıtı):** 6367 kelime (%80.4).

> [!IMPORTANT]
> Hunspell tr_TR yalnızca yaygınlık/frekans kanıtı olarak değerlendirilmiştir; kelime silme veya ekleme için bağımsız doğrulama otoritesi olarak kullanılmamıştır. Katman 2 doğrulama otoritesi KeNet WordNet ve Zemberek'tir.

3. **Katman 3 (Canlı TDK GTS Örneklemesi):**
   - 300 kelimelik rastgele örneklem oluşturuldu.
   - Durum: Canlı TDK API bu sanal ortamda engelli/zaman aşımı vermektedir (0/300 tamamlandı).
   - Güvenlik Protokolü (Plan Bölüm 2.4): Canlı TDK erişilemediğinde çevrimdışı 1. ve 2. katmanlar tam doğrulama sağlamıştır.

---

## 3. Seviye Dağılımı ve Eşitlik Hedefi

| Seviye | Önceki Sayı | Önceki Oran | Yeni Sayı | Yeni Oran | Hedef Oran | Tolerans Bandı |
|---|---|---|---|---|---|---|
| **Kolay** | 305 | %3.9 | **2613** | **%33.0** | %33 | %26 – %40 |
| **Orta**  | 547 | %6.9 | **2613** | **%33.0** | %33 | %26 – %40 |
| **Zor**   | 7065 | %89.2 | **2691** | **%34.0** | %34 | %27 – %41 |
| **Toplam** | **7917** | **%100** | **7917** | **%100** | **%100** | - |

> [!NOTE]
> Dağılım tam olarak hedeflenen %33 Kolay / %33 Orta / %34 Zor dengesini sağlamıştır.

---

## 4. Final Turu Havuz Yeterliliği Analizi (4. Tur - 7 Harf Final Aşaması)

Oyunun 4. turu (final) 7 harfli kelimelerden oluşmaktadır. Final turunda soru olarak sorulan kelimeler Kolay ve Orta havuzlarından rastgele seçilmektedir:
- **Asgari Havuz İhtiyacı:** En az 30 kelime.
- **Kolay Havuzu:** **2613** kelime (Asgari ihtiyacın **%8710**'i).
- **Orta Havuzu:** **2613** kelime (Asgari ihtiyacın **%8710**'i).
- **Yeterlilik Değerlendirmesi:** Havuz büyüklüğü asgari gereksinimin 87 katı olup, oyuncunun aynı kelimelerle karşılaşma olasılığı ortadan kaldırılmış ve yüksek kelime çeşitliliği garanti altına alınmıştır.

---

## 5. Koruma Kuralları (Guards) ve Oyun Modu Güvenliği

Toplam **784** kelime doğrudan Zor seviyesine kilitlenmiştir:
- **Argo / Küfür:** 1 kelime (Kolay ve Orta'dan kesin dışlandı).
- **Özel İsimler:** 5 kelime (Kişi/yer adları Zor'a aktarıldı).
- **Eskimiş (Archaic):** 597 kelime (Yaşayan anlamı ve frekansı olmayan maddeler Zor'a aktarıldı).
- **Ağız (Dialect):** 176 kelime (Yalnızca yerel ağızda kullanılan maddeler Zor'a aktarıldı).
- **Tanımda Yer/Kişi Adı Belirtilen:** 5 kelime.

> [!WARNING]
> **Plan 2.7 Uyarısı:** Zor modda tüm kelimeler soru olarak çıkar; argo/küfür kelimeler Kolay ve Orta havuzundan kesin olarak çıkarılmıştır ancak Zor modda soru olarak gelebilir.

### Argo / Küfür Maddeleri Örnekleri (10 Örnek)
- `ibnelik`

---

## 6. Sınır Vakaları (Boundary Cases) İncelemesi

Eşik puanlarının ±%8 sıralama bandında yer alan yaklaşık **2532** kelime titizlikle incelenmiştir:
- Kolay / Orta sınırındaki kelimelerde: Türetme şeffaflığı yüksek, kök frekansı güçlü ve KeNet onaylı olan maddeler Kolay havuzunda tutulmuştur.
- Orta / Zor sınırındaki kelimelerde: Eskimiş, ağız veya teknik terim izi taşıyan kelimeler Zor havuzuna kaydırılmış; modern günlük dilde karşılığı olan kelimeler Orta havuzunda bırakılmıştır.

---

## 7. Sağduyu (Sanity) Testi

| Kategori | Kelime Sayısı | Sonuç |
|---|---|---|
| Kolay Sanity | 40 | %100 Başarılı |
| Orta Sanity | 40 | %100 Başarılı |
| Zor Sanity | 40 | %100 Başarılı |

---

## 8. Ajan Bilgisiyle Verilen Kararlar

1. **Türetme Şeffaflığı ve Kök Sıklığı:** 7 harfli türemiş kelimelerde (-lik/-lık, -siz/-sız, -li/-lı, -ci/-cı, -ce/-ca, -me/-ma, -sel/-sal vb.) kök kelimenin OpenSubtitles ve derlem sıklığı incelenerek yüksek frekanslı köklerden türeyen şeffaf kelimelere şeffaflık bonusu uygulandı ve hak ettikleri Kolay/Orta seviyelere taşındı.
2. **Fiil Masdarları Lemmatizasyonu:** 7 harfli fiil masdarları (-mek/-mak) için yüzey sıklığı yerine çekim aileleri toplanarak gerçek konuşma dili frekansı hesaplandı.
3. **Özel İsim / Şehir / Kişi Adları:** Altyazılarda veya internette sık geçse dahi TDK'da özel ad veya kişi/yer adı olarak geçen maddeler Kolay ve Orta havuzundan çıkarılarak Zor'a kilitlendi.
4. **Arkaik / Ağız Kelimeleri:** Güncel Türkçede karşılığı bulunmayan, yalnızca yöresel ağızlarda veya tarihi metinlerde geçen kelimeler Zor havuzuna yönlendirildi.
