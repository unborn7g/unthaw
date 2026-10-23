#!/usr/bin/env python3
"""
Unthaw 1080p Studio Screenshot & 30fps Animated Walkthrough Video Renderer.
Generates:
  - public/demo/01-focus-tunnel-dark.png
  - public/demo/02-split-step-in-half.png
  - public/demo/03-warm-flow-light-mode.png
  - public/demo/04-before-vs-after-impact.png
  - public/demo/unthaw-demo.mp4 (1920x1080, 30fps, H.264 + AAC audio)
"""

import glob
import io
import math
import os
import struct
import subprocess
import tempfile
import wave
import resvg_py
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "demo")
FONT_DIR = "/tmp/unthaw-raw-ttf"
FONT_FILES = sorted(glob.glob(os.path.join(FONT_DIR, "*.ttf")))
os.makedirs(OUT_DIR, exist_ok=True)


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def build_frame_svg(
    *,
    theme: str = "dark",
    view: str = "focus",
    temp_c: int = -18,
    temp_label: str = "CRYO FREEZE",
    active_preset_idx: int = 0,
    step_num: int = 1,
    total_steps: int = 5,
    battery: str = "low",
    split_count: int = 0,
    verb_badge: str = "OPEN & TYPE 3 WORDS",
    duration_s: int = 90,
    clock_str: str = "1:30",
    ring_progress: float = 0.08,
    timer_running: bool = False,
    headline_lines: list[str] = None,
    why_text: str = "Bypasses perfectionism by separating physical file setup from creative thinking (Activation Energy < 90s).",
    dyslexia_on: bool = False,
    caption: str = "",
) -> str:
    if headline_lines is None:
        headline_lines = [
            'Open a single blank workspace file for "12-Page',
            'Senior Capstone Paper" and type only 3 rough',
            "bullet placeholders—no full sentences allowed yet.",
        ]

    is_dark = theme == "dark"
    bg_color = "#070B14" if is_dark else "#F6F3EC"
    fg_color = "#F1F5F9" if is_dark else "#0F172A"
    muted_color = "#94A3B8" if is_dark else "#57534E"
    card_bg = "#0C1323" if is_dark else "#FFFFFF"
    card_border = "rgba(255,255,255,0.09)" if is_dark else "rgba(28,25,23,0.12)"
    nav_bg = "#0B1222" if is_dark else "#FFFFFF"

    if temp_c < -8:
        t_bg = "rgba(12,74,110,0.55)" if is_dark else "#E0F2FE"
        t_fg = "#7DD3FC" if is_dark else "#075985"
        t_bd = "rgba(56,189,248,0.35)"
    elif temp_c < 10:
        t_bg = "rgba(120,53,15,0.55)" if is_dark else "#FEF3C7"
        t_fg = "#FCD34D" if is_dark else "#92400E"
        t_bd = "rgba(245,158,11,0.4)"
    else:
        t_bg = "rgba(6,78,59,0.55)" if is_dark else "#D1FAE5"
        t_fg = "#6EE7B7" if is_dark else "#065F46"
        t_bd = "rgba(16,185,129,0.4)"

    temp_str = f"+{temp_c}°C" if temp_c > 0 else f"{temp_c}°C"
    progress_pct = max(0.10, min(1.0, (step_num - 0.7 + ring_progress) / max(1, total_steps)))
    bar_w = int(1120 * progress_pct)

    r = 64
    circ = 2 * math.pi * r
    dash_offset = circ * (1.0 - max(0.03, min(1.0, ring_progress)))

    pills = [
        ("12-Page Capstone Thesis Freeze", 310),
        ("Production Auth Bug & Messy Slack Handoff", 390),
        ("Financial Aid & Scholarship Application Wall", 380),
        ("3-Exam Week + Group Project pileup", 320),
        ("+ Paste Your Own Task", 220),
    ]

    row1_svg = ""
    x_cursor = 390
    for idx in range(2):
        label, w = pills[idx]
        active = idx == active_preset_idx
        fill = "rgba(251,191,36,0.18)" if active else ("rgba(255,255,255,0.04)" if is_dark else "rgba(231,229,228,0.7)")
        stroke = "#FBBF24" if active else ("rgba(255,255,255,0.10)" if is_dark else "rgba(168,162,158,0.6)")
        txt_c = "#FDE68A" if (active and is_dark) else ("#92400E" if active else ("#CBD5E1" if is_dark else "#44403C"))
        sw = "2" if active else "1"
        row1_svg += f"""
        <g transform="translate({x_cursor}, 228)">
          <rect width="{w}" height="44" rx="22" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>
          <text x="{w//2}" y="27" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="14.5" fill="{txt_c}">{esc(label)}</text>
        </g>"""
        x_cursor += w + 16

    row2_svg = ""
    x_cursor = 275
    for idx in range(2, 5):
        label, w = pills[idx]
        active = idx == active_preset_idx
        is_custom = idx == 4
        fill = "rgba(251,191,36,0.18)" if active else ("rgba(255,255,255,0.04)" if is_dark else "rgba(231,229,228,0.7)")
        stroke = "#38BDF8" if is_custom else ("#FBBF24" if active else ("rgba(255,255,255,0.10)" if is_dark else "rgba(168,162,158,0.6)"))
        dash = 'stroke-dasharray="5,4"' if is_custom else ""
        txt_c = "#7DD3FC" if (is_custom and is_dark) else ("#0369A1" if is_custom else ("#CBD5E1" if is_dark else "#44403C"))
        row2_svg += f"""
        <g transform="translate({x_cursor}, 284)">
          <rect width="{w}" height="44" rx="22" fill="{fill}" stroke="{stroke}" stroke-width="1.5" {dash}/>
          <text x="{w//2}" y="27" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="600" font-size="14.5" fill="{txt_c}">{esc(label)}</text>
        </g>"""
        x_cursor += w + 16

    # Sliding Moon/Sun Toggle (image-2)
    knob_x = 1528 if is_dark else 1492
    knob_bg = "#07090E" if is_dark else "#FFFFFF"
    knob_stroke = "rgba(255,255,255,0.4)" if is_dark else "#F59E0B"
    track_bg = "#222834" if is_dark else "#E7E5E4"
    if is_dark:
        knob_icon = f'<path d="M{knob_x+21} 58.8A7.5 7.5 0 1 1 {knob_x+12.8} 50.5 5.8 5.8 0 0 0 {knob_x+21} 58.8z" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>'
    else:
        knob_icon = f'<circle cx="{knob_x+16}" cy="56" r="4.2" fill="none" stroke="#F59E0B" stroke-width="2"/><path d="M{knob_x+16} 48v2.2M{knob_x+16} 61.8V64M{knob_x+8} 56h2.2M{knob_x+21.8} 56h2.2" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round"/>'

    split_txt_col = "#FDE68A" if is_dark else "#92400E"
    split_bd_col = "rgba(251,191,36,0.55)" if is_dark else "rgba(217,119,6,0.55)"
    low_txt_col = "#FCD34D" if is_dark else "#92400E"
    step_col = "#34D399" if is_dark else "#059669"
    peek_col = "#38BDF8" if is_dark else "#0284C7"

    if view == "focus":
        hl_svg = ""
        y_hl = 532
        letter_sp = 'letter-spacing="1.4px"' if dyslexia_on else ""
        for line in headline_lines:
            hl_svg += f'<text x="400" y="{y_hl}" font-family="Instrument Serif" font-size="46" fill="{fg_color}" {letter_sp}>{esc(line)}</text>'
            y_hl += 54

        split_tag = f"  ·  SPLIT {split_count}x SMALLER" if split_count > 0 else ""
        stage_svg = f"""
        <g>
          <rect x="340" y="356" width="1240" height="530" rx="34" fill="{card_bg}" fill-opacity="0.90" stroke="{card_border}" stroke-width="1.5"/>
          <circle cx="408" cy="406" r="5" fill="{step_col}"/>
          <text x="424" y="411" font-family="JetBrains Mono" font-weight="700" font-size="14" fill="{step_col}" letter-spacing="1.5px">STEP {step_num} OF {total_steps}  ·  {battery.upper()} BATTERY{split_tag}</text>

          <rect x="1250" y="388" width="84" height="32" rx="16" fill="rgba(251,191,36,0.18)" stroke="{split_bd_col}" stroke-width="1.2"/>
          <text x="1292" y="409" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="12" fill="{low_txt_col}">2M LOW</text>
          <text x="1385" y="409" text-anchor="middle" font-family="JetBrains Mono" font-size="12" fill="{muted_color}">5M STEADY</text>
          <text x="1485" y="409" text-anchor="middle" font-family="JetBrains Mono" font-size="12" fill="{muted_color}">10M DEEP</text>

          <rect x="400" y="434" width="1120" height="6" rx="3" fill="rgba(148,163,184,0.15)"/>
          <rect x="400" y="434" width="{bar_w}" height="6" rx="3" fill="url(#thermalGrad)"/>

          <rect x="400" y="462" width="248" height="32" rx="16" fill="url(#amberPillGrad)"/>
          <text x="524" y="483" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="12" fill="#090D16" letter-spacing="0.8px">{esc(verb_badge)}</text>
          <text x="664" y="483" font-family="JetBrains Mono" font-size="14" fill="{muted_color}">{duration_s} seconds</text>

          {hl_svg}

          <text x="400" y="{y_hl + 12}" font-family="Plus Jakarta Sans" font-size="15.5" fill="{muted_color}">{esc(why_text)}</text>

          <g transform="translate(1335, 515)">
            <circle cx="80" cy="80" r="{r}" fill="none" stroke="rgba(148,163,184,0.16)" stroke-width="8"/>
            <circle cx="80" cy="80" r="{r}" fill="none" stroke="url(#thermalGrad)" stroke-width="8" stroke-linecap="round"
              stroke-dasharray="{circ:.1f}" stroke-dashoffset="{dash_offset:.1f}" transform="rotate(-90 80 80)"/>
            <text x="80" y="84" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="34" fill="{fg_color}">{clock_str}</text>
            <text x="80" y="108" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="12" fill="{low_txt_col}" letter-spacing="1.5px">{'MELTING...' if timer_running else 'START'}</text>
          </g>

          <line x1="400" y1="732" x2="1520" y2="732" stroke="{card_border}" stroke-width="1"/>

          <rect x="400" y="754" width="380" height="58" rx="29" fill="url(#ctaGrad)"/>
          <text x="590" y="789" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="16" fill="#06121E">Done — Melt Next Micro-Step (Enter)</text>

          <rect x="1030" y="757" width="305" height="52" rx="26" fill="rgba(251,191,36,0.14)" stroke="{split_bd_col}" stroke-width="1.5"/>
          <text x="1182" y="788" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="14" fill="{split_txt_col}">Still Too Scary? Split in Half (S)</text>

          <rect x="1350" y="757" width="170" height="52" rx="26" fill="rgba(148,163,184,0.08)" stroke="{card_border}" stroke-width="1.5"/>
          <text x="1435" y="788" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="600" font-size="14" fill="{fg_color}">Read Aloud (R)</text>

          <text x="400" y="852" font-family="Plus Jakarta Sans" font-size="14" fill="{muted_color}">Blindfold Shield active — {max(0, total_steps - step_num)} remaining micro-steps hidden so your mind can rest.</text>
          <text x="1520" y="852" text-anchor="end" font-family="Plus Jakarta Sans" font-weight="600" font-size="14" fill="{peek_col}">Peek at all {total_steps} steps (B)</text>
        </g>
        """
    else:
        stage_svg = f"""
        <g>
          <rect x="340" y="356" width="1240" height="530" rx="34" fill="{card_bg}" fill-opacity="0.92" stroke="{card_border}" stroke-width="1.5"/>
          <text x="400" y="416" font-family="Plus Jakarta Sans" font-weight="800" font-size="13" fill="#34D399" letter-spacing="2px">MEASURABLE WORKFLOW CHANGE</text>
          <text x="400" y="462" font-family="Instrument Serif" font-size="44" fill="{fg_color}">Before vs. After Impact Receipt</text>

          <rect x="1030" y="418" width="210" height="40" rx="20" fill="rgba(244,63,94,0.16)" stroke="rgba(244,63,94,0.4)" stroke-width="1.5"/>
          <text x="1135" y="443" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="13.5" fill="#FDA4AF">Before: 98/100 Freeze</text>

          <rect x="1265" y="418" width="255" height="40" rx="20" fill="rgba(16,185,129,0.18)" stroke="rgba(16,185,129,0.45)" stroke-width="1.5"/>
          <text x="1392" y="443" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="13.5" fill="#6EE7B7">After: 18/100 (-82% Friction)</text>

          <rect x="400" y="500" width="535" height="330" rx="24" fill="rgba(244,63,94,0.07)" stroke="rgba(244,63,94,0.3)" stroke-width="1.5"/>
          <text x="432" y="542" font-family="Plus Jakarta Sans" font-weight="800" font-size="13" fill="#FB7185" letter-spacing="1.2px">BEFORE · RAW FROZEN BACKLOG (-18°C)</text>
          <text x="432" y="586" font-family="JetBrains Mono" font-size="14" fill="{fg_color}">Write the complete 12-page Senior Capstone</text>
          <text x="432" y="612" font-family="JetBrains Mono" font-size="14" fill="{fg_color}">Research Paper on Distributed Fault Tolerance</text>
          <text x="432" y="638" font-family="JetBrains Mono" font-size="14" fill="{fg_color}">by Friday 5pm. Must include abstract, 15 IEEE</text>
          <text x="432" y="664" font-family="JetBrains Mono" font-size="14" fill="{fg_color}">citations, architecture diagram, and benchmarks.</text>
          <text x="432" y="730" font-family="Plus Jakarta Sans" font-size="13.5" fill="{muted_color}">Triggers: All-or-nothing scope · High-volume quota</text>
          <text x="432" y="754" font-family="Plus Jakarta Sans" font-size="13.5" fill="{muted_color}">intimidation · Multi-deliverable clause stacking.</text>

          <rect x="985" y="500" width="535" height="330" rx="24" fill="rgba(16,185,129,0.09)" stroke="rgba(16,185,129,0.4)" stroke-width="1.5"/>
          <text x="1017" y="542" font-family="Plus Jakarta Sans" font-weight="800" font-size="13" fill="#34D399" letter-spacing="1.2px">AFTER · SINGLE BLINDFOLD MICRO-STEP (+24°C)</text>
          <text x="1017" y="590" font-family="Plus Jakarta Sans" font-weight="700" font-size="16" fill="{fg_color}">Open a single blank workspace file for</text>
          <text x="1017" y="618" font-family="Plus Jakarta Sans" font-weight="700" font-size="16" fill="{fg_color}">"12-Page Senior Capstone Paper" and type</text>
          <text x="1017" y="646" font-family="Plus Jakarta Sans" font-weight="700" font-size="16" fill="{fg_color}">only 3 rough bullet placeholders (90s).</text>
          <text x="1017" y="730" font-family="Plus Jakarta Sans" font-size="13.5" fill="{muted_color}">All other 4 steps stay tucked behind the Blindfold</text>
          <text x="1017" y="754" font-family="Plus Jakarta Sans" font-size="13.5" fill="{muted_color}">Shield until Step 1 is complete.</text>
        </g>
        """

    t_col = ("#7DD3FC" if is_dark else "#0284C7") if view == "focus" else muted_color
    i_col = ("#6EE7B7" if is_dark else "#059669") if view == "receipt" else muted_color
    sh_col = "#34D399" if is_dark else "#059669"

    caption_svg = ""
    if caption:
        caption_svg = f"""
        <g transform="translate(320, 896)">
          <rect width="1280" height="44" rx="22" fill="rgba(7,11,20,0.92)" stroke="rgba(56,189,248,0.4)" stroke-width="1.2"/>
          <text x="640" y="28" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="600" font-size="15.5" fill="#F8FAFC">{esc(caption)}</text>
        </g>
        """

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
      <defs>
        <radialGradient id="auraSky" cx="20%" cy="15%" r="48%">
          <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.13"/>
          <stop offset="100%" stop-color="#38BDF8" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="auraAmber" cx="82%" cy="28%" r="48%">
          <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="thermalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#38BDF8"/>
          <stop offset="50%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#10B981"/>
        </linearGradient>
        <linearGradient id="amberPillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FBBF24"/>
          <stop offset="100%" stop-color="#FB923C"/>
        </linearGradient>
        <linearGradient id="ctaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#34D399"/>
          <stop offset="50%" stop-color="#2DD4BF"/>
          <stop offset="100%" stop-color="#38BDF8"/>
        </linearGradient>
      </defs>

      <rect width="1920" height="1080" fill="{bg_color}"/>
      <rect width="1920" height="1080" fill="url(#auraSky)"/>
      <rect width="1920" height="1080" fill="url(#auraAmber)"/>

      <rect x="340" y="24" width="1240" height="64" rx="32" fill="{nav_bg}" fill-opacity="0.90" stroke="{card_border}" stroke-width="1.5"/>

      <g transform="translate(364, 34)">
        <rect width="44" height="44" rx="13" fill="#0B1220" stroke="url(#thermalGrad)" stroke-width="2"/>
        <path d="M22 7L32 15L22 21L12 15L22 7Z" fill="#7DD3FC"/>
        <path d="M12 15L22 21L32 15L33 25C33 31 28 36 22 36C16 36 11 31 11 25L12 15Z" fill="url(#thermalGrad)"/>
        <circle cx="22" cy="27" r="4" fill="#FFFBEB"/>
      </g>
      <text x="422" y="63" font-family="Plus Jakarta Sans" font-weight="800" font-size="22" fill="url(#thermalGrad)">Unthaw</text>

      <rect x="520" y="40" width="176" height="32" rx="16" fill="{t_bg}" stroke="{t_bd}" stroke-width="1.2"/>
      <text x="608" y="61" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="12.5" fill="{t_fg}">{temp_str} · {temp_label}</text>

      <rect x="1225" y="40" width="126" height="34" rx="17" fill="{'#FBBF24' if dyslexia_on else 'rgba(148,163,184,0.08)'}" stroke="{card_border}" stroke-width="1.2"/>
      <text x="1288" y="62" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="12.5" fill="{'#0F172A' if dyslexia_on else fg_color}">Dyslexia: {'ON' if dyslexia_on else 'OFF'}</text>

      <rect x="1362" y="40" width="112" height="34" rx="17" fill="rgba(148,163,184,0.08)" stroke="{card_border}" stroke-width="1.2"/>
      <text x="1418" y="62" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="12.5" fill="{fg_color}">AAA: OFF</text>

      <rect x="1486" y="36" width="78" height="40" rx="20" fill="{track_bg}" stroke="{card_border}" stroke-width="1.5"/>
      <circle cx="{knob_x + 16}" cy="56" r="16" fill="{knob_bg}" stroke="{knob_stroke}" stroke-width="1.6"/>
      {knob_icon}

      <text x="960" y="156" text-anchor="middle" font-family="Instrument Serif" font-size="62" fill="{fg_color}">
        Every freeze melts <tspan font-style="italic" fill="url(#thermalGrad)">one micro-step</tspan> at a time.
      </text>
      <text x="960" y="196" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="16" fill="{muted_color}">
        Your brain does not need 15 checkboxes right now. Everything else is tucked safely out of sight—just do this single physical action.
      </text>

      {row1_svg}
      {row2_svg}

      {stage_svg}

      <g transform="translate(680, 956)">
        <rect width="560" height="78" rx="39" fill="{nav_bg}" fill-opacity="0.94" stroke="{card_border}" stroke-width="1.5"/>
        <g transform="translate(88, 18)" stroke="{t_col}" fill="none" stroke-width="1.8">
          <rect x="-10" y="0" width="8" height="8" rx="1.5"/>
          <rect x="2" y="0" width="8" height="5" rx="1.5"/>
          <rect x="2" y="9" width="8" height="11" rx="1.5"/>
          <rect x="-10" y="12" width="8" height="8" rx="1.5"/>
        </g>
        <text x="88" y="60" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="11" fill="{t_col}" letter-spacing="1.8px">TUNNEL</text>

        <g transform="translate(216, 18)" stroke="{muted_color}" fill="none" stroke-width="2" stroke-linecap="round">
          <path d="M0 2v16M-8 10h16"/>
        </g>
        <text x="216" y="60" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="11" fill="{muted_color}" letter-spacing="1.8px">UNTHAW</text>

        <g transform="translate(348, 18)" stroke="{sh_col}" fill="none" stroke-width="1.8" stroke-linecap="round">
          <rect x="-9" y="8" width="18" height="12" rx="2.5"/>
          <path d="M-5 8V5a5 5 0 0 1 10 0v3"/>
        </g>
        <text x="348" y="60" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="11" fill="{sh_col}" letter-spacing="1.8px">SHIELD ON</text>

        <g transform="translate(474, 18)" stroke="{i_col}" fill="none" stroke-width="1.8" stroke-linecap="round">
          <path d="M0 20s8-4 8-10V3L0 0l-8 3v7c0 6 8 10 8 10z"/>
        </g>
        <text x="474" y="60" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="11" fill="{i_col}" letter-spacing="1.8px">IMPACT</text>
      </g>

      {caption_svg}
    </svg>"""


def render_svg_to_pil(svg_str: str) -> Image.Image:
    png_bytes = resvg_py.svg_to_bytes(
        svg_string=svg_str,
        skip_system_fonts=True,
        font_files=FONT_FILES,
    )
    return Image.open(io.BytesIO(png_bytes)).convert("RGBA")


def draw_cursor(img: Image.Image, cx: int, cy: int, clicking: bool = False) -> Image.Image:
    out = img.copy()
    draw = ImageDraw.Draw(out, "RGBA")
    if clicking:
        draw.ellipse((cx - 26, cy - 26, cx + 26, cy + 26), outline=(251, 191, 36, 220), width=4)
        draw.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=(251, 191, 36, 90))
    pts = [(cx, cy), (cx + 10, cy + 28), (cx + 16, cy + 19), (cx + 27, cy + 16)]
    draw.polygon(pts, fill=(255, 255, 255, 255), outline=(15, 23, 42, 255))
    return out


def generate_ambient_wav(wav_path: str, duration_s: float = 28.0, sample_rate: int = 44100):
    n_samples = int(duration_s * sample_rate)
    chime_times = [0.4, 7.0, 14.0, 21.0]
    with wave.open(wav_path, "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        frames = bytearray()
        for i in range(n_samples):
            t = i / sample_rate
            pad = (
                0.28 * math.sin(2 * math.pi * 130.81 * t)
                + 0.20 * math.sin(2 * math.pi * 196.00 * t)
                + 0.15 * math.sin(2 * math.pi * 246.94 * t)
                + 0.14 * math.sin(2 * math.pi * 293.66 * t)
                + 0.12 * math.sin(2 * math.pi * 329.63 * t)
            )
            env = 0.55 + 0.25 * math.sin(2 * math.pi * 0.12 * t)
            fade = min(1.0, t / 1.5, (duration_s - t) / 1.8)
            val = pad * env * fade * 0.18

            for ct in chime_times:
                dt = t - ct
                if 0 <= dt < 1.8:
                    val += 0.14 * math.exp(-dt * 3.2) * math.sin(2 * math.pi * 587.33 * t)
                    val += 0.09 * math.exp(-dt * 4.0) * math.sin(2 * math.pi * 880.00 * t)

            sample = max(-32767, min(32767, int(val * 32767)))
            frames += struct.pack("<hh", sample, sample)
        wf.writeframes(frames)


def main():
    print("1. Rendering 4 high-resolution (1920x1080) Devpost screenshots...")
    k1 = render_svg_to_pil(
        build_frame_svg(
            theme="dark",
            view="focus",
            temp_c=-18,
            temp_label="CRYO FREEZE",
            step_num=1,
            total_steps=5,
            clock_str="1:30",
            ring_progress=0.08,
            caption="1. Unthaw hides overwhelming backlogs behind a Blindfold Shield and surfaces ONE 90-second physical action.",
        )
    )
    k1.convert("RGB").save(os.path.join(OUT_DIR, "01-focus-tunnel-dark.png"))

    k2 = render_svg_to_pil(
        build_frame_svg(
            theme="dark",
            view="focus",
            temp_c=-6,
            temp_label="THAWING",
            step_num=1,
            total_steps=6,
            split_count=1,
            verb_badge="OPEN & TYPE 3 WORDS (SETUP)",
            duration_s=60,
            clock_str="0:54",
            ring_progress=0.28,
            timer_running=True,
            headline_lines=[
                "Part 1 of 2 (60s warm-up): Do ONLY the physical",
                'setup for "12-Page Senior Capstone Paper"—open',
                "the exact window and put your cursor on line 1.",
            ],
            why_text="Halves the activation threshold so your hands move before your brain can overthink.",
            caption='2. Pressing "Still Too Scary? Split in Half" cuts any step into a 60-second physical warm-up.',
        )
    )
    k2.convert("RGB").save(os.path.join(OUT_DIR, "02-split-step-in-half.png"))

    k3 = render_svg_to_pil(
        build_frame_svg(
            theme="light",
            view="focus",
            temp_c=16,
            temp_label="WARM FLOW",
            step_num=4,
            total_steps=6,
            split_count=1,
            verb_badge="SKETCH BOXES",
            duration_s=120,
            clock_str="1:42",
            ring_progress=0.68,
            timer_running=True,
            dyslexia_on=True,
            headline_lines=[
                "Draw or list the 4 main boxes/labels for",
                '"system architecture diagram" as plain text',
                "arrows (A -> B -> C) before touching any tool.",
            ],
            why_text="Plain-text wireframing removes visual-formatting friction during initiation.",
            caption="3. Includes tactile Dark/Light mode switch, Dyslexia spacing, AAA contrast, and Web Speech Read-Aloud.",
        )
    )
    k3.convert("RGB").save(os.path.join(OUT_DIR, "03-warm-flow-light-mode.png"))

    k4 = render_svg_to_pil(
        build_frame_svg(
            theme="dark",
            view="receipt",
            temp_c=24,
            temp_label="WARM FLOW",
            step_num=5,
            total_steps=5,
            caption="4. Measurable Change: Raw task intimidation drops from 98/100 Freeze down to 18/100 (-82% Friction).",
        )
    )
    k4.convert("RGB").save(os.path.join(OUT_DIR, "04-before-vs-after-impact.png"))
    print("   -> Saved 4 PNG screenshots in public/demo/")

    print("2. Rendering 28-second 1080p @ 24fps animated walkthrough video...")
    fps = 24
    total_secs = 28
    total_frames = fps * total_secs

    with tempfile.TemporaryDirectory() as tmpdir:
        for f_idx in range(total_frames):
            t = f_idx / fps

            if t < 7.0:
                base = k1
                if t > 6.5:
                    alpha = (t - 6.5) / 0.5
                    base = Image.blend(k1, k2, alpha)
                p = min(1.0, max(0.0, (t - 1.5) / 4.5))
                cx = int(540 + (1182 - 540) * p)
                cy = int(250 + (783 - 250) * p)
                clicking = 5.9 <= t <= 6.6
            elif t < 14.0:
                st = t - 7.0
                base = k2
                if st > 6.5:
                    alpha = (st - 6.5) / 0.5
                    base = Image.blend(k2, k3, alpha)
                p = min(1.0, max(0.0, (st - 1.2) / 4.5))
                cx = int(1182 + (1525 - 1182) * p)
                cy = int(783 + (56 - 783) * p)
                clicking = 5.8 <= st <= 6.5
            elif t < 21.0:
                st = t - 14.0
                base = k3
                if st > 6.5:
                    alpha = (st - 6.5) / 0.5
                    base = Image.blend(k3, k4, alpha)
                p = min(1.0, max(0.0, (st - 1.5) / 4.5))
                cx = int(1525 + (1154 - 1525) * p)
                cy = int(56 + (995 - 56) * p)
                clicking = 5.8 <= st <= 6.5
            else:
                st = t - 21.0
                base = k4
                p = min(1.0, max(0.0, st / 3.0))
                cx = int(1154 + (1250 - 1154) * p)
                cy = int(995 + (640 - 995) * p)
                clicking = 0.1 <= st <= 0.7

            frame_img = draw_cursor(base, cx, cy, clicking).convert("RGB")
            frame_img.save(os.path.join(tmpdir, f"frame_{f_idx:04d}.jpg"), quality=94)

        wav_path = os.path.join(tmpdir, "ambient.wav")
        generate_ambient_wav(wav_path, duration_s=total_secs)

        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        mp4_out = os.path.join(OUT_DIR, "unthaw-demo.mp4")

        cmd = [
            ffmpeg_exe,
            "-y",
            "-framerate",
            str(fps),
            "-i",
            os.path.join(tmpdir, "frame_%04d.jpg"),
            "-i",
            wav_path,
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-shortest",
            mp4_out,
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("   -> Rendered MP4:", mp4_out, "size:", os.path.getsize(mp4_out), "bytes")


if __name__ == "__main__":
    main()
