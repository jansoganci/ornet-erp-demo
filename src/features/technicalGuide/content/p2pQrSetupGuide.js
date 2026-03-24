/**
 * Hikvision Hik-Connect P2P — cihaz hazırlığı + mobil (QR) + iVMS-4200.
 * Port yönlendirme olmadan uçtan uca akış.
 */

export const p2pQrSetupGuide = {
  title: 'P2P (karekod) ile portsuz kurulum',
  cardSummary:
    'Kayıt cihazında platform erişimi ve doğrulama kodu, telefonda Hik-Connect ile QR okutma, aynı hesapla iVMS-4200’de izleme — modem ayarı gerekmez.',
  storyLead:
    'P2P (peer-to-peer), bu senaryoda Hikvision’un bulut sunucuları üzerinden cihaz ile telefon/bilgisayar arasında güvenli tünel kurar. Modem yeniden başlasa veya dış IP değişse bile bağlantı çoğu kurulumda ayakta kalır; modemde port açmana gerek kalmaz. Önce kayıt cihazında platformu aç, sonra telefonla karekodu okut, en son bilgisayarda aynı hesapla iVMS’e gir.\n\nSadece iVMS-4200 üzerinde cihaz ekleme adımlarını istiyorsan «Hik-Connect P2P ve iVMS-4200 ile cihaz ekleme» rehberine bak.',
  highlightAlerts: [
    {
      title: '1. Platform erişimi «Online» olmalı',
      text:
        'Cihazda Platform Access / Platform Erişimi durumu çevrimiçi değilse telefondan «Cihaz ekle» işlemi genelde başarısız olur. Önce cihazın internete çıkması (DHCP veya doğru statik IP, gateway, DNS) ve platform satırının Online görünmesi gerekir.',
    },
    {
      title: '2. Seri numarası ve doğrulama kodu şartsız',
      text:
        'Bu iki bilgi olmadan P2P bağlantısı kurulamaz. Etiketin net fotoğrafını çek veya seri no + doğrulama kodunu deftere yaz; sahada kaybolursa iş durur.',
    },
    {
      title: '3. iVMS’te P2P sekmesi gizli başlar',
      text:
        'Yazılım ilk kurulduğunda P2P sekmesi görünmeyebilir. «Add New Device Type» menüsünden «Hik-Cloud P2P Device» seçeneğini işaretleyip onaylamadan sol menüde P2P girişi ve Login ekranı gelmez.',
    },
  ],
  flowItems: [
    { label: 'Cihazda P2P' },
    { label: 'Mobil QR' },
    { label: 'iVMS-4200' },
    { label: 'İzle' },
  ],
  steps: [
    {
      title: '1. Kayıt cihazında hazırlık (en kritik)',
      rows: [
        {
          label: 'Altın kural',
          text:
            'Platform satırı «Online» değilse telefondan ekleme ilerlemez; önce IPv4/DHCP, DNS ve internet çıkışını düzelt.',
        },
        {
          label: 'Nereye',
          text:
            'Kayıt cihazının yerel arayüzüne gir (tarayıcıdan veya monitör menüsünden). Menü: Yapılandırma / Configuration → Ağ / Network → Temel Ayarlar / Basic Settings.',
        },
        {
          label: 'IPv4 / IP',
          text:
            'IPv4 sekmesinde cihazın internete çıkabilmesi için DHCP’nin açık (otomatik IP) olduğundan emin ol; sabit IP kullanıyorsan gateway ve DNS’in doğru olduğunu kontrol et.',
        },
        {
          label: 'Platform erişimi',
          text:
            '“Platform Access” / “Platform Erişimi” (veya Hik-Connect / P2P benzeri isim) sekmesine geç.',
        },
        {
          label: 'Eylem',
          text:
            '“Enable” / “Etkinleştir” kutusunu işaretle. Güçlü bir Doğrulama Kodu (Verification Code) oluştur, kaydet; müşteri/etiket defterine not al.',
        },
        {
          label: 'Teyit',
          text:
            'Durum satırında “Online” / “Çevrimiçi” veya eşdeğeri görünene kadar bekle; internet ve DNS sorununda aşağıdaki sorun giderme adımına bak.',
        },
      ],
    },
    {
      title: '2. Mobil: Hik-Connect uygulaması',
      rows: [
        {
          label: 'Altın kural',
          text:
            'Seri numarası ve doğrulama kodu olmadan P2P tamamlanmaz; etiket fotoğrafı veya yazılı not zorunlu kabul et.',
        },
        {
          label: 'Uygulama',
          text:
            'Telefona resmi “Hik-Connect” uygulamasını indir. Yeni Hik-Connect hesabı aç veya mevcut hesapla giriş yap (bilgisayarda kullanacağın hesap bu olacak).',
        },
        {
          label: 'Ekle',
          text:
            'Sağ üstteki “+” simgesine bas → “Add Device” / “Cihaz Ekle” → “Scan QR Code” / “Tarama” veya karekod ile ekleme seçeneğini seç.',
        },
        {
          label: 'Okut',
          text:
            'Kayıt cihazının yerel arayüzünde veya monitör/OSD menüsünde gösterilen QR kodu telefonla okut.',
        },
        {
          label: 'Doğrula',
          text:
            'Uygulama, az önce cihazda belirlediğin Doğrulama Kodu’nu sorar; aynı kodu gir. Cihaz listeye düşer; önizleme açılıyorsa mobil taraf tamamdır.',
        },
      ],
    },
    {
      title: '3. Bilgisayar: iVMS-4200',
      rows: [
        {
          label: 'Altın kural',
          text:
            'Önce “Add New Device Type” → “Hik-Cloud P2P Device” ile tipi aktif et; aksi halde P2P menüsü ve Login görünmez.',
        },
        {
          label: 'Yazılım',
          text:
            'iVMS-4200’ü aç. Control Panel / Kontrol Panel → “Device Management” / “Cihaz Yönetimi”.',
        },
        {
          label: 'Cihaz tipi',
          text:
            'Sol menüde “Add New Device Type” → listeden “Hik-Cloud P2P Device” işaretle → OK.',
        },
        {
          label: 'Giriş',
          text:
            'Sol menüden “Hik Cloud P2P Device” seç → üstte “Login” → telefonda kullandığın aynı Hik-Connect kullanıcı adı ve şifresini gir.',
        },
        {
          label: 'Liste',
          text:
            'Aynı hesaba mobilde eklediğin cihazlar çoğu zaman otomatik senkron görünür. Listede yoksa “Add Device” ile seri numarası ve doğrulama kodunu elle gir.',
        },
      ],
    },
    {
      title: '4. İzleme (Main View)',
      rows: [
        {
          label: 'Nereye',
          text:
            '“Main View” / “Ana görünüm” sekmesine geç. Hesaba bağlı gruplar altından kameraları sürükleyip izleme düzenine ekle.',
        },
      ],
    },
    {
      title: '5. Hızlı sorun giderme',
      rows: [
        {
          label: 'Çevrimiçi değilse',
          text:
            'Kayıt cihazı ağ menüsünde DNS’i elle ver: tercihen 8.8.8.8 ve 8.8.4.4 (veya sağlayıcı DNS’i). Kaydet; birkaç dakika sonra platform durumunu yeniden kontrol et.',
        },
        {
          label: 'Genel',
          text:
            'İnternet kablosu/Wi‑Fi, gateway, güvenlik duvarı ve cihaz saatinin doğru olduğundan emin ol. Seri no ve doğrulama kodunu yeniden kontrol et.',
        },
      ],
    },
  ],
  glossaryTitle: 'Terimler (kısa)',
  glossary: [
    {
      term: 'P2P (bu bağlamda)',
      definition:
        'Hik-Connect bulutunun cihaz ile uygulama arasında aracı olduğu bağlantı; modemde port açmayı gerektirmez.',
    },
    {
      term: 'Platform erişimi',
      definition: 'Kayıt cihazının Hikvision bulutuna kayıt olup olmayacağının ana anahtarıdır.',
    },
    {
      term: 'Doğrulama kodu',
      definition: 'Cihazı hesaba güvenle bağlayan koddur; mobil ve PC tarafında istenir.',
    },
    {
      term: 'Hik-Connect hesabı',
      definition: 'Tek hesap; hem telefonda hem iVMS’te aynı kullanıcı ile giriş yapılır.',
    },
  ],
  checklistTitle: 'Hızlı kontrol',
  checklist: [
    'Cihazda platform açık, doğrulama kodu kayıtlı, durum çevrimiçi.',
    'Telefonda Hik-Connect → QR → doğrulama kodu → önizleme çalışıyor.',
    'iVMS’te aynı hesapla giriş; cihaz listede.',
    'Main View’da izle.',
    'Online değilse DNS 8.8.8.8 / 8.8.4.4 dene.',
  ],
  securityNote:
    'Doğrulama kodunu ve hesap şifresini paylaşma. Ortak PC’de oturumu kapat. Cihazı yalnızca yetkili Hik-Connect hesabına ekle.',
};
