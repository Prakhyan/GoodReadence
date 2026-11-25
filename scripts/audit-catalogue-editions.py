"""Recheck each reviewed edition without publishing or uploading its full source."""
import hashlib, json, os, posixpath, re, zipfile
from io import BytesIO
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import unquote
from lxml import etree

root = Path(__file__).resolve().parents[1]
books = json.loads((root / 'public-books/catalog.json').read_text(encoding='utf8'))
books = books[int(os.environ.get('AUDIT_START', 0)):int(os.environ.get('AUDIT_END', len(books)))]
records, seen_ids, seen_urls, seen_titles, seen_text = [], set(), {}, {}, {}
normalize = lambda text: re.sub(r'[^\w]', '', text.casefold())
def source_path(book):
    if book['delivery']['provider'] == 'Standard Ebooks':
        return root / ('research/on-demand/wolfings.epub' if book['id'] == 2885 else 'research/on-demand/mansfield.epub')
    return root / book['sourceFile']

def sources():
    # Four source archives in flight; avoid thousands of small reads from each ZIP.
    with ThreadPoolExecutor(max_workers=4) as pool:
        incoming = iter(books); pending = deque()
        for _ in range(4):
            book = next(incoming, None)
            if book is not None: pending.append((book, pool.submit(source_path(book).read_bytes)))
        while pending:
            book, task = pending.popleft()
            yield book, task.result()
            next_book = next(incoming, None)
            if next_book is not None: pending.append((next_book, pool.submit(source_path(next_book).read_bytes)))

for book, source_bytes in sources():
    if len(records) < 10 or len(records) % 50 == 0: print('Checking edition', len(records) + 1, book['id'], flush=True)
    errors = []
    identity = book['id']; delivery = book['delivery']; review = delivery.get('rightsReview') or book.get('rightsReview', {})
    if identity in seen_ids: errors.append('Duplicate catalogue ID')
    seen_ids.add(identity)
    for table, key, label in [(seen_urls, delivery['url'], 'source URL'), (seen_titles, normalize(book['title']) + ':' + normalize(book['author']), 'title and author')]:
        if key in table: errors.append('Duplicate ' + label + ': ' + str(table[key]))
        table[key] = identity
    digest = hashlib.sha256(source_bytes).hexdigest()
    if delivery['provider'] == 'Project Gutenberg' and digest != book.get('sourceSha256'): errors.append('Source digest changed since review')
    if not all(m in review.get('markets', []) for m in ['India', 'US', 'UK', 'EU']): errors.append('Missing intended-market review')
    if delivery['provider'] == 'Project Gutenberg':
        if not review.get('listedContributors') or any(not isinstance(c.get('death'), int) or c['death'] > 1945 for c in review['listedContributors']): errors.append('Unknown or out-of-policy creative contributor')
    elif not (review.get('authorDeath', 9999) <= 1905 and review.get('artistDeath', 9999) <= 1905 and review.get('productionLicense') == 'https://creativecommons.org/publicdomain/zero/1.0/'): errors.append('Missing source-art or production permission evidence')
    with zipfile.ZipFile(BytesIO(source_bytes)) as archive:
        parser = etree.XMLParser(resolve_entities=False, no_network=True)
        parse = lambda name: etree.fromstring(archive.read(name), parser)
        container = parse('META-INF/container.xml')
        pkgpath = container.xpath('string(//*[local-name()="rootfile"]/@full-path)')
        package = parse(pkgpath); folder = posixpath.dirname(pkgpath)
        rights = ' '.join(package.xpath('//*[local-name()="rights"]/text()'))
        if delivery['provider'] == 'Project Gutenberg' and not re.search(r'public domain in (?:the )?(?:USA|United States)', rights, re.I): errors.append('Missing US public-domain source statement')
        if delivery['provider'] == 'Standard Ebooks' and 'CC0' not in rights: errors.append('Missing CC0 production statement')
        names = set(package.xpath('//*[local-name()="creator" or local-name()="contributor"]/text()'))
        if names != set(delivery['reviewedNames']): errors.append('Contributor identity changed')
        manifest = {item.get('id'): item for item in package.xpath('//*[local-name()="manifest"]/*[local-name()="item"]')}
        text, sections, images = [], 0, 0
        for ref in package.xpath('//*[local-name()="spine"]/*[local-name()="itemref"]'):
            item = manifest[ref.get('idref')]; name = posixpath.normpath(posixpath.join(folder, unquote(item.get('href')).split('#')[0]))
            chapter = parse(name); body = chapter.find('.//{*}body')
            if body is None: errors.append('Missing chapter body: ' + name); continue
            for node in body.xpath('.//*[local-name()="script" or local-name()="style"]'): node.getparent().remove(node)
            text.append(' '.join(body.itertext())); sections += 1
        for item in manifest.values():
            if (item.get('media-type') or '').startswith('image/'):
                name = posixpath.normpath(posixpath.join(folder, unquote(item.get('href')).split('#')[0])); archive.read(name); images += 1
        content = '\n'.join(text)
        if not sections or len(content.split()) < 100: errors.append('Empty or incomplete source')
        if delivery['provider'] == 'Project Gutenberg':
            if sections != book['sourceSections']: errors.append('Reading-order section count changed')
            if 'project gutenberg' not in content.casefold(): errors.append('Source licence missing from complete reading order')
        elif not re.search(r'uncopyright|creative commons|CC0', content, re.I): errors.append('Source dedication missing from reading order')
        # Strip the varying PG header/footer before comparing full source text.
        body_text = re.split(r'\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG[^\n]*\*\*\*', content, flags=re.I)[-1]
        body_text = re.split(r'\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG', body_text, flags=re.I)[0]
        text_hash = hashlib.sha256(normalize(body_text).encode()).hexdigest()
        if text_hash in seen_text: errors.append('Duplicate complete source text: ' + str(seen_text[text_hash]))
        seen_text[text_hash] = identity
    records.append({'id': identity, 'accepted': not errors, 'sourceSha256': digest, 'sourceTextSha256': text_hash, 'spineSections': sections, 'manifestImagesChecked': images, 'words': len(content.split()), 'sourceRights': rights, 'errors': errors})
    if len(records) % 200 == 0: print('Reviewed', len(records), 'editions', flush=True)
report = {'checked': '2026-11-26', 'markets': ['India', 'US', 'UK', 'EU'], 'policy': 'Edition-specific historical contributor reviews retained; source rights statements, reviewed identities, complete reading order and images rechecked. This is documented screening, not a worldwide legal certification.', 'total': len(records), 'accepted': sum(r['accepted'] for r in records), 'held': sum(not r['accepted'] for r in records), 'records': records}
(root / os.environ.get('AUDIT_OUTPUT', 'docs/catalogue-edition-audit.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print('Accepted', report['accepted'], 'Held', report['held'])
if report['held']:
    print([(r['id'], r['errors']) for r in records if not r['accepted']]); raise SystemExit(1)
