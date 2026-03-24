/**
 * Hikvision Hik-Connect P2P + iVMS-4200 — Türkçe operasyon notu.
 * Modemde port açmadan bulut üzerinden cihaz ekleme (PC yazılımı).
 */

export const hikConnectIvmsGuide = {
  title: 'Hik-Connect P2P ve iVMS-4200 ile cihaz ekleme',
  cardSummary:
    'Modemde port açmadan buluta kayıt: iVMS-4200’de Device Management, Hik-Cloud P2P, giriş ve seri no ile cihaz ekleme adımları.',
  storyLead:
    'Bu yöntem, kayıt cihazını veya IP kamerayı doğrudan dış IP ve port yönlendirme ile değil, Hikvision’un bulut (P2P) altyapısı üzerinden bağlar; ofiste veya müşteride çoğu zaman modem ayarı gerekmez. Aşağıda iVMS-4200 masaüstü yazılımında tıklanacak yerler sırayla yazılmıştır. Yazılım ve menü İngilizce olabilir; parantez içinde Türkçe karşılık verilmiştir.\n\nCihazda platform açma, telefonda karekod ve aynı hesapla tam sırayı istiyorsan Teknik Rehber’de «P2P (karekod) ile portsuz kurulum» sayfasına bak.',
  highlightAlerts: [
    {
      title: '1. iVMS’te P2P sekmesi gizli başlar',
      text:
        'Yazılım ilk kurulduğunda P2P sekmesi görünmeyebilir. «Add New Device Type» menüsünden «Hik-Cloud P2P Device» seçeneğini işaretleyip onaylamadan sol menüde P2P girişi ve Login ekranı gelmez.',
    },
    {
      title: '2. Platform erişimi «Online» olmalı',
      text:
        'Cihazda Platform Access / Platform Erişimi durumu çevrimiçi değilse buluta kayıt ve ekleme işlemleri tamamlanmaz. Önce cihazın internete çıkması (DHCP veya doğru statik IP, gateway, DNS) ve platform satırının Online görünmesi gerekir.',
    },
    {
      title: '3. Seri numarası ve doğrulama kodu şartsız',
      text:
        'Bu iki bilgi olmadan P2P bağlantısı kurulamaz. Etiketin net fotoğrafını çek veya seri no + doğrulama kodunu deftere yaz; sahada kaybolursa iş durur.',
    },
  ],
  flowItems: [
    { label: 'Kontrol paneli' },
    { label: 'Cihaz tipi' },
    { label: 'Giriş' },
    { label: 'Cihaz ekle' },
    { label: 'İzleme' },
  ],
  steps: [
    {
      title: '1. Cihaz yönetimine gir',
      rows: [
        {
          label: 'Ön koşul',
          text:
            'Geçerli bir Hik-Connect hesabı olmalı. NVR/DVR veya destekleyen IP kamerada P2P (Hik-Connect / platform erişimi) açık olmalı ve Platform Access satırı «Online» görünmeli; değilse önce ağ (DHCP/DNS, internet) ve platformu düzelt — aksi halde buluta kayıt olmaz.',
        },
        {
          label: 'Nereye',
          text:
            'iVMS-4200’ü aç. Ana ekranda Kontrol Paneli / Control Panel bölümüne gir.',
        },
        {
          label: 'Tıkla',
          text:
            '“Device Management” (Cihaz Yönetimi) menüsünü seç.',
        },
      ],
    },
    {
      title: '2. Hik-Cloud P2P cihaz tipini ekle',
      rows: [
        {
          label: 'Altın kural',
          text:
            'Bu adım atlanırsa P2P menüsü ve Login görünmez; önce «Hik-Cloud P2P Device» tipini aktif et.',
        },
        {
          label: 'Nereye',
          text: 'Sol menüde “Add New Device Type” (Yeni cihaz tipi ekle) seçeneğini bul.',
        },
        {
          label: 'İşaretle',
          text:
            'Listeden “Hik-Cloud P2P Device” kutucuğunu işaretle, “OK” ile onayla. Sol menüde bu tip görünür hale gelir.',
        },
      ],
    },
    {
      title: '3. Hik-Connect hesabıyla giriş',
      rows: [
        {
          label: 'Nereye',
          text: 'Sol menüden eklediğin “Hik Cloud P2P Device” satırını seç.',
        },
        {
          label: 'Tıkla',
          text:
            'Üstteki “Login” (Giriş) düğmesine bas; Hik-Connect kullanıcı adı ve şifreni gir. Başarılı girişten sonra bulut tarafındaki kayıtlı cihazlarla konuşmaya hazırsın.',
        },
        {
          label: 'Not',
          text:
            'Bağlantı Hikvision bulut servisine gider (ör. dev.hik-connect.com benzeri uç noktalar); bu, doğrudan cihaz IP’si yazmak yerine platform üzerinden eşleşmeyi sağlar.',
        },
      ],
    },
    {
      title: '4. Cihazı seri no ve doğrulama koduyla ekle',
      rows: [
        {
          label: 'Altın kural',
          text:
            'Seri numarası ve doğrulama kodu olmadan ekleme tamamlanmaz; etiket fotoğrafı veya yazılı not zorunlu kabul et.',
        },
        {
          label: 'Nereye',
          text: '“Add Device” (Cihaz ekle) düğmesine tıkla.',
        },
        {
          label: 'Bilgiler',
          text:
            'Açılan pencerede cihazın Seri Numarası (Serial Number) ve Doğrulama Kodu (Verification Code) alanlarını doldur. Bu bilgiler genelde cihaz etiketinde, kutuda veya yerel menü / web arayüzünde yazar; müşteriden veya sahada etiketten teyit et.',
        },
        {
          label: 'Kaydet',
          text:
            'Onayla / kaydet. Hata alırsan seri no, doğrulama kodu, internet ve cihazda P2P’nin açık olduğunu kontrol et.',
        },
      ],
    },
    {
      title: '5. İzleme (Main View)',
      rows: [
        {
          label: 'Liste',
          text:
            'Ekleme başarılıysa cihaz listede görünür.',
        },
        {
          label: 'İzle',
          text:
            '“Main View” (Ana görünüm) sekmesine geç. Hesap adına bağlı otomatik gruplar altında kameralar açılır; sürükleyip izleme düzenine ekleyebilirsin.',
        },
      ],
    },
  ],
  glossaryTitle: 'Terimler (kısa)',
  glossary: [
    {
      term: 'P2P (Peer-to-Peer)',
      definition:
        'Bu senaryoda: cihaz ile bulut/Hik-Connect arasında kurulan tünel; modemde port açma ihtiyacını çoğu kurulumda kaldırır.',
    },
    {
      term: 'iVMS-4200',
      definition: 'Hikvision’un Windows için merkezi yönetim ve izleme yazılımı.',
    },
    {
      term: 'Doğrulama kodu (Verification Code)',
      definition:
        'Cihazı hesaba güvenle bağlamak için kullanılan, cihaza özel koddur; etiket veya arayüzden alınır.',
    },
    {
      term: 'Seri numarası',
      definition: 'Cihazın benzersiz kimliği; Hik-Connect’e eklerken zorunludur.',
    },
  ],
  checklistTitle: 'Hızlı kontrol',
  checklist: [
    'Hik-Connect hesabı hazır; cihazda P2P / platform erişimi açık.',
    'iVMS-4200 → Control Panel → Device Management.',
    'Add New Device Type → Hik-Cloud P2P Device → OK.',
    'Hik Cloud P2P Device → Login → hesap bilgileri.',
    'Add Device → seri no + doğrulama kodu.',
    'Main View’da gruptan izle.',
  ],
  securityNote:
    'Hesap şifresi ve doğrulama kodunu üçüncü şahıslarla paylaşma. İş bitince ortak bilgisayarda oturumu kapat. Müşteri cihazını yalnızca yetkili hesaba ekle.',
};
