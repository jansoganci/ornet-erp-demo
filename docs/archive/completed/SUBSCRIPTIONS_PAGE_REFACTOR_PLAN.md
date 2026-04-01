# Abonelikler Sayfası Refaktör Planı

> Hedef: Butonlar, KPI kartları, arama/filtre bölümünü düzenlemek. İş Emirleri ve İş Geçmişi ile tutarlı hale getirmek.

---

## 1. Butonlar

### 1.1 Kaldır
- **Excel ile toplu yükle** — Tamamen kaldırılacak (isAdmin kontrolü varsa import sayfası hâlâ `/subscriptions/import` üzerinden erişilebilir).

### 1.2 Kalan Butonlar (Masaüstü)
- **Fiyat Revizyonu** — outline, isAdmin ise (mevcut)
- **Yeni Abonelik** — primary

### 1.3 Mobil
- İş Emirleri/İş Geçmişi gibi: Başlık + Arama + Filtre butonu aynı satırda.
- Yeni Abonelik tam genişlikte alt satırda veya header’da kısaltılmış.

---

## 2. KPI Kartları

### 2.1 Sorun
- Sayılar (özellikle MRR `₺196.704,63`) kart içinde taşıyor; font çok büyük.
- `text-3xl` + uzun formatlı para birimi = sığmıyor.

### 2.2 Çözüm Önerileri

| Seçenek | Açıklama |
|---------|----------|
| **A** | Responsive font: mobilde `text-xl` veya `text-2xl`, masaüstünde `text-3xl` |
| **B** | Kısaltılmış format: MRR için `196,7K` veya `196K` (mobilde) |
| **C** | KpiCard’a `compact` prop: mobilde daha küçük padding ve font |
| **D** | `min-w-0` + `truncate` / `overflow-hidden` ile taşmayı engelle |

**Öneri:** A + D — Responsive font ve overflow kontrolü.

---

## 3. Arama ve Filtre Bölümü

### 3.1 Mobil (lg altı)
- **Header:** Başlık | Arama | Filtre butonu (İş Emirleri/İş Geçmişi pattern).
- **Filtre modalı:** Durum, Ödeme sıklığı, Yıl, Ay — hepsi ListboxSelect, **iconsuz**.
- Filtreler sadece modal’da; sayfa üzerinde filtre kartı mobilde gizli.

### 3.2 Masaüstü (lg+)
- Mevcut yapı korunur: Search + 4 ListboxSelect yan yana.
- **İkonlar kaldırılacak** — Tüm ListboxSelect’lerden `leftIcon` prop’u silinecek.

### 3.3 İkonlar
- Durum, Ödeme sıklığı, Yıl, Ay filtrelerinden `leftIcon` kaldırılacak.
- Metinle çakışma engellenecek.

### 3.4 Dropdown
- Zaten ListboxSelect kullanılıyor; native picker yok.
- İkonlar kaldırıldığında görünüm düzelecek.

---

## 4. Uygulama Adımları

| # | Görev | Dosya |
|---|-------|-------|
| 1 | "Excel ile toplu yükle" butonunu kaldır | SubscriptionsListPage.jsx |
| 2 | Mobil: header + arama + filtre butonu + filtre modalı | SubscriptionsListPage.jsx |
| 3 | Masaüstü: filtre kartını `hidden lg:block` ile sadece lg+ göster | SubscriptionsListPage.jsx |
| 4 | Tüm ListboxSelect’lerden `leftIcon` kaldır | SubscriptionsListPage.jsx |
| 5 | KpiCard: mobilde font küçültme (`text-2xl` veya compact) | KpiCard.jsx veya SubscriptionsListPage (value formatı) |
| 6 | KPI sayıları taşmayı engelle (`truncate`, `min-w-0`) | KpiCard veya SubscriptionsListPage |

---

## 5. Referans Sayfalar

- **İş Emirleri** — Mobil header + filtre modalı pattern.
- **İş Geçmişi** — Aynı pattern, iconsuz ListboxSelect.

---

## 6. Kapsam Dışı

- Tahsilat Masası tab’ı — Değişmez.
- ComplianceAlert — Değişmez.
- Tablo kolonları — Değişmez.
- Import sayfası (`/subscriptions/import`) — Sayfa durur; sadece liste sayfasındaki buton kaldırılır.
