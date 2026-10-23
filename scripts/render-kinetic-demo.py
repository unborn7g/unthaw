#!/usr/bin/env python3
"""
Unthaw Narrated 1080p Pitch & Interactive Walkthrough Video Renderer.
- Uses the 6 studio neural voiceover clips in scripts/vo/ (selected via add_voice).
- Renders clean, borderless Apple/CapCut-style floating word-by-word active-highlight captions
  (NO ugly boxed caption rectangles).
- Syncs relatable layman pitch visuals frame-by-frame to the spoken narration.
"""

import math
import os
import subprocess
import tempfile
import time
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, "scripts", "fonts")
VO_DIR = os.path.join(ROOT, "scripts", "vo")
OUT_DIR = os.path.join(ROOT, "public", "demo")
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 1920, 1080
FPS = 24  # 24fps cinema cadence for fast rendering (~96s = 2,304 frames)


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)


F_SERIF_88 = load_font("instrument-serif-latin-400-normal.ttf", 88)
F_SERIF_64 = load_font("instrument-serif-latin-400-normal.ttf", 64)
F_SERIF_56 = load_font("instrument-serif-latin-400-normal.ttf", 56)
F_SERIF_46 = load_font("instrument-serif-latin-400-normal.ttf", 46)
F_SERIF_42 = load_font("instrument-serif-latin-400-normal.ttf", 42)
F_SERIF_I_64 = load_font("instrument-serif-latin-400-italic.ttf", 64)
F_SERIF_I_88 = load_font("instrument-serif-latin-400-italic.ttf", 88)

F_SANS_800_64 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 64)
F_SANS_800_44 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 44)
F_SANS_800_34 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 34)
F_SANS_800_26 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 26)
F_SANS_800_22 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 22)
F_SANS_800_18 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 18)
F_SANS_800_15 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 15)
F_SANS_800_13 = load_font("plus-jakarta-sans-latin-800-normal.ttf", 13)

F_SANS_700_22 = load_font("plus-jakarta-sans-latin-700-normal.ttf", 22)
F_SANS_700_18 = load_font("plus-jakarta-sans-latin-700-normal.ttf", 18)
F_SANS_700_15 = load_font("plus-jakarta-sans-latin-700-normal.ttf", 15)

F_SANS_600_20 = load_font("plus-jakarta-sans-latin-600-normal.ttf", 20)
F_SANS_600_16 = load_font("plus-jakarta-sans-latin-600-normal.ttf", 16)
F_SANS_400_18 = load_font("plus-jakarta-sans-latin-400-normal.ttf", 18)

F_MONO_700_36 = load_font("jetbrains-mono-latin-700-normal.ttf", 36)
F_MONO_700_22 = load_font("jetbrains-mono-latin-700-normal.ttf", 22)
F_MONO_700_15 = load_font("jetbrains-mono-latin-700-normal.ttf", 15)
F_MONO_400_18 = load_font("jetbrains-mono-latin-400-normal.ttf", 18)

# Exact scene timeline matching the 6 voiceover clips + 0.35s breath pauses:
# s1: 0.00 .. 17.79s  (pause -> 18.14s)
# s2: 18.14 .. 31.83s (pause -> 32.18s)
# s3: 32.18 .. 49.47s (pause -> 49.82s)
# s4: 49.82 .. 68.47s (pause -> 68.82s)
# s5: 68.82 .. 80.94s (pause -> 81.29s)
# s6: 81.29 .. 95.58s (tail  -> 96.00s)
SCENES = [
    (
        0.00,
        17.79,
        "s1_hook.mp3",
        "Have you ever stared at a huge, scary task, like a twelve-page paper or a broken project, and even though you want to start, your brain just freezes and you end up scrolling your phone? Normal to-do apps make that freeze worse, because they dump all fifteen unfinished tasks in your face at once.",
    ),
    (
        18.14,
        31.83,
        "s2_compose.mp3",
        "Meet Unthaw. Instead of another stressful list, you just paste the messy assignment that is stressing you out, and pick how much brain battery you actually have right now, like Low Battery when you are tired and frozen.",
    ),
    (
        32.18,
        49.47,
        "s3_tunnel.mp3",
        "The moment you click Unthaw, a Blindfold Shield locks the rest of the list out of sight. You only see Step One, rewritten into a tiny ninety-second physical move your hands can do without overthinking: just open one blank file and type three rough words.",
    ),
    (
        49.82,
        68.47,
        "s4_split.mp3",
        "And if even that step feels too heavy? One tap on Split in Half cuts it into a sixty-second warm-up, just opening the window and putting your cursor on line one. When you click Done, the workspace temperature warms up and reveals only the next single step.",
    ),
    (
        68.82,
        80.94,
        "s5_access.mp3",
        "Everything is built for overwhelmed minds, with a tactile dark and light mode switch, one-click dyslexia spacing, high contrast, and a read-aloud voice button when your eyes are tired.",
    ),
    (
        81.29,
        95.58,
        "s6_impact.mp3",
        "What used to be a ninety-eight out of one hundred panic wall becomes an eighteen out of one hundred ninety-second start, cutting task friction by eighty-two percent. Unthaw: every freeze melts one micro-step at a time.",
    ),
]
TOTAL_SECS = 96.0
TOTAL_FRAMES = int(TOTAL_SECS * FPS)


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def ease_out_cubic(t: float) -> float:
    t = clamp01(t)
    return 1.0 - (1.0 - t) ** 3


def ease_in_out(t: float) -> float:
    t = clamp01(t)
    return 3 * t * t - 2 * t * t * t


def spring_val(sec: float, delay: float = 0.0) -> float:
    dt = sec - delay
    if dt <= 0:
        return 0.0
    return 1.0 - math.exp(-4.2 * dt) * math.cos(7.5 * dt)


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


def draw_floating_kinetic_captions(draw: ImageDraw.ImageDraw, t: float, is_dark: bool):
    """
    Draws sleek, borderless, word-by-word active-highlight captions (6 words per phrase).
    Zero ugly boxes! Spoken words are crisp white/ink, the currently spoken word glows
    in warm Molten Amber (#FBBF24) with an underline accent, and upcoming words are soft slate.
    """
    active_scene = None
    for s_start, s_end, _, text in SCENES:
        if s_start <= t <= s_end + 0.25:
            active_scene = (s_start, s_end, text)
            break
    if not active_scene:
        return

    s_start, s_end, text = active_scene
    words = text.split()
    if not words:
        return

    # Weight word timing by character length so longer words get proportional time
    weights = [max(2, len(w.strip(".,?!:"))) for w in words]
    total_w = sum(weights)
    prog = clamp01((t - s_start) / max(0.1, (s_end - s_start))) * total_w

    cum = 0.0
    active_idx = len(words) - 1
    for idx, w_len in enumerate(weights):
        if prog <= cum + w_len:
            active_idx = idx
            break
        cum += w_len

    # Group into clean 6-word chunks
    chunk_size = 6
    chunk_start = (active_idx // chunk_size) * chunk_size
    chunk_words = words[chunk_start : chunk_start + chunk_size]
    local_active = active_idx - chunk_start

    # Measure total width of the chunk to center it at x = 960, y = 895
    space_w = 13
    word_widths = []
    for w in chunk_words:
        bb = draw.textbbox((0, 0), w, font=F_SANS_800_26)
        word_widths.append(bb[2] - bb[0])

    total_line_w = sum(word_widths) + space_w * max(0, len(chunk_words) - 1)
    x = 960 - total_line_w // 2
    y = 892

    spoken_col = (248, 250, 252) if is_dark else (15, 23, 42)
    active_col = (251, 191, 36) if is_dark else (217, 119, 6)
    upcoming_col = (100, 116, 139) if is_dark else (168, 162, 158)
    shadow_col = (4, 7, 14) if is_dark else (231, 229, 228)

    for i, (w, ww) in enumerate(zip(chunk_words, word_widths)):
        is_curr = i == local_active
        col = active_col if is_curr else (spoken_col if i < local_active else upcoming_col)
        wy = y - 3 if is_curr else y

        # Soft text drop shadow for legibility without any box
        if is_dark:
            draw.text((x + 2, wy + 2), w, font=F_SANS_800_26, fill=shadow_col)
        draw.text((x, wy), w, font=F_SANS_800_26, fill=col)

        if is_curr:
            draw.rounded_rectangle((x, wy + 34, x + ww, wy + 38), radius=2, fill=active_col)

        x += ww + space_w


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

    draw.rounded_rectangle((364, 34, 408, 78), radius=13, fill=(11, 18, 32), outline=(56, 189, 248), width=2)
    draw.polygon([(386, 40), (396, 49), (386, 55), (376, 49)], fill=(125, 211, 252))
    draw.polygon([(376, 49), (386, 55), (396, 49), (397, 63), (386, 71), (375, 63)], fill=(245, 158, 11))
    draw.ellipse((382, 57, 390, 65), fill=(255, 251, 235))

    draw.text((422, 42), "Unthaw", font=F_SANS_800_22, fill=(56, 189, 248) if temp_c < 0 else (52, 211, 153))

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

    d_bg = (251, 191, 36) if dyslexia_on else ((20, 30, 50) if is_dark else (245, 245, 244))
    d_fg = (15, 23, 42) if dyslexia_on else fg
    draw.rounded_rectangle((1215, 40, 1345, 74), radius=17, fill=d_bg, outline=nav_bd, width=1)
    draw_centered_text(draw, 1280, 48, f"Dyslexia: {'ON' if dyslexia_on else 'OFF'}", F_SANS_700_15, d_fg)

    draw.rounded_rectangle((1358, 40, 1470, 74), radius=17, fill=(20, 30, 50) if is_dark else (245, 245, 244), outline=nav_bd, width=1)
    draw_centered_text(draw, 1414, 48, "AAA: OFF", F_SANS_700_15, fg)

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


def render_frame(f: int) -> Image.Image:
    t = f / FPS

    # Light mode active during Scene 5 (t = 70.8 .. 80.9)
    if 70.8 <= t < 80.8:
        light_t = ease_in_out((t - 70.8) / 0.8)
    elif 80.8 <= t < 81.6:
        light_t = 1.0 - ease_in_out((t - 80.8) / 0.8)
    else:
        light_t = 0.0

    bg_col = lerp_color((7, 11, 20), (246, 243, 236), light_t)
    is_dark = light_t < 0.5
    knob_t = 1.0 - light_t

    img = Image.new("RGB", (W, H), bg_col)
    draw = ImageDraw.Draw(img)

    # =========================================================================
    # SCENE 1 (0.00 .. 18.14s): RELATABLE HUMAN HOOK
    # =========================================================================
    if t < 18.14:
        if t < 5.6:
            # Beat 1A: Staring at a scary blank 12-page assignment at 2:14 AM
            s = spring_val(t, 0.0)
            y_card = int(lerp(240, 160, s))
            draw_centered_text(draw, 960, 72, "THE REAL-LIFE PROBLEM", F_SANS_800_15, (56, 189, 248))
            draw.rounded_rectangle((360, y_card, 1560, y_card + 640), radius=30, fill=(13, 20, 36), outline=(42, 58, 88), width=2)
            # Window titlebar
            draw.ellipse((400, y_card + 30, 416, y_card + 46), fill=(244, 63, 94))
            draw.ellipse((428, y_card + 30, 444, y_card + 46), fill=(251, 191, 36))
            draw.ellipse((456, y_card + 30, 472, y_card + 46), fill=(52, 211, 153))
            draw.text((500, y_card + 26), "Senior_Capstone_Thesis_Final.docx  —  0 words written", font=F_MONO_700_15, fill=(148, 163, 184))
            draw.rounded_rectangle((1290, y_card + 22, 1520, y_card + 56), radius=17, fill=(68, 16, 30), outline=(244, 63, 94), width=1)
            draw_centered_text(draw, 1405, y_card + 30, "DUE FRIDAY 5:00 PM", F_MONO_700_15, (253, 164, 175))

            draw.line((360, y_card + 74, 1560, y_card + 74), fill=(30, 41, 59), width=2)
            draw.text((430, y_card + 125), "Requirement: Write 12-page paper on Distributed Fault Tolerance", font=F_SANS_700_22, fill=(241, 245, 249))
            draw.text((430, y_card + 168), "+ Literature review citing 15 IEEE papers + Architecture diagram + Benchmarks", font=F_SANS_400_18, fill=(148, 163, 184))

            # Blank page area with lonely blinking cursor
            draw.rounded_rectangle((430, y_card + 235, 1490, y_card + 575), radius=20, fill=(8, 12, 22), outline=(30, 41, 59), width=2)
            cur_vis = (int(t * 2.5) % 2) == 0
            draw.text((475, y_card + 280), "|" if cur_vis else "", font=F_SANS_800_44, fill=(251, 191, 36))
            draw_centered_text(draw, 960, y_card + 410, "Staring at the screen for 3 hours... unable to type word one.", F_SERIF_I_64, (148, 163, 184))

        elif t < 10.8:
            # Beat 1B: "Your brain just freezes and you end up scrolling your phone"
            st = t - 5.6
            s = spring_val(st, 0.0)
            y_top = int(lerp(320, 230, s))
            draw_centered_text(draw, 960, y_top, "You want to start.", F_SERIF_88, (241, 245, 249))
            draw_centered_text(draw, 960, y_top + 100, "But your brain locks up in Task Freeze.", F_SERIF_I_88, (56, 189, 248))

            # Two relatable cards: Brain Freeze vs Phone Doomscroll
            draw.rounded_rectangle((410, 480, 930, 740), radius=28, fill=(14, 34, 58), outline=(56, 189, 248), width=2)
            draw_centered_text(draw, 670, 525, "-18°C EXECUTIVE FREEZE", F_MONO_700_22, (125, 211, 252))
            draw_centered_text(draw, 670, 585, "The task looks like a giant mountain", F_SANS_700_18, (241, 245, 249))
            draw_centered_text(draw, 670, 620, "with no physical starting point.", F_SANS_400_18, (148, 163, 184))

            draw.rounded_rectangle((990, 480, 1510, 740), radius=28, fill=(48, 18, 32), outline=(244, 63, 94), width=2)
            draw_centered_text(draw, 1250, 525, "AVOIDANCE SPIRAL", F_MONO_700_22, (253, 164, 175))
            draw_centered_text(draw, 1250, 585, "So your brain escapes to scrolling", F_SANS_700_18, (241, 245, 249))
            draw_centered_text(draw, 1250, 620, "your phone while guilt piles up.", F_SANS_400_18, (148, 163, 184))

        else:
            # Beat 1C: "Normal to-do apps make that freeze worse by dumping 15 tasks in your face at once"
            st = t - 10.8
            shake_x = int(math.sin((st - 4.2) * 28.0) * max(0.0, 5.2 - st) * 14.0) if 4.2 <= st <= 5.2 else 0
            draw_centered_text(draw, 960 + shake_x, 95, "Normal to-do apps make the freeze WORSE:", F_SANS_800_44, (241, 245, 249))

            tasks_15 = [
                "[ ] 1. Write Capstone Abstract",
                "[ ] 2. Read 15 IEEE Papers",
                "[ ] 3. Fix OAuth 401 Bug",
                "[ ] 4. Draw System Diagram",
                "[ ] 5. Run Latency Benchmarks",
                "[ ] 6. Format Bibliography",
                "[ ] 7. Gather Tax Transcripts",
                "[ ] 8. Write 500w Essay",
                "[ ] 9. Email Prof. Adeyemi",
                "[ ] 10. Itemize Budget Sheet",
                "[ ] 11. Upload Signed PDFs",
                "[ ] 12. Study OS Chapters 4-7",
                "[ ] 13. Finish 10 Algebra Proofs",
                "[ ] 14. Build 6 Lab Slides",
                "[ ] 15. Review Partner PR",
            ]
            visible_n = min(15, int(st * 4.5) + 1)
            for idx_t in range(visible_n):
                col_i = idx_t % 3
                row_i = idx_t // 3
                bx = 330 + col_i * 430 + shake_x
                by = 185 + row_i * 112
                draw.rounded_rectangle((bx, by, bx + 400, by + 92), radius=18, fill=(38, 14, 24), outline=(244, 63, 94), width=2)
                draw.text((bx + 22, by + 20), tasks_15[idx_t], font=F_MONO_700_15, fill=(241, 245, 249))
                draw.text((bx + 22, by + 52), "OVERDUE · HIGH COGNITIVE LOAD", font=F_SANS_800_13, fill=(251, 113, 133))

            if st >= 4.2:
                draw.rounded_rectangle((490 + shake_x, 390, 1430 + shake_x, 540), radius=26, fill=(58, 10, 24), outline=(251, 113, 133), width=6)
                draw_centered_text(draw, 960 + shake_x, 422, "15 TASKS VISIBLE  =  98/100 BRAIN FREEZE", F_SANS_800_34, (255, 228, 230))
                draw_centered_text(draw, 960 + shake_x, 480, "Your brain sees a wall and shuts down.", F_SANS_700_18, (253, 164, 175))

        draw_floating_kinetic_captions(draw, t, True)
        return img

    # =========================================================================
    # SCENE 2 (18.14 .. 32.18s): MEET UNTHAW — DUMP TASK & PICK BRAIN BATTERY
    # =========================================================================
    if t < 32.18:
        st = t - 18.14
        raw_prompt = (
            "Write the complete 12-page Senior Capstone Research Paper on Distributed "
            "Fault Tolerance by Friday 5pm. Must include abstract, 15 IEEE citations, "
            "system architecture diagram, and latency benchmarks."
        )
        chars_typed = int(min(len(raw_prompt), max(0, (st - 1.2) * 28.0)))
        typed_now = raw_prompt[:chars_typed]
        freeze_score = int(lerp(28, 98, chars_typed / len(raw_prompt)))

        draw_top_header(draw, True, -18, 1.0, False)
        draw_centered_text(draw, 960, 122, "Every freeze melts one micro-step at a time.", F_SERIF_56, (241, 245, 249))

        draw.rounded_rectangle((340, 210, 1580, 855), radius=34, fill=(12, 19, 35), outline=(42, 58, 88), width=2)
        draw.text((400, 248), "1. DUMP WHAT IS FREEZING YOU", font=F_SANS_800_15, fill=(56, 189, 248))
        draw.text((400, 278), "Paste the messy assignment stressing you out", font=F_SERIF_46, fill=(241, 245, 249))

        draw.rounded_rectangle((1280, 265, 1520, 315), radius=25, fill=(65, 16, 30), outline=(244, 63, 94), width=2)
        draw_centered_text(draw, 1400, 279, f"Freeze Score: {freeze_score}/100", F_MONO_700_15, (253, 164, 175))

        draw.rounded_rectangle((400, 345, 1520, 515), radius=24, fill=(18, 28, 48), outline=(251, 191, 36) if st < 7.5 else (56, 72, 104), width=2)
        lines = [typed_now[i : i + 72] for i in range(0, len(typed_now), 72)] or [""]
        for idx_l, ln in enumerate(lines[:3]):
            suffix = "|" if (idx_l == len(lines[:3]) - 1 and (int(t * 3) % 2 == 0) and st < 7.5) else ""
            draw.text((430, 372 + idx_l * 40), ln + suffix, font=F_MONO_400_18, fill=(241, 245, 249))

        draw.text((400, 545), "2. PICK YOUR REAL-TIME BRAIN BATTERY", font=F_SANS_800_15, fill=(251, 191, 36))
        bat_selected = st >= 8.2
        bat_cards = [
            ("Low Battery (Frozen)", "90s–2m gentle starter micro-steps", 400, bat_selected),
            ("Steady Battery", "5-minute momentum steps", 780, False),
            ("Deep Flow", "10-minute focus sprints", 1160, False),
        ]
        for b_title, b_sub, bx, b_sel in bat_cards:
            b_fill = (55, 42, 18) if b_sel else (18, 28, 48)
            b_out = (251, 191, 36) if b_sel else (45, 60, 88)
            draw.rounded_rectangle((bx, 580, bx + 355, 685), radius=20, fill=b_fill, outline=b_out, width=3 if b_sel else 1)
            draw.text((bx + 26, 604), b_title, font=F_SANS_800_18, fill=(253, 230, 138) if b_sel else (241, 245, 249))
            draw.text((bx + 26, 638), b_sub, font=F_SANS_400_18, fill=(148, 163, 184))

        btn_pressed = 11.8 <= st <= 13.0
        draw.rounded_rectangle((400, 725, 1520, 795), radius=35, fill=(52, 211, 153), outline=(167, 243, 208), width=2)
        draw_centered_text(
            draw,
            960,
            746,
            "Melting Into 90-Second Micro-Steps..." if st >= 12.1 else "Unthaw & Enter Blindfold Focus Tunnel  ->",
            F_SANS_800_22,
            (6, 18, 30),
        )

        draw_bottom_dock(draw, True, "compose")
        draw_floating_kinetic_captions(draw, t, True)

        if st < 6.8:
            cx, cy, clk = 860, 435, False
        elif st < 10.2:
            p_c = (st - 6.8) / 1.4
            cx, cy = int(lerp(860, 575, p_c)), int(lerp(435, 632, p_c))
            clk = 8.0 <= st <= 8.8
        else:
            p_c = (st - 10.2) / 1.5
            cx, cy = int(lerp(575, 960, p_c)), int(lerp(632, 760, p_c))
            clk = btn_pressed
        draw_cursor(draw, cx, cy, clk)
        return img

    # =========================================================================
    # SCENE 3 (32.18 .. 49.82s): BLINDFOLD SHIELD + ONE 90-SECOND PHYSICAL MOVE
    # =========================================================================
    if t < 49.82:
        st = t - 32.18
        draw_top_header(draw, True, -18, 1.0, False)
        draw_centered_text(draw, 960, 122, "Every freeze melts one micro-step at a time.", F_SERIF_56, (241, 245, 249))

        # Larger Scenario Pills Row
        draw.rounded_rectangle((390, 204, 700, 248), radius=22, fill=(55, 42, 18), outline=(251, 191, 36), width=2)
        draw_centered_text(draw, 545, 216, "12-Page Capstone Thesis Freeze", F_SANS_700_15, (253, 230, 138))
        draw.rounded_rectangle((718, 204, 1108, 248), radius=22, fill=(18, 28, 48), outline=(45, 60, 88), width=1)
        draw_centered_text(draw, 913, 216, "Production Auth Bug & Messy Slack Handoff", F_SANS_700_15, (203, 213, 225))
        draw.rounded_rectangle((1126, 204, 1506, 248), radius=22, fill=(18, 28, 48), outline=(45, 60, 88), width=1)
        draw_centered_text(draw, 1316, 216, "Financial Aid & Scholarship Application Wall", F_SANS_700_15, (203, 213, 225))

        draw.rounded_rectangle((340, 272, 1580, 855), radius=34, fill=(12, 19, 35), outline=(42, 58, 88), width=2)

        draw.ellipse((400, 316, 412, 328), fill=(52, 211, 153))
        draw.text((424, 311), "STEP 1 OF 5  ·  ONLY ONE STEP VISIBLE  ·  LOW BATTERY", font=F_MONO_700_15, fill=(52, 211, 153))
        draw.rounded_rectangle((400, 348, 1520, 354), radius=3, fill=(30, 41, 59))
        prog_w = int(lerp(130, 360, st / 17.5))
        draw.rounded_rectangle((400, 348, 400 + prog_w, 354), radius=3, fill=(56, 189, 248))

        draw.rounded_rectangle((400, 378, 635, 412), radius=17, fill=(251, 191, 36))
        draw_centered_text(draw, 517, 385, "OPEN & TYPE 3 WORDS", F_SANS_800_15, (9, 13, 22))
        draw.text((652, 385), "90 seconds physical move", font=F_MONO_700_15, fill=(148, 163, 184))

        draw.text((400, 436), 'Open a single blank workspace file for "12-Page', font=F_SERIF_46, fill=(241, 245, 249))
        draw.text((400, 490), 'Senior Capstone Paper" and type only 3 rough', font=F_SERIF_46, fill=(241, 245, 249))
        draw.text((400, 544), "bullet placeholders—no full sentences allowed yet.", font=F_SERIF_46, fill=(241, 245, 249))
        draw.text((400, 614), "Why it works: Your hands move in 90 seconds before perfectionism can freeze you.", font=F_SANS_400_18, fill=(148, 163, 184))

        # Live Ticking Countdown Ring (ticks down 1:30 -> 1:13 in real time!)
        secs_left = max(73, 90 - int(st))
        clock_str = f"1:{secs_left - 60:02d}"
        arc_deg = int(lerp(20, 150, st / 17.5))
        rcx, rcy, rr = 1415, 520, 68
        draw.ellipse((rcx - rr, rcy - rr, rcx + rr, rcy + rr), outline=(30, 41, 59), width=9)
        draw.arc((rcx - rr, rcy - rr, rcx + rr, rcy + rr), start=-90, end=-90 + arc_deg, fill=(251, 191, 36), width=9)
        draw_centered_text(draw, rcx, rcy - 22, clock_str, F_MONO_700_36, (241, 245, 249))
        draw_centered_text(draw, rcx, rcy + 22, "MELTING...", F_SANS_800_13, (251, 191, 36))

        draw.rounded_rectangle((400, 682, 790, 742), radius=30, fill=(45, 212, 191))
        draw_centered_text(draw, 595, 700, "Done — Melt Next Micro-Step (Enter)", F_SANS_800_18, (6, 18, 30))

        draw.rounded_rectangle((1020, 685, 1335, 739), radius=27, fill=(55, 42, 18), outline=(251, 191, 36), width=2)
        draw_centered_text(draw, 1177, 702, "Still Too Scary? Split in Half (S)", F_SANS_800_15, (253, 230, 138))

        draw.rounded_rectangle((1350, 685, 1520, 739), radius=27, fill=(20, 30, 50), outline=(56, 72, 104), width=2)
        draw_centered_text(draw, 1435, 702, "Read Aloud (R)", F_SANS_700_15, (241, 245, 249))

        # Blindfold Shield Banner locking away Steps 2-5
        draw.rounded_rectangle((400, 766, 1520, 830), radius=20, fill=(12, 42, 68), outline=(56, 189, 248), width=2)
        draw.text((430, 786), "BLINDFOLD SHIELD LOCKED: Steps 2, 3, 4 & 5 are hidden out of sight so your brain can rest.", font=F_SANS_700_18, fill=(125, 211, 252))

        draw_bottom_dock(draw, True, "focus")
        draw_floating_kinetic_captions(draw, t, True)
        return img

    # =========================================================================
    # SCENE 4 (49.82 .. 68.82s): STILL TOO SCARY? SPLIT IN HALF -> DONE -> WARM UP
    # =========================================================================
    if t < 68.82:
        st = t - 49.82
        split_triggered = st >= 2.2
        done_clicked = st >= 12.2
        temp_now = int(lerp(-18, 12, (st - 12.2) / 3.5)) if done_clicked else -10

        draw_top_header(draw, True, temp_now, 1.0, False)
        draw_centered_text(draw, 960, 122, "Every freeze melts one micro-step at a time.", F_SERIF_56, (241, 245, 249))

        draw.rounded_rectangle((340, 225, 1580, 855), radius=34, fill=(12, 19, 35), outline=(251, 191, 36) if not done_clicked else (52, 211, 153), width=2)

        draw.ellipse((400, 270, 412, 282), fill=(251, 191, 36) if not done_clicked else (52, 211, 153))
        status_txt = (
            "STEP 2 OF 6  ·  WARMING UP (+12°C)  ·  MOMENTUM UNLOCKED"
            if done_clicked
            else "STEP 1 OF 6  ·  SPLIT IN HALF (60-SECOND WARM-UP)"
        )
        draw.text((424, 265), status_txt, font=F_MONO_700_15, fill=(251, 191, 36) if not done_clicked else (52, 211, 153))

        s_split = spring_val(st, 2.2) if split_triggered else 0.0
        card1_x = int(lerp(500, 400, s_split))
        card2_x = int(lerp(840, 975, s_split))

        # Left Half Card (60s Setup)
        draw.rounded_rectangle((card1_x, 320, card1_x + 545, 635), radius=26, fill=(24, 34, 56), outline=(251, 191, 36), width=3)
        draw.rounded_rectangle((card1_x + 28, 350, card1_x + 295, 384), radius=17, fill=(251, 191, 36))
        draw_centered_text(draw, card1_x + 161, 357, "PART 1 OF 2 · 60s SETUP", F_SANS_800_15, (9, 13, 22))
        draw.text((card1_x + 28, 408), "Do ONLY the physical setup:", font=F_SERIF_42, fill=(241, 245, 249))
        draw.text((card1_x + 28, 458), "Open the blank window and", font=F_SERIF_42, fill=(241, 245, 249))
        draw.text((card1_x + 28, 508), "put your cursor on line 1.", font=F_SERIF_42, fill=(241, 245, 249))
        secs_60 = max(42, 60 - int(max(0, st - 2.2) * 1.8))
        draw.text((card1_x + 28, 578), f"Live 60s Timer: 0:{secs_60:02d} remaining", font=F_MONO_700_22, fill=(52, 211, 153))

        # Right Half Card (Part 2)
        draw.rounded_rectangle((card2_x, 320, card2_x + 545, 635), radius=26, fill=(15, 23, 40), outline=(45, 60, 88), width=2)
        draw.text((card2_x + 28, 357), "PART 2 OF 2 · QUEUED NEXT (60s)", font=F_MONO_700_15, fill=(148, 163, 184))
        draw.text((card2_x + 28, 408), "With the file already open", font=F_SERIF_42, fill=(148, 163, 184))
        draw.text((card2_x + 28, 458), "in front of you, type 3 rough", font=F_SERIF_42, fill=(148, 163, 184))
        draw.text((card2_x + 28, 508), "bullet words.", font=F_SERIF_42, fill=(148, 163, 184))

        draw.rounded_rectangle((400, 685, 820, 749), radius=32, fill=(52, 211, 153))
        draw_centered_text(draw, 610, 705, "Done — Melt Next Micro-Step (Enter)", F_SANS_800_18, (6, 18, 30))

        draw.rounded_rectangle((1020, 688, 1335, 746), radius=27, fill=(55, 42, 18), outline=(251, 191, 36), width=2)
        draw_centered_text(draw, 1177, 707, "Still Too Scary? Split in Half (S)", F_SANS_800_15, (253, 230, 138))

        if done_clicked:
            draw.rounded_rectangle((580, 425, 1340, 555), radius=24, fill=(6, 48, 36), outline=(52, 211, 153), width=5)
            draw_centered_text(draw, 960, 452, "STEP 1 MELTED  ·  WARMING TO +12°C", F_SANS_800_34, (110, 231, 183))
            draw_centered_text(draw, 960, 505, "Revealing only the next single step...", F_MONO_700_15, (209, 250, 229))

        draw_bottom_dock(draw, True, "focus")
        draw_floating_kinetic_captions(draw, t, True)

        if st < 3.5:
            p_c = clamp01(st / 1.8)
            cx, cy = int(lerp(960, 1177, p_c)), int(lerp(500, 717, p_c))
            clk = 1.8 <= st <= 2.6
        else:
            p_c = clamp01((st - 8.5) / 3.2)
            cx, cy = int(lerp(1177, 610, p_c)), 717
            clk = 11.8 <= st <= 12.7
        draw_cursor(draw, cx, cy, clk)
        return img

    # =========================================================================
    # SCENE 5 (68.82 .. 81.29s): DARK/LIGHT SWITCH + DYSLEXIA + READ ALOUD
    # =========================================================================
    if t < 81.29:
        st = t - 68.82
        dys_on = st >= 5.2
        voice_on = st >= 8.2
        fg = (241, 245, 249) if is_dark else (15, 23, 42)
        muted = (148, 163, 184) if is_dark else (87, 83, 78)
        card_bg = (12, 19, 35) if is_dark else (255, 255, 255)
        card_bd = (42, 58, 88) if is_dark else (214, 211, 209)

        draw_top_header(draw, is_dark, 16, knob_t, dys_on)
        draw_centered_text(draw, 960, 122, "Every freeze melts one micro-step at a time.", F_SERIF_56, fg)

        draw.rounded_rectangle((340, 225, 1580, 855), radius=34, fill=card_bg, outline=card_bd, width=2)
        draw.ellipse((400, 272, 412, 284), fill=(16, 185, 129))
        draw.text((424, 267), "STEP 4 OF 6  ·  WARM FLOW (+16°C)  ·  BUILT FOR REAL BRAINS", font=F_MONO_700_15, fill=(16, 185, 129))

        draw.rounded_rectangle((400, 310, 1520, 316), radius=3, fill=(226, 232, 240) if not is_dark else (30, 41, 59))
        draw.rounded_rectangle((400, 310, 1180, 316), radius=3, fill=(16, 185, 129))

        draw.rounded_rectangle((400, 348, 610, 382), radius=17, fill=(251, 191, 36))
        draw_centered_text(draw, 505, 355, "SKETCH 4 BOXES", F_SANS_800_15, (9, 13, 22))

        hl_1 = "Draw or list  4  main boxes for" if dys_on else "Draw or list 4 main boxes for"
        hl_2 = '"system architecture diagram" as'
        hl_3 = "plain text arrows (A -> B -> C)."
        y_gap = 62 if dys_on else 52
        draw.text((400, 418), hl_1, font=F_SERIF_46, fill=fg)
        draw.text((400, 418 + y_gap), hl_2, font=F_SERIF_46, fill=fg)
        draw.text((400, 418 + y_gap * 2), hl_3, font=F_SERIF_46, fill=fg)

        draw.text((400, 625), "Dyslexia spacing, AAA high-contrast, and Web Speech Read-Aloud built right in.", font=F_SANS_600_20 if dys_on else F_SANS_400_18, fill=muted)

        rcx, rcy, rr = 1415, 510, 68
        draw.ellipse((rcx - rr, rcy - rr, rcx + rr, rcy + rr), outline=(214, 211, 209) if not is_dark else (30, 41, 59), width=9)
        draw.arc((rcx - rr, rcy - rr, rcx + rr, rcy + rr), start=-90, end=165, fill=(16, 185, 129), width=9)
        draw_centered_text(draw, rcx, rcy - 22, f"1:{max(22, 48 - int(st*2)):02d}", F_MONO_700_36, fg)
        draw_centered_text(draw, rcx, rcy + 22, "FLOWING", F_SANS_800_13, (16, 185, 129))

        draw.rounded_rectangle((400, 700, 820, 760), radius=30, fill=(16, 185, 129))
        draw_centered_text(draw, 610, 718, "Done — Melt Next Micro-Step (Enter)", F_SANS_800_18, (255, 255, 255) if not is_dark else (6, 18, 30))

        # Read Aloud button highlights when voice_on
        ra_bg = (14, 165, 233) if voice_on else ((245, 245, 244) if not is_dark else (20, 30, 50))
        ra_fg = (255, 255, 255) if voice_on else fg
        draw.rounded_rectangle((1280, 700, 1520, 760), radius=30, fill=ra_bg, outline=card_bd, width=2)
        draw_centered_text(draw, 1400, 720, "Speaking Aloud..." if voice_on else "Read Aloud (R)", F_SANS_800_15, ra_fg)

        draw_bottom_dock(draw, is_dark, "focus")
        draw_floating_kinetic_captions(draw, t, is_dark)

        if st < 3.2:
            p_c = clamp01(st / 1.6)
            cx, cy = int(lerp(960, 1524, p_c)), int(lerp(500, 56, p_c))
            clk = 1.6 <= st <= 2.4
        elif st < 6.8:
            p_c = clamp01((st - 3.2) / 1.6)
            cx, cy = int(lerp(1524, 1280, p_c)), 56
            clk = 4.8 <= st <= 5.6
        else:
            p_c = clamp01((st - 6.8) / 1.4)
            cx, cy = int(lerp(1280, 1400, p_c)), int(lerp(56, 730, p_c))
            clk = 8.0 <= st <= 8.8
        draw_cursor(draw, cx, cy, clk)
        return img

    # =========================================================================
    # SCENE 6 (81.29 .. 96.00s): IMPACT RECEIPT (-82% FRICTION) + BRAND OUTRO
    # =========================================================================
    st = t - 81.29
    if st < 9.2:
        count_p = ease_out_cubic(st / 2.8)
        after_score = int(lerp(98, 18, count_p))
        drop_pct = int(lerp(0, 82, count_p))

        draw_top_header(draw, True, 24, 1.0, False)
        draw_centered_text(draw, 960, 122, "Measurable Before-vs-After Transformation", F_SERIF_56, (241, 245, 249))

        draw.rounded_rectangle((300, 210, 1620, 855), radius=34, fill=(12, 19, 35), outline=(52, 211, 153), width=2)

        draw.rounded_rectangle((360, 250, 740, 350), radius=22, fill=(55, 14, 28), outline=(244, 63, 94), width=2)
        draw_centered_text(draw, 550, 264, "BEFORE: 98/100", F_MONO_700_36, (253, 164, 175))
        draw_centered_text(draw, 550, 314, "RAW TASK PARALYSIS (-18°C)", F_SANS_800_13, (251, 113, 133))

        draw.rounded_rectangle((770, 250, 1150, 350), radius=22, fill=(10, 62, 46), outline=(52, 211, 153), width=2)
        draw_centered_text(draw, 960, 264, f"AFTER: {after_score}/100", F_MONO_700_36, (110, 231, 183))
        draw_centered_text(draw, 960, 314, "SINGLE 90s IGNITION (+24°C)", F_SANS_800_13, (52, 211, 153))

        draw.rounded_rectangle((1180, 250, 1560, 350), radius=22, fill=(55, 42, 16), outline=(251, 191, 36), width=2)
        draw_centered_text(draw, 1370, 264, f"-{drop_pct}% FRICTION", F_MONO_700_36, (253, 230, 138))
        draw_centered_text(draw, 1370, 314, "COGNITIVE OVERLOAD REMOVED", F_SANS_800_13, (251, 191, 36))

        draw.rounded_rectangle((360, 385, 940, 815), radius=26, fill=(28, 14, 24), outline=(244, 63, 94), width=2)
        draw.text((395, 418), "BEFORE · STANDARD TO-DO WALL", font=F_SANS_800_15, fill=(251, 113, 133))
        draw.text((395, 465), "Write complete 12-page Senior Capstone", font=F_MONO_400_18, fill=(241, 245, 249))
        draw.text((395, 500), "Paper on Distributed Fault Tolerance by", font=F_MONO_400_18, fill=(241, 245, 249))
        draw.text((395, 535), "Friday 5pm + 15 IEEE citations + system", font=F_MONO_400_18, fill=(241, 245, 249))
        draw.text((395, 570), "architecture diagram + benchmark tables.", font=F_MONO_400_18, fill=(241, 245, 249))
        draw.text((395, 655), "Result: Brain sees a multi-day mountain with", font=F_SANS_600_16, fill=(253, 164, 175))
        draw.text((395, 685), "no physical starting point -> Freeze.", font=F_SANS_600_16, fill=(253, 164, 175))

        draw.rounded_rectangle((980, 385, 1560, 815), radius=26, fill=(10, 42, 34), outline=(52, 211, 153), width=2)
        draw.text((1015, 418), "AFTER · UNTHAW BLINDFOLD STEP #1", font=F_SANS_800_15, fill=(52, 211, 153))
        draw.text((1015, 465), 'Open one blank workspace file for "12-Page', font=F_SANS_700_18, fill=(241, 245, 249))
        draw.text((1015, 500), 'Senior Capstone Paper" and type only 3', font=F_SANS_700_18, fill=(241, 245, 249))
        draw.text((1015, 535), "rough bullet placeholders (90 seconds).", font=F_SANS_700_18, fill=(241, 245, 249))
        draw.text((1015, 655), "Result: All other steps hidden behind Shield;", font=F_SANS_600_16, fill=(110, 231, 183))
        draw.text((1015, 685), "any step splits in half into a 60s setup move.", font=F_SANS_600_16, fill=(110, 231, 183))

        draw_bottom_dock(draw, True, "receipt")
        draw_floating_kinetic_captions(draw, t, True)
        return img

    # Brand Outro (final 5.5 seconds)
    s_out = spring_val(st, 9.2)
    y_base = int(lerp(360, 270, s_out))

    draw.rounded_rectangle((910, y_base - 110, 1010, y_base - 10), radius=26, fill=(11, 18, 32), outline=(56, 189, 248), width=3)
    draw.polygon([(960, y_base - 95), (985, y_base - 72), (960, y_base - 56), (935, y_base - 72)], fill=(125, 211, 252))
    draw.polygon([(935, y_base - 72), (960, y_base - 56), (985, y_base - 72), (988, y_base - 38), (960, y_base - 22), (932, y_base - 38)], fill=(245, 158, 11))
    draw.ellipse((950, y_base - 50, 970, y_base - 30), fill=(255, 251, 235))

    draw_centered_text(draw, 960, y_base + 15, "Unthaw", F_SANS_800_64, (241, 245, 249))
    draw_centered_text(draw, 960, y_base + 105, "Every freeze melts one micro-step at a time.", F_SERIF_I_64, (251, 191, 36))

    draw.rounded_rectangle((680, y_base + 210, 1240, y_base + 275), radius=32, fill=(45, 212, 191))
    draw_centered_text(draw, 960, y_base + 228, "unthaw-ten.vercel.app", F_MONO_700_22, (6, 18, 30))

    draw_centered_text(draw, 960, y_base + 315, "github.com/unborn7g/unthaw  ·  CREATED BY ONE · @Unborn7g", F_SANS_700_18, (148, 163, 184))
    draw_floating_kinetic_captions(draw, t, True)
    return img


def build_master_audio(out_wav: str):
    """Combines the 6 studio neural voiceover clips at their exact start times using FFmpeg."""
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    inputs = []
    filter_parts = []
    for idx, (s_start, _, fname, _) in enumerate(SCENES):
        inputs.extend(["-i", os.path.join(VO_DIR, fname)])
        delay_ms = int(s_start * 1000)
        filter_parts.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms},volume=1.15[a{idx}]")

    mix_inputs = "".join(f"[a{i}]" for i in range(len(SCENES)))
    filter_complex = ";".join(filter_parts) + f";{mix_inputs}amix=inputs={len(SCENES)}:normalize=0,apad=whole_dur={TOTAL_SECS}[outa]"

    cmd = (
        [ffmpeg_exe, "-y"]
        + inputs
        + [
            "-filter_complex",
            filter_complex,
            "-map",
            "[outa]",
            "-ac",
            "2",
            "-ar",
            "44100",
            out_wav,
        ]
    )
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    t0 = time.time()
    mp4_out = os.path.join(OUT_DIR, "unthaw-demo.mp4")

    with tempfile.TemporaryDirectory() as tmpdir:
        wav_path = os.path.join(tmpdir, "master_vo.wav")
        print("1. Mixing 6 studio neural voiceover clips into master audio track...")
        build_master_audio(wav_path)

        print(f"2. Streaming {TOTAL_FRAMES} narrated 1080p frames @ {FPS}fps into FFmpeg...")
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
            "ultrafast",
            "-crf",
            "20",
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
