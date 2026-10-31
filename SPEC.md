# LİNGO — Türkçe Kelime Oyunu (SPEC)

> Bu belge, Google Antigravity (AI kod ajanı) için tek doğru kaynaktır (single source of truth).
> **Kural:** Bu belgede belirsiz, çelişkili ya da eksik bir nokta bulursan KURAL UYDURMA. İşi durdur, ilgili yere `TODO(SORU): ...` yaz ve kullanıcıya sor.
> **Öncelik sırası:** (1) Kuralların eksiksiz ve hatasız olması, (2) akıcı ve takılmayan çalışma, (3) kaliteli/gösterişli mobil uygulama arayüzü, (4) süre-puan-tur-etap bilgilerinin her ekranda görünmesi, (5) TDK kelimelerinin eksiksiz ve doğru kullanımı.

---

## 1. Proje Özeti

- **Ad:** LİNGO (uygulama adı ve ana ekran simgesi etiketi). İkonda **"BSG"** yazar.
- **Tür:** Tek oyunculu, çok aşamalı Türkçe kelime bulmaca oyunu (Wordle + Lingo karışımı).
- **Platform:** Mobil öncelikli **PWA** (web uygulaması). Telefonda tarayıcıdan "Ana Ekrana Ekle" ile gerçek uygulama gibi kurulur ve tam ekran açılır.
- **Oynanış:** İki kişi (kullanıcı + arkadaşı) kendi telefonlarında ayrı ayrı oynar. Online mod, hesap, sunucu, ortak skor tablosu **YOK**. Aynı anda oynamak gerekmez.
- **Maliyet:** 0 TL. Sunucu, alan adı (domain) ve veritabanı yok. Ücretsiz statik hosting (Vercel veya Netlify).
- **Arayüz dili:** Tamamen Türkçe.

---

## 2. Teknoloji ve Mimari Kararlar

| Konu | Karar |
|---|---|
| Build aracı | **Vite** |
| UI | **React 18 + TypeScript** |
| Stil | **Tailwind CSS** |
| Animasyon | **Framer Motion** (veya yalnızca CSS animasyonları; performans önceliklidir) |
| PWA | **vite-plugin-pwa** (Workbox, `autoUpdate`) |
| Test | **Vitest** (oyun motoru için birim testleri) |
| Veri saklama | Sadece `localStorage` (en yüksek skor + ayarlar) |
| Backend | YOK. Tamamen statik site |
| Kelime verisi | Derleme öncesi üretilen statik JSON dosyaları (bkz. Bölüm 5) |
| Barındırma | GitHub → Vercel (veya Netlify). Ortam değişkeni (env) gerekmez |

### 2.1 Mimari ilkeler

1. **Oyun motoru saf TypeScript olmalı** (React'ten bağımsız): renk hesabı, puan hesabı, tur yapılandırması, bonus zaman çizelgesi `src/game/engine/` altında saf fonksiyonlar olarak yazılır ve birim testle doğrulanır.
2. **Oyun akışı bir durum makinesi (state machine) ile yönetilir** (useReducer + açık durum tipleri veya XState). Her ekran bir duruma karşılık gelir. Geçersiz durum geçişi mümkün olmamalıdır.
3. **Tek bir zaman servisi:** Tüm geri sayımlar `performance.now()` zaman damgasına dayanır (setInterval sayacı biriktirerek ilerlemez, sapma/drift olmaz). Ekran güncellemesi `requestAnimationFrame` veya ~100 ms tick ile yapılır. Zaman servisi **duraklat/devam** destekler.
4. **Arka plana atma:** `visibilitychange`, `pagehide` ve `blur` olaylarında oyun **otomatik duraklar** (tüm süreler donar). Geri dönüşte "Duraklatıldı — Devam Et" katmanı çıkar, oyuncu butona basınca süreler kaldığı yerden devam eder.
5. **Performans:** Kelime listeleri harf sayısına göre ayrı dosyalarda tutulur, yalnızca gerektiğinde (lazy) yüklenir ve `Set` ile O(1) aranır. Service worker hepsini önbelleğe alır, böylece ilk yüklemeden sonra **internetsiz de çalışır**. Ana thread'i bloklayan ağır işlem olmamalı.
6. **Rastgelelik:** `crypto.getRandomValues` tabanlı seçim (veya `Math.random`; fark etmez). Aynı oyun içinde bir kelime ikinci kez çıkmaz (oyun başına kullanılmış kelimeler `Set`'te tutulur). Oyunlar arasında hafıza **tutulmaz**; şans eseri tekrar olabilir (kabul edilmiştir).
7. **Sayfa yenilenirse / uygulama kapanırsa** devam eden oyun kaydedilmez; ana menüye dönülür.

### 2.2 Önerilen klasör yapısı

```
lingo/
├─ SPEC.md
├─ DATA_SOURCES.md              # kelime/tanım kaynakları, sayılar, tarih (ajan yazar)
├─ scripts/
│  ├─ build-wordlist.*          # ham veriden temiz JSON üretir
│  └─ generate-icons.*          # BSG ikonlarını üretir
├─ public/
│  ├─ data/words-4.json ... words-7.json
│  ├─ data/bonus-8.json         # [{ "w": "kelimesi", "d": "tanım" }]
│  └─ icons/                    # PWA ikonları
├─ src/
│  ├─ game/engine/              # saf fonksiyonlar + testler
│  ├─ game/state/               # durum makinesi
│  ├─ game/clock/               # zaman servisi
│  ├─ data/                     # kelime yükleyiciler
│  ├─ audio/ , haptics/         # ses ve titreşim
│  ├─ components/               # Board, Keyboard, Hud, Overlay vb.
│  └─ screens/                  # ekranlar (Bölüm 6)
└─ vite.config.ts
```

---

## 3. Sözlük (Terimler)

| Terim | Anlamı |
|---|---|
| **Tur** | Oyunun ana bölümü: 1., 2., 3., 4. tur |
| **Kelime sırası** | 1–3. turlarda tur içindeki kelime numarası (1/5 … 5/5) |
| **Bonus soru** | 1–3. turların sonundaki 8 harfli tanım sorusu |
| **Kasa** | 1–3. turlarda biriken toplam puan |
| **Etap** | 4. turdaki aşama (4 harfli, 5 harfli, 6 harfli, 7 harfli) |
| **Tahmin hakkı** | Bir kelime için 5 hak |
| **Kutu** | Bir harfi temsil eden hücre |

Harf renkleri:
- 🟩 **Yeşil:** Doğru harf, doğru yer.
- 🟨 **Sarı:** Harf kelimede var ama yeri yanlış.
- 🟥 **Kırmızı:** Harf kelimede yok (veya fazla kopya). Ayrıca kaybedilen kelimede **tüm kutular** kırmızı olur.

---

## 4. Oyun Kuralları (KESİN)

### 4.1 Genel yapı

| Tur | Kelimeler | Kelime puanı | Bonus (8 harfli tanım sorusu) |
|---|---|---|---|
| 1. Tur | 5 adet **4 harfli** | 1000 / kelime | Evet (maks. 3000) |
| 2. Tur | 5 adet **5 harfli** | 2000 / kelime | Evet (maks. 3000) |
| 3. Tur | 5 adet **6 harfli** | 3000 / kelime | Evet (maks. 3000) |
| 4. Tur | 4 etap: 4→5→6→7 harfli (etap başına 1 kelime) | Kasadan çarpanla (4.4) | Yok |

- 1–3. turlarda **kelimeyi kaçıncı tahminde bildiği önemli değildir**, bilirse tam puan alır.
- 1–3. turlarda bilinemeyen kelime sadece puan kaybettirir, **elenme yoktur**. Elenme riski sadece 4. turda vardır.
- **Kasa üst sınırı:** (5×1000 + 3000) + (5×2000 + 3000) + (5×3000 + 3000) = **39.000**.

### 4.2 Kelime tahmini (1–3. turlar ve 4. tur ortak kuralları)

1. Ekrana kelimenin harf sayısı kadar kutu gelir. **İlk kutuda kelimenin ilk harfi otomatik yazılıdır, yeşildir ve KİLİTLİDİR.** Oyuncu sadece 2. kutudan itibaren yazar (ilk harfi yanlış yazma durumu olamaz).
2. Her kelime için **5 tahmin hakkı** vardır. Oyuncu tüm kutular dolmadan "Gönder" yapamaz (Gönder tuşu pasif kalır).
3. Gönderilen tahmin **kelime listesinde yoksa (TDK'da yok)** → **geçersiz tahmin**: kelime **anında kaybedilir**, tüm kutular kırmızıya boyanır, kalan haklar kullanılmaz.
4. Geçerli ama yanlış tahmin: harfler renklenir, bir hak harcanır, bir sonraki satıra geçilir.
5. Doğru kelime bulunursa: kelime bilinmiş sayılır (hangi hakta olursa olsun), puan eklenir.
6. 5 hak da bitip bilinemezse: kelime kaybedilir.
7. Kelime kaybedilirse (geçersiz kelime, 5 hak bitmesi veya süre dolması) puan alınmaz.

### 4.3 Renk (harf değerlendirme) algoritması — standart Wordle mantığı

Her eşleşme **bir kez** kullanılır. İlk harf (kilitli) her zaman yeşil kabul edilir ve eşleşme sayacına dahildir.

```ts
type Mark = 'green' | 'yellow' | 'red';

function evaluateGuess(answer: string, guess: string): Mark[] {
  // ikisi de Türkçe küçük harfe normalize edilmiş, aynı uzunlukta
  const a = Array.from(answer);
  const g = Array.from(guess);
  const marks: Mark[] = Array(a.length).fill('red');
  const remaining: Record<string, number> = {};

  // 1. geçiş: yeşiller
  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) marks[i] = 'green';
    else remaining[a[i]] = (remaining[a[i]] ?? 0) + 1;
  }
  // 2. geçiş: sarılar (kalan harf sayısı kadar)
  for (let i = 0; i < a.length; i++) {
    if (marks[i] !== 'green' && (remaining[g[i]] ?? 0) > 0) {
      marks[i] = 'yellow';
      remaining[g[i]]--;
    }
  }
  return marks;
}
```

**Zorunlu test örneği:** cevap `kale`, tahmin `elle` → `[kırmızı(e), kırmızı(l), yeşil(l), yeşil(e)]`. (Not: bu örnekte ilk harf kilitli olsaydı tahmin `kele` gibi k ile başlardı; algoritma ilk harf dahil tüm uzunlukta çalışır, test bu saf fonksiyon üzerinden yapılır.)
Ek örnek: cevap `kale`, tahmin `küpe` → `[yeşil, kırmızı, kırmızı, yeşil]`.

**Türkçe harf kuralı:** Tüm karşılaştırmalar `toLocaleLowerCase('tr-TR')` sonrası yapılır (`I→ı`, `İ→i`). Kelime uzunluğu `Array.from(str).length` ile sayılır. `i` ile `ı`, `o` ile `ö`, `u` ile `ü`, `c` ile `ç`, `s` ile `ş`, `g` ile `ğ` **farklı harflerdir**.

### 4.4 1–3. Tur: süre kuralı

- Her tahmin için **10 saniye** vardır. Her tahminin süresi ayrı başlar (1. tahmin 10 sn, 2. tahmin yine 10 sn …).
- Süre ekranda **her zaman bir köşede canlı geri sayım** olarak görünür.
- Süre 0 olursa kelime **kaybedilir** (bkz. 4.2-7).
- Geçerli bir tahmin gönderildiğinde renk animasyonu oynar; **animasyon bitince** bir sonraki tahminin 10 sn'si başlar. (Animasyon süresi ≤ 700 ms tutulur.)

### 4.5 Kelimeden kelimeye geçiş (1–3. turlar)

Bir kelime bitince (bilindi **veya** kaybedildi) bir **sonuç kartı** açılır:
- Bilindiyse: "Doğru! +X puan".
- Kaybedildiyse: **doğru cevap gösterilir** (ve kutular kırmızı kalır).
- Karttaki **"Devam Et"** butonuna basılınca **3 saniyelik geri sayım** (3 – 2 – 1) çıkar, sonra yeni kelime gelir. Geri sayım sırasında kelime süresi işlemez.

### 4.6 Bonus soru (her 1–3. turun sonunda, 8 harfli tanım sorusu)

**Hedef:** Tanımı verilen 8 harfli kelimeyi bulmak. Tahmin hakkı **yoktur**, tek yanlış = puan kaybı. Toplam puan **3000**.

**Ekran:** Üstte canlı **kalan süre** ve canlı **anlık puan**; ortada **tanım** (bonus boyunca ekranda kalır); altında 8 kutu; kutuların altında büyük **"BİL"** butonu. İlk kutuda ilk harf yeşil ve kilitli görünür. (Bu ekranda normal 5 satırlı tahmin tahtası yoktur, sadece tek satır 8 kutu vardır.)

**Zaman çizelgesi (t = bonus başlangıcından geçen saniye):**

| Zaman | Olay | Anlık puan |
|---|---|---|
| 0 ≤ t < 3 | **Okuma süresi.** Tanım görünür, sadece ilk harf açık. Harf açılmaz. | 3000 (sabit) |
| t = 4 | 1. rastgele kapalı kutunun harfi açılır (yeşil) | 2800 |
| t = 5 | 2. harf açılır | 2600 |
| t = 6 | 3. harf açılır | 2400 |
| t = 7 | 4. harf açılır | 2200 |
| t = 8 | 5. harf açılır | 2000 |
| t = 9 | 6. harf açılır | 1800 |
| t = 10 | 7. harf açılır, **tüm kelime açılır, hak biter, puan = 0** | 0 |

Formül: `puan(n) = 3000 − 200·n` (n = açılan rastgele harf sayısı, 0…6). 7. harf açıldığında (n = 7) puan **doğrudan 0**'a iner (1600'de kalmaz).
Toplam süre = 3 sn okuma + 7 sn harf açılması = **10 sn**. (Yani "6. saniyede bilinirse 1800" kuralı bu çizelgeye uyar.)

**"BİL" butonu:**
- Okuma süresi dahil bonus boyunca basılabilir. Okuma süresinde basılırsa puan 3000'dir.
- Basıldığı an: harf açılması **durur**, anlık puan **donar**, 5 saniyelik **yazma süresi** başlar.
- Yazma süresinde: tanım ekranda kalır, üstte **donmuş anlık puan** ve **kalan 5 sn geri sayımı** görünür.
- **Açılan harfler (ilk harf dahil) kutuda kilitlidir; oyuncu sadece boş kutuları yazar** (imleç sıradaki boş kutuya atlar). Doğrulama için harfler doğru konumlarına yerleşir.
- Tüm kutular dolunca otomatik gönderilir (veya "Gönder" tuşu). Doğru ise **donmuş puan** kasaya eklenir; yanlışsa veya 5 sn dolarsa **0 puan**. Her iki durumda doğru kelime gösterilir.
- Yazılan kelimenin TDK'da olup olmadığı sorulmaz; sadece cevapla karşılaştırılır.
- Oyuncu "BİL"e hiç basmazsa t = 10'da hak biter, kelime açılır, 0 puan.

Bonus sonrası **tur özet ekranı** gelir (4.7).

### 4.7 Tur geçiş (özet) ekranları

- 1. tur → 2. tur ve 2. tur → 3. tur arasında: **"N. TUR BİTTİ — Kazandığın: X puan — Toplam Kasa: Y — Devam Et"** ekranı.
- 3. tur bitince: kasa özeti + **"4. TUR — Büyük Final"** giriş ekranı: kuralları kısaca anlatır (120 sn, kasanın yerine geçen kazanç, 0 puan riski), "Başla" butonu ile 3-2-1 sonra tur başlar.

### 4.8 4. Tur (Büyük Final)

- Toplam **120 saniye**, tüm etaplar boyunca tek bir sayaç. **Her tahmine ayrıca 10 sn sınırı YOKTUR.**
- Sayaç, ilk 4 harfli kelime ekranda göründüğü anda (3-2-1 sonrası) başlar.
- Etaplar sırasıyla **4 → 5 → 6 → 7 harfli**. Her etapta bir kelime çözülmesi gerekir. Her kelime için 5 tahmin hakkı vardır, ilk harf yine kilitli ve yeşildir.
- **Bir kelime bilinirse:** oyun (ve sayaç) **donar**, bir **duraklama ekranı** açılır: kazanılan etap, o anki kazanç, kalan süre görünür ve **"Devam Et"** butonu vardır. Oyuncu istediği kadar bekleyebilir. **Çekilme / kazancı alma seçeneği yoktur, devam etmek zorunludur.** "Devam Et"e basınca sayaç kaldığı yerden akar, sonraki etabın kelimesi gelir. (7 harfli bilinirse oyun biter.)
- **Bir kelime kaybedilirse** (geçersiz kelime veya 5 hak bitti): tüm kutular kırmızı kalır ve **doğru kelime** ekranda gösterilir. 120 sn sayaç bu sırada **donar** (donuk süre görünür kalır). Yaklaşık 3 saniye sonra **otomatik olarak** aynı harf sayısında yeni kelimeye geçilir (buton yoktur), sayaç kaldığı yerden devam eder (3 sn bekleme 120 sn'den düşmez). Bu bekleme sırasında giriş kilitlidir.
- Tahmin renk animasyonu sırasında 120 sn sayacı **akmaya devam eder** (animasyon ≤ 700 ms).
- **120 sn dolarsa** tur, hangi aşamada olursa olsun **anında** biter. Final skor = **son tamamlanan etabın kazancı**. Hiçbir etap tamamlanmadıysa **final skor 0**'dır (kasa yanar).

**Kazanç tablosu (K = 1–3. turlardaki kasa):**

| Tamamlanan son etap | Final skor |
|---|---|
| Hiçbiri | 0 |
| 4 harfli | K / 2 |
| 5 harfli | K |
| 6 harfli | K × 2 |
| 7 harfli | 250.000 + (K × 2) |

**Önemli:** 4. turdaki kazanç kasanın **yerine geçer** (kasaya eklenmez). Örnek: K = 20.000 ve 6 harflide süre biterse final skor 40.000.
Hesaplamada tam sayıya `Math.floor` uygulanır (K her zaman 200'ün katı olduğundan K/2 tam sayıdır).

### 4.9 Oyun sonu

Final skor ekranı: final skor, kasa, hangi etaba kadar gelindi, **en yüksek skor** (bu telefonda) ve "Yeni Oyun" / "Ana Menü" butonları. Skor, bu telefonun en yüksek skorundan büyükse "Yeni Rekor!" animasyonu gösterilir.

---

## 5. Kelime Verisi (EN KRİTİK BÖLÜM)

Oyunun doğruluğu bu veriye bağlıdır. Eksik/yanlış veri = hatalı oyun.

### 5.1 Gereksinimler

- TDK (Güncel Türkçe Sözlük) maddebaşı kelimelerinden **4, 5, 6 ve 7 harfli** tüm kelimeler (hem cevap havuzu hem tahmin doğrulama listesi olarak). 
- **8 harfli** kelimeler + **tanım** (sadece bonus sorular için, tahmin doğrulaması gerekmez).
- Tüm kelimeler rastgele seçilir, nadir kelimeler **dahildir** (zorluk filtresi yoktur).
- Tüm veri **projeye gömülü** statik dosyalar olarak tutulur (çalışma anında dış API çağrısı YAPILMAZ).

### 5.2 Kelime havuzu filtreleri ("temiz havuz")

Ham listeden şu işlemler uygulanır:
1. Türkçe küçük harfe çevir (`tr-TR`).
2. Şapkalı harfleri normalize et: `â→a`, `î→i`, `û→u` (oyuncu "kâr" kelimesini `kar` yazarak girer). Normalizasyon sonrası tekrarlar (duplicate) silinir.
3. **Hariç tut:** özel isimler, kısaltmalar, boşluk / tire / kesme işareti / rakam içeren maddeler (birleşik ve deyim maddeleri), harf dışı karakter içerenler. Geriye kalan her şey yalnızca `[a-zçğıöşü]` harflerinden oluşmalıdır.
4. Çekimli halleri (örn. `kalemi`) **ekleme**; sadece sözlük maddebaşları geçerlidir.
5. Harf sayısı normalizasyondan **sonra** hesaplanır.

### 5.3 Bonus (8 harfli) tanım filtreleri

- Sadece **kullanılabilir tanımı olan** 8 harfli kelimeler havuza girer.
- Tanım seçimi: kelimenin ilk anlamı (anlam listesinin ilk maddesi). Eğer "Bkz." (başka maddeye yönlendirme) veya çok kısa/anlamsız ise sonraki anlam denenir.
- **Cevabı sızdıran tanım olmaz:** Tanım metni cevabın kendisini veya kökünü (ilk 5 harfini paylaşan bir sözcüğü) içeriyorsa başka anlam denenir; hepsi sızdırıyorsa kelime havuzdan çıkarılır.
- Tanımın başındaki tür etiketleri (örn. `isim`, `sıfat`) isteğe bağlı olarak temizlenir, tanım okunaklı tek cümle/öbek olmalı.

### 5.4 Kaynak ve doğrulama (ajan yapacak)

Kullanıcının elinde hazır liste yoktur. Ajan **güvenilir ve kapsamlı** kaynak bulmak zorundadır. Örnek adaylar: TDK Güncel Türkçe Sözlük verisi (resmi `sozluk.gov.tr` verisi), TDK tabanlı GitHub açık veri setleri, kelime çözücü siteleri (`kelimeler.gen.tr`, `kelimeler.net`, `kelimeler.ileilgili.org`). Kurallar:
1. Mümkünse **hazır ve açık lisanslı veri seti** tercih edilir. Herhangi bir siteden toplu veri çekilecekse siteye zarar vermeyecek şekilde yavaş (rate-limit'e uygun) çalışılır ve kullanım koşullarına uyulur.
2. En az **iki bağımsız kaynakla çapraz doğrulama** yapılır (örn. rastgele 200 kelimenin TDK'da gerçekten bulunduğu kontrol edilir).
3. `DATA_SOURCES.md` dosyası yazılır: kaynaklar, indirme tarihi, her uzunluk için kelime sayısı (4/5/6/7/8), uygulanan filtreler, bulunan sorunlar.
4. Duman testi: `kale`, `küpe`, `elle`, `araba`, `kitap` gibi yaygın kelimelerin listede olduğu; `kalemi`, `xyzq` gibi kelimelerin olmadığı doğrulanır.
5. Kaynak bulunamaz veya kalite düşük çıkarsa **uydurma/yaklaşık liste kullanma**, `TODO(SORU)` bırakıp kullanıcıya sor.

### 5.5 Dosya formatı

- `public/data/words-4.json` … `words-7.json`: alfabetik sıralı string dizisi (küçük harf).
- `public/data/bonus-8.json`: `[{ "w": "...", "d": "..." }, ...]`.
- Dosyalar Vite build'ine dahil edilir ve service worker ile önbelleğe alınır.

---

## 6. Ekranlar ve Arayüz

### 6.1 Ekran listesi

1. **Açılış/Yükleme:** logo "LİNGO", kelime verisi yüklenirken ilerleme.
2. **Ana Menü:** Oyna, Nasıl Oynanır, En Yüksek Skor, Ayarlar.
3. **Nasıl Oynanır:** Kuralların kısa, görsel ve sade anlatımı (renk örnekleri, bonus ve 4. tur açıklaması).
4. **Geri sayım (3-2-1):** Her kelime/tur başlangıcı öncesi.
5. **Kelime ekranı** (1–3. tur ve 4. tur).
6. **Kelime sonucu kartı** (1–3. tur; 4. tur'da yalnızca kelime bilindiğinde duraklama).
7. **Bonus ekranı** (okuma/açılma + BİL + yazma fazları).
8. **Tur özet ekranı.**
9. **4. Tur giriş ekranı.**
10. **4. Tur duraklama ekranı** (kelime bilindi → Devam Et).
11. **Oyun sonu / Final skor ekranı.**
12. **Ayarlar:** Ses aç/kapat, Titreşim aç/kapat, En yüksek skoru sıfırla.
13. **Duraklatıldı katmanı** (arka plana atılınca).

### 6.2 HUD — her oyun ekranında görünecek bilgiler

Türkçe ve kolay okunur biçimde:
- **Tur ve sıra:** `1. TUR • Kelime 3/5` | bonusta `1. TUR • BONUS SORU` | 4. turda `4. TUR • Etap 2/4`
- **Harf sayısı:** `5 Harfli`
- **Tahmin hakkı:** `Hak 2/5`
- **Süre:** köşede büyük, canlı geri sayım (son 3 saniyede kırmızı/pulse)
- **Kasa:** `Kasa: 12.000` (4. turda kazanılan etabın kazancı ve potansiyel hedef de gösterilir)
- **Bonusta:** canlı düşen **anlık puan** ve süre; yazma fazında donmuş puan + 5 sn geri sayım
- Sayılar binlik ayraçlı gösterilir (örn. `250.000`).

### 6.3 Tahta ve klavye

- Tahta: 5 satır × N kutu (N = harf sayısı). Mevcut satır belirgin vurgulu. Eski tahminler renkli kalır. Kilitli ilk harf yeşil.
- **Özel Türkçe ekran klavyesi** (sistem klavyesi ASLA açılmaz; `<input>` kullanılmaz, düğmeler `<button>`):
  - Satır 1: `Q W E R T Y U I O P Ğ Ü`
  - Satır 2: `A S D F G H J K L Ş İ`
  - Satır 3: `GÖNDER` `Z X C V B N M Ö Ç` `SİL`
  - Büyük, kolay basılır tuşlar (min. ~44 px hedef), basış animasyonu, çift dokunma zoom'u kapalı.
  - Tuş renkleri bilinen harf durumunu yansıtır (yeşil/sarı/kırmızı).
- Masaüstü testi için fiziksel klavye desteği (Türkçe harfler dahil) eklenir.

### 6.4 Tasarım yönü: "gösterişli, gerçek bir mobil oyun hissi"

- Koyu tema, canlı gradyanlar, cam efekti (glassmorphism) kartlar, parlama (glow) vurguları.
- Renk jetonları: yeşil `#22c55e`, sarı `#facc15`, kırmızı `#ef4444`, arka plan koyu lacivert/mor tonları. Tailwind tema ayarlarında merkezi tanımla.
- Animasyonlar: kutu çevirme (flip) ile renk açılışı (kutular arası kademeli gecikme), geçersiz kelimede titreme (shake), kelime bilince konfeti/parıltı, puan sayacı yukarı sayma animasyonu, süre çubuğu/halka, ekran geçişleri.
- Kurallar: **mobil dikey (portrait) öncelikli**, 360–430 px genişlik, `100dvh`, kaydırma gerektirmeyen oyun ekranları, güvenli alan (`safe-area-inset-*`), `user-select: none`, `touch-action: manipulation`, tıklama vurgusu kapalı. Masaüstünde ortada telefon genişliğinde çerçeve.
- Erişilebilirlik: kontrast yeterli olmalı; renk dışında ek ipucu olarak (isteğe bağlı) sarı/yeşil kutularda küçük simge.
- Hata yok, takılma yok, 60 FPS hedefi. Animasyonlar GPU dostu (`transform`/`opacity`).

### 6.5 Ses ve titreşim

- Ayarlardan ayrı ayrı kapatılabilir; tercih `localStorage`'da saklanır.
- **Ses:** Telif/ağ sorunu olmaması için **WebAudio ile üretilen** kısa efektler (veya projeye gömülü, telifsiz küçük dosyalar). Olaylar: tuş vuruşu, harf renk açılışı, kelime bilindi, kelime kaybedildi/geçersiz, geri sayım tik, bonus harf açılışı, etap tamamlandı, final/rekor. Ses ilk kullanıcı dokunuşundan sonra başlatılır (tarayıcı kuralı).
- **Titreşim:** `navigator.vibrate` ile kısa desenler (doğru, yanlış, süre azaldı vb.). **Not:** iPhone (iOS Safari) bu API'yi desteklemez; destek yoksa sessizce atla, hata verme.

---

## 7. PWA Gereksinimleri

- `manifest.webmanifest`: `name: "LİNGO"`, `short_name: "LİNGO"`, `display: "standalone"`, `orientation: "portrait"`, `start_url: "/"`, `scope: "/"`, koyu `theme_color` ve `background_color`.
- **İkonlar:** 192×192, 512×512, **maskable** 512×512, iOS için `apple-touch-icon` (180×180), favicon. Tasarım: koyu/gradyan zemin üzerinde büyük, net **"BSG"** yazısı. Betikle (SVG → PNG) üretilir.
- iOS meta etiketleri: `apple-mobile-web-app-capable`, `apple-mobile-web-app-title="LİNGO"`, `apple-mobile-web-app-status-bar-style`.
- `viewport-fit=cover`, zoom engelleme (`user-scalable=no` / `maximum-scale=1`).
- **Service worker:** tüm statik dosyaları (JS, CSS, ikonlar, kelime JSON'ları) önbelleğe alır; ilk yüklemeden sonra çevrimdışı çalışır; yeni sürüm geldiğinde otomatik güncellenir.
- Tarayıcı adres çubuğu görünmeden tam ekran açılmalı (standalone).
- Hedef: Lighthouse PWA kontrollerinin geçilmesi.

---

## 8. Yerel Veri (localStorage)

| Anahtar | İçerik |
|---|---|
| `be:highscore` | En yüksek final skor |
| `be:stats` | Oynanan oyun sayısı, en iyi etap (basit istatistik) |
| `be:settings` | `{ sound: boolean, haptics: boolean }` |

Bu veriler cihaza özeldir; başka telefonla paylaşılmaz. Okuma/yazma `try/catch` ile korunur.

---

## 9. Kabul Kriterleri ve Testler

### 9.1 Birim testleri (zorunlu, Vitest)

1. `evaluateGuess`: `kale/elle`, `kale/küpe`, çift harf senaryoları (cevapta 1 adet olan harf iki kez tahmin edilirse yalnızca bir tanesi renklenir), tümü yeşil.
2. Türkçe normalizasyon: `I/İ/ı/i`, `â→a`, harf sayma.
3. Bonus puan zaman çizelgesi: t=0→3000, t=3.9→3000, t=4→2800, t=9→1800, t=10→0, BİL ile donma.
4. 4. tur kazanç tablosu: hiçbiri=0, 4h=K/2, 5h=K, 6h=2K, 7h=250000+2K.
5. Kasa hesabı: maksimum 39.000.
6. Kelime seçici: oyun içinde tekrar yok, doğru uzunlukta kelime gelir.
7. Zaman servisi: duraklat/devam ettiğinde süre kaybı/kazancı olmaz.

### 9.2 Elle test listesi

- [ ] Geçersiz kelime → kelime anında kaybedilir, tüm kutular kırmızı, 1–3. turda doğru cevap gösterilir, "Devam Et" + 3 sn geri sayım.
- [ ] 10 sn dolunca kelime kaybedilir.
- [ ] Her tahmin için 10 sn ayrı başlar ve her ekranda süre/tur/hak/kasa görünür.
- [ ] Bonus: 3 sn okuma, sonra saniyede bir rastgele harf, puan 200'er düşer, BİL ile donar, 5 sn yazma, yanlış/süre dolunca 0.
- [ ] 4. tur: 120 sn tek sayaç, kelime bilinince duraklama + Devam Et + kalan süre, kaybedilince 3 sn doğru kelime gösterimi + sayaç donması + 3 sn sonra otomatik yeni kelime, süre bitince son tamamlanan etabın kazancı (hiçbiri → 0).
- [ ] Telefon kilitlenince / uygulama değişince oyun duruyor, dönünce "Devam Et" ile kaldığı yerden sürüyor.
- [ ] Sistem klavyesi hiç açılmıyor; Türkçe harfler (Ğ Ü Ş İ Ö Ç ı) doğru çalışıyor.
- [ ] Çevrimdışı (uçak modu) ilk yüklemeden sonra oyun açılıyor ve oynanıyor.
- [ ] Ana ekrana eklenince "LİNGO" adı ve "BSG" ikonu görünüyor, adres çubuğu yok.
- [ ] Hiçbir oyunda aynı kelime ikinci kez gelmiyor (aynı oyun içinde).

---

## 10. Dağıtım

1. Proje bir GitHub deposuna yüklenir.
2. **Vercel** (veya Netlify) ile depo bağlanır. Ayarlar: Framework = Vite, Build command = `npm run build`, Output = `dist`. Ortam değişkeni yok.
3. Verilen `https://....vercel.app` bağlantısı iki telefonda açılır; "Ana Ekrana Ekle" yapılır.
   - **Android/Chrome:** menü → "Uygulamayı yükle / Ana ekrana ekle".
   - **iPhone/Safari:** Paylaş → "Ana Ekrana Ekle".

---

## 11. Geliştirme Aşamaları (ajan bu sırayla ilerlesin)

Her aşama sonunda testleri çalıştır, çalışır durumu doğrula ve kısa bir özet ver. Bir sonraki aşamaya geçmeden önce kullanıcıdan onay iste.

1. **M0 – İskelet:** Vite + React + TS + Tailwind + PWA eklentisi, klasör yapısı, ana menü iskeleti.
2. **M1 – Oyun motoru + testler:** `evaluateGuess`, bonus puan/zaman çizelgesi, 4. tur kazanç, tur yapılandırması, normalizasyon.
3. **M2 – Kelime verisi:** Bölüm 5'e göre veri hattı, JSON üretimi, `DATA_SOURCES.md`, sayılar ve duman testi raporu. **Burada kullanıcıya sayıları göster.**
4. **M3 – Zaman servisi + durum makinesi.**
5. **M4 – 1–3. tur arayüzü:** tahta, özel klavye, HUD, sonuç kartı, 3-2-1.
6. **M5 – Bonus soru ekranı.**
7. **M6 – 4. tur.**
8. **M7 – Skor/ayarlar, ses & titreşim, tur özet ekranları, final ekranı.**
9. **M8 – PWA (ikonlar, manifest, çevrimdışı) ve cilalama** (animasyonlar, performans).
10. **M9 – QA (Bölüm 9) ve dağıtıma hazırlık.**

---

## 12. Varsayımlar (kullanıcı itiraz etmedikçe geçerli)

Aşağıdakiler kullanıcıyla tek tek konuşulmadı, mantıklı varsayılan olarak seçildi:
1. Doğru bilinen kelimede de (1–3. tur) kısa sonuç kartı + "Devam Et" + 3 sn geri sayım akışı aynen uygulanır.
2. 4. tur sayacı ilk kelime göründüğü anda başlar; renk animasyonu sırasında akar.
3. Ses efektleri kodla üretilir (WebAudio).
4. Devam eden oyun sayfa yenilenince kaydedilmez.
5. Klavyede harf renkleri bilinen durumu gösterir.
6. Aynı oyun içinde kelime tekrarı yok; oyunlar arası hafıza yok.
7. Bonus sorunun tanımı, kelimenin ilk anlamıdır; cevabı sızdıran tanımlar elenir.

## 13. Kapsam Dışı

Online çok oyunculu mod, hesap/giriş, sunucu tarafı skor tablosu, reklam, analitik/izleme, uygulama mağazası yayını, Türkçe dışı dil desteği.