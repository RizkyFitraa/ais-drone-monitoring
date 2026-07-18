#!/usr/bin/env python3
"""
AIS MSG 8 & MSG 9 NMEA Generator — GUI
Tkinter-based, pure Python, no external dependencies required.
"""

import tkinter as tk
from tkinter import ttk
import re
import math

# ─── Optional pyais integration ──────────────────────────────────────────────
_HAS_PYAIS = False
try:
    from pyais.encode import encode_dict
    _HAS_PYAIS = True
except ImportError:
    pass

# ─── AIS 6-bit ASCII ──────────────────────────────────────────────────────────

def _6bit_encode(val):
    """6-bit value (0-63) -> AIS ASCII char."""
    if 0 <= val <= 39:
        return chr(0x30 + val)       # '0'..'W'
    elif 40 <= val <= 63:
        return chr(0x38 + val)       # '`'..'w'
    raise ValueError(f"Invalid 6-bit value: {val}")


def _6bit_decode(ch):
    """AIS ASCII char -> 6-bit value (0-63)."""
    v = ord(ch)
    if 0x30 <= v <= 0x57:
        return v - 0x30
    if 0x60 <= v <= 0x77:
        return v - 0x38
    raise ValueError(f"Invalid AIS char: {ch}")


def bits_to_ais(bits):
    """Bit-string ('01011...') -> (payload_str, fill_bits)."""
    pad = (6 - len(bits) % 6) % 6
    bits += '0' * pad
    chars = []
    for i in range(0, len(bits), 6):
        chars.append(_6bit_encode(int(bits[i:i+6], 2)))
    return ''.join(chars), pad


def ais_to_bits(payload, fill):
    """AIS payload string -> bit-string, stripping fill bits."""
    bits = ''
    for ch in payload:
        bits += f'{_6bit_decode(ch):06b}'
    if fill:
        bits = bits[:-fill]
    return bits


def nmea_checksum(s):
    """XOR checksum (hex) for NMEA sentence body."""
    c = 0
    for ch in s:
        c ^= ord(ch)
    return f'{c:02X}'


def make_nmea(payload, fill, channel='A'):
    """Build full AIVDM NMEA sentence from payload (always VDM)."""
    body = f'AIVDM,1,1,,{channel},{payload},{fill}'
    cksum = nmea_checksum(body)
    return f'!{body}*{cksum}'


# ─── MSG 8  Drone (Binary Broadcast) ─────────────────────────────────────────
# Layout matches AIRCRAFT_PROTOTIPE.ino (lines 944–998):
#   0–  5  Message ID       (6b)
#   6–  7  Repeat Indicator (2b)
#   8– 37  MMSI             (30b)
#  38– 39  Spare            (2b)
#  40– 49  DAC              (10b) = 366
#  50– 55  FI               (6b)  = 56
#  56– 83  Longitude        (28b signed)
#  84–110  Latitude         (27b signed)
# 111–122  Altitude         (12b)
# 123–132  SOG              (10b ×10 kn)
# 133–141  Heading          (9b integer deg)
# 142–149  Battery vbat     (8b)
# 150–155  Satellites       (6b)
# 156–159  Flight Mode      (4b)
# 160–171  Roll             (12b uint +1800, ×10°)
# 172–183  Pitch            (12b uint +1800, ×10°)
# 184–192  Yaw              (9b integer deg)
# Total: 193 bit → pad 5 → 198 bit = 33 AIS chars

def make_msg8(mmsi, lat=None, lon=None, alt=None, sog=None,
              heading=None, battery=None, mode=None,
              roll=None, pitch=None, yaw=None, sats=None,
              dac=366, fi=56):
    mmsi_int = int(mmsi) if str(mmsi).lstrip('-').isdigit() else 970123456

    bits = f'{8:06b}'       # type
    bits += '00'             # repeat
    bits += f'{mmsi_int:030b}'  # MMSI
    bits += '00'             # spare
    bits += f'{int(dac):010b}'  # DAC
    bits += f'{int(fi):06b}'    # FI

    # Longitude / Latitude (signed, degree × 600000)
    bits += encode_lon(lon)
    bits += encode_lat(lat)

    # Altitude (12b, 0–4094, 4095=N/A)
    if alt is not None and alt >= 0:
        alt_int = min(int(round(alt)), 4094)
    else:
        alt_int = 4095
    bits += f'{alt_int:012b}'

    # SOG (10b, knots × 10)
    if sog is not None and sog >= 0:
        sog_int = min(int(round(sog * 10)), 1022)
    else:
        sog_int = 1023
    bits += f'{sog_int:010b}'

    # Heading (9b, integer deg 0–359)
    if heading is not None:
        hdg = int(round(heading)) % 360
    else:
        hdg = 0
    bits += f'{hdg:09b}'

    # Battery (8b)
    if battery is not None:
        bat_int = min(max(int(round(battery)), 0), 255)
    else:
        bat_int = 0
    bits += f'{bat_int:08b}'

    # Satellites (6b)
    if sats is not None:
        sat_int = min(max(int(round(sats)), 0), 63)
    else:
        sat_int = 0
    bits += f'{sat_int:06b}'

    # Mode (4b)
    if mode is not None:
        try:
            mode_int = int(str(mode), 0) & 0x0F
        except ValueError:
            mode_int = 0
    else:
        mode_int = 0
    bits += f'{mode_int:04b}'

    # Roll (12b uint, offset +1800, ×10°)
    if roll is not None:
        roll_enc = int(round(roll * 10)) + 1800
        roll_enc = min(max(roll_enc, 0), 3600)
    else:
        roll_enc = 1800
    bits += f'{roll_enc:012b}'

    # Pitch (12b uint, offset +1800, ×10°)
    if pitch is not None:
        pitch_enc = int(round(pitch * 10)) + 1800
        pitch_enc = min(max(pitch_enc, 0), 3600)
    else:
        pitch_enc = 1800
    bits += f'{pitch_enc:012b}'

    # Yaw (9b, integer deg 0–359)
    if yaw is not None:
        yaw_int = int(round(yaw)) % 360
    else:
        yaw_int = 0
    bits += f'{yaw_int:09b}'

    payload, fill = bits_to_ais(bits)
    return make_nmea(payload, fill, 'B')


# ─── MSG 9  SAR Aircraft ─────────────────────────────────────────────────────


def vdo_to_vdm(nmea):
    """Convert !AIVDO to !AIVDM and fix checksum."""
    if 'VDO' not in nmea:
        return nmea
    # Replace sentence type and recompute checksum
    new_nmea = nmea.replace('AIVDO', 'AIVDM')
    # Recompute checksum after changing body
    body = new_nmea[1:].rsplit('*', 1)[0]
    cksum = nmea_checksum(body)
    return f'!{body}*{cksum}'

def encode_lat(lat):
    """Latitude -> 27-bit two's complement (1/10000 minute)."""
    if lat is None or math.isnan(lat):
        return '0' * 27
    val = int(round(lat * 60 * 10000))
    if val < 0:
        val = (1 << 27) + val
    return f'{val:027b}'

def encode_lon(lon):
    """Longitude -> 28-bit two's complement (1/10000 minute)."""
    if lon is None or math.isnan(lon):
        return '0' * 28
    val = int(round(lon * 60 * 10000))
    if val < 0:
        val = (1 << 28) + val
    return f'{val:028b}'


def make_msg9(mmsi, name, lat, lon, alt, sog, cog,
              pos_acc=None, utc_sec=None):
    mmsi_int = int(mmsi) if str(mmsi).lstrip('-').isdigit() else 970123456

    # NOTE: pyais encode_dict for MSG 9 stores speed in whole knots (not deciknots as per
    # AIS standard).  We skip pyais here to ensure correct AIS-compatible output that
    # matches AIRCRAFT_PROTOTIPE.ino.

    # ── Pure-Python encoder — matches AIRCRAFT_PROTOTIPE.ino bit layout ──
    #  0‑5   6   MSG type (9)
    #  6‑7   2   Repeat (0)
    #  8‑37 30   MMSI
    # 38‑49 12   Altitude (1m, 4095=N/A)
    # 50‑59 10   SOG (0.1 kn, 1023=N/A)
    # 60    1    Position accuracy
    # 61‑88 28   Longitude (signed 1/10000 min)
    # 89‑115 27  Latitude (signed 1/10000 min)
    # 116‑127 12 COG (0.1°, 3600=N/A)
    # 128‑133 6  UTC second (0‑59, 60/63=N/A)
    # 134     1  Alt sensor
    # 135‑141 7  Spare
    # 142     1  DTE
    # 143‑145 3  Spare
    # 146     1  Assigned
    # 147     1  RAIM
    # 148‑166 19 Comm state (0 = SOTDMA idle)
    # ──────────
    # total: 167 bits → pad to 168 bits = 28 AIS chars, fill=1

    bits = f'{9:06b}'           # type   (6)
    bits += '00'                 # repeat (2)
    bits += f'{mmsi_int:030b}'  # MMSI   (30)

    # Altitude 12 bit
    if alt is not None and alt >= 0:
        alt_int = min(int(round(alt)), 4094)
    else:
        alt_int = 4095
    bits += f'{alt_int:012b}'

    # SOG 10 bit
    if sog is not None and sog >= 0:
        sog_int = min(int(round(sog * 10)), 1022)
    else:
        sog_int = 1023
    bits += f'{sog_int:010b}'

    # Position accuracy 1 bit
    if pos_acc is not None and str(pos_acc) in ('1', 'True', 'true'):
        bits += '1'
    else:
        bits += '0'

    # Longitude 28 bit / Latitude 27 bit
    bits += encode_lon(lon)
    bits += encode_lat(lat)

    # COG 12 bit
    if cog is not None:
        cog_int = min(int(round(cog * 10)), 3599)
    else:
        cog_int = 3600
    bits += f'{cog_int:012b}'

    # UTC second 6 bit
    if utc_sec is not None and 0 <= utc_sec <= 59:
        bits += f'{utc_sec:06b}'
    else:
        bits += '111111'  # 63 = N/A

    # Alt sensor (1b), Spare (7b), DTE (0), Spare (3b), Assigned (0), RAIM (0)
    bits += '0'  # alt sensor
    bits += '0000000'  # spare
    bits += '0'  # DTE
    bits += '000'  # spare
    bits += '0'  # assigned
    bits += '0'  # RAIM

    # Comm state 19 bits = 0 (SOTDMA idle)
    bits += '0' * 19

    payload, fill = bits_to_ais(bits)
    return make_nmea(payload, fill, 'B')


# ─── GUI ──────────────────────────────────────────────────────────────────────

class AISMsgGenerator(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title('AIS NMEA Generator — MSG 8 / MSG 9')
        self.resizable(True, True)
        self.minsize(600, 540)

        # ── Fonts (Poppins with fallback) ──
        import tkinter.font as tkfont
        def _poppins(size=10, weight='normal'):
            try:
                return tkfont.Font(family='Poppins', size=size, weight=weight)
            except Exception:
                return tkfont.Font(family='Segoe UI', size=size, weight=weight)

        self.fnt = {
            'header':  _poppins(14, 'bold'),
            'sub':     _poppins(9),
            'body':    _poppins(10),
            'body_bd': _poppins(10, 'bold'),
            'mono':    tkfont.Font(family='Consolas', size=11),
            'mono_sm': tkfont.Font(family='Consolas', size=10),
            'section': _poppins(8, 'bold'),
            'status':  _poppins(8),
        }

        # ── Color palette ──
        self.clr = {
            'bg':       '#fafafa',
            'card':     '#ffffff',
            'hdr_bg':   '#0f172a',
            'hdr_fg':   '#f8fafc',
            'hdr_sub':  '#94a3b8',
            'input_bg': '#f1f5f9',
            'input_fg': '#0f172a',
            'fg':       '#1e293b',
            'fg_sec':   '#64748b',
            'accent':   '#2563eb',
            'teal':     '#0d9488',
            'border':   '#e2e8f0',
            'section':  '#475569',
            'out_bg':   '#0f172a',
            'out_fg':   '#a5f3fc',
        }

        self.defaults_msg8 = {
            'mmsi':      '970123456',
            'dac':       '366',
            'fi':        '56',
            'lat':       '-7.1870',
            'lon':       '112.7450',
            'alt':       '92',
            'sog':       '5.4',
            'heading':   '270',
            'battery':   '200',
            'mode':      '0',
            'roll':      '0',
            'pitch':     '0',
            'yaw':       '270',
            'sats':      '12',
        }

        self.defaults_msg9 = {
            'mmsi':      '970123456',
            'name':      'AIRCRAFT PROTOTIPE',
            'lat':       '-7.1870',
            'lon':       '112.7450',
            'alt':       '400',
            'sog':       '82',
            'cog':       '185',
            'pos_acc':   '1',
            'utc_sec':   '60',
        }

        self.msg8_vars = {}
        self.msg9_vars = {}

        self._build_ui()

    # ── Widget helpers ─────────────────────────────────────────────────────────

    def _make_entry(self, parent, key, width, vars_dict, defaults):
        var = tk.StringVar(value=defaults.get(key, ''))
        ent = tk.Entry(parent, textvariable=var, width=width,
                       font=self.fnt['mono_sm'],
                       bg=self.clr['input_bg'], fg=self.clr['input_fg'],
                       relief='flat', bd=0, highlightthickness=1,
                       highlightcolor=self.clr['border'],
                       highlightbackground=self.clr['border'],
                       insertbackground=self.clr['fg'])
        ent.pack(side='left', padx=(0, 6), pady=3, ipady=3, fill='x', expand=True)
        vars_dict[key] = var
        return var

    def _make_label(self, parent, text, **kw):
        kw.setdefault('font', self.fnt['body'])
        kw.setdefault('bg', self.clr['card'])
        kw.setdefault('fg', self.clr['fg_sec'])
        return tk.Label(parent, text=text, **kw)

    def _section_label(self, parent, text):
        row = tk.Frame(parent, bg=self.clr['card'])
        row.pack(fill='x', padx=12, pady=(12, 2))
        lbl = tk.Label(row, text=text, font=self.fnt['section'],
                       bg=self.clr['card'], fg=self.clr['section'])
        lbl.pack(side='left')
        sep = ttk.Separator(row, orient='horizontal')
        sep.pack(side='left', fill='x', expand=True, padx=(8, 0), pady=(6, 0))

    def _make_input_row(self, parent, fields):
        """Create a horizontal row of (label, entry) pairs."""
        row = tk.Frame(parent, bg=self.clr['card'])
        row.pack(fill='x', padx=12, pady=1)
        for fld in fields:
            cell = tk.Frame(row, bg=self.clr['card'])
            cell.pack(side='left', fill='x', expand=True, padx=(0, 4))
            self._make_label(cell, fld['label'], font=self.fnt['body'],
                             bg=self.clr['card'], fg=self.clr['fg_sec'],
                             anchor='w', width=10).pack(fill='x')
            self._make_entry(cell, fld['key'], fld.get('w', 10),
                             fld['vars'], fld['defaults'])

    # ── Build UI ──────────────────────────────────────────────────────────────

    def _build_ui(self):
        self.configure(bg=self.clr['bg'])

        # ── Header bar ──
        hdr = tk.Frame(self, bg=self.clr['hdr_bg'])
        hdr.pack(fill='x')
        tk.Label(hdr, text='AIS NMEA Generator',
                 font=self.fnt['header'], bg=self.clr['hdr_bg'],
                 fg=self.clr['hdr_fg']).pack(pady=(10, 2))
        pyais_status = 'pyais ✓' if _HAS_PYAIS else 'pyais ✗'
        tk.Label(hdr,
                 text=f'MSG 8 (Drone)  \u00b7  MSG 9 (SAR Aircraft)  \u00b7  {pyais_status}',
                 font=self.fnt['sub'], bg=self.clr['hdr_bg'],
                 fg=self.clr['hdr_sub']).pack(pady=(0, 10))

        # ── Notebook ──
        nb = ttk.Notebook(self)
        nb.pack(padx=12, pady=(8, 2), fill='both', expand=True)

        tab8 = ttk.Frame(nb)
        nb.add(tab8, text='  MSG 8  — Drone  ')
        self._build_tab_msg8(tab8)

        tab9 = ttk.Frame(nb)
        nb.add(tab9, text='  MSG 9  — SAR  ')
        self._build_tab_msg9(tab9)

        # ── Buttons ──
        btn_frame = tk.Frame(self, bg=self.clr['bg'])
        btn_frame.pack(pady=(4, 2))

        for b in [
            ('Generate NMEA', self.clr['accent'], 'white', self._on_generate),
            ('Reset',         self.clr['border'], self.clr['fg'], self._on_reset),
            ('Copy',          self.clr['teal'],   'white',       self._on_copy),
        ]:
            btn = tk.Button(btn_frame, text=b[0], font=self.fnt['body_bd'],
                            bg=b[1], fg=b[2], padx=16, pady=4,
                            cursor='hand2', relief='flat', bd=0,
                            activebackground=b[1], activeforeground=b[2],
                            command=b[3])
            btn.pack(side='left', padx=4)
            # Hover effect
            btn.bind('<Enter>', lambda e, bg=b[1]: e.widget.configure(
                background=self._lighten(bg)))
            btn.bind('<Leave>', lambda e, bg=b[1]: e.widget.configure(background=bg))

        # ── Output ──
        out_frame = tk.Frame(self, bg=self.clr['card'],
                             highlightbackground=self.clr['border'],
                             highlightthickness=1)
        out_frame.pack(padx=12, pady=(4, 0), fill='x')

        out_header = tk.Frame(out_frame, bg=self.clr['card'])
        out_header.pack(fill='x', padx=8, pady=(6, 2))
        tk.Label(out_header, text='Raw NMEA Output',
                 font=self.fnt['section'], bg=self.clr['card'],
                 fg=self.clr['section']).pack(side='left')

        self.output_text = tk.Text(out_frame, height=4,
                                   font=self.fnt['mono'],
                                   bg=self.clr['out_bg'], fg=self.clr['out_fg'],
                                   insertbackground=self.clr['out_fg'],
                                   relief='flat', bd=0,
                                   highlightthickness=0,
                                   padx=8, pady=6, wrap='char')
        self.output_text.pack(fill='x', padx=8, pady=(0, 6))

        # ── Status bar ──
        self.status_bar = tk.Frame(self, bg=self.clr['card'],
                                   highlightbackground=self.clr['border'],
                                   highlightthickness=1)
        self.status_bar.pack(fill='x', padx=12, pady=(4, 8))
        self.status_lbl = tk.Label(self.status_bar, text='Ready',
                                   font=self.fnt['status'],
                                   bg=self.clr['card'], fg=self.clr['fg_sec'],
                                   anchor='w', padx=8, pady=3)
        self.status_lbl.pack(side='left', fill='x')

    def _lighten(self, hex_color, factor=0.85):
        """Darken a hex color for hover effect."""
        r = int(hex_color[1:3], 16)
        g = int(hex_color[3:5], 16)
        b = int(hex_color[5:7], 16)
        r = min(255, int(r / factor))
        g = min(255, int(g / factor))
        b = min(255, int(b / factor))
        return f'#{r:02x}{g:02x}{b:02x}'

    # ── Tab: MSG 8 ────────────────────────────────────────────────────────────

    def _build_tab_msg8(self, parent):
        canvas = tk.Canvas(parent, bg=self.clr['card'],
                           highlightthickness=0)
        scrollbar = ttk.Scrollbar(parent, orient='vertical', command=canvas.yview)
        inner = tk.Frame(canvas, bg=self.clr['card'])
        inner.bind('<Configure>',
                   lambda e: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.create_window((0, 0), window=inner, anchor='nw')
        canvas.configure(yscrollcommand=scrollbar.set)

        def _on_mw(e):
            canvas.yview_scroll(int(-1 * (e.delta / 120)), 'units')
        canvas.bind('<Enter>', lambda e: canvas.bind_all('<MouseWheel>', _on_mw, add='+'))
        canvas.bind('<Leave>', lambda e: canvas.unbind_all('<MouseWheel>'))

        d = self.defaults_msg8
        v = self.msg8_vars

        self._section_label(inner, 'Identity & Position')
        self._make_input_row(inner, [
            {'key':'mmsi', 'label':'MMSI', 'vars':v, 'defaults':d},
        ])
        self._make_input_row(inner, [
            {'key':'dac', 'label':'DAC', 'w':6, 'vars':v, 'defaults':d},
            {'key':'fi',  'label':'FI',  'w':6, 'vars':v, 'defaults':d},
        ])
        self._make_input_row(inner, [
            {'key':'lat', 'label':'Latitude', 'w':10, 'vars':v, 'defaults':d},
            {'key':'lon', 'label':'Longitude','w':10, 'vars':v, 'defaults':d},
        ])

        self._section_label(inner, 'Telemetry')
        self._make_input_row(inner, [
            {'key':'alt', 'label':'Altitude','w':6, 'vars':v, 'defaults':d},
            {'key':'sog', 'label':'SOG (kn)','w':6, 'vars':v, 'defaults':d},
            {'key':'heading', 'label':'Heading', 'w':6, 'vars':v, 'defaults':d},
        ])
        self._make_input_row(inner, [
            {'key':'battery', 'label':'Battery','w':6, 'vars':v, 'defaults':d},
            {'key':'sats', 'label':'Sats', 'w':6, 'vars':v, 'defaults':d},
            {'key':'mode', 'label':'Mode', 'w':6, 'vars':v, 'defaults':d},
        ])

        self._section_label(inner, 'Attitude')
        self._make_input_row(inner, [
            {'key':'roll', 'label':'Roll','w':6, 'vars':v, 'defaults':d},
            {'key':'pitch', 'label':'Pitch','w':6, 'vars':v, 'defaults':d},
            {'key':'yaw', 'label':'Yaw', 'w':6, 'vars':v, 'defaults':d},
        ])

        # Spacer at bottom
        tk.Frame(inner, bg=self.clr['card'], height=8).pack()

        canvas.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')

    # ── Tab: MSG 9 ────────────────────────────────────────────────────────────

    def _build_tab_msg9(self, parent):
        canvas = tk.Canvas(parent, bg=self.clr['card'],
                           highlightthickness=0)
        scrollbar = ttk.Scrollbar(parent, orient='vertical', command=canvas.yview)
        inner = tk.Frame(canvas, bg=self.clr['card'])
        inner.bind('<Configure>',
                   lambda e: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.create_window((0, 0), window=inner, anchor='nw')
        canvas.configure(yscrollcommand=scrollbar.set)

        def _on_mw(e):
            canvas.yview_scroll(int(-1 * (e.delta / 120)), 'units')
        canvas.bind('<Enter>', lambda e: canvas.bind_all('<MouseWheel>', _on_mw, add='+'))
        canvas.bind('<Leave>', lambda e: canvas.unbind_all('<MouseWheel>'))

        d = self.defaults_msg9
        v = self.msg9_vars

        self._section_label(inner, 'Identity & Position')
        self._make_input_row(inner, [
            {'key':'mmsi', 'label':'MMSI', 'vars':v, 'defaults':d},
            {'key':'name', 'label':'Name', 'w':16, 'vars':v, 'defaults':d},
        ])
        self._make_input_row(inner, [
            {'key':'lat', 'label':'Latitude', 'w':10, 'vars':v, 'defaults':d},
            {'key':'lon', 'label':'Longitude','w':10, 'vars':v, 'defaults':d},
        ])

        self._section_label(inner, 'Telemetry')
        self._make_input_row(inner, [
            {'key':'alt', 'label':'Altitude','w':6, 'vars':v, 'defaults':d},
            {'key':'sog', 'label':'SOG (kn)','w':6, 'vars':v, 'defaults':d},
            {'key':'cog', 'label':'COG', 'w':6, 'vars':v, 'defaults':d},
        ])
        self._make_input_row(inner, [
            {'key':'pos_acc', 'label':'Pos Acc','w':4, 'vars':v, 'defaults':d},
            {'key':'utc_sec', 'label':'UTC Sec','w':4, 'vars':v, 'defaults':d},
        ])

        tk.Frame(inner, bg=self.clr['card'], height=8).pack()

        canvas.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')

    # ── Actions ───────────────────────────────────────────────────────────────

    def _get_current_tab(self):
        try:
            nb = next(c for c in self.children.values()
                      if isinstance(c, ttk.Notebook))
            return 'msg9' if nb.index('current') == 1 else 'msg8'
        except (StopIteration, IndexError):
            return 'msg8'

    def _gather(self, prefix):
        vars_dict = self.msg8_vars if prefix == 'msg8' else self.msg9_vars
        return {k: v.get().strip() for k, v in vars_dict.items()}

    def _on_generate(self):
        tab = self._get_current_tab()
        data = self._gather(tab)
        nmea = ''

        try:
            if tab == 'msg8':
                nmea = make_msg8(
                    mmsi=data.get('mmsi', '970123456'),
                    dac=try_int(data.get('dac', 366)),
                    fi=try_int(data.get('fi', 56)),
                    lat=try_float(data.get('lat')),
                    lon=try_float(data.get('lon')),
                    alt=try_float(data.get('alt')),
                    sog=try_float(data.get('sog')),
                    heading=try_float(data.get('heading')),
                    battery=try_float(data.get('battery')),
                    mode=data.get('mode'),
                    roll=try_float(data.get('roll')),
                    pitch=try_float(data.get('pitch')),
                    yaw=try_float(data.get('yaw')),
                    sats=try_int(data.get('sats')),
                )
            else:
                nmea = make_msg9(
                    mmsi=data.get('mmsi', '970123456'),
                    name=data.get('name', 'AIRCRAFT PROTOTIPE'),
                    lat=try_float(data.get('lat')),
                    lon=try_float(data.get('lon')),
                    alt=try_float(data.get('alt')),
                    sog=try_float(data.get('sog')),
                    cog=try_float(data.get('cog')),
                    pos_acc=try_int(data.get('pos_acc', 1)),
                    utc_sec=try_int(data.get('utc_sec')),
                )

            self.output_text.delete('1.0', 'end')
            self.output_text.insert('1.0', nmea + '\n')
            self._update_status(nmea)
        except Exception as e:
            self.output_text.delete('1.0', 'end')
            self.output_text.insert('1.0', f'Error: {e}\n')
            self.status_lbl.configure(text='Error generating NMEA',
                                      fg='#dc2626')

    def _update_status(self, nmea):
        try:
            parts = nmea.split(',')
            payload = parts[5] if len(parts) > 5 else ''
            fill_part = parts[6].split('*')[0] if len(parts) > 6 else ''
            fill = int(fill_part) if fill_part.isdigit() else 0
            checksum = nmea.split('*')[1].strip() if '*' in nmea else ''
            bits = len(payload) * 6 - fill
            text = (f'Payload: {len(payload)} chars  |  '
                    f'Data bits: {bits}  |  '
                    f'Fill: {fill}  |  '
                    f'Checksum: {checksum}')
            self.status_lbl.configure(text=text, fg=self.clr['fg_sec'])
        except Exception:
            self.status_lbl.configure(text=nmea[:60], fg=self.clr['fg_sec'])

    def _on_reset(self):
        tab = self._get_current_tab()
        defaults = self.defaults_msg8 if tab == 'msg8' else self.defaults_msg9
        vars_dict = self.msg8_vars if tab == 'msg8' else self.msg9_vars
        for k, v in vars_dict.items():
            v.set(defaults.get(k, ''))
        self.status_lbl.configure(text='Defaults restored', fg=self.clr['fg_sec'])

    def _on_copy(self):
        txt = self.output_text.get('1.0', 'end-1c').strip()
        if txt:
            self.clipboard_clear()
            self.clipboard_append(txt)
            self.status_lbl.configure(text='Copied to clipboard',
                                      fg=self.clr['teal'])
        else:
            self.status_lbl.configure(text='Nothing to copy', fg='#dc2626')


# ─── Helpers ──────────────────────────────────────────────────────────────────

def try_float(s):
    if s is None:
        return None
    s = s.strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None

def try_int(s):
    if s is None:
        return None
    s = s.strip()
    if not s:
        return None
    try:
        return int(s)
    except ValueError:
        return None


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app = AISMsgGenerator()
    app.mainloop()
