// Methodology content for /desk/intelligence/. Describes only approved rules (Handoff §5–6, Spec v1, decision log); invents no method.
const INTEL_EN = [
  {
    slug: 'evaluation', title: 'Evaluation framework', short: 'What Nexus Desk assesses, what it does not, and why.',
    body: `<p>Nexus Desk evaluates an opportunity by documenting it to one standard: identity, developer, location, project and unit facts, documented risks, research status, data gaps, media permissions and disclosures. Each fact is stored once, in the record that owns it, and linked to its evidence.</p>
<h2>What is assessed in the MVP</h2>
<ul><li><strong>Identity and counterparty.</strong> The project and the developer's legal entity must be supported by primary or authoritative sources (Tier 1–3) before publication.</li>
<li><strong>Project and unit facts.</strong> Delivery status, expected delivery, layout and area, each with its source, period and verification status. Developer statements are labelled as developer claims.</li>
<li><strong>Documented risks.</strong> Cause, evidence, horizon, controllability, mitigation and residual uncertainty.</li>
<li><strong>Research status.</strong> Research Closure and Data Completeness, recorded separately for each intelligence domain.</li></ul>
<h2>What is not published</h2>
<p>No composite score, ranking, fair value, yield or return figure, growth forecast, numeric risk probability or investment-fit result is published. For research and consultation, cash-flow, ROI and NPV scenarios, unadjusted comparable summaries and qualitative fit checks are calculated internally under documented, tested method contracts; their results stay private (see <a href="../decision-engines/" style="text-decoration:underline">Decision engines</a>). Ranking, fair value, numeric risk scores and asset-quality ratings are not calculated at all. Asset Quality and Investment Fit are separate concepts and stay inactive until their methodologies are documented, tested and approved. Their absence is shown explicitly rather than implied.</p>
<h2>Publication</h2>
<p>An opportunity is published only when a computed gate passes and the owner records an explicit review. The gate checks identity, developer, required fields, open conflicts, research blocks, documented risks, approved disclosures, a written-permission cover image and gallery. New evidence that breaks the gate withdraws the opportunity until it is reviewed again.</p>`
  },
  {
    slug: 'decision-engines', title: 'Decision engines', short: 'How research, calculation and publication are separated, and the actual status of every method.',
    body: `<p>Nexus Desk separates research, calculation and publication. Eight decision engines work on the same evidence records. The status table below is generated from the method registry when the site is built, so it changes only when the implementation changes.</p>
<h2>How the engines connect</h2>
<ol><li><strong>Evidence and data quality</strong> checks every input: source, tier, dates, verification, conflicts and freshness.</li><li><strong>Market and location</strong> and <strong>project, developer and brand</strong> organise the evidence by intelligence domain, with Research Closure and Data Completeness recorded separately.</li><li><strong>Pricing and comparables</strong> and <strong>rental and financial scenarios</strong> run on private inputs, each with recorded provenance.</li><li><strong>Risk and exit</strong> documents risks qualitatively, including resale and exit uncertainty.</li><li><strong>Comparison and investment fit</strong> checks explicit criteria. There is no score and no ranking.</li><li>The <strong>decision report</strong> assembles supported findings, gaps and limitations, citing every record it relies on.</li></ol>
<h2>Method status</h2>
{{ENGINES}}
<h2>Financial modelling boundaries</h2>
<p>ROI and NPV are separate calculations with written definitions. ROI is total, unlevered and undiscounted over a stated horizon; net rental yield is reported separately. NPV discounts end-of-year cash flows at a rate whose basis must be written down, never a default, a mortgage rate or inflation. Every input cites its evidence or is recorded as an explicit assumption; a missing input produces no number. Results are scenarios conditional on their inputs, not forecasts. They are not published and support consultation.</p>
<h2>What stays inactive</h2>
<p>Ranking, numeric risk scores, fair value, asset-quality and liquidity ratings stay inactive until their method contracts, minimum evidence requirements and tests are complete.</p>`
  },
  {
    slug: 'evidence-sources', title: 'Evidence and sources', short: 'Evidence classes, source tiers and verification labels.',
    body: `<p>Every material claim is an evidence record: the claim, its value and unit, geography, period, source, source tier, evidence class, verification status, retrieval date, limitations and next review. Conflicting sources are kept side by side and marked as unresolved; they are never reconciled silently.</p>
<h2>Evidence classes</h2>
<div class="enum"><div><span class="chip">Fact</span><p>Observable and documented.</p></div><div><span class="chip">Legal fact</span><p>Established by a legal or registry document.</p></div><div><span class="chip">Estimate</span><p>A calculated or approximated value with stated method.</p></div><div><span class="chip">Projection</span><p>A forward-looking statement, such as an expected delivery date.</p></div><div><span class="chip">Interpretation</span><p>An analytical reading of facts.</p></div><div><span class="chip">Hypothesis</span><p>A proposition still to be tested.</p></div><div><span class="chip">Opinion</span><p>A view held by a source; never treated as fact.</p></div><div><span class="chip">Data not available</span><p>No usable evidence exists; never treated as zero.</p></div></div>
<h2>Source tiers</h2>
<div class="enum"><div><span class="chip on">Tier 1</span><p>Primary or official: registries, regulators, official statistics.</p></div><div><span class="chip on">Tier 2</span><p>Authoritative secondary sources and reputable reporting.</p></div><div><span class="chip">Tier 3</span><p>Market and commercial material, including developer media kits.</p></div><div><span class="chip dim">Tier 4</span><p>Discovery only. Cannot support a published material claim without independent verification.</p></div></div>
<h2>Verification labels</h2>
<div class="enum"><div><span class="vs" data-v="VERIFIED">Verified</span><p>Confirmed against a primary source.</p></div><div><span class="vs" data-v="CORROBORATED">Corroborated</span><p>Consistent across independent sources.</p></div><div><span class="vs" data-v="SOURCE-REPORTED">Source-reported</span><p>Reported by one credible source, not independently confirmed.</p></div><div><span class="vs" data-v="DEVELOPER-CLAIM">Developer claim</span><p>Stated by the developer or its agents.</p></div><div><span class="vs" data-v="UNVERIFIED">Unverified</span><p>Not yet checked.</p></div></div>
<p>Labels are always written out; they never rely on colour alone.</p>`
  },
  {
    slug: 'pricing', title: 'Pricing', short: 'Price types, interpretation rules and why project prices are not published.',
    body: `<p>Nexus Desk does not publish project prices or project-specific price ranges. Current unit pricing changes often, depends on unit, floor, view and payment terms, and is best discussed directly. It is handled in consultation.</p>
<h2>Interpretation rules used in research</h2>
<ul><li>An asking price is not an achieved transaction price.</li><li>A price index is not an absolute price level.</li><li>Gross area is not net area; every area-based figure states its basis.</li><li>Currency, period, geography and definitions are preserved with every observation.</li><li>Missing prices are never filled, estimated silently or treated as zero.</li></ul>
<h2>What is not published</h2>
<p>No price filter or price sort, no fair value, no published yield or return figure. Internal price research and comparable analysis are kept in a private store, separate from public content; comparables are summarised without adjustments and never turned into a fair value.</p>`
  },
  {
    slug: 'risk', title: 'Risk', short: 'Documented risks without scores or probabilities.',
    body: `<p>Each opportunity carries a documented risk list. A risk records its type, cause, supporting evidence, horizon, controllability, mitigation or diligence action, and residual uncertainty.</p>
<h2>What is not shown</h2>
<p>There is no risk score and no probability percentage. Severity and likelihood labels require an approved severity method; until it exists they are shown as <em>not assessed</em>. Missing evidence is never read as low risk.</p>
<h2>Typical risk types</h2>
<div class="enum"><div><p><strong>Legal and title</strong> — title type, encumbrances, permits.</p></div><div><p><strong>Developer and counterparty</strong> — legal identity, delivery record.</p></div><div><p><strong>Construction and delivery</strong> — progress, delivery terms.</p></div><div><p><strong>Regulatory and tax</strong> — rules that affect buyers.</p></div><div><p><strong>Currency</strong> — exposure between purchase and home currency.</p></div><div><p><strong>Seismic and physical</strong> — building standards and site conditions.</p></div></div>`
  },
  {
    slug: 'liquidity', title: 'Liquidity', short: 'What liquidity means here and the limits of available proxies.',
    body: `<p>Liquidity is the ability to exit a position within a reasonable time without a material discount. It depends on the specific asset, the buyer pool and market conditions.</p>
<h2>Limits of proxies</h2>
<ul><li>Transaction depth in a district is not the liquidity of a particular unit.</li><li>Listing volume is not demand.</li><li>Historical sales do not guarantee future resale.</li></ul>
<p>No liquidity assessment is calculated in the MVP. Where resale or transaction evidence exists it may be cited as evidence, with its scope and period, without a liquidity rating.</p>`
  },
  {
    slug: 'data-gaps', title: 'Data gaps', short: 'Missing-data states, and why closure differs from completeness.',
    body: `<p>Missing information is recorded explicitly for each field. A field either has a value backed by evidence, or one of four states:</p>
<div class="enum"><div><span class="fs">Data not available</span><p>No usable data exists for this field.</p></div><div><span class="fs">Accessible, not yet collected</span><p>The data exists and can be obtained; research has not reached it yet.</p></div><div><span class="fs">Professional due diligence required</span><p>Only a qualified professional (legal, technical, tax) can establish it.</p></div><div><span class="fs">Not applicable</span><p>The field does not apply to this record.</p></div></div>
<h2>Research Closure and Data Completeness</h2>
<p>These are independent. Research Closure says whether the research questions for a domain have been answered as far as currently possible; Data Completeness says whether the data itself is complete. Research can be closed while data remains incomplete — for example, when a figure is known not to be published anywhere.</p>
<p>Missing data never becomes zero, a positive or negative score, or a match.</p>`
  }
];

const INTEL_TR = [
  {
    slug: 'evaluation', title: 'Değerlendirme çerçevesi', short: 'Nexus Desk neyi değerlendirir, neyi değerlendirmez ve neden.',
    body: `<p>Nexus Desk bir fırsatı tek bir standarda göre belgeleyerek değerlendirir: kimlik, geliştirici, konum, proje ve birim bilgileri, belgelenmiş riskler, araştırma durumu, veri boşlukları, görsel izinleri ve açıklamalar. Her bilgi, ait olduğu kayıtta bir kez saklanır ve kanıtına bağlanır.</p>
<h2>MVP’de değerlendirilenler</h2>
<ul><li><strong>Kimlik ve karşı taraf.</strong> Proje ve geliştiricinin tüzel kişiliği, yayından önce birincil veya yetkin kaynaklarla (Kademe 1–3) desteklenmelidir.</li>
<li><strong>Proje ve birim bilgileri.</strong> Teslim durumu, beklenen teslim, daire tipi ve alan; her biri kaynağı, dönemi ve doğrulama durumuyla. Geliştirici açıklamaları geliştirici beyanı olarak etiketlenir.</li>
<li><strong>Belgelenmiş riskler.</strong> Neden, kanıt, vade, kontrol edilebilirlik, azaltım ve kalan belirsizlik.</li>
<li><strong>Araştırma durumu.</strong> Araştırma Kapanışı ve Veri Bütünlüğü, her istihbarat alanı için ayrı kaydedilir.</li></ul>
<h2>Yayımlanmayanlar</h2>
<p>Bileşik puan, sıralama, gerçeğe uygun değer, getiri veya kazanç rakamı, büyüme tahmini, sayısal risk olasılığı ya da yatırım uygunluğu sonucu yayımlanmaz. Araştırma ve danışmanlık için nakit akışı, ROI ve NPV senaryoları, düzeltme yapılmamış emsal özetleri ve nitel uygunluk kontrolleri, belgelenmiş ve test edilmiş yöntem sözleşmeleriyle şirket içinde hesaplanır; sonuçları gizli kalır (bkz. <a href="../decision-engines/" style="text-decoration:underline">Karar motorları</a>). Sıralama, gerçeğe uygun değer, sayısal risk puanı ve varlık kalitesi derecesi hiç hesaplanmaz. Varlık Kalitesi ve Yatırım Uygunluğu ayrı kavramlardır ve metodolojileri belgelenip test edilip onaylanana kadar pasif kalır. Yoklukları ima edilmez, açıkça gösterilir.</p>
<h2>Yayın</h2>
<p>Bir fırsat yalnızca hesaplanan kapı geçildiğinde ve sahibi açık bir inceleme kaydettiğinde yayımlanır. Kapı; kimliği, geliştiriciyi, zorunlu alanları, açık çelişkileri, araştırma bloklarını, belgelenmiş riskleri, onaylı açıklamaları, yazılı izinli kapak görselini ve galeriyi kontrol eder. Kapıyı bozan yeni kanıt, fırsatı yeniden incelenene kadar yayından kaldırır.</p>`
  },
  {
    slug: 'decision-engines', title: 'Karar motorları', short: 'Araştırma, hesaplama ve yayının nasıl ayrıldığı ve her yöntemin gerçek durumu.',
    body: `<p>Nexus Desk araştırmayı, hesaplamayı ve yayını birbirinden ayırır. Sekiz karar motoru aynı kanıt kayıtları üzerinde çalışır. Aşağıdaki durum tablosu site oluşturulurken yöntem kaydından üretilir; yalnızca uygulama değiştiğinde değişir.</p>
<h2>Motorlar nasıl bağlanır</h2>
<ol><li><strong>Kanıt ve veri kalitesi</strong> her girdiyi denetler: kaynak, kademe, tarihler, doğrulama, çelişkiler ve güncellik.</li><li><strong>Pazar ve konum</strong> ile <strong>proje, geliştirici ve marka</strong> kanıtları istihbarat alanlarına göre düzenler; Araştırma Kapanışı ve Veri Bütünlüğü ayrı kaydedilir.</li><li><strong>Fiyatlama ve emsaller</strong> ile <strong>kira ve finansal senaryolar</strong>, her biri kaydedilmiş kaynağıyla birlikte gizli girdiler üzerinde çalışır.</li><li><strong>Risk ve çıkış</strong> riskleri, yeniden satış ve çıkış belirsizliği dahil, nitel olarak belgeler.</li><li><strong>Karşılaştırma ve yatırım uygunluğu</strong> açık kriterleri kontrol eder. Puan ve sıralama yoktur.</li><li><strong>Karar raporu</strong> desteklenen bulguları, boşlukları ve sınırlamaları, dayandığı her kaydı göstererek bir araya getirir.</li></ol>
<h2>Yöntem durumu</h2>
{{ENGINES}}
<h2>Finansal modelleme sınırları</h2>
<p>ROI ve NPV, yazılı tanımları olan ayrı hesaplardır. ROI, belirtilen süre boyunca toplam, kaldıraçsız ve iskontosuzdur; net kira getirisi ayrıca raporlanır. NPV yıl sonu nakit akışlarını, dayanağı yazılı olarak belirtilmesi gereken bir oranla iskonto eder; bu oran asla varsayılan değer, konut kredisi faizi veya enflasyon değildir. Her girdi kanıtına atıf yapar ya da açık bir varsayım olarak kaydedilir; eksik girdi hiçbir sayı üretmez. Sonuçlar, girdilerine bağlı senaryolardır, tahmin değildir. Yayımlanmazlar ve danışmanlığı destekler.</p>
<h2>Pasif kalanlar</h2>
<p>Sıralama, sayısal risk puanları, gerçeğe uygun değer, varlık kalitesi ve likidite dereceleri, yöntem sözleşmeleri, asgari kanıt gereklilikleri ve testleri tamamlanana kadar pasif kalır.</p>`
  },
  {
    slug: 'evidence-sources', title: 'Kanıt ve kaynaklar', short: 'Kanıt sınıfları, kaynak kademeleri ve doğrulama etiketleri.',
    body: `<p>Her önemli iddia bir kanıt kaydıdır: iddia, değeri ve birimi, coğrafya, dönem, kaynak, kaynak kademesi, kanıt sınıfı, doğrulama durumu, erişim tarihi, sınırlamalar ve sonraki inceleme. Çelişen kaynaklar yan yana tutulur ve çözülmemiş olarak işaretlenir; asla sessizce uzlaştırılmaz.</p>
<h2>Kanıt sınıfları</h2>
<div class="enum"><div><span class="chip">Olgu</span><p>Gözlemlenebilir ve belgelenmiş.</p></div><div><span class="chip">Hukuki olgu</span><p>Hukuki veya sicil belgesiyle sabit.</p></div><div><span class="chip">Tahmini değer</span><p>Yöntemi belirtilmiş hesaplanmış veya yaklaşık değer.</p></div><div><span class="chip">Projeksiyon</span><p>Beklenen teslim tarihi gibi ileriye dönük bir ifade.</p></div><div><span class="chip">Yorum</span><p>Olguların analitik okuması.</p></div><div><span class="chip">Hipotez</span><p>Henüz test edilecek bir önerme.</p></div><div><span class="chip">Görüş</span><p>Bir kaynağın görüşü; asla olgu sayılmaz.</p></div><div><span class="chip">Veri mevcut değil</span><p>Kullanılabilir kanıt yok; asla sıfır sayılmaz.</p></div></div>
<h2>Kaynak kademeleri</h2>
<div class="enum"><div><span class="chip on">Kademe 1</span><p>Birincil veya resmî: siciller, düzenleyiciler, resmî istatistikler.</p></div><div><span class="chip on">Kademe 2</span><p>Yetkin ikincil kaynaklar ve güvenilir haberler.</p></div><div><span class="chip">Kademe 3</span><p>Geliştirici tanıtım kitleri dahil piyasa ve ticari materyaller.</p></div><div><span class="chip dim">Kademe 4</span><p>Yalnızca keşif içindir. Bağımsız doğrulama olmadan yayımlanan önemli bir iddiayı destekleyemez.</p></div></div>
<h2>Doğrulama etiketleri</h2>
<div class="enum"><div><span class="vs" data-v="VERIFIED">Doğrulandı</span><p>Birincil kaynakla teyit edildi.</p></div><div><span class="vs" data-v="CORROBORATED">Teyit edildi</span><p>Bağımsız kaynaklar arasında tutarlı.</p></div><div><span class="vs" data-v="SOURCE-REPORTED">Kaynak bildirimi</span><p>Tek bir güvenilir kaynak bildirdi, bağımsız olarak teyit edilmedi.</p></div><div><span class="vs" data-v="DEVELOPER-CLAIM">Geliştirici beyanı</span><p>Geliştirici veya temsilcileri tarafından ifade edildi.</p></div><div><span class="vs" data-v="UNVERIFIED">Doğrulanmadı</span><p>Henüz kontrol edilmedi.</p></div></div>
<p>Etiketler her zaman yazıyla gösterilir; asla yalnızca renge dayanmaz.</p>`
  },
  {
    slug: 'pricing', title: 'Fiyatlama', short: 'Fiyat türleri, yorumlama kuralları ve proje fiyatlarının neden yayımlanmadığı.',
    body: `<p>Nexus Desk proje fiyatlarını veya projeye özgü fiyat aralıklarını yayımlamaz. Güncel birim fiyatları sık değişir; birime, kata, manzaraya ve ödeme koşullarına bağlıdır ve en iyi doğrudan görüşülür. Danışmanlıkta ele alınır.</p>
<h2>Araştırmada kullanılan yorumlama kuralları</h2>
<ul><li>İstenen fiyat, gerçekleşen satış fiyatı değildir.</li><li>Fiyat endeksi, mutlak fiyat düzeyi değildir.</li><li>Brüt alan net alan değildir; alana dayalı her rakam esasını belirtir.</li><li>Para birimi, dönem, coğrafya ve tanımlar her gözlemle birlikte korunur.</li><li>Eksik fiyatlar asla doldurulmaz, sessizce tahmin edilmez veya sıfır sayılmaz.</li></ul>
<h2>Yayımlanmayanlar</h2>
<p>Fiyat filtresi veya fiyata göre sıralama, gerçeğe uygun değer ya da yayımlanan bir getiri rakamı yoktur. İç fiyat araştırması ve emsal analizi, kamuya açık içerikten ayrı, özel bir depoda tutulur; emsaller düzeltme yapılmadan özetlenir ve hiçbir zaman gerçeğe uygun değere dönüştürülmez.</p>`
  },
  {
    slug: 'risk', title: 'Risk', short: 'Puan veya olasılık içermeyen belgelenmiş riskler.',
    body: `<p>Her fırsat belgelenmiş bir risk listesi taşır. Bir risk; türünü, nedenini, destekleyici kanıtını, vadesini, kontrol edilebilirliğini, azaltım veya inceleme adımını ve kalan belirsizliği kaydeder.</p>
<h2>Gösterilmeyenler</h2>
<p>Risk puanı ve olasılık yüzdesi yoktur. Şiddet ve olasılık etiketleri onaylı bir şiddet yöntemi gerektirir; bu yöntem oluşana kadar <em>değerlendirilmedi</em> olarak gösterilir. Eksik kanıt asla düşük risk olarak okunmaz.</p>
<h2>Tipik risk türleri</h2>
<div class="enum"><div><p><strong>Hukuki ve tapu</strong> — tapu türü, takyidatlar, ruhsatlar.</p></div><div><p><strong>Geliştirici ve karşı taraf</strong> — tüzel kimlik, teslim geçmişi.</p></div><div><p><strong>İnşaat ve teslim</strong> — ilerleme, teslim koşulları.</p></div><div><p><strong>Mevzuat ve vergi</strong> — alıcıları etkileyen kurallar.</p></div><div><p><strong>Döviz</strong> — alım para birimi ile ev para birimi arasındaki maruziyet.</p></div><div><p><strong>Deprem ve fiziksel</strong> — yapı standartları ve saha koşulları.</p></div></div>`
  },
  {
    slug: 'liquidity', title: 'Likidite', short: 'Likiditenin burada ne anlama geldiği ve mevcut göstergelerin sınırları.',
    body: `<p>Likidite, bir pozisyondan makul bir sürede ve önemli bir indirim olmadan çıkabilme yeteneğidir. Belirli varlığa, alıcı kitlesine ve piyasa koşullarına bağlıdır.</p>
<h2>Göstergelerin sınırları</h2>
<ul><li>Bir ilçedeki işlem derinliği, belirli bir birimin likiditesi değildir.</li><li>İlan hacmi talep değildir.</li><li>Geçmiş satışlar gelecekteki yeniden satışı garanti etmez.</li></ul>
<p>MVP’de likidite değerlendirmesi hesaplanmaz. Yeniden satış veya işlem kanıtı varsa, kapsamı ve dönemiyle birlikte kanıt olarak gösterilebilir; likidite derecesi verilmez.</p>`
  },
  {
    slug: 'data-gaps', title: 'Veri boşlukları', short: 'Eksik veri durumları ve kapanışın bütünlükten neden farklı olduğu.',
    body: `<p>Eksik bilgi her alan için açıkça kaydedilir. Bir alanın ya kanıtla desteklenen bir değeri ya da şu dört durumdan biri vardır:</p>
<div class="enum"><div><span class="fs">Veri mevcut değil</span><p>Bu alan için kullanılabilir veri yok.</p></div><div><span class="fs">Erişilebilir, henüz toplanmadı</span><p>Veri mevcut ve elde edilebilir; araştırma henüz ulaşmadı.</p></div><div><span class="fs">Profesyonel durum tespiti gerekli</span><p>Yalnızca yetkin bir profesyonel (hukuki, teknik, vergi) tespit edebilir.</p></div><div><span class="fs">Uygulanamaz</span><p>Alan bu kayıt için geçerli değil.</p></div></div>
<h2>Araştırma Kapanışı ve Veri Bütünlüğü</h2>
<p>Bunlar birbirinden bağımsızdır. Araştırma Kapanışı, bir alanın araştırma sorularının şu an mümkün olduğu ölçüde yanıtlanıp yanıtlanmadığını; Veri Bütünlüğü ise verinin kendisinin tam olup olmadığını söyler. Veri eksikken araştırma kapanmış olabilir; örneğin bir rakamın hiçbir yerde yayımlanmadığı biliniyorsa.</p>
<p>Eksik veri asla sıfıra, olumlu ya da olumsuz bir puana veya bir eşleşmeye dönüşmez.</p>`
  }
];

const INTEL_AR = [
  {
    slug: 'evaluation', title: 'إطار التقييم', short: 'ما الذي يقيّمه Nexus Desk، وما الذي لا يقيّمه، ولماذا.',
    body: `<p>يقيّم Nexus Desk الفرصة عبر توثيقها وفق معيار واحد: الهوية، والمطوّر، والموقع، ومعلومات المشروع والوحدة، والمخاطر الموثّقة، وحالة البحث، وفجوات البيانات، وأذونات الصور، والإفصاحات. تُحفظ كل معلومة مرة واحدة في السجل الذي يملكها وتُربط بدليلها.</p>
<h2>ما الذي يُقيَّم في النسخة الأولى</h2>
<ul><li><strong>الهوية والطرف المقابل.</strong> يجب أن يستند المشروع والكيان القانوني للمطوّر إلى مصادر أولية أو موثوقة (المستويات 1–3) قبل النشر.</li>
<li><strong>معلومات المشروع والوحدة.</strong> حالة التسليم، والتسليم المتوقع، والتصميم، والمساحة؛ كلٌّ منها مع مصدره وفترته وحالة التحقق منه. تُوسَم تصريحات المطوّر بوصفها ادعاءات للمطوّر.</li>
<li><strong>المخاطر الموثّقة.</strong> السبب، والدليل، والأفق الزمني، وقابلية التحكم، والتخفيف، وعدم اليقين المتبقي.</li>
<li><strong>حالة البحث.</strong> إغلاق البحث واكتمال البيانات، ويُسجَّلان بشكل منفصل لكل مجال استخباري.</li></ul>
<h2>ما الذي لا يُنشر</h2>
<p>لا يُنشر أي تقييم مركّب أو تصنيف أو قيمة عادلة أو رقم للعائد أو توقع للنمو أو احتمال رقمي للمخاطر أو نتيجة لملاءمة الاستثمار. ولأغراض البحث والاستشارة، تُحتسب داخليًا سيناريوهات التدفق النقدي والعائد على الاستثمار وصافي القيمة الحالية، وملخصات المقارنات غير المعدّلة، وفحوص الملاءمة النوعية، وفق عقود منهجية موثّقة ومختبرة؛ وتبقى نتائجها خاصة (انظر <a href="../decision-engines/" style="text-decoration:underline">محركات القرار</a>). أما التصنيف والقيمة العادلة ودرجات المخاطر الرقمية وتقييمات جودة الأصل فلا تُحتسب إطلاقًا. جودة الأصل وملاءمة الاستثمار مفهومان منفصلان، ويبقيان غير مفعّلين إلى أن تُوثَّق منهجيتاهما وتُختبرا وتُعتمدا. ويُبيَّن غيابهما صراحةً بدلاً من التلميح إليه.</p>
<h2>النشر</h2>
<p>لا تُنشر الفرصة إلا عند اجتياز بوابة محتسبة وتسجيل المالك مراجعة صريحة. تتحقق البوابة من الهوية، والمطوّر، والحقول المطلوبة، والتعارضات المفتوحة، وكتل البحث، والمخاطر الموثّقة، والإفصاحات المعتمدة، وصورة الغلاف المأذون بها كتابياً، والمعرض. وأي دليل جديد يُخلّ بالبوابة يسحب الفرصة إلى أن تُراجع مجدداً.</p>`
  },
  {
    slug: 'decision-engines', title: 'محركات القرار', short: 'كيف يُفصل بين البحث والحساب والنشر، والحالة الفعلية لكل منهجية.',
    body: `<p>يفصل Nexus Desk بين البحث والحساب والنشر. تعمل ثمانية محركات قرار على سجلات الأدلة نفسها. يُولَّد جدول الحالة أدناه من سجل المنهجيات عند بناء الموقع، فلا يتغير إلا عندما يتغير التطبيق.</p>
<h2>كيف ترتبط المحركات</h2>
<ol><li><strong>الأدلة وجودة البيانات</strong> يفحص كل مُدخل: المصدر ومستواه والتواريخ والتحقق والتعارضات والحداثة.</li><li><strong>السوق والموقع</strong> و<strong>المشروع والمطوّر والعلامة</strong> ينظّمان الأدلة حسب مجال المعلومات، مع تسجيل إغلاق البحث واكتمال البيانات كلٌّ على حدة.</li><li><strong>التسعير والمقارنات</strong> و<strong>الإيجار والسيناريوهات المالية</strong> تعمل على مدخلات خاصة، لكلٍّ منها مصدر مسجَّل.</li><li><strong>المخاطر والتخارج</strong> يوثّق المخاطر نوعيًا، بما فيها عدم اليقين في إعادة البيع والتخارج.</li><li><strong>المقارنة وملاءمة الاستثمار</strong> يفحص معايير صريحة، من دون تقييم رقمي أو تصنيف.</li><li><strong>تقرير القرار</strong> يجمع النتائج المدعومة والفجوات والقيود، مع الإشارة إلى كل سجل يعتمد عليه.</li></ol>
<h2>حالة المنهجيات</h2>
{{ENGINES}}
<h2>حدود النمذجة المالية</h2>
<p>العائد على الاستثمار وصافي القيمة الحالية حسابان منفصلان لكلٍّ منهما تعريف مكتوب. العائد على الاستثمار إجمالي، من دون رافعة مالية ومن دون خصم، على مدى أفق محدد؛ ويُذكر صافي عائد الإيجار بشكل منفصل. يخصم صافي القيمة الحالية التدفقات النقدية في نهاية كل سنة بمعدل يجب تدوين أساسه، ولا يكون أبدًا قيمة افتراضية أو سعر رهن عقاري أو معدل تضخم. يستند كل مُدخل إلى دليله أو يُسجَّل افتراضًا صريحًا؛ والمُدخل الناقص لا ينتج أي رقم. النتائج سيناريوهات مشروطة بمدخلاتها وليست توقعات. لا تُنشر، وتدعم الاستشارة.</p>
<h2>ما يبقى غير مفعّل</h2>
<p>يبقى التصنيف ودرجات المخاطر الرقمية والقيمة العادلة وتقييمات جودة الأصل والسيولة غير مفعّلة إلى أن تكتمل عقودها المنهجية والحد الأدنى من متطلبات الأدلة والاختبارات.</p>`
  },
  {
    slug: 'evidence-sources', title: 'الأدلة والمصادر', short: 'فئات الأدلة ومستويات المصادر وتسميات التحقق.',
    body: `<p>كل ادعاء جوهري هو سجل دليل: الادعاء، وقيمته ووحدته، والنطاق الجغرافي، والفترة، والمصدر، ومستوى المصدر، وفئة الدليل، وحالة التحقق، وتاريخ الاسترجاع، والقيود، والمراجعة التالية. تُحفظ المصادر المتعارضة جنباً إلى جنب وتُوسَم بأنها غير محسومة؛ ولا تُوفَّق أبداً بصمت.</p>
<h2>فئات الأدلة</h2>
<div class="enum"><div><span class="chip">حقيقة</span><p>قابلة للملاحظة وموثّقة.</p></div><div><span class="chip">حقيقة قانونية</span><p>ثابتة بوثيقة قانونية أو سجل رسمي.</p></div><div><span class="chip">تقدير</span><p>قيمة محسوبة أو تقريبية مع بيان طريقتها.</p></div><div><span class="chip">توقّع</span><p>بيان مستقبلي، مثل تاريخ التسليم المتوقع.</p></div><div><span class="chip">تفسير</span><p>قراءة تحليلية للحقائق.</p></div><div><span class="chip">فرضية</span><p>مقترح لم يُختبر بعد.</p></div><div><span class="chip">رأي</span><p>وجهة نظر لمصدر ما؛ لا تُعامل أبداً كحقيقة.</p></div><div><span class="chip">البيانات غير متاحة</span><p>لا يوجد دليل قابل للاستخدام؛ ولا يُعامل أبداً كصفر.</p></div></div>
<h2>مستويات المصادر</h2>
<div class="enum"><div><span class="chip on">المستوى 1</span><p>أولي أو رسمي: السجلات، والجهات التنظيمية، والإحصاءات الرسمية.</p></div><div><span class="chip on">المستوى 2</span><p>مصادر ثانوية موثوقة وتقارير ذات مصداقية.</p></div><div><span class="chip">المستوى 3</span><p>مواد سوقية وتجارية، بما فيها الحزم الترويجية للمطوّرين.</p></div><div><span class="chip dim">المستوى 4</span><p>للاستكشاف فقط. لا يمكن أن يدعم ادعاءً جوهرياً منشوراً من دون تحقق مستقل.</p></div></div>
<h2>تسميات التحقق</h2>
<div class="enum"><div><span class="vs" data-v="VERIFIED">موثّق</span><p>مؤكَّد مقابل مصدر أولي.</p></div><div><span class="vs" data-v="CORROBORATED">مؤكَّد</span><p>متسق عبر مصادر مستقلة.</p></div><div><span class="vs" data-v="SOURCE-REPORTED">بحسب المصدر</span><p>أورده مصدر واحد موثوق، ولم يُؤكَّد بشكل مستقل.</p></div><div><span class="vs" data-v="DEVELOPER-CLAIM">ادعاء المطوّر</span><p>صرّح به المطوّر أو وكلاؤه.</p></div><div><span class="vs" data-v="UNVERIFIED">غير موثّق</span><p>لم يُتحقق منه بعد.</p></div></div>
<p>تُكتب التسميات دائماً نصاً؛ ولا تعتمد على اللون وحده أبداً.</p>`
  },
  {
    slug: 'pricing', title: 'التسعير', short: 'أنواع الأسعار وقواعد تفسيرها ولماذا لا تُنشر أسعار المشاريع.',
    body: `<p>لا ينشر Nexus Desk أسعار المشاريع ولا نطاقات الأسعار الخاصة بالمشاريع. تتغير أسعار الوحدات الحالية كثيراً، وتعتمد على الوحدة والطابق والإطلالة وشروط الدفع، ومن الأفضل مناقشتها مباشرة. ويجري تناولها في الاستشارة.</p>
<h2>قواعد التفسير المعتمدة في البحث</h2>
<ul><li>السعر المطلوب ليس سعر صفقة منفّذة.</li><li>مؤشر الأسعار ليس مستوى سعرياً مطلقاً.</li><li>المساحة الإجمالية ليست المساحة الصافية؛ ويُذكر أساس كل رقم يعتمد على المساحة.</li><li>تُحفظ العملة والفترة والنطاق الجغرافي والتعريفات مع كل ملاحظة.</li><li>لا تُملأ الأسعار الناقصة أبداً، ولا تُقدَّر بصمت، ولا تُعامل كصفر.</li></ul>
<h2>ما لا يُنشر</h2>
<p>لا مرشح للأسعار ولا ترتيب حسب السعر، ولا قيمة عادلة، ولا رقم منشور للعائد. تُحفظ أبحاث الأسعار الداخلية وتحليل المقارنات في مستودع خاص منفصل عن المحتوى العام؛ وتُلخَّص المقارنات من دون تعديلات ولا تتحول أبدًا إلى قيمة عادلة.</p>`
  },
  {
    slug: 'risk', title: 'المخاطر', short: 'مخاطر موثّقة من دون تقييمات أو احتمالات.',
    body: `<p>تحمل كل فرصة قائمة مخاطر موثّقة. يسجّل كل خطر نوعه، وسببه، والدليل الداعم له، والأفق الزمني، وقابلية التحكم، وإجراء التخفيف أو العناية الواجبة، وعدم اليقين المتبقي.</p>
<h2>ما لا يُعرض</h2>
<p>لا يوجد تقييم للمخاطر ولا نسبة احتمال. تتطلب تسميات الشدة والاحتمال منهجية معتمدة للشدة؛ وإلى أن توجد تُعرض بوصفها <em>غير مقيَّمة</em>. ولا يُقرأ غياب الدليل أبداً على أنه خطر منخفض.</p>
<h2>أنواع المخاطر الشائعة</h2>
<div class="enum"><div><p><strong>القانونية والملكية</strong> — نوع سند الملكية، والأعباء، والتراخيص.</p></div><div><p><strong>المطوّر والطرف المقابل</strong> — الهوية القانونية، وسجل التسليم.</p></div><div><p><strong>الإنشاء والتسليم</strong> — التقدّم، وشروط التسليم.</p></div><div><p><strong>التنظيمية والضريبية</strong> — القواعد التي تؤثر في المشترين.</p></div><div><p><strong>العملة</strong> — التعرّض بين عملة الشراء والعملة المحلية للمشتري.</p></div><div><p><strong>الزلزالية والمادية</strong> — معايير البناء وظروف الموقع.</p></div></div>`
  },
  {
    slug: 'liquidity', title: 'السيولة', short: 'معنى السيولة هنا وحدود المؤشرات المتاحة.',
    body: `<p>السيولة هي القدرة على الخروج من مركز استثماري خلال وقت معقول ومن دون خصم جوهري. وتعتمد على الأصل المحدد، وشريحة المشترين، وظروف السوق.</p>
<h2>حدود المؤشرات</h2>
<ul><li>عمق الصفقات في منطقة ما ليس سيولة وحدة بعينها.</li><li>حجم الإعلانات ليس طلباً.</li><li>المبيعات السابقة لا تضمن إعادة البيع مستقبلاً.</li></ul>
<p>لا يُحتسب تقييم للسيولة في النسخة الأولى. وحين توجد أدلة على إعادة البيع أو الصفقات يمكن الاستشهاد بها كأدلة، مع نطاقها وفترتها، ومن دون تصنيف للسيولة.</p>`
  },
  {
    slug: 'data-gaps', title: 'فجوات البيانات', short: 'حالات البيانات الناقصة، ولماذا يختلف الإغلاق عن الاكتمال.',
    body: `<p>تُسجَّل المعلومات الناقصة صراحةً لكل حقل. فإما أن يحمل الحقل قيمة مدعومة بدليل، أو إحدى الحالات الأربع التالية:</p>
<div class="enum"><div><span class="fs">البيانات غير متاحة</span><p>لا توجد بيانات قابلة للاستخدام لهذا الحقل.</p></div><div><span class="fs">متاحة ولم تُجمع بعد</span><p>البيانات موجودة ويمكن الحصول عليها؛ لكن البحث لم يصل إليها بعد.</p></div><div><span class="fs">تتطلب عناية واجبة مهنية</span><p>لا يستطيع إثباتها إلا مختص مؤهل (قانوني، فني، ضريبي).</p></div><div><span class="fs">لا ينطبق</span><p>الحقل لا ينطبق على هذا السجل.</p></div></div>
<h2>إغلاق البحث واكتمال البيانات</h2>
<p>هذان مستقلان. يبيّن إغلاق البحث ما إذا كانت أسئلة البحث في مجال ما قد أُجيب عنها قدر الإمكان حالياً؛ ويبيّن اكتمال البيانات ما إذا كانت البيانات نفسها كاملة. قد يُغلق البحث بينما تبقى البيانات غير مكتملة — مثلاً عندما يُعرف أن رقماً ما غير منشور في أي مكان.</p>
<p>لا تتحول البيانات الناقصة أبداً إلى صفر، أو تقييم إيجابي أو سلبي، أو تطابق.</p>`
  }
];

export const INTEL = { en: INTEL_EN, tr: INTEL_TR, ar: INTEL_AR };
