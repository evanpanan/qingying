# Third-Party Notices

## Dissolve Footer

`src/lib/particle-wordmark.ts` adapts the particle wordmark from
<https://dissolve.rselmi.com/footer.js>, part of Dissolve (dissolve-ui 0.0.7).
The footer is not a component in its CLI registry, so its Canvas implementation
was adapted for React lifecycle cleanup, dynamic reduced motion, keyboard access
and LightVid's branding. No React Native runtime is required.

Copyright (c) Dissolve contributors

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
