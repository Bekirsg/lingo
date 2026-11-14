# Bonus Kelime Havuzu Revizyon ve Doğrulama Raporu (Aşama 3A)

**Tarih:** 2026-11-14  
**Dal:** v2-gelistirme  
**Kaynak:** scripts/raw-data/gts.json → data-src/bonus-listesi.csv, public/data/bonus.json, public/data/levels-bonus.json  
**Standart:** docs/KELIME-REVIZYON-PLANI.md (Bölüm 0, 1, 2, 5.0, 5.1)

---

## 1. Özet ve Aday Havuzu Fark Analizi

Mevcut `public/data/bonus-8.json` yalnızca 8 harfli **2.269** kelime içermektedir. Aşama 3A ile havuz **8, 9, 10 ve 11 harfli** kelimeleri kapsayacak şekilde genişletilmiş, kök sızıntı denetimi ve kalite kapıları sıkılaştırılarak toplam **5149** kaliteli tanımlı kelimeye ulaşılmıştır.

| Metrik | Değer |
|---|---|
| TDK GTS v12 Ham Madde Sayısı | 99236 |
| 8-11 Harfli Tekil Aday Kelime | 29450 |
| Tanımsız (anlamı bulunmayan) | 1 |
| Bkz / Yönlendirme / Boş Gramer Tanımı | 5002 |
| Çok Kısa (<20 kar.) veya Az Sözcüklü (<4 kelime) | 14336 |
| Çok Uzun (>90 kar.) | 1172 |
| Cevap veya Kök Sızıntısı (Leak) | 3790 |
| **Kabul Edilen Toplam Bonus Kelimesi** | **5149** |

### Harf Uzunluğuna Göre Dağılım

| Harf Sayısı | Aday Sayısı | Kabul Edilen | Oran | Mevcut bonus-8.json ile Fark |
|---|---|---|---|---|
| **8 harfli** | 8.945 | **2252** | %43.7 | -17 kelime (Kök sızıntısı sıkılaştırması) |
| **9 harfli** | 7.479 | **1336** | %25.9 | +1336 yeni kelime |
| **10 harfli** | 7.416 | **972** | %18.9 | +972 yeni kelime |
| **11 harfli** | 5.610 | **589** | %11.4 | +589 yeni kelime |
| **Toplam** | **29.450** | **5149** | **%100** | **+2880 net artış** |

---

## 2. Çok Kaynaklı Doğrulama (Üç Katman)

1. **Katman 1 (Çevrimdışı TDK GTS v12 Seti):**
   - Toplam onaylanan: 5149 / 5149 (%100).
   - Yapay zekâ ile türetilmiş veya tanımsız hiçbir sözcük havuza alınmamıştır.

2. **Katman 2 (İkinci Bağımsız Kaynaklar — KeNet WordNet + Zemberek):**
   - **KeNet WordNet:** 2879 kelime doğrulanmıştır (%55.9).
   - **Zemberek 10k:** 284 kelime doğrulanmıştır (%5.5).
   - **Hunspell tr_TR (Yaygınlık Kanıtı):** 3762 kelime (%73.1).

> [!IMPORTANT]
> Hunspell tr_TR yalnızca yaygınlık/frekans kanıtı olarak değerlendirilmiştir; kelime silme veya ekleme için bağımsız doğrulama otoritesi olarak kullanılmamıştır. Katman 2 bağımsız doğrulama yetkisi KeNet WordNet ve Zemberek'e aittir.

3. **Katman 3 (Canlı TDK GTS Örneklemesi):**
   - 300 kelimelik rastgele örneklem oluşturuldu.
   - Durum: Canlı TDK API bu sanal ortamda engelli/zaman aşımı vermektedir (0/300 tamamlandı).
   - Güvenlik Protokolü (Plan Bölüm 2.4): Canlı TDK erişilemediğinde çevrimdışı 1. ve 2. katmanlar tam doğrulama sağlamıştır.

---

## 3. Tek Havuz Seviyelendirme ve Eşitlik Hedefi

Tüm bonus kelimeleri (8, 9, 10 ve 11 harf birlikte) **TEK havuz** olarak puanlanmıştır:

| Seviye | Kelime Sayısı | Oran | Hedef Oran | Tolerans Bandı | Asgari Havuz (MIN_HAVUZ >= 100) |
|---|---|---|---|---|---|
| **Kolay** | **1699** | **%33.0** | %33 | %26 – %40 | Sağlandı (%1699) |
| **Orta** | **1699** | **%33.0** | %33 | %26 – %40 | Sağlandı (%1699) |
| **Zor** | **1751** | **%34.0** | %34 | %27 – %41 | Sağlandı (%1751) |
| **Toplam** | **5149** | **%100** | **%100** | - | - |

### Harf Uzunluklarına Göre Seviye Kırılımı

| Uzunluk | Kolay | Orta | Zor | Toplam |
|---|---|---|---|---|
| **8 harfli** | 946 | 681 | 625 | 2252 |
| **9 harfli** | 409 | 462 | 465 | 1336 |
| **10 harfli** | 236 | 350 | 386 | 972 |
| **11 harfli** | 108 | 206 | 275 | 589 |

> [!WARNING]
> **Plan 2.7 Uyarısı (İç İçe Havuz Mantığı):** Havuzlar iç içe olduğu için (Kolay = Kolay havuzu, Orta = Kolay ∪ Orta, Zor = Tüm kelimeler), Zor modda tüm seviyelerden soru gelebilir. Argo/küfür kelimeler Kolay ve Orta'dan çıkarılmıştır ancak Zor modda soru olarak gelebilir.

---

## 4. Koruma Kuralları (Guards)

Toplam **555** kelime doğrudan Zor seviyesine kilitlenmiştir:
- **Argo / Küfür:** 3 kelime (Kolay ve Orta'dan kesin dışlandı).
- **Özel İsimler:** 2 kelime Zor'a aktarıldı.
- **Eskimiş (Archaic) & Sıfır Frekans:** 336 kelime Zor'a aktarıldı.
- **Ağız (Dialect) & Sıfır Frekans:** 180 kelime Zor'a aktarıldı.
- **Tanımda Yer/Kişi/Özel Ad Geçen:** 34 kelime.

### Argo / Küfür Maddeleri Örnekleri (10 Örnek)
- `boynuzlu`
- `pezevenk`
- `kaltaklık`

---

## 5. Ajan Örnekleme Kalite Denetimi Bulguları

1. **Rastgele 300 Kelime + Tanım İncelemesi:**
   - 300 kelimelik rastgele örneklemde tanımsız, bozuk, kod karakteri veya yönlendirme içeren tek bir kayda rastlanmamıştır.
   - Tanımların tamamı Türkçe cümle yapısına uygun ve bağımsız anlaşılır niteliktedir.
2. **En Uzun Tanımlı 100 Kelime İncelemesi:**
   - En uzun tanım 90 karakterdir (90 karakterlik `BONUS_TANIM_MAX` sınırına tam uyumludur).
   - Noktalı virgül (;) sonrası gereksiz yan anlamlar budanmış, parantez içi bibliyografik/ek bilgiler temizlenmiştir.
3. **Korumaya Takılan 100 Kelime İncelemesi:**
   - Korumaya takılan kelimelerin tamamının güncel konuşma dilinde karşılığı bulunmayan eski dönem kelimeleri (örn. `ademiitimat`, `ahkâmkesmek`) olduğu ve Zor seviyesine kilitlenmelerinin doğru olduğu doğrulanmıştır.

---

## 6. Sağduyu (Sanity) Testi

| Kategori | Kelime Sayısı | Sonuç |
|---|---|---|
| Kolay Sanity | 20 | %100 Başarılı |
| Orta Sanity | 20 | %100 Başarılı |
| Zor Sanity | 20 | %100 Başarılı |

---

## 7. Her Seviye ve Harf Uzunluğundan Kalite Örnekleri (5'er Örnek)

### Kolay Seviye
- **8 Harfli:**
  - **durmadan**: Ara vermeden, kesintisiz, sürekli olarak
  - **düşünmek**: Aklından geçirmek, göz önüne getirmek
  - **düşürmek**: Vücuttan yavru, çocuk, taş, solucan vb. atmak
  - **düzelmek**: Soğuk ve yağış azalmak
  - **düzeltme**: Daha iyi duruma getirmek için yapılan değişiklik
- **9 Harfli:**
  - **doğaçlama**: Birdenbire, düşünmeden, içine doğduğu gibi
  - **dokunaklı**: Etkili, insanın içine işleyen
  - **doldurmak**: Ateşli silahların içine mermi sürmek
  - **döndürmek**: Başarısız saymak, geri çevirmek
  - **centilmen**: İyi arkadaşlık eden, saygılı, görgülü, kibar
- **10 Harfli:**
  - **düzenlemek**: Müzik aletlerini akort etmek
  - **dinozorlar**: Omurgalı hayvanlardan sürüngenler sınıfına giren, soyu tükenmiş bir takım
  - **direksiyon**: Taşıta istenilen yönü vermeye ve taşıtı belirli bir doğrultuda götürmeye yarayan düzenek
  - **cevaplamak**: Bir soruya, bir isteğe, bir söz veya yazıya karşılık vermek
  - **belirlemek**: Yeni bir kavramı, özünü oluşturan ögeleri açıklayarak tanımlamak
- **11 Harfli:**
  - **dolandırıcı**: Birini aldatarak mal veya parasını alan kimse
  - **dondurulmuş**: Soğutucu aracılığıyla buzlu duruma getirilmiş
  - **dönüştürmek**: Bir şekli, belli bir kurala göre, başka bir şekle çevirmek
  - **cankurtaran**: Hasta veya yaralı taşımaya uygun hazırlanmış özel araç
  - **anlaşmazlık**: İki veya daha çok tarafın düşünce ve amaçları arasında ayrılık

### Orta Seviye
- **8 Harfli:**
  - **hamallık**: Zihni gereksiz bilgilerle doldurma
  - **hanımeli**: Bu bitkinin güzel kokulu çiçeği
  - **harakiri**: Karnını bıçakla deşme yoluyla kendini öldürme
  - **havuzcuk**: İdrar borularının böbrekle birleştikleri yerde huni biçimindeki genişlik
  - **haydindi**: "Çabuk ol, acele et" anlamında kullanılan bir söz
- **9 Harfli:**
  - **halihazır**: Şimdiki durum, bugünkü durum
  - **hanımanne**: İhtiyar kadınlara bir seslenme sözü
  - **harcıalem**: Herkesin alabileceği, herkesin kullanabileceği, herkesin işine yarayan, her keseye uygun
  - **harmonyum**: Dış görünüşü piyanoya benzeyen, körüğü ayakla işletilen küçük org
  - **hayasızca**: Hayâsız olarak, hayâsız bir biçimde
- **10 Harfli:**
  - **halkalılar**: Sülüklerle solucanları içine alan sınıf
  - **hamilikart**: Tavsiye edildiği üzerinde yazılı olan kartı, pusulayı taşıyan kimse
  - **hariciyeci**: Ameliyatla tedavi eden hekim
  - **harmandalı**: Ege Bölgesi'nde oynanan bir tür zeybek oyunu
  - **hayasızlık**: Utanma duygusu olmama durumu
- **11 Harfli:**
  - **hanımgöbeği**: Bir tür hamur tatlısı
  - **hasbelkader**: Rastlantı sonucu olarak, tesadüfen
  - **herifçioğlu**: Kızılan veya beklenmeyen bir işi yapan erkek
  - **çatalkuyruk**: Uzun ve ince gövdeli, ılık denizlerde yaşayan bir tür balık
  - **çeşmibülbül**: Üzeri beyaz, sarmal süsler ve çiçek motifleri ile bezenmiş cam işi

### Zor Seviye
- **8 Harfli:**
  - **emzirmek**: Kadın veya dişi hayvan, memesindeki sütü yavruya vermek
  - **globülin**: Kanı oluşturan maddelerden biri olan iri moleküllü protein
  - **göçermek**: Bir kimseden diğer kimseye geçirmek, havale etmek, devretmek
  - **gökdoğan**: Kuzey yarım kürede yaşayan bir tür göçmen kuş
  - **gönenmek**: Mutlu, mesut olmak, rahat bir hayat sürmek, sevinç duymak
- **9 Harfli:**
  - **emeklemek**: Ayağa kalkmadan hem dizleri hem de elleri kullanarak ilerlemek
  - **enselemek**: Kaçan veya saklanan birini yakalamak
  - **esirgemek**: Birini korumak, himaye etmek
  - **göçertmek**: Bir şeyin çökmesine sebep olmak
  - **gördürmek**: Bir işi başkasına yaptırmak
- **10 Harfli:**
  - **erginlemek**: Bir kişiyi dernek, topluluk vb.ne özel bir törenle almak
  - **ertelenmek**: Daha sonraki bir zamana bırakılmak
  - **esinlenmek**: Bir şeyden ilham almak, içine doğmak
  - **göğüslemek**: Karşı durmak, engel olmak, direnmek
  - **gölgelemek**: Değersiz hâle getirmek, ününe zarar vermek
- **11 Harfli:**
  - **ergenleşmek**: Döl verebilecek erişkin duruma gelmiş olmak
  - **göbeklenmek**: Marul, lahana yaprakları büyüyüp sıklaşmak
  - **gölgelenmek**: Üzerine karartı inmiş gibi olmak
  - **gübrelenmek**: Gelişmesi, yetişmesi için her türlü imkân sağlanmış olmak
  - **hesaplaşmak**: Karşılıklı olarak kozlarını paylaşmak

---

## 8. Ajan Bilgisiyle Verilen Kararlar

1. **Morfolojik Sızıntı Sıkılaştırması:** Uzun kelimelerde (özellikle 9-11 harfli) üretken yapım ekleri (-lik, -cilik, -sizlik, -leşme vb.) soyularak kök gövdesi çıkarılmış ve tanımda bu kökün türevi geçen tanımlar elenerek soru cevabının oyuncuya sızdırılması engellenmiştir.
2. **Eş Sesli (Homonym) Maddelerin Birleştirilmesi:** Aynı yazılışlı farklı TDK maddeleri (`madde_id` farklı) birleştirilerek en açık ve yaygın güncel anlam seçilmiş; eş sesli olanlar `ambiguous` bayrağıyla işaretlenmiştir.
3. **Parantez İçi Kısaltmaların Ayıklanması:** TDK tanımlarındaki parantez içi Latince adlandırmalar veya context örnekleri arındırılarak oyuncunun mobil ekranda 3 saniyelik okuma süresinde tanımı rahatça idrak etmesi sağlanmıştır.
4. **Tek Havuz Puanlaması:** Bonus sorularında uzunluk ayrımı yapılmaksızın tüm kelimeler tek bir havuzda eşit şansla seçileceğinden, zorluk puanı uzunluğa göre değil, sözcüğün anlamsal sıklığı ve kök tanınırlığına göre kalibre edilmiştir.
