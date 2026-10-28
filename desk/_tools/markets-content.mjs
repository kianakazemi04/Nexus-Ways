// Market detail pages copy (EN/TR/AR) and the per-market source list, built by build.mjs. The Markets index and the
// Intelligence page copy are in pages-content.mjs. PUB-2 (owner instruction 28 Oct 2026): public
// pages are decision-first and carry no market figures, gate counts, research notes, legal-review topics or internal
// method names. Market research, statistics and the gate result are used in the private store and in consultation only;
// the pages name the sources the research relies on. Market status comes from the public market record alone.

// Sources the research relies on, per market (official publishers and registries named in MG-1). Names only: no figure,
// link or claim is published from them.
export const SOURCES = {
  en: {
    'MKT-IST': ['Turkish Statistical Institute (TÜİK)', 'Central Bank of the Republic of Türkiye (TCMB)', 'General Directorate of Land Registry and Cadastre (TKGM)', 'District municipalities (building permits)'],
    'MKT-DXB': ['Dubai Land Department (DLD) and RERA', 'Dubai Pulse (DLD transaction data)', 'Dubai Statistics Center', 'Central Bank of the UAE (CBUAE)'],
    'MKT-AUH': ['Abu Dhabi Real Estate Centre (ADREC)', 'Department of Municipalities and Transport (DMT)', 'Statistics Centre – Abu Dhabi (SCAD)', 'Central Bank of the UAE (CBUAE)'],
    common: 'Market reports from established research firms and the financial press, used to cross-check — never as the only source.'
  },
  tr: {
    'MKT-IST': ['Türkiye İstatistik Kurumu (TÜİK)', 'Türkiye Cumhuriyet Merkez Bankası (TCMB)', 'Tapu ve Kadastro Genel Müdürlüğü (TKGM)', 'İlçe belediyeleri (yapı ruhsatları)'],
    'MKT-DXB': ['Dubai Arazi Dairesi (DLD) ve RERA', 'Dubai Pulse (DLD işlem verileri)', 'Dubai İstatistik Merkezi', 'BAE Merkez Bankası (CBUAE)'],
    'MKT-AUH': ['Abu Dabi Gayrimenkul Merkezi (ADREC)', 'Belediyeler ve Ulaştırma Dairesi (DMT)', 'Abu Dabi İstatistik Merkezi (SCAD)', 'BAE Merkez Bankası (CBUAE)'],
    common: 'Köklü araştırma şirketlerinin pazar raporları ve ekonomi basını; yalnızca çapraz kontrol için, hiçbir zaman tek kaynak olarak kullanılmaz.'
  },
  ar: {
    'MKT-IST': ['معهد الإحصاء التركي (TÜİK)', 'البنك المركزي لجمهورية تركيا (TCMB)', 'المديرية العامة للطابو والمساحة (TKGM)', 'بلديات الأحياء (رخص البناء)'],
    'MKT-DXB': ['دائرة الأراضي والأملاك في دبي ومؤسسة التنظيم العقاري (ريرا)', 'دبي بالس (بيانات معاملات دائرة الأراضي)', 'مركز دبي للإحصاء', 'مصرف الإمارات العربية المتحدة المركزي'],
    'MKT-AUH': ['مركز أبوظبي العقاري', 'دائرة البلديات والنقل', 'مركز الإحصاء – أبوظبي', 'مصرف الإمارات العربية المتحدة المركزي'],
    common: 'تقارير السوق الصادرة عن شركات أبحاث راسخة والصحافة المالية، للمقارنة والتحقق فقط — وليست مصدراً وحيداً أبداً.'
  }
};

export const MKC = {
  en: {
    idxLab: 'Coverage', idxH: 'Three markets, one standard',
    idxP: 'Each market is researched separately and opens to new opportunities on its own, once our checks for that market are complete.',
    procLab: 'Process', procH: 'How we prepare a market',
    p1t: 'Official and market data', p1p: 'We follow the official statistics and registries of each market, compare sources and keep our picture of the market current.',
    p2t: 'Location research', p2p: 'Districts and communities are researched for location, supply and demand before projects there are considered.',
    p3t: 'Buying rules', p3p: 'We summarise the official rules for foreign buyers in each market and link to the government source.',
    p4t: 'Project permission', p4p: 'Each project is presented with the written permission of its sales office.',
    chkLab: 'Before a project is shown', chkH: 'What we check for every project here',
    chkP: 'In addition to the developer, the project facts, the material risks and the image rights:',
    reqPerm: 'Written permission from the project’s sales office for the information and images we show.',
    areaLab: 'Areas', areaH: 'In our research scope',
    areaP: 'Districts and communities we are researching in this market. This is research scope, not a recommendation or a ranking.',
    areaNone: 'The areas for this market are being selected.',
    srcLab: 'Sources', srcH: 'Sources we use',
    srcP: 'We compare and refresh market data against these official publishers and registries. Headline figures are shown above with their source; detailed figures are discussed in consultation.',
    ctaH: 'Considering this market?', ctaP: 'Tell us your objectives and timeframe. We will share our current view of the market and the projects that fit, privately.', ctaBtn: 'Request a consultation',
    admin: { DISTRICT: 'District', SUB_DISTRICT: 'Neighbourhood', COMMUNITY: 'Community' },
    reqs: {
      'IST-TITLE-STATUS': 'Title status in the land registry (TKGM)', 'IST-BUILDING-PERMIT': 'Building permit, for projects not yet completed',
      'DXB-PROJECT-REGISTRATION': 'Project registration and status with the Dubai Land Department', 'DXB-ESCROW-ACCOUNT': 'Escrow account, for off-plan projects',
      'AUH-PROJECT-REGISTRATION': 'Project registration and status with ADREC', 'AUH-ESCROW-ACCOUNT': 'Escrow arrangements, for off-plan projects'
    }
  },
  tr: {
    idxLab: 'Kapsam', idxH: 'Üç pazar, tek standart',
    idxP: 'Her pazar ayrı araştırılır ve o pazara ilişkin kontrollerimiz tamamlandığında yeni fırsatlara kendi başına açılır.',
    procLab: 'Süreç', procH: 'Bir pazarı nasıl hazırlıyoruz',
    p1t: 'Resmî veriler ve pazar verileri', p1p: 'Her pazarın resmî istatistiklerini ve kayıtlarını izler, kaynakları karşılaştırır ve pazar görünümümüzü güncel tutarız.',
    p2t: 'Konum araştırması', p2p: 'İlçe ve bölgeler, oradaki projeler değerlendirilmeden önce konum, arz ve talep açısından araştırılır.',
    p3t: 'Satın alma kuralları', p3p: 'Her pazarda yabancı alıcılar için resmî kuralları özetler ve kamu kaynağına bağlantı veririz.',
    p4t: 'Proje izni', p4p: 'Her proje, satış ofisinin yazılı izniyle sunulur.',
    chkLab: 'Bir proje gösterilmeden önce', chkH: 'Buradaki her proje için kontrol ettiklerimiz',
    chkP: 'Geliştirici, proje bilgileri, önemli riskler ve görsel haklarına ek olarak:',
    reqPerm: 'Gösterdiğimiz bilgi ve görseller için projenin satış ofisinden yazılı izin.',
    areaLab: 'Bölgeler', areaH: 'Araştırma kapsamımızda',
    areaP: 'Bu pazarda araştırdığımız ilçe ve bölgeler. Bu bir araştırma kapsamıdır; öneri veya sıralama değildir.',
    areaNone: 'Bu pazar için bölgeler belirleniyor.',
    srcLab: 'Kaynaklar', srcH: 'Kullandığımız kaynaklar',
    srcP: 'Pazar verilerini bu resmî yayıncı ve kayıtlarla karşılaştırır ve güncelleriz. Öne çıkan rakamlar kaynaklarıyla birlikte yukarıda gösterilir; ayrıntılı rakamlar görüşmede paylaşılır.',
    ctaH: 'Bu pazarı mı düşünüyorsunuz?', ctaP: 'Hedeflerinizi ve zaman planınızı paylaşın. Pazara ilişkin güncel görüşümüzü ve uygun projeleri size özel olarak iletelim.', ctaBtn: 'Görüşme talep edin',
    admin: { DISTRICT: 'İlçe', SUB_DISTRICT: 'Mahalle', COMMUNITY: 'Bölge' },
    reqs: {
      'IST-TITLE-STATUS': 'Tapu kaydındaki durum (TKGM)', 'IST-BUILDING-PERMIT': 'Tamamlanmamış projeler için yapı ruhsatı',
      'DXB-PROJECT-REGISTRATION': 'Dubai Arazi Dairesi’nde proje kaydı ve durumu', 'DXB-ESCROW-ACCOUNT': 'Off-plan projeler için emanet hesabı',
      'AUH-PROJECT-REGISTRATION': 'ADREC’de proje kaydı ve durumu', 'AUH-ESCROW-ACCOUNT': 'Off-plan projeler için emanet düzenlemesi'
    }
  },
  ar: {
    idxLab: 'التغطية', idxH: 'ثلاثة أسواق ومعيار واحد',
    idxP: 'يُبحث كل سوق على حدة، ويُفتح للفرص الجديدة وحده بعد اكتمال فحوصنا الخاصة بذلك السوق.',
    procLab: 'المنهجية', procH: 'كيف نُعدّ السوق',
    p1t: 'البيانات الرسمية وبيانات السوق', p1p: 'نتابع الإحصاءات والسجلات الرسمية لكل سوق، ونقارن المصادر، ونحافظ على صورة محدّثة للسوق.',
    p2t: 'بحث المواقع', p2p: 'تُبحث الأحياء والمجتمعات من حيث الموقع والعرض والطلب قبل النظر في المشاريع فيها.',
    p3t: 'قواعد الشراء', p3p: 'نلخّص القواعد الرسمية للمشترين الأجانب في كل سوق مع رابط المصدر الحكومي.',
    p4t: 'إذن المشروع', p4p: 'يُعرض كل مشروع بإذن كتابي من مكتب مبيعاته.',
    chkLab: 'قبل عرض أي مشروع', chkH: 'ما نتحقق منه لكل مشروع هنا',
    chkP: 'إضافةً إلى المطوّر ومعلومات المشروع والمخاطر الجوهرية وحقوق الصور:',
    reqPerm: 'إذن كتابي من مكتب مبيعات المشروع للمعلومات والصور التي نعرضها.',
    areaLab: 'المناطق', areaH: 'ضمن نطاق بحثنا',
    areaP: 'الأحياء والمجتمعات التي نبحثها في هذا السوق. هذا نطاق بحث، وليس توصية ولا تصنيفاً.',
    areaNone: 'يجري اختيار مناطق هذا السوق.',
    srcLab: 'المصادر', srcH: 'المصادر التي نعتمد عليها',
    srcP: 'نقارن بيانات السوق ونحدّثها استناداً إلى هذه الجهات الرسمية والسجلات. تظهر أبرز الأرقام أعلاه مع مصادرها، وتُناقش الأرقام التفصيلية في الاستشارة.',
    ctaH: 'هل تفكر في هذا السوق؟', ctaP: 'أخبرنا بأهدافك وإطارك الزمني، وسنشاركك رؤيتنا الحالية للسوق والمشاريع المناسبة بشكل خاص.', ctaBtn: 'اطلب استشارة',
    admin: { DISTRICT: 'حي', SUB_DISTRICT: 'حي فرعي', COMMUNITY: 'مجتمع' },
    reqs: {
      'IST-TITLE-STATUS': 'حالة الملكية في سجل الطابو (TKGM)', 'IST-BUILDING-PERMIT': 'رخصة البناء، للمشاريع غير المكتملة',
      'DXB-PROJECT-REGISTRATION': 'تسجيل المشروع وحالته لدى دائرة الأراضي والأملاك', 'DXB-ESCROW-ACCOUNT': 'حساب الضمان، للمشاريع على الخارطة',
      'AUH-PROJECT-REGISTRATION': 'تسجيل المشروع وحالته لدى مركز أبوظبي العقاري', 'AUH-ESCROW-ACCOUNT': 'ترتيبات الضمان، للمشاريع على الخارطة'
    }
  }
};

// Requirements and areas of one market, from the gate configuration and the public district records only.
export function marketCoverage(cfg, m, data) {
  const mc = cfg && cfg.markets && cfg.markets[m.id];
  const dists = data.districts.filter(d => d.market_id === m.id).sort((a, b) => a.name.localeCompare(b.name));
  return { dists, reqs: mc ? mc.publication.opportunity_requirements : [] };
}

// Market overview (owner instruction 28 Oct 2026): headline figures from the latest official releases, for orientation
// only. Counts and percentage changes; no prices, rents, yields or currency amounts (D10). Every figure carries its
// publisher, release, period, release date and link; values were read on the official site on `checked`.
// Research record: Claude project nexus-desk/private/market-overview-2026-10-29.md.
export const OVERVIEW_CHECKED = '2026-10-29';
export const OVERVIEW = {
  'MKT-IST': [
    { id: 'ist-sales-2025', value: 310453, kind: 'n', period: { en: '2025', tr: '2025', ar: '2025' },
      label: { en: 'Home sales in Istanbul', tr: 'İstanbul’da konut satışı', ar: 'مبيعات المساكن في إسطنبول' },
      note: { en: 'Of which 81,855 first-hand (new) homes.', tr: 'Bunun 81.855’i ilk el (yeni) konut.', ar: 'منها 81,855 مسكناً جديداً (البيع الأول).' },
      src: 'TÜİK', release: '2026-10-16', url: 'https://veriportali.tuik.gov.tr/tr/press/58347' },
    { id: 'ist-sales-sep26', value: 22212, kind: 'n', period: { en: 'September 2026', tr: 'Eylül 2026', ar: 'سبتمبر 2026' },
      label: { en: 'Home sales in one month', tr: 'Bir ayda konut satışı', ar: 'مبيعات المساكن في شهر واحد' },
      note: { en: '−16.9% on September 2025; first-hand sales −1.0%.', tr: 'Eylül 2025’e göre %16,9 düşüş; ilk el satışlarda %1,0 düşüş.', ar: 'بانخفاض 16.9% عن سبتمبر 2025؛ ومبيعات البيع الأول بانخفاض 1.0%.' },
      src: 'TÜİK', release: '2026-10-16', url: 'https://veriportali.tuik.gov.tr/tr/press/58347' },
    { id: 'ist-foreign-2025', value: 9101, kind: 'n', period: { en: '2025', tr: '2025', ar: '2025' },
      label: { en: 'Homes sold to foreign buyers', tr: 'Yabancılara satılan konut', ar: 'مساكن بيعت لمشترين أجانب' },
      note: { en: '817 in September 2026.', tr: 'Eylül 2026’da 817.', ar: '817 في سبتمبر 2026.' },
      src: 'TÜİK', release: '2026-10-16', url: 'https://veriportali.tuik.gov.tr/tr/press/58347' },
    { id: 'ist-hpi-sep26', value: 26.8, kind: 'pct', period: { en: 'Year to September 2026', tr: 'Eylül 2026, yıllık', ar: 'سنوياً حتى سبتمبر 2026' },
      label: { en: 'House price index, annual change', tr: 'Konut fiyat endeksi, yıllık değişim', ar: 'مؤشر أسعار المساكن، التغير السنوي' },
      note: { en: 'Nominal change for Istanbul. For Türkiye as a whole, prices fell 5.7% in real (inflation-adjusted) terms.', tr: 'İstanbul için nominal değişim. Türkiye genelinde fiyatlar reel olarak (enflasyondan arındırılmış) %5,7 geriledi.', ar: 'تغيّر اسمي لإسطنبول. وعلى مستوى تركيا تراجعت الأسعار بالقيمة الحقيقية (بعد احتساب التضخم) بنسبة 5.7%.' },
      src: 'TCMB', release: null, // monthly report 'Konut Fiyat Endeksi, Eylül 2026'; release date not recorded
      url: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Reel+Sektor+Istatistikleri/Konut+Fiyat+Endeksi/' }
  ],
  'MKT-DXB': [
    { id: 'dxb-tx-q1', value: 60303, kind: 'n', period: { en: 'Q1 2026', tr: '2026 1. çeyrek', ar: 'الربع الأول 2026' },
      label: { en: 'Real estate transactions', tr: 'Gayrimenkul işlemi', ar: 'المعاملات العقارية' },
      note: { en: '+6% on the first quarter of 2025.', tr: '2025’in ilk çeyreğine göre %6 artış.', ar: 'بزيادة 6% عن الربع الأول من 2025.' },
      src: 'DLD', release: '2026-04-09', url: 'https://dubailand.gov.ae/en/news-media/dubai-s-real-estate-transactions-surge-31-to-reach-aed-252-billion-in-q1-2026/' },
    { id: 'dxb-investors-q1', value: 48448, kind: 'n', period: { en: 'Q1 2026', tr: '2026 1. çeyrek', ar: 'الربع الأول 2026' },
      label: { en: 'Investors in the quarter', tr: 'Çeyrekteki yatırımcı', ar: 'المستثمرون خلال الربع' },
      note: { en: '+8% year on year; 29,312 of them new investors (+14%).', tr: 'Yıllık %8 artış; bunların 29.312’si yeni yatırımcı (%14 artış).', ar: 'بزيادة 8% على أساس سنوي؛ منهم 29,312 مستثمراً جديداً (بزيادة 14%).' },
      src: 'DLD', release: '2026-04-09', url: 'https://dubailand.gov.ae/en/news-media/dubai-s-real-estate-transactions-surge-31-to-reach-aed-252-billion-in-q1-2026/' },
    { id: 'dxb-foreign-q1', value: 48445, kind: 'n', period: { en: 'Q1 2026', tr: '2026 1. çeyrek', ar: 'الربع الأول 2026' },
      label: { en: 'Investments by foreign investors', tr: 'Yabancı yatırımcı yatırımı', ar: 'استثمارات المستثمرين الأجانب' },
      note: { en: '+11% year on year.', tr: 'Yıllık %11 artış.', ar: 'بزيادة 11% على أساس سنوي.' },
      src: 'DLD', release: '2026-04-09', url: 'https://dubailand.gov.ae/en/news-media/dubai-s-real-estate-transactions-surge-31-to-reach-aed-252-billion-in-q1-2026/' }
  ],
  'MKT-AUH': [
    { id: 'auh-sales-h1', value: 16838, kind: 'n', period: { en: 'H1 2026', tr: '2026 ilk yarı', ar: 'النصف الأول 2026' },
      label: { en: 'Sales transactions', tr: 'Satış işlemi', ar: 'معاملات البيع' },
      note: { en: 'Total transaction volume +61.7% on the first half of 2025.', tr: 'Toplam işlem hacmi 2025’in ilk yarısına göre %61,7 arttı.', ar: 'ارتفع إجمالي حجم المعاملات 61.7% عن النصف الأول من 2025.' },
      src: 'ADREC', release: '2026-07-17', url: 'https://www.mediaoffice.abudhabi/en/economy/abu-dhabi-real-estate-centre-records-aed117bn-in-real-estate-transactions-in-h1-2026/' },
    { id: 'auh-nat-h1', value: 116, kind: 'n', period: { en: 'H1 2026', tr: '2026 ilk yarı', ar: 'النصف الأول 2026' },
      label: { en: 'Nationalities of non-resident investors', tr: 'Yurt dışında yerleşik yatırımcıların uyruk sayısı', ar: 'جنسيات المستثمرين غير المقيمين' },
      note: { en: 'Up from 82 a year earlier.', tr: 'Bir yıl önce 82 idi.', ar: 'مقارنة بـ 82 قبل عام.' },
      src: 'ADREC', release: '2026-07-17', url: 'https://www.mediaoffice.abudhabi/en/economy/abu-dhabi-real-estate-centre-records-aed117bn-in-real-estate-transactions-in-h1-2026/' },
    { id: 'auh-zones-h1', value: 50, kind: 'n', period: { en: 'Mid-2026', tr: '2026 ortası', ar: 'منتصف 2026' },
      label: { en: 'Investment zones open to all nationalities', tr: 'Tüm uyruklara açık yatırım bölgesi', ar: 'مناطق استثمارية مفتوحة لجميع الجنسيات' },
      note: { en: '8 new zones approved in the first half; 28 new projects registered (+16%).', tr: 'İlk yarıda 8 yeni bölge onaylandı; 28 yeni proje kaydedildi (%16 artış).', ar: 'اعتُمدت 8 مناطق جديدة في النصف الأول؛ وسُجّل 28 مشروعاً جديداً (بزيادة 16%).' },
      src: 'ADREC', release: '2026-07-17', url: 'https://www.mediaoffice.abudhabi/en/economy/abu-dhabi-real-estate-centre-records-aed117bn-in-real-estate-transactions-in-h1-2026/' }
  ]
};

export const PUBLISHERS = {
  en: { 'TÜİK': 'Turkish Statistical Institute (TÜİK)', TCMB: 'Central Bank of the Republic of Türkiye', DLD: 'Dubai Land Department', ADREC: 'Abu Dhabi Real Estate Centre, via the Abu Dhabi Media Office' },
  tr: { 'TÜİK': 'Türkiye İstatistik Kurumu (TÜİK)', TCMB: 'Türkiye Cumhuriyet Merkez Bankası', DLD: 'Dubai Arazi Dairesi', ADREC: 'Abu Dabi Gayrimenkul Merkezi (Abu Dabi Medya Ofisi aracılığıyla)' },
  ar: { 'TÜİK': 'معهد الإحصاء التركي', TCMB: 'البنك المركزي لجمهورية تركيا', DLD: 'دائرة الأراضي والأملاك في دبي', ADREC: 'مركز أبوظبي العقاري، عبر المكتب الإعلامي لأبوظبي' }
};

// Rules for foreign buyers: a short summary of official government guidance, with the official link.
export const RULES = {
  'MKT-IST': { url: 'https://www.yourkeyturkiye.gov.tr/sss', src: { en: 'Land Registry and Cadastre (TKGM) — Your Key Türkiye', tr: 'Tapu ve Kadastro Genel Müdürlüğü (TKGM) — Your Key Türkiye', ar: 'المديرية العامة للطابو والمساحة — Your Key Türkiye' },
    en: ['Citizens of 185 countries may buy property in Türkiye (Land Registry Law, Article 35). Eligibility is confirmed by nationality at the land registry.',
      'The purchase needs a passport, an identity declaration form, a foreign-currency purchase certificate from a Turkish bank for the sale value and compulsory earthquake insurance; a sworn translator if the buyer does not speak Turkish.',
      'The purchase can be completed from abroad with an apostilled power of attorney.',
      'Military and security zones are recorded in the land register and checked at the time of the transaction.',
      'Turkish citizenship through property requires a valuation of at least USD 400,000, under separate conditions.'],
    tr: ['185 ülkenin vatandaşları Türkiye’de taşınmaz edinebilir (Tapu Kanunu, 35. madde). Uygunluk, tapu müdürlüğünde uyruğa göre teyit edilir.',
      'Satın alma için pasaport, kimlik bilgileri beyan formu, satış bedeli kadar Türk bankasından döviz alım belgesi ve zorunlu deprem sigortası gerekir; alıcı Türkçe bilmiyorsa yeminli tercüman.',
      'Satın alma, apostilli vekâletname ile yurt dışından tamamlanabilir.',
      'Askerî yasak ve güvenlik bölgeleri tapu siciline işlenmiştir ve işlem sırasında kontrol edilir.',
      'Taşınmaz yoluyla Türk vatandaşlığı, ayrı koşullarla en az 400.000 ABD doları değerleme gerektirir.'],
    ar: ['يحق لمواطني 185 دولة شراء العقارات في تركيا (قانون الطابو، المادة 35)، ويُتحقق من الأهلية حسب الجنسية لدى مديرية الطابو.',
      'يتطلب الشراء جواز السفر، واستمارة بيان الهوية، وشهادة شراء عملة أجنبية من بنك تركي بقيمة البيع، وتأمين الزلازل الإلزامي، ومترجماً محلَّفاً إذا كان المشتري لا يتحدث التركية.',
      'يمكن إتمام الشراء من الخارج بوكالة مصدَّقة بالأبوستيل.',
      'المناطق العسكرية والأمنية مسجّلة في السجل العقاري ويُتحقق منها عند المعاملة.',
      'تتطلب الجنسية التركية عبر العقار تقييماً لا يقل عن 400,000 دولار أمريكي، وفق شروط مستقلة.'] },
  'MKT-DXB': { url: 'https://u.ae/en/information-and-services/moving-to-the-uae/expatriates-buying-a-property-in-the-uae', src: { en: 'The Official Portal of the UAE Government (u.ae)', tr: 'BAE Hükümeti Resmî Portalı (u.ae)', ar: 'البوابة الرسمية لحكومة الإمارات (u.ae)' },
    en: ['Foreigners, whether or not they live in the UAE, may own property in areas designated as freehold (Regulation No. 3 of 2006).',
      'Rights can be freehold ownership, or usufruct or leasehold for up to 99 years.',
      'Title deeds are issued by the Dubai Land Department. There is no age limit for owning property.',
      'Property investors with a minimum investment of AED 2 million may apply for a five-year UAE residence visa (Golden Visa).'],
    tr: ['Yabancılar, BAE’de yaşasın ya da yaşamasın, serbest mülkiyet (freehold) olarak belirlenen bölgelerde mülk sahibi olabilir (2006 tarihli 3 sayılı Yönetmelik).',
      'Haklar serbest mülkiyet ya da 99 yıla kadar intifa veya kira hakkı şeklinde olabilir.',
      'Tapular Dubai Arazi Dairesi tarafından düzenlenir. Mülk sahibi olmak için yaş sınırı yoktur.',
      'En az 2 milyon AED yatırım yapan gayrimenkul yatırımcıları beş yıllık BAE oturum vizesine (Golden Visa) başvurabilir.'],
    ar: ['يحق للأجانب، سواء أكانوا مقيمين في الإمارات أم لا، التملّك في المناطق المحددة للتملك الحر (اللائحة رقم 3 لسنة 2006).',
      'قد تكون الحقوق تملكاً حراً أو حق انتفاع أو إيجاراً لمدة تصل إلى 99 عاماً.',
      'تصدر سندات الملكية عن دائرة الأراضي والأملاك في دبي، ولا يوجد حد عمري لتملّك العقار.',
      'يمكن للمستثمرين العقاريين باستثمار لا يقل عن مليوني درهم التقدّم لتأشيرة إقامة إماراتية لمدة خمس سنوات (الإقامة الذهبية).'] },
  'MKT-AUH': { url: 'https://u.ae/en/information-and-services/moving-to-the-uae/expatriates-buying-a-property-in-the-uae', src: { en: 'The Official Portal of the UAE Government (u.ae)', tr: 'BAE Hükümeti Resmî Portalı (u.ae)', ar: 'البوابة الرسمية لحكومة الإمارات (u.ae)' },
    en: ['Foreigners may own property in designated investment zones (Law No. 19 of 2005, amended in 2019). There were 50 zones open to all nationalities in mid-2026.',
      'Other forms of rights include musataha (50 years, renewable), usufruct (up to 99 years) and long lease (25 years or more).',
      'Projects are registered with the Abu Dhabi Real Estate Centre (ADREC).',
      'Property investors with a minimum investment of AED 2 million may apply for a five-year UAE residence visa (Golden Visa).'],
    tr: ['Yabancılar belirlenmiş yatırım bölgelerinde mülk sahibi olabilir (2005 tarihli 19 sayılı Kanun, 2019’da değiştirildi). 2026 ortasında tüm uyruklara açık 50 bölge vardı.',
      'Diğer hak türleri: müsataha (50 yıl, yenilenebilir), intifa (99 yıla kadar) ve uzun süreli kira (25 yıl veya daha fazla).',
      'Projeler Abu Dabi Gayrimenkul Merkezi’ne (ADREC) kaydedilir.',
      'En az 2 milyon AED yatırım yapan gayrimenkul yatırımcıları beş yıllık BAE oturum vizesine (Golden Visa) başvurabilir.'],
    ar: ['يحق للأجانب التملّك في المناطق الاستثمارية المحددة (القانون رقم 19 لسنة 2005 وتعديله في 2019)، وبلغ عددها 50 منطقة مفتوحة لجميع الجنسيات في منتصف 2026.',
      'ومن صيغ الحقوق الأخرى: المساطحة (50 عاماً قابلة للتجديد)، وحق الانتفاع (حتى 99 عاماً)، والإيجار طويل الأمد (25 عاماً أو أكثر).',
      'تُسجَّل المشاريع لدى مركز أبوظبي العقاري.',
      'يمكن للمستثمرين العقاريين باستثمار لا يقل عن مليوني درهم التقدّم لتأشيرة إقامة إماراتية لمدة خمس سنوات (الإقامة الذهبية).'] }
};

export const OVC = {
  en: { ovLab: 'At a glance', ovH: 'The market in official figures', ovP: 'Headline figures from the latest official releases, for orientation. Detailed information on a specific project comes with its catalogue.',
    src: 'Source', rel: 'released', checked: 'Figures checked against the official releases on {d}.',
    ruLab: 'Buying rules', ruH: 'Buying here as a foreign buyer', ruP: 'A short summary of official government guidance. Rules can change, so each purchase is confirmed with the developer and the registry at the time.', ruSrc: 'Official source', ruChecked: 'Checked on {d}.' },
  tr: { ovLab: 'Bir bakışta', ovH: 'Resmî rakamlarla pazar', ovP: 'Son resmî yayınlardan öne çıkan rakamlar, genel fikir vermek için. Belirli bir projeye ilişkin ayrıntılı bilgiler kataloğuyla birlikte gelir.',
    src: 'Kaynak', rel: 'yayım', checked: 'Rakamlar {d} tarihinde resmî yayınlarla karşılaştırıldı.',
    ruLab: 'Satın alma kuralları', ruH: 'Yabancı alıcı olarak burada satın almak', ruP: 'Resmî kamu kaynaklarının kısa bir özeti. Kurallar değişebilir; bu nedenle her satın alma, o tarihte geliştirici ve tapu/kayıt makamıyla teyit edilir.', ruSrc: 'Resmî kaynak', ruChecked: '{d} tarihinde kontrol edildi.' },
  ar: { ovLab: 'نظرة سريعة', ovH: 'السوق بالأرقام الرسمية', ovP: 'أبرز الأرقام من أحدث الإصدارات الرسمية، للاستئناس. أما المعلومات التفصيلية عن مشروع محدد فتُرسل مع كتيّبه.',
    src: 'المصدر', rel: 'تاريخ الإصدار', checked: 'جرت مطابقة الأرقام مع الإصدارات الرسمية في {d}.',
    ruLab: 'قواعد الشراء', ruH: 'الشراء هنا كمشترٍ أجنبي', ruP: 'ملخص قصير للإرشادات الحكومية الرسمية. قد تتغير القواعد، لذا يُتحقق من كل عملية شراء مع المطوّر والجهة المسجِّلة في حينه.', ruSrc: 'المصدر الرسمي', ruChecked: 'جرى التحقق في {d}.' }
};
