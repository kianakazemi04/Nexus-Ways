// Markets (index) and Intelligence page copy, EN/TR/AR — owner brief "Markets & Intelligence Pages: Final Content and UX
// Implementation" (28 Oct 2026). Copy only: every STATUS on these pages is computed at build time from its canonical
// source — market status from the public market record and its gate certificate (marketgate.mjs certificateState),
// method status from the method registry (desk/data/methods.json). No figure, score, ranking or private record is
// published (PUB-2): the pages explain evidence, methods and limits.

export const MP = {
  en: {
    title: 'Markets | Nexus Intelligence Desk', desc: 'Explore market research coverage, evidence quality and market-specific publication requirements for Istanbul, Dubai and Abu Dhabi.',
    eb: 'Markets', h1: 'Markets, examined <em>through evidence.</em>',
    lead: 'Understand the conditions, constraints and evidence behind real-estate investment markets before evaluating individual assets.',
    tags: ['Evidence-led research', 'Market-specific gates', 'Source transparency'],
    scopeLab: 'Coverage', scopeH: 'Markets in scope', scopeP: 'Three residential real-estate markets, each researched on its own evidence and opened by its own gate.',
    region: { 'MKT-IST': 'Türkiye', 'MKT-DXB': 'United Arab Emirates', 'MKT-AUH': 'United Arab Emirates' }, focus: 'Residential real estate',
    focusLbl: 'Research focus', gateLbl: 'Market gate', view: 'View market',
    focusText: {
      'MKT-IST': 'Official housing transactions, price indices, inflation, financing conditions, FX evidence and district-level research where supported.',
      'MKT-DXB': 'Registered transactions, off-plan activity, supply context, inflation, currency conditions and applicable statutory requirements.',
      'MKT-AUH': 'Registered transactions, market structure, official statistical releases, currency conditions and local regulatory requirements.'
    },
    cardNote: { 'MKT-IST': 'No market activation or investment ranking is implied.', 'MKT-DXB': 'Dubai records are never applied to Abu Dhabi.', 'MKT-AUH': 'Assessed independently from Dubai.' },
    std: ['One standard. Separate gates.', 'Each market must satisfy its own evidence and statutory requirements before activation. One market’s result never opens, or holds back, another.'],
    imgAlt: { 'MKT-IST': 'Line illustration of the Istanbul skyline with domes, minarets and the Bosphorus — Istanbul residential real-estate market research', 'MKT-DXB': 'Line illustration of a Dubai-style skyline of high-rise towers by the water — Dubai residential real-estate market research', 'MKT-AUH': 'Line illustration of an Abu Dhabi-style waterfront skyline with towers and a domed building — Abu Dhabi residential real-estate market research' },
    illus: 'Illustration',
    st: { open: 'Active · gate passed', closed: 'Inactive · gate not yet passed', expired: 'Active · new publications paused' },
    exLab: 'Research framework', exH: 'What we examine', exP: 'Five areas of evidence, recorded with source, period, unit and geography — the context an investor needs before looking at a single unit.',
    ex: [
      ['Market activity', 'Transactions and sales volumes, with their reporting period and geographic scope.'],
      ['Pricing and housing conditions', 'Official price indices and comparable indicators, with their methodology and limitations stated.'],
      ['Macro and currency context', 'Inflation, financing conditions and FX evidence, each with the date and basis of the rate.'],
      ['District and location evidence', 'Local differences, transport and amenities — only where reliable, geographically specific evidence exists.'],
      ['Regulatory and publication readiness', 'Applicable statutory records, evidence requirements, permissions and outstanding blockers.']
    ],
    evLab: 'Evidence quality', evH: 'Evidence before conclusions', evP: 'Every figure and claim carries one of these states. The labels are the same ones used on opportunity pages.',
    ev: [
      ['Verified against an identified source', 'The source, publication date, reporting period, units and verification scope are recorded.', ['VERIFIED', 'CORROBORATED']],
      ['Source-reported', 'A figure is attributed to its source but has not yet been independently verified against the relevant official release. Developer statements carry their own label.', ['SOURCE-REPORTED', 'DEVELOPER-CLAIM']],
      ['Unavailable or unresolved', 'Missing, conflicting, stale or inaccessible evidence remains visible as a limitation rather than being silently filled in.', ['UNVERIFIED']]
    ],
    evExtra: ['Data not available', 'Open conflict', 'Re-review due'],
    gLab: 'Market gate', gH: 'A market is not active until it qualifies.',
    gP: 'A market-specific gate evaluates required evidence and statutory records. An open blocker prevents activation. Passing the gate does not automatically approve a property, guarantee returns or replace professional legal advice.',
    gThMarket: 'Market', gThStatus: 'Status', gThMeaning: 'What it means',
    gWhy: { closed: 'Required official evidence and statutory records are not yet complete. No opportunity can be published in this market.', open: 'Gate passed and market activated on {a}; the gate inputs stay current until {u}.', expired: 'The gate inputs expired on {u}; no new opportunity is published until the gate is re-run.' },
    gNote: 'Statuses are generated from the published market records each time the site is built. Gate details and statutory records stay private.',
    sLab: 'Sources', sH: 'Traceable sources. Explicit limitations.',
    sP: 'Market evidence identifies the originating institution, source title, reporting period, retrieval date, unit and verification status. Where an official source cannot be accessed, that limitation is disclosed.',
    sLimit: 'Each market page shows headline figures from the latest official releases, each with its publisher and date. Detailed figures are discussed in consultation with their source.',
    ctaH: 'From market context to asset-level research.', ctaP: 'Market context is the starting point. Individual assets require separate evidence, permissions, financial analysis and due diligence.',
    ctaBtn: 'Explore the Intelligence framework', ctaAlt: 'Request a consultation'
  },
  tr: {
    title: 'Pazarlar | Nexus Intelligence Desk', desc: 'İstanbul, Dubai ve Abu Dabi için pazar araştırması kapsamını, kanıt kalitesini ve pazara özgü yayın koşullarını inceleyin.',
    eb: 'Pazarlar', h1: 'Pazarlar, <em>kanıtlarla incelenir.</em>',
    lead: 'Tek tek varlıkları değerlendirmeden önce gayrimenkul yatırım pazarlarının arkasındaki koşulları, kısıtları ve kanıtları anlayın.',
    tags: ['Kanıta dayalı araştırma', 'Pazara özgü kapılar', 'Kaynak şeffaflığı'],
    scopeLab: 'Kapsam', scopeH: 'Kapsamdaki pazarlar', scopeP: 'Her biri kendi kanıtlarıyla araştırılan ve kendi kapısıyla açılan üç konut gayrimenkul pazarı.',
    region: { 'MKT-IST': 'Türkiye', 'MKT-DXB': 'Birleşik Arap Emirlikleri', 'MKT-AUH': 'Birleşik Arap Emirlikleri' }, focus: 'Konut gayrimenkulü',
    focusLbl: 'Araştırma odağı', gateLbl: 'Pazar kapısı', view: 'Pazarı gör',
    focusText: {
      'MKT-IST': 'Resmî konut satışları, fiyat endeksleri, enflasyon, finansman koşulları, döviz kanıtı ve desteklendiği ölçüde ilçe düzeyinde araştırma.',
      'MKT-DXB': 'Tescilli işlemler, proje aşamasındaki satışlar, arz bağlamı, enflasyon, kur koşulları ve uygulanabilir yasal gereklilikler.',
      'MKT-AUH': 'Tescilli işlemler, pazar yapısı, resmî istatistik yayınları, kur koşulları ve yerel düzenleyici gereklilikler.'
    },
    cardNote: { 'MKT-IST': 'Pazarın aktifleştirildiği veya bir yatırım sıralaması yapıldığı anlamına gelmez.', 'MKT-DXB': 'Dubai kayıtları asla Abu Dabi’ye uygulanmaz.', 'MKT-AUH': 'Dubai’den bağımsız olarak değerlendirilir.' },
    std: ['Tek standart. Ayrı kapılar.', 'Her pazar, aktifleştirilmeden önce kendi kanıt ve yasal gerekliliklerini karşılamalıdır. Bir pazarın sonucu diğerini açmaz veya bekletmez.'],
    imgAlt: { 'MKT-IST': 'Kubbeler, minareler ve Boğaz ile İstanbul silüetinin çizimi — İstanbul konut gayrimenkul pazarı araştırması', 'MKT-DXB': 'Su kenarında yüksek kuleler ile Dubai tarzı bir silüet çizimi — Dubai konut gayrimenkul pazarı araştırması', 'MKT-AUH': 'Kuleler ve kubbeli bir yapı ile Abu Dabi tarzı sahil silüeti çizimi — Abu Dabi konut gayrimenkul pazarı araştırması' },
    illus: 'Çizim',
    st: { open: 'Aktif · kapı geçildi', closed: 'Pasif · kapı henüz geçilmedi', expired: 'Aktif · yeni yayınlar durduruldu' },
    exLab: 'Araştırma çerçevesi', exH: 'Neleri inceliyoruz', exP: 'Kaynak, dönem, birim ve coğrafyasıyla kaydedilen beş kanıt alanı — tek bir birime bakmadan önce yatırımcının ihtiyaç duyduğu bağlam.',
    ex: [
      ['Pazar hareketi', 'İşlemler ve satış hacimleri; raporlama dönemi ve coğrafi kapsamıyla.'],
      ['Fiyat ve konut koşulları', 'Resmî fiyat endeksleri ve karşılaştırılabilir göstergeler; yöntemleri ve sınırlamalarıyla.'],
      ['Makro ve kur bağlamı', 'Enflasyon, finansman koşulları ve döviz kanıtı; her kurun tarihi ve esasıyla.'],
      ['İlçe ve konum kanıtı', 'Yerel farklar, ulaşım ve olanaklar — yalnızca güvenilir ve coğrafi olarak özgül kanıt varsa.'],
      ['Yasal ve yayın hazırlığı', 'Uygulanabilir yasal kayıtlar, kanıt gereklilikleri, izinler ve açık engeller.']
    ],
    evLab: 'Kanıt kalitesi', evH: 'Sonuçtan önce kanıt', evP: 'Her rakam ve iddia bu durumlardan birini taşır. Etiketler fırsat sayfalarında kullanılanlarla aynıdır.',
    ev: [
      ['Tanımlı bir kaynağa göre doğrulandı', 'Kaynak, yayın tarihi, raporlama dönemi, birimler ve doğrulama kapsamı kaydedilir.', ['VERIFIED', 'CORROBORATED']],
      ['Kaynakça aktarıldı', 'Rakam kaynağına atfedilir ancak ilgili resmî yayına göre henüz bağımsız olarak doğrulanmamıştır. Geliştirici beyanları kendi etiketini taşır.', ['SOURCE-REPORTED', 'DEVELOPER-CLAIM']],
      ['Mevcut değil veya çözülmemiş', 'Eksik, çelişkili, eskimiş veya erişilemeyen kanıt sessizce doldurulmaz; bir sınırlama olarak görünür kalır.', ['UNVERIFIED']]
    ],
    evExtra: ['Veri mevcut değil', 'Açık çelişki', 'Yeniden inceleme gerekli'],
    gLab: 'Pazar kapısı', gH: 'Bir pazar, koşulları sağlayana kadar aktif değildir.',
    gP: 'Pazara özgü bir kapı, gerekli kanıtları ve yasal kayıtları değerlendirir. Açık bir engel aktifleştirmeyi önler. Kapıyı geçmek bir mülkü kendiliğinden onaylamaz, getiri garanti etmez ve profesyonel hukuki danışmanlığın yerini tutmaz.',
    gThMarket: 'Pazar', gThStatus: 'Durum', gThMeaning: 'Anlamı',
    gWhy: { closed: 'Gerekli resmî kanıtlar ve yasal kayıtlar henüz tamamlanmadı. Bu pazarda hiçbir fırsat yayımlanamaz.', open: 'Kapı geçildi ve pazar {a} tarihinde aktifleştirildi; kapı girdileri {u} tarihine kadar günceldir.', expired: 'Kapı girdilerinin süresi {u} tarihinde doldu; kapı yeniden çalıştırılana kadar yeni fırsat yayımlanmaz.' },
    gNote: 'Durumlar, site her oluşturulduğunda yayımlanmış pazar kayıtlarından üretilir. Kapı ayrıntıları ve yasal kayıtlar gizli kalır.',
    sLab: 'Kaynaklar', sH: 'İzlenebilir kaynaklar. Açık sınırlamalar.',
    sP: 'Pazar kanıtı; kaynak kurumu, kaynak başlığını, raporlama dönemini, erişim tarihini, birimi ve doğrulama durumunu belirtir. Resmî bir kaynağa erişilemediğinde bu sınırlama açıklanır.',
    sLimit: 'Her pazar sayfası, son resmî yayınlardan öne çıkan rakamları yayıncısı ve tarihiyle birlikte gösterir. Ayrıntılı rakamlar, kaynağıyla birlikte görüşmede paylaşılır.',
    ctaH: 'Pazar bağlamından varlık düzeyinde araştırmaya.', ctaP: 'Pazar bağlamı başlangıç noktasıdır. Her varlık ayrıca kanıt, izin, finansal analiz ve detaylı inceleme gerektirir.',
    ctaBtn: 'Değerlendirme çerçevesini inceleyin', ctaAlt: 'Görüşme talep edin'
  },
  ar: {
    title: 'الأسواق | Nexus Intelligence Desk', desc: 'تعرّف على نطاق أبحاث الأسواق وجودة الأدلة ومتطلبات النشر الخاصة بكل سوق في إسطنبول ودبي وأبوظبي.',
    eb: 'الأسواق', h1: 'الأسواق، <em>بمنظار الأدلة.</em>',
    lead: 'افهم الظروف والقيود والأدلة التي تقوم عليها أسواق الاستثمار العقاري قبل تقييم أي أصل بعينه.',
    tags: ['بحث قائم على الأدلة', 'بوابة لكل سوق', 'شفافية المصادر'],
    scopeLab: 'التغطية', scopeH: 'الأسواق ضمن النطاق', scopeP: 'ثلاثة أسواق للعقارات السكنية، يُبحث كلٌّ منها بأدلته الخاصة ويُفتح عبر بوابته الخاصة.',
    region: { 'MKT-IST': 'تركيا', 'MKT-DXB': 'الإمارات العربية المتحدة', 'MKT-AUH': 'الإمارات العربية المتحدة' }, focus: 'العقارات السكنية',
    focusLbl: 'محور البحث', gateLbl: 'بوابة السوق', view: 'عرض السوق',
    focusText: {
      'MKT-IST': 'معاملات المساكن الرسمية ومؤشرات الأسعار والتضخم وظروف التمويل وأدلة الصرف، وبحث على مستوى الأحياء حيث تتوفر الأدلة.',
      'MKT-DXB': 'المعاملات المسجّلة ونشاط البيع على الخارطة وسياق العرض والتضخم وظروف العملة والمتطلبات القانونية المطبّقة.',
      'MKT-AUH': 'المعاملات المسجّلة وبنية السوق والإصدارات الإحصائية الرسمية وظروف العملة والمتطلبات التنظيمية المحلية.'
    },
    cardNote: { 'MKT-IST': 'لا يعني ذلك تفعيل السوق ولا أي تصنيف استثماري.', 'MKT-DXB': 'لا تُطبَّق سجلات دبي على أبوظبي أبداً.', 'MKT-AUH': 'يُقيَّم بشكل مستقل عن دبي.' },
    std: ['معيار واحد. بوابات منفصلة.', 'يجب أن يستوفي كل سوق متطلباته الخاصة من الأدلة والسجلات القانونية قبل تفعيله. ولا تفتح نتيجة سوقٍ سوقاً آخر ولا تؤخّره.'],
    imgAlt: { 'MKT-IST': 'رسم خطي لأفق إسطنبول بالقباب والمآذن ومضيق البوسفور — بحث سوق العقارات السكنية في إسطنبول', 'MKT-DXB': 'رسم خطي لأفق على طراز دبي بأبراج شاهقة على الماء — بحث سوق العقارات السكنية في دبي', 'MKT-AUH': 'رسم خطي لواجهة بحرية على طراز أبوظبي بأبراج ومبنى ذي قبة — بحث سوق العقارات السكنية في أبوظبي' },
    illus: 'رسم توضيحي',
    st: { open: 'نشط · اجتاز البوابة', closed: 'غير نشط · لم يجتز البوابة بعد', expired: 'نشط · النشر الجديد متوقف' },
    exLab: 'إطار البحث', exH: 'ما الذي ندرسه', exP: 'خمسة مجالات من الأدلة، تُسجَّل بمصدرها وفترتها ووحدتها ونطاقها الجغرافي — السياق الذي يحتاجه المستثمر قبل النظر في أي وحدة.',
    ex: [
      ['نشاط السوق', 'المعاملات وأحجام المبيعات، مع فترة التقرير والنطاق الجغرافي.'],
      ['الأسعار وظروف السكن', 'مؤشرات الأسعار الرسمية والمؤشرات القابلة للمقارنة، مع منهجيتها وحدودها.'],
      ['السياق الكلي والعملة', 'التضخم وظروف التمويل وأدلة الصرف، مع تاريخ كل سعر وأساسه.'],
      ['أدلة الأحياء والمواقع', 'الفروق المحلية والنقل والمرافق — فقط حيث توجد أدلة موثوقة ومحددة جغرافياً.'],
      ['الجاهزية القانونية وللنشر', 'السجلات القانونية المطبّقة ومتطلبات الأدلة والأذونات والعوائق القائمة.']
    ],
    evLab: 'جودة الأدلة', evH: 'الأدلة قبل الاستنتاجات', evP: 'يحمل كل رقم وادعاء إحدى هذه الحالات. وهي التسميات نفسها المستخدمة في صفحات الفرص.',
    ev: [
      ['متحقق منه مقابل مصدر محدد', 'يُسجَّل المصدر وتاريخ النشر وفترة التقرير والوحدات ونطاق التحقق.', ['VERIFIED', 'CORROBORATED']],
      ['منقول عن المصدر', 'يُنسب الرقم إلى مصدره لكن لم يُتحقق منه بعد بشكل مستقل مقابل الإصدار الرسمي. ولتصريحات المطوّر تسميتها الخاصة.', ['SOURCE-REPORTED', 'DEVELOPER-CLAIM']],
      ['غير متاح أو غير محسوم', 'تبقى الأدلة الناقصة أو المتعارضة أو القديمة أو المتعذّر الوصول إليها ظاهرةً كقيد، ولا تُملأ بصمت.', ['UNVERIFIED']]
    ],
    evExtra: ['البيانات غير متاحة', 'تعارض قائم', 'تستحق المراجعة'],
    gLab: 'بوابة السوق', gH: 'لا يصبح السوق نشطاً حتى يستوفي شروطه.',
    gP: 'تقيّم بوابة خاصة بكل سوق الأدلة المطلوبة والسجلات القانونية. وأي عائق قائم يمنع التفعيل. واجتياز البوابة لا يعني اعتماد عقار تلقائياً ولا ضمان عائد ولا يغني عن المشورة القانونية المهنية.',
    gThMarket: 'السوق', gThStatus: 'الحالة', gThMeaning: 'ماذا يعني',
    gWhy: { closed: 'لم تكتمل بعد الأدلة الرسمية والسجلات القانونية المطلوبة. لا يمكن نشر أي فرصة في هذا السوق.', open: 'اجتاز السوق البوابة وفُعّل بتاريخ {a}؛ وتبقى مدخلات البوابة سارية حتى {u}.', expired: 'انتهت صلاحية مدخلات البوابة في {u}؛ ولا تُنشر فرص جديدة حتى إعادة تشغيل البوابة.' },
    gNote: 'تُولَّد الحالات من سجلات الأسواق المنشورة في كل مرة يُبنى فيها الموقع. وتبقى تفاصيل البوابة والسجلات القانونية خاصة.',
    sLab: 'المصادر', sH: 'مصادر قابلة للتتبع. قيود معلنة.',
    sP: 'تحدد أدلة السوق المؤسسة المصدرة وعنوان المصدر وفترة التقرير وتاريخ الاسترجاع والوحدة وحالة التحقق. وحين يتعذّر الوصول إلى مصدر رسمي، يُفصح عن هذا القيد.',
    sLimit: 'تعرض صفحة كل سوق أبرز الأرقام من أحدث الإصدارات الرسمية مع الجهة المصدِرة والتاريخ، وتُناقش الأرقام التفصيلية في الاستشارة مع مصدرها.',
    ctaH: 'من سياق السوق إلى بحث الأصل.', ctaP: 'سياق السوق نقطة البداية. ويتطلب كل أصل أدلة وأذونات وتحليلاً مالياً وفحصاً نافياً للجهالة بشكل مستقل.',
    ctaBtn: 'استكشف إطار التحليل', ctaAlt: 'اطلب استشارة'
  }
};

export const IP = {
  en: {
    title: 'Investment Intelligence | Nexus Intelligence Desk', desc: 'Explore the evidence, analytical methods and controls behind Nexus Intelligence Desk — and what each output does not claim.',
    eb: 'Intelligence', h1: 'Investment intelligence. <em>Built on evidence.</em>',
    lead: 'Nexus Intelligence Desk organizes market evidence, asset-level research and financial analysis into a traceable decision workflow.',
    tags: ['Evidence-led', 'Decision-focused', 'Limitations disclosed'],
    howLab: 'How it works', howH: 'From evidence to a decision record',
    how: [
      ['Collect and trace', 'Record source, date, period, unit, location and verification status for every material claim.'],
      ['Assess completeness and conflicts', 'Identify missing evidence, inconsistent claims, stale sources and unresolved questions.'],
      ['Analyze the asset and its context', 'Apply supported methods to project characteristics, comparable evidence, cash flows, risks and exit considerations.'],
      ['Test investor fit', 'Check hard constraints such as budget first, then evaluate preferences separately.'],
      ['Produce a decision report', 'Present findings, assumptions, limitations, unresolved blockers and the next diligence steps.'],
      ['Control what can be published', 'Enforce evidence, legal, disclosure and media-permission requirements before anything is made public.']
    ],
    domLab: 'Intelligence domains', domH: 'A structured view of investment risk', domP: 'Each domain lists the methods behind it, with their current status from the method registry.',
    dom: [
      ['Market intelligence', 'Market activity, price context and macroeconomic evidence, behind a market-specific gate.', ['M-MARKET-GATE', 'M-DOMAIN-ASSESSMENT', 'M-CONVERSION']],
      ['District and area intelligence', 'Location-specific evidence and geographic differences, where data supports them.', ['M-DOMAIN-ASSESSMENT', 'M-AREA-RANKING']],
      ['Project and asset assessment', 'Recorded project characteristics, developer claims, evidence gaps and asset-specific risks.', ['M-EVIDENCE', 'M-MISSING-DATA', 'M-RESEARCH-STATUS', 'M-ASSET-QUALITY']],
      ['Financial analysis', 'Cash flows, ROI, NPV, IRR, scenarios, inflation and investor-currency views where the inputs support calculation.', ['M-CASHFLOW', 'M-ROI', 'M-NPV', 'M-RETURN-VIEWS', 'M-SCENARIOS', 'M-COMPARABLES', 'M-FAIR-VALUE']],
      ['Risk and exit review', 'Qualitative risk documentation, liquidity considerations and exit diligence.', ['M-RISK-LIST', 'M-EXIT-REVIEW', 'M-RISK-SEVERITY', 'M-LIQUIDITY']],
      ['Investor fit and opportunity comparison', 'Hard eligibility constraints, soft preferences and a research queue for comparing opportunities.', ['M-INVESTMENT-FIT', 'M-BUDGET-ELIGIBILITY', 'M-OPPORTUNITY-COMPARISON', 'M-DECISION-REPORT']]
    ],
    regLab: 'Methods registry', regH: 'Methods, not black-box scores.', regP: 'Each analytical method discloses its purpose, required inputs, output, limitations and current availability. Open a method to read its details.',
    filt: { all: 'All methods', public: 'Shown on Desk', control: 'Publication controls', internal: 'Internal analysis', inactive: 'Not active' },
    stat: { public: 'Active · shown on Desk', control: 'Active control · result private', internal: 'Internal analysis only', inactive: 'Not currently active' },
    fld: { purpose: 'Purpose', inputs: 'Required inputs', output: 'Output', limits: 'Limitations', status: 'Availability', pub: 'Publication' },
    pub: { ALLOWED: 'Public-safe: shown on Desk', INTERNAL: 'Internal only: never on public pages', PROHIBITED_IN_MVP: 'Not published in this version', BLOCKED_UNTIL_METHOD_APPROVED: 'Blocked until a methodology is approved' },
    regNote: 'Statuses are read from the method registry each time the site is built. Inputs and results of internal methods are never published.',
    finLab: 'Financial discipline', finH: 'Returns are calculated, not promised.',
    finP: 'Financial outputs depend on the supplied price, acquisition costs, cash-flow timing, rental assumptions, FX evidence, inflation and discount-rate basis. Material assumptions remain visible in the internal report.',
    fin: ['ROI', 'NPV', 'IRR', 'Scenario analysis', 'Real return', 'Home-currency return'],
    finNote: 'These are calculation methods used in private analysis, not published figures. When the inputs are insufficient, the result is unavailable or unsupported — never an estimate.',
    limLab: 'Limitations', limH: 'What the system does not claim',
    lim: ['No guaranteed returns or certainty about future prices.', 'No fair-value claim without an implemented and validated valuation methodology.', 'No numeric risk or liquidity score where the method is inactive.', 'No investment recommendation based solely on a comparison queue or incomplete evidence.', 'No substitute for legal, tax, valuation or other regulated professional advice.'],
    govLab: 'Governance', govH: 'Private analysis. Controlled publication.',
    govP: 'Internal analysis and public content follow separate workflows. A market or project is not published until its evidence, permissions, disclosures and applicable gates have passed.',
    pubH: 'On Desk', pubL: ['Verified project and developer facts', 'Location and delivery status', 'Material risks and open points', 'The sources behind the facts'],
    privH: 'In your consultation', privL: ['Current pricing and payment plans', 'Comparable projects in the area', 'Financial scenarios with stated assumptions', 'Fit with your objectives, budget and timeframe'],
    ctaH: 'Understand the method behind the output.', ctaP: 'Explore market coverage, evidence status and the controls that govern publication.', ctaBtn: 'Explore Markets', ctaAlt: 'Request a consultation'
  },
  tr: {
    title: 'Yatırım İstihbaratı | Nexus Intelligence Desk', desc: 'Nexus Intelligence Desk’in arkasındaki kanıtları, analitik yöntemleri ve kontrolleri — ve her çıktının neyi iddia etmediğini inceleyin.',
    eb: 'İstihbarat', h1: 'Yatırım istihbaratı. <em>Kanıt üzerine kurulu.</em>',
    lead: 'Nexus Intelligence Desk, pazar kanıtlarını, varlık düzeyindeki araştırmayı ve finansal analizi izlenebilir bir karar akışında düzenler.',
    tags: ['Kanıta dayalı', 'Karar odaklı', 'Sınırlamalar açık'],
    howLab: 'Nasıl çalışır', howH: 'Kanıttan karar kaydına',
    how: [
      ['Topla ve izle', 'Her önemli iddia için kaynak, tarih, dönem, birim, konum ve doğrulama durumu kaydedilir.'],
      ['Bütünlük ve çelişkileri değerlendir', 'Eksik kanıtlar, tutarsız iddialar, eskimiş kaynaklar ve çözülmemiş sorular belirlenir.'],
      ['Varlığı ve bağlamını analiz et', 'Desteklenen yöntemler proje özelliklerine, emsal kanıtlara, nakit akışlarına, risklere ve çıkış koşullarına uygulanır.'],
      ['Yatırımcı uygunluğunu test et', 'Önce bütçe gibi kesin kısıtlar kontrol edilir, ardından tercihler ayrıca değerlendirilir.'],
      ['Karar raporu hazırla', 'Bulgular, varsayımlar, sınırlamalar, çözülmemiş engeller ve sonraki inceleme adımları sunulur.'],
      ['Yayımlananı kontrol et', 'Herhangi bir şey açık hale gelmeden önce kanıt, hukuk, açıklama ve görsel izni koşulları uygulanır.']
    ],
    domLab: 'İstihbarat alanları', domH: 'Yatırım riskine yapılandırılmış bakış', domP: 'Her alan, arkasındaki yöntemleri yöntem kaydındaki güncel durumlarıyla listeler.',
    dom: [
      ['Pazar istihbaratı', 'Pazara özgü bir kapının arkasında pazar hareketi, fiyat bağlamı ve makroekonomik kanıt.', ['M-MARKET-GATE', 'M-DOMAIN-ASSESSMENT', 'M-CONVERSION']],
      ['İlçe ve bölge istihbaratı', 'Verinin desteklediği yerlerde konuma özgü kanıt ve coğrafi farklar.', ['M-DOMAIN-ASSESSMENT', 'M-AREA-RANKING']],
      ['Proje ve varlık değerlendirmesi', 'Kayıtlı proje özellikleri, geliştirici beyanları, kanıt boşlukları ve varlığa özgü riskler.', ['M-EVIDENCE', 'M-MISSING-DATA', 'M-RESEARCH-STATUS', 'M-ASSET-QUALITY']],
      ['Finansal analiz', 'Girdilerin hesaplamayı desteklediği yerlerde nakit akışları, yatırım getirisi, NBD, iç verim oranı, senaryolar, enflasyon ve yatırımcının para birimindeki görünüm.', ['M-CASHFLOW', 'M-ROI', 'M-NPV', 'M-RETURN-VIEWS', 'M-SCENARIOS', 'M-COMPARABLES', 'M-FAIR-VALUE']],
      ['Risk ve çıkış incelemesi', 'Nitel risk belgelemesi, likidite değerlendirmeleri ve çıkış incelemesi.', ['M-RISK-LIST', 'M-EXIT-REVIEW', 'M-RISK-SEVERITY', 'M-LIQUIDITY']],
      ['Yatırımcı uygunluğu ve fırsat karşılaştırması', 'Kesin uygunluk kısıtları, esnek tercihler ve fırsatları karşılaştırmak için bir araştırma sırası.', ['M-INVESTMENT-FIT', 'M-BUDGET-ELIGIBILITY', 'M-OPPORTUNITY-COMPARISON', 'M-DECISION-REPORT']]
    ],
    regLab: 'Yöntem kaydı', regH: 'Yöntemler, kara kutu puanlar değil.', regP: 'Her analitik yöntem amacını, gerekli girdilerini, çıktısını, sınırlamalarını ve güncel durumunu açıklar. Ayrıntılar için bir yöntemi açın.',
    filt: { all: 'Tüm yöntemler', public: 'Desk’te gösterilen', control: 'Yayın kontrolleri', internal: 'İç analiz', inactive: 'Aktif olmayan' },
    stat: { public: 'Aktif · Desk’te gösterilir', control: 'Aktif kontrol · sonuç özel', internal: 'Yalnızca iç analiz', inactive: 'Şu anda aktif değil' },
    fld: { purpose: 'Amaç', inputs: 'Gerekli girdiler', output: 'Çıktı', limits: 'Sınırlamalar', status: 'Durum', pub: 'Yayın' },
    pub: { ALLOWED: 'Açık sayfada güvenli: Desk’te gösterilir', INTERNAL: 'Yalnızca iç kullanım: açık sayfalarda yer almaz', PROHIBITED_IN_MVP: 'Bu sürümde yayımlanmaz', BLOCKED_UNTIL_METHOD_APPROVED: 'Yöntem onaylanana kadar engelli' },
    regNote: 'Durumlar, site her oluşturulduğunda yöntem kaydından okunur. İç yöntemlerin girdileri ve sonuçları asla yayımlanmaz.',
    finLab: 'Finansal disiplin', finH: 'Getiriler hesaplanır, vaat edilmez.',
    finP: 'Finansal çıktılar; verilen fiyata, alım maliyetlerine, nakit akışı zamanlamasına, kira varsayımlarına, döviz kanıtına, enflasyona ve iskonto oranının gerekçesine bağlıdır. Önemli varsayımlar iç raporda görünür kalır.',
    fin: ['Yatırım getirisi', 'Net bugünkü değer', 'İç verim oranı', 'Senaryo analizi', 'Reel getiri', 'Yatırımcının para birimindeki getiri'],
    finNote: 'Bunlar özel analizde kullanılan hesaplama yöntemleridir, yayımlanan rakamlar değil. Girdiler yetersiz olduğunda sonuç “kullanılamaz” veya “desteklenmiyor” olarak gösterilir — asla tahminle doldurulmaz.',
    limLab: 'Sınırlamalar', limH: 'Sistemin iddia etmedikleri',
    lim: ['Garanti edilmiş getiri veya gelecekteki fiyatlar hakkında kesinlik yok.', 'Uygulanmış ve doğrulanmış bir değerleme yöntemi olmadan gerçeğe uygun değer iddiası yok.', 'Yöntemi aktif olmayan yerde sayısal risk veya likidite puanı yok.', 'Yalnızca bir karşılaştırma sırasına veya eksik kanıta dayalı yatırım tavsiyesi yok.', 'Hukuki, vergisel, değerleme veya diğer düzenlenmiş profesyonel danışmanlığın yerini tutmaz.'],
    govLab: 'Yönetişim', govH: 'Özel analiz. Kontrollü yayın.',
    govP: 'İç analiz ve açık içerik ayrı iş akışlarını izler. Bir pazar veya proje; kanıtları, izinleri, açıklamaları ve ilgili kapıları geçmeden yayımlanmaz.',
    pubH: 'Desk’te', pubL: ['Doğrulanmış proje ve geliştirici bilgileri', 'Konum ve teslim durumu', 'Önemli riskler ve açık noktalar', 'Bilgilerin dayandığı kaynaklar'],
    privH: 'Görüşmenizde', privL: ['Güncel fiyatlar ve ödeme planları', 'Bölgedeki emsal projeler', 'Varsayımları belirtilmiş finansal senaryolar', 'Hedeflerinize, bütçenize ve zaman planınıza uygunluk'],
    ctaH: 'Çıktının arkasındaki yöntemi anlayın.', ctaP: 'Pazar kapsamını, kanıt durumunu ve yayını yöneten kontrolleri inceleyin.', ctaBtn: 'Pazarları inceleyin', ctaAlt: 'Görüşme talep edin'
  },
  ar: {
    title: 'ذكاء الاستثمار | Nexus Intelligence Desk', desc: 'تعرّف على الأدلة والمنهجيات التحليلية والضوابط التي يقوم عليها Nexus Intelligence Desk — وما لا يدّعيه كل مُخرج.',
    eb: 'ذكاء الاستثمار', h1: 'ذكاء الاستثمار. <em>مبنيّ على الأدلة.</em>',
    lead: 'ينظّم Nexus Intelligence Desk أدلة السوق وبحث الأصول والتحليل المالي في مسار قرار قابل للتتبع.',
    tags: ['قائم على الأدلة', 'موجّه للقرار', 'قيود معلنة'],
    howLab: 'آلية العمل', howH: 'من الدليل إلى سجل القرار',
    how: [
      ['الجمع والتتبع', 'تسجيل المصدر والتاريخ والفترة والوحدة والموقع وحالة التحقق لكل ادعاء جوهري.'],
      ['تقييم الاكتمال والتعارضات', 'تحديد الأدلة الناقصة والادعاءات غير المتسقة والمصادر القديمة والأسئلة المعلّقة.'],
      ['تحليل الأصل وسياقه', 'تطبيق المنهجيات المدعومة على خصائص المشروع والأدلة المقارنة والتدفقات النقدية والمخاطر واعتبارات التخارج.'],
      ['اختبار ملاءمة المستثمر', 'التحقق أولاً من القيود الحاسمة مثل الميزانية، ثم تقييم التفضيلات بشكل منفصل.'],
      ['إعداد تقرير القرار', 'عرض النتائج والافتراضات والقيود والعوائق المعلّقة وخطوات الفحص التالية.'],
      ['ضبط ما يُنشر', 'تطبيق متطلبات الأدلة والقانون والإفصاح وأذونات الصور قبل نشر أي شيء.']
    ],
    domLab: 'مجالات التحليل', domH: 'نظرة منظّمة إلى مخاطر الاستثمار', domP: 'يسرد كل مجال المنهجيات التي يقوم عليها مع حالتها الحالية في سجل المنهجيات.',
    dom: [
      ['ذكاء السوق', 'نشاط السوق وسياق الأسعار وأدلة الاقتصاد الكلي، خلف بوابة خاصة بكل سوق.', ['M-MARKET-GATE', 'M-DOMAIN-ASSESSMENT', 'M-CONVERSION']],
      ['ذكاء الأحياء والمناطق', 'أدلة خاصة بالموقع والفروق الجغرافية، حيث تدعمها البيانات.', ['M-DOMAIN-ASSESSMENT', 'M-AREA-RANKING']],
      ['تقييم المشروع والأصل', 'خصائص المشروع المسجّلة وتصريحات المطوّر وفجوات الأدلة والمخاطر الخاصة بالأصل.', ['M-EVIDENCE', 'M-MISSING-DATA', 'M-RESEARCH-STATUS', 'M-ASSET-QUALITY']],
      ['التحليل المالي', 'التدفقات النقدية والعائد على الاستثمار وصافي القيمة الحالية ومعدل العائد الداخلي والسيناريوهات والتضخم وعرض العائد بعملة المستثمر، حيث تسمح المدخلات بالحساب.', ['M-CASHFLOW', 'M-ROI', 'M-NPV', 'M-RETURN-VIEWS', 'M-SCENARIOS', 'M-COMPARABLES', 'M-FAIR-VALUE']],
      ['مراجعة المخاطر والتخارج', 'توثيق نوعي للمخاطر واعتبارات السيولة وفحص التخارج.', ['M-RISK-LIST', 'M-EXIT-REVIEW', 'M-RISK-SEVERITY', 'M-LIQUIDITY']],
      ['ملاءمة المستثمر ومقارنة الفرص', 'قيود أهلية حاسمة وتفضيلات مرنة وترتيب بحث لمقارنة الفرص.', ['M-INVESTMENT-FIT', 'M-BUDGET-ELIGIBILITY', 'M-OPPORTUNITY-COMPARISON', 'M-DECISION-REPORT']]
    ],
    regLab: 'سجل المنهجيات', regH: 'منهجيات، لا تقييمات غامضة.', regP: 'تُفصح كل منهجية تحليلية عن غرضها ومدخلاتها المطلوبة ومُخرجها وقيودها وحالتها الحالية. افتح أي منهجية لقراءة تفاصيلها.',
    filt: { all: 'كل المنهجيات', public: 'تظهر على Desk', control: 'ضوابط النشر', internal: 'تحليل داخلي', inactive: 'غير مفعّلة' },
    stat: { public: 'نشطة · تظهر على Desk', control: 'ضابط نشط · النتيجة خاصة', internal: 'تحليل داخلي فقط', inactive: 'غير مفعّلة حالياً' },
    fld: { purpose: 'الغرض', inputs: 'المدخلات المطلوبة', output: 'المُخرج', limits: 'القيود', status: 'الحالة', pub: 'النشر' },
    pub: { ALLOWED: 'آمنة للنشر: تظهر على Desk', INTERNAL: 'داخلية فقط: لا تظهر في الصفحات العامة', PROHIBITED_IN_MVP: 'لا تُنشر في هذا الإصدار', BLOCKED_UNTIL_METHOD_APPROVED: 'محجوبة حتى اعتماد منهجية' },
    regNote: 'تُقرأ الحالات من سجل المنهجيات في كل مرة يُبنى فيها الموقع. ولا تُنشر مدخلات المنهجيات الداخلية ولا نتائجها أبداً.',
    finLab: 'الانضباط المالي', finH: 'العائدات تُحسب، ولا تُوعد.',
    finP: 'تعتمد المخرجات المالية على السعر المقدّم وتكاليف الشراء وتوقيت التدفقات وافتراضات الإيجار وأدلة الصرف والتضخم وأساس معدل الخصم. وتبقى الافتراضات الجوهرية ظاهرة في التقرير الداخلي.',
    fin: ['العائد على الاستثمار', 'صافي القيمة الحالية', 'معدل العائد الداخلي', 'تحليل السيناريوهات', 'العائد الحقيقي', 'العائد بعملة المستثمر'],
    finNote: 'هذه منهجيات حساب تُستخدم في التحليل الخاص، وليست أرقاماً منشورة. وحين تكون المدخلات غير كافية، تكون النتيجة «غير متاحة» أو «غير مدعومة» — ولا تُستبدل بتقدير أبداً.',
    limLab: 'القيود', limH: 'ما لا يدّعيه النظام',
    lim: ['لا عائدات مضمونة ولا يقين بشأن الأسعار المستقبلية.', 'لا ادعاء بالقيمة العادلة دون منهجية تقييم مطبّقة ومُتحقق منها.', 'لا تقييم رقمي للمخاطر أو السيولة حيث تكون المنهجية غير مفعّلة.', 'لا توصية استثمارية بناءً على ترتيب المقارنة وحده أو على أدلة ناقصة.', 'لا يغني عن المشورة القانونية أو الضريبية أو التقييمية أو غيرها من المشورة المهنية المنظّمة.'],
    govLab: 'الحوكمة', govH: 'تحليل خاص. نشر منضبط.',
    govP: 'يسير التحليل الداخلي والمحتوى العام في مسارين منفصلين. ولا يُنشر سوق أو مشروع حتى تجتاز أدلته وأذوناته وإفصاحاته والبوابات المطبّقة عليه.',
    pubH: 'على Desk', pubL: ['معلومات موثّقة عن المشروع والمطوّر', 'الموقع وحالة التسليم', 'المخاطر الجوهرية والنقاط المفتوحة', 'المصادر التي تستند إليها المعلومات'],
    privH: 'في استشارتك', privL: ['الأسعار الحالية وخطط الدفع', 'المشاريع المماثلة في المنطقة', 'سيناريوهات مالية بافتراضات معلنة', 'مدى الملاءمة لأهدافك وميزانيتك وإطارك الزمني'],
    ctaH: 'افهم المنهجية وراء المُخرج.', ctaP: 'استكشف تغطية الأسواق وحالة الأدلة والضوابط التي تحكم النشر.', ctaBtn: 'استكشف الأسواق', ctaAlt: 'اطلب استشارة'
  }
};

// Public state of a registry method (registry semantics, desk/data/methods.json note).
export const methodState = (m) => m.status === 'ACTIVE' ? (m.publication === 'ALLOWED' ? 'public' : 'control') : m.internal === 'ACTIVE' ? 'internal' : 'inactive';
