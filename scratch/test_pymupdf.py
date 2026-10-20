import pymupdf
from PIL import Image

svg_test = '''<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300">
<rect width="500" height="300" fill="white"/>
<rect x="50" y="50" width="400" height="200" fill="#f5f5f5" stroke="black" stroke-width="2"/>
<text x="250" y="150" font-family="Arial" font-size="20" fill="black" text-anchor="middle">TEST</text>
</svg>'''

doc = pymupdf.open("svg", svg_test.encode("utf-8"))
pix = doc[0].get_pixmap()
pix.save("scratch/test_inline.png")
im = Image.open("scratch/test_inline.png")
print("Pixel 0,0:", im.getpixel((0,0)))
print("Pixel 100,100:", im.getpixel((100,100)))
print("Pixel 250,150:", im.getpixel((250,150)))
