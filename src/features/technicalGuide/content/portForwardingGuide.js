/**
 * Türkçe teknik doküman — doğrudan kaynak dosya (i18n JSON yok).
 * Düzenleme: burayı güncelle.
 */

export const portForwardingGuide = {
  title: 'Kamera uzaktan izleme kurulumu (adım adım)',
  /** Liste kartında kısa özet (1–2 cümle) */
  cardSummary:
    'ipconfig ile modeme girme, DVR IP’sini bulma, statik IP, port yönlendirme ve dış hatla test — tıklanacak menüler ve komutlar tek sayfada.',
  storyLead:
    'Aşağıda sırasıyla: hangi tuşa basılacağı, hangi komut yazılacağı, hangi menüye gidileceği ve not alınacak değerler var. Modem ve kayıt cihazı markasına göre menü adları biraz değişebilir; aynı mantık geçerlidir.',
  flowLabels: ['Modem', 'DVR IP', 'Sabitle', 'Portlar', 'NAT', 'Test'],
  flowItems: [
    { label: 'Modem' },
    { label: 'DVR IP' },
    { label: 'Sabitle', hint: 'Statik' },
    { label: 'Portlar' },
    { label: 'NAT' },
    { label: 'Test' },
  ],
  steps: [
    {
      title: '1. Modemin adresini bul (arayüze giriş)',
      rows: [
        {
          label: 'Ne yapılacak',
          text: 'Bilgisayarda Başlat menüsüne tıkla, cmd yaz, Enter’a bas.',
        },
        { label: 'Komut', text: 'Açılan siyah pencereye: ipconfig\n(Enter)' },
        {
          label: 'Veri',
          text: '“Default Gateway” (Varsayılan Ağ Geçidi) satırındaki adresi kopyala. Örnek: 192.168.1.1',
        },
        {
          label: 'Eylem',
          text:
            'Chrome veya Safari’yi aç; adres çubuğuna bu numarayı yapıştır, Enter. Modem giriş ekranı gelmeli.\nŞifre: Çoğu modemde kullanıcı adı/şifre modemin altındaki etikette yazar; yoksa müşteriye veya servis sağlayıcıya sor.',
        },
      ],
    },
    {
      title: '2. Kayıt cihazının (DVR/NVR) IP’sini bul',
      rows: [
        {
          label: 'Nereye tıklanacak',
          text:
            'Modem arayüzünde şu isimlerden birini ara: “Bağlı Cihazlar”, “Yerel Ağ”, “DHCP İstemci Listesi”, “LAN Ayarları” (markaya göre değişir).',
        },
        {
          label: 'Ne aranacak',
          text:
            'Listede kayıt cihazını tanıtan satır: örneğin “Hikvision”, “Embedded Net DVR”, “NVR”, “CCTV”, cihazın marka/model adı.',
        },
        {
          label: 'Not al',
          text:
            'O satırdaki IP adresini bir kenara yaz. Örnek: 192.168.1.50\n(Bu, şu an modemin cihaza verdiği iç adres; bir sonraki adımda bunu sabitleyeceğiz.)',
        },
      ],
    },
    {
      title: '3. Kayıt cihazı IP’sini sabitle (kritik)',
      rows: [
        {
          label: 'Nereye yazılacak',
          text:
            'Tarayıcıda yeni sekme aç; adres çubuğuna az önce not aldığın DVR IP’sini yaz (ör. 192.168.1.50), Enter. Kayıt cihazının giriş ekranı gelir (kullanıcı/şifre genelde cihaz etiketinde veya montaj notunda).',
        },
        {
          label: 'Hangi menü (örnek sıra)',
          text:
            'Çoğu arayüzde: Yapılandırma / Configuration → Ağ / Network → Temel Ayarlar / Basic Settings → TCP/IP sekmesi.\nMarkaya göre isimler “TCP/IP”, “IPv4” vb. olabilir; “Ağ” ve “IP” kelimelerini takip et.',
        },
        {
          label: 'Eylem 1',
          text: '“DHCP” veya “Otomatik IP” kutusundaki işareti kaldır (elle IP verilecek moda geç).',
        },
        {
          label: 'Eylem 2',
          text:
            'IPv4 adresi alanına, modem ağında başka cihazla çakışmayacak bir adres yaz. Örnek: 192.168.1.150\n(Üçüncü okteti modemle uyumlu tut: 192.168.1.x)',
        },
        {
          label: 'Eylem 3',
          text:
            'Alt ağ maskesi / gateway genelde otomatik veya 255.255.255.0 ve modem IP (192.168.1.1) kalır; kayıt cihazı kılavuzuna göre doğrula.',
        },
        {
          label: 'Eylem 4',
          text:
            'Kaydet / Apply. Cihaz yeniden başlayabilir; 1–2 dakika bekle, sonra yeni IP ile (192.168.1.150) tekrar giriş dene.',
        },
      ],
    },
    {
      title: '4. Portları tespit et',
      rows: [
        {
          label: 'Hangi menü',
          text:
            'Kayıt cihazı web arayüzünde, genelde Ağ / Network bölümünün altında “Port”, “Port Ayarları”, “Bağlantı Noktaları” gibi bir sekme.',
        },
        {
          label: 'Not al',
          text:
            'Şu değerleri bir yere yaz:\n• Server port (çoğu kurulumda 8000)\n• RTSP port (çoğu kurulumda 554)\n• HTTP port (çoğu kurulumda 80)\nMarka farklı olabilir; ekranda ne yazıyorsa onu kullan.',
        },
      ],
    },
    {
      title: '5. Modemden kapıları aç (port yönlendirme / NAT)',
      rows: [
        {
          label: 'Nereye dön',
          text: 'Tarayıcıda tekrar 1. adımdaki modem IP’sine gir (ör. 192.168.1.1), giriş yap.',
        },
        {
          label: 'Hangi menü',
          text:
            '“Gelişmiş / Advanced”, “Güvenlik / Security”, “WAN” veya “NAT” altında şunlardan biri: “Port Yönlendirme”, “Port Forwarding”, “Sanal Sunucu / Virtual Server”, “NAT Yönlendirme”.',
        },
        {
          label: 'Yeni kural ekle',
          text:
            'Her port için ayrı satır veya “Ekle” ile kural oluştur. Örnek satır (Server port için):\n• Uygulama adı: Kamera-8000 (serbest)\n• Harici (dış) port: 8000\n• Dahili (iç) port: 8000\n• İç IP / hedef IP: 3. adımda sabitlediğin adres (ör. 192.168.1.150)\n• Protokol: TCP veya Both / Hepsi (UDP tek başına kalmasın)',
        },
        {
          label: 'Tekrarla',
          text:
            'Aynı iç IP’ye 554 ve gerekiyorsa 80 için de ayrı kurallar ekle (ekrandaki port numaralarıyla aynı olsun).',
        },
        { label: 'Kaydet', text: 'Tüm kuralları kaydet. Modem bazen yeniden başlar.' },
      ],
    },
    {
      title: '6. Dış IP ve test',
      rows: [
        {
          label: 'Dış IP',
          text:
            'Bilgisayarda tarayıcıda whatismyip.com veya benzeri bir siteden dış (public) IP’yi öğren; not al. Bu adres zaman zaman değişebilir (dinamik IP).',
        },
        {
          label: 'Test',
          text:
            'Telefonda Wi‑Fi’yi kapat; hücresel veriye geç (ev dışından bağlanmış gibi).\nİzleme uygulamasında (Hik-Connect vb.) sunucu adresi olarak dış IP’yi ve 5. adımda yönlendirdiğin portu (çoğu senaryoda 8000) gir.\nGörüntü geliyorsa akış tamamdır.',
        },
      ],
    },
  ],
  portsSectionTitle: 'Portlar — hızlı hatırlatma',
  ports: [
    { label: 'HTTP (web arayüzü)', note: 'Genelde 80. Ayar sayfası.', portKey: '80' },
    {
      label: 'Server / mobil uygulama',
      note: 'Genelde 8000. Uygulama çoğu zaman buradan bağlanır.',
      portKey: '8000',
    },
    { label: 'RTSP (akış)', note: 'Genelde 554. Video akışı.', portKey: '554' },
  ],
  forwardingTitle: 'Kısa özet',
  forwardingBody:
    'Dışarıdan gelen istek → modemde açtığın dış port → 3. adımda sabitlediğin iç IP ve aynı iç port. Protokol: TCP veya Both.',
  externalStaticTitle: 'Dış statik IP (opsiyonel, kalıcı adres)',
  externalStaticBody:
    'Dış IP’nin sık değişmesi, dışarıdan bağlantıyı zorlaştırır. Kalıcı ve tek adres istiyorsan internet servis sağlayıcıdan sabit (statik) dış IP hizmeti alınabilir; maliyet ve süreç sağlayıcıya göre değişir.',
  externalStaticBridge:
    'Modem ve dış IP ile uğraşmadan kurulum için Teknik Rehber’de ayrı sayfa: «Hik-Connect P2P ve iVMS-4200 ile cihaz ekleme».',
  glossaryTitle: 'Terimler (kısa)',
  glossary: [
    {
      term: 'Varsayılan ağ geçidi (Gateway)',
      definition:
        'Genelde modemin iç IP’si; ipconfig çıktısında “Default Gateway” satırı.',
    },
    {
      term: 'DHCP',
      definition: 'Modemin cihazlara otomatik IP vermesi. Kapatınca elle (statik) IP verirsin.',
    },
    {
      term: 'Port yönlendirme / NAT',
      definition:
        'Dışarıdan gelen bağlantıyı modemin iç ağdaki doğru cihaza yönlendiren kural.',
    },
    {
      term: 'Dış IP',
      definition: 'İnternette görünen adres; whatismyip ile bakılır. Bazen değişir.',
    },
  ],
  checklistTitle: 'Özet kontrol listesi',
  checklist: [
    'ipconfig → Default Gateway → tarayıcıda modem.',
    'Modemde bağlı cihazlar / DHCP listesinden DVR IP’sini bul.',
    'DVR arayüzünde DHCP kapat, statik IP ver, kaydet.',
    'DVR’da Server / RTSP / HTTP portlarını not et.',
    'Modemde port yönlendirme: TCP veya Both, hedef sabit iç IP.',
    'Dış IP + hücresel veri ile uygulamada test.',
  ],
  securityNote:
    'Sadece gereken portları aç; güçlü DVR ve modem şifreleri kullan. İş bitince gereksiz kuralları kaldırmayı düşün.',
};
