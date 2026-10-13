#!/usr/bin/env python3
"""Client packages brochure PDF for ZUVO-style website builds (Roman Urdu)."""
from fpdf import FPDF

ORANGE = (255, 107, 0)
DARK = (26, 26, 26)
GRAY_BG = (245, 245, 245)
WHITE = (255, 255, 255)
MID_GRAY = (110, 110, 110)
POP_BG = (255, 243, 230)

class Brochure(FPDF):
    def header(self):
        pass
    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*MID_GRAY)
        self.cell(0, 10, "Built by Haider Malik  |  ZUVO-style premium websites", align="C")

pdf = Brochure("P", "mm", "A4")
pdf.set_auto_page_break(True, margin=18)
pdf.set_margins(14, 12, 14)

# ---------- COVER HEADER ----------
pdf.add_page()
pdf.set_fill_color(*DARK)
pdf.rect(0, 0, 210, 52, "F")
pdf.set_y(10)
pdf.set_font("Helvetica", "B", 22)
pdf.set_text_color(*ORANGE)
pdf.cell(0, 10, "WEBSITE DEVELOPMENT PACKAGES", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 11)
pdf.set_text_color(*WHITE)
pdf.cell(0, 7, "Aapki dukaan, ab online  -  poori professional website 5-15 din me", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 9)
pdf.set_text_color(200, 200, 200)
pdf.cell(0, 6, "Live demo dekhein, phir faisla karein  |  100% custom code, aapki ownership", align="C", new_x="LMARGIN", new_y="NEXT")

pdf.set_y(58)
pdf.set_font("Helvetica", "", 9.5)
pdf.set_text_color(*MID_GRAY)
pdf.multi_cell(0, 5.5, "Neeche teen packages hain  -  apne business ke hisaab se chunein. Har package me live website, admin panel, training aur saare accounts aapke naam par milte hain.", align="C")
pdf.ln(3)

packages = [
    {
        "medal": "BASIC",
        "price": "PKR 60,000",
        "tag": "Chhoti dukaan ke liye",
        "popular": False,
        "time": "5-7 din",
        "support": "15 din free (chhoti fixes)",
        "features": [
            "30 products tak",
            "Standard design (aapke colors me)",
            "Cart + checkout + COD",
            "Basic admin panel (products / orders)",
            "WhatsApp order button",
            "1 domain connect",
        ],
    },
    {
        "medal": "STANDARD",
        "price": "PKR 120,000",
        "tag": "Proper online store",
        "popular": True,
        "time": "7-10 din",
        "support": "1 mahina free support",
        "features": [
            "100 products tak",
            "Custom branding (logo, colors, banners)",
            "Basic wali sab cheezein +",
            "AI shopping assistant (aapke business ke naam par)",
            "Tap-to-earn coins system",
            "Promo codes + vouchers",
            "Discount campaigns (khud sale lagayen)",
            "10 business reports + analytics",
            "Email OTP verification",
            "Training video (Urdu me)",
        ],
    },
    {
        "medal": "PREMIUM",
        "price": "PKR 200,000",
        "tag": "Full business solution",
        "popular": False,
        "time": "12-15 din",
        "support": "3 mahine priority support",
        "features": [
            "Unlimited products",
            "Standard wali sab cheezein +",
            "Bulk product upload setup",
            "Advanced SEO",
            "Custom features (1-2 khaas demands)",
            "Payment gateway (JazzCash / Easypaisa / Stripe)*",
        ],
    },
]

for p in packages:
    x0 = pdf.get_x()
    w = 182
    # card background
    y_start = pdf.get_y()
    pdf.set_fill_color(*(POP_BG if p["popular"] else GRAY_BG))
    # title bar
    pdf.set_fill_color(*(ORANGE if p["popular"] else DARK))
    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 13)
    title = f'{p["medal"]}  -  {p["price"]}'
    if p["popular"]:
        title += "   [MOST POPULAR]"
    pdf.cell(w, 10, title, fill=True, new_x="LMARGIN", new_y="NEXT", align="C")
    # tag line
    pdf.set_fill_color(*(POP_BG if p["popular"] else GRAY_BG))
    pdf.set_text_color(*MID_GRAY)
    pdf.set_font("Helvetica", "I", 9)
    pdf.cell(w, 6, p["tag"], fill=True, new_x="LMARGIN", new_y="NEXT", align="C")
    # features
    pdf.set_text_color(*DARK)
    pdf.set_font("Helvetica", "", 9.5)
    for f in p["features"]:
        pdf.cell(w, 5.8, f"     -  {f}", fill=True, new_x="LMARGIN", new_y="NEXT")
    # time + support
    pdf.set_font("Helvetica", "B", 9.5)
    pdf.set_text_color(*ORANGE)
    pdf.cell(w, 6, f"     Time: {p['time']}    |    Support: {p['support']}", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    if pdf.get_y() > 245:
        pdf.add_page()

# ---------- EXTRAS ----------
pdf.set_font("Helvetica", "B", 12)
pdf.set_text_color(*DARK)
pdf.cell(0, 8, "Extra Services", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 9.5)
for line in [
    "Logo design: PKR 5,000",
    "Product photography guide: FREE tip sheet",
    "Salana maintenance: PKR 20,000 / saal",
    "Baad me koi extra feature: alag quote",
]:
    pdf.cell(0, 5.8, f"  -  {line}", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "I", 8)
pdf.set_text_color(*MID_GRAY)
pdf.cell(0, 5.5, "  * Payment gateway ke bank charges alag honge.", new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)

# ---------- PAYMENT TERMS ----------
pdf.set_fill_color(*DARK)
pdf.set_text_color(*WHITE)
pdf.set_font("Helvetica", "B", 12)
pdf.cell(182, 9, "  Payment Terms", fill=True, new_x="LMARGIN", new_y="NEXT")
pdf.set_fill_color(*GRAY_BG)
pdf.set_text_color(*DARK)
pdf.set_font("Helvetica", "", 10)
pdf.cell(182, 7, "  50% advance  -  kaam shuru hone se pehle", fill=True, new_x="LMARGIN", new_y="NEXT")
pdf.cell(182, 7, "  50% delivery par  -  website live hone ke baad", fill=True, new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)

# ---------- HANDOVER ----------
pdf.set_font("Helvetica", "B", 12)
pdf.set_text_color(*DARK)
pdf.cell(0, 8, "Har package me ye sab milega (handover)", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 9.5)
for line in [
    "Live website  -  aapke domain par chalti hui",
    "Admin panel with login  -  orders, products, customers, reports",
    "Saare accounts aapke email par  -  website 100% aapki ownership",
    "Training  -  product kaise add karein, order kaise dekhein, campaign kaise lagayen",
]:
    pdf.cell(0, 5.8, f"  -  {line}", new_x="LMARGIN", new_y="NEXT")
pdf.ln(4)

# ---------- CONTACT ----------
pdf.set_fill_color(*ORANGE)
pdf.set_text_color(*WHITE)
pdf.set_font("Helvetica", "B", 13)
pdf.cell(182, 11, "  Contact: Haider Malik", fill=True, new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 10)
pdf.cell(182, 8, "  WhatsApp: ___________________     |     Demo website: zuvo-chi.vercel.app", fill=True, new_x="LMARGIN", new_y="NEXT")

out = "/home/hatch/workspace/zuvo/client-pitch/zuvo-packages-brochure.pdf"
pdf.output(out)
print("WROTE", out)
