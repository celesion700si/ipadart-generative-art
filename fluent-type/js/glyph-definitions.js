/**
 * Parametric Glyph Definitions (UPM = 1000)
 * Metrics:
 *   Ascender:  800
 *   CapHeight: 720
 *   XHeight:   520
 *   Baseline:  0
 *   Descender: -200
 */

const FONT_METRICS = {
  unitsPerEm: 1000,
  ascender: 800,
  capHeight: 720,
  xHeight: 520,
  baseline: 0,
  descender: -200
};

// Deterministic pseudo-random per character for organic hand-drawn feel
function charSeed(ch) {
  const code = ch.charCodeAt(0);
  const s = Math.sin(code * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Helper to build an organic squircle/oval loop
function makeOvalLoop(cx, cy, rx, ry, tilt = 0, pinch = 0, segments = 8) {
  const pts = [];
  const scaleX = 1 - pinch * 0.35;
  const scaleY = 1 - pinch * 0.2;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const wobble = 1 + 0.04 * Math.sin(a * 3 + tilt * 4);
    let x = Math.cos(a) * rx * scaleX * wobble;
    let y = Math.sin(a) * ry * scaleY * wobble;
    // Slight tilt
    const rx2 = x * Math.cos(tilt) - y * Math.sin(tilt);
    const ry2 = x * Math.sin(tilt) + y * Math.cos(tilt);
    pts.push([cx + rx2, cy + ry2]);
  }
  return pts;
}

// Helper to build a D-shaped loop (flat left, curved right)
function makeDLoop(x0, y0, x1, y1, bulge = 1.0, pinch = 0) {
  const my = (y0 + y1) / 2;
  const h = (y1 - y0) / 2;
  const w = (x1 - x0) * (1 - pinch * 0.38);
  const right = x0 + w * bulge;
  return [
    [x0, y0],
    [x0 + w * 0.55, y0],
    [right, y0 + h * 0.42],
    [right, my],
    [right, y1 - h * 0.42],
    [x0 + w * 0.55, y1],
    [x0, y1]
  ];
}

const GLYPH_BLUEPRINTS = {
  ' ': () => ({ advanceWidth: 320, strokes: [], rings: [] }),

  // ==================== UPPERCASE A-Z ====================
  'A': ({ W, P, E }) => {
    const w = 540;
    const wy = lerp(160, 480, W);
    const topX = w * (0.5 + 0.05 * E);
    const pinch = 1 - P * 0.35;
    const barL = lerp(topX, 95, (720 - wy) / 720) * (1 + (1 - pinch) * 0.15);
    const barR = w - barL;
    return {
      advanceWidth: 640,
      strokes: [
        { pts: [[65, 0], [190, 360], [topX, 720]], flare: 1.15 },
        { pts: [[topX, 720], [360, 360], [w - 65, 0]], flare: 1.15 },
        { pts: [[barL, wy], [w * 0.5, wy + 18 * E], [barR, wy]], flare: 0.9 }
      ],
      rings: []
    };
  },

  'B': ({ W, P, E }) => {
    const wy = lerp(240, 500, W);
    const topW = 420 - 30 * E;
    const botW = 470 + 35 * E;
    return {
      advanceWidth: 590,
      strokes: [
        { pts: [[105, 0], [100, 360], [105, 720]], flare: 1.1 },
        { pts: [[105, 720], [290, 720], [topW, 640], [topW, wy + 55], [280, wy], [105, wy]], flare: 1.0 },
        { pts: [[105, wy], [310, wy], [botW, wy - 70], [botW, 85], [300, 0], [105, 0]], flare: 1.0 }
      ],
      rings: []
    };
  },

  'C': ({ P, E }) => {
    const gap = 120 * (1 - P * 0.4);
    return {
      advanceWidth: 580,
      strokes: [
        {
          pts: [
            [470, 560 + gap * 0.2],
            [360, 715],
            [185, 695],
            [85, 480],
            [85, 240],
            [190, 25],
            [375, 5],
            [480, 150 - gap * 0.2]
          ],
          flare: 1.2 + 0.2 * E
        }
      ],
      rings: []
    };
  },

  'D': ({ P, E, S }) => {
    const outer = makeDLoop(100, 0, 495 + 30 * E, 720, 1.05, 0);
    const inset = Math.max(40, S * 0.95);
    const hole = makeDLoop(100 + inset, inset, 495 + 30 * E - inset, 720 - inset, 1.0, P);
    return {
      advanceWidth: 610,
      strokes: [],
      rings: [{ outer, holes: [hole] }]
    };
  },

  'E': ({ W, E }) => {
    const wy = lerp(220, 520, W);
    return {
      advanceWidth: 540,
      strokes: [
        { pts: [[105, 0], [98, 360], [105, 720]], flare: 1.1 },
        { pts: [[105, 720], [270, 725 + 15 * E], [440, 715]], flare: 1.1 },
        { pts: [[105, wy], [250, wy - 10 * E], [385, wy]], flare: 0.95 },
        { pts: [[105, 0], [280, -8 * E], [455, 5]], flare: 1.1 }
      ],
      rings: []
    };
  },

  'F': ({ W, E }) => {
    const wy = lerp(220, 520, W);
    return {
      advanceWidth: 510,
      strokes: [
        { pts: [[105, 0], [98, 360], [105, 720]], flare: 1.1 },
        { pts: [[105, 720], [270, 725 + 15 * E], [435, 712]], flare: 1.15 },
        { pts: [[105, wy], [240, wy - 12 * E], [375, wy]], flare: 0.95 }
      ],
      rings: []
    };
  },

  'G': ({ W, P, E }) => {
    const wy = lerp(200, 460, W);
    return {
      advanceWidth: 610,
      strokes: [
        {
          pts: [
            [475, 575],
            [365, 715],
            [185, 695],
            [85, 480],
            [85, 240],
            [190, 25],
            [385, 10],
            [495, 160],
            [495, wy]
          ],
          flare: 1.15
        },
        { pts: [[315 + 30 * P, wy], [495, wy + 12 * E]], flare: 1.0 }
      ],
      rings: []
    };
  },

  'H': ({ W, E }) => {
    const wy = lerp(210, 530, W);
    return {
      advanceWidth: 620,
      strokes: [
        { pts: [[105, 0], [95 + 15 * E, 360], [105, 720]], flare: 1.15 },
        { pts: [[485, 0], [495 - 15 * E, 360], [485, 720]], flare: 1.15 },
        { pts: [[105, wy], [295, wy + 18 * E], [485, wy]], flare: 0.95 }
      ],
      rings: []
    };
  },

  'I': ({ E }) => ({
    advanceWidth: 320,
    strokes: [
      { pts: [[160, 0], [154 + 14 * E, 360], [160, 720]], flare: 1.2 },
      { pts: [[90, 720], [230, 720]], flare: 0.9 },
      { pts: [[90, 0], [230, 0]], flare: 0.9 }
    ],
    rings: []
  }),

  'J': ({ E }) => ({
    advanceWidth: 460,
    strokes: [
      {
        pts: [
          [345, 720],
          [350, 320],
          [320, 80],
          [200, -10],
          [85, 75 + 35 * E]
        ],
        flare: 1.15
      }
    ],
    rings: []
  }),

  'K': ({ W, E }) => {
    const wy = lerp(220, 500, W);
    return {
      advanceWidth: 590,
      strokes: [
        { pts: [[105, 0], [98, 360], [105, 720]], flare: 1.15 },
        { pts: [[465, 720], [285, 520], [115, wy]], flare: 1.1 },
        { pts: [[205, wy + 40], [345, 220], [485 + 20 * E, 0]], flare: 1.15 }
      ],
      rings: []
    };
  },

  'L': ({ E }) => ({
    advanceWidth: 500,
    strokes: [
      { pts: [[105, 720], [98, 360], [105, 0]], flare: 1.15 },
      { pts: [[105, 0], [275, -10 * E], [435, 8]], flare: 1.15 }
    ],
    rings: []
  }),

  'M': ({ W, E }) => {
    const midY = lerp(140, 420, W);
    return {
      advanceWidth: 720,
      strokes: [
        { pts: [[95, 0], [110, 380], [125, 720]], flare: 1.15 },
        { pts: [[125, 720], [245, 440], [360, midY]], flare: 1.0 },
        { pts: [[360, midY], [475, 440], [595, 720]], flare: 1.0 },
        { pts: [[595, 720], [610, 380], [625 + 15 * E, 0]], flare: 1.15 }
      ],
      rings: []
    };
  },

  'N': ({ E }) => ({
    advanceWidth: 620,
    strokes: [
      { pts: [[105, 0], [100, 360], [105, 720]], flare: 1.15 },
      { pts: [[105, 720], [305, 350 + 30 * E], [495, 0]], flare: 1.05 },
      { pts: [[495, 0], [500, 360], [495, 720]], flare: 1.15 }
    ],
    rings: []
  }),

  'O': ({ P, E, S }) => {
    const outer = makeOvalLoop(310, 360, 225 + 15 * E, 365, 0.06 * E, 0, 10);
    const inset = Math.max(42, S * 0.98);
    const hole = makeOvalLoop(310, 360, Math.max(30, 225 - inset), Math.max(45, 365 - inset), -0.06 * E, P, 10);
    return {
      advanceWidth: 620,
      strokes: [],
      rings: [{ outer, holes: [hole] }]
    };
  },

  'P': ({ W, P, E, S }) => {
    const wy = lerp(250, 490, W);
    const outer = makeDLoop(105, wy, 485 + 25 * E, 720, 1.05, 0);
    const inset = Math.max(36, S * 0.9);
    const hole = makeDLoop(105 + inset, wy + inset, 485 + 25 * E - inset, 720 - inset, 1.0, P);
    return {
      advanceWidth: 560,
      strokes: [{ pts: [[105, 0], [100, 360], [105, 720]], flare: 1.15 }],
      rings: [{ outer, holes: [hole] }]
    };
  },

  'Q': ({ P, E, S }) => {
    const outer = makeOvalLoop(310, 360, 225 + 15 * E, 365, 0.05 * E, 0, 10);
    const inset = Math.max(42, S * 0.98);
    const hole = makeOvalLoop(310, 360, Math.max(30, 225 - inset), Math.max(45, 365 - inset), 0, P, 10);
    return {
      advanceWidth: 630,
      strokes: [{ pts: [[345, 200], [435, 80], [545 + 25 * E, -40]], flare: 1.25 }],
      rings: [{ outer, holes: [hole] }]
    };
  },

  'R': ({ W, P, E, S }) => {
    const wy = lerp(260, 490, W);
    const outer = makeDLoop(105, wy, 480 + 20 * E, 720, 1.05, 0);
    const inset = Math.max(36, S * 0.9);
    const hole = makeDLoop(105 + inset, wy + inset, 480 + 20 * E - inset, 720 - inset, 1.0, P);
    return {
      advanceWidth: 580,
      strokes: [
        { pts: [[105, 0], [100, 360], [105, 720]], flare: 1.15 },
        { pts: [[280, wy + 15], [395, 180], [495 + 25 * E, 0]], flare: 1.2 }
      ],
      rings: [{ outer, holes: [hole] }]
    };
  },

  'S': ({ W, E }) => {
    const wy = lerp(260, 470, W);
    return {
      advanceWidth: 550,
      strokes: [
        {
          pts: [
            [445, 595],
            [335, 715],
            [165, 690],
            [115, 540],
            [215, wy + 30],
            [365, wy - 30],
            [465, 190],
            [390, 20],
            [195, 5],
            [90, 125 - 25 * E]
          ],
          flare: 1.2
        }
      ],
      rings: []
    };
  },

  'T': ({ E }) => ({
    advanceWidth: 540,
    strokes: [
      { pts: [[65, 715], [270, 728 + 12 * E], [475, 715]], flare: 1.15 },
      { pts: [[270, 720], [262 + 16 * E, 360], [270, 0]], flare: 1.2 }
    ],
    rings: []
  }),

  'U': ({ E }) => ({
    advanceWidth: 600,
    strokes: [
      {
        pts: [
          [105, 720],
          [105, 270],
          [170, 45],
          [300, 5],
          [430, 45],
          [495, 270],
          [495 + 12 * E, 720]
        ],
        flare: 1.15
      }
    ],
    rings: []
  }),

  'V': ({ E }) => ({
    advanceWidth: 590,
    strokes: [
      { pts: [[75, 720], [185, 360], [295 + 15 * E, 0]], flare: 1.15 },
      { pts: [[295 + 15 * E, 0], [405, 360], [515, 720]], flare: 1.15 }
    ],
    rings: []
  }),

  'W': ({ W, E }) => {
    const midY = lerp(340, 580, W);
    return {
      advanceWidth: 760,
      strokes: [
        { pts: [[65, 720], [140, 350], [215, 0]], flare: 1.15 },
        { pts: [[215, 0], [295, 240], [380, midY]], flare: 1.0 },
        { pts: [[380, midY], [465, 240], [545, 0]], flare: 1.0 },
        { pts: [[545, 0], [620, 350], [695 + 15 * E, 720]], flare: 1.15 }
      ],
      rings: []
    };
  },

  'X': ({ W, E }) => {
    const wy = lerp(240, 490, W);
    return {
      advanceWidth: 580,
      strokes: [
        { pts: [[85, 720], [290, wy], [495 + 15 * E, 0]], flare: 1.15 },
        { pts: [[495, 720], [290, wy], [85 - 15 * E, 0]], flare: 1.15 }
      ],
      rings: []
    };
  },

  'Y': ({ W, E }) => {
    const wy = lerp(210, 470, W);
    return {
      advanceWidth: 570,
      strokes: [
        { pts: [[80, 720], [185, 510], [285, wy]], flare: 1.15 },
        { pts: [[490, 720], [385, 510], [285, wy]], flare: 1.15 },
        { pts: [[285, wy], [280 + 12 * E, 160], [285, 0]], flare: 1.15 }
      ],
      rings: []
    };
  },

  'Z': ({ E }) => ({
    advanceWidth: 560,
    strokes: [
      { pts: [[90, 720], [280, 726 + 10 * E], [465, 718]], flare: 1.1 },
      { pts: [[465, 718], [280, 360], [90, 0]], flare: 1.05 },
      { pts: [[90, 0], [285, -8 * E], [475, 5]], flare: 1.1 }
    ],
    rings: []
  }),

  // ==================== LOWERCASE a-z ====================
  'a': ({ W, P, E, S }) => {
    const wy = lerp(180, 350, W);
    const outer = makeOvalLoop(260, wy * 0.56, 175, wy * 0.58, 0.08 * E, 0, 8);
    const inset = Math.max(32, S * 0.85);
    const hole = makeOvalLoop(260, wy * 0.56, Math.max(24, 175 - inset), Math.max(24, wy * 0.58 - inset), 0, P, 8);
    return {
      advanceWidth: 530,
      strokes: [
        { pts: [[120, 445], [275, 520], [420, 455], [430, 210], [435, 0]], flare: 1.1 }
      ],
      rings: [{ outer, holes: [hole] }]
    };
  },

  'b': ({ P, E, S }) => {
    const outer = makeOvalLoop(290, 260, 195 + 15 * E, 265, 0.05 * E, 0, 8);
    const inset = Math.max(34, S * 0.88);
    const hole = makeOvalLoop(290, 260, Math.max(26, 195 - inset), Math.max(30, 265 - inset), 0, P, 8);
    return {
      advanceWidth: 560,
      strokes: [{ pts: [[105, 800], [98, 400], [105, 0]], flare: 1.15 }],
      rings: [{ outer, holes: [hole] }]
    };
  },

  'c': ({ P, E }) => ({
    advanceWidth: 480,
    strokes: [
      {
        pts: [
          [400, 415 - 25 * P],
          [300, 515],
          [160, 490],
          [90, 320],
          [95, 180],
          [175, 15],
          [320, 5],
          [410, 105 + 25 * E]
        ],
        flare: 1.15
      }
    ],
    rings: []
  }),

  'd': ({ P, E, S }) => {
    const outer = makeOvalLoop(265, 260, 195 + 15 * E, 265, -0.05 * E, 0, 8);
    const inset = Math.max(34, S * 0.88);
    const hole = makeOvalLoop(265, 260, Math.max(26, 195 - inset), Math.max(30, 265 - inset), 0, P, 8);
    return {
      advanceWidth: 560,
      strokes: [{ pts: [[455, 800], [462, 400], [455, 0]], flare: 1.15 }],
      rings: [{ outer, holes: [hole] }]
    };
  },

  'e': ({ W, P, E }) => {
    const wy = lerp(210, 370, W);
    return {
      advanceWidth: 500,
      strokes: [
        { pts: [[100, wy], [280, wy + 12 * E], [425, wy + 5]], flare: 0.95 },
        {
          pts: [
            [425, wy + 10],
            [405, 435],
            [270, 520],
            [140, 455],
            [85, 260],
            [135, 65],
            [285, 5],
            [415, 95 - 25 * P]
          ],
          flare: 1.15
        }
      ],
      rings: []
    };
  },

  'f': ({ W, E }) => {
    const wy = lerp(340, 530, W);
    return {
      advanceWidth: 370,
      strokes: [
        { pts: [[315, 765], [240, 800], [175, 730], [170, 380], [175, 0]], flare: 1.15 },
        { pts: [[75, wy], [190, wy + 12 * E], [305, wy]], flare: 1.0 }
      ],
      rings: []
    };
  },

  'g': ({ P, E, S }) => {
    const outer = makeOvalLoop(265, 300, 185 + 12 * E, 225, 0.05 * E, 0, 8);
    const inset = Math.max(34, S * 0.85);
    const hole = makeOvalLoop(265, 300, Math.max(24, 185 - inset), Math.max(28, 225 - inset), 0, P, 8);
    return {
      advanceWidth: 550,
      strokes: [
        { pts: [[445, 515], [448, 220], [425, -90], [295, -195], [140, -165 + 25 * E]], flare: 1.15 }
      ],
      rings: [{ outer, holes: [hole] }]
    };
  },

  'h': ({ W, E }) => {
    const wy = lerp(340, 520, W);
    return {
      advanceWidth: 540,
      strokes: [
        { pts: [[105, 800], [98, 400], [105, 0]], flare: 1.15 },
        { pts: [[105, 360], [245, wy], [415, 465], [435 + 15 * E, 240], [435, 0]], flare: 1.15 }
      ],
      rings: []
    };
  },

  'i': ({ E }) => ({
    advanceWidth: 270,
    strokes: [
      { pts: [[135, 515], [130 + 10 * E, 260], [135, 0]], flare: 1.15 },
      { pts: [[132, 695], [140, 715]], flare: 1.35 }
    ],
    rings: []
  }),

  'j': ({ E }) => ({
    advanceWidth: 300,
    strokes: [
      { pts: [[195, 515], [195, 120], [170, -140], [75, -185 + 20 * E]], flare: 1.15 },
      { pts: [[192, 695], [200, 715]], flare: 1.35 }
    ],
    rings: []
  }),

  'k': ({ W, E }) => {
    const wy = lerp(170, 340, W);
    return {
      advanceWidth: 510,
      strokes: [
        { pts: [[105, 800], [98, 400], [105, 0]], flare: 1.15 },
        { pts: [[415, 515], [260, 370], [115, wy]], flare: 1.1 },
        { pts: [[205, wy + 30], [320, 140], [430 + 20 * E, 0]], flare: 1.15 }
      ],
      rings: []
    };
  },

  'l': ({ E }) => ({
    advanceWidth: 270,
    strokes: [{ pts: [[135, 800], [128 + 12 * E, 400], [145, 10]], flare: 1.15 }],
    rings: []
  }),

  'm': ({ E }) => ({
    advanceWidth: 740,
    strokes: [
      { pts: [[95, 515], [90, 260], [95, 0]], flare: 1.1 },
      { pts: [[95, 385], [210, 515], [355, 455], [365, 220], [365, 0]], flare: 1.1 },
      { pts: [[365, 385], [485, 515], [630, 455], [640 + 15 * E, 220], [640, 0]], flare: 1.1 }
    ],
    rings: []
  }),

  'n': ({ E }) => ({
    advanceWidth: 540,
    strokes: [
      { pts: [[105, 515], [98, 260], [105, 0]], flare: 1.1 },
      { pts: [[105, 370], [250, 520], [420, 455], [435 + 15 * E, 220], [435, 0]], flare: 1.15 }
    ],
    rings: []
  }),

  'o': ({ P, E, S }) => {
    const outer = makeOvalLoop(265, 260, 195 + 12 * E, 265, 0.08 * E, 0, 10);
    const inset = Math.max(36, S * 0.9);
    const hole = makeOvalLoop(265, 260, Math.max(26, 195 - inset), Math.max(30, 265 - inset), -0.06 * E, P, 10);
    return {
      advanceWidth: 530,
      strokes: [],
      rings: [{ outer, holes: [hole] }]
    };
  },

  'p': ({ P, E, S }) => {
    const outer = makeOvalLoop(285, 260, 195 + 12 * E, 265, 0.05 * E, 0, 8);
    const inset = Math.max(34, S * 0.88);
    const hole = makeOvalLoop(285, 260, Math.max(26, 195 - inset), Math.max(30, 265 - inset), 0, P, 8);
    return {
      advanceWidth: 550,
      strokes: [{ pts: [[105, 515], [98, 160], [105, -200]], flare: 1.15 }],
      rings: [{ outer, holes: [hole] }]
    };
  },

  'q': ({ P, E, S }) => {
    const outer = makeOvalLoop(265, 260, 195 + 12 * E, 265, -0.05 * E, 0, 8);
    const inset = Math.max(34, S * 0.88);
    const hole = makeOvalLoop(265, 260, Math.max(26, 195 - inset), Math.max(30, 265 - inset), 0, P, 8);
    return {
      advanceWidth: 550,
      strokes: [{ pts: [[455, 515], [462, 160], [455, -200]], flare: 1.15 }],
      rings: [{ outer, holes: [hole] }]
    };
  },

  'r': ({ E }) => ({
    advanceWidth: 380,
    strokes: [
      { pts: [[105, 515], [98, 260], [105, 0]], flare: 1.15 },
      { pts: [[105, 360], [215, 505], [325 + 20 * E, 490]], flare: 1.2 }
    ],
    rings: []
  }),

  's': ({ W, E }) => {
    const wy = lerp(190, 340, W);
    return {
      advanceWidth: 450,
      strokes: [
        {
          pts: [
            [365, 435],
            [270, 520],
            [135, 490],
            [105, 375],
            [210, wy + 20],
            [325, wy - 20],
            [375, 130],
            [305, 10],
            [155, 5],
            [80, 95 - 20 * E]
          ],
          flare: 1.15
        }
      ],
      rings: []
    };
  },

  't': ({ E }) => ({
    advanceWidth: 370,
    strokes: [
      { pts: [[165, 695], [160, 320], [175, 45], [295 + 15 * E, 15]], flare: 1.15 },
      { pts: [[65, 480], [180, 492 + 10 * E], [295, 480]], flare: 1.0 }
    ],
    rings: []
  }),

  'u': ({ E }) => ({
    advanceWidth: 540,
    strokes: [
      { pts: [[105, 515], [105, 190], [180, 15], [315, 15], [435, 150]], flare: 1.1 },
      { pts: [[435, 515], [442, 260], [435 + 10 * E, 0]], flare: 1.15 }
    ],
    rings: []
  }),

  'v': ({ E }) => ({
    advanceWidth: 510,
    strokes: [
      { pts: [[80, 515], [170, 250], [255 + 12 * E, 0]], flare: 1.15 },
      { pts: [[255 + 12 * E, 0], [340, 250], [430, 515]], flare: 1.15 }
    ],
    rings: []
  }),

  'w': ({ W, E }) => {
    const midY = lerp(240, 420, W);
    return {
      advanceWidth: 680,
      strokes: [
        { pts: [[65, 515], [130, 250], [195, 0]], flare: 1.1 },
        { pts: [[195, 0], [265, 180], [340, midY]], flare: 0.95 },
        { pts: [[340, midY], [415, 180], [485, 0]], flare: 0.95 },
        { pts: [[485, 0], [550, 250], [615 + 15 * E, 515]], flare: 1.1 }
      ],
      rings: []
    };
  },

  'x': ({ W, E }) => {
    const wy = lerp(180, 340, W);
    return {
      advanceWidth: 490,
      strokes: [
        { pts: [[80, 515], [245, wy], [410 + 15 * E, 0]], flare: 1.15 },
        { pts: [[410, 515], [245, wy], [80 - 15 * E, 0]], flare: 1.15 }
      ],
      rings: []
    };
  },

  'y': ({ E }) => ({
    advanceWidth: 510,
    strokes: [
      { pts: [[85, 515], [175, 250], [255, 0]], flare: 1.1 },
      { pts: [[430, 515], [320, 190], [215, -135], [115, -195 + 25 * E]], flare: 1.15 }
    ],
    rings: []
  }),

  'z': ({ E }) => ({
    advanceWidth: 480,
    strokes: [
      { pts: [[85, 515], [240, 522 + 10 * E], [395, 512]], flare: 1.1 },
      { pts: [[395, 512], [240, 255], [85, 0]], flare: 1.0 },
      { pts: [[85, 0], [245, -8 * E], [405, 5]], flare: 1.1 }
    ],
    rings: []
  }),

  // ==================== DIGITS 0-9 ====================
  '0': ({ P, E, S }) => {
    const outer = makeOvalLoop(290, 360, 200 + 12 * E, 365, 0.08 * E, 0, 10);
    const inset = Math.max(40, S * 0.95);
    const hole = makeOvalLoop(290, 360, Math.max(28, 200 - inset), Math.max(45, 365 - inset), 0, P, 10);
    return {
      advanceWidth: 580,
      strokes: [{ pts: [[185, 220], [395, 500]], flare: 0.75 }],
      rings: [{ outer, holes: [hole] }]
    };
  },

  '1': ({ E }) => ({
    advanceWidth: 420,
    strokes: [
      { pts: [[120, 560], [245, 720]], flare: 1.05 },
      { pts: [[245, 720], [240 + 12 * E, 360], [245, 0]], flare: 1.15 },
      { pts: [[125, 0], [345, 0]], flare: 0.95 }
    ],
    rings: []
  }),

  '2': ({ E }) => ({
    advanceWidth: 540,
    strokes: [
      {
        pts: [
          [100, 560],
          [215, 715],
          [385, 695],
          [445, 540],
          [350, 330],
          [110, 0]
        ],
        flare: 1.15
      },
      { pts: [[110, 0], [290, -10 * E], [465, 5]], flare: 1.15 }
    ],
    rings: []
  }),

  '3': ({ W, E }) => {
    const wy = lerp(280, 460, W);
    return {
      advanceWidth: 530,
      strokes: [
        {
          pts: [
            [115, 600],
            [270, 720],
            [425, 630],
            [405, 455],
            [235, wy]
          ],
          flare: 1.1
        },
        {
          pts: [
            [235, wy],
            [425, wy - 70],
            [455, 165],
            [330, 10],
            [135, 35 - 20 * E]
          ],
          flare: 1.15
        }
      ],
      rings: []
    };
  },

  '4': ({ W, E }) => {
    const wy = lerp(170, 340, W);
    return {
      advanceWidth: 560,
      strokes: [
        { pts: [[375, 720], [220, 450], [85, wy]], flare: 1.1 },
        { pts: [[85, wy], [285, wy + 10 * E], [475, wy]], flare: 1.05 },
        { pts: [[375, 720], [380, 360], [375, 0]], flare: 1.15 }
      ],
      rings: []
    };
  },

  '5': ({ W, E }) => {
    const wy = lerp(330, 490, W);
    return {
      advanceWidth: 540,
      strokes: [
        { pts: [[435, 715], [140, 715], [120, wy]], flare: 1.1 },
        { pts: [[120, wy], [295, wy + 40], [450, 290], [415, 75], [260, 5], [105, 70 - 20 * E]], flare: 1.15 }
      ],
      rings: []
    };
  },

  '6': ({ P, E, S }) => {
    const outer = makeOvalLoop(285, 225, 195 + 12 * E, 225, 0, 0, 8);
    const inset = Math.max(34, S * 0.88);
    const hole = makeOvalLoop(285, 225, Math.max(24, 195 - inset), Math.max(28, 225 - inset), 0, P, 8);
    return {
      advanceWidth: 560,
      strokes: [{ pts: [[375, 720], [185, 580], [95, 310], [100, 160]], flare: 1.15 }],
      rings: [{ outer, holes: [hole] }]
    };
  },

  '7': ({ E }) => ({
    advanceWidth: 520,
    strokes: [
      { pts: [[85, 715], [270, 725 + 12 * E], [445, 715]], flare: 1.1 },
      { pts: [[445, 715], [305, 360], [185, 0]], flare: 1.15 }
    ],
    rings: []
  }),

  '8': ({ W, P, E, S }) => {
    const wy = lerp(290, 440, W);
    const inset = Math.max(30, S * 0.85);
    const topOuter = makeOvalLoop(275, (720 + wy) / 2, 165, (720 - wy) / 2 + 15, 0.05 * E, 0, 8);
    const topHole = makeOvalLoop(275, (720 + wy) / 2, Math.max(20, 165 - inset), Math.max(20, (720 - wy) / 2 - inset * 0.85), 0, P, 8);
    const botOuter = makeOvalLoop(275, wy / 2, 195 + 10 * E, wy / 2 + 15, -0.05 * E, 0, 8);
    const botHole = makeOvalLoop(275, wy / 2, Math.max(22, 195 - inset), Math.max(22, wy / 2 - inset * 0.85), 0, P, 8);
    return {
      advanceWidth: 550,
      strokes: [],
      rings: [
        { outer: topOuter, holes: [topHole] },
        { outer: botOuter, holes: [botHole] }
      ]
    };
  },

  '9': ({ P, E, S }) => {
    const outer = makeOvalLoop(275, 495, 195 + 12 * E, 225, 0, 0, 8);
    const inset = Math.max(34, S * 0.88);
    const hole = makeOvalLoop(275, 495, Math.max(24, 195 - inset), Math.max(28, 225 - inset), 0, P, 8);
    return {
      advanceWidth: 560,
      strokes: [{ pts: [[465, 530], [455, 290], [350, 75], [175, 0]], flare: 1.15 }],
      rings: [{ outer, holes: [hole] }]
    };
  },

  // ==================== PUNCTUATION ====================
  '.': () => ({
    advanceWidth: 240,
    strokes: [{ pts: [[115, 25], [125, 45]], flare: 1.45 }],
    rings: []
  }),

  ',': ({ E }) => ({
    advanceWidth: 240,
    strokes: [{ pts: [[130, 55], [125, -25], [85, -105 - 15 * E]], flare: 1.25 }],
    rings: []
  }),

  '!': ({ E }) => ({
    advanceWidth: 270,
    strokes: [
      { pts: [[135, 720], [128 + 12 * E, 450], [135, 195]], flare: 1.15 },
      { pts: [[132, 25], [140, 45]], flare: 1.4 }
    ],
    rings: []
  }),

  '?': ({ E }) => ({
    advanceWidth: 460,
    strokes: [
      { pts: [[105, 565], [185, 715], [345, 700], [390, 540], [295, 385], [225, 260], [225, 195]], flare: 1.15 },
      { pts: [[222, 25], [230 + 10 * E, 45]], flare: 1.4 }
    ],
    rings: []
  }),

  '-': ({ E }) => ({
    advanceWidth: 380,
    strokes: [{ pts: [[85, 320], [190, 328 + 10 * E], [295, 320]], flare: 1.05 }],
    rings: []
  }),

  ':': () => ({
    advanceWidth: 240,
    strokes: [
      { pts: [[118, 410], [124, 430]], flare: 1.4 },
      { pts: [[118, 25], [124, 45]], flare: 1.4 }
    ],
    rings: []
  }),

  ';': () => ({
    advanceWidth: 240,
    strokes: [
      { pts: [[125, 410], [131, 430]], flare: 1.4 },
      { pts: [[135, 55], [125, -25], [85, -105]], flare: 1.25 }
    ],
    rings: []
  }),

  '\'': () => ({
    advanceWidth: 220,
    strokes: [{ pts: [[115, 720], [110, 620], [90, 535]], flare: 1.15 }],
    rings: []
  }),

  '"': () => ({
    advanceWidth: 340,
    strokes: [
      { pts: [[105, 720], [95, 545]], flare: 1.15 },
      { pts: [[235, 720], [225, 545]], flare: 1.15 }
    ],
    rings: []
  }),

  '(': ({ E }) => ({
    advanceWidth: 330,
    strokes: [{ pts: [[245, 760], [135, 520], [115, 260], [155, -20], [245 + 15 * E, -150]], flare: 1.1 }],
    rings: []
  }),

  ')': ({ E }) => ({
    advanceWidth: 330,
    strokes: [{ pts: [[85, 760], [195, 520], [215, 260], [175, -20], [85 - 15 * E, -150]], flare: 1.1 }],
    rings: []
  }),

  '/': () => ({
    advanceWidth: 420,
    strokes: [{ pts: [[345, 760], [210, 310], [75, -120]], flare: 1.1 }],
    rings: []
  }),

  '+': ({ W }) => {
    const wy = lerp(240, 420, W);
    return {
      advanceWidth: 520,
      strokes: [
        { pts: [[260, wy + 180], [260, wy - 180]], flare: 1.05 },
        { pts: [[80, wy], [440, wy]], flare: 1.05 }
      ],
      rings: []
    };
  },

  '&': ({ P, E }) => ({
    advanceWidth: 600,
    strokes: [
      {
        pts: [
          [475, 45],
          [225, 360],
          [145, 560],
          [240, 710],
          [375, 650],
          [340, 470],
          [115, 240],
          [115, 65],
          [275, 10],
          [465 - 30 * P, 230 + 25 * E]
        ],
        flare: 1.15
      }
    ],
    rings: []
  }),

  '@': ({ P, E }) => ({
    advanceWidth: 700,
    strokes: [
      {
        pts: [
          [460, 210],
          [425, 445],
          [285, 480],
          [195, 345],
          [235, 185],
          [385, 195],
          [475, 295],
          [535, 495],
          [370, 690],
          [145, 620],
          [75, 340],
          [165, 55],
          [440 - 30 * P, 15 + 20 * E]
        ],
        flare: 1.0
      }
    ],
    rings: []
  })
};

const GLYPH_CHAR_LIST = Object.keys(GLYPH_BLUEPRINTS);
