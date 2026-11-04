"""Rigenera icone e immagini dell'interfaccia dalle illustrazioni sorgente.

Uso (facoltativo, solo sviluppo; le immagini generate sono già nel repo):
    pip install pillow
    python scripts/genera-immagini.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

RADICE = Path(__file__).resolve().parent.parent
ICONA = RADICE / 'assets' / 'icona-sorgente.webp'
ILLUSTRAZIONE = RADICE / 'assets' / 'illustrazione-sorgente.webp'


def arrotonda(im: Image.Image, raggio=0.178) -> Image.Image:
    """Angoli arrotondati trasparenti, con bordo anti-aliasing."""
    w, h = im.size
    k = 4
    maschera = Image.new('L', (w * k, h * k), 0)
    ImageDraw.Draw(maschera).rounded_rectangle((0, 0, w * k - 1, h * k - 1), radius=int(w * k * raggio), fill=255)
    out = im.convert('RGBA')
    out.putalpha(maschera.resize((w, h), Image.LANCZOS))
    return out


def main() -> None:
    icona = Image.open(ICONA).convert('RGB')
    f = icona.width / 1254
    for s in (16, 32, 48, 96, 128):
        sorgente = icona
        if s <= 32:
            # Alle dimensioni minuscole ritagliamo sulla testa, più leggibile.
            sorgente = icona.crop((int(150 * f), int(20 * f), int(1150 * f), int(1020 * f)))
        arrotonda(sorgente.resize((s, s), Image.LANCZOS)).save(RADICE / 'public' / 'icon' / f'{s}.png', optimize=True)

    img = RADICE / 'public' / 'img'
    img.mkdir(exist_ok=True)
    arrotonda(icona.resize((192, 192), Image.LANCZOS)).save(img / 'alligatore.webp', quality=85, method=6)

    eroe = Image.open(ILLUSTRAZIONE).convert('RGB')
    # Ritaglio sull'alligatore e sulle icone che gli volano attorno.
    g = eroe.width / 941
    eroe = eroe.crop((0, int(260 * g), eroe.width, int(1500 * g)))
    eroe.resize((600, round(eroe.height * 600 / eroe.width)), Image.LANCZOS).save(img / 'eroe.webp', quality=80, method=6)
    print('Immagini generate in public/icon e public/img')


if __name__ == '__main__':
    main()
