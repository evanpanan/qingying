# Third-Party Notices

## Dissolve Footer

`src/lib/particle-wordmark.ts` adapts the particle wordmark from
<https://dissolve.rselmi.com/footer.js>, part of Dissolve (dissolve-ui 0.0.7).
The footer is not a component in its CLI registry, so its Canvas implementation
was adapted for React lifecycle cleanup, dynamic reduced motion, keyboard access
and LightVid's branding. No React Native runtime is required.

Copyright (c) Dissolve contributors

## Dissolve LikeButton

`src/components/dissolve/` was installed through `npx dissolve-ui add like-button --web`
from <https://dissolve.rselmi.com/components/like-button/> (dissolve-ui 0.0.8).
It includes the shared web engine and helpers. LightVid adapts the palette, localized
accessible labels and reduced-motion handling for its footer easter egg.
These files are also distributed under the following MIT license.

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

## Embedded Download Engine

LightVid runs yt-dlp locally in its own service and desktop process.
<https://github.com/yt-dlp/yt-dlp> uses the Unlicense; Python, PyInstaller,
yt-dlp-ejs and other bundled dependencies retain their respective licenses.
The sidecar includes package license files collected by PyInstaller.
LibreGet was an architectural reference only; its application source was not copied.

## Node.js

The desktop package includes Node.js to run supported JavaScript challenges
without requiring a separate user installation. Node.js and its dependencies
retain their respective licenses; the full distribution notice is in
`NODE_LICENSE`, bundled with the app. Windows CI fetches the corresponding
license for its runtime version.

## FFmpeg

The bundled FFmpeg includes libx264 and is subject to GPL distribution requirements.
Distributors must provide the corresponding source and build information.
See <https://ffmpeg.org/legal.html> and the engine provider's distribution details.
These notices do not grant a new license to the LightVid application itself.


## Desktop offline AI repair

ONNX Runtime Node 1.23.2: Microsoft, MIT License, https://github.com/microsoft/onnxruntime . Native runtime and its accompanying license/notices are bundled in desktop-ai/node_modules/onnxruntime-node.

LaMa / Big-LaMa: Roman Suvorov and contributors, Apache License 2.0, https://github.com/advimman/lama . ONNX export by Carve, https://huggingface.co/Carve/LaMa-ONNX at c3c0c9e468934d62e79c329e35d82dd09ff8c444. Model SHA-256: 1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6. The checksum-verified model is bundled with the desktop installer. The website does not run or download this model. Videos remain on the user's computer; no paid inference API is used.


## Free local speech translation

Transformers.js 3.8.1 (Hugging Face, Apache-2.0), https://github.com/huggingface/transformers.js . Speech inference uses ONNX Runtime 1.21.0 (Node) / 1.22 web build (MIT); notices remain in the installed packages.

Whisper-small by OpenAI (MIT), https://github.com/openai/whisper . Quantized ONNX export: https://huggingface.co/onnx-community/whisper-small , revision 36050c46d777d46dc4b5f43f6d90574fc38f8732. Encoder SHA-256: a43a83f3c5361cd591cfa7c36f14b43cf7cb22f47a415cc14a8d557be800fa92; merged decoder: ec07c3cbb64172c39791e26ee870a65ac22b458c36722bfe2776b3dbf741e0c9.

Kokoro 82M v1.0 and kokoro-js 1.2.1 (hexgrad, Apache-2.0), https://github.com/hexgrad/kokoro . Quantized model: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX , revision 1939ad2a8e416c0acfeecc08a694d14ef25f2231; SHA-256 fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478. Only af_heart and am_michael voices are exposed. Speech weights are downloaded to local cache on first use, rather than bundled.

phonemizer.js 1.2.1 (Xenova, Apache-2.0), https://github.com/xenova/phonemizer.js , includes eSpeak NG compiled to WebAssembly. eSpeak NG retains GPL-3.0-or-later, https://github.com/espeak-ng/espeak-ng . Sharp (Apache-2.0) / libvips (LGPL-2.1-or-later) render desktop captions; their bundled license files remain in node_modules. These dependencies retain their own distribution and corresponding-source requirements. The synthetic Chinese speech fixture under tests/fixtures is solely for automated pipeline verification.

## In-app updater

The desktop client uses the official Tauri updater and process plugins (MIT / Apache-2.0), https://github.com/tauri-apps/plugins-workspace . Update artifacts use the Tauri CLI minisign format and version-bound trusted comments; the client contains only the public verification key. The update signing key is independent from the app's macOS ad-hoc signature and is not distributed with the app or repository.
