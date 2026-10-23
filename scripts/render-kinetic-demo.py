#!/usr/bin/env python3
"""
Unthaw 30fps Kinetic Product Teaser & Interactive Walkthrough Renderer.
Inspired by Remotion Teaser.tsx (agentvault-v3.mp4) & Prompt-Motion:
  - True 30fps frame-by-frame spring physics, screen shake, typewriter text,
    live ticking countdown ring, live counting telemetry (-18°C -> +24°C, 98 -> 18),
    physical card split animation, sliding Moon/Sun toggle animation, and
    synchronized sound design (typing clicks, whooshes, stamp thuds, warm chords).
"""

import math
import os
import struct
import subprocess
import tempfile
import time
import wave
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, "scripts", "fonts")
OUT_DIR = os.path.join(ROOT, "public", "demo")
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 1920, 1080
FPS = 30
TOTAL_FRAMES = 1020  # 34.0 seconds @ 30fps


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)


# Preload font sizes once (renders at >80 fps)
F_SERIF_92 = load_font("instrument-serif-latin-400-normal.ttf", 92)
F_SERIF_72 = load_font("instrument-serif-latin-400-normal.ttf", 72)
F_SERIF_60 = load_font("instrument-serif-latin-400-normal.ttf", 60)
F_SERIF_48 = load_font("instrument-serif-latin-400-normal.ttf", 48)
F_SERIF_44 = load_font("instrument-serif-latin-400-normal.ttf", 44)
F_SERIF_I_60 = load_font("instrument-serif-latin-400-italic.ttf", 60)
F_SERIF_I_92 = load_font("instrument-serif-latin-400-italic.ttf", 92)

F_SANS_800_72 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 72)
F_SANS_800_56 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 56)
F_SANS_800_36 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 36)
F_SANS_800_24 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 24)
F_SANS_800_18 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 18)
F_SANS_800_15 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 15)
F_SANS_800_13 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 13)

F_SANS_700_22 = load_font("plus-jakarta-sans-latin-700-normal.ttf", 22)
F_SANS_700_18 = load_font("plus-jakarta-sans-latin-700-normal.ttf", 18)
F_SANS_700_15 = load_font("plus-jakarta-sans-latin-700-normal.ttf", 15)

F_SANS_600_20 = load_font("plus-jakarta-sans-latin-600-normal.ttf", 20)
F_SANS_600_16 = load_font("plus-jakarta-sans-latin-600-normal.ttf", 16)
F_SANS_400_18 = load_font("plus-jakarta-sans-latin-400-normal.ttf", 18)

F_MONO_800_64 = load_font("jetbrains-mono-latin-800-normal.ttf", 64)
F_MONO_700_36 = load_font("jetbrains-mono-latin-700-normal.ttf", 36)
F_MONO_700_22 = load_font("jetbrains-mono-latin-700-normal.ttf", 22)
F_MONO_700_15 = load_font("jetbrains-mono-latin-700-normal.ttf", 15)
F_MONO_400_18 = load_font("jetbrains-mono-latin-400-normal.ttf", 18)


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def ease_out_cubic(t: float) -> float:
    t = clamp01(t)
    return 1.0 - (1.0 - t) ** 3


def ease_in_out(t: float) -> float:
    t = clamp01(t)
    return 3 * t * t - 2 * t * t * t


def spring_val(frame: float, delay: float = 0.0, freq: float = 0.22, damp: float = 0.12) -> float:
    t = frame - delay
    if t <= 0:
        return 0.0
    return 1.0 - math.exp(-damp * t) * math.cos(freq * t)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * clamp01(t)


def lerp_color(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = clamp01(t)
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


def draw_centered_text(draw: ImageDraw.ImageDraw, cx: int, y: int, text: str, font, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text((cx - tw // 2, y), text, font=font, fill=fill)


def draw_top_header(
    draw: ImageDraw.ImageDraw,
    is_dark: bool,
    temp_c: int,
    knob_t: float,
    dyslexia_on: bool,
):
    nav_bg = (11, 18, 34) if is_dark else (255, 255, 255)
    nav_bd = (38, 52, 78) if is_dark else (214, 211, 209)
    fg = (241, 245, 249) if is_dark else (15, 23, 42)

    draw.rounded_rectangle((340, 24, 1580, 88), radius=32, fill=nav_bg, outline=nav_bd, width=2)

    # Crystal-Drop Logo badge
    draw.rounded_rectangle((364, 34, 408, 78), radius=13, fill=(11, 18, 32), outline=(56, 189, 248), width=2)
    draw.polygon([(386, 40), (396, 49), (386, 55), (376, 49)], fill=(125, 211, 252))
    draw.polygon([(376, 49), (386, 55), (396, 49), (397, 63), (386, 71), (375, 63)], fill=(245, 158, 11))
    draw.ellipse((382, 57, 390, 65), fill=(255, 251, 235))

    draw.text((422, 42), "Unthaw", font=F_SANS_800_24, fill=(56, 189, 248) if temp_c < 0 else (52, 211, 153))

    # Live Temperature Pill
    if temp_c < -8:
        t_bg, t_fg, t_bd, t_lbl = ((14, 58, 92), (125, 211, 252), (56, 189, 248), "CRYO FREEZE")
    elif temp_c < 10:
        t_bg, t_fg, t_bd, t_lbl = ((92, 48, 14), (252, 211, 77), (245, 158, 11), "THAWING")
    else:
        t_bg, t_fg, t_bd, t_lbl = ((10, 72, 54), (110, 231, 183), (16, 185, 129), "WARM FLOW")

    if not is_dark and temp_c >= 10:
        t_bg, t_fg = (209, 250, 229), (6, 95, 70)

    draw.rounded_rectangle((530, 40, 726, 72), radius=16, fill=t_bg, outline=t_bd, width=1)
    t_str = f"+{temp_c}°C · {t_lbl}" if temp_c > 0 else f"{temp_c}°C · {t_lbl}"
    draw_centered_text(draw, 628, 47, t_str, F_MONO_700_15, t_fg)

    # Dyslexia & AAA pills
    d_bg = (251, 191, 36) if dyslexia_on else ((20, 30, 50) if is_dark else (245, 245, 244))
    d_fg = (15, 23, 42) if dyslexia_on else fg
    draw.rounded_rectangle((1215, 40, 1345, 74), radius=17, fill=d_bg, outline=nav_bd, width=1)
    draw_centered_text(draw, 1280, 48, f"Dyslexia: {'ON' if dyslexia_on else 'OFF'}", F_SANS_700_15, d_fg)

    draw.rounded_rectangle((1358, 40, 1470, 74), radius=17, fill=(20, 30, 50) if is_dark else (245, 245, 244), outline=nav_bd, width=1)
    draw_centered_text(draw, 1414, 48, "AAA: OFF", F_SANS_700_15, fg)

    # Sliding Moon/Sun Track Switch (image-2)
    track_col = lerp_color((231, 229, 228), (34, 40, 52), knob_t)
    draw.rounded_rectangle((1484, 36, 1564, 76), radius=20, fill=track_col, outline=nav_bd, width=2)
    kx = int(lerp(1504, 1544, knob_t))
    ky = 56
    knob_fill = lerp_color((255, 255, 255), (7, 9, 14), knob_t)
    knob_rim = lerp_color((245, 158, 11), (180, 195, 220), knob_t)
    draw.ellipse((kx - 16, ky - 16, kx + 16, ky + 16), fill=knob_fill, outline=knob_rim, width=2)
    if knob_t >= 0.5:
        draw.arc((kx - 7, ky - 7, kx + 7, ky + 7), start=40, end=290, fill=(255, 255, 255), width=2)
    else:
        draw.ellipse((kx - 5, ky - 5, kx + 5, ky + 5), outline=(245, 158, 11), width=2)


def draw_bottom_dock(draw: ImageDraw.ImageDraw, is_dark: bool, active_tab: str, shield_on: bool = True):
    nav_bg = (11, 19, 34) if is_dark else (255, 255, 255)
    nav_bd = (42, 58, 88) if is_dark else (214, 211, 209)
    muted = (148, 163, 184) if is_dark else (120, 113, 108)

    draw.rounded_rectangle((680, 956, 1240, 1034), radius=39, fill=nav_bg, outline=nav_bd, width=2)

    tabs = [
        ("TUNNEL", 768, active_tab == "focus", (56, 189, 248)),
        ("UNTHAW", 896, active_tab == "compose", (251, 191, 36)),
        ("SHIELD ON" if shield_on else "SHIELD OFF", 1028, shield_on, (52, 211, 153)),
        ("IMPACT", 1154, active_tab == "receipt", (52, 211, 153)),
    ]
    for label, cx, is_act, act_col in tabs:
        col = act_col if is_act else muted
        if "TUNNEL" in label:
            draw.rectangle((cx - 9, 974, cx - 2, 981), outline=col, width=2)
            draw.rectangle((cx + 2, 974, cx + 9, 979), outline=col, width=2)
            draw.rectangle((cx + 2, 982, cx + 9, 992), outline=col, width=2)
            draw.rectangle((cx - 9, 984, cx - 2, 992), outline=col, width=2)
        elif "UNTHAW" in label:
            draw.line((cx, 975, cx, 991), fill=col, width=2)
            draw.line((cx - 8, 983, cx + 8, 983), fill=col, width=2)
        elif "SHIELD" in label:
            draw.rounded_rectangle((cx - 8, 981, cx + 8, 992), radius=2, outline=col, width=2)
            draw.arc((cx - 5, 974, cx + 5, 986), start=180, end=360, fill=col, width=2)
        else:
            draw.polygon([(cx, 973), (cx + 8, 977), (cx + 6, 988), (cx, 993), (cx - 6, 988), (cx - 8, 977)], outline=col, width=2)

        draw_centered_text(draw, cx, 1002, label, F_SANS_800_13, col)


def draw_cursor(draw: ImageDraw.ImageDraw, cx: int, cy: int, clicking: bool = False):
    if clicking:
        draw.ellipse((cx - 28, cy - 28, cx + 28, cy + 28), outline=(251, 191, 36), width=4)
        draw.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=(251, 191, 36))
    pts = [(cx, cy), (cx + 11, cy + 30), (cx + 17, cy + 21), (cx + 29, cy + 17)]
    draw.polygon(pts, fill=(255, 255, 255), outline=(7, 11, 20))


def draw_caption_pill(draw: ImageDraw.ImageDraw, text: str):
    draw.rounded_rectangle((310, 896, 1610, 940), radius=22, fill=(7, 11, 20), outline=(56, 189, 248), width=2)
    draw_centered_text(draw, 960, 907, text, F_SANS_700_18, (248, 250, 252))


def render_frame(f: int) -> Image.Image:
    # Determine theme (Scene 5 transitions from dark to light between f=665..685, back to dark at f=780)
    if 665 <= f < 780:
        light_t = ease_in_out((f - 665) / 18.0)
    elif 780 <= f < 798:
        light_t = 1.0 - ease_in_out((f - 780) / 18.0)
    else:
        light_t = 0.0

    bg_col = lerp_color((7, 11, 20), (246, 243, 236), light_t)
    is_dark = light_t < 0.5
    knob_t = 1.0 - light_t

    img = Image.new("RGB", (W, H), bg_col)
    draw = ImageDraw.Draw(img)

    # SCENE 1 (0..120): KINETIC HOOK + PARALYSIS STAMP SLAM
    if f < 120:
        shake_x = int(math.sin((f - 42) * 2.5) * max(0, 62 - f) * 0.8) if 42 <= f < 62 else 0
        if f < 78:
            s1 = spring_val(f, 0)
            y1 = int(lerp(420, 330, s1))
            draw_centered_text(draw, 960 + shake_x, y1, "15 tasks on your screen.", F_SANS_800_72, (241, 245, 249))
            if f >= 16:
                s2 = spring_val(f, 16)
                y2 = int(lerp(520, 435, s2))
                draw_centered_text(draw, 960 + shake_x, y2, "0 tasks started.", F_SANS_800_72, (251, 113, 133))
            if f >= 42:
                # Slam stamp: TASK PARALYSIS · 98/100 FREEZE
                draw.rounded_rectangle(
                    (520 + shake_x, 565, 1400 + shake_x, 675),
                    radius=22,
                    fill=(45, 12, 24),
                    outline=(244, 63, 94),
                    width=5,
                )
                draw_centered_text(draw, 960 + shake_x, 594, "TASK PARALYSIS · 98/100 FREEZE", F_SANS_800_36, (253, 164, 175))
        else:
            # Reveal Unthaw Hero Mantra
            s3 = spring_val(f, 78)
            y3 = int(lerp(470, 390, s3))
            draw_centered_text(draw, 960, y3, "Every freeze melts", F_SERIF_92, (241, 245, 249))
            draw_centered_text(draw, 960, y3 + 95, "one micro-step at a time.", F_SERIF_I_92, (251, 191, 36))
            draw_centered_text(draw, 960, y3 + 215, "Unthaw — The Executive-Dysfunction & Task-Paralysis Breaker", F_SANS_700_22, (56, 189, 248))
        return img

    # SCENE 2 (120..270): LIVE TYPING INTO UNTHAW COMPOSER + BATTERY + UNTHAW CLICK
    if f < 270:
        sf = f - 120
        raw_prompt = (
            "Write the complete 12-page Senior Capstone Research Paper on Distributed "
            "Fault Tolerance by Friday 5pm. Must include abstract, 15 IEEE citations, "
            "system architecture diagram, and latency benchmarks."
        )
        chars_typed = int(min(len(raw_prompt), max(0, (sf - 8) * 3.2)))
        typed_Now = raw_prompt[:chars_typed]
        freeze_score = int(lerp(28, 98, chars_typed / len(raw_prompt)))

        draw_top_header(draw, True, -18, 1.0, False)
        draw_centered_text(draw, 960, 128, "Every freeze melts one micro-step at a time.", F_SERIF_60, (241, 245, 249))

        # Composer Sanctuary Card
        draw.rounded_rectangle((340, 220, 1580, 875), radius=34, fill=(12, 19, 35), outline=(42, 58, 88), width=2)
        draw.text((400, 260), "DUMP WHAT IS FREEZING YOU", font=F_SANS_800_15, fill=(56, 189, 248))
        draw.text((400, 290), "Paste any overwhelming assignment or backlog", font=F_SERIF_48, fill=(241, 245, 249))

        # Live Rising Freeze Score Badge
        draw.rounded_rectangle((1280, 275, 1520, 325), radius=25, fill=(65, 16, 30), outline=(244, 63, 94), width=2)
        draw_centered_text(draw, 1400, 289, f"Freeze Score: {freeze_score}/100", F_MONO_700_15, (253, 164, 175))

        # Textarea Box with Live Typewriter Text
        draw.rounded_rectangle((400, 360, 1520, 535), radius=24, fill=(18, 28, 48), outline=(251, 191, 36) if sf < 80 else (56, 72, 104), width=2)
        # Wrap typed text into 3 lines of ~72 chars
        lines = [typed_Now[i : i + 72] for i in range(0, len(typed_Now), 72)] or [""]
        for idx_l, ln in enumerate(lines[:3]):
            suffix = "▋" if (idx_l == len(lines[:3]) - 1 and (f // 4) % 2 == 0 and sf < 85) else ""
            draw.text((430, 388 + idx_l * 40), ln + suffix, font=F_MONO_400_18, fill=(241, 245, 249))

        # Cognitive Battery Selector
        draw.text((400, 565), "SELECT YOUR CURRENT COGNITIVE BATTERY", font=F_SANS_800_15, fill=(251, 191, 36))
        bat_cards = [
            ("Low Battery (Frozen)", "90s–2m gentle starter micro-steps", 400, sf >= 82),
            ("Steady Battery", "5-minute momentum steps", 780, False),
            ("Deep Flow", "10-minute focus sprints", 1160, False),
        ]
        for b_title, b_sub, bx, b_sel in bat_cards:
            b_fill = (55, 42, 18) if b_sel else (18, 28, 48)
            b_out = (251, 191, 36) if b_sel else (45, 60, 88)
            draw.rounded_rectangle((bx, 600, bx + 355, 705), radius=20, fill=b_fill, outline=b_out, width=3 if b_sel else 1)
            draw.text((bx + 26, 624), b_title, font=F_SANS_800_18, fill=(253, 230, 138) if b_sel else (241, 245, 249))
            draw.text((bx + 26, 658), b_sub, font=F_SANS_400_18, fill=(148, 163, 184))

        # Primary Unthaw CTA Button
        btn_pressed = 122 <= sf <= 138
        by_off = 4 if btn_pressed else 0
        draw.rounded_rectangle((400, 745 + by_off, 1520, 815 + by_off), radius=35, fill=(52, 211, 153), outline=(167, 243, 208), width=2)
        draw_centered_text(
            draw,
            960,
            768 + by_off,
            "Melting Into 5 Micro-Steps..." if sf >= 128 else "Unthaw & Enter Blindfold Focus Tunnel  ->",
            F_SANS_800_24,
            (6, 18, 30),
        )

        draw_bottom_dock(draw, True, "compose")
        draw_caption_pill(draw, "Step 1: Paste an overwhelming task and select your real-time Cognitive Battery (Low · 2m).")

        # Cursor movement: types -> clicks Low Battery (575, 650) -> clicks Unthaw button (960, 780)
        if sf < 75:
            cx, cy, clk = 860, 450, False
        elif sf < 105:
            t_c = (sf - 75) / 18.0
            cx, cy = int(lerp(860, 575, t_c)), int(lerp(450, 650, t_c))
            clk = 88 <= sf <= 96
        else:
            t_c = (sf - 105) / 18.0
            cx, cy = int(lerp(575, 960, t_c)), int(lerp(650, 780, t_c))
            clk = 122 <= sf <= 132
        draw_cursor(draw, cx, cy, clk)
        return img

    # SCENE 3 (270..450): BLINDFOLD SHIELD LOCKS STEPS 2-5 + LIVE COUNTDOWN RING TICKS
    if f < 450:
        sf = f - 270
        draw_top_header(draw, True, -18, 1.0, False)
        draw_centered_text(draw, 960, 128, "Every freeze melts one micro-step at a time.", F_SERIF_60, (241, 245, 249))

        # Scenario pill bar
        draw.rounded_rectangle((390, 212, 700, 256), radius=22, fill=(55, 42, 18), outline=(251, 191, 36), width=2)
        draw_centered_text(draw, 545, 224, "12-Page Capstone Thesis Freeze", F_SANS_700_15, (253, 230, 138))
        draw.rounded_rectangle((718, 212, 1108, 256), radius=22, fill=(18, 28, 48), outline=(45, 60, 88), width=1)
        draw_centered_text(draw, 913, 224, "Production Auth Bug & Messy Slack Handoff", F_SANS_700_15, (203, 213, 225))
        draw.rounded_rectangle((1126, 212, 1506, 256), radius=22, fill=(18, 28, 48), outline=(45, 60, 88), width=1)
        draw_centered_text(draw, 1316, 224, "Financial Aid & Scholarship Application Wall", F_SANS_700_15, (203, 213, 225))

        # Main Focus Tunnel Sanctuary Card
        draw.rounded_rectangle((340, 286, 1580, 875), radius=34, fill=(12, 19, 35), outline=(42, 58, 88), width=2)

        # Status line & progress bar
        draw.ellipse((400, 330, 412, 342), fill=(52, 211, 153))
        draw.text((424, 325), "STEP 1 OF 5  ·  LOW BATTERY (90s WINDOW)", font=F_MONO_700_15, fill=(52, 211, 153))
        draw.rounded_rectangle((400, 362, 1520, 368), radius=3, fill=(30, 41, 59))
        prog_w = int(lerp(120, 310, sf / 180.0))
        draw.rounded_rectangle((400, 362, 400 + prog_w, 368), radius=3, fill=(56, 189, 248))

        # Verb pill
        draw.rounded_rectangle((400, 392, 630, 426), radius=17, fill=(251, 191, 36))
        draw_centered_text(draw, 515, 399, "OPEN & TYPE 3 WORDS", F_SANS_800_15, (9, 13, 22))
        draw.text((648, 399), "90 seconds activation window", font=F_MONO_700_15, fill=(148, 163, 184))

        # Step 1 Headline
        draw.text((400, 450), 'Open a single blank workspace file for "12-Page', font=F_SERIF_48, fill=(241, 245, 249))
        draw.text((400, 506), 'Senior Capstone Paper" and type only 3 rough', font=F_SERIF_48, fill=(241, 245, 249))
        draw.text((400, 562), "bullet placeholders—no full sentences allowed yet.", font=F_SERIF_48, fill=(241, 245, 249))
        draw.text((400, 632), "Bypasses perfectionism by separating physical file setup from creative thinking.", font=F_SANS_400_18, fill=(148, 163, 184))

        # Live Ticking Countdown Ring (ticks down 1:30 -> 1:12 as arc sweeps)
        secs_left = max(72, 90 - int(sf / 8))
        clock_str = f"1:{secs_left - 60:02d}"
        arc_deg = int(lerp(25, 145, sf / 180.0))
        rcx, rcy, rr = 1415, 535, 68
        draw.ellipse((rcx - rr, rcy - rr, rcx + rr, rcy + rr), outline=(30, 41, 59), width=9)
        draw.arc((rcx - rr, rcy - rr, rcx + rr, rcy + rr), start=-90, end=-90 + arc_deg, fill=(251, 191, 36), width=9)
        draw_centered_text(draw, rcx, rcy - 22, clock_str, F_MONO_700_36, (241, 245, 249))
        draw_centered_text(draw, rcx, rcy + 22, "MELTING...", F_SANS_800_13, (251, 191, 36))

        # Action Buttons
        draw.rounded_rectangle((400, 700, 790, 760), radius=30, fill=(45, 212, 191))
        draw_centered_text(draw, 595, 718, "Done — Melt Next Micro-Step (Enter)", F_SANS_800_18, (6, 18, 30))

        draw.rounded_rectangle((1020, 703, 1335, 757), radius=27, fill=(55, 42, 18), outline=(251, 191, 36), width=2)
        draw_centered_text(draw, 1177, 720, "Still Too Scary? Split in Half (S)", F_SANS_800_15, (253, 230, 138))

        draw.rounded_rectangle((1350, 703, 1520, 757), radius=27, fill=(20, 30, 50), outline=(56, 72, 104), width=2)
        draw_centered_text(draw, 1435, 720, "Read Aloud (R)", F_SANS_700_15, (241, 245, 249))

        # Animated Cryo Blindfold Shield Banner locking away Steps 2-5
        shield_s = spring_val(sf, 15)
        sy = int(lerp(835, 785, shield_s))
        draw.rounded_rectangle((400, sy, 1520, sy + 64), radius=20, fill=(12, 42, 68), outline=(56, 189, 248), width=2)
        draw.text((430, sy + 20), "BLINDFOLD SHIELD LOCKED: Steps 2, 3, 4 & 5 are tucked out of sight so your brain cannot panic.", font=F_SANS_700_18, fill=(125, 211, 252))

        draw_bottom_dock(draw, True, "focus")
        draw_caption_pill(draw, "Step 2: Blindfold Shield hides the rest of the list and starts a calm 90-second timer for Step 1.")

        # Cursor glides toward "Still Too Scary? Split in Half (S)" at (1177, 730)
        p_cur = clamp01((sf - 110) / 55.0)
        cx, cy = int(lerp(960, 1177, p_cur)), int(lerp(540, 730, p_cur))
        draw_cursor(draw, cx, cy, sf >= 165)
        return img

    # SCENE 4 (450..630): "STILL TOO SCARY? SPLIT IN HALF" -> 60s WARM-UP -> MELTED STAMP!
    if f < 630:
        sf = f - 450
        completed_step1 = sf >= 105
        temp_now = int(lerp(-10, 12, (sf - 105) / 45.0)) if completed_step1 else -10

        draw_top_header(draw, True, temp_now, 1.0, False)
        draw_centered_text(draw, 960, 128, "Every freeze melts one micro-step at a time.", F_SERIF_60, (241, 245, 249))

        draw.rounded_rectangle((340, 240, 1580, 875), radius=34, fill=(12, 19, 35), outline=(251, 191, 36) if sf < 105 else (52, 211, 153), width=2)

        draw.ellipse((400, 286, 412, 298), fill=(251, 191, 36))
        draw.text((424, 281), "STEP 1 OF 6  ·  LOW BATTERY  ·  SPLIT 1x SMALLER (60s WARM-UP)", font=F_MONO_700_15, fill=(251, 191, 36))

        # Show the two split halves sliding into place!
        s_split = spring_val(sf, 0)
        card1_x = int(lerp(520, 400, s_split))
        card2_x = int(lerp(820, 975, s_split))

        # Left Half Card (Active 60s Setup)
        draw.rounded_rectangle((card1_x, 335, card1_x + 545, 650), radius=26, fill=(24, 34, 56), outline=(251, 191, 36), width=3)
        draw.rounded_rectangle((card1_x + 28, 365, card1_x + 295, 399), radius=17, fill=(251, 191, 36))
        draw_centered_text(draw, card1_x + 161, 372, "PART 1 OF 2 · 60s SETUP", F_SANS_800_15, (9, 13, 22))
        draw.text((card1_x + 28, 422), "Do ONLY the physical setup:", font=F_SERIF_44, fill=(241, 245, 249))
        draw.text((card1_x + 28, 474), "Open the blank window and", font=F_SERIF_44, fill=(241, 245, 249))
        draw.text((card1_x + 28, 526), "put your cursor on line 1.", font=F_SERIF_44, fill=(241, 245, 249))
        secs_60 = max(41, 60 - int(sf / 5))
        draw.text((card1_x + 28, 595), f"Live 60s Timer: 0:{secs_60:02d} remaining", font=F_MONO_700_22, fill=(52, 211, 153))

        # Right Half Card (Queued Part 2)
        draw.rounded_rectangle((card2_x, 335, card2_x + 545, 650), radius=26, fill=(15, 23, 40), outline=(45, 60, 88), width=2)
        draw.text((card2_x + 28, 372), "PART 2 OF 2 · QUEUED NEXT (60s)", font=F_MONO_700_15, fill=(148, 163, 184))
        draw.text((card2_x + 28, 422), "With the file already open", font=F_SERIF_44, fill=(148, 163, 184))
        draw.text((card2_x + 28, 474), "in front of you, type 3 rough", font=F_SERIF_44, fill=(148, 163, 184))
        draw.text((card2_x + 28, 526), "bullet words.", font=F_SERIF_44, fill=(148, 163, 184))

        # Action Row
        draw.rounded_rectangle((400, 700, 820, 764), radius=32, fill=(52, 211, 153))
        draw_centered_text(draw, 610, 720, "Done — Melt Next Micro-Step (Enter)", F_SANS_800_18, (6, 18, 30))

        # If sf >= 105, slam the green "STEP 1 MELTED ✓ · +12°C" stamp!
        if completed_step1:
            draw.rounded_rectangle((620, 445, 1300, 565), radius=24, fill=(6, 48, 36), outline=(52, 211, 153), width=5)
            draw_centered_text(draw, 960, 472, "STEP 1 MELTED  ·  WARMING TO +12°C", F_SANS_800_36, (110, 231, 183))
            draw_centered_text(draw, 960, 522, "Advancing to Step 2 of 6...", F_MONO_700_15, (209, 250, 229))

        draw_bottom_dock(draw, True, "focus")
        draw_caption_pill(draw, 'Step 3: Clicking "Split in Half" fractures any scary step into two 60-second micro-moves.')

        p_cur = clamp01((sf - 45) / 45.0)
        cx, cy = int(lerp(1177, 610, p_cur)), int(lerp(730, 732, p_cur))
        draw_cursor(draw, cx, cy, 92 <= sf <= 106)
        return img

    # SCENE 5 (630..780): SLIDING MOON/SUN SWITCH -> LIGHT MODE + DYSLEXIA SPACING ON
    if f < 780:
        sf = f - 630
        dys_on = sf >= 85
        fg = (241, 245, 249) if is_dark else (15, 23, 42)
        muted = (148, 163, 184) if is_dark else (87, 83, 78)
        card_bg = (12, 19, 35) if is_dark else (255, 255, 255)
        card_bd = (42, 58, 88) if is_dark else (214, 211, 209)

        draw_top_header(draw, is_dark, 16, knob_t, dys_on)
        draw_centered_text(draw, 960, 128, "Every freeze melts one micro-step at a time.", F_SERIF_60, fg)

        draw.rounded_rectangle((340, 240, 1580, 875), radius=34, fill=card_bg, outline=card_bd, width=2)
        draw.ellipse((400, 286, 412, 298), fill=(16, 185, 129))
        draw.text((424, 281), "STEP 4 OF 6  ·  WARM FLOW (+16°C)  ·  ACCESSIBILITY FIRST", font=F_MONO_700_15, fill=(16, 185, 129))

        draw.rounded_rectangle((400, 322, 1520, 328), radius=3, fill=(226, 232, 240) if not is_dark else (30, 41, 59))
        draw.rounded_rectangle((400, 322, 1180, 328), radius=3, fill=(16, 185, 129))

        draw.rounded_rectangle((400, 360, 610, 394), radius=17, fill=(251, 191, 36))
        draw_centered_text(draw, 505, 367, "SKETCH 4 BOXES", F_SANS_800_15, (9, 13, 22))

        hl_1 = "Draw or list  4  main boxes for" if dys_on else "Draw or list 4 main boxes for"
        hl_2 = '"system architecture diagram" as'
        hl_3 = "plain text arrows (A -> B -> C)."
        y_gap = 64 if dys_on else 54
        draw.text((400, 430), hl_1, font=F_SERIF_48, fill=fg)
        draw.text((400, 430 + y_gap), hl_2, font=F_SERIF_48, fill=fg)
        draw.text((400, 430 + y_gap * 2), hl_3, font=F_SERIF_48, fill=fg)

        draw.text((400, 645), "Plain-text wireframing removes visual-formatting friction during initiation.", font=F_SANS_600_20 if dys_on else F_SANS_400_18, fill=muted)

        # Countdown ring on right
        rcx, rcy, rr = 1415, 520, 68
        draw.ellipse((rcx - rr, rcy - rr, rcx + rr, rcy + rr), outline=(214, 211, 209) if not is_dark else (30, 41, 59), width=9)
        draw.arc((rcx - rr, rcy - rr, rcx + rr, rcy + rr), start=-90, end=165, fill=(16, 185, 129), width=9)
        draw_centered_text(draw, rcx, rcy - 22, f"1:{max(22, 48 - int(sf/5)):02d}", F_MONO_700_36, fg)
        draw_centered_text(draw, rcx, rcy + 22, "FLOWING", F_SANS_800_13, (16, 185, 129))

        draw.rounded_rectangle((400, 720, 820, 784), radius=32, fill=(16, 185, 129))
        draw_centered_text(draw, 610, 740, "Done — Melt Next Micro-Step (Enter)", F_SANS_800_18, (255, 255, 255) if not is_dark else (6, 18, 30))

        draw_bottom_dock(draw, is_dark, "focus")
        draw_caption_pill(draw, "Step 4: One-click sliding Dark/Light theme switch, Dyslexia spacing, AAA contrast, and Read-Aloud.")

        # Cursor clicks Moon/Sun switch (1524, 56) at sf=35, then clicks Dyslexia (1280, 56) at sf=85
        if sf < 50:
            p_c = clamp01(sf / 28.0)
            cx, cy = int(lerp(610, 1524, p_c)), int(lerp(740, 56, p_c))
            clk = 30 <= sf <= 42
        elif sf < 105:
            p_c = clamp01((sf - 50) / 28.0)
            cx, cy = int(lerp(1524, 1280, p_c)), 56
            clk = 80 <= sf <= 92
        else:
            p_c = clamp01((sf - 105) / 35.0)
            cx, cy = int(lerp(1280, 1154, p_c)), int(lerp(56, 995, p_c))
            clk = sf >= 138
        draw_cursor(draw, cx, cy, clk)
        return img

    # SCENE 6 (780..915): BEFORE VS AFTER IMPACT RECEIPT (Animated Counter -82% Friction)
    if f < 915:
        sf = f - 780
        count_p = ease_out_cubic(sf / 45.0)
        after_score = int(lerp(98, 18, count_p))
        drop_pct = int(lerp(0, 82, count_p))

        draw_top_header(draw, True, 24, 1.0, False)
        draw_centered_text(draw, 960, 128, "Measurable Before-vs-After Transformation", F_SERIF_60, (241, 245, 249))

        draw.rounded_rectangle((300, 220, 1620, 875), radius=34, fill=(12, 19, 35), outline=(52, 211, 153), width=2)

        # Big animated counters at top of Receipt
        draw.rounded_rectangle((360, 260, 740, 360), radius=22, fill=(55, 14, 28), outline=(244, 63, 94), width=2)
        draw_centered_text(draw, 550, 274, "BEFORE: 98/100", F_MONO_700_36, (253, 164, 175))
        draw_centered_text(draw, 550, 324, "RAW TASK PARALYSIS (-18°C)", F_SANS_800_13, (251, 113, 133))

        draw.rounded_rectangle((770, 260, 1150, 360), radius=22, fill=(10, 62, 46), outline=(52, 211, 153), width=2)
        draw_centered_text(draw, 960, 274, f"AFTER: {after_score}/100", F_MONO_700_36, (110, 231, 183))
        draw_centered_text(draw, 960, 324, "SINGLE 90s IGNITION (+24°C)", F_SANS_800_13, (52, 211, 153))

        draw.rounded_rectangle((1180, 260, 1560, 360), radius=22, fill=(55, 42, 16), outline=(251, 191, 36), width=2)
        draw_centered_text(draw, 1370, 274, f"-{drop_pct}% FRICTION", F_MONO_700_36, (253, 230, 138))
        draw_centered_text(draw, 1370, 324, "COGNITIVE OVERLOAD REMOVED", F_SANS_800_13, (251, 191, 36))

        # Left & Right comparison cards
        draw.rounded_rectangle((360, 395, 940, 835), radius=26, fill=(28, 14, 24), outline=(244, 63, 94), width=2)
        draw.text((395, 428), "BEFORE · STANDARD TO-DO WALL", font=F_SANS_800_15, fill=(251, 113, 133))
        draw.text((395, 475), "Write complete 12-page Senior Capstone", font=F_MONO_400_18, fill=(241, 245, 249))
        draw.text((395, 510), "Paper on Distributed Fault Tolerance by", font=F_MONO_400_18, fill=(241, 245, 249))
        draw.text((395, 545), "Friday 5pm + 15 IEEE citations + system", font=F_MONO_400_18, fill=(241, 245, 249))
        draw.text((395, 580), "architecture diagram + benchmark tables.", font=F_MONO_400_18, fill=(241, 245, 249))
        draw.text((395, 665), "Result: Brain sees a multi-day mountain with", font=F_SANS_600_16, fill=(253, 164, 175))
        draw.text((395, 695), "no physical starting point -> Freeze.", font=F_SANS_600_16, fill=(253, 164, 175))

        draw.rounded_rectangle((980, 395, 1560, 835), radius=26, fill=(10, 42, 34), outline=(52, 211, 153), width=2)
        draw.text((1015, 428), "AFTER · UNTHAW BLINDFOLD STEP #1", font=F_SANS_800_15, fill=(52, 211, 153))
        draw.text((1015, 475), 'Open one blank workspace file for "12-Page', font=F_SANS_700_18, fill=(241, 245, 249))
        draw.text((1015, 510), 'Senior Capstone Paper" and type only 3', font=F_SANS_700_18, fill=(241, 245, 249))
        draw.text((1015, 545), "rough bullet placeholders (90 seconds).", font=F_SANS_700_18, fill=(241, 245, 249))
        draw.text((1015, 665), "Result: All other steps hidden behind Shield;", font=F_SANS_600_16, fill=(110, 231, 183))
        draw.text((1015, 695), "any step splits in half into a 60s setup move.", font=F_SANS_600_16, fill=(110, 231, 183))

        draw_bottom_dock(draw, True, "receipt")
        draw_caption_pill(draw, "Step 5: Impact Receipt proves an 82% drop in cognitive intimidation (98/100 -> 18/100).")
        return img

    # SCENE 7 (915..1020): BRAND OUTRO (Teaser.tsx style)
    sf = f - 915
    s_out = spring_val(sf, 0)
    y_base = int(lerp(360, 280, s_out))

    # Big Crystal-Drop Brand Emblem
    draw.rounded_rectangle((910, y_base - 110, 1010, y_base - 10), radius=26, fill=(11, 18, 32), outline=(56, 189, 248), width=3)
    draw.polygon([(960, y_base - 95), (985, y_base - 72), (960, y_base - 56), (935, y_base - 72)], fill=(125, 211, 252))
    draw.polygon([(935, y_base - 72), (960, y_base - 56), (985, y_base - 72), (988, y_base - 38), (960, y_base - 22), (932, y_base - 38)], fill=(245, 158, 11))
    draw.ellipse((950, y_base - 50, 970, y_base - 30), fill=(255, 251, 235))

    draw_centered_text(draw, 960, y_base + 15, "Unthaw", F_SANS_800_72, (241, 245, 249))
    draw_centered_text(draw, 960, y_base + 110, "Every freeze melts one micro-step at a time.", F_SERIF_I_60, (251, 191, 36))

    draw.rounded_rectangle((680, y_base + 215, 1240, y_base + 280), radius=32, fill=(45, 212, 191))
    draw_centered_text(draw, 960, y_base + 233, "unthaw-ten.vercel.app", F_MONO_700_22, (6, 18, 30))

    draw_centered_text(draw, 960, y_base + 320, "github.com/unborn7g/unthaw  ·  CREATED BY ONE · @Unborn7g", F_SANS_700_18, (148, 163, 184))
    return img


def generate_kinetic_soundtrack(wav_path: str, duration_s: float = 34.0, sr: int = 44100):
    """Generates an energetic, tactile soundtrack with typing clicks, stamp thuds, chimes, and warm synth pulse."""
    n = int(duration_s * sr)
    # Key event timestamps (seconds)
    slam_times = [1.4, 19.0]  # Freeze stamp slam & Step 1 Melted stamp slam
    click_times = [6.9, 7.9, 14.5, 18.2, 22.1, 23.8, 25.8]  # UI button clicks
    chime_times = [2.6, 9.0, 15.0, 21.0, 26.0, 30.5]  # Scene transitions

    with wave.open(wav_path, "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        buf = bytearray()

        for i in range(n):
            t = i / sr
            # 1. Warm pulsing synth bass + Cmaj9 harmonic pad
            beat = 0.75 + 0.25 * math.sin(2 * math.pi * 2.0 * t)
            pad = (
                0.24 * math.sin(2 * math.pi * 130.81 * t)
                + 0.18 * math.sin(2 * math.pi * 196.00 * t)
                + 0.14 * math.sin(2 * math.pi * 246.94 * t)
                + 0.12 * math.sin(2 * math.pi * 293.66 * t)
            ) * beat * 0.16

            val = pad

            # 2. Typewriter mechanical clicks during Scene 2 (4.3s .. 6.5s)
            if 4.3 <= t <= 6.5:
                phase = (t * 14.0) % 1.0
                if phase < 0.08:
                    val += 0.12 * math.exp(-phase * 45.0) * math.sin(2 * math.pi * 1400.0 * t)

            # 3. Deep sub-bass impact thud on stamp slams
            for st in slam_times:
                dt = t - st
                if 0 <= dt < 0.45:
                    freq = 110.0 * math.exp(-dt * 6.0) + 42.0
                    val += 0.42 * math.exp(-dt * 7.5) * math.sin(2 * math.pi * freq * dt)

            # 4. Crisp tactile UI click pops
            for ct in click_times:
                dt = t - ct
                if 0 <= dt < 0.06:
                    val += 0.25 * math.exp(-dt * 65.0) * math.sin(2 * math.pi * 920.0 * dt)

            # 5. Bright harmonic shimmer chimes on scene transitions
            for cht in chime_times:
                dt = t - cht
                if 0 <= dt < 1.6:
                    val += 0.16 * math.exp(-dt * 3.0) * math.sin(2 * math.pi * 523.25 * t)
                    val += 0.12 * math.exp(-dt * 3.6) * math.sin(2 * math.pi * 659.25 * t)
                    val += 0.10 * math.exp(-dt * 4.2) * math.sin(2 * math.pi * 783.99 * t)

            fade = min(1.0, t / 0.6, (duration_s - t) / 1.2)
            sample = max(-32767, min(32767, int(val * fade * 32767)))
            buf += struct.pack("<hh", sample, sample)

        wf.writeframes(buf)


def main():
    t0 = time.time()
    mp4_out = os.path.join(OUT_DIR, "unthaw-demo.mp4")

    with tempfile.TemporaryDirectory() as tmpdir:
        wav_path = os.path.join(tmpdir, "soundtrack.wav")
        print("1. Synthesizing kinetic soundtrack (clicks, slams, chimes, pulse)...")
        generate_kinetic_soundtrack(wav_path, duration_s=TOTAL_FRAMES / FPS)

        print(f"2. Streaming {TOTAL_FRAMES} 1080p frames @ {FPS}fps directly into FFmpeg...")
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        cmd = [
            ffmpeg_exe,
            "-y",
            "-f",
            "rawvideo",
            "-vcodec",
            "rawvideo",
            "-s",
            f"{W}x{H}",
            "-pix_fmt",
            "rgb24",
            "-r",
            str(FPS),
            "-i",
            "-",
            "-i",
            wav_path,
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "19",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-shortest",
            mp4_out,
        ]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
        for f in range(TOTAL_FRAMES):
            frame_img = render_frame(f)
            proc.stdin.write(frame_img.tobytes())
        proc.stdin.close()
        proc.wait()

    print(
        f"Done in {time.time() - t0:.1f}s -> {mp4_out} ({os.path.getsize(mp4_out) / 1024:.0f} KB)"
    )


if __name__ == "__main__":
    main()
