#!/usr/bin/env python3
"""Generate the ILLUSTRATIVE fixture packages used to test the ingestion lifecycle.
Every name, document, image and value here is fictional and labelled as such. Output: desk/_fixtures/packages/
(underscore folder → never published by GitHub Pages; the validator also blocks FIX- ids in the public tree).
"""
import json, os, shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '_fixtures', 'packages'))
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_R = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

def font(size, bold=True):
    try: return ImageFont.truetype(FONT if bold else FONT_R, size)
    except OSError: return ImageFont.load_default()

def placeholder(path, label, kind, size=(1600, 1000), tone=(58, 60, 66), gps=False):
    """Neutral, obviously synthetic placeholder: grey field, hatch, and a large ILLUSTRATIVE label."""
    w, h = size
    im = Image.new('RGB', size, tone)
    d = ImageDraw.Draw(im)
    for x in range(-h, w, 48): d.line([(x, 0), (x + h, h)], fill=tuple(c + 8 for c in tone), width=2)
    d.rectangle([24, 24, w - 24, h - 24], outline=(150, 150, 156), width=3)
    d.text((64, 60), 'ILLUSTRATIVE PLACEHOLDER', font=font(54), fill=(235, 235, 238))
    d.text((64, 132), 'NOT A REAL PROJECT · NOT REAL MARKET DATA', font=font(30, False), fill=(204, 0, 0))
    d.text((64, h - 170), kind, font=font(40), fill=(220, 220, 224))
    d.text((64, h - 110), label, font=font(30, False), fill=(190, 190, 196))
    kw = {}
    if path.endswith('.jpg'):
        exif = Image.Exif()
        exif[0x010F] = 'FictionalCam'                       # Make
        exif[0x0131] = 'fixture-generator'                  # Software
        if gps:
            gps_ifd = {1: 'N', 2: (41.0, 0.0, 0.0), 3: 'E', 4: (29.0, 0.0, 0.0)}   # synthetic coordinates
            exif[0x8825] = gps_ifd
        kw['exif'] = exif.tobytes()
        im.save(path, 'JPEG', quality=88, **kw)
    else:
        im.save(path)

def plan_svg(path, label):
    open(path, 'w').write(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
<rect width="1200" height="800" fill="#f4f4f5"/><g fill="none" stroke="#3a3b40" stroke-width="6">
<rect x="120" y="140" width="960" height="560"/><path d="M520 140v300M520 520v180M120 440h400M760 140v560M760 420h320"/></g>
<g font-family="DejaVu Sans,Arial,sans-serif" fill="#3a3b40"><text x="120" y="80" font-size="34" font-weight="700">ILLUSTRATIVE PLACEHOLDER · INDICATIVE FLOOR PLAN</text>
<text x="120" y="118" font-size="22" fill="#cc0000">NOT A REAL PROJECT · NOT REAL MARKET DATA</text>
<text x="300" y="300" font-size="26">Room</text><text x="610" y="300" font-size="26">Room</text><text x="880" y="300" font-size="26">Room</text>
<text x="120" y="760" font-size="22">{label}</text></g></svg>''')

def write(pkg_dir, intake):
    os.makedirs(pkg_dir, exist_ok=True)
    json.dump(intake, open(os.path.join(pkg_dir, 'intake.json'), 'w'), indent=2, ensure_ascii=False)
    open(os.path.join(pkg_dir, 'README.txt'), 'w').write('ILLUSTRATIVE FIXTURE PACKAGE. All names, documents, images and values are fictional.\n')

NOTE = 'Fictional fixture source for testing only.'
def sources(prefix):
    return [
        {'key': 'S1', 'name': f'{prefix} title-registry extract (fictional)', 'publisher': 'Illustrative Registry (fictional)', 'url': None, 'tier': 1, 'source_type': 'REGISTRY', 'accessed_at': '2026-10-20', 'notes': {'en': NOTE}},
        {'key': 'S2', 'name': f'{prefix} developer media kit (fictional)', 'publisher': f'{prefix} developer (fictional)', 'url': None, 'tier': 3, 'source_type': 'DEVELOPER_MATERIAL', 'accessed_at': '2026-10-20', 'notes': {'en': NOTE}},
        {'key': 'S3', 'name': f'{prefix} listing page (fictional)', 'publisher': 'Illustrative Listings (fictional)', 'url': None, 'tier': 4, 'source_type': 'BROKER_LISTING', 'accessed_at': '2026-10-20', 'notes': {'en': NOTE}},
    ]

def complete_package(pid, letter, tone):
    d = os.path.join(ROOT, pid); shutil.rmtree(d, ignore_errors=True); os.makedirs(os.path.join(d, 'raw'))
    name = f'Illustrative Residence {letter}'
    placeholder(os.path.join(d, 'raw', 'exterior.jpg'), name, 'ARCHITECTURAL RENDERING · EXTERIOR', tone=tone, gps=True)
    placeholder(os.path.join(d, 'raw', 'interior.png'), name, 'ARCHITECTURAL RENDERING · INTERIOR', tone=tuple(c + 14 for c in tone))
    placeholder(os.path.join(d, 'raw', 'amenity.jpg'), name, 'ARCHITECTURAL RENDERING · AMENITY', tone=tuple(c + 6 for c in tone))
    placeholder(os.path.join(d, 'raw', 'progress.jpg'), name, 'PHOTO · CONSTRUCTION PROGRESS', tone=(70, 66, 60))
    placeholder(os.path.join(d, 'raw', 'siteplan.png'), name, 'SITE PLAN', tone=(80, 82, 86))
    plan_svg(os.path.join(d, 'raw', 'plan-2plus1.svg'), f'{name} · 2+1 · fictional')
    perm = lambda status, ref: {'status': status, 'scope': ['desk_web'], 'evidence_ref': ref, 'granted_at': '2026-10-21' if status == 'GRANTED_WRITTEN' else None, 'expires_at': None}
    write(d, {
        'package_id': pid, 'received_at': '2026-10-21', 'category': 'real_estate', 'market': {'slug': 'illustrative-market'},
        'provided_by_role': 'Sales manager (fictional)',
        'sources': sources(name),
        'developer': {'name': f'Illustrative Developer {letter}', 'summary': {'en': 'Fictional developer used for testing.'}},
        'district': {'name': 'Illustrative District North', 'slug': 'illustrative-district-north', 'admin_level': 'DISTRICT'},
        'project': {'name': name, 'asset_types': ['APARTMENT'], 'description': {'en': f'{name} is a fictional residential project used to test the Nexus Desk ingestion and rendering lifecycle.'}},
        'assets': [{'key': 'A1'}],
        'opportunity': {'title': {'en': f'{name} — 2+1 apartments (illustrative)'}, 'summary': {'en': 'Illustrative opportunity record. Not a real project and not real market data.'}, 'asset_key': 'A1', 'investor_objective_tags': ['long_term_hold']},
        'facts': [
            {'key': 'F-NAME', 'subject': 'project', 'field': 'name', 'value': name, 'unit': 'text', 'claim': {'en': 'Project name as registered.'}, 'source': 'S1', 'evidence_class': 'FACT', 'verification_status': 'VERIFIED', 'geography': 'Illustrative District North', 'period': None, 'locator': 'extract p.1'},
            {'key': 'F-LEGAL', 'subject': 'developer', 'field': 'legal_entity_name', 'value': f'Illustrative Developer {letter} Ltd (fictional)', 'unit': 'text', 'claim': {'en': 'Legal entity of the developer.'}, 'source': 'S1', 'evidence_class': 'LEGAL FACT', 'verification_status': 'VERIFIED', 'geography': 'Illustrative Market', 'period': None},
            {'key': 'F-STATUS', 'subject': 'project', 'field': 'delivery_status', 'value': 'UNDER_CONSTRUCTION', 'unit': 'text', 'claim': {'en': 'Construction is under way.'}, 'source': 'S2', 'evidence_class': 'FACT', 'verification_status': 'DEVELOPER-CLAIM', 'geography': 'Illustrative District North', 'period': '2026-10', 'limitations': {'en': 'Stated by the developer; not yet independently inspected.'}},
            {'key': 'F-DELIVERY', 'subject': 'project', 'field': 'expected_delivery', 'value': '2028-06', 'unit': 'date', 'claim': {'en': 'Developer-stated expected delivery.'}, 'source': 'S2', 'evidence_class': 'PROJECTION', 'verification_status': 'DEVELOPER-CLAIM', 'geography': 'Illustrative District North', 'period': '2026-10', 'next_review_trigger': '2027-04-01'},
            {'key': 'F-TYPE', 'subject': 'asset:A1', 'field': 'unit_type', 'value': '2+1', 'unit': 'text', 'claim': {'en': 'Unit layout.'}, 'source': 'S2', 'evidence_class': 'FACT', 'verification_status': 'DEVELOPER-CLAIM', 'geography': 'Illustrative District North', 'period': '2026-10'},
            {'key': 'F-GROSS', 'subject': 'asset:A1', 'field': 'gross_area_m2', 'value': 110, 'unit': 'm2', 'area_basis': 'GROSS', 'claim': {'en': 'Gross area per media kit.'}, 'source': 'S2', 'evidence_class': 'FACT', 'verification_status': 'DEVELOPER-CLAIM', 'geography': 'Illustrative District North', 'period': '2026-10'},
            {'key': 'F-NET', 'subject': 'asset:A1', 'field': 'net_area_m2', 'value': 82, 'unit': 'm2', 'area_basis': 'NET', 'claim': {'en': 'Net area per media kit.'}, 'source': 'S2', 'evidence_class': 'FACT', 'verification_status': 'DEVELOPER-CLAIM', 'geography': 'Illustrative District North', 'period': '2026-10'},
            {'key': 'F-ADELIV', 'subject': 'asset:A1', 'field': 'delivery_status', 'value': 'UNDER_CONSTRUCTION', 'unit': 'text', 'claim': {'en': 'Unit delivery status.'}, 'source': 'S2', 'evidence_class': 'FACT', 'verification_status': 'DEVELOPER-CLAIM', 'geography': 'Illustrative District North', 'period': '2026-10'},
            {'key': 'F-AMEN', 'subject': 'project', 'field': None, 'value': None, 'unit': None, 'claim': {'en': 'Listing mentions on-site amenities (not verified).'}, 'source': 'S3', 'evidence_class': 'OPINION', 'verification_status': 'UNVERIFIED', 'geography': 'Illustrative District North', 'period': '2026-10'},
            {'key': 'F-PRICE', 'domain': 'PRICING', 'subject': 'asset:A1', 'field': 'price_list', 'value': 1, 'currency': 'TRY', 'claim': {'en': 'Fictional price-list line — must stay private.'}, 'source': 'S2'},
        ],
        'unknowns': [],
        'research_blocks': [
            {'subject': 'project', 'domain': 'PROJECT_ASSET', 'research_closure': 'YES', 'data_completeness': 'PARTIAL', 'note': 'Identity verified; unit facts are developer claims.'},
            {'subject': 'project', 'domain': 'DEVELOPER', 'research_closure': 'YES', 'data_completeness': 'PARTIAL'},
            {'subject': 'project', 'domain': 'RISK', 'research_closure': 'CONDITIONAL', 'data_completeness': 'PARTIAL'},
        ],
        'risks': [
            {'risk_type': 'CONSTRUCTION_DELIVERY', 'title': {'en': 'Delivery date rests on the developer’s statement'}, 'cause': {'en': 'No independent construction-progress inspection yet.'}, 'evidence_facts': ['F-DELIVERY'], 'horizon': 'MEDIUM', 'controllability': 'PARTIAL', 'mitigation': {'en': 'Request dated progress reports and a contractual delivery clause.'}, 'residual_uncertainty': {'en': 'Delivery may slip; no penalty terms reviewed.'}},
            {'risk_type': 'LEGAL_TITLE', 'title': {'en': 'Title type not yet confirmed'}, 'cause': {'en': 'Title documentation not yet reviewed by counsel.'}, 'evidence_facts': [], 'mitigation': {'en': 'Professional legal due diligence.'}, 'residual_uncertainty': None},
        ],
        'disclosures': [{'kind': 'COMMISSION', 'text': {'en': 'Illustrative disclosure: Nexus Ways may receive a commission from the developer if a purchase completes. This does not affect the research shown.'}}],
        'documents': [{'key': 'D1', 'title': 'Brochure (fictional)', 'kind': 'brochure', 'confidential': False}, {'key': 'D2', 'title': 'Price list (fictional)', 'kind': 'price_list', 'confidential': True}],
        'media': [
            {'file': 'raw/exterior.jpg', 'source': 'S2', 'media_type': 'RENDERING', 'content_category': 'exterior', 'role': 'cover', 'order': 0, 'caption': {'en': 'Exterior — architectural rendering (illustrative placeholder)'}, 'alt': {'en': 'Grey placeholder labelled illustrative exterior rendering'}, 'permission': perm('GRANTED_WRITTEN', 'PRIV-PERM-FIX-1'), 'attribution': {'required': True, 'text': f'© Illustrative Developer {letter} (fictional)'}},
            {'file': 'raw/interior.png', 'source': 'S2', 'media_type': 'RENDERING', 'content_category': 'interior', 'role': 'gallery', 'order': 1, 'caption': {'en': 'Living room — architectural rendering (illustrative placeholder)'}, 'alt': {'en': 'Grey placeholder labelled illustrative interior rendering'}, 'permission': perm('GRANTED_WRITTEN', 'PRIV-PERM-FIX-1'), 'attribution': {'required': False, 'text': None}},
            {'file': 'raw/amenity.jpg', 'source': 'S2', 'media_type': 'RENDERING', 'content_category': 'amenity', 'role': 'gallery', 'order': 2, 'caption': {'en': 'Amenity area — architectural rendering (illustrative placeholder)'}, 'alt': {'en': 'Grey placeholder labelled illustrative amenity rendering'}, 'permission': perm('GRANTED_WRITTEN', 'PRIV-PERM-FIX-1'), 'attribution': {'required': False, 'text': None}},
            {'file': 'raw/plan-2plus1.svg', 'source': 'S2', 'media_type': 'FLOOR_PLAN', 'content_category': 'plan', 'role': 'gallery', 'order': 3, 'caption': {'en': '2+1 — indicative floor plan (illustrative placeholder)'}, 'alt': {'en': 'Simple illustrative floor plan with three rooms'}, 'permission': perm('GRANTED_WRITTEN', 'PRIV-PERM-FIX-1'), 'attribution': {'required': False, 'text': None}},
            {'file': 'raw/progress.jpg', 'source': 'S2', 'media_type': 'CONSTRUCTION_PROGRESS', 'content_category': 'progress', 'role': 'gallery', 'order': 4, 'depicted_date': '2026-09', 'caption': {'en': 'Construction progress — photo (illustrative placeholder)'}, 'alt': {'en': 'Placeholder labelled construction progress photo'}, 'permission': perm('GRANTED_VERBAL', None), 'attribution': {'required': False, 'text': None}},
            {'file': 'raw/siteplan.png', 'source': 'S2', 'media_type': 'SITE_PLAN', 'content_category': 'plan', 'role': 'gallery', 'order': 5, 'caption': {'en': 'Site plan (illustrative placeholder)'}, 'alt': {'en': 'Placeholder labelled site plan'}, 'permission': {'status': 'RESTRICTED', 'scope': [], 'evidence_ref': 'PRIV-PERM-FIX-2', 'granted_at': None, 'expires_at': None}, 'attribution': {'required': False, 'text': None}},
        ],
    })

def incomplete_package():
    pid = 'FIX-PKG-B'; d = os.path.join(ROOT, pid); shutil.rmtree(d, ignore_errors=True); os.makedirs(os.path.join(d, 'raw'))
    name = 'Illustrative Residence B'
    placeholder(os.path.join(d, 'raw', 'cover.jpg'), name, 'ARCHITECTURAL RENDERING · EXTERIOR', tone=(64, 58, 58))
    write(d, {
        'package_id': pid, 'received_at': '2026-10-22', 'category': 'real_estate', 'market': {'slug': 'illustrative-market'},
        'provided_by_role': 'Sales office (fictional)',
        'sources': sources(name)[1:],
        'developer': {'name': 'Illustrative Developer B'},
        'project': {'name': name, 'asset_types': ['APARTMENT']},
        'opportunity': {'title': {'en': f'{name} (illustrative, incomplete)'}},
        'facts': [
            {'key': 'F-NAME', 'subject': 'project', 'field': 'name', 'value': name, 'unit': 'text', 'claim': {'en': 'Name as shown in the media kit.'}, 'source': 'S2', 'evidence_class': 'FACT', 'verification_status': 'DEVELOPER-CLAIM', 'geography': 'Illustrative Market', 'period': None},
            {'key': 'F-STATUS', 'subject': 'project', 'field': 'delivery_status', 'value': 'OFF_PLAN', 'unit': 'text', 'claim': {'en': 'Listing describes the project as off-plan.'}, 'source': 'S3', 'evidence_class': 'FACT', 'verification_status': 'UNVERIFIED', 'geography': 'Illustrative Market', 'period': '2026-10'},
            {'key': 'F-OLD', 'subject': 'project', 'field': None, 'value': None, 'unit': None, 'claim': {'en': 'Old brochure statement about the site.'}, 'source': 'S2', 'evidence_class': 'OPINION', 'verification_status': 'DEVELOPER-CLAIM', 'geography': 'Illustrative Market', 'period': '2024', 'retrieved_at': '2024-05-01'},
        ],
        'unknowns': [
            {'subject': 'developer', 'field': 'legal_entity_name', 'state': 'PROFESSIONAL DD REQUIRED', 'note': 'Registry check not yet performed.'},
            {'subject': 'project', 'field': 'district_id', 'state': 'ACCESSIBLE BUT NOT YET COLLECTED', 'note': 'Address not yet confirmed.'},
        ],
        'research_blocks': [{'subject': 'project', 'domain': 'PROJECT_ASSET', 'research_closure': 'NO', 'data_completeness': 'NO'}],
        'media': [
            {'file': 'raw/cover.jpg', 'source': 'S2', 'media_type': 'RENDERING', 'content_category': 'exterior', 'role': 'cover', 'caption': {'en': 'Exterior — architectural rendering (illustrative placeholder)'}, 'alt': {'en': 'Placeholder labelled illustrative exterior rendering'}, 'permission': {'status': 'GRANTED_VERBAL', 'scope': ['desk_web'], 'evidence_ref': None, 'granted_at': None, 'expires_at': None}, 'attribution': {'required': False, 'text': None}},
        ],
    })

def update_package():
    """Second package for Residence A from another source: contradicts the delivery date (opens a conflict)."""
    pid = 'FIX-PKG-A2'; d = os.path.join(ROOT, pid); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    write(d, {
        'package_id': pid, 'received_at': '2026-10-26', 'category': 'real_estate', 'market': {'slug': 'illustrative-market'},
        'provided_by_role': 'Analyst (fictional)',
        'sources': [S4],
        'project': {'name': 'Illustrative Residence A', 'slug': 'illustrative-residence-a'},
        'facts': [
            {'key': 'F-DELIVERY2', 'subject': 'project', 'field': 'expected_delivery', 'value': '2029-03', 'unit': 'date', 'claim': {'en': 'Report states a later expected delivery.'}, 'source': 'S4', 'evidence_class': 'FACT', 'verification_status': 'SOURCE-REPORTED', 'geography': 'Illustrative District North', 'period': '2026-10'},
        ],
    })

def borrowed_image_package():
    """Third package for Residence A that re-uses B's image file: must be refused as a whole (nothing written)."""
    pid = 'FIX-PKG-A3'; d = os.path.join(ROOT, pid); shutil.rmtree(d, ignore_errors=True); os.makedirs(os.path.join(d, 'raw'))
    shutil.copyfile(os.path.join(ROOT, 'FIX-PKG-B', 'raw', 'cover.jpg'), os.path.join(d, 'raw', 'borrowed.jpg'))
    write(d, {
        'package_id': pid, 'received_at': '2026-10-26', 'category': 'real_estate', 'market': {'slug': 'illustrative-market'},
        'provided_by_role': 'Analyst (fictional)', 'sources': [S4],
        'project': {'name': 'Illustrative Residence A', 'slug': 'illustrative-residence-a'}, 'facts': [],
        'media': [
            {'file': 'raw/borrowed.jpg', 'source': 'S4', 'media_type': 'RENDERING', 'content_category': 'exterior', 'role': 'gallery', 'caption': {'en': 'Should be rejected: belongs to another project'}, 'alt': {'en': 'Placeholder'}, 'permission': {'status': 'GRANTED_WRITTEN', 'scope': ['desk_web'], 'evidence_ref': 'PRIV-PERM-FIX-3', 'granted_at': '2026-10-26', 'expires_at': None}, 'attribution': {'required': False, 'text': None}},
        ],
    })

S4 = {'key': 'S4', 'name': 'Illustrative news report (fictional)', 'publisher': 'Illustrative News (fictional)', 'url': None, 'tier': 2, 'source_type': 'MEDIA', 'accessed_at': '2026-10-26', 'notes': {'en': NOTE}}

if __name__ == '__main__':
    os.makedirs(ROOT, exist_ok=True)
    complete_package('FIX-PKG-A', 'A', (58, 60, 66))
    complete_package('FIX-PKG-C', 'C', (52, 56, 64))
    incomplete_package()
    update_package()
    borrowed_image_package()
    print('fixture packages written to', ROOT)
