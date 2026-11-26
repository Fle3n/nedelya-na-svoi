import zipfile, re, sys
import xml.etree.ElementTree as ET
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
RNS = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'

def col2n(c):
    n = 0
    for ch in c:
        n = n * 26 + ord(ch) - 64
    return n - 1

def read(path):
    z = zipfile.ZipFile(path)
    ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall('m:si', NS):
            ss.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    relmap = {r.get('Id'): r.get('Target') for r in rels}
    sheets = []
    for s in wb.find('m:sheets', NS):
        target = relmap[s.get(RNS)]
        target = target.lstrip('/')
        if not target.startswith('xl/'):
            target = 'xl/' + target
        sheets.append((s.get('name'), target))
    return z, ss, sheets

def rows(z, ss, target, maxrows=None):
    out = []
    with z.open(target) as f:
        for ev, el in ET.iterparse(f):
            if el.tag == '{%s}row' % NS['m']:
                r = {}
                for c in el.findall('m:c', NS):
                    ref = c.get('r'); t = c.get('t')
                    col = col2n(re.match(r'[A-Z]+', ref).group(0))
                    v = c.find('m:v', NS)
                    if t == 's' and v is not None:
                        val = ss[int(v.text)]
                    elif t == 'inlineStr':
                        val = ''.join(x.text or '' for x in c.iter('{%s}t' % NS['m']))
                    else:
                        val = v.text if v is not None else None
                    if val not in (None, ''):
                        r[col] = val
                out.append(r)
                el.clear()
                if maxrows and len(out) >= maxrows:
                    break
    return out
