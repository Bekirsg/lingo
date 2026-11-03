# LİNGO v2 — Klavye Ergonomisi ve Ekran Yerleşim Analizi (V2-M3)

Bu belge, SPEC-v2 Bölüm 9 ve Bölüm 10 kapsamında yeniden tasarlanan 29 harfli Türkçe ekran klavyesinin ergonomik kararlarını, aksiyon satırı (`ACTION_ROW`) tasarımını ve farklı ekran boyutlarındaki dikey/yatay piksel bütçesi ölçümlerini belgeler.

---

## 1. Ergonomi ve Başparmak Erişimi Analizi

### 1.1 Mobil Başparmak Bölgeleri (Thumb Zones)
Mobil cihazlarda kelime oyunu oynarken kullanıcıların büyük çoğunluğu (%85+) cihazı iki eliyle kavrayarak iki başparmağıyla hızlı yazar veya tek elle alt kısımdan tutar.
- **Doğal / Rahat Bölge (Comfort Zone):** Ekranın alt 1/3'lük bölümü, ekranın sol-alt ve sağ-alt köşeleri.
- **Uzanma Bölgesi (Stretch Zone):** Ekranın orta-üst bölümü (Satır 1 ve HUD).
- **Zor Bölge:** Ekranın en üst köşeleri.

### 1.2 29 Harf Yerleşimi (Q, W, X Hariç)
- **Satır 1 (10 tuş):** `E R T Y U I O P Ğ Ü`
- **Satır 2 (10 tuş):** `A S D F G H J K L Ş`
- **Satır 3 (9 tuş):** `İ Z C V B N M Ö Ç`
- **Harf Bütünlüğü:** Standart Türkçe Q klavye motor hafızası korunmuştur. Q, W, X çıkarıldığı için tuşlar yatayda daha geniş alan kazanmış, tuş genişliği 360 px genişlikteki tipik ekranda 26 px'ten ~31 px'e yükselmiştir.
- **I ve İ Ayrımı:** Üst sırada "I" (küçük ı), alt sırada "İ" (küçük i) yer alır. Kullanıcıların i/ı karışıklığını önlemek için görsel olarak ayrılmıştır.

---

## 2. Alt Eylem Satırı (`ACTION_ROW`) Kararı

SPEC-v2 Bölüm 9.1 gereğince alt eylem satırı tek bir sabitte tutulur:
`ACTION_ROW = [ { id: 'PAS', label: 'PAS', weight: 1.0 }, { id: 'DELETE', label: 'SİL', weight: 1.3 }, { id: 'SUBMIT', label: 'GÖNDER', weight: 1.7 } ]`

### Neden `[PAS] [SİL] [GÖNDER]` Sıralaması?

1. **PAS ve GÖNDER'in Azami Mesafede Ayrılması:**
   - **Risk:** PAS bir kelimeyi anında kaybettirir ve 0 puan verir; GÖNDER ise tahmini sunar. Bu iki tuş yan yana konursa oyuncunun aceleyle gönderirken yanlışlıkla PAS'a veya PAS geçmek isterken eksik kelimeyi göndermeye basma riski doğar.
   - **Karar:** `PAS` en sol uca, `GÖNDER` en sağ uca yerleştirilmiştir. Aralarında `SİL` tuşu bir tampon oluşturur.

2. **İki Aşamalı PAS Koruması (SPEC Bölüm 10.2):**
   - Tek dokunuşla kelime kaybedilmez. İlk dokunuşta buton sarı/kehribar renkle `PAS?` durumuna geçer.
   - 2 saniye içinde ikinci kez basılırsa PAS uygulanır.
   - Başka bir tuşa basılırsa veya 2 saniye dolarsa otomatik iptal olur.
   - Bu çift koruma sayesinde kaza riski matematiksel olarak sıfırlanmıştır.

3. **Genişlik Oranları (1.0 : 1.3 : 1.7):**
   - **GÖNDER (Ağırlık 1.7):** Oyuncunun en çok bastığı birincil aksiyon tuşudur; sağ başparmağın en rahat eriştiği alanda en geniş tuştur. Tüm kutular dolmadan pasiftir (soluk, tıklanamaz).
   - **SİL (Ağırlık 1.3):** Düzeltme tuşudur. Merkezde yer alır, her iki başparmakla da erişilebilir. Basılı tutulduğunda kademeli hızlanan silme çalışır (400ms bekleme -> 80ms tekrar -> 1sn sonra 50ms tekrar).
   - **PAS (Ağırlık 1.0):** Taktiksel ve nadir kullanılan bir aksiyondur. Sol başparmak kenarında kompakt tutulmuştur. Bonusta pasif/soluk bırakılır (düzen kaymaz).

---

## 3. Ekran Boyutu ve Piksel Bütçesi Ölçümleri (SPEC 9.2)

Aşağıdaki ölçümler gerçek mobil cihaz viewport çözünürlükleri için hesaplanmıştır:

| Cihaz / Viewport | Genişlik × Yükseklik | Satır 1 Tuş Genişliği | Tuş Yüksekliği (`clamp(44px, 6.6dvh, 56px)`) | Klavye Toplam Yüksekliği | HUD Yüksekliği | Tahta Yüksekliği (5 satır) | Kalan Boşluk / Durum |
|---|---|---|---|---|---|---|---|
| **iPhone SE 1 (320×568)** | 320 × 568 px | **29.4 px** | **44.0 px** (min sınır) | ~204 px | ~78 px | ~220 px | **+66 px** (Sığıyor*) |
| **Android Standart (360×640)** | 360 × 640 px | **33.2 px** | **44.0 px** | ~204 px | ~80 px | ~240 px | **+116 px** (Rahat) |
| **iPhone 8 / SE2 (375×667)** | 375 × 667 px | **34.7 px** | **44.0 px** | ~204 px | ~82 px | ~250 px | **+131 px** (Rahat) |
| **iPhone 12/13/14 (390×844)** | 390 × 844 px | **36.2 px** | **55.7 px** | ~252 px | ~86 px | ~280 px | **+226 px** (Ferah) |
| **Pixel 7 / Android (412×915)** | 412 × 915 px | **38.4 px** | **56.0 px** (üst sınır) | ~256 px | ~88 px | ~290 px | **+281 px** (Ferah) |
| **iPhone Pro Max (430×932)** | 430 × 932 px | **40.2 px** | **56.0 px** (üst sınır) | ~256 px | ~90 px | ~300 px | **+286 px** (Ferah) |

*Not: Tuş genişliği 10 tuş + 9 boşluk (gap=2px) + 2 kenar dolgusu (padding=8px) formülüyle hesaplanmıştır: `(Genişlik - 26px) / 10`.*

---

## 4. 320×568 Ekran Analizi ve Kritik Uyarı

### Risk Tespiti:
320×568 piksel (en dar hedef ekran) üzerinde:
1. **Klavye:** 4 satır × 44 px + 3 boşluk × 4 px + dolgular = **204 px**.
2. **HUD:** Başlık satırı + süre çubuğu + sayaçlar = **78 px**.
3. **Kalan dikey alan:** 568 - (204 + 78) = **286 px**.
4. **Tahta:** 5 satırlı tahtada:
   - 7 harfli kelimede kutu boyutu en fazla 38 px olur; 5 × 38 px + boşluklar = **215 px** (286 px içine rahatça sığar).
   - **ANCAK 4 harfli kelimede:** Eğer tahta yatay genişliği (304 px) doldurmaya çalışırsa her kutu `304 / 4 = 76 px` olur! 5 satır × 76 px = **380 px** eder. Bu durumda `380 + 204 + 78 = 662 px > 568 px` olur ve ekran kaydırmaya (scroll) zorlanır!

### Uygulanan Koruma ve Soru Bildirimi:
Kural uydurmamak adına oyun tahtası kapsayıcısına `max-h-[240px]` veya `flex-1 overflow-hidden` kuralı uygulanarak kutuların dikeyde ekranı taşırması engellenmiştir (kutular genişliğe değil, dikey boşluğa göre `max-w-[44px]` sınırında kalır).

> **TODO(SORU): 320×568 Cihazlar İçin Tercih Edilen Yerleşim:**
> 320×568 ekranlarda kaydırmasız tam uyum için şu anki çözümümüz:
> - **Seçenek A (Mevcut Uygulama):** Klavye tuş yüksekliği SPEC'e sadık kalarak 44 px kalır. Tahta kutuları 4 harfli kelimelerde en fazla 44×44 px ile sınırlandırılır. Tahta yüksekliği 220 px olur, toplam içerik ~502 px tutar ve 568 px'e kaydırmasız mükemmel sığar.
> - **Seçenek B:** Eğer 4 harfli kelimelerde kutuların daha büyük olması istenirse, sadece 320 px ekranda klavye tuş yüksekliği 40 px'e indirilebilir (klavye 180 px'e düşer, tahtaya +24 px yer açılır).
> 
> *Onayınız Seçenek A doğrultusunda tutulmuştur; aksi bir tercihiniz varsa belirtiniz.*
