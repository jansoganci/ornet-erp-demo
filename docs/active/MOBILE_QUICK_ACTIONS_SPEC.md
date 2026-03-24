# Mobil Hızlı Aksiyon — Nihai Kararlar ve Onay Özeti

> **Kapsam:** Sadece mobil (< lg). Tablet ve web **asla** değiştirilmeyecek.
> **Hedef kullanıcı:** Admin + Muhasebeci (canWrite). Teknisyen bu yeni tab bar ve + menüsünü **görmeyecek**.

---

## 1. Tab Bar Değişiklikleri (sadece mobil, sadece canWrite için)

| Rol | Önceki Tab Bar | Yeni Tab Bar |
|-----|----------------|--------------|
| **Admin / Muhasebeci** | Ana Sayfa, Operasyon, Müşteriler, İş Emri, Teklifler, More (⋯) | Ana Sayfa, Operasyon, **+**, İş Emri |
| **Teknisyen** | Ana Sayfa, Müşteriler, İş Emri, More | **Değişmez** — aynı kalacak |

- **More (⋯) kaldırılacak** — sadece canWrite için. Teknisyen More ile hamburger benzeri menüye erişmeye devam edecek.
- **Tab bar’da 4 öğe olacak** (canWrite için): Ana Sayfa, Operasyon, +, İş Emri. 5 değil.

**Yeni `topNavRoutes` (canWrite + mobil):** `['/', '/operations', '/work-orders']`

---

## 2. + Butonu ve Hızlı Aksiyon Menüsü

- **Görünürlük:** Sadece `canWrite` (Admin + Muhasebeci). Teknisyen + butonunu görmeyecek.
- **Konum:** Tab bar ortasında (mobil).
- **Tıklanınca:** Bottom sheet menü açılır.

### Menü sırası (yukarıdan aşağıya — en alta parmağa en yakın)

| # | Aksiyon | Yol | Yetki |
|---|---------|-----|-------|
| 1 | Gelir Ekle | QuickEntry (income) | Admin + Muhasebeci |
| 2 | Gider Ekle | QuickEntry (expense) | Admin + Muhasebeci |
| 3 | Yeni SIM Kart | /sim-cards/new | canWrite |
| 4 | Yeni Müşteri | /customers/new | canWrite |
| 5 | Yeni Abonelik | /subscriptions/new | canWrite |
| 6 | Yeni Teklif | /proposals/new | canWrite |
| 7 | **Yeni İş Emri** (en altta — parmağa en yakın) | /work-orders/new | canWrite |

Her satır yetkiye göre filtrelenir; kullanıcının yetkisi yoksa listede görünmez.

---

## 3. Yetki Kuralları Özeti

| Rol | Gelir/Gider | İş Emri, Abonelik, SIM, Müşteri, Teklif | Tab bar yapısı |
|-----|-------------|----------------------------------------|----------------|
| **Admin** | Görür | Hepsi canWrite → görür | Yeni yapı (+ ile) |
| **Muhasebeci** | Görür | Hepsi canWrite → görür | Yeni yapı (+ ile) |
| **Teknisyen** | Görmez | Görmez | Eski yapı (More ile) |

- Müşteri ve İş Emri sayfaları: Admin ve Muhasebeci her şeyi görebilir; Teknisyen sınırlı.
- Gelir ve Gider: **yalnızca** Admin ve Muhasebeci (hasFinanceAccess = canWrite).

---

## 4. Mobil FAB

- **Mobil (canWrite):** Kaldırılacak — yerine tab bar’daki + kullanılacak.
- **Desktop (lg+):** Mevcut FAB kalacak.

---

## 5. Teknik Uygulama Özeti

- **`topNavRoutes`:** Role göre iki varyant:
  - `canWrite`: `['/', '/operations', '/work-orders']`
  - `!canWrite`: `['/', '/customers', '/work-orders']` (mevcut davranışa yakın)
- **More butonu:** Sadece `!canWrite` için gösterilecek.
- **+ butonu:** Sadece `canWrite` için tab bar’da render.
- **Tüm değişiklikler:** `lg:hidden` ile sadece mobil; tablet ve web dokunulmayacak.

---

## 6. Potansiyel Eksiklikler / Netleştirilmesi Gerekenler

| # | Konu | Soru / Öneri |
|---|------|--------------|
| 1 | **Teknisyen + butonu** | Teknisyen tab bar’da + görmeyecek. `canWrite` false ise + render edilmeyecek; More butonu kalacak. Bu net. |
| 2 | **Hamburger menü** | More kaldırıldığında (canWrite için) Teklifler ve Müşteriler hamburger (sol üst ≡) menüden erişilebilir. Sidebar zaten tüm nav items’ı içeriyor. Onay: Erişim korunuyor. |
| 3 | **QuickEntry modal** | Gelir/Gider için mevcut QuickEntryModal kullanılacak. Bottom sheet bu modal’ı tetikleyecek. |
| 4 | **"Uygulama adımları"** | Eğer bu ifade başka bir anlama geliyorsa (örn. onboarding, kurulum adımları) netleştirilmeli. Spec’te uygulama = mobil implementasyon adımları kabul edildi. |

---

## 7. Hata / Çelişki Kontrolü

| Kontrol | Sonuç |
|---------|-------|
| Tablet ve web dokunulmayacak | ✅ Tüm değişiklikler `lg:hidden` ile mobil-only |
| 4 menü öğesi (More yok, + dahil) | ✅ Ana Sayfa, Operasyon, +, İş Emri |
| Menü sırası parmağa yakınlık | ✅ En altta Yeni İş Emri |
| yetki filtrelemesi | ✅ Gelir/Gider = Admin+Accountant; diğerleri canWrite |
| Teknisyen bu yapıyı görmeyecek | ✅ canWrite kontrolü ile + ve yeni tab bar sadece Admin/Accountant |

---

## 8. Onay Durumu

**Üretime geçilmeden önce kullanıcı onayı bekleniyor.**

Onay verildiğinde uygulanacak dosyalar (özet):
- `src/components/layout/navItems.js` — topNavRoutes role göre
- `src/app/AppLayout.jsx` — tab bar yapısı, + butonu, More koşullu, mobil FAB kaldırma
- Yeni: Bottom sheet bileşeni (veya mevcut modal tabanlı çözüm)
