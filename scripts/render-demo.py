#!/usr/bin/env python3
"""
Unthaw 1080p Studio Screenshot Renderer (Reflecting Advisor's 5 UI Refinements).
Generates:
  - public/demo/01-focus-tunnel-dark.png
  - public/demo/02-split-step-in-half.png
  - public/demo/03-warm-flow-light-mode.png
  - public/demo/04-before-vs-after-impact.png
"""

import glob
import io
import math
import os
import resvg_py
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "demo")
FONT_DIR = os.path.join(ROOT, "scripts", "fonts")
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
    ring_progress: float = 0.0,
    timer_running: bool = False,
    headline_text: str = "Open a blank file, type three words.",
    task_subline: str = "Task: 12-page Senior Capstone Research Paper on Distributed Fault Tolerance by Friday 5pm",
    why_text: str = "Bypasses perfectionism by separating physical file setup from creative thinking (Activation Energy < 90s).",
    dyslexia_on: bool = False,
    high_contrast_on: bool = False,
) -> str:
    is_dark = theme == "dark"
    bg_color = "#070B14" if is_dark else "#F6F3EC"
    fg_color = "#F1F5F9" if is_dark else "#0F172A"
    muted_color = "#94A3B8" if is_dark else "#57534E"
    subline_color = "#7DD3FC" if is_dark else "#0369A1"
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
    progress_pct = max(0.10, min(1.0, (step_num - 0.75 + ring_progress) / max(1, total_steps)))
    bar_w = int(1120 * progress_pct)

    r = 62
    circ = 2 * math.pi * r
    dash_offset = circ * (1.0 - max(0.0, min(1.0, ring_progress)))

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
        <g transform="translate({x_cursor}, 224)">
          <rect width="{w}" height="42" rx="21" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>
          <text x="{w//2}" y="26" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="14" fill="{txt_c}">{esc(label)}</text>
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
        <g transform="translate({x_cursor}, 276)">
          <rect width="{w}" height="42" rx="21" fill="{fill}" stroke="{stroke}" stroke-width="1.5" {dash}/>
          <text x="{w//2}" y="26" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="600" font-size="14" fill="{txt_c}">{esc(label)}</text>
        </g>"""
        x_cursor += w + 16

    # Sliding Moon/Sun Toggle
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
        # Change 1 & 2: Short imperative headline (<8 words, no quotes), sans font, loosened letter-spacing + task subline
        hl_letter_sp = "1.6px" if dyslexia_on else "1.1px"
        body_letter_sp = "1.1px" if dyslexia_on else "0.6px"
        split_tag = f"  ·  SPLIT {split_count}x SMALLER" if split_count > 0 else ""

        # Change 4: Timer starts paused; user taps Start button inside the ring
        ring_arc = ""
        if ring_progress > 0.005:
            ring_arc = f'<circle cx="80" cy="80" r="{r}" fill="none" stroke="url(#thermalGrad)" stroke-width="8" stroke-linecap="round" stroke-dasharray="{circ:.1f}" stroke-dashoffset="{dash_offset:.1f}" transform="rotate(-90 80 80)"/>'

        btn_label = "PAUSE" if timer_running else "START"

        stage_svg = f"""
        <g>
          <rect x="340" y="344" width="1240" height="500" rx="34" fill="{card_bg}" fill-opacity="0.92" stroke="{card_border}" stroke-width="1.5"/>
          <circle cx="408" cy="392" r="5" fill="{step_col}"/>
          <text x="424" y="397" font-family="JetBrains Mono" font-weight="700" font-size="14" fill="{step_col}" letter-spacing="1.5px">STEP {step_num} OF {total_steps}  ·  {battery.upper()} BATTERY{split_tag}</text>

          <rect x="1250" y="374" width="84" height="32" rx="16" fill="rgba(251,191,36,0.18)" stroke="{split_bd_col}" stroke-width="1.2"/>
          <text x="1292" y="395" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="12" fill="{low_txt_col}">2M LOW</text>
          <text x="1385" y="395" text-anchor="middle" font-family="JetBrains Mono" font-size="12" fill="{muted_color}">5M STEADY</text>
          <text x="1485" y="395" text-anchor="middle" font-family="JetBrains Mono" font-size="12" fill="{muted_color}">10M DEEP</text>

          <rect x="400" y="420" width="1120" height="6" rx="3" fill="rgba(148,163,184,0.15)"/>
          <rect x="400" y="420" width="{bar_w}" height="6" rx="3" fill="url(#thermalGrad)"/>

          <rect x="400" y="452" width="248" height="32" rx="16" fill="url(#amberPillGrad)"/>
          <text x="524" y="473" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="12" fill="#090D16" letter-spacing="0.8px">{esc(verb_badge)}</text>
          <text x="664" y="473" font-family="JetBrains Mono" font-size="14" fill="{muted_color}">{duration_s} seconds</text>

          <!-- Short Imperative Sans Headline (<8 words) with loosened letter-spacing -->
          <text x="400" y="538" font-family="Plus Jakarta Sans" font-weight="700" font-size="36" fill="{fg_color}" letter-spacing="{hl_letter_sp}">{esc(headline_text)}</text>

          <!-- Task Name as Small Subline -->
          <text x="400" y="582" font-family="Plus Jakarta Sans" font-weight="600" font-size="15.5" fill="{subline_color}" letter-spacing="{body_letter_sp}">{esc(task_subline)}</text>

          <!-- Step Why-It-Works in Sans with loosened letter-spacing -->
          <text x="400" y="624" font-family="Plus Jakarta Sans" font-size="15.5" fill="{muted_color}" letter-spacing="{body_letter_sp}">{esc(why_text)}</text>

          <!-- Timer Ring (Starts Paused; User Taps Start) -->
          <g transform="translate(1335, 482)">
            <circle cx="80" cy="80" r="{r}" fill="none" stroke="rgba(148,163,184,0.16)" stroke-width="8"/>
            {ring_arc}
            <text x="80" y="76" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="32" fill="{fg_color}">{clock_str}</text>
            <rect x="42" y="90" width="76" height="26" rx="13" fill="rgba(251,191,36,0.20)" stroke="{split_bd_col}" stroke-width="1.2"/>
            <text x="80" y="107" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="11.5" fill="{low_txt_col}" letter-spacing="1.4px">{btn_label}</text>
          </g>

          <line x1="400" y1="692" x2="1520" y2="692" stroke="{card_border}" stroke-width="1"/>

          <rect x="400" y="714" width="380" height="56" rx="28" fill="url(#ctaGrad)"/>
          <text x="590" y="748" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="16" fill="#06121E">Done — Melt Next Micro-Step (Enter)</text>

          <rect x="1030" y="716" width="305" height="52" rx="26" fill="rgba(251,191,36,0.14)" stroke="{split_bd_col}" stroke-width="1.5"/>
          <text x="1182" y="747" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="14" fill="{split_txt_col}">Still Too Scary? Split in Half (S)</text>

          <rect x="1350" y="716" width="170" height="52" rx="26" fill="rgba(148,163,184,0.08)" stroke="{card_border}" stroke-width="1.5"/>
          <text x="1435" y="747" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="600" font-size="14" fill="{fg_color}">Read Aloud (R)</text>

          <text x="400" y="812" font-family="Plus Jakarta Sans" font-size="14" fill="{muted_color}">Blindfold Shield active — {max(0, total_steps - step_num)} remaining micro-steps hidden so your mind can rest.</text>
          <text x="1520" y="812" text-anchor="end" font-family="Plus Jakarta Sans" font-weight="600" font-size="14" fill="{peek_col}">Peek at all {total_steps} steps (B)</text>
        </g>
        """
    else:
        stage_svg = f"""
        <g>
          <rect x="340" y="344" width="1240" height="500" rx="34" fill="{card_bg}" fill-opacity="0.92" stroke="{card_border}" stroke-width="1.5"/>
          <text x="400" y="402" font-family="Plus Jakarta Sans" font-weight="800" font-size="13" fill="#34D399" letter-spacing="2px">MEASURABLE WORKFLOW CHANGE</text>
          <text x="400" y="448" font-family="Instrument Serif" font-size="44" fill="{fg_color}">Before vs. After Impact Receipt</text>

          <rect x="1030" y="404" width="210" height="40" rx="20" fill="rgba(244,63,94,0.16)" stroke="rgba(244,63,94,0.4)" stroke-width="1.5"/>
          <text x="1135" y="429" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="13.5" fill="#FDA4AF">Before: 98/100 Freeze</text>

          <rect x="1265" y="404" width="255" height="40" rx="20" fill="rgba(16,185,129,0.18)" stroke="rgba(16,185,129,0.45)" stroke-width="1.5"/>
          <text x="1392" y="429" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="13.5" fill="#6EE7B7">After: 18/100 (-82% Friction)</text>

          <rect x="400" y="484" width="535" height="315" rx="24" fill="rgba(244,63,94,0.07)" stroke="rgba(244,63,94,0.3)" stroke-width="1.5"/>
          <text x="432" y="526" font-family="Plus Jakarta Sans" font-weight="800" font-size="13" fill="#FB7185" letter-spacing="1.2px">BEFORE · RAW FROZEN BACKLOG (-18°C)</text>
          <text x="432" y="570" font-family="JetBrains Mono" font-size="14" fill="{fg_color}">Write the complete 12-page Senior Capstone</text>
          <text x="432" y="596" font-family="JetBrains Mono" font-size="14" fill="{fg_color}">Research Paper on Distributed Fault Tolerance</text>
          <text x="432" y="622" font-family="JetBrains Mono" font-size="14" fill="{fg_color}">by Friday 5pm. Must include abstract, 15 IEEE</text>
          <text x="432" y="648" font-family="JetBrains Mono" font-size="14" fill="{fg_color}">citations, architecture diagram, and benchmarks.</text>
          <text x="432" y="714" font-family="Plus Jakarta Sans" font-size="13.5" fill="{muted_color}">Triggers: All-or-nothing scope · High-volume quota</text>
          <text x="432" y="738" font-family="Plus Jakarta Sans" font-size="13.5" fill="{muted_color}">intimidation · Multi-deliverable clause stacking.</text>

          <rect x="985" y="484" width="535" height="315" rx="24" fill="rgba(16,185,129,0.09)" stroke="rgba(16,185,129,0.4)" stroke-width="1.5"/>
          <text x="1017" y="526" font-family="Plus Jakarta Sans" font-weight="800" font-size="13" fill="#34D399" letter-spacing="1.2px">AFTER · SINGLE BLINDFOLD MICRO-STEP (+24°C)</text>
          <text x="1017" y="576" font-family="Plus Jakarta Sans" font-weight="700" font-size="22" fill="{fg_color}" letter-spacing="0.8px">Open a blank file, type three words.</text>
          <text x="1017" y="610" font-family="Plus Jakarta Sans" font-weight="600" font-size="14" fill="{subline_color}" letter-spacing="0.5px">Task: 12-page Senior Capstone Research Paper</text>
          <text x="1017" y="714" font-family="Plus Jakarta Sans" font-size="13.5" fill="{muted_color}">All other 4 steps stay tucked behind the Blindfold</text>
          <text x="1017" y="738" font-family="Plus Jakarta Sans" font-size="13.5" fill="{muted_color}">Shield until Step 1 is complete.</text>
        </g>
        """

    dock_inactive = "#CBD5E1" if is_dark else "#44403C"
    t_col = ("#7DD3FC" if is_dark else "#0284C7") if view == "focus" else dock_inactive
    i_col = ("#6EE7B7" if is_dark else "#059669") if view == "receipt" else dock_inactive
    sh_col = "#34D399" if is_dark else "#059669"

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

      <rect x="1175" y="40" width="126" height="34" rx="17" fill="{'#FBBF24' if dyslexia_on else 'rgba(148,163,184,0.08)'}" stroke="{card_border}" stroke-width="1.2"/>
      <text x="1238" y="62" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="12.5" fill="{'#0F172A' if dyslexia_on else fg_color}">Dyslexia: {'ON' if dyslexia_on else 'OFF'}</text>

      <!-- Change 5: Renamed 'AAA' toggle to 'High contrast' -->
      <rect x="1312" y="40" width="162" height="34" rx="17" fill="rgba(148,163,184,0.08)" stroke="{card_border}" stroke-width="1.2"/>
      <text x="1393" y="62" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="12.5" fill="{fg_color}">High contrast: {'ON' if high_contrast_on else 'OFF'}</text>

      <rect x="1486" y="36" width="78" height="40" rx="20" fill="{track_bg}" stroke="{card_border}" stroke-width="1.5"/>
      <circle cx="{knob_x + 16}" cy="56" r="16" fill="{knob_bg}" stroke="{knob_stroke}" stroke-width="1.6"/>
      {knob_icon}

      <text x="960" y="152" text-anchor="middle" font-family="Instrument Serif" font-size="60" fill="{fg_color}">
        Every freeze melts <tspan font-style="italic" fill="url(#thermalGrad)">one micro-step</tspan> at a time.
      </text>
      <text x="960" y="192" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="16" fill="{muted_color}">
        Your brain does not need 15 checkboxes right now. Everything else is tucked safely out of sight—just do this single physical action.
      </text>

      {row1_svg}
      {row2_svg}

      {stage_svg}

      <!-- Change 3: Bottom Dock with clear text labels and 110px separation below the step card (y=954 vs card bottom y=844) -->
      <g transform="translate(680, 954)">
        <rect width="560" height="82" rx="41" fill="{nav_bg}" fill-opacity="0.96" stroke="{card_border}" stroke-width="1.5"/>
        <g transform="translate(88, 18)" stroke="{t_col}" fill="none" stroke-width="1.9">
          <rect x="-10" y="0" width="8" height="8" rx="1.5"/>
          <rect x="2" y="0" width="8" height="5" rx="1.5"/>
          <rect x="2" y="9" width="8" height="11" rx="1.5"/>
          <rect x="-10" y="12" width="8" height="8" rx="1.5"/>
        </g>
        <text x="88" y="62" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="12" fill="{t_col}" letter-spacing="1.6px">TUNNEL</text>

        <g transform="translate(216, 18)" stroke="{dock_inactive}" fill="none" stroke-width="2" stroke-linecap="round">
          <path d="M0 2v16M-8 10h16"/>
        </g>
        <text x="216" y="62" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="12" fill="{dock_inactive}" letter-spacing="1.6px">UNTHAW</text>

        <g transform="translate(348, 18)" stroke="{sh_col}" fill="none" stroke-width="1.9" stroke-linecap="round">
          <rect x="-9" y="8" width="18" height="12" rx="2.5"/>
          <path d="M-5 8V5a5 5 0 0 1 10 0v3"/>
        </g>
        <text x="348" y="62" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="12" fill="{sh_col}" letter-spacing="1.6px">SHIELD ON</text>

        <g transform="translate(474, 18)" stroke="{i_col}" fill="none" stroke-width="1.9" stroke-linecap="round">
          <path d="M0 20s8-4 8-10V3L0 0l-8 3v7c0 6 8 10 8 10z"/>
        </g>
        <text x="474" y="62" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="12" fill="{i_col}" letter-spacing="1.6px">IMPACT</text>
      </g>
    </svg>"""


def render_svg_to_pil(svg_str: str) -> Image.Image:
    png_bytes = resvg_py.svg_to_bytes(
        svg_string=svg_str,
        skip_system_fonts=True,
        font_files=FONT_FILES,
    )
    return Image.open(io.BytesIO(png_bytes)).convert("RGBA")


def main():
    print("Rendering 4 updated 1080p screenshots reflecting advisor feedback...")
    k1 = render_svg_to_pil(
        build_frame_svg(
            theme="dark",
            view="focus",
            temp_c=-18,
            temp_label="CRYO FREEZE",
            step_num=1,
            total_steps=5,
            duration_s=90,
            clock_str="1:30",
            ring_progress=0.0,
            timer_running=False,
            headline_text="Open a blank file, type three words.",
            task_subline="Task: 12-page Senior Capstone Research Paper on Distributed Fault Tolerance by Friday 5pm",
            why_text="Bypasses perfectionism by separating physical file setup from creative thinking (Activation Energy < 90s).",
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
            duration_s=45,
            clock_str="0:45",
            ring_progress=0.0,
            timer_running=False,
            headline_text="Open the file and place your cursor.",
            task_subline="Task: 12-page Senior Capstone Research Paper on Distributed Fault Tolerance by Friday 5pm",
            why_text="Halves the activation threshold so your hands move before your brain can overthink.",
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
            clock_str="2:00",
            ring_progress=0.0,
            timer_running=False,
            dyslexia_on=True,
            headline_text="Sketch four simple boxes with arrows.",
            task_subline="Task: system architecture diagram",
            why_text="Plain-text wireframing removes visual-formatting friction during initiation.",
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
        )
    )
    k4.convert("RGB").save(os.path.join(OUT_DIR, "04-before-vs-after-impact.png"))
    print("Saved 4 updated PNG screenshots in public/demo/")


if __name__ == "__main__":
    main()
