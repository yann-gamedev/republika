"""Generator ilustrasi flat REPUBLIKA (gaya arrested.jpg). Output: SVG statis tanpa <style>."""
import math, os, sys

NAVY = '#181A1F'; NAVY2 = '#181830'; GREY = '#909090'; LINE = '#787878'; ORANGE = '#D86018'
RED = '#C03018'; GOLD = '#C9A227'; CREAM = '#D8D8C0'; SKIN = '#C09078'; BROWN = '#784848'
WHITE = '#ECEAE4'; HAIR = '#2B2522'; SLATE = '#3A3C56'; DARK = '#111215'; WATER = '#5A6575'
WATER2 = '#6E7889'; OLIVE = '#7A8450'; OLIVE2 = '#6A7444'; BOX = '#B98C5E'; NIGHT = '#2A2C44'


def r(x, y, w, h, f, rx=0, extra=''):
    a = f' rx="{rx}"' if rx else ''
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}"{a} fill="{f}"{extra}/>'


def c(x, y, rad, f, extra=''):
    return f'<circle cx="{x}" cy="{y}" r="{rad}" fill="{f}"{extra}/>'


def e(x, y, rx, ry, f):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{f}"/>'


def poly(pts, f, extra=''):
    return f'<polygon points="{pts}" fill="{f}"{extra}/>'


def p(d, f, extra=''):
    return f'<path d="{d}" fill="{f}"{extra}/>'


def stripes(bg=GREY, line=LINE, y0=20, step=40, n=16, h=5):
    return r(0, 0, 760, 640, bg) + ''.join(r(0, y0 + i * step, 760, h, line) for i in range(n))


def back(x, y, w, h, body, head=HAIR, hat=None, hijab=None):
    """Figur tampak belakang: badan bulat + kepala."""
    s = r(x, y, w, h, body, rx=w * 0.45)
    hx, hr = x + w / 2, w * 0.3
    if hijab:
        s += p(f'M{hx - hr * 1.15} {y + 10} a{hr * 1.15} {hr * 1.25} 0 0 1 {hr * 2.3} 0 v{hr * 0.9} h{-hr * 2.3} z', hijab)
    else:
        s += c(hx, y - hr * 0.55, hr, head)
        if hat:
            s += r(hx - hr * 0.95, y - hr * 1.55, hr * 1.9, hr * 0.7, hat, rx=5)
    return s


def flag(x, y, top, bottom, w=90, h=56, pole=BROWN, pole_h=220):
    s = r(x - 5, y - 6, 5, pole_h, pole) + r(x, y, w, h / 2, top) + r(x, y + h / 2, w, h / 2, bottom)
    if top == RED and bottom == WHITE:
        s += c(x + w / 2, y + h / 4, h / 7, GOLD)
    return s


# ---------------- 14 adegan UI (port dari komponen kanvas) ----------------

def istana():
    s = r(0, 0, 760, 640, NAVY2) + c(130, 110, 40, CREAM) + r(0, 470, 760, 170, '#22243A')
    s += poly('160,250 380,165 600,250', NIGHT) + r(170, 250, 420, 230, NIGHT)
    for x in (195, 260, 325, 409, 474, 539):
        s += r(x, 268, 26, 200, SLATE)
    s += r(230, 300, 20, 44, GOLD) + r(295, 300, 20, 44, GOLD) + r(444, 300, 20, 44, GOLD) + r(509, 370, 20, 44, GOLD)
    s += r(356, 380, 48, 100, GOLD) + r(378, 80, 4, 90, GREY) + r(382, 82, 64, 20, RED) + r(382, 102, 64, 20, WHITE) + c(414, 92, 7, GOLD)
    s += r(150, 480, 460, 14, SLATE) + r(125, 494, 510, 14, NIGHT)
    for x in (236, 460):
        s += r(x, 430, 64, 210, NAVY, rx=32) + c(x + 32, 418, 24, HAIR) + r(x + 8, 392, 48, 16, DARK, rx=4)
    return s


def sumpah():
    s = stripes() + r(464, 30, 6, 430, BROWN) + r(470, 40, 210, 110, RED) + r(470, 150, 210, 110, WHITE) + c(575, 95, 30, GOLD) + c(575, 95, 12, NAVY2)
    s += r(0, 460, 760, 180, BROWN) + r(0, 448, 760, 22, CREAM)
    s += r(300, 418, 160, 38, NAVY2, rx=4) + r(306, 412, 148, 10, CREAM) + r(372, 418, 8, 38, GOLD)
    s += r(226, 290, 40, 30, SKIN) + r(120, 305, 250, 340, NAVY, rx=110) + e(246, 250, 55, 62, HAIR) + r(192, 190, 108, 36, DARK, rx=8)
    s += p('M318 360 L356 338 L420 214 L392 198 Z', NAVY) + r(388, 146, 40, 64, SKIN, rx=14)
    s += p('M290 420 L352 404 L356 438 L292 452 Z', NAVY) + e(364, 420, 32, 15, SKIN)
    return s


def kabinet():
    s = stripes() + r(290, 70, 180, 120, CREAM) + r(320, 130, 24, 44, GOLD) + r(356, 110, 24, 64, RED) + r(392, 96, 24, 78, NAVY2)
    s += r(345, 236, 70, 96, NAVY2, rx=12) + poly('250,320 510,320 650,640 110,640', BROWN)
    s += r(300, 380, 56, 40, CREAM, extra=' transform="rotate(-8 328 400)"') + r(420, 430, 56, 40, CREAM, extra=' transform="rotate(10 448 450)"')
    s += r(330, 520, 70, 46, RED, extra=' transform="rotate(-4 365 543)"')
    s += r(60, 370, 120, 180, NAVY, rx=50) + c(120, 350, 36, HAIR)
    s += r(20, 500, 130, 200, SLATE, rx=56) + p('M44 470 a42 46 0 0 1 84 0 v40 h-84 z', RED)
    s += r(580, 370, 120, 180, SLATE, rx=50) + c(640, 350, 36, HAIR) + r(610, 318, 60, 18, DARK, rx=5)
    s += r(610, 500, 130, 200, NAVY, rx=56) + c(675, 480, 40, LINE)
    return s


def sidang():
    s = r(0, 0, 760, 640, CREAM) + r(0, 0, 760, 200, GREY) + r(330, 40, 100, 56, RED) + r(330, 96, 100, 56, WHITE) + c(380, 68, 14, GOLD)
    s += p('M30 640 A350 330 0 0 1 730 640', BROWN) + p('M110 640 A270 250 0 0 1 650 640', '#8C5A58')
    s += p('M190 640 A190 170 0 0 1 570 640', BROWN) + p('M270 640 A110 95 0 0 1 490 640', CREAM)
    for row, (rx, ry) in enumerate([(300, 278), (230, 208), (160, 138)]):
        n = 13 - row * 2
        for i in range(n):
            a = math.pi - ((i + 0.5) / n) * math.pi
            cx, cy = 380 + rx * math.cos(a), 640 - ry * math.sin(a) - 16
            if (i * 7 + row * 3) % 5 < 2:
                s += r(round(cx + 4), round(cy - 46), 14, 22, WHITE) + r(round(cx + 8), round(cy - 26), 5, 30, SKIN)
            s += c(round(cx), round(cy), 13, LINE if (i + row) % 4 == 0 else HAIR)
    s += r(335, 540, 90, 100, NAVY) + r(366, 560, 28, 28, GOLD, rx=14)
    return s


def meja():
    s = r(0, 0, 760, 640, NAVY) + r(420, 50, 270, 280, NAVY2) + c(610, 120, 26, CREAM) + r(551, 50, 8, 280, NIGHT) + r(420, 186, 270, 8, NIGHT)
    s += r(0, 400, 760, 240, BROWN) + poly('130,180 230,180 260,250 100,250', GOLD) + r(176, 250, 8, 140, SLATE) + r(140, 388, 80, 14, SLATE, rx=4)
    s += poly('100,250 260,250 330,420 30,420', GOLD, ' opacity="0.12"')
    t = ' transform="rotate(-6 400 500)"'
    s += r(300, 430, 200, 140, CREAM, extra=t) + r(330, 455, 120, 8, GREY, extra=t) + r(330, 480, 140, 8, GREY, extra=t)
    s += r(480, 440, 170, 120, RED, extra=' transform="rotate(8 565 500)"')
    s += r(80, 450, 140, 70, DARK, rx=14) + r(94, 430, 112, 28, DARK, rx=14) + r(640, 400, 54, 66, CREAM, rx=8)
    return s


def crowd_rows(rows, colors, start=0):
    s = ''
    for ri, (y, off) in enumerate(rows):
        for i in range(7):
            x = off + i * 112 - 30
            s += r(x, y, 96, 260, colors[(i + ri * 2 + start) % len(colors)], rx=44) + c(x + 48, y, 30, HAIR)
    return s


def demo():
    s = stripes() + r(0, 250, 760, 390, LINE)
    for i in range(12):
        x = 20 + i * 62
        s += r(x, 232, 44, 80, NAVY, rx=18) + r(x, 262, 44, 54, SLATE, rx=4)
    s += r(120, 230, 6, 190, BROWN) + r(60, 230, 190, 80, CREAM) + r(520, 250, 6, 190, BROWN) + r(470, 250, 200, 70, WHITE)
    s += crowd_rows([(400, 0), (470, 50), (540, 0)], [ORANGE, NAVY, WHITE, SLATE, RED, ORANGE])
    return s


def banjir():
    s = r(0, 0, 760, 640, GREY) + poly('60,250 200,170 340,250', RED) + r(80, 250, 240, 200, CREAM) + r(120, 290, 50, 50, NAVY2)
    s += poly('420,230 560,150 700,230', BROWN) + r(440, 230, 240, 220, CREAM) + r(600, 270, 50, 50, NAVY2)
    s += r(0, 380, 760, 260, WATER) + r(40, 420, 200, 5, WATER2) + r(420, 470, 260, 5, WATER2) + r(100, 590, 300, 5, WATER2)
    s += e(380, 520, 170, 40, ORANGE) + r(300, 420, 50, 100, NAVY, rx=20) + r(300, 440, 50, 50, ORANGE) + c(325, 408, 20, HAIR)
    s += r(400, 430, 50, 90, SLATE, rx=20) + c(425, 418, 20, HAIR)
    return s


def pasar():
    s = r(0, 0, 760, 640, CREAM) + ''.join(r(i * 95, 60, 95, 90, WHITE if i % 2 else RED) for i in range(8))
    s += r(40, 150, 680, 10, BROWN) + r(80, 190, 200, 110, NAVY2) + r(100, 215, 80, 12, GOLD) + r(100, 245, 140, 12, CREAM) + r(100, 275, 110, 12, RED)
    s += r(0, 340, 760, 120, BROWN) + c(380, 320, 34, ORANGE) + c(420, 320, 34, RED) + c(400, 290, 34, ORANGE) + c(560, 320, 30, GOLD) + c(600, 320, 30, GOLD)
    s += r(190, 300, 80, 10, GOLD) + r(226, 250, 8, 50, GOLD) + r(150, 248, 160, 6, GOLD)
    s += r(60, 470, 130, 200, SLATE, rx=56) + c(125, 450, 38, HAIR)
    s += r(300, 480, 130, 200, ORANGE, rx=56) + p('M323 470 a42 46 0 0 1 84 0 v34 h-84 z', NAVY2)
    s += r(560, 470, 130, 200, NAVY, rx=56) + c(625, 450, 38, LINE)
    return s


def pelabuhan():
    s = r(0, 0, 760, 640, CREAM) + r(0, 470, 760, 170, WATER) + r(600, 60, 20, 420, GOLD) + r(380, 60, 300, 20, GOLD) + r(452, 80, 4, 120, NAVY)
    s += r(404, 200, 100, 50, RED) + poly('40,400 520,400 480,500 80,500', NAVY)
    cf = [ORANGE, RED, SLATE, GOLD]
    for row in range(3):
        for col in range(4):
            s += r(60 + col * 98, 352 - row * 48, 96, 46, cf[(row + col * 3) % 4])
    s += r(440, 300, 60, 100, WHITE)
    return s


def kunjungan():
    s = r(0, 0, 760, 640, CREAM) + poly('520,200 600,150 680,200', BROWN) + r(530, 200, 140, 80, SKIN)
    s += r(0, 280, 760, 360, OLIVE) + r(0, 320, 760, 6, OLIVE2) + r(0, 380, 760, 6, OLIVE2) + r(0, 450, 760, 6, OLIVE2)
    s += r(60, 300, 100, 250, NAVY, rx=44) + c(110, 285, 32, HAIR)
    s += r(220, 300, 130, 340, WHITE, rx=56) + c(285, 270, 44, HAIR) + r(243, 222, 84, 28, DARK, rx=6)
    s += p('M330 400 L420 420 L420 448 L330 430 Z', WHITE) + r(412, 410, 44, 34, SKIN, rx=14) + p('M520 400 L450 418 L450 444 L520 432 Z', RED)
    s += r(490, 320, 130, 320, RED, rx=56) + c(555, 290, 40, HAIR) + poly('490,280 555,224 620,280', GOLD)
    s += r(650, 340, 100, 300, SLATE, rx=44) + c(700, 320, 32, HAIR)
    return s


def fiskal():
    s = r(0, 0, 760, 640, BROWN) + r(70, 120, 260, 340, CREAM, extra=' transform="rotate(-5 200 290)"')
    s += r(90, 140, 260, 340, WHITE, extra=' transform="rotate(3 220 310)"') + r(300, 140, 24, 70, RED, extra=' transform="rotate(3 220 310)"')
    s += r(130, 210, 150, 10, GREY) + r(130, 240, 180, 10, GREY) + r(130, 270, 120, 10, GREY)
    for x, y, h in ((380, 420, 120), (500, 460, 80), (620, 400, 140)):
        s += r(x, y, 110, h, '#A8861C') + e(x + 55, y, 55, 18, GOLD)
    s += r(480, 80, 200, 260, NAVY2, rx=16) + r(500, 100, 160, 56, WATER, rx=6)
    for row in range(4):
        for col in range(3):
            s += r(506 + col * 52, 176 + row * 38, 36, 30, GOLD if (row, col) == (3, 2) else CREAM, rx=6)
    return s


def sosial():
    s = stripes() + r(420, 220, 110, 200, NAVY, rx=46) + r(420, 250, 110, 80, ORANGE) + c(475, 200, 36, HAIR)
    s += r(340, 380, 420, 80, CREAM) + r(350, 460, 20, 180, BROWN) + r(730, 460, 20, 180, BROWN)
    s += r(560, 300, 90, 80, BOX) + r(650, 320, 80, 60, '#A27A50') + r(600, 240, 80, 60, BOX)
    s += r(200, 380, 110, 260, SLATE, rx=48) + c(255, 360, 36, HAIR)
    s += r(90, 400, 110, 240, RED, rx=48) + p('M108 392 a37 40 0 0 1 74 0 v30 h-74 z', CREAM)
    s += r(-20, 420, 110, 240, NAVY, rx=48) + c(35, 400, 34, LINE)
    return s


def energi():
    s = r(0, 0, 760, 640, CREAM) + r(0, 440, 760, 200, LINE) + r(60, 300, 130, 150, GREY) + e(125, 300, 65, 18, WHITE)
    s += r(210, 330, 100, 120, GREY) + e(260, 330, 50, 14, WHITE) + r(330, 160, 30, 290, NAVY2) + r(330, 160, 30, 24, RED)
    s += '<polygon points="470,450 520,140 570,450" fill="none" stroke="#181A1F" stroke-width="8"/>' + r(470, 210, 100, 8, NAVY) + r(455, 290, 130, 8, NAVY)
    s += r(676, 200, 8, 250, WHITE) + c(680, 200, 10, NAVY)
    for ang in (0, 120, 240):
        s += r(676, 90, 8, 110, WHITE, extra=f' transform="rotate({ang} 680 200)"')
    return s


def tatakelola():
    s = r(0, 0, 760, 640, CREAM) + r(40, 40, 300, 360, BROWN)
    bf = [RED, NAVY2, GOLD, ORANGE, WHITE, SLATE]
    for row in range(3):
        for col in range(8):
            if (col + row) % 5 != 4:
                s += r(56 + col * 34, 52 + row * 120, 30, 96, bf[(col * 2 + row) % 6])
    s += r(40, 150, 300, 10, '#5A3434') + r(40, 270, 300, 10, '#5A3434') + r(400, 80, 300, 200, NAVY2) + r(420, 100, 260, 160, GREY)
    s += r(0, 420, 760, 220, NAVY) + r(160, 380, 260, 70, WHITE, extra=' transform="rotate(-4 290 415)"')
    s += r(480, 300, 40, 70, BROWN, rx=12) + r(450, 364, 100, 40, RED, rx=8)
    return s


# ---------------- 12 ilustrasi event ----------------

def evt_hist_001():  # Konferensi Negara-Negara Selatan
    s = r(0, 0, 760, 640, CREAM) + r(0, 0, 760, 300, GREY)
    flags = [(RED, WHITE), (NAVY2, GOLD), (ORANGE, WHITE), (BROWN, CREAM), (OLIVE, WHITE), (RED, NAVY2)]
    for i, (a, b) in enumerate(flags):
        s += flag(70 + i * 112, 60, a, b, w=76, h=50, pole=LINE, pole_h=250)
    s += r(0, 300, 760, 20, LINE) + e(380, 470, 330, 90, BROWN) + e(380, 455, 300, 70, '#8C5A58')
    for x in (230, 330, 430, 530):
        s += r(x, 432, 44, 30, WHITE, rx=3)
    s += back(60, 470, 130, 220, NAVY) + back(310, 520, 140, 200, SLATE, hat=DARK) + back(570, 470, 130, 220, RED, hijab=CREAM)
    return s


def evt_hist_002():  # Kebuntuan Majelis Konstitusi
    s = stripes(bg='#A8A49A', line='#949086') + r(250, 60, 260, 150, BROWN) + r(270, 80, 220, 110, '#8C5A58') + c(380, 135, 34, GOLD) + c(380, 135, 14, NAVY2)
    s += r(0, 360, 760, 280, BROWN) + r(0, 348, 760, 20, CREAM)
    s += r(300, 300, 160, 100, WHITE, extra=' transform="rotate(-3 380 350)"') + r(320, 320, 110, 8, GREY) + r(320, 340, 90, 8, GREY) + r(320, 360, 120, 8, GREY)
    s += r(372, 290, 6, 120, RED, extra=' transform="rotate(12 375 350)"')
    s += back(20, 410, 120, 240, NAVY) + back(130, 440, 120, 220, SLATE) + back(-30, 470, 110, 200, RED, hat=DARK)
    s += back(520, 410, 120, 240, OLIVE) + back(630, 440, 120, 220, NAVY, hat=DARK) + back(440, 470, 110, 200, SLATE, hijab=WHITE)
    return s


def evt_hist_003():  # Mandat Darurat Istana
    s = r(0, 0, 760, 640, NAVY2)
    for i, (x, y) in enumerate([(60, 60), (260, 60), (460, 60), (60, 210), (260, 210), (460, 210)]):
        s += r(x, y, 180, 120, NAVY if i != 4 else '#3A1E1E') + r(x + 12, y + 12, 156, 96, NIGHT if i != 4 else '#6A2A20')
        hs = [40, 64, 30, 80][(i) % 4]
        s += r(x + 30, y + 100 - hs, 20, hs, GOLD if i != 4 else RED) + r(x + 70, y + 60, 20, 40, CREAM) + r(x + 110, y + 50, 20, 50, GREY)
    s += r(640, 60, 60, 270, NAVY) + c(670, 100, 16, RED) + c(670, 150, 16, '#5A3434') + c(670, 200, 16, '#5A3434')
    s += r(0, 420, 760, 220, BROWN) + r(560, 400, 120, 40, DARK, rx=10) + r(574, 384, 92, 22, DARK, rx=11)
    s += back(90, 430, 140, 240, NAVY, hat=DARK) + back(300, 450, 140, 220, SLATE) + back(470, 470, 120, 200, NAVY, hijab=RED)
    return s


def evt_hist_004():  # Krisis Perbankan dan Mata Uang
    s = r(0, 0, 760, 640, CREAM) + poly('60,150 380,60 700,150', NAVY2) + r(80, 150, 600, 300, GREY)
    for x in (110, 210, 490, 590):
        s += r(x, 170, 50, 270, '#A8A49A')
    s += r(290, 180, 180, 260, NAVY) + ''.join(r(290, 180 + i * 18, 180, 4, NIGHT) for i in range(8))
    s += r(170, 40, 160, 10, LINE)
    s += r(560, 30, 170, 90, NAVY2) + poly('580,50 640,80 700,104 700,110 580,110', RED) + r(580, 50, 4, 60, CREAM)
    s += r(0, 450, 760, 190, LINE)
    for i in range(6):
        x = 40 + i * 118
        col = [ORANGE, NAVY, WHITE, SLATE, RED, BROWN][i]
        s += back(x, 450 + (i % 2) * 30, 100, 240, col, hijab=CREAM if i == 2 else None, hat=DARK if i == 4 else None)
    return s


def evt_hist_005():  # Desakan Membentuk Kabinet Transisi
    s = r(0, 0, 760, 640, NAVY2) + c(640, 90, 34, CREAM) + poly('180,230 380,150 580,230', NIGHT) + r(190, 230, 380, 180, NIGHT)
    for x in (220, 290, 440, 510):
        s += r(x, 250, 24, 160, SLATE)
    s += r(356, 320, 48, 90, GOLD) + r(0, 330, 760, 14, NAVY) + ''.join(r(10 + i * 38, 330, 8, 160, NAVY) for i in range(20))
    s += r(0, 480, 760, 160, '#22243A')
    s += r(110, 300, 6, 200, BROWN) + r(40, 300, 170, 70, CREAM) + r(560, 290, 6, 210, BROWN) + r(510, 290, 190, 70, WHITE)
    s += crowd_rows([(470, 0), (540, 50)], [NAVY2, GOLD, ORANGE, SLATE, '#22243A', GOLD], start=1)
    return s


def evt_hist_006():  # Tawaran Dukungan Jelang Putaran Kedua
    s = r(0, 0, 380, 640, GREY) + r(380, 0, 380, 640, '#A8A49A')
    s += r(240, 330, 280, 220, WHITE) + r(240, 330, 280, 36, CREAM) + r(330, 342, 100, 12, NAVY) + r(240, 430, 280, 10, GOLD)
    s += r(345, 250, 70, 100, CREAM, extra=' transform="rotate(-6 380 300)"') + r(358, 270, 44, 8, GREY, extra=' transform="rotate(-6 380 300)"')
    s += c(392, 310, 14, RED)
    s += p('M0 180 L300 140 L300 200 L0 240 Z', NAVY) + p('M760 180 L460 140 L460 200 L760 240 Z', BROWN)
    s += e(330, 170, 50, 32, SKIN) + e(430, 170, 50, 32, '#B07E66') + r(330, 150, 100, 40, SKIN, rx=18)
    s += r(0, 560, 760, 80, LINE)
    return s


def evt_hist_007():  # Rekonstruksi Pesisir Utara
    s = r(0, 0, 760, 640, CREAM) + r(0, 360, 760, 280, WATER) + r(60, 400, 220, 5, WATER2) + r(420, 520, 260, 5, WATER2)
    s += r(380, 330, 380, 30, BROWN) + ''.join(r(400 + i * 60, 330, 12, 120, '#5A3434') for i in range(6))
    s += r(500, 330, 110, 30, CREAM) + poly('610,330 640,345 610,360', CREAM)
    s += poly('420,230 500,170 580,230', RED) + r(430, 230, 140, 100, CREAM) + poly('600,250 660,200 720,250', BROWN) + r(606, 250, 108, 80, '#A8A49A', extra=' transform="rotate(4 660 290)"')
    s += p('M60 470 L260 470 L230 510 L90 510 Z', ORANGE) + r(150, 400, 6, 70, BROWN) + poly('156,400 156,460 210,460', WHITE)
    s += p('M300 560 L470 560 L450 600 L320 600 Z', RED)
    s += back(440, 250, 50, 90, NAVY, hat=ORANGE) + back(520, 260, 50, 80, SLATE, hat=ORANGE) + r(470, 270, 90, 10, GOLD, extra=' transform="rotate(-20 515 275)"')
    return s


def evt_hist_008():  # Kesepakatan Damai Provinsi Serambi
    s = r(0, 0, 760, 640, '#A8A49A') + r(220, 50, 320, 200, CREAM) + poly('220,250 320,130 400,210 470,150 540,250', OLIVE) + poly('320,250 410,170 500,250', OLIVE2)
    s += r(372, 50, 16, 200, '#A8A49A') + r(220, 140, 320, 12, '#A8A49A')
    s += r(0, 380, 760, 260, BROWN) + r(0, 368, 760, 22, CREAM)
    s += r(300, 330, 160, 90, WHITE) + r(320, 350, 100, 8, GREY) + r(320, 370, 120, 8, GREY) + r(320, 392, 60, 8, NAVY)
    s += r(420, 385, 50, 6, GOLD, extra=' transform="rotate(-30 445 388)"')
    s += r(40, 280, 150, 360, NAVY, rx=64) + c(115, 240, 46, HAIR) + r(70, 196, 90, 26, DARK, rx=6) + p('M180 360 L300 380 L300 404 L180 390 Z', NAVY) + e(304, 392, 22, 12, SKIN)
    s += r(570, 280, 150, 360, OLIVE2, rx=64) + p('M597 232 a48 52 0 0 1 96 0 v50 h-96 z', WHITE) + p('M580 360 L460 380 L460 404 L580 390 Z', OLIVE2) + e(456, 392, 22, 12, '#B07E66')
    s += flag(40, 40, RED, WHITE, w=70, h=44, pole=LINE, pole_h=180) + flag(650, 40, OLIVE, CREAM, w=70, h=44, pole=LINE, pole_h=180)
    return s


def evt_hist_009():  # Darurat Kesehatan Nasional
    s = r(0, 0, 760, 640, '#A8A49A') + r(0, 420, 760, 220, LINE)
    for x in (40, 290, 540):
        s += poly(f'{x},200 {x + 90},120 {x + 180},200', WHITE) + r(x, 200, 180, 220, CREAM) + r(x + 70, 300, 40, 120, NAVY2)
        s += r(x + 80, 150, 20, 8, NAVY) + r(x + 86, 144, 8, 20, NAVY)
    for i in range(5):
        x = 30 + i * 150
        s += r(x, 470, 120, 30, WHITE, rx=6) + r(x + 10, 500, 8, 40, NAVY) + r(x + 102, 500, 8, 40, NAVY) + r(x, 462, 34, 20, CREAM, rx=6)
    s += back(200, 520, 110, 200, WHITE, head=HAIR, hat=None) + r(220, 498, 70, 16, '#A8B4B0', rx=8)
    s += back(440, 520, 110, 200, WHITE, hijab=SLATE) + r(460, 504, 70, 16, '#A8B4B0', rx=8)
    return s


def evt_hist_010():  # Harga Energi dan Kompensasi Tunai
    s = r(0, 0, 760, 640, CREAM) + r(40, 120, 680, 40, RED) + r(70, 160, 20, 280, GREY) + r(670, 160, 20, 280, GREY)
    s += r(530, 190, 150, 170, NAVY2) + r(550, 300, 30, 40, GOLD) + r(590, 270, 30, 70, GOLD) + r(630, 230, 30, 110, RED)
    s += r(230, 240, 90, 200, WHITE, rx=8) + r(245, 260, 60, 40, NAVY2) + r(300, 330, 40, 10, NAVY) + r(336, 330, 8, 70, NAVY)
    s += r(0, 440, 760, 200, LINE) + r(0, 560, 760, 10, CREAM)
    for i in range(3):
        x = 380 + i * 120
        s += c(x, 520, 26, NAVY) + c(x + 80, 520, 26, NAVY) + r(x, 480, 80, 26, [RED, ORANGE, SLATE][i], rx=10) + back(x + 20, 440, 50, 60, NAVY, hat=[GOLD, DARK, RED][i])
    s += r(70, 500, 120, 70, WHITE, extra=' transform="rotate(-8 130 535)"') + poly('70,500 130,530 190,500', CREAM, ' transform="rotate(-8 130 535)"')
    return s


def evt_placeholder_001():  # Banjir Besar
    s = r(0, 0, 760, 640, GREY)
    for i in range(18):
        s += r(20 + i * 42, (i * 53) % 200, 4, 60, '#A8A49A', extra=' transform="rotate(12)"')
    s += poly('80,300 220,220 360,300', BROWN) + r(100, 300, 240, 120, CREAM) + poly('430,320 570,240 710,320', RED) + r(450, 320, 240, 100, CREAM)
    s += r(0, 360, 760, 280, WATER) + r(80, 420, 220, 5, WATER2) + r(380, 500, 300, 5, WATER2) + r(120, 590, 200, 5, WATER2)
    s += back(150, 250, 50, 60, ORANGE) + back(220, 255, 50, 55, NAVY, hijab=CREAM) + back(520, 270, 50, 55, SLATE)
    s += r(150, 222, 110, 8, RED, extra=' transform="rotate(-12 205 226)"')
    s += e(560, 560, 130, 34, ORANGE) + back(520, 490, 46, 70, NAVY, hat=ORANGE) + back(590, 495, 46, 65, SLATE, hat=ORANGE)
    return s


def evt_placeholder_002():  # Unjuk Rasa Mahasiswa
    s = r(0, 0, 760, 640, CREAM) + r(120, 60, 520, 240, GREY) + poly('100,60 380,0 660,60', LINE)
    for x in (160, 240, 320, 420, 500, 580):
        s += r(x, 90, 30, 200, '#A8A49A')
    s += r(0, 300, 760, 340, LINE)
    s += r(80, 250, 6, 180, BROWN) + r(20, 250, 160, 70, WHITE) + r(640, 240, 6, 190, BROWN) + r(590, 240, 160, 70, CREAM)
    s += r(330, 300, 40, 18, NAVY) + poly('370,296 410,284 410,334 370,322', NAVY)
    s += crowd_rows([(410, 0), (480, 50), (550, 0)], [GOLD, NAVY2, GOLD, SLATE, NAVY2, GOLD], start=2)
    return s


SCENES = {
    'scenes/menu-hero': (istana, 'Istana pada malam hari dijaga dua pengawal'),
    'scenes/inauguration-oath': (sumpah, 'Presiden mengangkat tangan di atas kitab saat pelantikan'),
    'scenes/cabinet-briefing': (kabinet, 'Rapat kabinet di meja panjang'),
    'scenes/parliament-vote': (sidang, 'Ruang sidang parlemen, sebagian anggota mengangkat kartu suara'),
    'scenes/dashboard-desk': (meja, 'Meja kerja presiden di malam hari'),
    'scenes/protest': (demo, 'Massa membawa spanduk di depan barisan aparat'),
    'scenes/flood': (banjir, 'Permukiman tergenang banjir dan perahu karet'),
    'scenes/market': (pasar, 'Pedagang dan pembeli di pasar'),
    'scenes/port': (pelabuhan, 'Kapal peti kemas dan derek di pelabuhan'),
    'scenes/map-visit': (kunjungan, 'Presiden berjabat tangan dengan petani saat kunjungan daerah'),
    'scenes/policy-fiscal': (fiskal, 'Dokumen anggaran, tumpukan koin, dan mesin hitung'),
    'scenes/policy-social': (sosial, 'Antrean pembagian bantuan sosial'),
    'scenes/policy-energy': (energi, 'Kilang, menara listrik, dan turbin angin'),
    'scenes/policy-governance': (tatakelola, 'Rak arsip, loket layanan, dan stempel'),
    'events/evt-hist-001': (evt_hist_001, 'Delegasi negara-negara duduk mengelilingi meja konferensi di bawah deretan bendera'),
    'events/evt-hist-002': (evt_hist_002, 'Dua kelompok anggota majelis saling membelakangi di depan naskah konstitusi'),
    'events/evt-hist-003': (evt_hist_003, 'Ruang krisis istana dengan dinding layar dan satu layar bersinyal merah'),
    'events/evt-hist-004': (evt_hist_004, 'Antrean nasabah di depan bank yang rolling door-nya setengah tertutup'),
    'events/evt-hist-005': (evt_hist_005, 'Massa berspanduk di depan pagar istana pada malam hari'),
    'events/evt-hist-006': (evt_hist_006, 'Jabat tangan di atas kotak suara'),
    'events/evt-hist-007': (evt_hist_007, 'Pekerja berhelm membangun kembali dermaga dan rumah nelayan'),
    'events/evt-hist-008': (evt_hist_008, 'Dua delegasi menandatangani naskah damai dengan latar pegunungan'),
    'events/evt-hist-009': (evt_hist_009, 'Tenda darurat kesehatan, ranjang pasien, dan tenaga kesehatan bermasker'),
    'events/evt-hist-010': (evt_hist_010, 'Antrean motor di SPBU dengan papan harga yang naik'),
    'events/evt-placeholder-001': (evt_placeholder_001, 'Warga mengungsi di atap rumah saat banjir besar'),
    'events/evt-placeholder-002': (evt_placeholder_002, 'Mahasiswa berjaket almamater berunjuk rasa di depan kampus'),
}


def render(fn, title):
    body = fn()
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 640" width="760" height="640" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')


if __name__ == '__main__':
    out = sys.argv[1]
    for name, (fn, title) in SCENES.items():
        path = os.path.join(out, name + '.svg')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'w').write(render(fn, title))
    print(len(SCENES), 'files')
