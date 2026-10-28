# Phase 5 artwork audit

## Character source and sheet inventory

The six source packs were inspected in `C:\Users\jadin\Downloads` before copying. CraftPix variant folders were copied intact by variant; only PNG sprite sheets whose width or height exceeds 64 pixels were included (standalone tiny projectiles/markers were omitted). No PSDs, coupon images, fonts, or ZIP archives were copied. The Yokai ZIP was read directly; the downloaded archive was not extracted or changed.

The excluded small support files were Kunoichi's `Spine.png`, Ninja Monk's `Kunai.png`, Ninja Peasant's `Dart.png`, Samurai Archer's `Arrow.png`, and Skeleton Archer's `Arrow.png`. The inspected character animation strips are retained, including 64-pixel-high effect strips such as Yokai's `Fire_1.png` and `Fire_2.png`.

Every listed PNG is a separate, single-row sheet with frames ordered left to right. Transparent pixels and original frame sizes are preserved. Character art faces right in the source; player 2 is flipped at draw time. Frame cells contain transparent padding, usually above the feet; the renderer anchors every cell at its bottom center and supports per-animation X/Y offsets (all current offsets are zero). Most body sheets use 128×128 cells. Ninja Monk and Ninja Peasant use 96×96 cells. Some spell/effect sheets use 128×64 or 64×64 cells, recorded per sheet below.

The `frames × cell size (image size)` notation gives frame count, source frame dimensions, then full PNG dimensions. All animation strips inspected include transparency (RGBA or palette transparency).

### Ninja — Kunoichi (`kunoichi`)

- Source: `Downloads/ninja sprite sheet/Kunoichi/`; copied to `public/assets/characters/ninja/Kunoichi/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.938; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 6 × 128×128 (768×128) | (42, 67, 71, 128) |
| `Attack_2.png` | 8 × 128×128 (1024×128) | (22, 40, 79, 128) |
| `Cast.png` | 6 × 128×128 (768×128) | (46, 67, 75, 128) |
| `Dead.png` | 5 × 128×128 (640×128) | (48, 68, 73, 128) |
| `Eating.png` | 9 × 128×128 (1152×128) | (51, 64, 72, 128) |
| `Hurt.png` | 2 × 128×128 (256×128) | (39, 64, 70, 128) |
| `Idle.png` | 9 × 128×128 (1152×128) | (49, 64, 72, 128) |
| `Jump.png` | 10 × 128×128 (1280×128) | (45, 74, 81, 128) |
| `Run.png` | 8 × 128×128 (1024×128) | (43, 67, 84, 128) |
| `Walk.png` | 8 × 128×128 (1024×128) | (50, 64, 70, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: missing; renderer fallback; HEAL: `Cast.png`; SPECIAL: `Attack_2.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Ninja — Ninja Monk (`ninja-monk`)

- Source: `Downloads/ninja sprite sheet/Ninja_Monk/`; copied to `public/assets/characters/ninja/Ninja_Monk/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 96x96; renderer scale 0.845; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 5 × 96×96 (480×96) | (33, 29, 81, 96) |
| `Attack_2.png` | 5 × 96×96 (480×96) | (3, 31, 63, 96) |
| `Blade.png` | 6 × 96×96 (576×96) | (35, 25, 63, 96) |
| `Cast.png` | 5 × 96×96 (480×96) | (28, 29, 73, 96) |
| `Dead.png` | 5 × 96×96 (480×96) | (12, 25, 57, 96) |
| `Hurt.png` | 4 × 96×96 (384×96) | (30, 31, 66, 96) |
| `Idle.png` | 7 × 96×96 (672×96) | (33, 25, 67, 96) |
| `Jump.png` | 9 × 96×96 (864×96) | (30, 30, 68, 96) |
| `Run.png` | 8 × 96×96 (768×96) | (3, 32, 75, 96) |
| `Walk.png` | 7 × 96×96 (672×96) | (32, 25, 74, 96) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: missing; renderer fallback; HEAL: `Cast.png`; SPECIAL: `Attack_2.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Ninja — Ninja Peasant (`ninja-peasant`)

- Source: `Downloads/ninja sprite sheet/Ninja_Peasant/`; copied to `public/assets/characters/ninja/Ninja_Peasant/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 96x96; renderer scale 0.882; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 6 × 96×96 (576×96) | (23, 37, 62, 96) |
| `Attack_2.png` | 4 × 96×96 (384×96) | (27, 37, 67, 96) |
| `Dead.png` | 4 × 96×96 (384×96) | (24, 43, 62, 96) |
| `Disguise.png` | 9 × 96×96 (864×96) | (29, 38, 66, 96) |
| `Hurt.png` | 2 × 96×96 (192×96) | (23, 34, 61, 96) |
| `Idle.png` | 6 × 96×96 (576×96) | (27, 28, 62, 96) |
| `Jump.png` | 8 × 96×96 (768×96) | (31, 39, 66, 96) |
| `Run.png` | 6 × 96×96 (576×96) | (25, 34, 70, 96) |
| `Shot.png` | 6 × 96×96 (576×96) | (31, 64, 65, 96) |
| `Walk.png` | 8 × 96×96 (768×96) | (27, 31, 63, 96) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: missing; renderer fallback; HEAL: missing; renderer fallback; SPECIAL: `Attack_2.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Samurai — Samurai (`samurai`)

- Source: `Downloads/samurai sprite sheet/Samurai/`; copied to `public/assets/characters/samurai/Samurai/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.870; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 4 × 128×128 (512×128) | (23, 62, 74, 128) |
| `Attack_2.png` | 5 × 128×128 (640×128) | (26, 53, 84, 128) |
| `Attack_3.png` | 4 × 128×128 (512×128) | (31, 62, 76, 128) |
| `Dead.png` | 6 × 128×128 (768×128) | (32, 62, 73, 128) |
| `Hurt.png` | 3 × 128×128 (384×128) | (35, 60, 90, 128) |
| `Idle.png` | 6 × 128×128 (768×128) | (0, 59, 56, 128) |
| `Jump.png` | 9 × 128×128 (1152×128) | (32, 61, 88, 128) |
| `Protection.png` | 2 × 128×128 (256×128) | (49, 59, 102, 128) |
| `Run.png` | 8 × 128×128 (1024×128) | (10, 63, 64, 128) |
| `Walk.png` | 9 × 128×128 (1152×128) | (26, 59, 84, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: `Protection.png`; HEAL: missing; renderer fallback; SPECIAL: `Attack_3.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Samurai — Samurai Archer (`samurai-archer`)

- Source: `Downloads/samurai sprite sheet/Samurai_Archer/`; copied to `public/assets/characters/samurai/Samurai_Archer/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.583; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 5 × 128×128 (640×128) | (35, 61, 77, 128) |
| `Attack_2.png` | 5 × 128×128 (640×128) | (29, 28, 94, 128) |
| `Attack_3.png` | 6 × 128×128 (768×128) | (22, 57, 97, 128) |
| `Dead.png` | 5 × 128×128 (640×128) | (15, 59, 118, 128) |
| `Hurt.png` | 3 × 128×128 (384×128) | (9, 59, 112, 128) |
| `Idle.png` | 9 × 128×128 (1152×128) | (34, 25, 81, 128) |
| `Jump.png` | 9 × 128×128 (1152×128) | (24, 57, 127, 128) |
| `Run.png` | 8 × 128×128 (1024×128) | (7, 56, 110, 128) |
| `Shot.png` | 14 × 128×128 (1792×128) | (34, 14, 98, 128) |
| `Walk.png` | 8 × 128×128 (1024×128) | (12, 58, 115, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: missing; renderer fallback; HEAL: missing; renderer fallback; SPECIAL: `Attack_3.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Samurai — Samurai Commander (`samurai-commander`)

- Source: `Downloads/samurai sprite sheet/Samurai_Commander/`; copied to `public/assets/characters/samurai/Samurai_Commander/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.652; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 4 × 128×128 (512×128) | (22, 35, 73, 128) |
| `Attack_2.png` | 5 × 128×128 (640×128) | (24, 38, 82, 128) |
| `Attack_3.png` | 4 × 128×128 (512×128) | (30, 44, 76, 128) |
| `Dead.png` | 6 × 128×128 (768×128) | (18, 37, 59, 128) |
| `Hurt.png` | 2 × 128×128 (256×128) | (18, 38, 73, 128) |
| `Idle.png` | 5 × 128×128 (640×128) | (27, 36, 83, 128) |
| `Jump.png` | 7 × 128×128 (896×128) | (26, 42, 73, 128) |
| `Protect.png` | 2 × 128×128 (256×128) | (33, 36, 86, 128) |
| `Run.png` | 8 × 128×128 (1024×128) | (10, 39, 64, 128) |
| `Walk.png` | 9 × 128×128 (1152×128) | (23, 34, 81, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: `Protect.png`; HEAL: missing; renderer fallback; SPECIAL: `Attack_3.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Knight — Knight 1 (`knight-1`)

- Source: `Downloads/knight sprite sheet/Knight_1/`; copied to `public/assets/characters/knight/Knight_1/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.938; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack 1.png` | 5 × 128×128 (640×128) | (33, 64, 76, 128) |
| `Attack 2.png` | 4 × 128×128 (512×128) | (15, 53, 57, 128) |
| `Attack 3.png` | 4 × 128×128 (512×128) | (20, 64, 68, 128) |
| `Dead.png` | 6 × 128×128 (768×128) | (14, 70, 57, 128) |
| `Defend.png` | 5 × 128×128 (640×128) | (17, 68, 60, 128) |
| `Hurt.png` | 2 × 128×128 (256×128) | (15, 69, 61, 128) |
| `Idle.png` | 4 × 128×128 (512×128) | (12, 64, 55, 128) |
| `Jump.png` | 6 × 128×128 (768×128) | (20, 71, 69, 128) |
| `Protect.png` | 1 × 128×128 (128×128) | (17, 68, 60, 128) |
| `Run+Attack.png` | 6 × 128×128 (768×128) | (16, 53, 72, 128) |
| `Run.png` | 7 × 128×128 (896×128) | (20, 67, 68, 128) |
| `Walk.png` | 8 × 128×128 (1024×128) | (13, 64, 53, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack 1.png`; DEFEND: `Defend.png`; HEAL: missing; renderer fallback; SPECIAL: `Attack 3.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Knight — Knight 2 (`knight-2`)

- Source: `Downloads/knight sprite sheet/Knight_2/`; copied to `public/assets/characters/knight/Knight_2/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.938; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack 1.png` | 5 × 128×128 (640×128) | (29, 64, 72, 128) |
| `Attack 2.png` | 4 × 128×128 (512×128) | (15, 53, 57, 128) |
| `Attack 3.png` | 4 × 128×128 (512×128) | (20, 64, 68, 128) |
| `Dead.png` | 6 × 128×128 (768×128) | (14, 70, 57, 128) |
| `Defend.png` | 5 × 128×128 (640×128) | (17, 68, 60, 128) |
| `Hurt.png` | 2 × 128×128 (256×128) | (15, 69, 61, 128) |
| `Idle.png` | 4 × 128×128 (512×128) | (12, 64, 55, 128) |
| `Jump.png` | 6 × 128×128 (768×128) | (20, 71, 69, 128) |
| `Protect.png` | 1 × 128×128 (128×128) | (17, 68, 60, 128) |
| `Run+Attack.png` | 6 × 128×128 (768×128) | (16, 53, 72, 128) |
| `Run.png` | 7 × 128×128 (896×128) | (20, 67, 68, 128) |
| `Walk.png` | 8 × 128×128 (1024×128) | (13, 64, 53, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack 1.png`; DEFEND: `Defend.png`; HEAL: missing; renderer fallback; SPECIAL: `Attack 3.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Knight — Knight 3 (`knight-3`)

- Source: `Downloads/knight sprite sheet/Knight_3/`; copied to `public/assets/characters/knight/Knight_3/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.938; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack 1.png` | 5 × 128×128 (640×128) | (0, 64, 70, 128) |
| `Attack 2.png` | 4 × 128×128 (512×128) | (15, 53, 57, 128) |
| `Attack 3.png` | 4 × 128×128 (512×128) | (20, 64, 68, 128) |
| `Dead.png` | 6 × 128×128 (768×128) | (14, 70, 57, 128) |
| `Defend.png` | 5 × 128×128 (640×128) | (17, 68, 60, 128) |
| `Hurt.png` | 2 × 128×128 (256×128) | (15, 69, 61, 128) |
| `Idle.png` | 4 × 128×128 (512×128) | (12, 64, 55, 128) |
| `Jump.png` | 6 × 128×128 (768×128) | (20, 71, 69, 128) |
| `Protect.png` | 1 × 128×128 (128×128) | (17, 68, 60, 128) |
| `Run+Attack.png` | 6 × 128×128 (768×128) | (16, 53, 72, 128) |
| `Run.png` | 7 × 128×128 (896×128) | (20, 67, 68, 128) |
| `Walk.png` | 8 × 128×128 (1024×128) | (13, 64, 53, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack 1.png`; DEFEND: `Defend.png`; HEAL: missing; renderer fallback; SPECIAL: `Attack 3.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Wizard — Fire Wizard (`fire-wizard`)

- Source: `Downloads/wizard mage sprite sheet/Fire Wizard/`; copied to `public/assets/characters/wizard/Fire Wizard/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.909; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 4 × 128×128 (512×128) | (31, 70, 73, 128) |
| `Attack_2.png` | 4 × 128×128 (512×128) | (37, 68, 73, 128) |
| `Charge.png` | 6 × 128×64 (768×64) | (23, 20, 122, 39) |
| `Dead.png` | 6 × 128×128 (768×128) | (28, 71, 64, 128) |
| `Fireball.png` | 8 × 128×128 (1024×128) | (32, 63, 67, 128) |
| `Flame_jet.png` | 14 × 128×128 (1792×128) | (24, 62, 62, 128) |
| `Hurt.png` | 3 × 128×128 (384×128) | (34, 77, 64, 128) |
| `Idle.png` | 7 × 128×128 (896×128) | (36, 62, 64, 128) |
| `Jump.png` | 9 × 128×128 (1152×128) | (25, 67, 58, 128) |
| `Run.png` | 8 × 128×128 (1024×128) | (31, 69, 67, 128) |
| `Walk.png` | 6 × 128×128 (768×128) | (49, 62, 69, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: missing; renderer fallback; HEAL: `Attack_2.png`; SPECIAL: `Fireball.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Wizard — Lightning Mage (`lightning-mage`)

- Source: `Downloads/wizard mage sprite sheet/Lightning Mage/`; copied to `public/assets/characters/wizard/Lightning Mage/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.952; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 10 × 128×128 (1280×128) | (24, 66, 72, 128) |
| `Attack_2.png` | 4 × 128×128 (512×128) | (21, 65, 101, 128) |
| `Charge.png` | 5 × 128×64 (640×64) | (28, 19, 108, 48) |
| `Dead.png` | 5 × 128×128 (640×128) | (36, 70, 68, 128) |
| `Hurt.png` | 3 × 128×128 (384×128) | (40, 76, 72, 128) |
| `Idle.png` | 7 × 128×128 (896×128) | (42, 65, 65, 128) |
| `Jump.png` | 8 × 128×128 (1024×128) | (49, 73, 78, 128) |
| `Light_ball.png` | 7 × 128×128 (896×128) | (50, 65, 74, 128) |
| `Light_charge.png` | 13 × 128×128 (1664×128) | (11, 65, 45, 128) |
| `Run.png` | 8 × 128×128 (1024×128) | (42, 66, 77, 128) |
| `Walk.png` | 7 × 128×128 (896×128) | (49, 64, 70, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: missing; renderer fallback; HEAL: `Attack_2.png`; SPECIAL: `Light_ball.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Wizard — Wanderer Magican (`wanderer-magican`)

- Source: `Downloads/wizard mage sprite sheet/Wanderer Magican/`; copied to `public/assets/characters/wizard/Wanderer Magican/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.909; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 7 × 128×128 (896×128) | (31, 64, 72, 128) |
| `Attack_2.png` | 9 × 128×128 (1152×128) | (30, 64, 68, 128) |
| `Charge_1.png` | 6 × 96×128 (576×128) | (0, 54, 96, 71) |
| `Charge_2.png` | 3 × 128×128 (384×128) | (36, 49, 112, 67) |
| `Dead.png` | 4 × 128×128 (512×128) | (33, 70, 72, 128) |
| `Hurt.png` | 4 × 128×128 (512×128) | (41, 70, 83, 128) |
| `Idle.png` | 8 × 128×128 (1024×128) | (47, 62, 81, 128) |
| `Jump.png` | 8 × 128×128 (1024×128) | (20, 68, 78, 128) |
| `Magic_arrow.png` | 6 × 128×128 (768×128) | (37, 65, 76, 128) |
| `Magic_sphere.png` | 16 × 128×128 (2048×128) | (32, 65, 72, 128) |
| `Run.png` | 8 × 128×128 (1024×128) | (23, 67, 67, 128) |
| `Walk.png` | 7 × 128×128 (896×128) | (49, 62, 80, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: missing; renderer fallback; HEAL: `Attack_2.png`; SPECIAL: `Magic_sphere.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Skeleton — Skeleton Archer (`skeleton-archer`)

- Source: `Downloads/skeleton sprite sheet/Skeleton_Archer/`; copied to `public/assets/characters/skeleton/Skeleton_Archer/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.938; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 5 × 128×128 (640×128) | (40, 64, 75, 128) |
| `Attack_2.png` | 4 × 128×128 (512×128) | (31, 62, 79, 128) |
| `Attack_3.png` | 3 × 128×128 (384×128) | (38, 67, 110, 128) |
| `Dead.png` | 5 × 128×128 (640×128) | (32, 69, 71, 128) |
| `Evasion.png` | 6 × 128×128 (768×128) | (44, 70, 83, 128) |
| `Hurt.png` | 2 × 128×128 (256×128) | (45, 69, 85, 128) |
| `Idle.png` | 7 × 128×128 (896×128) | (45, 64, 82, 128) |
| `Shot_1.png` | 15 × 128×128 (1920×128) | (40, 62, 79, 128) |
| `Shot_2.png` | 15 × 128×128 (1920×128) | (40, 77, 80, 128) |
| `Walk.png` | 8 × 128×128 (1024×128) | (46, 64, 81, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: `Evasion.png`; HEAL: missing; renderer fallback; SPECIAL: `Attack_3.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Skeleton — Skeleton Spearman (`skeleton-spearman`)

- Source: `Downloads/skeleton sprite sheet/Skeleton_Spearman/`; copied to `public/assets/characters/skeleton/Skeleton_Spearman/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.732; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 4 × 128×128 (512×128) | (10, 75, 93, 128) |
| `Attack_2.png` | 4 × 128×128 (512×128) | (24, 75, 107, 128) |
| `Dead.png` | 5 × 128×128 (640×128) | (32, 46, 74, 128) |
| `Fall.png` | 6 × 128×128 (768×128) | (44, 73, 110, 128) |
| `Hurt.png` | 3 × 128×128 (384×128) | (43, 46, 85, 128) |
| `Idle.png` | 7 × 128×128 (896×128) | (43, 46, 73, 128) |
| `Protect.png` | 2 × 128×128 (256×128) | (50, 59, 83, 128) |
| `Run+attack.png` | 5 × 128×128 (640×128) | (5, 72, 104, 128) |
| `Run.png` | 6 × 128×128 (768×128) | (22, 68, 102, 128) |
| `Walk.png` | 7 × 128×128 (896×128) | (42, 41, 84, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: `Protect.png`; HEAL: missing; renderer fallback; SPECIAL: `Attack_2.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Skeleton — Skeleton Warrior (`skeleton-warrior`)

- Source: `Downloads/skeleton sprite sheet/Skeleton_Warrior/`; copied to `public/assets/characters/skeleton/Skeleton_Warrior/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 1.034; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 5 × 128×128 (640×128) | (22, 66, 69, 128) |
| `Attack_2.png` | 6 × 128×128 (768×128) | (45, 75, 93, 128) |
| `Attack_3.png` | 4 × 128×128 (512×128) | (25, 53, 85, 128) |
| `Dead.png` | 4 × 128×128 (512×128) | (43, 70, 82, 128) |
| `Hurt.png` | 2 × 128×128 (256×128) | (36, 66, 83, 128) |
| `Idle.png` | 7 × 128×128 (896×128) | (38, 70, 91, 128) |
| `Protect.png` | 1 × 128×128 (128×128) | (46, 67, 82, 128) |
| `Run+attack.png` | 7 × 128×128 (896×128) | (45, 62, 83, 128) |
| `Run.png` | 8 × 128×128 (1024×128) | (34, 70, 91, 128) |
| `Walk.png` | 7 × 128×128 (896×128) | (46, 63, 82, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: `Protect.png`; HEAL: missing; renderer fallback; SPECIAL: `Attack_3.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Yokai — Karasu Tengu (`karasu-tengu`)

- Source: `Downloads/yokai sprite sheet.zip:Karasu_tengu/`; copied to `public/assets/characters/yokai/Karasu_tengu/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.690; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 6 × 128×128 (768×128) | (8, 41, 83, 128) |
| `Attack_2.png` | 4 × 128×128 (512×128) | (6, 39, 91, 128) |
| `Attack_3.png` | 3 × 128×128 (384×128) | (13, 41, 90, 128) |
| `Dead.png` | 6 × 128×128 (768×128) | (11, 48, 94, 128) |
| `Hurt.png` | 3 × 128×128 (384×128) | (23, 42, 97, 128) |
| `Idle.png` | 6 × 128×128 (768×128) | (27, 41, 101, 128) |
| `Idle_2.png` | 5 × 128×128 (640×128) | (20, 41, 94, 128) |
| `Jump.png` | 15 × 128×128 (1920×128) | (4, 49, 98, 128) |
| `Run.png` | 8 × 128×128 (1024×128) | (17, 55, 99, 128) |
| `Walk.png` | 8 × 128×128 (1024×128) | (22, 40, 79, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: missing; renderer fallback; HEAL: missing; renderer fallback; SPECIAL: `Attack_3.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Yokai — Kitsune (`kitsune`)

- Source: `Downloads/yokai sprite sheet.zip:Kitsune/`; copied to `public/assets/characters/yokai/Kitsune/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.769; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 10 × 128×128 (1280×128) | (13, 58, 54, 128) |
| `Attack_2.png` | 10 × 128×128 (1280×128) | (20, 48, 97, 128) |
| `Attack_3.png` | 7 × 128×128 (896×128) | (23, 51, 75, 128) |
| `Dead.png` | 10 × 128×128 (1280×128) | (26, 51, 81, 128) |
| `Fire_1.png` | 14 × 64×64 (896×64) | (27, 26, 35, 36) |
| `Fire_2.png` | 11 × 64×64 (704×64) | (22, 29, 41, 40) |
| `Hurt.png` | 2 × 128×128 (256×128) | (23, 56, 74, 128) |
| `Idle.png` | 8 × 128×128 (1024×128) | (31, 50, 73, 128) |
| `Idle_2.png` | 6 × 128×128 (768×128) | (32, 50, 74, 128) |
| `Jump.png` | 10 × 128×128 (1280×128) | (30, 55, 83, 128) |
| `Run.png` | 8 × 128×128 (1024×128) | (21, 44, 70, 128) |
| `Walk.png` | 8 × 128×128 (1024×128) | (32, 49, 81, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: missing; renderer fallback; HEAL: missing; renderer fallback; SPECIAL: `Attack_3.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.
### Yokai — Yamabushi Tengu (`yamabushi-tengu`)

- Source: `Downloads/yokai sprite sheet.zip:Yamabushi_tengu/`; copied to `public/assets/characters/yokai/Yamabushi_tengu/`.
- Sheet layout: horizontal, left to right; one row; profile art faces right; transparent background.
- Idle cell: 128x128; renderer scale 0.632; bottom-center anchor.

| Original file | Frames and frame/image dimensions | Alpha bounds in first frame |
|---|---:|---|
| `Attack_1.png` | 3 × 128×128 (384×128) | (11, 41, 89, 128) |
| `Attack_2.png` | 6 × 128×128 (768×128) | (7, 36, 82, 128) |
| `Attack_3.png` | 4 × 128×128 (512×128) | (7, 39, 94, 128) |
| `Dead.png` | 6 × 128×128 (768×128) | (4, 46, 88, 128) |
| `Hurt.png` | 3 × 128×128 (384×128) | (25, 33, 99, 128) |
| `Idle.png` | 6 × 128×128 (768×128) | (21, 33, 95, 128) |
| `Idle_2.png` | 5 × 128×128 (640×128) | (18, 33, 92, 128) |
| `Jump.png` | 15 × 128×128 (1920×128) | (4, 49, 100, 128) |
| `Run.png` | 8 × 128×128 (1024×128) | (21, 46, 104, 128) |
| `Walk.png` | 8 × 128×128 (1024×128) | (27, 29, 82, 128) |

Gameplay state mapping from inspected sheets:

- IDLE: `Idle.png`; ATTACK: `Attack_1.png`; DEFEND: missing; renderer fallback; HEAL: missing; renderer fallback; SPECIAL: `Attack_3.png`; HURT: `Hurt.png`; VICTORY: none (idle plus gold celebration effect); DEFEAT: `Dead.png`.

## Map collections and selected artwork

The map downloads contain six scenes, each with five separate layers in both 320×180 and 640×360 versions. Each selected scene uses its 320×180 files; the 640×360 copies are exactly 2× and were not copied. The selected scenes were `forest_sunset`, `dungeon_gate`, and `mountain_temple`; the inspected alternatives were `coast`, `castle_town`, and `bamboo_forest`. The former three best matched the existing Grove, Citadel, and Shrine map themes. The alternate scene layer widths, in layer order, are coast 637/527/502/576/515 px, castle town 485/596/462/579/550 px, and bamboo forest 613/633/379/415/677 px. All layers are 180 pixels tall; widths vary because the layers loop. Layer order is sky, mountains/far background, hills/midground, forest/ground, foreground. Sky is opaque; remaining layers retain transparency. The included READMEs recommend parallax rates 0.1, 0.25, 0.5, 1.0, and 1.6 respectively. Their sources confirm the layers can be composited with a level inserted between layers. The current game has no moving camera, so the renderer keeps the rate metadata for camera/parallax movement and renders at camera offset zero.

| Game map | Selected collection scene | Layer file dimensions, pixels |
|---|---|---|
| Forgotten Grove | Forest & Coast / forest_sunset | sky 320×180; mountains 320×180; hills 377×180; forest 367×180; foreground 320×180 |
| Crimson Citadel | Castle Town & Dungeon Gate / dungeon_gate | sky 466×180; mountains 555×180; hills 398×180; forest 509×180; foreground 513×180 |
| Moonlit Shrine | Mountain Temple & Bamboo Forest / mountain_temple | sky 539×180; mountains 477×180; hills 415×180; forest 515×180; foreground 545×180 |

## Missing states and fallbacks

- `IDLE`, `ATTACK`, `HURT`, and `DEFEAT` sheets exist for every variant. The attack sheet is the first attack strip; defeat uses the available `Dead.png` strip.
- `DEFEND` uses `Defend`, `Protect`, `Protection`, or `Evasion` when present. Variants without one use idle plus a visible shield pose/effect.
- `HEAL` uses `Cast.png` where present (Kunoichi and Ninja Monk) and the Wizard attack/casting strip where present. Other variants use idle with the green healing effect. No healing-specific art sheet exists.
- `SPECIAL` uses the strongest available full-body sheet: Wizard spell attacks, otherwise Attack 3, Attack 2, or Attack 1. The effect color is visual only.
- No variant has a dedicated `VICTORY` sheet. Winners use idle with a gold celebration effect. All variants include `Dead.png` for defeat.
- `RUN` and `WALK` are present for all listed variants; `JUMP` is absent from Skeleton Archer/Spearman/Warrior. No `DASH`, `BLOCK`, `HIT`, or `DIE` named sheets were found. Similar roles are covered by `Protect`/`Defend`/`Protection`/`Evasion`, `Hurt`, and `Dead`.
- Sprite loading errors use the next valid action fallback and ultimately the loaded idle frame; if even idle fails, the renderer draws the documented minimal missing-art silhouette. Map layers fall back to the original procedural background if any required layer fails to load.

## Included sources and licensing

All six character source packs include the same 35-byte `Licens.txt`/`License.txt` notice linking to `https://craftpix.net/file-licenses/`; one original copy is preserved in `public/assets/characters/credits/`. Each exact pack is listed as a free download on CraftPix, which states its freebies can be used in personal/commercial projects and games may be distributed with the art; attribution is not required, credit appreciated. The product links below were checked against the downloaded variant names and described contents. Map `LICENSE.txt` and `README.txt` files are preserved under `public/assets/maps/credits/`; those licenses allow use in commercial projects, prohibit redistributing the art as a standalone asset pack, and say credit is appreciated but not required.

| Asset pack | Official product/source page |
|---|---|
| Ninja | https://dev.craftpix.net/freebies/free-ninja-sprite-sheets-pixel-art/ |
| Samurai | https://craftpix.net/freebies/free-samurai-pixel-art-sprite-sheets/ |
| Knight | https://craftpix.net/freebies/free-knight-character-sprites-pixel-art/ |
| Wizard | https://craftpix.net/freebies/free-wizard-sprite-sheets-pixel-art/ |
| Skeleton | https://dev.craftpix.net/freebies/free-skeleton-pixel-art-sprite-sheets/ |
| Yokai | https://craftpix.net/freebies/free-yokai-pixel-art-character-sprites/ |
| Forest & Coast maps | Downloads/forest and coast maps/LICENSE.txt |
| Castle Town & Dungeon Gate maps | Downloads/castle town and dungeon gate maps/LICENSE.txt |
| Mountain Temple & Bamboo Forest maps | Downloads/mountain temple and bamboo forest maps/LICENSE.txt |
