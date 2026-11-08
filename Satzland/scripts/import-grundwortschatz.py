#!/usr/bin/env python3
"""Converts the official NRW Grundwortschatz word list (QUA-LiS NRW) into app/data/gws-nrw.json.

Source: https://www.qua-lis.nrw.de/system/files/media/document/file/wortliste-grundwortschatz-nrw.xlsx
(Handreichung "Hinweise und Materialien für einen systematischen Rechtschreibunterricht in der
Primarstufe in NRW", MSB NRW, 2. Auflage 11/2019). Usage:

    python3 scripts/import-grundwortschatz.py wortliste-grundwortschatz-nrw.xlsx

Only the standard library is used, so no extra packages are needed.
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
# Column headings of the official sheet, shortened for the app. The order follows the sheet.
LABELS = {
    'der': 'der', 'die': 'die', 'das': 'das', 'häufig gebrauchte ( Funktions-) Merkwörter': 'Merkwort',
    'kurzes u': 'kurzes u', 'kurzes i (vor r in NRW oft lang gesprochen)': 'kurzes i',
    'vokalisiertes r': 'vokalisiertes r', 'silbentrennendes -h': 'silbentrennendes h',
    'im Präteritum unregelmäßige Verben': 'unregelmäßiges Verb', 'Wörter des Bild-Wort-Schatzes': 'Bildwort',
}


def column(ref):
    return re.match(r'[A-Z]+', ref).group(0)


def main(path, target):
    archive = zipfile.ZipFile(path)
    strings = [''.join(t.text or '' for t in si.iter('{%s}t' % NS['m']))
               for si in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si', NS)]
    rows = []
    for row in ET.fromstring(archive.read('xl/worksheets/sheet1.xml')).findall('.//m:row', NS):
        values = {}
        for cell in row.findall('m:c', NS):
            value = cell.find('m:v', NS)
            text = strings[int(value.text)] if value is not None and cell.get('t') == 's' else (value.text if value is not None else '')
            values[column(cell.get('r'))] = (text or '').strip()
        rows.append(values)
    header = {key: ' '.join(value.split()) for key, value in rows[3].items()}
    words = []
    for row in rows[5:]:
        word = row.get('A', '')
        if not word:
            continue
        tags = [LABELS.get(header[key], header[key]) for key, value in row.items() if key != 'A' and value.lower() == 'x']
        words.append({'w': word, 'tags': tags})
    if len(words) != 533:
        raise SystemExit(f'Expected 533 words, found {len(words)}')
    Path(target).write_text(json.dumps(words, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'{len(words)} Wörter nach {target} geschrieben.')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else str(Path(__file__).resolve().parent.parent / 'app/data/gws-nrw.json'))
