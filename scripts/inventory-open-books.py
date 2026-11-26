"""Plan openly licensed whole-book candidates. This never approves publication."""
import csv, json, re, sys, hashlib
from pathlib import Path
from collections import Counter
from urllib.parse import urlparse

csv.field_size_limit(16 * 1024 * 1024)
folder = Path('research/open-access')
folder.mkdir(parents=True, exist_ok=True)
source = Path(sys.argv[1]) if len(sys.argv) > 1 else folder / 'oapen.csv'
def licence(value):
    # Metadata CC0 is deliberately not consulted: only each book's licence.
    value = value.strip().lower().replace('http://', 'https://')
    match = re.fullmatch(r'https://creativecommons\.org/(licenses/(by|by-sa)/([234]\.0)|publicdomain/zero/1\.0)/?(?:legalcode(?:\.[a-z-]+)?)?', value)
    return value if match else None
def norm(value):
    return re.sub(r'\W+', '', value.casefold())

counts, reasons, languages, candidates, seen = Counter(), Counter(), Counter(), [], set()
with source.open(encoding='utf-8-sig', newline='') as stream:
    for row in csv.DictReader(stream):
        counts['records'] += 1
        if row.get('dc.type', '').strip().lower() != 'book':
            reasons['not a complete-book record'] += 1
            continue
        counts['book records'] += 1
        rights = [licence(v) for v in row.get('BITSTREAM_License', '').split('||')]
        if not rights or any(v is None for v in rights):
            reasons['no unambiguous BY, BY-SA or CC0 book licence'] += 1
            continue
        urls = [u.strip() for u in row.get('BITSTREAM_Download_URL', '').split('||') if u.strip()]
        if len(urls) != 1 or urlparse(urls[0]).scheme != 'https' or not urlparse(urls[0]).path.lower().endswith('.pdf'):
            reasons['requires source-format or multi-file review'] += 1
            continue
        title = row.get('dc.title', '').strip()
        authors = row.get('dc.contributor.author') or row.get('dc.contributor.editor') or ''
        if not title or not authors:
            reasons['missing title or responsible contributor'] += 1
            continue
        identifiers = [('doi', norm(row.get('oapen.identifier.doi', ''))), ('work', norm(title + authors + row.get('dc.language', '')))]
        keys = {kind + ':' + value for kind, value in identifiers if value}
        if keys & seen:
            reasons['duplicate metadata work or DOI'] += 1
            continue
        seen.update(keys)
        languages[row.get('dc.language', 'unknown')] += 1
        candidates.append({'status': 'candidate-needs-full-edition-review', 'licences': rights, 'source': urls[0], 'metadata': row})
summary = {'input': str(source), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'counts': dict(counts), 'potentialWholeBooks': len(candidates), 'heldAtInventory': dict(reasons), 'languages': dict(languages), 'approvedForPublication': 0, 'nextChecks': ['complete original PDF and source identity', 'printed book licence and third-party exceptions', 'active-content and file-size checks', 'cross-provider DOI/ISBN/work duplicates', 'all-page readability and representative visual review']}
output = folder / (source.stem + '-inventory')
output.with_suffix('.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
with output.with_suffix('.ndjson').open('w', encoding='utf-8') as stream:
    for row in candidates:
        stream.write(json.dumps(row, ensure_ascii=False) + '\n')
print(json.dumps(summary))
