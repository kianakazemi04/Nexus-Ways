#!/usr/bin/env python3
"""Create a web derivative of one raster image: max 2400 px long edge, WebP, all metadata (EXIF/GPS/XMP/ICC text) dropped.
Usage: media_derive.py <src> <dst.webp>   → prints JSON {width, height, had_exif, had_gps}
Requires Pillow (pip install pillow). Used only by ingest.mjs; never part of the published site."""
import json, sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
exif = im.getexif()
had_exif = len(exif) > 0
had_gps = bool(exif.get_ifd(0x8825)) if had_exif else False
im = im.convert('RGB')
im.thumbnail((2400, 2400))
clean = Image.new('RGB', im.size)          # copy pixels only → no metadata survives
clean.paste(im)
clean.save(dst, 'WEBP', quality=82, method=6)
print(json.dumps({'width': clean.width, 'height': clean.height, 'had_exif': had_exif, 'had_gps': had_gps}))
