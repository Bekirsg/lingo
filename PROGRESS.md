# BEKİR-EREN — Geliştirme İlerleme Durumu (PROGRESS)

| Aşama | Başlık | Durum | Açıklama |
|---|---|---|---|
| **M0** | İskelet | ✅ Tamamlandı | Vite + React 19 + TypeScript + Tailwind v4 + vite-plugin-pwa iskeleti, klasör yapısı, PWA ikonları ve ana menü. |
| **M1** | Oyun Motoru + Testler | ✅ Tamamlandı | `evaluateGuess` (Wordle renk algoritması, `kale`/`elle` zorunlu testi dahil), Türkçe normalizasyon (`tr-TR`, şapka kaldırma), bonus zaman çizelgesi, 4. tur kazanç çarpanı, kasa hesabı (maks. 39.000), kelime seçici. **89/89 birim testi geçti.** |
| **M2** | Kelime Verisi | ✅ Tamamlandı | TDK Güncel Türkçe Sözlük (GTS 12. baskı, 99.236 madde) ve TDK İmla Kılavuzu ile veri hattı. SPEC 5.2 temiz havuz kuralları ve SPEC 5.3 sıkılaştırılmış tanım filtreleri uygulandı. Bağımsız madde (`cesit == 0`) filtresiyle kalıplaşmış/çekimli sözler ayıklandı. [`DATA_SOURCES.md`](DATA_SOURCES.md) belgelendi.<br>• 4 harfli: 2.049 kelime<br>• 5 harfli: 5.449 kelime<br>• 6 harfli: 6.033 kelime<br>• 7 harfli: 7.917 kelime<br>• 8 harfli (bonus tanımlı): 2.269 kelime |
| **M3** | Zaman Servisi + Durum Makinesi | ⏳ **SIRADA** | `performance.now()` tabanlı hassas geri sayım saati, drift engelleme, duraklat/devam servisi, `visibilitychange` arka plan yönetimi, tam oyun akışı durum makinesi (`useReducer` / state machine). |
| **M4** | 1–3. Tur Arayüzü | ⚪ Bekliyor | 5xN tahta, özel Türkçe ekran klavyesi (fiziksel klavye desteğiyle), HUD (tur, hak, süre, kasa), sonuç kartı, 3-2-1 geri sayım. |
| **M5** | Bonus Soru Ekranı | ⚪ Bekliyor | 8 kutulu bonus tahtası, okuma fazı, dinamik harf açılma ve puan düşüşü (3000→0), BİL butonu, 3 sn yazma modu. |
| **M6** | 4. Tur (Büyük Final) | ⚪ Bekliyor | 120 sn tek sayaç, 4→5→6→7 harf etapları, kelime bilinince duraklama kartı, elenince anında yeni kelime, final skor hesabı. |
| **M7** | Skor, Ayarlar, Ses & Titreşim | ⚪ Bekliyor | WebAudio ses motoru, `navigator.vibrate` haptics servisi, tur özet ekranları, final skor / rekor ekranı, localStorage (`be:highscore`, `be:settings`). |
| **M8** | PWA & Cilalama | ⚪ Bekliyor | Service worker çevrimdışı önbellek testi, responsive mobil dikey UI (safe area, 100dvh), 60 FPS CSS/Framer Motion animasyonları. |
| **M9** | QA & Dağıtıma Hazırlık | ⚪ Bekliyor | SPEC Bölüm 9.2 elle test maddelerinin kontrolü, production build ve Vercel/Netlify dağıtım hazırlığı. |
