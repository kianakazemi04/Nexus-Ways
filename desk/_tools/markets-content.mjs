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
    p3t: 'Our own compliance', p3p: 'Before presenting projects in a market, we confirm the licences and permits that apply to our own activity there.',
    p4t: 'Project permission', p4p: 'Each project is presented with the written permission of its sales office.',
    chkLab: 'Before a project is shown', chkH: 'What we check for every project here',
    chkP: 'In addition to the developer, the project facts, the material risks and the image rights:',
    reqPerm: 'Written permission from the project’s sales office for the information and images we show.',
    areaLab: 'Areas', areaH: 'In our research scope',
    areaP: 'Districts and communities we are researching in this market. This is research scope, not a recommendation or a ranking.',
    areaNone: 'The areas for this market are being selected.',
    srcLab: 'Sources', srcH: 'Sources we use',
    srcP: 'We compare and refresh market data against these official publishers and registries. The figures support our analysis and are discussed with you in consultation; Desk does not publish them.',
    ctaH: 'Considering this market?', ctaP: 'Tell us your objectives and timeframe. We will share our current view of the market and the projects that fit, privately.', ctaBtn: 'Request a consultation',
    admin: { DISTRICT: 'District', SUB_DISTRICT: 'Neighbourhood', COMMUNITY: 'Community' },
    reqs: {
      'IST-TITLE-STATUS': 'Title status in the land registry (TKGM)', 'IST-BUILDING-PERMIT': 'Building permit, for projects not yet completed',
      'DXB-PROJECT-REGISTRATION': 'Project registration and status with the Dubai Land Department', 'DXB-ESCROW-ACCOUNT': 'Escrow account, for off-plan projects', 'DXB-ADVERTISING-PERMIT': 'Advertising permit for the project page',
      'AUH-PROJECT-REGISTRATION': 'Project registration and status with ADREC', 'AUH-ESCROW-ACCOUNT': 'Escrow arrangements, for off-plan projects', 'AUH-LISTING-PERMIT': 'Listing permit for the project page'
    }
  },
  tr: {
    idxLab: 'Kapsam', idxH: 'Üç pazar, tek standart',
    idxP: 'Her pazar ayrı araştırılır ve o pazara ilişkin kontrollerimiz tamamlandığında yeni fırsatlara kendi başına açılır.',
    procLab: 'Süreç', procH: 'Bir pazarı nasıl hazırlıyoruz',
    p1t: 'Resmî veriler ve pazar verileri', p1p: 'Her pazarın resmî istatistiklerini ve kayıtlarını izler, kaynakları karşılaştırır ve pazar görünümümüzü güncel tutarız.',
    p2t: 'Konum araştırması', p2p: 'İlçe ve bölgeler, oradaki projeler değerlendirilmeden önce konum, arz ve talep açısından araştırılır.',
    p3t: 'Kendi uyumumuz', p3p: 'Bir pazarda proje sunmadan önce, oradaki kendi faaliyetimiz için gereken lisans ve izinleri teyit ederiz.',
    p4t: 'Proje izni', p4p: 'Her proje, satış ofisinin yazılı izniyle sunulur.',
    chkLab: 'Bir proje gösterilmeden önce', chkH: 'Buradaki her proje için kontrol ettiklerimiz',
    chkP: 'Geliştirici, proje bilgileri, önemli riskler ve görsel haklarına ek olarak:',
    reqPerm: 'Gösterdiğimiz bilgi ve görseller için projenin satış ofisinden yazılı izin.',
    areaLab: 'Bölgeler', areaH: 'Araştırma kapsamımızda',
    areaP: 'Bu pazarda araştırdığımız ilçe ve bölgeler. Bu bir araştırma kapsamıdır; öneri veya sıralama değildir.',
    areaNone: 'Bu pazar için bölgeler belirleniyor.',
    srcLab: 'Kaynaklar', srcH: 'Kullandığımız kaynaklar',
    srcP: 'Pazar verilerini bu resmî yayıncı ve kayıtlarla karşılaştırır ve güncelleriz. Rakamlar analizimizi destekler ve görüşmede sizinle paylaşılır; Desk bunları yayımlamaz.',
    ctaH: 'Bu pazarı mı düşünüyorsunuz?', ctaP: 'Hedeflerinizi ve zaman planınızı paylaşın. Pazara ilişkin güncel görüşümüzü ve uygun projeleri size özel olarak iletelim.', ctaBtn: 'Görüşme talep edin',
    admin: { DISTRICT: 'İlçe', SUB_DISTRICT: 'Mahalle', COMMUNITY: 'Bölge' },
    reqs: {
      'IST-TITLE-STATUS': 'Tapu kaydındaki durum (TKGM)', 'IST-BUILDING-PERMIT': 'Tamamlanmamış projeler için yapı ruhsatı',
      'DXB-PROJECT-REGISTRATION': 'Dubai Arazi Dairesi’nde proje kaydı ve durumu', 'DXB-ESCROW-ACCOUNT': 'Off-plan projeler için emanet hesabı', 'DXB-ADVERTISING-PERMIT': 'Proje sayfası için reklam izni',
      'AUH-PROJECT-REGISTRATION': 'ADREC’de proje kaydı ve durumu', 'AUH-ESCROW-ACCOUNT': 'Off-plan projeler için emanet düzenlemesi', 'AUH-LISTING-PERMIT': 'Proje sayfası için ilan izni'
    }
  },
  ar: {
    idxLab: 'التغطية', idxH: 'ثلاثة أسواق ومعيار واحد',
    idxP: 'يُبحث كل سوق على حدة، ويُفتح للفرص الجديدة وحده بعد اكتمال فحوصنا الخاصة بذلك السوق.',
    procLab: 'المنهجية', procH: 'كيف نُعدّ السوق',
    p1t: 'البيانات الرسمية وبيانات السوق', p1p: 'نتابع الإحصاءات والسجلات الرسمية لكل سوق، ونقارن المصادر، ونحافظ على صورة محدّثة للسوق.',
    p2t: 'بحث المواقع', p2p: 'تُبحث الأحياء والمجتمعات من حيث الموقع والعرض والطلب قبل النظر في المشاريع فيها.',
    p3t: 'امتثالنا نحن', p3p: 'قبل عرض المشاريع في أي سوق، نتأكد من التراخيص والتصاريح التي تنطبق على نشاطنا فيه.',
    p4t: 'إذن المشروع', p4p: 'يُعرض كل مشروع بإذن كتابي من مكتب مبيعاته.',
    chkLab: 'قبل عرض أي مشروع', chkH: 'ما نتحقق منه لكل مشروع هنا',
    chkP: 'إضافةً إلى المطوّر ومعلومات المشروع والمخاطر الجوهرية وحقوق الصور:',
    reqPerm: 'إذن كتابي من مكتب مبيعات المشروع للمعلومات والصور التي نعرضها.',
    areaLab: 'المناطق', areaH: 'ضمن نطاق بحثنا',
    areaP: 'الأحياء والمجتمعات التي نبحثها في هذا السوق. هذا نطاق بحث، وليس توصية ولا تصنيفاً.',
    areaNone: 'يجري اختيار مناطق هذا السوق.',
    srcLab: 'المصادر', srcH: 'المصادر التي نعتمد عليها',
    srcP: 'نقارن بيانات السوق ونحدّثها استناداً إلى هذه الجهات الرسمية والسجلات. تدعم الأرقام تحليلنا ونناقشها معك في الاستشارة؛ ولا ينشرها Desk.',
    ctaH: 'هل تفكر في هذا السوق؟', ctaP: 'أخبرنا بأهدافك وإطارك الزمني، وسنشاركك رؤيتنا الحالية للسوق والمشاريع المناسبة بشكل خاص.', ctaBtn: 'اطلب استشارة',
    admin: { DISTRICT: 'حي', SUB_DISTRICT: 'حي فرعي', COMMUNITY: 'مجتمع' },
    reqs: {
      'IST-TITLE-STATUS': 'حالة الملكية في سجل الطابو (TKGM)', 'IST-BUILDING-PERMIT': 'رخصة البناء، للمشاريع غير المكتملة',
      'DXB-PROJECT-REGISTRATION': 'تسجيل المشروع وحالته لدى دائرة الأراضي والأملاك', 'DXB-ESCROW-ACCOUNT': 'حساب الضمان، للمشاريع على الخارطة', 'DXB-ADVERTISING-PERMIT': 'تصريح الإعلان لصفحة المشروع',
      'AUH-PROJECT-REGISTRATION': 'تسجيل المشروع وحالته لدى مركز أبوظبي العقاري', 'AUH-ESCROW-ACCOUNT': 'ترتيبات الضمان، للمشاريع على الخارطة', 'AUH-LISTING-PERMIT': 'تصريح الإعلان لصفحة المشروع'
    }
  }
};

// Requirements and areas of one market, from the gate configuration and the public district records only.
export function marketCoverage(cfg, m, data) {
  const mc = cfg && cfg.markets && cfg.markets[m.id];
  const dists = data.districts.filter(d => d.market_id === m.id).sort((a, b) => a.name.localeCompare(b.name));
  return { dists, reqs: mc ? mc.publication.opportunity_requirements : [] };
}
