# Asset and font licensing

- `background.svg` and `petal.svg`: original project artwork created for CAL-33
  on 2026-07-22. Copyright belongs to the Social Media Builder project owner;
  permitted for project use, modification and commercial output. No third-party
  media is embedded.
- `background.png` and `petal.png`: deterministic raster exports of the SVG
  sources for FFmpeg builds without an SVG decoder; the same license applies.
- Font: Noto Sans, Copyright 2012 The Noto Project Authors, licensed under the
  SIL Open Font License 1.1. Obtain font files from the official Noto repository:
  <https://github.com/notofonts/noto-fonts>. The font binary is deliberately not
  vendored here; renderer/container setup should pin a release/checksum.
- Audio: no audio asset is bundled. Null URLs mean silent output. Any future audio
  must carry a recorded source, license and HTTPS URL before use.
- Reference video: used only for high-level visual analysis. No frame, logo,
  font file, audio or media from it is redistributed in this template.
