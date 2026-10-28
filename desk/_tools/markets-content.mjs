// Markets pages (EN/TR/AR): static copy and the renderer. Built by build.mjs from the public research records and the
// market-gate configuration MG-1 — the pages never state more than the records and the gate support.
import { evaluateMarketGate } from './engines/marketgate.mjs';

export const MKC = {
  en: {
    idxLab: 'Coverage', idxH: 'Three markets, one evidence standard',
    idxP: 'Istanbul, Dubai and Abu Dhabi are researched in parallel. Each market opens on its own, when its own gate passes and the owner approves it; no market waits for another.',
    cardStats: '{a} of {b} named statistics recorded', cardBlocks: '{a} of {b} research areas closed', cardDistricts: '{n} districts or communities under research', cardVerified: 'Verified against the official release: {n}',
    procLab: 'Process', procH: 'How a market opens and how projects are sourced',
    p1t: 'Official statistics', p1p: 'Named statistics per market from the official publishers (TÜİK, TCMB; DLD; ADREC, SCAD; CBUAE), each with period, unit, geography and a freshness limit.',
    p2t: 'Research areas', p2p: 'Market, macro and currency, developer registration, project registration and permits, risks, and district research — closure and data completeness recorded separately.',
    p3t: 'Statutory checks', p3p: 'Only the requirements that apply to Nexus Ways’ own activity in that market (agent authorization, advertising permits), recorded with the official reference.',
    p4t: 'Project permission', p4p: 'Each project is presented with the written permission of its sales office, within the channels, media and dates that permission states.',
    stLab: 'Status', stH: 'Market gate MG-1', stNot: 'Not passed — the market stays inactive', stPass: 'Passed', asOf: 'Assessed on the public research records of {d}',
    stStats: 'Named statistics', stStatsV: '{a} of {b} recorded · {v} verified against the official release',
    stBlocks: 'Research areas', stBlocksV: '{a} of {b} closed',
    stDist: 'District / community research', stDistV: '{a} closed of {n} under research (at least {m} required)',
    stLegal: 'Statutory checks', stLegalV: '{n} topics; recorded privately by the owner with official references — required before activation', stLegalDone: '{n} topics recorded privately; gate certificate of {d}',
    indLab: 'Indicators', indH: 'Market indicators as reported',
    indP: 'Figures below come from secondary sources that cite the official publisher. They are shown as reported and are not yet checked against the official release; the gate does not count them until they are.',
    thInd: 'Indicator', thVal: 'Value', thPer: 'Period', thSrc: 'Source', thSt: 'Status',
    notRec: 'Not yet recorded', notRecP: 'No statement is made until the official figure is recorded.', reported: 'Reported · official check pending', verified: 'Verified',
    covLab: 'Research', covH: 'Research coverage by area',
    dLab: 'Districts and communities', dH: 'Under research',
    dP: 'Listed in the order of recorded market activity where a count exists; this is research coverage, not an investment ranking. Each still needs location, supply, rental-demand and project-level research.',
    dNone: 'No district is recorded yet.', dNoneP: 'Current district-level data could not be obtained from the official tables in this research cycle; earlier private breakdowns are out of date and are not used.',
    dCount: '{n} sales transactions · {p} · as reported',
    reqLab: 'Before publication', reqH: 'What every project here must show',
    reqP: 'In addition to the Desk publication gate (verified identity, developer, evidence, risks, disclosures and approved images):',
    reqPerm: 'Written permission from the project’s sales office naming the Desk website, the project information and each image used.',
    legalH: 'Statutory checks for Nexus Ways in this market', fxH: 'Currency and dates',
    oppLab: 'Opportunities', scope: 'Scope', excluded: 'Excluded', admin: { DISTRICT: 'District', SUB_DISTRICT: 'Sub-district', COMMUNITY: 'Community (DLD / ADREC area)' },
    fx: { 'MKT-IST': 'Amounts are in TRY. A conversion is shown only at a dated CBRT indicative rate no older than 7 days; TRY figures over time need inflation context. No conversion is shown today.', 'MKT-DXB': 'Amounts are in AED. AED/USD at the CBUAE reference rate, confirmed from the central bank; other currencies only at a dated rate.', 'MKT-AUH': 'Amounts are in AED, recorded separately from Dubai so that neither market depends on the other’s evidence.' },
    asset: { 'MKT-IST': 'Residential units in identified projects in Istanbul province', 'MKT-DXB': 'Residential units in DLD-registered projects in the Emirate of Dubai', 'MKT-AUH': 'Residential units in ADREC-registered projects in the Emirate of Abu Dhabi (ADGM areas assessed separately)' },
    excl: 'Land, commercial units, short-term rental operations',
    topics: {
      'IST-AGENT-AUTHORIZATION': ['Brokerage authority certificate', 'No Istanbul opportunity is published until the certificate (or the licensed firm) is recorded.'],
      'IST-ONLINE-LISTING-RULES': ['Online listing rules (Ministry of Trade)', 'Applicability of the verified-listing rules to Desk pages to be recorded before publication.'],
      'IST-OFFPLAN-ADVERTISING': ['Advertising of off-plan housing', 'No off-plan or under-construction Istanbul project is published until the required statements are recorded.'],
      'DXB-AGENT-AUTHORIZATION': ['Broker registration (RERA/DLD)', 'No Dubai opportunity is published until the broker registration is recorded.'],
      'DXB-ADVERTISING-PERMIT': ['Advertising permit (Trakheesi)', 'Each Dubai opportunity needs its advertising-permit number, unless the review concludes it does not apply.'],
      'AUH-AGENT-AUTHORIZATION': ['Broker licence (ADREC/DMT)', 'No Abu Dhabi opportunity is published until the licence is recorded. Dubai registration does not apply.'],
      'AUH-LISTING-PERMIT': ['Listing permit (Madhmoun)', 'Each Abu Dhabi opportunity needs its Madhmoun number, unless the review concludes it does not apply. ADGM areas follow ADGM rules.']
    },
    reqs: {
      'IST-TITLE-STATUS': 'Title status from the land registry (TKGM)', 'IST-BUILDING-PERMIT': 'Building permit, for projects not yet completed',
      'DXB-PROJECT-REGISTRATION': 'DLD project registration and status', 'DXB-ESCROW-ACCOUNT': 'Escrow account, for off-plan projects', 'DXB-ADVERTISING-PERMIT': 'Advertising permit number for the page',
      'AUH-PROJECT-REGISTRATION': 'ADREC project registration and status', 'AUH-ESCROW-ACCOUNT': 'Escrow details, for off-plan projects', 'AUH-LISTING-PERMIT': 'Madhmoun listing permit number for the page'
    },
    stats: {
      'IST-HOUSING-SALES': 'House sales, Istanbul (monthly)', 'IST-FOREIGN-SALES': 'House sales to foreign nationals, Istanbul', 'IST-RPPI': 'Residential property price index, Istanbul (CBRT)', 'TR-CPI': 'Annual consumer inflation, Türkiye', 'TR-POLICY-RATE': 'CBRT policy rate', 'TR-FX-USDTRY': 'USD/TRY indicative rate (CBRT)',
      'DXB-SALES-TX': 'Sales transactions, Dubai (monthly)', 'DXB-OFFPLAN-SHARE': 'Off-plan share of sales, Dubai', 'DXB-CPI': 'Consumer inflation, Dubai', 'AE-BASE-RATE': 'CBUAE base rate', 'AE-FX-PEG': 'AED/USD reference rate (CBUAE)',
      'AUH-SALES-TX': 'Residential sales transactions, Abu Dhabi', 'AUH-PRICE-INDEX': 'ADREC sales price index (optional)', 'AUH-CPI': 'Consumer inflation, Abu Dhabi'
    }
  },
  tr: {
    idxLab: 'Kapsam', idxH: 'Üç pazar, tek kanıt standardı',
    idxP: 'İstanbul, Dubai ve Abu Dabi paralel olarak araştırılır. Her pazar, kendi kapısı geçildiğinde ve sahibi onayladığında ayrı açılır; hiçbir pazar diğerini beklemez.',
    cardStats: '{b} adlandırılmış istatistikten {a} tanesi kayıtlı', cardBlocks: '{b} araştırma alanından {a} tanesi kapandı', cardDistricts: '{n} ilçe veya bölge araştırılıyor', cardVerified: 'Resmî yayına göre doğrulanan: {n}',
    procLab: 'Süreç', procH: 'Bir pazar nasıl açılır, projeler nasıl seçilir',
    p1t: 'Resmî istatistikler', p1p: 'Her pazar için resmî yayıncılardan (TÜİK, TCMB; DLD; ADREC, SCAD; CBUAE) adlandırılmış istatistikler; dönem, birim, coğrafya ve tazelik sınırıyla.',
    p2t: 'Araştırma alanları', p2p: 'Pazar, makro ve döviz, geliştirici kaydı, proje kaydı ve izinler, riskler ve ilçe araştırması — kapanış ve veri bütünlüğü ayrı kaydedilir.',
    p3t: 'Yasal kontroller', p3p: 'Yalnızca Nexus Ways’in o pazardaki kendi faaliyetine uygulanan koşullar (aracı yetkisi, reklam izinleri), resmî referansıyla kaydedilir.',
    p4t: 'Proje izni', p4p: 'Her proje, satış ofisinin yazılı izniyle ve bu iznin belirttiği kanallar, görseller ve tarihler içinde sunulur.',
    stLab: 'Durum', stH: 'Pazar kapısı MG-1', stNot: 'Geçilmedi — pazar pasif kalır', stPass: 'Geçildi', asOf: '{d} tarihli kamuya açık araştırma kayıtlarına göre değerlendirildi',
    stStats: 'Adlandırılmış istatistikler', stStatsV: '{b} istatistikten {a} tanesi kayıtlı · resmî yayına göre doğrulanan {v}',
    stBlocks: 'Araştırma alanları', stBlocksV: '{b} alandan {a} tanesi kapandı',
    stDist: 'İlçe / bölge araştırması', stDistV: 'Araştırılan {n} bölgeden {a} tanesi kapandı (en az {m} gerekli)',
    stLegal: 'Yasal kontroller', stLegalV: '{n} konu; sahibi tarafından resmî referanslarla gizli kayıtta tutulur — aktifleştirmeden önce zorunlu', stLegalDone: '{n} konu gizli kayıtta; {d} tarihli kapı sertifikası',
    indLab: 'Göstergeler', indH: 'Aktarıldığı şekliyle pazar göstergeleri',
    indP: 'Aşağıdaki rakamlar resmî yayıncıya atıf yapan ikincil kaynaklardandır. Aktarıldığı şekliyle gösterilir ve henüz resmî yayına göre kontrol edilmedi; kontrol edilene kadar kapı bunları saymaz.',
    thInd: 'Gösterge', thVal: 'Değer', thPer: 'Dönem', thSrc: 'Kaynak', thSt: 'Durum',
    notRec: 'Henüz kayıtlı değil', notRecP: 'Resmî rakam kaydedilene kadar bir ifade kullanılmaz.', reported: 'Aktarıldı · resmî kontrol bekliyor', verified: 'Doğrulandı',
    covLab: 'Araştırma', covH: 'Alanlara göre araştırma kapsamı',
    dLab: 'İlçeler ve bölgeler', dH: 'Araştırılanlar',
    dP: 'Sayı bulunan yerlerde kayıtlı pazar hareketine göre sıralanmıştır; bu bir yatırım sıralaması değil, araştırma kapsamıdır. Her biri için konum, arz, kira talebi ve proje düzeyi araştırma gerekir.',
    dNone: 'Henüz kayıtlı ilçe yok.', dNoneP: 'Bu araştırma döneminde güncel ilçe düzeyi veri resmî tablolardan alınamadı; daha eski özel dağılımlar güncel değildir ve kullanılmaz.',
    dCount: '{n} satış işlemi · {p} · aktarıldığı şekliyle',
    reqLab: 'Yayından önce', reqH: 'Buradaki her projenin göstermesi gerekenler',
    reqP: 'Desk yayın kapısına (doğrulanmış kimlik, geliştirici, kanıt, riskler, açıklamalar ve onaylı görseller) ek olarak:',
    reqPerm: 'Projenin satış ofisinden; Desk web sitesini, proje bilgilerini ve kullanılan her görseli belirten yazılı izin.',
    legalH: 'Bu pazarda Nexus Ways için yasal kontroller', fxH: 'Para birimi ve tarihler',
    oppLab: 'Fırsatlar', scope: 'Kapsam', excluded: 'Kapsam dışı', admin: { DISTRICT: 'İlçe', SUB_DISTRICT: 'Mahalle', COMMUNITY: 'Bölge (DLD / ADREC alanı)' },
    fx: { 'MKT-IST': 'Tutarlar TL’dir. Dönüşüm yalnızca 7 günden eski olmayan, tarihli bir TCMB gösterge kuruyla gösterilir; zaman içindeki TL rakamları enflasyon bağlamı gerektirir. Bugün dönüşüm gösterilmez.', 'MKT-DXB': 'Tutarlar AED’dir. AED/USD, merkez bankasından teyit edilen CBUAE referans kuruyla; diğer para birimleri yalnızca tarihli bir kurla.', 'MKT-AUH': 'Tutarlar AED’dir; hiçbir pazar diğerinin kanıtına dayanmasın diye Dubai’den ayrı kaydedilir.' },
    asset: { 'MKT-IST': 'İstanbul ilindeki belirli projelerde konut birimleri', 'MKT-DXB': 'Dubai Emirliği’nde DLD’ye kayıtlı projelerde konut birimleri', 'MKT-AUH': 'Abu Dabi Emirliği’nde ADREC’e kayıtlı projelerde konut birimleri (ADGM bölgeleri ayrıca değerlendirilir)' },
    excl: 'Arsa, ticari birimler, kısa süreli kiralama işletmeleri',
    topics: {
      'IST-AGENT-AUTHORIZATION': ['Taşınmaz ticareti yetki belgesi', 'Belge (veya yetkili firma) kaydedilene kadar İstanbul’da fırsat yayımlanmaz.'],
      'IST-ONLINE-LISTING-RULES': ['İnternet ilan kuralları (Ticaret Bakanlığı)', 'Doğrulanmış ilan kurallarının Desk sayfalarına uygulanıp uygulanmadığı yayından önce kaydedilecek.'],
      'IST-OFFPLAN-ADVERTISING': ['Ön ödemeli konut reklamı', 'Gerekli ifadeler kaydedilene kadar proje aşamasındaki veya inşaatı süren İstanbul projeleri yayımlanmaz.'],
      'DXB-AGENT-AUTHORIZATION': ['Aracı kaydı (RERA/DLD)', 'Aracı kaydı kaydedilene kadar Dubai’de fırsat yayımlanmaz.'],
      'DXB-ADVERTISING-PERMIT': ['Reklam izni (Trakheesi)', 'İnceleme uygulanmadığı sonucuna varmadıkça her Dubai fırsatı için reklam izni numarası gerekir.'],
      'AUH-AGENT-AUTHORIZATION': ['Aracı lisansı (ADREC/DMT)', 'Lisans kaydedilene kadar Abu Dabi’de fırsat yayımlanmaz. Dubai kaydı geçerli değildir.'],
      'AUH-LISTING-PERMIT': ['İlan izni (Madhmoun)', 'İnceleme uygulanmadığı sonucuna varmadıkça her Abu Dabi fırsatı için Madhmoun numarası gerekir. ADGM bölgeleri ADGM kurallarına tabidir.']
    },
    reqs: {
      'IST-TITLE-STATUS': 'Tapu (TKGM) kayıtlarından tapu durumu', 'IST-BUILDING-PERMIT': 'Tamamlanmamış projeler için yapı ruhsatı',
      'DXB-PROJECT-REGISTRATION': 'DLD proje kaydı ve durumu', 'DXB-ESCROW-ACCOUNT': 'Off-plan projeler için emanet hesabı', 'DXB-ADVERTISING-PERMIT': 'Sayfa için reklam izni numarası',
      'AUH-PROJECT-REGISTRATION': 'ADREC proje kaydı ve durumu', 'AUH-ESCROW-ACCOUNT': 'Off-plan projeler için emanet bilgileri', 'AUH-LISTING-PERMIT': 'Sayfa için Madhmoun ilan izni numarası'
    },
    stats: {
      'IST-HOUSING-SALES': 'Konut satışları, İstanbul (aylık)', 'IST-FOREIGN-SALES': 'Yabancılara konut satışları, İstanbul', 'IST-RPPI': 'Konut fiyat endeksi, İstanbul (TCMB)', 'TR-CPI': 'Yıllık tüketici enflasyonu, Türkiye', 'TR-POLICY-RATE': 'TCMB politika faizi', 'TR-FX-USDTRY': 'USD/TRY gösterge kuru (TCMB)',
      'DXB-SALES-TX': 'Satış işlemleri, Dubai (aylık)', 'DXB-OFFPLAN-SHARE': 'Off-plan satış payı, Dubai', 'DXB-CPI': 'Tüketici enflasyonu, Dubai', 'AE-BASE-RATE': 'CBUAE politika faizi', 'AE-FX-PEG': 'AED/USD referans kuru (CBUAE)',
      'AUH-SALES-TX': 'Konut satış işlemleri, Abu Dabi', 'AUH-PRICE-INDEX': 'ADREC satış fiyat endeksi (isteğe bağlı)', 'AUH-CPI': 'Tüketici enflasyonu, Abu Dabi'
    }
  },
  ar: {
    idxLab: 'التغطية', idxH: 'ثلاثة أسواق ومعيار أدلة واحد',
    idxP: 'تُبحث إسطنبول ودبي وأبوظبي بالتوازي. يُفتح كل سوق وحده عندما تجتاز بوابته الخاصة ويوافق المالك؛ ولا ينتظر أي سوق غيره.',
    cardStats: '{a} من {b} إحصاءات محددة مسجّلة', cardBlocks: '{a} من {b} مجالات بحث مغلقة', cardDistricts: '{n} من الأحياء أو المجتمعات قيد البحث', cardVerified: 'المتحقق منها مقابل الإصدار الرسمي: {n}',
    procLab: 'المنهجية', procH: 'كيف يُفتح السوق وكيف تُختار المشاريع',
    p1t: 'إحصاءات رسمية', p1p: 'إحصاءات محددة لكل سوق من الجهات الرسمية (معهد الإحصاء التركي، البنك المركزي التركي؛ دائرة الأراضي والأملاك؛ مركز أبوظبي العقاري، مركز الإحصاء؛ مصرف الإمارات المركزي)، مع الفترة والوحدة والنطاق الجغرافي وحد الحداثة.',
    p2t: 'مجالات البحث', p2p: 'السوق، والاقتصاد الكلي والعملة، وتسجيل المطوّرين، وتسجيل المشاريع والتصاريح، والمخاطر، وبحث الأحياء — يُسجَّل إغلاق البحث واكتمال البيانات كلٌّ على حدة.',
    p3t: 'الفحوص القانونية', p3p: 'المتطلبات التي تنطبق على نشاط Nexus Ways نفسه في ذلك السوق فقط (ترخيص الوساطة، تصاريح الإعلان)، مسجّلة بمرجعها الرسمي.',
    p4t: 'إذن المشروع', p4p: 'يُعرض كل مشروع بإذن كتابي من مكتب مبيعاته، وضمن القنوات والصور والتواريخ التي يحددها ذلك الإذن.',
    stLab: 'الحالة', stH: 'بوابة السوق MG-1', stNot: 'لم تُجتز — يبقى السوق غير نشط', stPass: 'اجتيزت', asOf: 'قُيّمت على سجلات البحث العامة بتاريخ {d}',
    stStats: 'الإحصاءات المحددة', stStatsV: '{a} من {b} مسجّلة · {v} متحقق منها مقابل الإصدار الرسمي',
    stBlocks: 'مجالات البحث', stBlocksV: '{a} من {b} مغلقة',
    stDist: 'بحث الأحياء / المجتمعات', stDistV: '{a} مغلقة من {n} قيد البحث (الحد الأدنى {m})',
    stLegal: 'الفحوص القانونية', stLegalV: '{n} مواضيع؛ يسجّلها المالك بشكل خاص مع المراجع الرسمية — مطلوبة قبل التفعيل', stLegalDone: '{n} مواضيع مسجّلة بشكل خاص؛ شهادة البوابة بتاريخ {d}',
    indLab: 'المؤشرات', indH: 'مؤشرات السوق كما نُقلت',
    indP: 'الأرقام أدناه من مصادر ثانوية تستند إلى الجهة الرسمية. تُعرض كما نُقلت ولم تُراجع بعد مقابل الإصدار الرسمي؛ ولا تحتسبها البوابة حتى تتم مراجعتها.',
    thInd: 'المؤشر', thVal: 'القيمة', thPer: 'الفترة', thSrc: 'المصدر', thSt: 'الحالة',
    notRec: 'لم يُسجَّل بعد', notRecP: 'لا يُذكر أي بيان حتى يُسجَّل الرقم الرسمي.', reported: 'منقول · بانتظار المراجعة الرسمية', verified: 'متحقق منه',
    covLab: 'البحث', covH: 'تغطية البحث حسب المجال',
    dLab: 'الأحياء والمجتمعات', dH: 'قيد البحث',
    dP: 'مرتبة حسب النشاط المسجّل حيث يتوفر عدد؛ هذه تغطية بحثية وليست تصنيفاً استثمارياً. كل منها يحتاج بعد إلى بحث في الموقع والعرض والطلب الإيجاري وعلى مستوى المشروع.',
    dNone: 'لا توجد أحياء مسجّلة بعد.', dNoneP: 'تعذّر الحصول على بيانات حديثة على مستوى الأحياء من الجداول الرسمية في دورة البحث هذه؛ التوزيعات الخاصة الأقدم قديمة ولا تُستخدم.',
    dCount: '{n} معاملة بيع · {p} · كما نُقل',
    reqLab: 'قبل النشر', reqH: 'ما يجب أن يقدّمه كل مشروع هنا',
    reqP: 'إضافةً إلى بوابة النشر في Desk (هوية متحقق منها، والمطوّر، والأدلة، والمخاطر، والإفصاحات، والصور المعتمدة):',
    reqPerm: 'إذن كتابي من مكتب مبيعات المشروع يسمّي موقع Desk ومعلومات المشروع وكل صورة مستخدمة.',
    legalH: 'الفحوص القانونية لـ Nexus Ways في هذا السوق', fxH: 'العملة والتواريخ',
    oppLab: 'الفرص', scope: 'النطاق', excluded: 'خارج النطاق', admin: { DISTRICT: 'حي', SUB_DISTRICT: 'حي فرعي', COMMUNITY: 'مجتمع (منطقة دائرة الأراضي / المركز العقاري)' },
    fx: { 'MKT-IST': 'المبالغ بالليرة التركية. لا يُعرض تحويل إلا بسعر استرشادي مؤرخ من البنك المركزي التركي لا يتجاوز عمره 7 أيام؛ وأرقام الليرة عبر الزمن تحتاج إلى سياق التضخم. لا يُعرض أي تحويل اليوم.', 'MKT-DXB': 'المبالغ بالدرهم. الدرهم مقابل الدولار بالسعر المرجعي لمصرف الإمارات المركزي المؤكَّد منه؛ والعملات الأخرى بسعر مؤرخ فقط.', 'MKT-AUH': 'المبالغ بالدرهم، وتُسجَّل بشكل منفصل عن دبي حتى لا يعتمد أي سوق على أدلة الآخر.' },
    asset: { 'MKT-IST': 'وحدات سكنية في مشاريع محددة في ولاية إسطنبول', 'MKT-DXB': 'وحدات سكنية في مشاريع مسجّلة لدى دائرة الأراضي والأملاك في إمارة دبي', 'MKT-AUH': 'وحدات سكنية في مشاريع مسجّلة لدى مركز أبوظبي العقاري في إمارة أبوظبي (تُقيَّم مناطق سوق أبوظبي العالمي بشكل منفصل)' },
    excl: 'الأراضي، والوحدات التجارية، وتشغيل الإيجار قصير الأجل',
    topics: {
      'IST-AGENT-AUTHORIZATION': ['شهادة ترخيص الوساطة العقارية', 'لا تُنشر أي فرصة في إسطنبول حتى تُسجَّل الشهادة (أو الشركة المرخّصة).'],
      'IST-ONLINE-LISTING-RULES': ['قواعد الإعلانات الإلكترونية (وزارة التجارة)', 'يُسجَّل مدى انطباق قواعد الإعلانات الموثّقة على صفحات Desk قبل النشر.'],
      'IST-OFFPLAN-ADVERTISING': ['الإعلان عن المساكن على الخارطة', 'لا يُنشر أي مشروع على الخارطة أو قيد الإنشاء في إسطنبول حتى تُسجَّل البيانات المطلوبة.'],
      'DXB-AGENT-AUTHORIZATION': ['تسجيل الوسيط (ريرا/دائرة الأراضي)', 'لا تُنشر أي فرصة في دبي حتى يُسجَّل تسجيل الوسيط.'],
      'DXB-ADVERTISING-PERMIT': ['تصريح الإعلان (ترخيصي)', 'تحتاج كل فرصة في دبي إلى رقم تصريح إعلان، ما لم تخلص المراجعة إلى عدم انطباقه.'],
      'AUH-AGENT-AUTHORIZATION': ['رخصة الوسيط (مركز أبوظبي العقاري/دائرة البلديات والنقل)', 'لا تُنشر أي فرصة في أبوظبي حتى تُسجَّل الرخصة. تسجيل دبي لا يسري.'],
      'AUH-LISTING-PERMIT': ['تصريح الإعلان «مضمون»', 'تحتاج كل فرصة في أبوظبي إلى رقم «مضمون»، ما لم تخلص المراجعة إلى عدم انطباقه. مناطق سوق أبوظبي العالمي تتبع قواعده.']
    },
    reqs: {
      'IST-TITLE-STATUS': 'حالة سند الملكية من سجل الطابو (TKGM)', 'IST-BUILDING-PERMIT': 'رخصة البناء، للمشاريع غير المكتملة',
      'DXB-PROJECT-REGISTRATION': 'تسجيل المشروع وحالته لدى دائرة الأراضي والأملاك', 'DXB-ESCROW-ACCOUNT': 'حساب الضمان، للمشاريع على الخارطة', 'DXB-ADVERTISING-PERMIT': 'رقم تصريح الإعلان للصفحة',
      'AUH-PROJECT-REGISTRATION': 'تسجيل المشروع وحالته لدى مركز أبوظبي العقاري', 'AUH-ESCROW-ACCOUNT': 'تفاصيل الضمان، للمشاريع على الخارطة', 'AUH-LISTING-PERMIT': 'رقم تصريح «مضمون» للصفحة'
    },
    stats: {
      'IST-HOUSING-SALES': 'مبيعات المساكن، إسطنبول (شهري)', 'IST-FOREIGN-SALES': 'مبيعات المساكن للأجانب، إسطنبول', 'IST-RPPI': 'مؤشر أسعار العقارات السكنية، إسطنبول', 'TR-CPI': 'التضخم السنوي لأسعار المستهلك، تركيا', 'TR-POLICY-RATE': 'سعر الفائدة الرئيسي للبنك المركزي التركي', 'TR-FX-USDTRY': 'السعر الاسترشادي للدولار مقابل الليرة',
      'DXB-SALES-TX': 'معاملات البيع، دبي (شهري)', 'DXB-OFFPLAN-SHARE': 'حصة البيع على الخارطة، دبي', 'DXB-CPI': 'تضخم أسعار المستهلك، دبي', 'AE-BASE-RATE': 'سعر الأساس لمصرف الإمارات المركزي', 'AE-FX-PEG': 'السعر المرجعي للدرهم مقابل الدولار',
      'AUH-SALES-TX': 'معاملات البيع السكنية، أبوظبي', 'AUH-PRICE-INDEX': 'مؤشر أسعار المبيعات (اختياري)', 'AUH-CPI': 'تضخم أسعار المستهلك، أبوظبي'
    }
  }
};

// Coverage of one market, from the public records only (no private review records → statutory checks never pass here).
export function marketCoverage(cfg, m, data) {
  const asOf = m.last_reviewed || '2026-10-28';
  // an activated market carries a gate certificate (the private statutory records are attested there, D11/D12)
  const certified = !!(m.gate_certificate && m.gate_certificate.gate_version === cfg.version && m.review && m.review.gate_version === cfg.version && m.activation === 'ACTIVE');
  const g = evaluateMarketGate(cfg, m.id, data, { today: asOf, reviews: [], skipReviews: certified });
  const mc = cfg.markets[m.id];
  const ev = (k) => data.evidence.filter(e => e.subject && e.subject.type === 'market' && e.subject.id === m.id && e.topic === k);
  const stats = mc.statistics.map(s => ({ key: s.key, required: s.required, unit: s.unit, ev: ev(s.key).sort((a, b) => String(b.period).localeCompare(String(a.period)))[0] || null, pass: (g.statistics.find(x => x.key === s.key) || {}).status === 'PASS' }));
  const blocks = g.blocks.filter(b => !b.item.startsWith('DST-'));
  const dists = data.districts.filter(d => d.market_id === m.id);
  return { g, asOf, certified, cert: certified ? m.gate_certificate : null, stats, recorded: stats.filter(s => s.ev).length, verified: stats.filter(s => s.pass).length, blocks, closed: blocks.filter(b => b.ok).length,
    dists, distClosed: g.blocks.filter(b => b.item.startsWith('DST-') && b.ok).length, minDist: mc.districts.min_closed, topics: mc.regulatory_review.topics, reqs: mc.publication.opportunity_requirements };
}
