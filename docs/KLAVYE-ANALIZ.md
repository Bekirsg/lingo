# LİNGO v2 — Klavye Ergonomisi ve Ekran Yerleşim Analizi (Rev. 3)

Bu belge, SPEC-v2 Bölüm 9 ve Bölüm 10 kapsamında yeniden tasarlanan 29 harfli Türkçe ekran klavyesinin, bağımsız PAS butonunun ve dinamik tahta boyutlandırmasının (`calculateTileSize`) ergonomik kararlarını ve 6 mobil ekran boyutu için ölçümlerini belgeler.

---

## 1. Yeni Düzen Kararları (`KEY_LAYOUT`, Rev. 3)

Kullanıcı testleri ve ekran görüntüsü analizleri neticesinde eski 4 satırlı düzenin dikey alanı daralttığı, İ harfinin 3. satır başına kaymasının alışkanlığı bozduğu ve önizleme balonunun çift basılmış hissi verdiği görülmüştür. Bu doğrultuda şu kararlar uygulanmıştır:

### 1.1 Q Klavye Hafızasına Tam Uyum (3 Satır)
- **Satır 1 (10 Harf):** `E R T Y U I O P Ğ Ü` (Standardın aynısı, Q ve W yok)
- **Satır 2 (11 Harf):** `A S D F G H J K L Ş İ` (`İ` harfi standart Türkçe Q klavyedeki gibi 2. satırın sonundadır)
- **Satır 3 (10 Öğe):** `[GÖNDER] Z C V B N M Ö Ç [SİL]`  
  - 8 harf (`Z C V B N M Ö Ç`) standart Q sırasındadır (X yok).
  - `GÖNDER` en solda (~2.0 birim genişlik, mor, belirgin).
  - `SİL` en sağda (~1.5 birim genişlik, kırmızımsı).
  - **4. Satır tamamen kaldırılmıştır.** Bu sayede dikey alan ferahlamış, tuş yükseklikleri 50–54 px seviyesine çıkmıştır.

### 1.2 PAS Butonunun Yeni Konumu
- PAS butonu klavye harf satırlarının içinde **DEĞİLDİR**.
- Klavyenin hemen üstünde, sağa yaslı küçük bağımsız bir düğmedir:
  - Görsel boyut: ~64 × 36 px.
  - Dokunma alanı: $\ge 44\text{ px}$ yükseklik (min-height 44 px ile standart mobil erişilebilirlik).
  - Harf tuşlarından dikeyde en az 8 px ayrık (`mb-2`).
  - Klavye dokunma ve kaydırma çözümlemesine (`resolveKeyAtPoint`) **kesinlikle dahil edilmez**; harf yazarken kayarak kazara PAS basılması imkânsızdır.
- **İki Aşamalı Koruma:** İlk dokunuşta "PAS?" kehribar uyarı durumuna geçer (2 sn süre), ikinci dokunuşta PAS uygulanır. Başka tuşa basılırsa veya 2 sn geçerse iptal olur.
- **Bonus Soru Ekranında:** Aynı konumda soluk ve devre dışı kalır (`opacity-40 pointer-events-none`), düzen kaymaz.

---

## 2. Giriş Davranışı, Ses ve Titreşim

1. **Basınca Anında Yazma (`COMMIT_ON = 'down'`):** Harf tuşuna basıldığı anda (`pointerdown`) harf anında kutuya yazılır; hiçbir gecikme yoktur.
2. **Önizleme Balonu Kaldırıldı (`SHOW_PREVIEW_BUBBLE = false`):** İki kez basılmış algısı yaratan uçan balon yerine tuşun kendisine anında basılı efekti (`scale-[0.93] ring-2 ring-violet-400 brightness-125`) verilir.
3. **Kaydır-Bırak:** Varsayılan olarak kapalıdır (parmak basılıyken kaydırılsa dahi ek harf yazılmaz). İstenirse kod silinmeden `COMMIT_ON = 'up'` sabitiyle geri açılabilir.
4. **Tek Sefer Ses ve Titreşim:** Tuş sesi ve haptik titreşim **yalnızca `pointerdown`'da tek bir kez** tetiklenir. `handleChar` / `handleDelete` içindeki mükerrer ses çağrıları temizlenmiş, çift tıklama hissi tamamen giderilmiştir.
5. **SİL Tekrarı:** Basılı tutulduğunda 400 ms sonra tekrarlı silme başlar (80 ms aralık, 1 sn sonra 50 ms).

---

## 3. Dinamik Tahta Kutu Boyutlandırması (`calculateTileSize`)

Eski sabit `max-w` sınırları (`max-w-[240px]`, `290px` vb.) tamamen kaldırılmıştır. Kutu boyutu kullanılabilir alan üzerinden saf fonksiyonla hesaplanır:
$$\text{tileSize} = \min\left(\left\lfloor\frac{\text{usableWidth}}{\text{cols}}\right\rfloor, \left\lfloor\frac{\text{usableHeight}}{5}\right\rfloor, 64\text{ px}\right)$$

Kareler daima kare kalır (`aspect-square`), üst sınır 64 px'dir.

### 6 Mobil Ekran Boyutu İçin Yenilenen Ölçüm Tablosu

| Cihaz / Viewport | Genişlik × Yükseklik | Kullanılabilir Yükseklik (HUD ile PAS+Klavye arası) | 4 Harfli Kutu Boyutu (Hedef: v1 gibi ~56–64px) | 7 Harfli Kutu Boyutu | Klavye Yüksekliği (3 satır) | Tahta + Klavye + HUD Toplamı | Durum |
|---|---|---|---|---|---|---|---|
| **iPhone SE 1 (320×568)** | 320 × 568 px | **~268 px** | **47 px** | **38 px** | ~164 px | **510 px** / 568 px | ✅ **+58 px boşluk, SIFIR KAYDIRMA** |
| **Android Standart (360×640)** | 360 × 640 px | **~336 px** | **61 px** | **44 px** | ~164 px | **565 px** / 640 px | ✅ **+75 px boşluk, ferah** |
| **iPhone 8 / SE2 (375×667)** | 375 × 667 px | **~360 px** | **64 px** (üst sınır) | **46 px** | ~168 px | **580 px** / 667 px | ✅ **+87 px boşluk, ideal** |
| **iPhone 12/13/14 (390×844)** | 390 × 844 px | **~520 px** | **64 px** (üst sınır) | **48 px** | ~178 px | **602 px** / 844 px | ✅ **+242 px, v1 gibi büyük kutular** |
| **iPhone 15 Pro (393×852)** | 393 × 852 px | **~528 px** | **64 px** (üst sınır) | **49 px** | ~180 px | **608 px** / 852 px | ✅ **+244 px, v1 gibi büyük kutular** |
| **Pixel 7 / Android (412×915)** | 412 × 915 px | **~585 px** | **64 px** (üst sınır) | **51 px** | ~184 px | **628 px** / 915 px | ✅ **+287 px ferah** |
| **iPhone Pro Max (430×932)** | 430 × 932 px | **~600 px** | **64 px** (üst sınır) | **54 px** | ~184 px | **638 px** / 932 px | ✅ **+294 px ferah** |

> **Rev. 3 Karar Notu:**  
> Eski "4 satır klavye", "44 px minimum tuş kısıtı" ve "320×568 TODO(SORU)" maddesi Rev. 3 dinamik boyutlandırma formülüyle tamamen çözülmüş ve **geçersiz kılınmıştır**.

---

## 4. Sistem Klavyesi Seçeneği ve visualViewport Entegrasyonu (Rev. 4)

Kullanıcı tercihlerine Ayarlar menüsünden erişilebilen `keyboard: 'game' | 'system'` seçeneği eklenmiştir.

### 4.1 Sistem Modu Mimari ve Çalışma Prensipleri (`InputLayer`)

1. **Görsel Alan:** 29 harfli sanal ekran klavyesi gizlenir; yerine kompakt bir eylem çubuğu `[PAS] ... [GÖNDER]` gösterilir:
   - **PAS:** Solda iki aşamalı onaylı ("PAS" → "PAS?", 2 sn zaman aşımı) bağımsız buton. Bonusta pasif/gizli.
   - **Klavye Göstergesi / Tetikleyici:** Ortada klavye durumunu gösteren ve dokunulduğunda odağı yenileyen buton.
   - **GÖNDER:** Sağda mor-indigo gradyanlı, yalnızca kelime tamamlandığında (`canSubmit === true`) aktif olan onay butonu.
2. **Gizli `<input>` ve iOS Güvenliği:**
   - Sayfa yakınlaşmasını (auto-zoom) önlemek için `fontSize: 16px` şartı sağlanmıştır.
   - Ekran kaymasını önlemek için `position: fixed`, `top: 0`, `left: 0`, `opacity: 0`, `pointer-events: none` kullanılmıştır.
   - `autoCapitalize="none"`, `autoCorrect="off"`, `autoComplete="off"`, `spellCheck={false}`, `enterKeyHint="send"` ile sistem müdahaleleri kapatılmıştır.
   - Android Gboard silme (backspace) olaylarını garantilemek için sentinel tamponu (`'   '`) tekniği uygulanmıştır.
3. **Girdi Temizleme (`inputSanitize`):**
   - Türkçe karakter dönüşümü: `I` → `ı`, `İ` → `i`, `toLocaleLowerCase('tr-TR')`.
   - Şapkalı harf normalizasyonu: `â` → `a`, `î` → `i`, `û` → `u`.
   - Yabancı harf engeli: `q`, `w`, `x` kesinlikle elenir.
   - Rakam, noktalama, boşluk ve semboller ayıklanır.
4. **visualViewport Entegrasyonu:**
   - Mobil cihazlarda sistem klavyesi açıldığında `window.visualViewport.height` dinamik olarak takip edilir.
   - `--app-height` ve `--visual-viewport-height` CSS değişkenleri güncellenir.
   - Tahta kutu boyutu hesabı (`calculateTileSize`) klavye açıkken kalan yüksekliğe göre otomatik küçülür; tahtanın taşması veya dikey kaydırma oluşması engellenir.
5. **Otomatik ve Etkileşimli Odak:**
   - Oyun başladığında ve yeni kelimeye geçildiğinde otomatik odaklanılır.
   - Tahtaya dokunulduğunda sistem klavyesi yeniden açılır.
   - Bonus turunda **BİL** butonuna basıldığı anda doğrudan sistem klavyesine odaklanılır.
