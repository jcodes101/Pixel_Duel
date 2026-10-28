NASHA'S PARALLAX WORLDS: FREE FOREST & COAST
============================================

Hi, and welcome! This pack is free.

Inside you'll find 2 pixel art parallax backgrounds for side scrolling
games, each split into 5 seamless, looping layers:

  forest_sunset   a deep pine forest under an orange sunset sky, with
                  far blue mountains, a distant tower, misty forested
                  hills, tall trees and ferns
  coast           a sunny sea coast with a lighthouse island, sea
                  stacks and white surf, cliffs with pines and a sandy
                  shore

Nothing in the pack carries letters or numbers, so it fits a game in
any language.


WHERE THINGS ARE
----------------

forest_sunset/ and coast/ each hold two folders with the same 5 layers:

  320x180/      the native size: every layer is 180 pixels tall
  640x360/      the same layers scaled 2x (nearest neighbour), ready
                for a 640x360 screen

A layer is as wide as its loop. Some are exactly 320 pixels, some are
wider (up to about 640), so the repeat is harder to spot. Place copies
side by side and they join without a seam.


THE LAYERS (back to front)
--------------------------

  file                     what it is             suggested speed
  layer_1_sky.png          sky and clouds         0.1
  layer_2_mountains.png    far mountains / sea    0.25
  layer_3_hills.png        hills / sea stacks     0.5
  layer_4_forest.png       trees / cliffs         1.0
  layer_5_foreground.png   ferns / shore          1.6

The sky layer is fully opaque. Every other layer has a transparent
background, so you can stack them in this order and draw your level
between any two of them.

Speed is how fast a layer moves compared to the camera. 1.0 moves with
the camera (the ground your player walks on usually sits here),
smaller numbers move slower and feel further away, and the foreground
moves faster than the camera. These are only suggestions - try other
values and see what feels right for your game.


USING THE LAYERS
----------------

For each layer, every frame:

  offset = (camera_x * speed) mod layer_width
  draw the layer at x = -offset, then again at x = -offset + width,
  and so on until the screen is covered

Most engines do this for you:

  Godot       ParallaxBackground + ParallaxLayer: set motion_scale.x to
              the speed and motion_mirroring.x to the layer width
              (Godot 4.3+: Parallax2D with scroll_scale and
              repeat_size)
  Unity       a tiled SpriteRenderer (Draw Mode: Tiled) per layer,
              moved by the camera position times the speed
  GameMaker   a background layer per sprite, with Horizontal Tile on and
              its x moved by camera x times the speed

Scale by whole numbers - 2x, 3x, 4x - and turn off smoothing so the
pixels stay crisp:

  Godot       set the texture Filter to Off (or Nearest)
  Unity       Filter Mode: Point, Compression: None
  GameMaker   untick "Interpolate colours between pixels"

The layers are 180 pixels tall to match a 320x180 screen. For a
1280x720 or 1920x1080 game, use the 320x180 files at 4x or 6x.


WANT MORE WORLDS?
-----------------

Nasha's Parallax Worlds has 8 scenes in the same style: the forest and
the coast from this pack, plus a snowy valley, a desert canyon,
floating sky islands, a volcano, a glowing mushroom cave and a misty
swamp. You can find it on my itch.io page.


USING THE PACK
--------------

You're welcome to use these backgrounds in your free and commercial
games and projects, and to edit, recolour and mix them however you
like. A credit is always lovely, but not required.

Please don't resell or share the backgrounds themselves (as they are
or modified), and don't use them to train AI models. The full terms are
in LICENSE.txt.


Have fun scrolling!
- Nasha
