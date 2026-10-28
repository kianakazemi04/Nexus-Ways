// Engine 8 — Client brief (method contract M-CLIENT-BRIEF, version CBR-1). Private: sent to one prospective buyer or
// investor with the project catalogue, never published. Built only from a decision report (RPT-1), so it can say nothing
// the report cannot support. Plain language in EN/TR/AR; sources are named instead of internal record IDs; developer
// statements are kept apart from verified facts; figures are conditional on stated assumptions; no score, ranking or
// recommendation to buy; it always ends with the standard commission and not-advice texts.
import fs from 'node:fs';
import { OVERVIEW, PUBLISHERS } from '../markets-content.mjs';

export const CBR_VERSION = 'CBR-1';
const STD = (() => { try { return JSON.parse(fs.readFileSync(new URL('../disclosures/standard.json', import.meta.url), 'utf8')).templates; } catch { return []; } })();

const T = {
  en: { title: 'Investor brief', finNA: 'Not yet available: the financial inputs for this project are incomplete.', conf: 'Confidential — prepared for you by Nexus Ways. Not for publication or onward distribution.', prepared: 'Prepared on', glance: 'At a glance',
    verified: 'What we have verified', claims: 'What the developer states (not independently verified)', gaps: 'Not yet available', none: 'None.', src: 'source',
    position: 'Price against comparable sales', fin: 'Financial view (illustrative)', finNote: 'Conditional on the assumptions listed below; not a forecast or a guarantee. ROI is the total over the holding period; IRR is an annual rate.',
    scen: { base: 'Base', adverse: 'Adverse', favourable: 'Favourable' }, cols: ['Scenario', 'ROI (total, {n})', 'IRR / year ({n})', 'IRR / year, real', 'IRR / year, in {c}'], assumptions: 'Main assumptions',
    risks: 'Main risks and how to manage them', sev: { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', NOT_ASSESSED: 'Not yet assessed' }, mit: 'Mitigation',
    market: 'Market context (official figures)', role: 'Our role', na: 'not available',
    band: { BELOW_RANGE: 'below the range of comparable sales', LOWER_HALF: 'in the lower half of the range of comparable sales', UPPER_HALF: 'in the upper half of the range of comparable sales', ABOVE_RANGE: 'above the range of comparable sales' },
    posLine: 'The asking price per m² is {b} ({d} against the median of {n} comparable {t} prices). This is a comparison, not a valuation.',
    posNA: 'Not enough comparable sales were available to place the price.', ptype: { ASKING: 'asking', TRANSACTION: 'transaction', VALUATION: 'valuation' },
    fields: { name: 'Project', developer_id: 'Developer', district_id: 'Location', delivery_status: 'Status', expected_delivery: 'Expected delivery', asset_types: 'Property types', unit_type: 'Layout', gross_area_m2: 'Gross area (m²)', net_area_m2: 'Net area (m²)', legal_entity_name: 'Developer (legal entity)', title_status: 'Title status' } },
  tr: { title: 'Yatırımcı özeti', finNA: 'Henüz mevcut değil: bu proje için finansal girdiler eksik.', conf: 'Gizli — Nexus Ways tarafından size özel hazırlanmıştır. Yayımlanamaz ve başkalarıyla paylaşılamaz.', prepared: 'Hazırlanma tarihi', glance: 'Bir bakışta',
    verified: 'Doğruladıklarımız', claims: 'Geliştiricinin beyanları (bağımsız olarak doğrulanmadı)', gaps: 'Henüz mevcut olmayanlar', none: 'Yok.', src: 'kaynak',
    position: 'Benzer satışlara göre fiyat', fin: 'Finansal görünüm (örnek niteliğinde)', finNote: 'Aşağıdaki varsayımlara bağlıdır; tahmin veya garanti değildir. ROI, elde tutma süresi boyunca toplamdır; IRR yıllık orandır.',
    scen: { base: 'Temel', adverse: 'Olumsuz', favourable: 'Olumlu' }, cols: ['Senaryo', 'ROI (toplam, {n})', 'IRR / yıl ({n})', 'IRR / yıl, reel', 'IRR / yıl, {c} cinsinden'], assumptions: 'Başlıca varsayımlar',
    risks: 'Başlıca riskler ve yönetimi', sev: { HIGH: 'Yüksek', MEDIUM: 'Orta', LOW: 'Düşük', NOT_ASSESSED: 'Henüz değerlendirilmedi' }, mit: 'Önlem',
    market: 'Pazar bağlamı (resmî rakamlar)', role: 'Rolümüz', na: 'mevcut değil',
    band: { BELOW_RANGE: 'benzer satışların aralığının altında', LOWER_HALF: 'benzer satışların aralığının alt yarısında', UPPER_HALF: 'benzer satışların aralığının üst yarısında', ABOVE_RANGE: 'benzer satışların aralığının üstünde' },
    posLine: 'm² başına istenen fiyat {b} (benzer {n} {t} fiyatının medyanına göre {d}). Bu bir karşılaştırmadır, değerleme değildir.',
    posNA: 'Fiyatı konumlandırmak için yeterli benzer satış bulunamadı.', ptype: { ASKING: 'ilan', TRANSACTION: 'işlem', VALUATION: 'değerleme' },
    fields: { name: 'Proje', developer_id: 'Geliştirici', district_id: 'Konum', delivery_status: 'Durum', expected_delivery: 'Beklenen teslim', asset_types: 'Mülk türleri', unit_type: 'Oda düzeni', gross_area_m2: 'Brüt alan (m²)', net_area_m2: 'Net alan (m²)', legal_entity_name: 'Geliştirici (tüzel kişi)', title_status: 'Tapu durumu' } },
  ar: { title: 'ملخص للمستثمر', finNA: 'غير متاح بعد: المدخلات المالية لهذا المشروع غير مكتملة.', conf: 'سري — أعدّته Nexus Ways لك خصيصاً. غير مخصص للنشر أو لإعادة التوزيع.', prepared: 'تاريخ الإعداد', glance: 'نظرة سريعة',
    verified: 'ما تحققنا منه', claims: 'ما يذكره المطوّر (دون تحقق مستقل)', gaps: 'غير متاح بعد', none: 'لا شيء.', src: 'المصدر',
    position: 'السعر مقارنةً بالمبيعات المماثلة', fin: 'النظرة المالية (توضيحية)', finNote: 'تعتمد على الافتراضات المذكورة أدناه، وليست توقعاً ولا ضماناً. العائد على الاستثمار إجمالي لفترة الاحتفاظ؛ ومعدل العائد الداخلي معدل سنوي.',
    scen: { base: 'الأساسي', adverse: 'السلبي', favourable: 'الإيجابي' }, cols: ['السيناريو', 'العائد (إجمالي، {n})', 'المعدل الداخلي / سنة ({n})', 'المعدل الداخلي / سنة، حقيقي', 'المعدل الداخلي / سنة، بـ {c}'], assumptions: 'أهم الافتراضات',
    risks: 'أهم المخاطر وكيفية إدارتها', sev: { HIGH: 'مرتفع', MEDIUM: 'متوسط', LOW: 'منخفض', NOT_ASSESSED: 'لم يُقيَّم بعد' }, mit: 'التخفيف',
    market: 'سياق السوق (أرقام رسمية)', role: 'دورنا', na: 'غير متاح',
    band: { BELOW_RANGE: 'أدنى من نطاق المبيعات المماثلة', LOWER_HALF: 'في النصف الأدنى من نطاق المبيعات المماثلة', UPPER_HALF: 'في النصف الأعلى من نطاق المبيعات المماثلة', ABOVE_RANGE: 'أعلى من نطاق المبيعات المماثلة' },
    posLine: 'سعر المتر المربع المطلوب {b} ({d} مقارنةً بوسيط {n} من أسعار {t} المماثلة). هذه مقارنة وليست تقييماً.',
    posNA: 'لم تتوفر مبيعات مماثلة كافية لتحديد موقع السعر.', ptype: { ASKING: 'العرض', TRANSACTION: 'المعاملات', VALUATION: 'التقييم' },
    fields: { name: 'المشروع', developer_id: 'المطوّر', district_id: 'الموقع', delivery_status: 'الحالة', expected_delivery: 'التسليم المتوقع', asset_types: 'أنواع العقارات', unit_type: 'التقسيم', gross_area_m2: 'المساحة الإجمالية (م²)', net_area_m2: 'المساحة الصافية (م²)', legal_entity_name: 'المطوّر (الكيان القانوني)', title_status: 'حالة الملكية' } }
};
const LOC = { en: 'en-GB', tr: 'tr-TR', ar: 'ar-u-nu-latn' };
// Enumerated values shown to a client in plain words.
const E = {
  en: { UNDER_CONSTRUCTION: 'Under construction', COMPLETED: 'Completed', OFF_PLAN: 'Off-plan', READY: 'Ready', PLANNED: 'Planned', APARTMENT: 'Apartment', VILLA: 'Villa', TOWNHOUSE: 'Townhouse', PENTHOUSE: 'Penthouse', DUPLEX: 'Duplex', STUDIO: 'Studio', OFFICE: 'Office', RETAIL: 'Retail', LAND: 'Land' },
  tr: { UNDER_CONSTRUCTION: 'İnşaat hâlinde', COMPLETED: 'Tamamlandı', OFF_PLAN: 'Projeden', READY: 'Hazır', PLANNED: 'Planlanıyor', APARTMENT: 'Daire', VILLA: 'Villa', TOWNHOUSE: 'Sıra ev', PENTHOUSE: 'Çatı katı', DUPLEX: 'Dubleks', STUDIO: 'Stüdyo', OFFICE: 'Ofis', RETAIL: 'Dükkân', LAND: 'Arsa' },
  ar: { UNDER_CONSTRUCTION: 'قيد الإنشاء', COMPLETED: 'مكتمل', OFF_PLAN: 'على الخارطة', READY: 'جاهز', PLANNED: 'مخطط له', APARTMENT: 'شقة', VILLA: 'فيلا', TOWNHOUSE: 'تاون هاوس', PENTHOUSE: 'بنتهاوس', DUPLEX: 'دوبلكس', STUDIO: 'استوديو', OFFICE: 'مكتب', RETAIL: 'محل تجاري', LAND: 'أرض' }
};

// report: decisionReport() result; lang: en|tr|ar; names: { [recordId]: display name } for IDs that appear as values
export function clientBrief(report, lang = 'en', { names = {}, marketId = null } = {}) {
  if (!report || report.status !== 'OK') return { status: 'UNAVAILABLE', version: CBR_VERSION, reason: 'decision report unavailable' };
  const t = T[lang] || T.en; const loc = LOC[lang] || LOC.en;
  const pc = (v) => typeof v === 'number' ? `${v > 0 ? '+' : ''}${new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }).format(v * 100)}%` : t.na;
  const fmtD = (d) => { try { return new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z')); } catch { return d; } };
  const val = (v) => Array.isArray(v) ? v.map(val).join(', ') : typeof v === 'string' && names[v] ? names[v] : typeof v === 'string' && /^[A-Z][A-Z_]+$/.test(v) ? human(v) : typeof v === 'number' ? new Intl.NumberFormat(loc).format(v) : String(v);
  const fl = (f, subj) => (f === 'name' && /^developer /.test(subj || '') ? t.fields.developer_id : f === 'name' && /^asset /.test(subj || '') ? t.fields.unit_type : t.fields[f]) || f.replace(/_/g, ' ');
  const ENUM = E[lang] || E.en;
  const human = (v) => typeof v === 'string' && /^[A-Z][A-Z_]+$/.test(v) ? (ENUM[v] || v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ')) : v;
  const seen = new Set(); const once = (k) => (seen.has(k) ? false : (seen.add(k), true));
  const L = [];
  L.push(`# ${report.overview.project ? report.overview.project.replace(/\s*\([^)]*\)$/, '') : report.opportunity} — ${t.title}`, '', `*${t.conf}*`, '', `${t.prepared}: ${fmtD(report.generated_for)}`, '');

  // facts split: verified vs developer statement vs not available (one line per field, sources by name)
  const verified = []; const claims = []; const gaps = [];
  for (const f of report.facts) {
    if (f.value === null) { if (once(`gap|${fl(f.field, f.subject)}`)) gaps.push(`- ${fl(f.field, f.subject)}`); continue; }
    if (!once(`${fl(f.field, f.subject)}|${val(f.value)}`)) continue;
    const est = f.evidence.filter(e => e.label === 'FACT (verified)'); const dc = f.evidence.filter(e => /DEVELOPER-CLAIM/.test(e.label));
    if (est.length) verified.push(`- **${fl(f.field, f.subject)}:** ${val(f.value)} — ${t.src}: ${[...new Set(est.map(e => e.source))].join('; ')}`);
    else if (dc.length) claims.push(`- **${fl(f.field, f.subject)}:** ${val(f.value)} — ${t.src}: ${[...new Set(dc.map(e => e.source))].join('; ')}`);
  }
  L.push(`## ${t.verified}`, '', ...(verified.length ? verified : [t.none]), '', `## ${t.claims}`, '', ...(claims.length ? claims : [t.none]), '', `## ${t.gaps}`, '', ...(gaps.length ? gaps : [t.none]), '');

  // price position
  if (report.position && report.position.status !== 'INACTIVE') {
    L.push(`## ${t.position}`, '');
    const p = report.position;
    L.push(p.status === 'OK' ? t.posLine.replace('{b}', t.band[p.band]).replace('{d}', pc(p.vs_median)).replace('{n}', String(p.n)).replace('{t}', t.ptype[p.price_type] || p.price_type) : t.posNA, '');
  }

  // financial view: per scenario ROI and IRR, nominal, real and home currency
  const S = report.finance && report.finance.scenarios;
  if (S && S.base && S.base.roi.status === 'OK') {
    const home = S.base.views && S.base.views.home && S.base.views.home.status !== 'NOT RUN' ? S.base.views.home.currency : null;
    const cols = t.cols.slice(0, 4).map(c => c.replace('{n}', report.finance.currency)).concat(home ? [t.cols[4].replace('{c}', home)] : []);
    L.push(`## ${t.fin}`, '', `| ${cols.join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`);
    for (const [k, s] of Object.entries(S)) {
      if (s.roi.status !== 'OK') continue;
      const V = s.views || {};
      const row = [t.scen[k] || k, pc(s.roi.value), s.irr.status === 'OK' ? pc(s.irr.value) : t.na, V.real && V.real.status !== 'NOT RUN' && V.real.irr.status === 'OK' ? pc(V.real.irr.value) : t.na];
      if (home) row.push(V.home && V.home.irr && V.home.irr.status === 'OK' ? pc(V.home.irr.value) : t.na);
      L.push(`| ${row.join(' | ')} |`);
    }
    L.push('', `*${t.finNote}*`, '');
    const asm = (report.provenance || []).filter(x => x.ref === 'ASSUMPTION' && x.note);
    if (asm.length) L.push(`**${t.assumptions}:**`, '', ...asm.slice(0, 10).map(x => `- ${x.note}`), '');
  } else L.push(`## ${t.fin}`, '', t.finNA, '');

  // risks, most severe first
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2, NOT_ASSESSED: 3 };
  const rk = [...report.risks].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
  L.push(`## ${t.risks}`, '', ...(rk.length ? rk.map(r => { const tl = (r.i18n && r.i18n.title && (r.i18n.title[lang] || r.i18n.title.en)) || r.title; const mi = (r.i18n && r.i18n.mitigation && (r.i18n.mitigation[lang] || r.i18n.mitigation.en)) || r.mitigation; return `- **${tl}** — ${t.sev[r.severity] || t.sev.NOT_ASSESSED}${r.severity_rationale ? ` (${r.severity_rationale})` : ''}${mi ? `. ${t.mit}: ${mi}` : ''}`; }) : [t.none]), '');

  // market context from the official overview of the Markets page
  const ov = marketId && OVERVIEW[marketId];
  if (ov) { const P = PUBLISHERS[lang] || PUBLISHERS.en; L.push(`## ${t.market}`, '', ...ov.map(x => `- **${x.label[lang] || x.label.en}** (${x.period[lang] || x.period.en}): ${x.kind === 'pct' ? pc(x.value / 100) : new Intl.NumberFormat(loc).format(x.value)}. ${x.note[lang] || x.note.en} — ${P[x.src] || x.src}`), ''); }

  // standard texts: commission relationship and not advice
  const std = (id) => { const x = STD.find(s => s.id === id); return x ? (x.text[lang] || x.text.en) : ''; };
  L.push(`## ${t.role}`, '', std('DT-COMMISSION-1'), '', std('DT-NOT-ADVICE-1'), '');
  const md = L.join('\n');
  return { status: 'OK', version: CBR_VERSION, lang, markdown: md };
}
