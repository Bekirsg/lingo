# LİNGO — Türkçe Kelime Oyunu (PWA)

Türk televizyon klasiği Lingo formatında, TDK Güncel Türkçe Sözlük (GTS 12. baskı) tabanlı, mobil öncelikli ve çevrimdışı (offline) çalışabilen Progressive Web App (PWA).

---

## 🎮 Oyun Formatı

- **1–3. Turlar:** 
  - Her turda 5 kelime (1. Tur: 4 harf, 2. Tur: 5 harf, 3. Tur: 6 harf).
  - Her tahmin için 10 saniye süre ve 5 tahmin hakkı.
  - Kelime bilindiğinde harf başına 100 puan; ilk harf daima açık ve yeşildir.
  - Tur sonlarında 8 harfli **Bonus Soru**: 3 saniye okuma, her saniye rastgele bir harf açılır, puan 3.000'den 0'a doğru 200'er düşer. "BİL" tuşuna basıldığı anda puan donar ve **5 saniye** içinde kelimeyi yazma hakkı verilir.
- **4. Tur (Büyük Final):**
  - Toplam **120 saniye** tek sayaç!
  - Sırasıyla 4 → 5 → 6 → 7 harfli kelime etapları.
  - Kelime bilinince sayaç donar, duraklama ekranında kazanç görünür ve oyuncu hazır olduğunda devam eder.
  - Kelime kaybedilirse doğru kelime gösterilir, sayaç 3 saniye donar ve otomatik olarak aynı harf sayısında yeni kelimeye geçilir.
  - 120 saniye dolduğunda son tamamlanan etabın kazancı alınır:
    - *Hiçbiri:* 0 puan (kasa yanar)
    - *4 Harfli:* Kasa / 2
    - *5 Harfli:* Kasa × 1
    - *6 Harfli:* Kasa × 2
    - *7 Harfli:* 250.000 + (Kasa × 2)

---

## 🛠️ Teknolojiler

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite
- **PWA & Offline:** `vite-plugin-pwa`, Workbox (tüm kod, stiller, ikonlar ve 5 veri JSON'u tam önbelleğe alınır)
- **Ses:** WebAudio API ile saf kod sentezli 12 ses efekti (harici dosya/telif/ağ yok)
- **Titreşim:** Web Haptics (`navigator.vibrate`)
- **Veri:** TDK Güncel Türkçe Sözlük (23.600+ temiz maddebaşı kelime havuzu)
- **Test:** Vitest (171+ birim ve entegrasyon testi)

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
  3. Ana ekranda "B-E" logolu **LİNGO** uygulaması belirecek, tarayıcı çubuğu olmadan tam ekran açılacaktır.

- **iOS / iPhone (Safari):**
  1. Safari'nin alt çubuğundaki **Paylaş** (kare içinden yukarı ok) düğmesine dokunun.
  2. Aşağı kaydırıp **"Ana Ekrana Ekle"** seçeneğini seçin.
  3. Sağ üstteki **"Ekle"** butonuna dokunun.

---

## 🔒 Güvenlik ve Geliştirici Araçları (Dev Tools)

- `import.meta.env.DEV` koruması altındaki geliştirici araçları (sol üstteki 🛠️ paneli, 4. tura atlama, otomatik çözme, cevap görme vb.) **üretim derlemesinde (`npm run build`) Vite tarafından tamamen ağaç budamaya (tree-shaking) uğrar ve bundle'dan silinir**.
- Üretim kodunda hiçbir dev aracı, kısayolu veya cevap sızdıran düğme bulunmaz.
