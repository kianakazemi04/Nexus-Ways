// Markets and "How we evaluate" copy (EN/TR/AR), built by build.mjs. PUB-2 (owner instruction 28 Oct 2026): public
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

// "How we evaluate" (/desk/intelligence/): one plain-language page.
export const HOW = {
  en: {
    stLab: 'Process', stH: 'Four steps behind every opportunity',
    steps: [
      ['Verify', 'Project identity, developer and registration are checked against official records. What a developer or agent states is labelled as their statement.'],
      ['Research the market and location', 'Official statistics, registries and market data are compared across sources and kept current for each market and area.'],
      ['State the risks', 'Every opportunity shows its material risks and what is still being confirmed, in plain language.'],
      ['Prepare your private analysis', 'Pricing, payment plans, comparable projects and financial scenarios are prepared for your objectives and discussed with you one to one.']
    ],
    splitLab: 'Public and private', splitH: 'What you see here, and what we prepare for you',
    pubH: 'On Desk', pub: ['Verified project and developer facts', 'Location and delivery status', 'Material risks and open points', 'The sources behind the facts'],
    privH: 'In your consultation', priv: ['Current pricing and payment plans', 'Comparable projects in the area', 'Financial scenarios with stated assumptions', 'Fit with your objectives, budget and timeframe'],
    privP: 'Pricing changes often and depends on the unit and the terms, so it is shared directly, with its date and source.',
    lblLab: 'Labels', lblH: 'How facts are labelled',
    lbls: { VERIFIED: 'Confirmed against an official or primary record.', CORROBORATED: 'Consistent across independent sources.', 'SOURCE-REPORTED': 'Reported by one credible source; not yet independently confirmed.', 'DEVELOPER-CLAIM': 'Stated by the developer or its agents.' },
    srcLab: 'Sources', srcH: 'Sources we use', srcP: 'Official publishers and registries in each market. Their figures support our analysis and are discussed in consultation; Desk does not republish them.',
    ctaH: 'Discuss an opportunity with us', ctaP: 'Share your objectives, budget range and timeframe. We will come back with a short list and the analysis behind it.', ctaBtn: 'Request a consultation'
  },
  tr: {
    stLab: 'Süreç', stH: 'Her fırsatın arkasındaki dört adım',
    steps: [
      ['Doğrulama', 'Proje kimliği, geliştirici ve kayıt bilgileri resmî kayıtlarla kontrol edilir. Geliştiricinin veya aracının söyledikleri, onların beyanı olarak etiketlenir.'],
      ['Pazar ve konum araştırması', 'Resmî istatistikler, kayıtlar ve pazar verileri her pazar ve bölge için kaynaklar arasında karşılaştırılır ve güncel tutulur.'],
      ['Risklerin açıkça belirtilmesi', 'Her fırsat, önemli risklerini ve hâlâ teyit edilmekte olan noktaları sade bir dille gösterir.'],
      ['Size özel analiz', 'Fiyatlar, ödeme planları, emsal projeler ve finansal senaryolar hedeflerinize göre hazırlanır ve sizinle birebir görüşülür.']
    ],
    splitLab: 'Açık ve özel', splitH: 'Burada gördükleriniz ve sizin için hazırladıklarımız',
    pubH: 'Desk’te', pub: ['Doğrulanmış proje ve geliştirici bilgileri', 'Konum ve teslim durumu', 'Önemli riskler ve açık noktalar', 'Bilgilerin dayandığı kaynaklar'],
    privH: 'Görüşmenizde', priv: ['Güncel fiyatlar ve ödeme planları', 'Bölgedeki emsal projeler', 'Varsayımları belirtilmiş finansal senaryolar', 'Hedeflerinize, bütçenize ve zaman planınıza uygunluk'],
    privP: 'Fiyatlar sık değişir ve birime ve koşullara bağlıdır; bu nedenle tarihi ve kaynağıyla doğrudan paylaşılır.',
    lblLab: 'Etiketler', lblH: 'Bilgiler nasıl etiketlenir',
    lbls: { VERIFIED: 'Resmî veya birincil bir kayda göre teyit edildi.', CORROBORATED: 'Bağımsız kaynaklar arasında tutarlı.', 'SOURCE-REPORTED': 'Güvenilir tek bir kaynak tarafından aktarıldı; henüz bağımsız olarak teyit edilmedi.', 'DEVELOPER-CLAIM': 'Geliştirici veya aracıları tarafından beyan edildi.' },
    srcLab: 'Kaynaklar', srcH: 'Kullandığımız kaynaklar', srcP: 'Her pazardaki resmî yayıncılar ve kayıtlar. Rakamları analizimizi destekler ve görüşmede paylaşılır; Desk bunları yeniden yayımlamaz.',
    ctaH: 'Bir fırsatı bizimle görüşün', ctaP: 'Hedeflerinizi, bütçe aralığınızı ve zaman planınızı paylaşın. Kısa bir liste ve arkasındaki analizle size dönelim.', ctaBtn: 'Görüşme talep edin'
  },
  ar: {
    stLab: 'المنهجية', stH: 'أربع خطوات وراء كل فرصة',
    steps: [
      ['التحقق', 'تُراجع هوية المشروع والمطوّر والتسجيل مقابل السجلات الرسمية. وما يذكره المطوّر أو الوسيط يُوسَم على أنه تصريح منه.'],
      ['بحث السوق والموقع', 'تُقارن الإحصاءات والسجلات الرسمية وبيانات السوق بين المصادر وتُحدَّث لكل سوق ومنطقة.'],
      ['توضيح المخاطر', 'تعرض كل فرصة مخاطرها الجوهرية وما زال قيد التأكيد، بلغة واضحة.'],
      ['إعداد تحليلك الخاص', 'تُعدّ الأسعار وخطط الدفع والمشاريع المماثلة والسيناريوهات المالية وفق أهدافك، ونناقشها معك مباشرة.']
    ],
    splitLab: 'العام والخاص', splitH: 'ما تراه هنا، وما نُعدّه لك',
    pubH: 'على Desk', pub: ['معلومات موثّقة عن المشروع والمطوّر', 'الموقع وحالة التسليم', 'المخاطر الجوهرية والنقاط المفتوحة', 'المصادر التي تستند إليها المعلومات'],
    privH: 'في استشارتك', priv: ['الأسعار الحالية وخطط الدفع', 'المشاريع المماثلة في المنطقة', 'سيناريوهات مالية بافتراضات معلنة', 'مدى الملاءمة لأهدافك وميزانيتك وإطارك الزمني'],
    privP: 'تتغير الأسعار باستمرار وتعتمد على الوحدة والشروط، لذلك نشاركها مباشرةً مع تاريخها ومصدرها.',
    lblLab: 'التصنيفات', lblH: 'كيف تُصنَّف المعلومات',
    lbls: { VERIFIED: 'مؤكَّد مقابل سجل رسمي أو أولي.', CORROBORATED: 'متّسق بين مصادر مستقلة.', 'SOURCE-REPORTED': 'نقله مصدر موثوق واحد؛ لم يُؤكَّد بشكل مستقل بعد.', 'DEVELOPER-CLAIM': 'صرّح به المطوّر أو وكلاؤه.' },
    srcLab: 'المصادر', srcH: 'المصادر التي نعتمد عليها', srcP: 'الجهات الرسمية والسجلات في كل سوق. تدعم أرقامها تحليلنا وتُناقش في الاستشارة؛ ولا يعيد Desk نشرها.',
    ctaH: 'ناقش فرصة معنا', ctaP: 'شاركنا أهدافك ونطاق ميزانيتك وإطارك الزمني، وسنعود إليك بقائمة مختصرة والتحليل الذي يدعمها.', ctaBtn: 'اطلب استشارة'
  }
};

// Requirements and areas of one market, from the gate configuration and the public district records only.
export function marketCoverage(cfg, m, data) {
  const mc = cfg && cfg.markets && cfg.markets[m.id];
  const dists = data.districts.filter(d => d.market_id === m.id).sort((a, b) => a.name.localeCompare(b.name));
  return { dists, reqs: mc ? mc.publication.opportunity_requirements : [] };
}
