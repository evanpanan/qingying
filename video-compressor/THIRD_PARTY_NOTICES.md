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


## Browser AI repair

ONNX Runtime Web: Microsoft, MIT License, https://github.com/microsoft/onnxruntime . The npm package includes its license and notices.

LaMa / Big-LaMa: Roman Suvorov and contributors, Apache License 2.0, https://github.com/advimman/lama . ONNX export by Carve, https://huggingface.co/Carve/LaMa-ONNX at c3c0c9e468934d62e79c329e35d82dd09ff8c444. Model SHA-256: 1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6 . Weights are downloaded on user action or imported locally; videos are processed in the browser. A mirror may serve identical checksum-verified weights if the primary download fails.
