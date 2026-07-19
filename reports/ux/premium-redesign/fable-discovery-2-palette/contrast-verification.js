// WCAG contrast checker for candidate palettes
function lum(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((l1 + 0.05) / (l2 + 0.05)).toFixed(2);
}

const palettes = {
  'B-light (cool instrument)': {
    paper: '#f3f6f9', raised: '#ffffff', tint: '#e8eef4',
    ink: '#10202e', ink2: '#415565', ink3: '#5a6e7e',
    accent: '#0f639c', accentInk: '#ffffff', danger: '#b3382e',
    pairs: [
      ['ink', 'paper'], ['ink2', 'paper'], ['ink3', 'paper'],
      ['ink3', 'raised'], ['ink3', 'tint'], ['accentInk', 'accent'],
      ['accent', 'paper'], ['accent', 'raised'], ['danger', 'paper'],
    ],
  },
  'B-dark': {
    paper: '#0e1319', raised: '#151c24', tint: '#19222c',
    ink: '#e9eef3', ink2: '#a9b9c7', ink3: '#8095a6',
    accent: '#6fb1e0', accentInk: '#08243c', danger: '#e08a80',
    pairs: [
      ['ink', 'paper'], ['ink2', 'paper'], ['ink3', 'paper'],
      ['ink3', 'raised'], ['ink3', 'tint'], ['accentInk', 'accent'],
      ['accent', 'paper'], ['accent', 'raised'], ['danger', 'paper'],
    ],
  },
  'C-light (porcelain & ink-blue)': {
    paper: '#fafaf8', raised: '#ffffff', tint: '#f0f2f2',
    ink: '#1d1d1a', ink2: '#54544c', ink3: '#6b6b62',
    accent: '#28577e', accentInk: '#f7fbff', danger: '#a63c31',
    quiet: '#e7eef4',
    pairs: [
      ['ink', 'paper'], ['ink2', 'paper'], ['ink3', 'paper'],
      ['ink3', 'raised'], ['ink3', 'tint'], ['accentInk', 'accent'],
      ['accent', 'paper'], ['accent', 'raised'], ['accent', 'quiet'], ['danger', 'paper'],
    ],
  },
  'C-dark': {
    paper: '#141619', raised: '#1c1f23', tint: '#212429',
    ink: '#ebeae4', ink2: '#b4b3a9', ink3: '#8f9089',
    accent: '#82b4dd', accentInk: '#0c2438', danger: '#dc8b81',
    quiet: '#1e2d3a',
    pairs: [
      ['ink', 'paper'], ['ink2', 'paper'], ['ink3', 'paper'],
      ['ink3', 'raised'], ['ink3', 'tint'], ['accentInk', 'accent'],
      ['accent', 'paper'], ['accent', 'raised'], ['accent', 'quiet'], ['danger', 'paper'],
    ],
  },
};

for (const [name, p] of Object.entries(palettes)) {
  console.log('\n== ' + name);
  for (const [a, b] of p.pairs) {
    const r = ratio(p[a], p[b]);
    const flag = r >= 4.5 ? 'AA ' : (r >= 3 ? 'AAlg' : 'FAIL');
    console.log(`  ${a} on ${b}: ${r}  ${flag}`);
  }
}
