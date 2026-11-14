# LİNGO — Kelime Listesi Revizyonu ve Geliştirme Planı (v2.1)

> Bu belge ajanın izleyeceği tek plandır. Projede `docs/KELIME-REVIZYON-PLANI.md` olarak durur. Her aşama ayrı bir komutla başlatılır. Ajan **yalnızca komutta adı geçen aşamayı** okur ve  yapar, bitince durur ve onay bekler.
> Belirsiz, çelişkili veya eksik bir nokta bulursan KURAL UYDURMA: `TODO(SORU)` yaz, çalışan kısmı commit'le ve kullanıcıya sor.

## İçindekiler
0. Çalışma kuralları
1. Parametreler (kullanıcı düzenleyebilir)
2. Ortak yöntem (Aşama 1, 2 ve 3A için)
3. Aşama 1 — 6 harfli kelimeler
4. Aşama 2 — 7 harfli kelimeler
5. Aşama 3 — Bonus kelimeleri (8–11 harf): 3A veri, 3B oyun kodu
6. Aşama 4 — Oyuncunun listeleri elle düzenlemesi
7. Aşama sonrası: tam test ve yayın
8. Kaynakça ve araçlar
9. Riskler ve alınan önlemler

---

## 0. Çalışma kuralları (tüm aşamalar)

1. **Dal:** `git branch --show-current` ile doğrula. v2 yayınlanmadıysa `v2-gelistirme`, yayınlandıysa `v2.1-revizyon` (main'den aç). `main`'e dokunma, push yapma (kullanıcı onayı yoksa).
2. **Başlamadan:** `git status` temiz olsun; PROGRESS.md'nin son bölümünü (`tail -n 40`) ve bu belgenin yalnızca ilgili aşamasını oku.
3. **Token ekonomisi (zorunlu):**
   - Veri dosyalarını (`words-*.json`, `levels-*.json`, CSV, JSONL) asla `cat` ile komple okuma. Yalnızca `head -n 5`, `wc -l`, `jq`/`awk` sorguları ve betik çıktılarının SAYISAL özetini gör.
   - İşi betikle yap; binlerce kelimeyi bağlamına yükleme.
   - Test çıktısını `| tail -n 25` ile filtrele, build'i mantıksal parçalar bittikten sonra bir kez çalıştır.
   - Ara rapor yazma; ayrıntı `data-src/rapor-*.md` dosyasına gider, sohbete kısa özet.
   - Önceki aşamaların betik ve testlerini YENİDEN YAZMA, `git log --stat -5` ve `git show --stat <commit>` ile bul ve genelleştir.
4. **Güvenlik ağı:** Her mantıksal parçada commit (`WIP:` ön ekiyle olabilir) ve PROGRESS.md'ye "kaldığın yer" satırı. Kota/hata olursa çalışan kısmı commit'le.
5. **Doğruluk > token tasarrufu.** Ama gereksiz tekrar okuma/yazma yapma.
6. **Kendi bilginle verilen kararlar:** Kaynaklarla doğrulayamadığın noktalarda kendi Türkçe bilginle karar verebilirsin; bu kararları raporda ayrı bir başlıkta ("Ajan bilgisiyle verilen kararlar") listele.
7. **Kaynak-doğruluk dosyası:** Veri değişiklikleri `data-src/kelime-listesi.csv` (+ `data-src/seviye-duzeltmeleri.csv`) üzerinden yapılır, `public/data/*.json` mevcut build betiğiyle ÜRETİLİR. JSON'u elle düzenleme. Mevcut şemayı ve seviye kodlarının tam değerlerini koru.

---

## 1. Parametreler (kullanıcı bu bloğu düzenleyebilir; ajan buradaki değerleri uygular)

| Parametre | Varsayılan | Açıklama |
|---|---|---|
| `DAGILIM_HEDEFI` | Kolay %33 / Orta %33 / Zor %34 | "Olabildiğince eşit" isteği. Bölüm 2.7'deki UYARIYI oku. |
| `DAGILIM_TOLERANSI` | ±7 yüzde puanı | Hedeften sapma bu bandı aşarsa gerekçesiyle raporla. |
| `KALITE_KORUMASI` | AÇIK | Hedefi tutturmak, açıkça yanlış yerleşime (örn. terim/eskimiş kelimenin Kolay'a girmesi) yol açacaksa DOĞRULUK önceliklidir. Sapma raporlanır. |
| `MIN_HAVUZ` | 4–7 harfli: seviye başına ≥ 30. Bonus (tüm uzunluklar toplamı): seviye başına ≥ 100 | Altında kalan seviye raporlanır. |
| `ARGO_KUFUR_POLITIKASI` | Silme yok | Argo/küfür/cinsel içerikli maddeler listeden SİLİNMEZ. Kolay/Orta'dan dışlama (mevcut) kalır; Zor'daki sayı ve 10 örnek raporlanır, karar kullanıcıya aittir. |
| `TDK_DOGRULAMA` | Üç katman (Bölüm 2.4) | Çevrimdışı TDK seti + ikinci kaynak + canlı TDK örnekleme. |
| `BONUS_TANIM_MAX` | 90 karakter | Uzun kelimeler için gerekirse 110'a çıkarılabilir (kullanıcı onayıyla). |
| `BONUS_OKUMA_SURESI` | 3 sn | Tanımı okuma süresi (Aşama 3B). Değişiklik istenirse buradan. |
| `ZOR_MOD_CEKIMI` | `tum-havuz` (mevcut) | Zor modda TÜM kelimeler havuzdadır (iç içe havuz). Alternatif için Bölüm 2.7 uyarısı. |

---

## 2. Ortak yöntem (Aşama 1, 2 ve 3A)

### 2.1 Amaç
Her harf sayısı için üç iş yapılır: (1) TDK'da bulunmayan kelimeleri çıkarmak, (2) TDK'da bulunan ama listede olmayan uygun kelimeleri eklemek, (3) kelimeleri `DAGILIM_HEDEFI`'ne yakın ve doğru şekilde Kolay / Orta / Zor olarak seviyelendirmek.

Oyundaki yapı (değiştirme):
- `words-N.json`: oyuncunun yazabileceği GEÇERLİ tahminler (TDK'nın uygun maddelerinin tamamı).
- `levels-N.json`: `{ kolay: [...], orta: [...] }` (soru havuzu etiketleri). Kolay'da olmayan ve Orta'da olmayan kelime = Zor.
- Havuzlar iç içedir: havuz(Kolay) = kolay; havuz(Orta) = kolay ∪ orta; havuz(Zor) = tüm liste.

### 2.2 Kaynak envanteri (kaynakları önce kontrol et, erişilebilir olanı kullan; URL'leri doğrula)

| Amaç | Kaynak | Not |
|---|---|---|
| TDK madde listesi (birincil) | `github.com/ogun/guncel-turkce-sozluk` (GTS v12 veri seti; projede `data-src/level-evidence.jsonl` türevi var) | Çevrimdışı ve hızlı. MIT. |
| TDK canlı denetim | `https://sozluk.gov.tr/gts?ara=KELİME` (JSON; bulunamazsa `{"error": ...}`) | Yalnızca ÖRNEKLEME ve silme/ekleme adayları için. Eşzamanlılık ≤ 5, bekleme ve yeniden deneme koy, sonucu `data-src/tdk-<N>harf.json` önbelleğine yaz. `autocomplete.json` uç noktası SPA HTML döndürüyor, kullanma. |
| İkinci bağımsız kaynak | Türkçe Vikisözlük dökümü (`dumps.wikimedia.org/trwiktionary/`), Zemberek-NLP sözlüğü (`github.com/ahmetaa/zemberek-nlp`), Türkçe WordNet/KeNet (`github.com/StarlangSoftware/TurkishWordNet`, doğrula) | Silme kararını TEK kaynağa (aynı veri setine) dayandırmamak için. |
| Sıklık (konuşma dili) | OpenSubtitles tr: `github.com/hermitdave/FrequencyWords` (`content/2018/tr/tr_50k.txt`), `opus.nlpl.eu` | Yüzey biçim sıklığı. Lemma birleştirmesi şart (2.6). |
| Sıklık (yazı dili) | Leipzig Corpora (`wortschatz.uni-leipzig.de/en/download/Turkish`, haber/vikipedi kelime listeleri), Zemberek 10k lemma listesi, `wordfreq` Python paketi (`github.com/rspeer/wordfreq`, tr destekliyse), Turkish National Corpus (`tnc.org.tr`), TS Corpus (`tscorpus.com`) | En az İKİ bağımsız sıklık kaynağı kullan. |
| Morfoloji/lemma | Zemberek-NLP morfolojik çözümleyici, UniMorph Türkçe (`github.com/unimorph/tur`), Universal Dependencies Türkçe ağaç bankaları (`universaldependencies.org`) | Çekimli/türetilmiş biçimlerin kökünü bulmak için. |
| CEFR hizalaması (bilgi amaçlı) | Avrupa Konseyi CEFR (`coe.int`), Yunus Emre Enstitüsü "Yedi İklim" müfredat konuları (`yee.org.tr`), TÖMER müfredatları | Makine okunur resmi A1–C2 kelime listesi YOKTUR. Yalnızca tematik çapa (A1–A2 temel yaşam kelimeleri) için rubrik olarak kullan; resmî liste varmış gibi davranma, DATA_SOURCES.md'de belirt. |
| Hunspell tr_TR | LibreOffice/Hunspell Türkçe sözlüğü | Çekimli biçimler içerir, TDK madde başı DEĞİLDİR. Ekleme kaynağı olarak KULLANMA; yalnızca "bu biçim yaygın mı" kanıtı. |

Erişilemeyen kaynakları ve alternatifini raporla. Hiçbir kaynağa erişilemezse DUR.

### 2.3 TDK referans kümesi ve dahil etme politikası
Çevrimdışı TDK setinden o harf sayısı için **referans küme** üret. Bir madde şu şartların hepsini sağlıyorsa DAHİLDİR:
- Bağımsız madde başı (`cesit == 0`), tek sözcük (boşluk, tire, kesme işareti, rakam yok), `-` ile başlayan/biten ek değil.
- Özel ad değil (`ozel_mi == 0`); kısaltma, simge veya birim sembolü değil.
- Normalizasyon (aşağıda) sonrası tam N harf ve yalnızca izinli harfler.
- Argo/küfür maddeleri referans kümede KALIR (silinmez, bkz. `ARGO_KUFUR_POLITIKASI`).

**Normalizasyon:** alfabe `a b c ç d e f g ğ h ı i j k l m n o ö p r s ş t u ü v y z` (q, w, x YOK). `â→a`, `î→i`, `û→u`. Küçük harfe çevirirken `İ→i`, `I→ı` (`toLocaleLowerCase('tr-TR')`). Uzunluk `Array.from(str).length` ile sayılır. Normalizasyon sonrası çakışanlar (kâr/kar) tek kelime olur.

**Önemli:** TDK'da çekimli görünen bazı biçimler (örn. "günü") bağımsız madde olabilir. Madde TDK'da varsa ve yukarıdaki şartları sağlıyorsa dahildir. Hunspell/Zemberek'te var ama TDK'da madde olmayan çekimli/türetilmiş biçimler EKLENMEZ.

### 2.4 Doğrulama: silme ve ekleme kuralları (üç katman)
Önceki aşamalarda doğrulama aynı veri setine karşı yapıldığı için döngüseldi ("hepsi TDK'da"). Bu yüzden:
1. **Katman 1 (çevrimdışı TDK seti):** Listedeki her kelime referans kümede mi? Referans kümede olup listede olmayanlar = EKLEME ADAYI. Listede olup referansta olmayanlar = SİLME ADAYI.
2. **Katman 2 (ikinci kaynak):** SİLME ADAYLARININ hepsini Vikisözlük/Zemberek/KeNet'te ara. Hiçbirinde yoksa "güçlü silme adayı".
3. **Katman 3 (canlı TDK):** (a) TÜM silme ve ekleme adaylarını, (b) listeden rastgele 300 kelimelik örneği `sozluk.gov.tr/gts` ile denetle. Örnekte bulunamayan kelime oranını raporla; bu oran veri setinin güvenilirliğinin ölçüsüdür.

**Karar:**
- SİL: Referansta yok VE (canlı TDK "bulunamadı" der VEYA canlı TDK erişilemiyor ama ikinci kaynakta da yok ve kelime açıkça anlamsız).
- EKLE: Referansta var, dahil etme politikasını sağlıyor, listede yok ve (canlı TDK doğrularsa veya doğrulanamıyorsa ama referansta madde olarak açıkça var).
- ŞÜPHELİ: Kaynaklar çelişiyorsa ya da canlı TDK ile çevrimdışı set uyuşmuyorsa SİLME/EKLEME, `rapor-*.md`'de "şüpheli" olarak listele.
- Her silme/ekleme için sebep kodunu kaydet; silinenleri TÜM konumlardan temizle (CSV, düzeltmeler, JSON, test/fixture, başka kelime listeleri). `grep -rl` ile ara.

### 2.5 Mevcut verinin durumu (bilinenler)
- 4 ve 5 harfli revizyonlarda 0 kelime silinip 0 eklendi, seviyeler düzeltildi (`data-src/rapor-4harf.md`, `rapor-5harf.md`, `tdk-5harf.json`). Bu sonuç doğrulama katmanı 1'e dayanıyor, 2 ve 3 uygulanmadı. Bu planda 2 ve 3 de uygulanacak.
- İlk seviyelendirme kural tabanlı betiklerle yapılmıştı (`scripts/leveling/`), resmi CEFR listesi kullanılmadı. Önceki "kabul testi" kelimeleri (`src/data/level-acceptance.test.ts`) korunur, bu aşamalarda da geçmeli. Çelişki çıkarsa çelişen kelimeyi raporla (test mi yanlış, kural mı).

### 2.6 Zorluk puanı (seviyelendirmenin çekirdeği)
Her kelime için sürekli bir **zorluk puanı `S`** (0 = çok kolay, 100 = çok zor) hesapla; seviyeler `S`'nin eşikleriyle belirlenir. Eşikler betikte sabit olarak durur ve ayarlanabilir.

**Özellikler:**
1. **Sıklık (ana özellik):** Her sıklık kaynağı için LEMMA düzeyinde sayı (çekimli biçimleri köke topla: masdar fiiller `-mak/-mek`, çoğul/iyelik/hâl ekleri, yaygın türetme ekleri). Önek eşleştirmesi YAPMA (eğmek/eğer gibi çarpışmalar çıkar): kök + bilinen ek kalıpları (ünlü uyumu ve ünsüz yumuşaması dahil: git→gid, et→ed) kullan ve çarpışma kontrolü yap (hamak, yarmak gibi). Kaynaklar arasında normalize edilmiş log-sıra ortalaması veya en iyi (min) sıra. En az iki bağımsız kaynak.
2. **TDK etiketleri (BİRİNCİL anlam):** İlk anlamın `eskimiş`, `ağızlardan`, `terim` (alan), `mecaz`, `argo` etiketleri puanı artırır. Etiket HERHANGİ bir anlamda değil, BİRİNCİL anlamda aranır. İstisna: ilk 3 anlamdan biri etiketsiz (modern) ve sıklık sırası ilk ~10.000'deyse etiket cezası uygulanmaz.
3. **Köken:** Arapça/Farsça/eski kökenli ve düşük sıklıklı kelimeler artırır (yüksek sıklıklılar etkilenmez).
4. **Türetme şeffaflığı:** Kelime = sık bir kök + üretken ek ise (`-lık, -lik, -cı, -ci, -sız, -lı, -ca, -ma, -iş, -ıcı` vb.) kökün sıklığına dayan, küçük bir ek cezası ekle (yeni öğrenenler için de anlaşılır olduğu için puanı düşürür).
5. **Çok anlamlılık:** Anlam sayısı yüksekse (yaygın kelime göstergesi) puan hafifçe düşer.
6. **A1–A2 tematik çapalar:** Temel yaşam alanları (aile, sayılar, renkler, vücut, yiyecek-içecek, giyim, ev/mobilya/mutfak, hayvan, hava durumu, meslek, ulaşım, okul, günlük temel fiil ve sıfatlar) için havuzda GERÇEKTEN bulunan kelimeleri belirle ve puanı düşür. Her çapayı sıklık kanıtıyla doğrula; çok nadir olan çapaları ve doğrulanamayanları raporla.
7. **Kişi/yer adı koruması:** Altyazı sıklığı özel adları şişirir. TDK `ozel_mi`, birincil anlamda "adı/ismi/soyadı/şehri/ili/ilçesi/boyu" kalıpları ve elle derlenmiş kısa liste ile bu maddeleri Kolay ve Orta'dan çıkar (Zor'a).
8. **Uzunluk/telaffuz:** Doğrudan puanlanmaz (aynı uzunlukta karşılaştırma yapılıyor).

**Zorunlu kısıtlar (guard):** Bunlar puandan bağımsız uygulanır.
- Birincil anlamı eskimiş/ağız olan ve modern anlamı olmayan kelime Kolay veya Orta OLAMAZ.
- Özel ad kökenli madde Kolay/Orta OLAMAZ.
- Argo/küfür Kolay/Orta OLAMAZ (mevcut kural).
- Sıklık listelerinin hiçbirinde yer almayan kelime (çapa değilse) Kolay OLAMAZ.

### 2.7 Eşikler ve dağılım hedefi

**Yöntem:**
1. `S`'yi hesapla ve kelimeleri sırala.
2. `DAGILIM_HEDEFI`'ne göre ilk kesim noktalarını yüzdelik dilimlerle bul.
3. Kısıtları (guard) uygula: yasak kelimeleri üst seviyeye taşı; boşalan kontenjanı sınırdaki en uygun kelimelerle doldur (taşınan kelime sayısı raporlanır).
4. Dağılım `DAGILIM_TOLERANSI` dışında kalıyorsa nedenini (guard'lar mı, `S` dağılımı mı) raporla. `KALITE_KORUMASI` açıksa hedefe ulaşmak için guard'ı ihlal ETME.

**UYARI (kullanıcı kararı gerektirir):** Havuzlar iç içedir ve Zor modda TÜM kelimeler soru olarak çıkar. Dağılım üçte bir olursa Zor modda sorular yalnızca %34 oranında gerçekten zor kelimelerden gelir; %66'sı Kolay/Orta kelimeler olur (şu an Zor kelime oranı 5 harflide ≈ %75'tir). Alternatifler:
- (A) Varsayılan: Üçte bir dağılım, Zor mod = tüm kelimeler (mevcut kod).
- (B) Dağılımı 25/30/45 gibi kaydır, Zor modda gerçekten zor kelime oranı yükselir (kod değişmez).
- (C) Zor modda soru seçiminde Zor-etiketli kelimelere ağırlık ver (örn. %70 zor, %30 diğer). Küçük bir oyun kodu değişikliği gerektirir (ayrı onayla yapılır).
Kullanıcı karar verene kadar (A) uygulanır, raporda bu uyarı tekrarlanır.

### 2.8 Sınır vakası incelemesi (ajanın kendi Türkçe bilgisi)
- Seçim: eşiklerin ±%8 sıra bandındaki kelimeler + guard çelişkisi olan kelimeler. Üst sınır ~1.200 kelime; fazlaysa bandı daralt.
- Biçim: sıkıştırılmış `kelime:K|O|Z:S` satırları, 300'lük gruplar, her grupta YALNIZCA düzeltmeleri yaz (`kelime→seviye`), açıklama yazma.
- Düzeltmeleri `data-src/seviye-duzeltmeleri.csv`'ye mevcut formatla ekle. Silinen kelimelere ait eski düzeltme satırlarını temizle, eski düzeltmeler yeni puanlamayla çelişiyorsa yeniden değerlendir.

### 2.9 Sağduyu (sanity) kelimeleri
Her harf sayısı için 40 Kolay, 40 Orta ve 40 Zor "kesin" kelime listesi hazırla (kendi bilginle; temel yaşam kelimeleri Kolay, orta sıklıkta soyut/mesleki kelimeler Orta, nadir/eskimiş/uzmanlık kelimeleri Zor) ve mevcut kabul testine ekle. Algoritma bu kelimeleri yanlış yerleştiriyorsa önce kuralı düzelt (kelimeyi kuralı yumuşatmak için çıkarma). İstisna olursa raporla.

### 2.10 Betik ve test altyapısı
- Önceki aşamalardaki betiği bul (`git show --stat` ile 4 ve 5 harfli revizyon commit'leri) ve **tek bir genel betiğe** dönüştür: `scripts/wordlist/revise-length.mjs --len N [--apply]` (varsayılan kuru çalıştırma). Çıktıları geçici klasöre yaz, onaydan sonra gerçek dosyalara uygula.
- Doğrulayıcı test (mevcut test düzenine uygun): her kelime tam N harf ve izinli alfabede; tekrar yok; her kelime TDK referans kümesinde (`data-src/tdk-<N>harf.json`); her kelimenin geçerli seviyesi var (CSV'de geçerli kod); CSV ile JSON'lar senkron; `levels-N` ile `words-N` şema ilişkisi korunmuş; silinen kelime hiçbir dosyada yok; seviyeler ayrık (`kolay ∩ orta = ∅`); sağduyu ve kabul testleri geçiyor; her seviye `MIN_HAVUZ`'u karşılıyor.
- `tsc -b`, tüm testler ve build'i çalıştır. Önbellek/ham dosyaları `.gitignore`'a ekle; `tdk-<N>harf.json` kaynak olarak commit'lenir (özel depo!).

### 2.11 Rapor
- `data-src/rapor-<N>harf.md`: silinenler (kelime + sebep kodu), eklenenler (sayı + örnek 30), şüpheliler, canlı TDK örnek denetimi sonucu (kaç/300 bulundu), seviye dağılımı (önce/sonra, hedefe uzaklık), guard nedeniyle taşınan kelimeler, argo sayısı ve 10 örnek, kullanılan kaynaklar ve erişilemeyenler, "Ajan bilgisiyle verilen kararlar".
- Sohbette kısa özet: kesin tamamlananlar, sorunlar/belirsiz kararlar, riskler, sayılar (önceki/sonraki toplam, silinen, eklenen, seviye dağılımı), test/tsc/build durumu, telefonda test adımları. Sonra DUR.

### 2.12 Kabul kriterleri (her veri aşaması)
- [ ] Tüm testler geçiyor, regresyon yok; tsc ve build temiz.
- [ ] Silinen/eklenen her kelime için sebep ve doğrulama kaydı var.
- [ ] Canlı TDK örnek denetiminin sonucu raporlanmış.
- [ ] Dağılım hedefe yakın veya sapma gerekçeli; `MIN_HAVUZ` sağlanıyor.
- [ ] Sağduyu/kabul testleri geçiyor.
- [ ] DATA_SOURCES.md güncel (kaynak, tarih, lisans, kullanım durumu, "resmi CEFR listesi kullanılmadı" notu).

---

## 3. Aşama 1 — 6 harfli kelimeler

**Girdi:** `words-6.json` (≈6.033 kelime), `levels-6.json`, CSV'deki 6 harfli satırlar.

**Bu harf sayısına özgü notlar:**
- 6 harfli kelimeler arasında çok sayıda masdar fiil (`yapmak, gitmek, gelmek, bilmek, okumak, yazmak, sevmek, uyumak…`) vardır. Lemma birleştirmesi burada kritik: fiilin masdar biçimi altyazıda nadir görünür ama kök ailesi çok sıktır.
- İki heceli yaygın isimler ve ikilemeler (`cırcır, dırdır`), bileşik yazılan sözcükler (`başucu`) için TDK maddelerini kontrol et.
- Sağduyu örnekleri (başlangıç, genişlet): Kolay: bardak, mutfak, okumak, yazmak, gitmek, gelmek, doktor, hayvan, sokak, balkon. Zor: tirfil, zavrak, hıltan, mağmum, yığnak, çulaki.

**Yapılacaklar:** Bölüm 2'nin tamamı, `--len 6`. Bu aşamada genel betik (`revise-length.mjs`) yazılır ve Aşama 2 için yeniden kullanılır.

**Çıktılar:** güncel `words-6.json`, `levels-6.json` (build betiğiyle), CSV ve düzeltmeler, `data-src/tdk-6harf.json`, `rapor-6harf.md`, doğrulayıcı test, `scripts/wordlist/revise-length.mjs`, DATA_SOURCES.md ve PROGRESS.md.

**İsteğe bağlı Aşama 1B (kullanıcı isterse):** Aynı betik ve parametrelerle 4 ve 5 harfli listeleri yeniden dengele (tutarlı dağılım için). Aşama 2'den önce kullanıcıya sor.

---

## 4. Aşama 2 — 7 harfli kelimeler

**Girdi:** `words-7.json` (≈7.917 kelime), `levels-7.json`.

**Bu harf sayısına özgü notlar:**
- 7 harfli kelimelerin büyük kısmı türetilmiştir (`-lık, -sız, -lı, -ca, -ma, -cı…`). Türetme şeffaflığı (2.6 madde 4) ve kök sıklığı belirleyicidir; kökü yaygın olan türetmeler (örn. `güzellik`, `arkadaş` gibi) Kolay/Orta'ya, kökü nadir olanlar Zor'a gider.
- Final turunun son etabı 7 harfli kelimedir; Kolay ve Orta havuzlar her iki durumda da ≥ 30 kelime olmalıdır (final ve Yarışma kelimeleri tekrarsız seçildiği için pratikte daha fazlası istenir, raporda yeterlilik oranını belirt).
- Birleşik yazılan ve ikilemeli sözcüklerle çekimli biçimler (`gelirim`, `bakılsa` gibi) TDK maddesi mi diye 2.3'e göre kontrol et.

**Yapılacaklar:** Bölüm 2'nin tamamı, `--len 7` (Aşama 1'de yazılan genel betikle). Betikte yaşanan sorunları (eşikler, çarpışma kontrolleri) Aşama 1'in raporuyla karşılaştırarak tutarlı tut.

**Çıktılar:** Aşama 1'dekilerin 7 harfli karşılığı.

---

## 5. Aşama 3 — Bonus kelimeleri (8, 9, 10 ve 11 harf)

İki alt aşama: **3A veri** ve **3B oyun kodu**. 3A bitip onaylanmadan 3B'ye geçme.

### 5.0 İstenen oyun davranışı
- Bonus soru artık yalnızca 8 harfli değil, **8, 9, 10 veya 11 harfli** kelimelerden gelir.
- Her bonus soruda uzunluk ayırt edilmeden **tüm bonus kelimeleri arasından rastgele** bir kelime seçilir (uzunluğa göre ayrı kova seçme yok; havuzdaki kelime sayısı kadar şans).
- Kelimenin **tanımı** gösterilir, ekranda **kelime uzunluğu kadar harf kutusu** belirir (ilk harf kilitli ve yeşil).
- Puanlama AYNI: 3000'den başlar, her açılan harf için 200 puan düşer; BİL ile donar; tüm harfler açılınca 0 puan. Okuma süresi 3 sn, harfler saniyede bir açılır, BİL sonrası 10 sn yazma süresi.
- Tüm bonus sorular, tanımıyla **birebir uyumlu** olmalıdır (tanım başka bir kelimeye ait, çapraz yönlendirme veya cevabı sızdıran bir metin olmamalı).

**Zaman çizelgesi (L = harf sayısı, açılacak harf sayısı = L−1, t = bonus başlangıcından geçen saniye):**

| L | Okuma | İlk harf açılışı | Son harf açılışı (tüm kelime açık, 0 puan) | Son sıfırdan farklı puan (L−2. açılış) |
|---|---|---|---|---|
| 8 | 0–3 sn | t=4 | t=10 | 1800 |
| 9 | 0–3 sn | t=4 | t=11 | 1600 |
| 10 | 0–3 sn | t=4 | t=12 | 1400 |
| 11 | 0–3 sn | t=4 | t=13 | 1200 |

Formül: `puan(n) = 3000 − 200·n` (n = açılan rastgele harf sayısı, 0…L−2); n = L−1 olunca (hepsi açık) puan 0. Uzunluk arttıkça toplam süre uzar ama puan eğrisi birebir aynıdır. (Mevcut parametrik motor L'ye göre çalışır; Aşama 3B yalnızca doğrulama ve veri bağlantısıdır.)

### 5.1 Aşama 3A — Bonus veri (kelime + tanım + seviye)

**Aday havuzu:** TDK referans kümesinden 8, 9, 10 ve 11 harfli maddeler (2.3 politikası; ozel_mi=0, bağımsız madde, tek sözcük). Sayıları ve mevcut `bonus-8.json` ile farkı `wc`/`jq` ile raporla.

**Silme/ekleme:** Bölüm 2.4'ün üç katmanlı doğrulaması; bonus için ek şart: kelimenin **kullanılabilir tanımı** olmalı. Tanımsız kelime bonus havuzuna GİRMEZ (öneri). Alternatif (kullanıcı onayıyla): tanımı olmayan yaygın kelimeler için TDK dışı kaynaktan (Vikisözlük/KeNet) tanım; yapay zekâ ile uydurulmuş tanım KULLANILMAZ.

**Tanım seçimi ve kalite kuralları (betik + örnekleme):**
1. TDK anlam listesinde ilk anlamı al; `Bkz.`, `►` ile başlayan veya çapraz yönlendirme olanları atla, sonraki anlamı dene.
2. Anlamın `;` öncesindeki ilk bölümünü al. Parantez içi örnek/yan bilgileri sadeleştir. Metin `BONUS_TANIM_MAX` karakteri aşmasın, en az 20 karakter ve en az 4 sözcük olsun; uymazsa sonraki anlamı dene.
3. Etiketli anlamlar (mecaz, argo, eskimiş, ağızlardan, terim) ancak başka anlam yoksa kullanılır; tercihen günlük, açık anlam seçilir.
4. **Sızıntı:** Tanımdaki herhangi bir sözcük (≥4 harf) cevabın ilk 4 harfiyle başlıyorsa, cevabın kendisi veya kökü tanımda geçiyorsa elen (fiillerde ilk 3 harf). Uzun kelimeler (9–11) türetme ağırlıklı olduğundan kökü Zemberek ile bul ve kök biçimlerini de sızıntı say.
5. **Anlam-kelime uyumu:** Aynı yazılışlı birden fazla madde (eş sesli, `madde_id` farklı) varsa en yaygın/ilk maddenin anlamı alınır ve belirsiz (ambiguous) olarak işaretlenir. Tanımı yalnızca başka bir sözcüğe göndermeye yarayan veya dilbilgisel açıklama olan ("-ın çoğulu", "ile ilgili") kayıtlar elenir.
6. **Örnekleme incelemesi:** Rastgele 300 kelime + en uzun tanımlı 100 kelime + guard'a takılan 100 kelime için tanım-kelime uyumunu ajan olarak incele; uyumsuzları listele, kuralı iyileştir. Rapor: kural başına kaç kelime elendi, kalan toplam ve uzunluk dağılımı (8/9/10/11).

**Seviyelendirme:** Bölüm 2.6–2.8 aynı yöntem, tüm bonus kelimeleri TEK havuz olarak (uzunluklar birlikte) puanlanır, `levels-bonus.json` üretilir. `MIN_HAVUZ` (bonus): seviye başına ≥ 100. Hedef dağılım ve uyarı geçerli (2.7). Uzunluk doğrudan puanlanmaz ama dağılım raporunda uzunluk kırılımı gösterilir.

**Dosya düzeni (öneri; mevcut kod bağlantılarını `grep` ile bul ve uyarla):**
- `public/data/bonus.json`: `[{ "w": "...", "d": "..." }]` (uzunluk kelimeden çıkarılır). Eski `bonus-8.json` geçişte yedek olarak kalır; 3B tamamlanıp doğrulanınca kaldırılır.
- `public/data/levels-bonus.json`: `{ kolay: [...], orta: [...] }`.
- CSV'ye bonus kelimeleri için ayrı sayfa/dosya (örn. `data-src/bonus-listesi.csv`; sütunlar `kelime;harf;seviye;tanim`).
- Service worker önbelleği ve veri yükleyiciler yeni dosya adlarını içersin.

**Çıktılar ve kabul:** 2.12 + tanım kalite raporu (`rapor-bonus.md`), doğrulayıcı test (her kayıt: izinli alfabe, 8–11 harf, tanım var ve uzunluk/sızıntı kurallarına uyuyor, kelime TDK referansında, seviye geçerli, tekrar yok), sağduyu seti (her seviyeden 20 kelime), kalite örnekleri raporda (her seviye ve uzunluktan 5 kelime + tanım).

### 5.2 Aşama 3B — Oyun kodu (3A onaylandıktan sonra)

1. **Veri yükleme:** Bonus havuzu `bonus.json` ve `levels-bonus.json`'dan; yükleme hatası mevcut hata ekranını kullanır. Tembel yükleme ve service worker precache güncellenir.
2. **Seçim:** Bonus kelimesi, seçilen seviyenin bonus havuzundan, **uzunluk ayrımı olmadan eşit olasılıkla** seçilir (tüm bonus kelimeleri tek liste). Oyun içinde (ve Çalışma oturumunda) tekrarsız. Yedek kuralı (Kolay→Orta→Zor) mevcut davranışla aynı.
3. **Motor ve arayüz:** Mevcut parametrik bonus motoru (8–11 destekli) yeni verilerle çalışmalı. Doğrulama testleri: L=8,9,10,11 için zaman çizelgesi (tabloyla birebir), puan formülü, BİL donması, hepsi açılınca 0, yazma süresi 10 sn, açılan harflerin kilitli olması, kutu sayısı = L; `BonusBoardRow` 320 ve 393 px genişlikte 8–11 kutuda taşmadan çiziliyor (görsel ölçüm tablosu).
4. **Klavye modları:** Oyun klavyesi ve telefon klavyesinde 11 harfli bonus yazımı (boş kutulara sırayla yerleşme, otomatik gönderme) testli.
5. **Modlar:** Yarışma (1–3. tur sonları), Çalışma ve Hatalarımla çalışta bonus adımı yeni havuzdan çalışsın. Hatalarımla'da bonus adımı, kaçırılan TÜM bonus kelimelerinden (8–11) ağırlıklı seçsin; havuzda artık olmayan kelimeler sessizce atlansın.
6. **Analiz:** Bonus sayaçları uzunluktan bağımsız toplanır (şema değişmez). `missedWords` 8–11 harfli bonus kelimeleri de tutabilmeli (anahtar kelimedir, uzunluk kısıtı yok). Analizler ekranının bonus kısmı uzunluk varsayımı yapmamalı.
7. **Metinler:** Nasıl Oynanır ve bonus açıklamalarında "8–11 harfli" ifadesi; SPEC-v2.md Bölüm 4.6/6.2 ve test listesi güncellensin.
8. **Eski veri uyumu:** Kullanıcının kayıtlı kaçırılan bonus kelimeleri yeni havuzda yoksa atlanır (silinmez).
9. **Testler:** Yukarıdakiler + regresyon (Yarışma, Çalışma, Hatalarımla, Analizler). 

---

## 6. Aşama 4 — Oyuncunun listeleri elle düzenlemesi

**Amaç:** Oyuncu, kendisi için anlamsız veya istemediği kelimeleri hata listelerinden çıkarabilsin (örn. yanlışlıkla yazdığı sözlük dışı dizi, artık bilmek istemediği kelime).

### 6.1 Tespit edilen tutarsızlık (önce çöz)
Analizler'de "En Çok Bilinemeyen Kelimeler" yalnızca en az 2 kez kaçırılanları gösteriyor, ama "Hatalarımla çalış" havuzu 1 kez kaçırılanları da içeriyor. Oyuncu görmediği kelimeyi silemez. Çözüm: **tek bir kaynak** (`getStudyList()` gibi, saf fonksiyon) hem Analizler'in listesini hem Hatalarımla havuzunu beslesin; Analizler'in özet kutusu "≥2" eşiğini koruyabilir, ama **düzenleme ekranı tüm kaçırılan kelimeleri (≥1) gösterir**.

### 6.2 Veri modeli (önerilen, geriye uyumlu)
- `be:v2:study` şemasını `version: 2` yap, yeni alanlar: `hidden: { kelime: zaman }` (Listeden çıkarılanlar), `invalidHidden: { dizi: zaman }` (Sözlük dışı listeden çıkarılanlar). Mevcut `streak` ve `learned` aynen kalır. Eski veriyi okurken eksik alanlar boş sayılır (migrasyon testi).
- **Silme = gizleme (öneri):** Kelime `be:v2:analytics.missedWords` içinden SİLİNMEZ; sayaçlar korunur (analiz istatistikleri bozulmaz). Gizlenen kelime: Hatalarımla havuzundan, "Bu kelimelerle çalış" sayısından ve düzenleme listesinin varsayılan görünümünden çıkar.
- Alternatif (A): Gerçek silme (kelime missedWords'ten de gider, analiz sayaçları düşer). Daha basit ama geri dönüşsüzdür ve analiz toplamlarını bozar. Önerilmez.
- Alternatif (B): Gizleme + "Gizlenenler" bölümü (geri alma). ÖNERİLEN: oyuncu yanlışlıkla sildiğini geri getirebilir.
- Gizlenen kelime Yarışma/Çalışma'da **tekrar kaçırılırsa** gizlilik kalkar (yeniden listede görünür), tıpkı "öğrenildi" kuralındaki gibi. (Kullanıcı isterse bu davranış değiştirilir.)

### 6.3 Arayüz
- **Düzenleme ekranı ("Hatalarım"):** Analizler'deki kaçırılan kelimeler bölümündeki "Düzenle" düğmesi ve Çalışma → Hatalarımla çalış kartındaki "Listeyi düzenle" bağlantısı aynı ekrana gitsin. Liste: kelime, harf sayısı, kaçırma sayısı (Y×, Ç×), "✓ öğrenildi" durumu. Arama, harf sayısı çipleri, "Gizlenenler" geçişi.
- **Satır eylemleri (ikisi birden, keşfedilebilirlik için):**
  1. **Sola kaydırma:** Satırı sola kaydırınca "Sil" (gizle) eylemi çıkar; bırakınca onaylanır veya eylem düğmesine dokunmakla tamamlanır. Pointer Events ile (`touch-action: pan-y`), eşik ≈ 72 px, dikey kaydırmayı bozma, iOS kenar-geri jestiyle çakışmaması için kaydırma yalnızca satır içinde.
  2. **Köşede ⋯ menüsü:** Her satırın sağında küçük "⋯" düğmesi (≥44 px dokunma alanı): "Listeden çıkar", "Öğrenildi say", (gizlenmişse) "Listeye geri al".
- **Geri al:** Silince alt kısımda 5 saniyelik "Geri al" bildirimi.
- **Toplu düzenleme (isteğe bağlı, öneri):** Uzun basınca çoklu seçim modu, "Seçilenleri çıkar".
- **Sözlük dışı denemeler listesi:** Aynı mantıkla (sola kaydır / ⋯) dizileri listeden çıkarma (`invalidHidden`). Analiz sayaçlarındaki toplam değişmez.
- **Boş durumlar ve metinler:** "Liste boş", "Tüm kelimeler gizlendi/öğrenildi" gibi sade Türkçe mesajlar. Erişilebilirlik: eylemler yalnızca kaydırmaya bağlı OLMASIN (⋯ menüsü her zaman erişilebilir).

### 6.4 Entegrasyon
- Hatalarımla havuzu `hidden` ve `learned` kelimeleri dışlar; "N kelime" sayacı buna göre güncellenir; havuz boşalırsa kart pasif.
- "Analiz verisini sıfırla" `hidden` ve `invalidHidden`'ı da temizler (rekorlar ve ayarlar etkilenmez).
- Analizler'in "Bu Kelimelerle Çalış" düğmesi ve öneri kuralı aynı havuzu kullanır.
- Çevrimdışı çalışır, yeni sunucu/ağ bağımlılığı yoktur.

### 6.5 Testler
Gizleme/geri alma, `hidden` kelimenin havuzdan çıkması, yeniden kaçırınca gizliliğin kalkması, `learned`+`hidden` etkileşimi, şema migrasyonu (v1→v2, bozuk veri), analiz sayaçlarının DEĞİŞMEMESİ, `getStudyList` tutarlılığı (Analizler ve Hatalarımla aynı kaynak), sıfırlama, kaydırma eşiği mantığı (saf fonksiyon), jsdom duman testi (liste açılır, ⋯ menüsü ve geri al çalışır). Mevcut testlerde regresyon yok.

### 6.6 Dokümantasyon
SPEC-v2.md'yi güncelle: Analizler bölümü artık sadeleştirilmiş tek dikey akıştır (eski 6 sekmeli tasarım kaldırıldı); düzenleme ekranı ve veri modeli yeni; Nasıl Oynanır'a kısa "Listeni düzenle" notu.

---

## 7. Aşama sonrası: tam test ve yayın

1. Kullanıcı telefonda tam test turu yapar: menü, seviyeler, Yarışma, Çalışma, Hatalarımla, Analizler ve düzenleme, bonus (8–11 harf, iki klavye modu), çevrimdışı, 320–430 px genişlik, PWA güncelleme.
2. Sorun yoksa V2-M10 yayın adımı (kullanıcı onayıyla): `v2-gelistirme`/`v2.1-revizyon` → `main`, push, Vercel yayını. Geri dönüş: `v1-stable` etiketi ve önceki sürüm etiketleri.
3. Yayın stratejisi seçeneği: v2.0.0'ı hemen yayınlayıp bu 4 aşamayı v2.1 olarak ayrı yayınlamak (küçük adımlar, kolay geri dönüş), ya da hepsini tek sürümde yayınlamak.

---

## 8. Kaynakça ve araçlar

**Veri ve sözlük**
- TDK Güncel Türkçe Sözlük: `sozluk.gov.tr` (canlı JSON: `/gts?ara=`).
- TDK GTS veri seti (topluluk): `github.com/ogun/guncel-turkce-sozluk`.
- Türkçe Vikisözlük dökümleri: `dumps.wikimedia.org/trwiktionary/`.
- Zemberek-NLP (morfoloji, lemma, sözlük): `github.com/ahmetaa/zemberek-nlp`.
- Türkçe WordNet / KeNet: `github.com/StarlangSoftware/TurkishWordNet` (doğrula).
- UniMorph Türkçe: `github.com/unimorph/tur`. Universal Dependencies Türkçe ağaç bankaları: `universaldependencies.org`.

**Sıklık**
- FrequencyWords (OpenSubtitles): `github.com/hermitdave/FrequencyWords`; OPUS: `opus.nlpl.eu`.
- Leipzig Corpora Collection: `wortschatz.uni-leipzig.de/en/download/Turkish`.
- `wordfreq`: `github.com/rspeer/wordfreq`. Turkish National Corpus: `tnc.org.tr`. TS Corpus: `tscorpus.com`. fastText kelime dizilimi (sıklık vekili): `fasttext.cc/docs/en/crawl-vectors.html`.

**Seviye çerçevesi (bilgi)**
- CEFR: `coe.int` (Common European Framework of Reference). Yunus Emre Enstitüsü: `yee.org.tr`. Arama ipuçları: "Yabancılara Türkçe öğretimi sözcük listesi A1 A2", "Türkçe CEFR sözcük havuzu", "Yedi İklim sözcük listesi".
- Not: Resmi, makine okunur, eksiksiz bir Türkçe CEFR kelime listesi yoktur; bu plandaki seviyeler sıklık + etiket + tematik çapa tabanlı YAKLAŞIK seviyelerdir ve belgelerde böyle anılmalıdır.

**Araçlar**
- `jq`, `awk`, `sort`/`comm` (küme farkları), Node.js betikleri, Vitest, (isteğe bağlı) jsdom + React Testing Library.

---

## 9. Riskler ve alınan önlemler

| Risk | Önlem |
|---|---|
| Doğrulamanın aynı veri setine bağlı olması (döngüsellik) | Üç katman (2.4), canlı TDK örnekleme, ikinci kaynak |
| TDK canlı API'sine erişim/hız sınırı | Eşzamanlılık ≤5, önbellek, yeniden deneme; erişilemezse silmede ek şart, raporla |
| Üçte bir dağılımın Zor modu kolaylaştırması | 2.7 uyarısı ve alternatifler, kullanıcı kararı |
| Sıklık listelerinin özel adlar/çekimli biçimlerle şişmesi | Lemma birleştirme, ad koruması, birincil anlam kuralı |
| Çok anlamlı kelimelerde yanlış tanım | İlk anlam + etiket önceliği, eş sesli işaretleme, örnekleme incelemesi |
| Bonus sızıntısı (uzun türetilmiş kelimeler) | Kök tabanlı sızıntı kontrolü (Zemberek) |
| Kayıtlı kullanıcı verisinin silinen kelimelerle uyumsuzluğu | Havuzda olmayan kelimeleri sessizce atla, veriyi silme |
| Yanlışlıkla silme (liste düzenleme) | Silme = gizleme, geri al bildirimi, Gizlenenler bölümü |
| Kaydırma jestinin iOS jestleriyle çakışması / keşfedilmemesi | `touch-action: pan-y`, satır içi kaydırma, ⋯ menüsü her zaman erişilebilir |
| Ajan kotası / uzun işler | Küçük commit'ler, PROGRESS.md "kaldığın yer", veri dosyalarını okumama kuralı |