# LİNGO v2.0.0 — Türkçe Kelime Oyunu (PWA)

Türk televizyon klasiği Lingo formatında, TDK Güncel Türkçe Sözlük (GTS 12. baskı) tabanlı, seviye sistemli, kapsamlı antrenman/analiz modlarına sahip, mobil öncelikli ve tamamen çevrimdışı (offline) çalışabilen Progressive Web App (PWA).

---

## 🎮 Oyun Modları ve Özellikler

### 1. 🏆 Yarışma Modu
- **Seviye Seçimi:** Kolay (A1–A2), Orta (A1–B2) ve Zor (tüm kelimeler) seviyeleri. Her seviyenin en yüksek skoru ayrı kaydedilir.
- **1–3. Turlar:** 
  - Her turda 5 kelime (1. Tur: 4 harfli, 2. Tur: 5 harfli, 3. Tur: 6 harfli).
  - Her tahmin için 15 saniye süre ve 5 tahmin hakkı.
  - Kelime bilindiğinde harf başına 100 puan; ilk harf daima açık ve yeşildir.
- **Parametrik Bonus Soru (8, 9, 10 ve 11 Harf):**
  - Tur sonlarında 8, 9, 10 veya 11 harfli TDK tanımlı sürpriz kelimeler.
  - Toplam $L + 2$ saniye süre; ilk 3 saniye okuma fazı, ardından saniyede 1 harf açılışı (3.000 puandan 0'a azalan puan).
  - **"BİL"** tuşuna basıldığı anda puan ve harfler donar, oyuncuya kelimeyi tamamlaması için **10 saniye** yazma süresi verilir.
- **4. Tur (Büyük Final):**
  - Toplam **120 saniye** tek sayaç!
  - Sırasıyla 4 → 5 → 6 → 7 harfli kelime etapları.
  - Kelime bilinince sayaç donar, duraklama ekranında kazanç görünür.
  - Kelime kaybedilirse doğru kelime gösterilir, sayaç 3 saniye donar ve otomatik olarak aynı harf sayısında yeni kelimeye geçilir.
  - Final kazanç çarpanları: 4 Harf ($Kasa / 2$), 5 Harf ($Kasa \times 1$), 6 Harf ($Kasa \times 2$), 7 Harf ($250.000 + Kasa \times 2$).

### 2. 📚 Çalışma Modu
- Kolay, Orta veya Zor seviyede sınırsız kelime antrenmanı.
- 4 → 5 → 6 → 7 → Bonus döngüsüyle kesintisiz pratik.
- Süre kısıtları aynı kalır, puan baskısı yoktur; kaybedilen kelimelerde doğru cevap anında gösterilir.
- İstendiğinde "Bitir" ile detaylı oturum özeti görüntülenir ve veriler Analizler'e işlenir.

### 3. 🎯 "Hatalarımla Çalış" Modu
- Yarışma ve Çalışma oturumlarında bilemediğiniz veya PAS geçtiğiniz kelimelerden dinamik havuz oluşturulur.
- Bir kelime arka arkaya 2 kez doğru bilinince **"✓ öğrenildi"** sayılır ve çalışma havuzundan otomatik düşer.

### 4. 📊 Detaylı Analizler ve İstatistikler
- Mobil öncelikli, tek dikey akışlı modern gösterge paneli.
- Harf sayısı ve baş harf filtreleri; en çok kaçırılan kelimeler ve sözlük dışı denemeler listesi.
- Harf başarı ısı haritası, 9 kural öncelikli Akıllı Öneriler ve son oyunların ilerleme grafiği.

### 5. ✏️ "Hatalarım" Yönetici Ekranı
- Analizler ve Çalışma menüsünden erişilebilen tam denetimli liste yöneticisi.
- Mobil uyumlu sola kaydırma (swipe-left 72px eşik) veya `⋯` menüsü ile kelimeleri listeden gizleme/geri alma.
- Yanlışlıkla silmelere karşı 5 saniyelik **Geri Al (Undo)** bildirimi ve çoklu seçim desteği.
- Gizlenen bir kelime oyunda tekrar kaçırılırsa otomatik olarak listeye geri döner.

### 6. ⌨️ Ergonomik Klavye & PAS Tuşu
- **Türkçe 29 Harf:** Q/W/X içermeyen, kenar boşlukları optimize edilmiş, gecikmesiz basış hissi veren özel dokunmatik klavye.
- **Klavye Tercihi:** Ayarlar'dan dilediğiniz zaman "Oyun Klavyesi" veya "Telefon/Sistem Klavyesi" arasında geçiş yapabilirsiniz.
- **İki Aşamalı PAS:** Yanlış dokunmalara karşı korumalı, 2 saniye içinde çift basışla onaylanan PAS tuşu.

---

## 🛠️ Teknolojiler

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite
- **PWA & Offline:** `vite-plugin-pwa`, Workbox (tüm kod, stiller, ikonlar ve 5 veri JSON'u tam önbelleğe alınır)
- **Ses:** WebAudio API ile saf kod sentezli 12 ses efekti (harici dosya/telif/ağ yok)
- **Titreşim:** Web Haptics (`navigator.vibrate`)
- **Veri:** TDK Güncel Türkçe Sözlük GTS 12. baskı (23.717 temiz maddebaşı kelime + 5.149 tanımlı 8–11 harfli bonus havuzu)
- **Test:** Vitest (596 birim, render, veri doğrulayıcı ve kabul testi — %100 yeşil)
- **v2 Yenilikleri:**
  - Seviye Sistemi (Kolay / Orta / Zor ve seviye bazlı rekorlar)
  - Çalışma & Hatalarımla Çalış Modları (ardışık 2 doğru ile "öğrenildi" takibi)
  - Analizler Modülü (mobil öncelikli tek dikey akış, akıllı öneriler, harf ısı haritası)
  - "Hatalarım" Yönetim Ekranı (sola kaydırma, `⋯` menüsü, 5 saniye Geri Al bildirimi)
  - Parametrik Bonus Motoru (8, 9, 10 ve 11 harfli kelimeler, 10 sn yazma)
  - PAS Tuşu (iki aşamalı onay koruması)
  - Çift Klavye Desteği (Özel Oyun Klavyesi & Sistem/Telefon Klavyesi)

---

## 🚀 Kurulum ve Yerel Çalıştırma

### Gereksinimler
- Node.js 18+ (Node 20+ önerilir)
- npm veya pnpm / yarn

### Adımlar

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```
Varsayılan olarak `http://localhost:5173` adresinde çalışır.

Mobil cihazdan yerel ağ üzerinden test etmek için:
```bash
npm run dev -- --host
```

---

## 📦 Üretim Derlemesi (Build) ve Önizleme

Üretim derlemesi oluşturmak için:
```bash
npm run build
```
Derleme çıktısı `dist/` dizinine yazılır.

Üretim derlemesini yerel bir sunucuda önizlemek ve PWA özelliklerini test etmek için:
```bash
npm run preview
```
Veya mobil cihazdan erişim için:
```bash
npm run preview -- --host
```

---

## 🧪 Testler ve Tip Kontrolü

Birim ve entegrasyon testlerini çalıştırmak için:
```bash
npm test -- --run
```

TypeScript tip denetimi:
```bash
npx tsc -b
```

---

## 🌐 Dağıtım (Deployment)

Uygulama statik bir Single Page Application (SPA) ve PWA'dır. Vercel, Netlify, Cloudflare Pages veya GitHub Pages üzerinde sıfır yapılandırmayla çalışır.

### Vercel Dağıtımı
1. GitHub deponuzu Vercel'e bağlayın.
2. Proje ayarları otomatik tanınacaktır:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment Variables:** Gerekli ortam değişkeni **YOKTUR**.
3. Dağıtımı tamamlayın.

### Netlify Dağıtımı
1. Deponuzu Netlify'a bağlayın.
2. Derleme ayarlarını girin:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Environment variables:** Boş bırakın.
3. Dağıtımı başlatın.

> **Önemli (PWA / Service Worker Gereksinimi):** PWA manifest'inin ve Service Worker'ın (`sw.js`) tarayıcılar tarafından tanınması için sitenin **HTTPS** protokolü üzerinden sunulması şarttır (Vercel ve Netlify varsayılan olarak ücretsiz SSL/HTTPS sağlar).

---

## 📱 Mobil Cihaza Yükleme (PWA)

Site HTTPS bağlantısı üzerinden açıldıktan sonra:

- **Android (Chrome):**
  1. Sağ üstteki `⋮` (üç nokta) menüsüne dokunun.
  2. **"Uygulamayı yükle"** veya **"Ana ekrana ekle"** seçeneğine dokunun.
  3. Ana ekranda "BSG" logolu **LİNGO** uygulaması belirecek, tarayıcı çubuğu olmadan tam ekran açılacaktır.

- **iOS / iPhone (Safari):**
  1. Safari'nin alt çubuğundaki **Paylaş** (kare içinden yukarı ok) düğmesine dokunun.
  2. Aşağı kaydırıp **"Ana Ekrana Ekle"** seçeneğini seçin.
  3. Sağ üstteki **"Ekle"** butonuna dokunun.

---

## 📚 Kelime Verisi ve Yeniden Üretim (Data Pipeline)

Oyun için TDK GTS (12. baskı) ve TDK İmla Kılavuzu tabanlı 23.700+ kelimelik temizlenmiş ve doğrulanmış veri havuzları `public/data/` dizininde kullanıma hazır olarak bulunmaktadır.

Ham veriler ~100 MB büyüklüğünde olduğu için git deposuna dahil edilmemiştir (`.gitignore`). Kelime listesini sıfırdan yeniden üretmek isterseniz:

1. `scripts/raw-data/` klasörünü oluşturun:
   ```bash
   mkdir -p scripts/raw-data
   ```
2. Açık kaynaklı ham veri setlerini indirin:
   - **TDK GTS v12:** [ogun/guncel-turkce-sozluk](https://github.com/ogun/guncel-turkce-sozluk) deposundan `sozluk/v12/v12.gts.json.tar.gz` dosyasını açıp `scripts/raw-data/gts.json` olarak kaydedin.
   - **TDK İmla Kılavuzu:** [emrahcom/turkce_kelimeler](https://github.com/emrahcom/turkce_kelimeler) deposundan `imla_kilavuzu.txt` dosyasını `scripts/raw-data/imla-kilavuzu.txt` olarak kaydedin.
3. Filtreleme ve doğrulama betiğini çalıştırın:
   ```bash
   node scripts/build-wordlist.mjs
   ```
4. Ayrıntılı filtre kuralları, istatistikler ve çapraz doğrulama raporu için [`DATA_SOURCES.md`](DATA_SOURCES.md) dosyasını inceleyebilirsiniz.

---

## 🔒 Güvenlik ve Kod Temizliği

- Projede hiçbir dev aracı, test paneli, hile butonu veya cevap sızdıran kısayol bulunmamaktadır.
- Tüm testler, durum makinesi ve istemci kodu saf ve bağımsız olarak çalışır; harici gizli anahtar veya ortam değişkeni gerektirmez.
