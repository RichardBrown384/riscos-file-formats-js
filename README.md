# riscos-file-formats-js

## About

Javascript library for reading RISC OS Draw, Font, and Sprite [files][file-documentation].

## Installation

```bash
npm install git+https://github.com/RichardBrown384/riscos-file-formats-js.git
```

## Usage

To use in code

```javascript
const {Draw, Sprite, FontOutlines} = require('riscos-file-formats');

const draw = Draw.fromUint8Array(array);
const sprite = Sprite.fromUint8Array(array);
const outlines = FontOutlines.fromUint8Array(array);
```

The library has some scripts that can be used convert files into either SVG or PNG.

### draw:svg

To convert a Draw file to SVG you can use the following,

```bash
npm run draw:svg drawfile,aff drawfile.svg 
```

### font:outline:svg

To convert a Font Outlines file to SVG you can use the following,

```bash
npm run font:outline:svg outlines,ff6 outlines.svg
```

### sprite:png

To convert a Sprite file to PNGs you can use the following,

```bash
npm run sprite:png sprites,ff9
```

## Project status

The library is provided on an as-is basis.

---
[file-documentation]: http://www.riscos.com/support/developers/prm/fileformats.html
