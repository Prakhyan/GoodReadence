"""Five original geometric glyphs used by the reviewed source catalogue."""
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

shapes = {
    0x2500: [(0, 370, 600, 430)],
    0x2502: [(270, -100, 330, 900)],
    0x251C: [(270, -100, 330, 900), (300, 370, 600, 430)],
    0x254B: [(260, -100, 340, 900), (0, 360, 600, 440)],
    0x30FB: [],
}
order = ['.notdef'] + ['uni%04X' % cp for cp in shapes]
glyphs = {}
for name in order:
    pen = TTGlyphPen(None)
    cp = int(name[3:], 16) if name != '.notdef' else None
    for left, bottom, right, top in shapes.get(cp, []):
        pen.moveTo((left, bottom)); pen.lineTo((right, bottom))
        pen.lineTo((right, top)); pen.lineTo((left, top)); pen.closePath()
    if cp == 0x30FB:
        pen.moveTo((380, 400)); pen.qCurveTo((380, 480), (300, 480))
        pen.qCurveTo((220, 480), (220, 400)); pen.qCurveTo((220, 320), (300, 320))
        pen.qCurveTo((380, 320), (380, 400)); pen.closePath()
    glyphs[name] = pen.glyph()
font = FontBuilder(1000, isTTF=True)
font.setupGlyphOrder(order)
font.setupCharacterMap({cp: 'uni%04X' % cp for cp in shapes})
font.setupGlyf(glyphs)
font.setupHorizontalMetrics({name: (600, 0) for name in order})
font.setupHorizontalHeader(ascent=900, descent=-100)
font.setupNameTable({'familyName': 'Casid Reader Symbols', 'styleName': 'Regular',
                    'uniqueFontIdentifier': 'CasidReaderSymbols-1.0',
                    'fullName': 'Casid Reader Symbols Regular',
                    'psName': 'CasidReaderSymbols-Regular', 'version': 'Version 1.0',
                    'copyright': 'Copyright 2026 Casid Studio. Original geometric glyphs.'})
font.setupOS2(sTypoAscender=900, sTypoDescender=-100, usWinAscent=900, usWinDescent=100)
font.setupPost()
font.save('assets/fonts/CasidSymbols-Regular.ttf')
