# LİNGO v2 — Modlar, Seviyeler, Klavye, PAS ve Analizler (SPEC-v2, rev. 2)

Bu belge SPEC.md'nin (v1.0.x) üzerine eklenen v2 güncellemesidir. Önce SPEC.md ve PROGRESS.md'yi oku. Bu belgede açıkça değiştirilmeyen her kural SPEC.md'deki gibi aynen kalır (puanlar, süreler, tur yapısı, renk algoritması, ses/titreşim, PWA).

**Kural:** Belirsiz, çelişkili veya eksik bir nokta bulursan KURAL UYDURMA. İşi durdur, `TODO(SORU): ...` yaz ve kullanıcıya sor.

**Öncelik:** (1) Mevcut oyunun bozulmaması (regresyon yok), (2) kuralların ve verinin doğruluğu, (3) akıcılık/performans, (4) mobil uygulama kalitesi.

**Süre değerleri notu:** Bu belgedeki süreler (tahmin başına 15 sn, bonus 3 sn okuma + 7 sn açılma, BİL sonrası 10 sn yazma, 4. tur 120 sn) güncel oyunun değerleri olarak yazılmıştır. SPEC.md eski değerler içerebilir. V2-M1'de kodu bu değerlerle karşılaştır; fark varsa kodu DEĞİŞTİRME, `TODO(SORU)` ile kullanıcıya bildir.

## Rev. 2 değişiklik özeti

1. Kelime seviyelendirmesi CEFR'e uygun, kanıta dayalı ve doğrulamalı bir hat ile yapılır (Bölüm 4.7–4.9).
2. Klavye yeniden tasarlanır: Q/W/X kalkar, tuşlar büyür, kaydır-bırak ve önizleme gelir (Bölüm 9).
3. PAS seçeneği eklenir (Bölüm 10).
4. Analizler yalnızca Yarışma'dan değil, Yarışma + Çalışma + Hatalarımla çalış verilerinin tümünden beslenir (Bölüm 7–8). 

---

## 1. Özet

v2.0.0 ile oyuna şunlar eklenir:

1. 3 mod: Yarışma, Çalışma, Analizler.
2. 3 seviye: Kolay, Orta, Zor. Yarışma ve Çalışma'da oyuna girerken seçilir.
3. Analizler: Yarışma, Çalışma ve Hatalarımla çalış verilerinden detaylı gelişim analizi (mod ve seviye filtreli).
4. "Hatalarımla çalış": Çalışma modunda, kaçırılan kelimelerle pratik.
5. Seviye başına ayrı en yüksek skor.
6. Yeniden tasarlanmış, daha kolay kullanılan klavye.
7. PAS: bilinmeyen kelimeyi cevabı görüp hızla geçme.

**Yayın kuralı (ÖNEMLİ):** Canlıdaki v1 oyunu (Vercel, `main` dalı) bozulmamalıdır. Tüm v2 işi `v2-gelistirme` adlı ayrı bir git dalında yapılır. `main`'e birleştirme ve `main`'e push yalnızca kullanıcı açıkça onay verince, seviye verisi üretilip test edildikten sonra yapılır. `v2-gelistirme` dalını push etmek yalnızca kullanıcı izin verirse yapılır (Vercel önizleme adresi için). Başlangıçta mevcut v1 durumu `v1-stable` etiketiyle işaretlenir (geri dönüş güvenliği).

## 2. Terimler

| Terim | Anlamı |
|---|---|
| Mod | Yarışma, Çalışma veya Analizler. Analiz verisinde mod etiketi: `yarisma`, `calisma`, `hatalar` (Hatalarımla çalış) |
| Seviye | Kolay (A1–A2), Orta (A1–B2, Kolay'ı kapsar), Zor (tüm TDK kelimeleri) |
| Havuz | Bir seviyede bir harf sayısı için sorulabilecek kelimeler |
| Kaçırılan kelime | Yarışma veya Çalışma'da sorulan ve bilinemeyen veya PAS ile geçilen kelime (Bölüm 8.2). Hatalarımla çalış oturumundaki hatalar kaçırma sayacını artırmaz |
| Sözlük dışı dizi | Oyuncunun gönderdiği ama TDK listesinde bulunmayan harf dizisi |
| Öğrenildi | "Hatalarımla çalış"ta 2 kez üst üste doğru bilinen kaçırılmış kelime |
| PAS | Kelimeyi bırakıp doğru cevabı görerek sonraki soruya geçme (Bölüm 10) |
| Kova (bucket) | Analiz sayaçlarının mod+seviye bazlı grubu (Bölüm 8.3) |

## 3. Menü ve Ekranlar

### 3.1 Ana menü
Butonlar: Yarışma, Çalışma, Analizler, Nasıl Oynanır, Ayarlar. Eski "En Yüksek Skor" ekranı kalkar: rekorlar Yarışma'nın seviye seçiminde ve Analizler'in "İlerleme" sekmesinde görünür. Alt bilgi: v2.0.0.

### 3.2 Yarışma → Seviye seçimi
Üç kart: Kolay / Orta / Zor. Her kartta kısa açıklama ("A1–A2 kelimeleri", "A1–B2 kelimeleri", "Tüm TDK kelimeleri") ve o seviyenin en yüksek skoru. Seçince 3-2-1 ve oyun başlar. Oyun SPEC.md'deki tam akıştır (3 tur × 5 kelime + bonus, final turu).

### 3.3 Çalışma → Seviye seçimi
Üç seviye kartı + dördüncü kart: "Hatalarımla çalış" (seviye seçimi yoktur, Bölüm 6.5). Henüz kaçırılan kelime yoksa kart pasif ve altında "Önce Yarışma veya Çalışma modunda oyna" yazar.

### 3.4 Analizler
Tek ekran, sekmeli: Özet • Kelimeler • Sözlük Dışı • Performans • Harfler • İlerleme (Bölüm 7). Üstte iki filtre: **Mod** (Tümü / Yarışma / Çalışma / Hatalarımla) ve **Seviye** (Tümü / Kolay / Orta / Zor). Veri yoksa her sekmede sade bir "Henüz veri yok" mesajı.

### 3.5 Ayarlar
Mevcut ses ve titreşim anahtarları + **Klavye Tercihi** (`be:settings` altında `keyboard: 'game' | 'system'` — Oyun Klavyesi veya Telefon Klavyesi) + iki ayrı sıfırlama düğmesi (ikisi de onay penceresiyle):
- Rekorları sıfırla (3 seviyenin rekoru ve istatistikleri).
- Analiz verisini sıfırla (tüm modların analiz verisi + oturum özetleri + "öğrenildi" kayıtları).

### 3.6 Nasıl Oynanır
3 modu, seviyeleri, çalışma modunu, PAS'ı, klavyeyi (harfe basınca anında yazma, önizleme balonu yok, Ayarlar'da Oyun veya Telefon klavyesi seçimi) ve analizleri anlatan güncel metin. Metinler gerçek kurallara uymalı (15 sn tahmin süresi, bonus 3 sn okuma + 7 sn harf açılması, BİL sonrası 10 sn yazma süresi, 4. tur 120 sn, 4. turda kaybedilen kelimede cevap + ~3 sn donuk süre).

## 4. Seviye Sistemi

### 4.1 Havuz tanımı (iç içe seviyeler)
- havuz(Kolay) = "kolay" seviyeli kelimeler (CEFR A1–A2).
- havuz(Orta) = "kolay" ∪ "orta" seviyeli kelimeler (CEFR A1–B2).
- havuz(Zor) = tüm TDK kelimeleri (şu anki words-4…7 ve bonus-8 havuzu).
- Hiçbir seviyeyle işaretlenmemiş kelime = "zor" (sadece Zor havuzunda).

Havuzlar her harf sayısı (4, 5, 6, 7) ve bonus (8 harfli, tanımlı kelimeler) için ayrı tanımlanır.

### 4.2 Hangi sorular seviyeye göre seçilir
- Yarışma ve Çalışma'da sorulan kelimeler (1–3. tur kelimeleri, bonus kelimeleri, 4. tur 4/5/6/7 harfli kelimeleri) seçilen seviyenin havuzundan rastgele seçilir.
- Tahmin geçerliliği her seviyede TÜM TDK listesine göre kontrol edilir (words-4…7). Kolay modda da TDK'da olan her kelime geçerli bir tahmindir.
- Aynı oyunda (veya Çalışma oturumunda) aynı kelime tekrar sorulmaz. Oyunlar arasında hafıza tutulmaz.

### 4.3 Yetersiz havuz (yedek kural)
Bir harf sayısı için seçilen seviyenin havuzunda, o oyunda kullanılmamış kelime kalmadıysa bir üst seviyeden (Kolay → Orta → Zor) seçilir. Kullanıcıya gösterilmez. Havuz önerilen minimumun altındaysa build-levels raporu uyarı verir (Bölüm 4.5).

### 4.4 Seviye listesi: dışa aktarma (CSV)
`scripts/export-level-sheet.mjs` betiği `data-src/kelime-listesi.csv` dosyasını üretir:
- Kodlama UTF-8 BOM, ayırıcı noktalı virgül `;`.
- Sütunlar: `kelime;harf;seviye`. `seviye` sütunu boş gelir.
- İçerik: words-4…7.json'daki tüm kelimeler + bonus-8.json'daki tanımlı 8 harfli kelimeler (~23.700 satır). Sıralama: harf sayısı, sonra Türkçe alfabetik.
- Bu dosyayı **ajan** doldurur (Bölüm 4.7). Kullanıcı elle işaretleme yapmaz. Kabul edilen seviye değerleri: `kolay`, `orta`, `zor` (kısaltmalar k/o/z ve büyük/küçük harf farkı tr-TR'ye göre kabul edilir; boş = zor).
- Kullanıcı isterse sonradan `data-src/seviye-duzeltmeleri.csv` (`kelime;seviye`) ile tek tek düzeltme yapabilir; bu dosya en son uygulanır ve her şeyin üstündedir.

### 4.5 Seviye listesi: içe aktarma
`scripts/build-levels.mjs`, `data-src/kelime-listesi.csv` ve varsa `data-src/seviye-duzeltmeleri.csv` dosyalarını okur ve şunları üretir:
- `public/data/levels-4.json … levels-7.json`: `{ "kolay": [...], "orta": [...] }` ("orta" listesi yalnızca kolay olmayan, orta işaretli kelimeleri içerir; çalışma anında orta havuzu = kolay ∪ orta).
- `public/data/levels-8.json`: aynı yapı, sadece bonus-8 kelimeleri için.

Doğrulama ve rapor (zorunlu):
- CSV'deki her kelime words-N.json / bonus-8.json içinde bulunmalı; bulunmayanlar listelenir (uyarı).
- Aynı kelime iki farklı seviyeyle tekrarlanmışsa hata (kullanıcıya sor).
- Her harf sayısı için kolay / orta / zor kelime sayısını yazdır.
- Önerilen minimum havuz: 4–7 harfli için 30, bonus için 10 kelime. Altında kalan seviye için uyarı yaz (seviye yine çalışır, yedek kural devreye girer).
- Rapor DATA_SOURCES.md'ye eklenir.

**Liste yokken:** `levels-*.json` dosyaları yoksa (geliştirme sırasında) tüm kelimeler "zor" sayılır ve Kolay/Orta seviyeler Zor havuzunu kullanır. Bu geçiş geliştiriciye uyarı olarak loglanmalı, oyuncuya gösterilmemeli. Test için birkaç yüz kelimelik sahte örnek `tests/fixtures/` altında üretilebilir; **sahte örnek `public/` altına ve yayına GİRMEZ.**

### 4.6 Veri yükleme
`levels-*.json` dosyaları, seçilen seviye Kolay veya Orta ise oyun başlarken tembel (lazy) yüklenir ve service worker ile önbelleğe alınır. Zor seviyede yüklenmesine gerek yoktur.

### 4.7 Otomatik seviyelendirme (ajan işi)

**Amaç:** 4–8 harfli tüm kelimelerin (kelime-listesi.csv'deki ~23.700 satır) CEFR kelime hazinesi seviyesine göre kolay/orta/zor olarak dağıtılması. Yapay zekâ yalnızca geliştirme sırasında kullanılır; oyunda çalışma anında yapay zekâ, ağ isteği veya harici API yoktur.

**Eşleme:**

| CEFR | Oyun seviyesi |
|---|---|
| A1, A2 | kolay |
| B1, B2 | orta |
| C1, C2 ve "ÜST" (nadir, eskimiş, ağız/lehçe, terim, ağır edebî/resmî kelimeler) | zor |

**Dürüstlük ilkeleri:**
- Bilmediğin veya emin olmadığın kelimeyi tahminle kolay/orta yapma: düşük güven + bir üst seviye (daha zor) ver. Kolay havuzuna yanlış zor kelime girmesi, Zor havuzuna yanlış kolay kelime girmesinden daha kötüdür.
- Kaynak uydurma. Her kaynağın adı, adresi, indirme tarihi ve lisans/kullanım durumu DATA_SOURCES.md'ye yazılır. Lisansı belirsiz kaynakların ham verisi repoya girmez (`.gitignore`), sadece türetilmiş etiketler girer. Toplu veri çekilecekse siteye zarar vermeyecek yavaşlıkta çalış ve kullanım koşullarına uy.
- Resmi/CEFR-hizalı kaynaktan gelen seviye ile ajan çıkarımı DATA_SOURCES.md raporunda ayrı sayılır ("kaynaklı" vs "çıkarım" kelime sayısı).

**Seviye ölçütü (rubrik):**
- Seviye, kelimenin en temel ve en yaygın günlük anlamına göre verilir. Bonus (8 harfli) kelimelerde, oyunda gösterilen tanımın (ilk anlam) kelimesi esas alınır; ilk anlam nadir/eskimişse kelime, başka bir yaygın anlamı olsa bile "zor" sayılır.
- Türemiş ve bileşik maddeler kökün seviyesini otomatik devralmaz; her madde kendi başına değerlendirilir.
- Kriter yabancı dil öğrenen için CEFR kelime hazinesi seviyesidir (anadili konuşurunun "tanıdıklık" hissi değil).

| Seviye | Tanım |
|---|---|
| A1 | Yaşamın en temel, günlük kelimeleri: aile, sayılar, renkler, yiyecek-içecek, eşyalar, temel fiiller, yer-yön, selamlaşma (örnek: kitap, araba, kalem, okul) |
| A2 | Sık kullanılan günlük-konu kelimeleri: alışveriş, ulaşım, sağlık, iş-okul, hobi, hava, temel duygular, basit soyut kavramlar |
| B1 | Gündelik, iş ve okul konularında bağımsız kullanım; yaygın soyut kavramlar, haber dili başlangıcı |
| B2 | Genel soyut ve medya/akademik dil (teknik olmayan); deyimsel yan anlamlar, daha az sık ama yaygın kelimeler |
| ÜST | C1+ düzeyi; nadir, eskimiş, ağız, uzmanlık terimi, ağır edebî/resmî kelimeler |

**Hat (adım adım):**

**A. Kaynak keşfi (internet):**
1. CEFR-hizalı Türkçe sözcük listeleri: Yunus Emre Enstitüsü, TÖMER ve Türkçe öğretimi ders kitabı sözcük listeleri, akademik çalışmalar, açık veri setleri. Varlıklarını ve lisanslarını doğrula; bulamadığın kaynağı uydurma.
2. Lemma frekans kaynakları: en az 2 bağımsız derlem (biri gündelik/konuşma, biri yazılı; örnek adaylar: Leipzig/Wortschatz Türkçe, altyazı tabanlı sıklık listeleri, Türkçe Vikipedi veya büyük web derlemleri).
3. Morfolojik analizci (Zemberek, Zeyrek, Stanza vb. uygun olan) ile çekimli biçimleri maddebaşına topla (frekans lemma düzeyinde olmalı).

**B. Kanıt dosyası:** `data-src/level-evidence.jsonl`, her kelime için: kelime, harf sayısı, her derlemdeki lemma frekans sırası, resmi listelerdeki CEFR etiketleri, TDK ilk anlamı ve varsa TDK etiketleri (eskimiş, ağız, uzmanlık alanı).

**C. Çapa seti ve aday kümesi:** Çapa = resmi listelerde A1–B2 etiketli 4–8 harfli kelimeler. Frekans eşikleri çapalarla kalibre edilir. Aday kümesi = (herhangi bir resmi listede bulunan) ∪ (frekans sırası ≤ R); R, çapaların ≥ %99'u aday kümede kalacak şekilde seçilir. Aday dışı kelimeler otomatik "zor" olur (hızlı yol); bu, 4.8-3 kapısıyla doğrulanır.

**D. Birinci geçiş (sınıflandırma):** Aday kelimeler ≤ 80'lik partilere bölünür (parti içi sıra rastgele; alfabetik yanlılık olmasın). Her parti kanıtlarıyla birlikte işlenir. Çıktı katı JSON şeması: `{ "w", "cefr": "A1|A2|B1|B2|UST", "guven": 1|2|3, "gerekce": "≤ 12 kelime" }`. Parti çıktıları `data-src/level-work/` altına kaydedilir; iş kesilirse kaldığı yerden devam eder (resumable). Şema doğrulayıcı betik zorunludur. İlerleme PROGRESS.md'de tutulur.

**E. İkinci bağımsız geçiş:** Aynı aday kelimeler farklı parti düzeniyle ve **birinci geçişin sonucu gösterilmeden** yeniden sınıflandırılır.

**F. Uzlaştırma:** İki geçiş aynıysa kabul. Farklıysa kanıtla birlikte üçüncü geçiş (hakem). Hâlâ belirsizse daha zor seviye seçilir. Karar önceliği: resmi liste etiketi > kalibre kanıt + sınıflandırma > tereddütte zor.

**G. Otomatik tutarlılık kuralları** (ihlal edilirse kelime yeniden değerlendirilir):
1. Resmi listede A1/A2 etiketli kelime "kolay"dan düşürülemez (gerekçeli istisna DATA_SOURCES.md'ye yazılır).
2. TDK'da "eskimiş" / "ağız" gibi etiketli kelime, resmi listede yoksa kolay veya orta olamaz.
3. Uzmanlık terimi etiketli kelime, resmi listede yoksa kolay olamaz.
4. Frekans sırası kalibre kolay eşiğinin çok ötesindeki kelime kolay olamaz.

### 4.8 Kalite kapıları (hepsi geçmeden seviyelendirme bitmiş sayılmaz)
Amaç "sıfır hata" iddiası değil, ölçülmüş ve raporlanmış düşük hata oranıdır.

1. **Kaynak kapsama raporu:** hangi kaynaktan kaç kelimenin seviyesi geldi, kaçı çıkarım.
2. **Aday kümesi geri çağırma:** çapaların ≥ %99'u aday kümede.
3. **Otomatik-zor kontrolü:** aday dışı kelimelerden her harf sayısı için rastgele 60 (toplam 300) kelime bağımsız yeniden sınıflandırılır; A1–B2 çıkan ≤ %1 olmalı. Aşılırsa R genişletilip adımlar tekrarlanır.
4. **Geçişler arası uyum:** birinci ve ikinci geçiş arasında 3 sınıfta (kolay/orta/zor) uyum ≥ %90. Altındaysa rubrik netleştirilir ve ilgili aralık yeniden çalıştırılır.
5. **Havuz minimumları ve dağılım:** harf sayısı başına kolay/orta/zor sayıları raporlanır; minimumun (4–7 için 30, bonus için 10) altı uyarı verir (oyun çalışır, yedek kural 4.3 devreye girer).
6. **Denetim örneği:** `data-src/denetim-ornegi.csv` — 150 kelimelik tabakalı örnek (50 kolay, 50 orta, 50 zor; zorların 25'i sınıra yakın). Sütunlar: `kelime;harf;seviye;cefr;gerekce;benim_gorusum` (son sütun boş). Kullanıcıya kısa elle kontrol önerilir (zorunlu değil, ama yayın öncesi tavsiye edilir). Kullanıcı doldurursa uyum hesaplanır (hedef: kolay işaretlilerde ≥ %95); uyuşmayanlar düzeltilir ve aynı nedenle benzer kelimeler yeniden incelenir.
7. **build-levels raporu temiz** (Bölüm 4.5): hata yok, uyarılar açıklanmış.

### 4.9 Seviyelendirme çıktıları ve betikler
- `scripts/leveling/` altında: `collect-evidence`, `make-batches`, `validate-results`, `merge-levels`, `level-report`, `make-audit-sample` (tekrar çalıştırılabilir, deterministik olanlar sabit tohumla).
- `data-src/level-evidence.jsonl`, `data-src/level-work/` (parti girdi/çıktıları), `data-src/level-decisions.csv` (`kelime;harf;cefr;seviye;guven;kaynak;gerekce`), `data-src/kelime-listesi.csv` (yalnızca `kelime;harf;seviye`), `data-src/denetim-ornegi.csv`.
- Sonuç raporu DATA_SOURCES.md'ye eklenir.

## 5. Mod: Yarışma

- Format SPEC.md'deki gibi: 1. tur (5×4 harfli + bonus), 2. tur (5×5 + bonus), 3. tur (5×6 + bonus), 4. tur (final). Tüm süreler ve puanlar aynıdır.
- Kelimeler seçilen seviyenin havuzundan gelir (4.2). Final turundaki 4/5/6/7 harfli kelimeler de öyle.
- Rekor, seviyeye göre ayrı tutulur (3 rekor). Oyun sonunda yalnızca oynanan seviyenin rekoruyla karşılaştırılır; "Yeni Rekor!" buna göre çıkar. Final ekranında seviye adı görünür.
- HUD'a seviye rozeti eklenir (Kolay/Orta/Zor), mevcut bilgiler korunur.
- Oyun sırasında analiz verisi kaydedilir (Bölüm 8, mod etiketi `yarisma`).
- PAS tüm kelime ekranlarında vardır (Bölüm 10). Bonus ekranında PAS yoktur.

### 5.1 Eski verilerin taşınması
v2'ye ilk girişte (tek seferlik, tekrar çalışırsa zarar vermeyen bir geçiş):
- Eski `be:highscore` değeri Zor rekoru olarak taşınır. Eski `be:stats` (oynanan oyun, en iyi etap) Zor istatistiği olarak taşınır.
- Eski anahtarlar silinmez (geri dönüş güvenliği için).
- Analiz verisi boştan başlar.
- `be:settings` aynen kalır.

## 6. Mod: Çalışma

Amaç, yarışma moduna hazırlanmak için tüm soru tiplerini görmek ve oynamak. Puan yoktur, skor/kasa gösterilmez, rekor ve istatistikler (`be:v2:records`, `be:v2:stats`) etkilenmez. **Ancak oynanış analiz verisine işlenir** (Bölüm 8, mod etiketi `calisma`).

### 6.1 Döngü
Sonsuz döngü: 1 adet 4 harfli → 1 adet 5 harfli → 1 adet 6 harfli → 1 adet 7 harfli → 1 adet 8 harfli bonus (tanım sorusu) → başa dön. Seçilen seviyenin havuzundan, oturum içinde tekrarsız (havuz biterse yedek kural 4.3, o da biterse o harf sayısı için kullanılmışlar sıfırlanır).

### 6.2 Kurallar ve süreler (Yarışma ile aynı)
- Normal kelimeler: ilk harf kilitli/yeşil, 5 tahmin hakkı, tahmin başına 15 sn, sözlük dışı kelime veya süre aşımı kelimeyi anında kaybettirir, renk algoritması aynı. PAS vardır (Bölüm 10).
- Bonus (8 harfli veya parametrik N harfli): 3 sn okuma + 7 sn harf açılması, BİL sonrası 10 sn yazma süresi, açılan harfler kilitli, tek hak. Puan gösterilmez; üst çubukta puan yerine "Açılan harf: n/(uzunluk-1)" gösterilir. Zaman çizelgesi birebir aynıdır. Bonusta PAS yoktur.
- 7 harfli kelime normal bir kelimedir (final turu kuralları uygulanmaz).

### 6.3 Akış
- Kelime bitince (bilindi, kaybedildi veya PAS) sonuç kartı: bilindiyse "Doğru!", kaybedildiyse doğru cevap gösterilir. Ardından "Devam Et" → 3 sn geri sayım → sıradaki soru (1–3. turlardaki akışla aynı).
- HUD: "Çalışma • {Seviye}", "{n} Harfli", Hak, süre. Tur/kasa alanları gösterilmez; bunun yerine "Döngü {k}" ve oturumdaki "Bilinen x / Sorulan y" sayacı.
- Arka plana atma: duraklama davranışı SPEC.md'deki gibidir.

### 6.4 Bitirme ve oturum özeti
Ekranın üstünde (sol üstteki dev çubuğu artık yok) küçük bir "Bitir" düğmesi bulunur, onay penceresiyle çalışır. Bitince oturum özeti: toplam soru, bilinen, bilinemeyen, PAS sayısı, harf sayısına göre dağılım (4/5/6/7/8), bonus doğru/yanlış ve bu oturumda kaçırılan kelimelerin listesi. **Özet artık kalıcı kaydedilir** (son 50 oturum, Bölüm 8.3 `sessions`) ve Analizler'e girer. Butonlar: "Yeniden Çalış", "Ana Menü".

### 6.5 "Hatalarımla çalış"
Kaçırılan kelimelerle çalışma:
- **Havuz:** Kaçırılan kelime listesindeki (Bölüm 8.2; Yarışma + Çalışma'da kaçırılanlar), öğrenildi sayılmamış tüm kelimeler (4–8 harfli, 8 harfliler sadece bonus kelimeleri). Seviye seçimi yoktur. (Havuz kaynakları tek bir sabitte tutulur: `MISTAKE_POOL_SOURCES = ['yarisma','calisma']`; yalnızca Yarışma yapılmak istenirse tek satırda değişir.)
- **Seçim:** Aynı döngü (4 → 5 → 6 → 7 → 8 bonus). Her harf sayısı için kaçırma sayısıyla ağırlıklı rastgele seçim (kaçırma sayısı n olan kelimenin ağırlığı n; n = Yarışma + Çalışma kaçırmaları toplamı). Bir harf sayısında uygun kelime yoksa o adım atlanır. Hiç kelime kalmadıysa "Tebrikler, çalışılacak kelime kalmadı" mesajı ve ana menü düğmesi.
- **Kurallar/süreler:** Çalışma modunun 6.2 ve 6.3 maddeleriyle aynı. Oturum içinde tekrarsız. PAS kullanılırsa kelime bilinemeyen sayılır.
- **Öğrenildi mantığı:**
  - Kelime doğru bilinirse (5 hak içinde; bonus için doğru cevap) o kelimenin ardışık doğru sayacı 1 artar. Yanlış bilinirse veya PAS edilirse sayaç 0'a sıfırlanır.
  - Sayaç 2'ye ulaşınca kelime öğrenildi olur ve "Hatalarımla çalış" havuzundan düşer.
  - Analizdeki toplam kaçırma sayacı DEĞİŞMEZ (Hatalarımla çalış oturumundaki hatalar sayaca eklenmez). Analiz ekranında öğrenilen kelimenin yanında "✓ öğrenildi" işareti görünür.
  - Öğrenildi sayılan bir kelime Yarışma veya Çalışma'da tekrar kaçırılırsa öğrenildi durumu ve ardışık sayaç sıfırlanır (kelime tekrar havuza girer).
  - Sayaç sadece "Hatalarımla çalış" oturumlarında işler (normal Çalışma oturumları sayacı artırmaz).
- Bu oturumların oynanış verisi de analiz verisine işlenir (mod etiketi `hatalar`, seviye yok).

## 7. Analizler (Yarışma + Çalışma + Hatalarımla çalış verisi)

Tüm sayı/yüzde hesapları saf fonksiyonlarla yapılır ve birim testlenir. Örneklem küçükse (belirtilen alt sınırın altında) yüzde yerine "Yeterli veri yok" gösterilir. Analiz ekranı ve kodu tembel yüklenir (ilk açılışı yavaşlatmasın). Grafikler hafif olsun: harici grafik kütüphanesi ekleme, düz SVG/CSS kullan.

### 7.0 Filtreler (tüm sekmelerde)
- **Mod:** Tümü / Yarışma / Çalışma / Hatalarımla. Varsayılan: Tümü.
- **Seviye:** Tümü / Kolay / Orta / Zor.
- Filtre, Bölüm 8.3'teki kovaların birleştirilmesiyle uygulanır (`mergeBuckets`, saf fonksiyon). "Hatalarımla" kovasının seviyesi yoktur: Mod=Hatalarımla iken Seviye ≠ Tümü ise "Bu mod için seviye ayrımı yok" gösterilir. Mod=Tümü + Seviye=Kolay → `yarisma:kolay` + `calisma:kolay` (hatalar hariç).
- Mod=Tümü iken ekranın altında küçük not: "Hatalarımla çalış, zorlandığın kelimelerden oluştuğu için başarı oranını düşürebilir." Tümü varsayılandır çünkü tüm veri incelenir.

### 7.1 Özet
- **Yarışma kartı** (Yarışma verisi varsa ve filtre uygunsa): oynanan oyun sayısı, ortalama skor, en iyi skor, 4. tura ulaşma oranı, son tamamlanan etap dağılımı (Hiçbiri / 4 / 5 / 6 / 7 harfli; çubuk grafik), 4. turda ortalama kalan süre (oyun bittiğinde).
- **Çalışma kartı** (Çalışma/Hatalarımla verisi varsa): oturum sayısı, toplam çalışılan soru, başarı %, harf sayısına göre dağılım, PAS sayısı.
- Mod dağılımı satırı: her moddaki soru sayısı.
- "Öneriler" kutusu (7.7).

### 7.2 Kelimeler (En çok bilinemeyen kelimeler)
- Alfabetik (tr-TR) liste. Her satırda kelime ve sayaç: "Y×2 Ç×1" biçiminde (Yarışma ×2, Çalışma ×1; Mod filtresine göre yalnızca ilgili sayaç gösterilebilir). Öğrenilmişse "✓ öğrenildi".
- Filtre çipleri: harf sayısı (4/5/6/7/8) ve kelimenin kendi seviyesi (Kolay/Orta/Zor; `levels-*.json`'dan okunur, işaretsizse Zor). Arama kutusu. Sıralama: Alfabetik (varsayılan) / En çok kaçırılan.
- Üstte "Bu kelimelerle çalış" düğmesi → "Hatalarımla çalış".

### 7.3 Sözlük Dışı
- Oyuncunun gönderdiği ama TDK listesinde olmayan harf dizileri: alfabetik liste, sayaç (kaç kez yazıldı; moda göre "Y×n Ç×n H×n"). Çipler: harf sayısı. Sıralama: Alfabetik / En çok yazılan.
- Üstte kısa açıklama: "Bunlar kelime sandığın ama TDK'da bulunmayan diziler."

### 7.4 Performans
- Harf sayısına göre (4/5/6/7): sorulan, bilinen, bilinemeyen, başarı %, ortalama kaçıncı tahminde bilindi, 1–5. tahminde bilinme dağılımı, kayıp nedenleri istatistikleri (5 hak bitti / sözlük dışı kelime / tahmin süresi doldu / PAS ile geçildi).
- Bonus (8 harfli): sorulan, bilinen, yanlış, hiç basılmayan (tüm harfler açıldı), yazma süresinde yanlış/süre dolması, BİL'de ortalama açılmış harf sayısı, BİL'e ortalama kaçıncı saniyede basıldı.
- Zaman: gönderilen tahmin başına ortalama süre, tahmin süresi aşımı sayısı ve oranı.
- PAS kullanımı: sayı ve soru başına oran.

### 7.5 Harfler
- Harf bazında zorluk: her harf için "yazıldığında kırmızı (kelimede yok) çıkma oranı" (en az 10 örnek). En zorlanılan 10 harf. Türkçe harflere (ç, ğ, ı, i, ö, ş, ü) vurgu.
- Benzer harf karışıklığı sayaçları: i↔ı, o↔ö, u↔ü, c↔ç, s↔ş, g↔ğ. (Tahminde yazılan harf ile aynı konumdaki gerçek harf bu çiftlerden biriyse sayılır.)
- Konum analizi: her harf sayısı (4–7) için her konumun yeşil/sarı/kırmızı oranı (basit ısı haritası).

### 7.6 İlerleme
- Son 10 Yarışma oyununun skoru (çubuk/çizgi grafik, seviye rengiyle).
- Son 10 Çalışma/Hatalarımla oturumunun başarı %'si.
- Seviyelere göre rekorlar, oynanan oyun sayısı, en iyi etap.
- Son 5 ile bir önceki 5'in karşılaştırması (artış/azalış oku): Yarışma için skor ortalaması, Çalışma için başarı %.

### 7.7 Öneriler (kural tabanlı, yapay zekâ/ağ yok)
Seçili filtreye göre hesaplanır; koşul sağlanıyorsa en fazla 5 öneri üretir (aşağıdaki sırayla öncelik). Örneklem alt sınırı ve eşikler kodda sabit olarak tanımlanır:
1. **En zayıf harf sayısı:** (her biri ≥ 10 soru) en düşük başarılı harf sayısı diğerlerinden ≥ 10 puan düşükse: "{n} harfli kelimelerde başarın %X, en düşük bu."
2. **Sözlük dışı kayıp:** Kayıpların ≥ %30'u sözlük dışı kelimeyse: bunu belirt ve "Emin olmadığın kelimeyi göndermek kelimeyi anında kaybettirir; bilmiyorsan PAS kullanabilirsin" hatırlat.
3. **Süre aşımı:** Tahmin süresi aşımı oranı ≥ %10 ise uyar.
4. **Bonus yazma:** BİL sonrası yanlış/süre dolması oranı ≥ %40 ise ("BİL'e basmadan önce harfleri tahmin etmeyi dene").
5. **Harf karışıklığı:** Bir çiftin sayacı toplam karışıklığın ≥ %30'u ve ≥ 5 ise o çifti öne çıkar.
6. **Geç bulma:** Ortalama çözüm tahmini ≥ 4 ise: "Kelimeleri genelde son haklarda buluyorsun."
7. **Final:** 4. tura ulaşma oranı ≥ %50 ve en sık takılınan etap varsa onu belirt.
8. **Tekrar çalış:** Öğrenilmemiş kaçırılan kelime varsa en çok kaçırılan 5 kelime ve "Hatalarımla çalış" bağlantısı.
9. **Yarışma–Çalışma farkı:** Her ikisinde de ≥ 30 soru varsa ve Yarışma başarısı Çalışma başarısından ≥ 15 puan düşükse: "Çalışmada daha başarılısın; Yarışma'da bilinen kelimelerde de aynı sakinliği korumayı dene."

## 8. Analiz Verisi: Toplama ve Saklama

### 8.1 Ne zaman kaydedilir
Üç oyun türünde: Yarışma (`yarisma`), Çalışma (`calisma`), Hatalarımla çalış (`hatalar`). Her olay mod etiketi ve (Hatalarımla hariç) seviye etiketi taşır. Veri olay bazlı ve artımlı kaydedilir (oyun/oturum yarıda bırakılsa bile o ana kadarki kelimeler kaybolmaz); Yarışma oyunu bitince oyun özeti, Çalışma/Hatalarımla oturumu "Bitir" ile bitince oturum özeti eklenir. Kayıt saf fonksiyonlarla, UI'dan ayrı bir `analytics` modülünde yapılır.

### 8.2 Olay tanımları
- **Kelime çözüldü** (1–3. tur, 4. tur, Çalışma): harf sayısı, mod, seviye, kaçıncı tahminde bilindi.
- **Kelime kaybedildi:** harf sayısı, mod, seviye, kayıp nedeni (`five_guesses` / `invalid_word` / `timeout` / `pass`).
  - Kaybedilen kelime, `yarisma` veya `calisma` modunda kaçırılan kelime sayılır (`missedWords` sayacı +1, modun alanına: `y` veya `c`). `hatalar` modundaki kayıp bu sayacı artırmaz (öğrenildi sayacını sıfırlar, Bölüm 6.5).
  - 4. turda 120 sn bittiği için yarım kalan kelime kaçırılmış sayılmaz.
- **Bonus sonucu:** doğru / yanlış / hiç basılmadı (tüm harfler açıldı) / yazma süresi doldu. BİL'de açılmış harf sayısı `n` ve BİL saniyesi kaydedilir (puan her modda `n`'den türetilir). Bilinmeyen her bonus kelimesi (`yarisma`/`calisma`'da) kaçırılan kelime sayılır.
- **Gönderilen tahmin:** süresi (ms), harflerin kutu sonuçları (yeşil/sarı/kırmızı; kilitli ilk harf hariç) → harf ve konum sayaçları, benzer harf çiftleri sayaçları. Sözlük dışıysa sözlük dışı dizi sayacı +1 (harf sayacı güncellenmez). PAS bir tahmin değildir; harf/konum/süre sayaçlarını etkilemez.
- **Yarışma oyun özeti:** zaman damgası, seviye, final skor, kasa, son tamamlanan etap, çözülen/kaybedilen kelime sayısı, 4. turda kalan süre.
- **Çalışma/Hatalarımla oturum özeti:** zaman damgası, mod, seviye (Hatalarımla'da yok), toplam soru, bilinen, bilinemeyen, PAS sayısı, harf sayısına göre dağılım, bonus doğru/yanlış.

### 8.3 Saklama şeması (localStorage, try/catch ile)
Yeni anahtarlar `be:v2:*` önekiyle, her biri `version` alanı taşır:

| Anahtar | İçerik |
|---|---|
| `be:v2:records` | `{ kolay, orta, zor }` en yüksek skorlar (yalnızca Yarışma) |
| `be:v2:stats` | seviye başına `{ gamesPlayed, bestStage }` (yalnızca Yarışma) |
| `be:v2:analytics` | analiz verisi (aşağıda) |
| `be:v2:study` | `{ streak: {kelime: sayı}, learned: {kelime: zaman} }` |

`be:v2:analytics` içeriği:
- `buckets`: yedi kova: `yarisma:kolay`, `yarisma:orta`, `yarisma:zor`, `calisma:kolay`, `calisma:orta`, `calisma:zor`, `hatalar`. Her kova şunları içerir:
  - `byLength[4..7]`: `{ seen, solved, lost, guessSum, guessDist[1..5], lossReasons: { five_guesses, invalid_word, timeout, pass } }`
  - `bonus`: `{ seen, solved, wrong, notPressed, writeTimeout, lettersOpenedSum (doğru çözülenlerde BİL anındaki açık harf toplamı), bilSecondSum, bilCount }`
  - `timing`: `{ guessMsSum, guessCount, timeoutCount }`
  - `letters`: `{ [harf]: { g, y, r } }`; `pairs`: `{ "iı": n, ... }`; `positions[uzunluk][konum]`: `{ g, y, r }`
  - `round4`: `{ games, timeLeftSum }` (yalnızca `yarisma:*` kovalarında)
- `missedWords`: `{ [kelime]: { y, c, last } }` (en az 1 kez kaçırılanlar; `y` Yarışma, `c` Çalışma kaçırma sayısı).
- `invalidWords`: `{ [dizi]: { y, c, h, last } }` (tüm modlarda toplam en fazla 500 kayıt; taşarsa en eski ve en az sayaçlı olanlar atılır).
- `games`: son 50 Yarışma oyunu özeti (en eskiler atılır).
- `sessions`: son 50 Çalışma/Hatalarımla oturum özeti (en eskiler atılır).

Yazma hatası (kota dolu, devre dışı depolama) oyunu asla bozmamalı; sessizce atlanır. Yazma sıklığı performansı etkilememeli (kelime bitişinde küçük bir yazma yeterli; tuş vuruşunda yazma yok).

### 8.4 Gizlilik
Tüm veri sadece o telefonda durur. Sunucu, hesap, ağ isteği veya paylaşım yoktur.

## 9. Klavye (yeniden tasarım - Rev. 3)

Amaç: daha az yanlış basış, bakmadan yazılabilirlik, standart Türkçe Q klavye hafızasına tam uyum, süre baskısı altında hız. Sistem klavyesi hâlâ ASLA açılmaz (`<input>` yok, düğmeler `<button>`).

### 9.1 Düzen (29 Türkçe harf; Q, W, X yok, 3 satır tam genişlik)
- **Satır 1 (10 harf):** E R T Y U I O P Ğ Ü
- **Satır 2 (11 harf):** A S D F G H J K L Ş İ (İ harfi Q klavyedeki gibi 2. satırın sonundadır)
- **Satır 3 (10 eleman):** [GÖNDER] Z C V B N M Ö Ç [SİL]  
  Tüm harfler Q klavyedeki satırında ve soldan sağa aynı sıradadır (yalnızca Q, W, X çıkarılmıştır). GÖNDER en solda (~2 birim genişlik, mor), SİL en sağda (~1.5 birim genişlik, kırmızımsı). Eski 4. satır kaldırılmıştır.
- **PAS Butonu:** PAS klavye satırında DEĞİLDİR. Klavyenin hemen üstünde, sağa yaslı küçük bağımsız bir düğmedir (~64×36 px görsel, ≥44 px yükseklikte dokunma alanı, harf tuşlarından en az 8 px ayrık). Klavye dokunma çözümlemesine (`resolveKeyAtPoint`) dahil edilmez; kazaen kayma ile basılamaz. Bonusta aynı yerde soluk/pasif kalır (`opacity-40 pointer-events-none`).
- "I" tuşu `ı`, "İ" tuşu `i` yazar. Q/W/X harfleri kelime havuzunda zaten bulunmaz. Fiziksel klavyede q/w/x yok sayılır.
- Tuş renkleri bilinen harf durumunu yansıtır (yeşil > sarı > kırmızı önceliği). Mevcut oyunun renk jetonları korunur.

### 9.2 Boyut ve Tahta Yerleşimi (Rev. 3 Dinamik Kutu Boyutlandırması)
- **Tuş Yüksekliği:** 50–54 px hedef (`clamp(46px, 6.8dvh, 56px)`), alt sınır 46 px, tuş arası boşluk ~5 px. Kenar tuşlarının (E, A, GÖNDER solda; Ü, İ, SİL sağda) dokunma alanı ekran kenarına kadar uzatılmıştır.
- **Dinamik Tahta Boyutlandırması:** Sabit `max-w` sınırları kaldırılmıştır. Kutu boyutu saf fonksiyonla (`calculateTileSize`) dinamik hesaplanır:  
  `kutu boyutu = min(kullanılabilir genişlik / sütun sayısı, kullanılabilir yükseklik / 5)` (üst sınır 64 px, kareler kare).
- 393×852 civarında 4 harfli kutular v1'deki gibi büyük (64 px) olur; 320×568 dar ekranda dahi kaydırmasız tam sığar (eski TODO(SORU) maddesi bu dinamik çözümle geçersiz sayılmıştır).

### 9.3 Etkileşim (Pointer Events - Rev. 3)
1. **Basınca Yazılır (COMMIT_ON = 'down'):** Harf tuşuna basıldığı anda (`pointerdown`) harf kutuya anında yazılır, gecikme yoktur.
2. **Önizleme Balonu Yok (SHOW_PREVIEW_BUBBLE = false):** İki kez basılmış hissi vermemesi için balon kaldırılmıştır; yerine tuşta anında basılı görünümü verilir.
3. **Kaydır-Bırak:** Varsayılan olarak kapalıdır (parmak basılıyken kaydırılsa bile ek harf yazılmaz). İstenirse `COMMIT_ON = 'up'` sabitiyle geri açılabilir.
4. **Çoklu Dokunma (Multi-touch):** İki başparmakla bağımsız yazma tam desteklenir.
5. **SİL:** `pointerdown` anında ilk silmeyi yapar; basılı tutulunca 400 ms sonra tekrarlı siler (80 ms aralık, 1 sn sonra 50 ms). Parmak kalkınca durur.
6. **GÖNDER:** Yanlışlıkla basmayı önlemek için parmak hâlâ aynı tuşun üzerindeyken `pointerup` anında çalışır. Tüm kutular dolmadan pasiftir.
7. **Tek Sefer Ses ve Titreşim:** Tuş sesi ve titreşim yalnızca `pointerdown`'da tek bir kez tetiklenir (parmak kalktığında ses/titreşim yoktur; çift tıklama hissi giderilmiştir).
8. **Tarayıcı davranışları kapalı:** `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `contextmenu` engelli.

### 9.4 Mantık ve DOM Ayrımı
Jest/Vitest ile test edilebilsin diye hareket ve boyut mantığı saf fonksiyonlarda tutulur: `KEY_LAYOUT`, `ROW_3_ITEMS`, `calculateTileSize`, `resolveKeyAtPoint`, `gestureReducer`, `createDeleteRepeatSchedule`, `computeKeyStates`.

### 9.5 Opsiyonel (kullanıcı onayı olmadan YAPMA)
- Tuş boyutu ayarı (Normal / Büyük).
- Sistem klavyesini kullanma seçeneği (Rev. 4 ile tamamlandı).

### 9.6 Sistem Klavyesi Seçeneği (Rev. 4)
Kullanıcı tercihine göre Ayarlar ekranından "Telefon Klavyesi" seçilebilir (`be:settings` altında `keyboard: 'system'`).
- **Görsel Tasarım:** Harf tuşları gizlenir; yerine kompakt bir eylem çubuğu `[PAS] ... [GÖNDER]` gösterilir (bonusta PAS pasif/gizli).
- **Gizli Input & Odak:** `position: fixed`, `fontSize: 16px` (iOS otomatik zoom engeli), `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}`, `enterKeyHint="send"`.
- **Girdi Filtresi:** `inputSanitize` ile Türkçe küçük harfe çevrilir (I→ı, İ→i), şapkalı harfler normalize edilir (â→a, î→i, û→u), q/w/x ve geçersiz karakterler ayıklanır.
- **visualViewport Uyumu:** Mobil sistem klavyesi açıldığında `window.visualViewport.height` dinlenerek ekran ve tahta boyutları (`calculateTileSize`) dinamik olarak daralır; kaydırmasız taşma engellenir.
- **BİL Butonu & Tahta Dokunması:** BİL'e basıldığında veya tahtaya dokunulduğunda gizli input'a odaklanılarak sistem klavyesi anında açılır.

## 10. PAS

### 10.1 Davranış
PAS, oyuncunun bilmediği kelimeyi bırakıp doğru cevabı görerek hızlıca sonraki soruya geçmesini sağlar. Sözlükte olmayan kelime yazmak zorunda kalmadan kelime değiştirilir. Sanki kelime bilinememiş gibi işlenir, **yeni bir görsel/kural icat edilmez**: mevcut "kelime kaybedildi" akışı kullanılır.

| Bağlam | PAS sonucu |
|---|---|
| Yarışma 1–3. tur | Kelime kaybedilir (neden: `pass`), 0 puan. Sonuç kartında doğru cevap gösterilir → "Devam Et" → 3-2-1 → sonraki kelime. |
| Yarışma 4. tur (final) | Kelime kaybedilir. Doğru cevap gösterilir, ~3 sn donuk süre (mevcut final kayıp akışı), sonra aynı harf sayısında yeni kelime ve 5 yeni hak. Süre sayacı donuk süreden sonra akar. |
| Bonus (8 harfli) | PAS yoktur (buton soluk/pasif kalır, düzen kaymaz). |
| Çalışma | Kelime kaybedilir; cevap kartı → Devam Et → 3-2-1. |
| Hatalarımla çalış | Çalışma gibi; ayrıca kelimenin ardışık doğru sayacı 0'a sıfırlanır. |

- PAS yalnızca tahta aktifken kullanılabilir; renk animasyonu (≤ 700 ms) sırasında ve sonuç kartı/duraklama/geri sayım ekranlarında yok sayılır.
- Analiz: Kelime kaçırılmış sayılır (`lossReasons.pass`, `missedWords`). Tahmin sayaçlarını etkilemez.

### 10.2 Yanlışlıkla basmaya karşı iki aşamalı PAS
İlk dokunuşta tuş "PAS?" olur (kehribar vurgulu); 2 sn içinde ikinci dokunuş PAS'ı uygular. Başka bir tuşa basılırsa veya 2 sn geçerse ilk aşama sıfırlanır. Süre bu sırada akmaya devam eder. Klavyenin üzerinde sağa yaslı bağımsız konumdadır.

### 10.3 HUD ve metin
HUD'da değişiklik yok. "Nasıl Oynanır" ekranında PAS açıklanır.

## 11. Kabul Kriterleri ve Testler

### 11.1 Birim testleri (zorunlu)
1. Havuz seçici: Kolay/Orta/Zor havuzları doğru; tekrar yok; yedek kural (üst seviyeye geçiş); "levels dosyası yok" durumu.
2. CSV dışa/içe aktarma: Türkçe harfler (İ/ı), `;` ayırıcı, BOM, k/o/z kısaltmaları, çakışan seviye hatası, bulunamayan kelime uyarısı, rapor sayıları, `seviye-duzeltmeleri.csv` önceliği.
3. Taşıma (migration): Eski `be:highscore`/`be:stats` → Zor; ikinci çalıştırma veriyi bozmaz; eski anahtarlar silinmez.
4. Seviye başına rekor: Bir seviyedeki skor diğerinin rekorunu etkilemez.
5. Analiz kaydedici: Her olay tipi ve her mod için sayaçlar; 4. turda 120 sn'de yarım kalan kelime sayılmaz; sözlük dışı dizi sayacı; PAS kayıp nedeni ve tahmin sayaçlarına etkisizliği; 500 kayıt sınırı; son 50 oyun / son 50 oturum sınırı; `hatalar` modunun `missedWords`'ü artırmaması.
6. Kova birleştirme: Mod × seviye filtre kombinasyonları (Tümü, Hatalarımla + seviye boş durumu dahil) doğru toplam verir.
7. Öğrenildi mantığı: 2 ardışık doğru → öğrenildi; arada yanlış veya PAS sayacı sıfırlar; Yarışma/Çalışma'da tekrar kaçırılınca geri döner; analizdeki toplam sayaç değişmez.
8. Hatalarımla çalış seçici: Ağırlıklı seçim (y + c), uygun kelime olmayan harf sayısını atlama, hepsi öğrenilmişse boş durum.
9. Çalışma döngüsü: 4→5→6→7→8 sırası, tekrarsızlık, rekor/stats'a yazmama, analiz verisine doğru etiketle yazma.
10. Öneri kuralları: Her kural için eşik üstü/altı testleri (yeni kural 9 dahil).
11. Klavye: düzen tam 29 harf, yinelenen yok, q/w/x yok; words-4…7 ve bonus-8 yalnızca bu 29 harfi içerir; basınca doğrudan yazma (down-event), önizleme balonu yok; Ayarlar'da Oyun/Telefon klavyesi seçimi; `resolveKeyAtPoint` ve kenar genişletmesi; SİL tekrar zamanlaması (sahte zamanlayıcı); `keyStates` öncelik sırası.
12. PAS: Her bağlamda doğru akış (1–3. tur, final, Çalışma, Hatalarımla); iki aşamalı onay ve sıfırlanması; animasyon sırasında yok sayma; PAS'ın puan/süre kurallarını bozmaması.
13. Veri testleri: `levels-*.json` içindeki her kelime ilgili words/bonus dosyasında var; kolay ∩ orta = ∅; şema geçerli.
14. Mevcut tüm testler geçmeye devam eder (regresyon yok).

### 11.2 Elle test listesi (telefonda)
- [ ] Ana menüde 3 mod ve seviye seçimi çalışıyor; Yarışma kartlarında seviye rekorları görünüyor.
- [ ] Kolay/Orta/Zor'da sorulan kelimeler gerçekten seviyeye uygun; tahmin olarak TDK'daki herhangi bir kelime kabul ediliyor.
- [ ] Yarışma: eski akış aynen çalışıyor (süreler, puanlar, bonus, final); rekor sadece o seviyeye yazılıyor.
- [ ] Eski rekor Zor seviyesinde görünüyor.
- [ ] Çalışma: 4→5→6→7→8 döngüsü, puan yok, kayıpta cevap gösteriliyor, "Bitir" ve oturum özeti çalışıyor; Yarışma rekoru etkilenmiyor ama Analizler'e işleniyor.
- [ ] Yarışma ve Çalışma'da bilinemeyen kelimeler ve sözlük dışı diziler Analizler'de doğru sayaçlarla ve mod ayrımıyla görünüyor.
- [ ] "Hatalarımla çalış": kaçırılan kelimeler çıkıyor; 2 kez üst üste bilince "öğrenildi" oluyor ve analizde sayaç aynı kalıyor.
- [ ] Analiz sekmeleri doğru, Mod ve Seviye filtreleri çalışıyor, grafikler taşmıyor, ilk açılış yavaşlamamış.
- [ ] Ayarlar'daki iki sıfırlama düğmesi doğru şeyi siliyor.
- [ ] Klavye: Q/W/X yok; tuşlar büyük; harfe basınca anında yazılıyor (balon yok); Ayarlar'da Oyun ve Telefon/Sistem klavyesi seçimi çalışıyor; SİL basılı tutunca hızlı siliyor; iki başparmakla hızlı yazma çalışıyor; kenar tuşları rahat basılıyor.
- [ ] PAS: 1–3. turda cevap gösterip devam ediyor; finalde cevap + ~3 sn donuk süre + yeni kelime; yanlışlıkla tek dokunuşla PAS olmuyor; bonusta PAS yok.
- [ ] Çevrimdışı (uçak modu) tüm modlar çalışıyor.
- [ ] Ekran boyutları: 320×568'den 430×932'ye kaydırma ve taşma yok (klavye dahil).
- [ ] v1 kurulu ana ekran uygulaması güncellenince açılıyor, rekor Zor'a taşınmış, ayarlar korunmuş (kaldır-yeniden ekle gerekmeden).

## 12. Geliştirme Aşamaları (ajan bu sırayla, `v2-gelistirme` dalında ilerlesin)

Her aşama sonunda testleri, `tsc` ve build'i çalıştır, commit'le, PROGRESS.md'yi güncelle, kullanıcıya özet ver ve onay bekle. `main`'e dokunma. Uzun işlerde (özellikle M2) düzenli ara commit ve PROGRESS.md notu bırak; iş kesilirse kaldığı yerden devam edilebilmeli.

1. **V2-M1 — Seviye altyapısı (kod):** dal ve `v1-stable` etiketi, temel (baseline) kontrolleri ve SPEC.md–kod fark raporu, seviye tipleri, havuz seçici, yedek kural, "levels yok" davranışı, tembel yükleyici, `export-level-sheet` ve `build-levels` betikleri (+ `seviye-duzeltmeleri.csv` desteği), sahte test verisi (yayına girmez), testler.
2. **V2-M2 — Otomatik seviyelendirme (veri), üç alt adım, her birinde onay:**
   - **M2a:** Kaynak keşfi, lisans kontrolü, kanıt dosyası, çapa seti, aday kümesi ve kalibrasyon raporu (kullanıcıya kaynaklar ve sayılar gösterilir).
   - **M2b:** Birinci geçiş, ikinci bağımsız geçiş, uzlaştırma, otomatik tutarlılık kuralları.
   - **M2c:** Kalite kapıları (4.8), denetim örneği, `kelime-listesi.csv` ve `level-decisions.csv`, `build-levels` ile `levels-*.json` üretimi, rapor. Bu dosyalar `v2-gelistirme` dalına girer.
3. **V2-M3 — Klavye ve PAS:** Bölüm 9 ve 10; ergonomi analizi; regresyon testleri.
4. **V2-M4 — Menü ve Yarışma:** yeni ana menü, seviye seçimi, Yarışma akışını seviyeye bağlama, seviye başına rekor, eski veri taşıma, HUD seviye rozeti.
5. **V2-M5 — Çalışma modu:** döngü, kurallar, Bitir, oturum özeti, parametrik bonus. (✅ Tamamlandı)
6. **V2-M6 — Analiz kaydı:** analytics modülü, kova şeması, olay kaydı (üç mod), sınırlar, testler. (✅ Tamamlandı)
7. **V2-M7 — Analizler ekranı:** tüm sekmeler, Mod/Seviye filtreleri, öneriler, tembel yükleme. (✅ Tamamlandı)
8. **V2-M8 — Hatalarımla çalış:** seçici, öğrenildi mantığı, Analizler'den geçiş düğmesi.
9. **V2-M9 — Cila:** Nasıl Oynanır ve metinler, PWA önbelleği (`levels-*.json` dahil) ve v1→v2 güncelleme yolu (autoUpdate, kurulu uygulamanın yenilenmesi), performans, sürüm v2.0.0.
10. **V2-M10 — Son kalite kontrol ve yayın:** Bölüm 11 tam geçişi, denetim örneği sonucu (kullanıcı doldurduysa) ve gerekirse seviye düzeltmeleri, rapor. Kullanıcı onaylayınca `main`'e birleştir ve push et (Vercel yayınlar).

## 13. Onaylanmış Kararlar ve Varsayımlar

**Kullanıcı kararları:** 3 mod; Yarışma'da tüm süre/puanlar aynı; Çalışma modunda aynı süreler ve puan yok; seviyeler iç içe (Kolay ⊂ Orta ⊂ Zor); Kolay = A1–A2, Orta = A1–B2, Zor = tüm kelimeler; seviyeler her iki modda seçilir; **seviyelendirmeyi elle değil ajan yapar (CEFR'e uygun, kanıta dayalı)**; seviye başına ayrı rekor; **analizler Yarışma ve Çalışma verilerinin tümünden beslenir**; analizde kelime anlamı YOK; "Hatalarımla çalış" ve öğrenildi mantığı (2 ardışık doğru); **klavye Q/W/X'siz yeniden tasarlanır**; **PAS eklenir**; tek seferde yayın (veri hazır ve test edilince).

**Onaylanan varsayımlar (önceki):** menü yapısı; tahmin geçerliliği her seviyede tüm TDK listesine göre; 4. tur kelimeleri seçilen seviyeden; eski rekor/istatistik Zor'a taşınır; Çalışma'da Bitir + oturum özeti; Yarışma'daki her kayıp ve bilinmeyen bonus "kaçırılan" sayılır; veri sadece telefonda.

**Rev. 2 yeni varsayımlar (kullanıcı itiraz etmedikçe geçerli):**
1. Hatalarımla çalış havuzu, Yarışma + Çalışma'da kaçırılan kelimelerdir (Bölüm 6.5; tek sabitle geri alınabilir).
2. Analiz verisi mod+seviye kovalarında tutulur; Hatalarımla çalış ayrı bir moddur ve seviyesizdir; "Tümü" varsayılan filtredir.
3. Çalışma oturum özetleri artık kalıcıdır (son 50).
4. Bonusta PAS yoktur.
5. PAS iki aşamalıdır (yanlışlıkla basmaya karşı).
6. Ayarlar'da Oyun / Telefon klavyesi tercihi sunulmuştur (Bölüm 9.5).
7. Aday dışı kelimeler otomatik "zor"dur; bu, örnekleme ile doğrulanır (4.8-3).
8. Tereddütte daha zor seviye seçilir.
9. Seviyelendirme verisi (`levels-*.json`) kullanıcı onayı beklenmeden `v2-gelistirme` dalına commit edilir, ama `main`'e girmez.

## 14. Kapsam Dışı

Online/çok oyunculu mod, hesap, sunucu tarafı veri, veri paylaşma/dışa aktarma, kelime anlamları (analizde), oyun içinde yapay zekâ tabanlı analiz veya seviyelendirme (çalışma anında yapay zekâ/ağ yok), Türkçe dışı dil desteği.