/*
  Fuar takvimi verisi — Fuar Çiçekçim
  ------------------------------------------------------------
  Yeni fuar eklemek için listeye bir satır ekleyin:
    { id: "benzersiz-kisa-ad", name: "Fuar Adı", start: "YYYY-AA-GG", end: "YYYY-AA-GG", venue: "tuyap" | "ifm" | "both", sector: "Sektör", url: "https://..." }
  Tarihler organizatör duyurularına göre değişebilir; yayınlamadan önce tuyap.com.tr ve ifm.com.tr üzerinden kontrol edin.
  Kaynaklar: tuyap.com.tr/fuar-takvimi, ifm.com.tr/tr/ifm-fuar-takvimi (Kasım 2026)
*/
window.FUAR_TAKVIMI = {
  updatedAt: "2026-11-14",
  venues: {
    tuyap: { name: "TÜYAP Fuar ve Kongre Merkezi", short: "TÜYAP", district: "Büyükçekmece", page: "/tuyap-fuar-cicekcisi.html" },
    ifm:   { name: "İstanbul Fuar Merkezi (İFM)", short: "İFM", district: "Yeşilköy", page: "/ifm-fuar-cicekcisi.html" }
  },
  fairs: [
    { id: "silmo-istanbul-2026", name: "SILMO İstanbul Optik Fuarı", start: "2026-11-18", end: "2026-11-21", venue: "ifm", sector: "Optik" },
    { id: "istanbul-hirdavat-2026", name: "İstanbul Hırdavat Fuarı", start: "2026-11-18", end: "2026-11-21", venue: "ifm", sector: "Hırdavat" },
    { id: "avrasya-pencere-kapi-cam-2026", name: "Avrasya Pencere, Kapı ve Cam Fuarları", start: "2026-11-21", end: "2026-11-24", venue: "tuyap", sector: "Yapı", page: "/tuyap-avrasya-pencere-kapi-cam-2026.html" },
    { id: "turkchem-2026", name: "TURKCHEM Kimya Sanayi Fuarı", start: "2026-11-25", end: "2026-11-27", venue: "ifm", sector: "Kimya" },
    { id: "interdye-2026", name: "InterDye & Textile Printing Eurasia", start: "2026-11-25", end: "2026-11-27", venue: "ifm", sector: "Tekstil" },
    { id: "helal-expo-2026", name: "Helal Expo / Dünya Helal Zirvesi", start: "2026-11-25", end: "2026-11-28", venue: "ifm", sector: "Gıda & Ticaret" },
    { id: "ethexpo-2026", name: "Ethexpo Eurasia Turizm ve Sağlık Fuarı", start: "2026-11-25", end: "2026-11-28", venue: "ifm", sector: "Turizm & Sağlık" },
    { id: "iftex-2026", name: "IFTEX Filtre Endüstrisi Fuarı", start: "2026-11-26", end: "2026-11-28", venue: "ifm", sector: "Endüstri" },
    { id: "ev-charge-show-2026", name: "EV Charge Show", start: "2026-11-26", end: "2026-11-28", venue: "ifm", sector: "Enerji" },
    { id: "nadmex-2026", name: "NADMEX Afet Yönetimi Fuarı", start: "2026-12-02", end: "2026-12-04", venue: "ifm", sector: "Afet Yönetimi" },
    { id: "plast-eurasia-2026", name: "Plast Eurasia İstanbul", start: "2026-12-02", end: "2026-12-05", venue: "tuyap", sector: "Plastik", page: "/plast-eurasia-2026.html", url: "https://www.tuyap.com.tr/fuarlar/plast-eurasia-istanbul" },
    { id: "istanbul-kitap-fuari-2026", name: "İstanbul Kitap Fuarı", start: "2026-12-12", end: "2026-12-20", venue: "tuyap", sector: "Yayıncılık" },
    { id: "worldfood-istanbul-2026", name: "WorldFood İstanbul", start: "2026-12-15", end: "2026-12-18", venue: "ifm", sector: "Gıda" },
    { id: "icfe-2027", name: "ICFE Carpet & Flooring Expo", start: "2027-01-06", end: "2027-01-09", venue: "ifm", sector: "Halı & Zemin" },
    { id: "iiff-2027", name: "IIFF Uluslararası İstanbul Mobilya Fuarı", start: "2027-01-19", end: "2027-01-23", venue: "both", sector: "Mobilya" },
    { id: "atrax-2027", name: "Atrax Eğlence & Park Endüstrisi Fuarı", start: "2027-01-28", end: "2027-01-30", venue: "ifm", sector: "Eğlence" },
    { id: "karavanist-2027", name: "Karavanİst", start: "2027-02-03", end: "2027-02-07", venue: "tuyap", sector: "Karavan" },
    { id: "ifco-subat-2027", name: "IFCO İstanbul Fashion Connection", start: "2027-02-03", end: "2027-02-06", venue: "ifm", sector: "Moda" },
    { id: "emitt-2027", name: "EMITT Turizm Fuarı", start: "2027-02-04", end: "2027-02-06", venue: "ifm", sector: "Turizm" },
    { id: "texhibition-mart-2027", name: "Texhibition İstanbul", start: "2027-03-03", end: "2027-03-05", venue: "ifm", sector: "Tekstil" },
    { id: "istanbul-iplik-2027", name: "İstanbul İplik Fuarı", start: "2027-03-17", end: "2027-03-19", venue: "tuyap", sector: "Tekstil" },
    { id: "aymod-mart-2027", name: "AYMOD Ayakkabı Moda Fuarı", start: "2027-03-17", end: "2027-03-20", venue: "ifm", sector: "Ayakkabı" },
    { id: "franchise-istanbul-2027", name: "Franchise İstanbul Expo", start: "2027-03-18", end: "2027-03-21", venue: "tuyap", sector: "Franchise" },
    { id: "automechanika-2027", name: "Automechanika İstanbul", start: "2027-03-24", end: "2027-03-27", venue: "tuyap", sector: "Otomotiv" },
    { id: "eurasia-rail-2027", name: "Eurasia Rail", start: "2027-03-24", end: "2027-03-26", venue: "ifm", sector: "Raylı Sistemler" },
    { id: "istanbul-jewelry-show-mart-2027", name: "İstanbul Jewelry Show", start: "2027-03-31", end: "2027-04-03", venue: "ifm", sector: "Mücevher" },
    { id: "tube-wire-eurasia-2027", name: "Tube & wire Eurasia", start: "2027-04-07", end: "2027-04-10", venue: "tuyap", sector: "Metal" },
    { id: "solarex-2027", name: "SolarEX İstanbul", start: "2027-04-07", end: "2027-04-09", venue: "ifm", sector: "Enerji" },
    { id: "idex-2027", name: "IDEX İstanbul Dişhekimliği Fuarı", start: "2027-04-14", end: "2027-04-17", venue: "ifm", sector: "Sağlık" },
    { id: "expomed-2027", name: "Expomed Eurasia", start: "2027-04-15", end: "2027-04-18", venue: "tuyap", sector: "Sağlık" },
    { id: "wom-2027", name: "WOM – World of Mobility", start: "2027-04-15", end: "2027-04-17", venue: "tuyap", sector: "Mobilite" },
    { id: "motobike-2027", name: "Motobike İstanbul", start: "2027-04-21", end: "2027-04-24", venue: "ifm", sector: "Motosiklet" },
    { id: "yapi-fuari-2027", name: "Yapı Fuarı – Turkeybuild İstanbul", start: "2027-04-27", end: "2027-04-30", venue: "tuyap", sector: "Yapı" },
    { id: "replast-2027", name: "RePlast Eurasia", start: "2027-04-28", end: "2027-04-30", venue: "tuyap", sector: "Geri Dönüşüm" },
    { id: "idef-2027", name: "IDEF Savunma Sanayii Fuarı", start: "2027-05-03", end: "2027-05-09", venue: "ifm", sector: "Savunma" },
    { id: "asansor-istanbul-2027", name: "Asansör İstanbul Fuarı", start: "2027-05-06", end: "2027-05-09", venue: "tuyap", sector: "Asansör" },
    { id: "hometex-2027", name: "Hometex Ev Tekstili Fuarı", start: "2027-05-25", end: "2027-05-29", venue: "ifm", sector: "Ev Tekstili" },
    { id: "win-eurasia-2027", name: "WIN Eurasia", start: "2027-06-02", end: "2027-06-05", venue: "ifm", sector: "Endüstri" },
    { id: "beautyistanbul-2027", name: "BEAUTYISTANBUL", start: "2027-06-03", end: "2027-06-05", venue: "tuyap", sector: "Kozmetik" },
    { id: "foteg-2027", name: "FOTEG İstanbul", start: "2027-06-09", end: "2027-06-11", venue: "ifm", sector: "Gıda Teknolojileri" },
    { id: "foodist-2027", name: "Foodist İstanbul", start: "2027-09-01", end: "2027-09-04", venue: "tuyap", sector: "Gıda" },
    { id: "zuchex-2027", name: "Zuchex Ev ve Mutfak Eşyaları Fuarı", start: "2027-09-15", end: "2027-09-18", venue: "tuyap", sector: "Züccaciye" },
    { id: "big5-construct-2027", name: "Big 5 Construct Türkiye", start: "2027-09-15", end: "2027-09-17", venue: "ifm", sector: "Yapı" },
    { id: "woodtech-intermob-2027", name: "Woodtech & İntermob", start: "2027-10-09", end: "2027-10-13", venue: "tuyap", sector: "Ağaç & Mobilya Yan Sanayi" },
    { id: "avrasya-ambalaj-2027", name: "Avrasya Ambalaj İstanbul Fuarı", start: "2027-10-20", end: "2027-10-23", venue: "tuyap", sector: "Ambalaj" },
    { id: "isk-sodex-2027", name: "ISK-SODEX İstanbul", start: "2027-10-19", end: "2027-10-22", venue: "ifm", sector: "İklimlendirme" },
    { id: "smtech-2027", name: "SMTech Eurasia", start: "2027-11-09", end: "2027-11-12", venue: "tuyap", sector: "Sac İşleme" },
    { id: "cbme-sign-2027", name: "CBME Türkiye & SIGN İstanbul", start: "2027-11-17", end: "2027-11-20", venue: "ifm", sector: "Anne-Bebek & Reklam" },
    { id: "worldfood-2027", name: "WorldFood İstanbul", start: "2027-12-15", end: "2027-12-18", venue: "ifm", sector: "Gıda" }
  ]
};
