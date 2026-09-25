// Fails when a colour is hardcoded outside src/styles/tokens.css.
// Flags hex colours and rgb()/rgba()/hsl()/hsla() in .css/.ts/.tsx, plus named colour
// keywords in CSS declaration values. Prints file:line for each hit; exits 1 on any hit.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'src')
const SKIP = new Set(['src/styles/tokens.css'])
const EXTENSIONS = /\.(css|ts|tsx)$/

const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi
const COLOR_FN = /(?<![\w-])(?:rgba?|hsla?)\s*\(/gi

// CSS named colours (transparent and currentColor are allowed on purpose).
const NAMED = [
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
  'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
  'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
  'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta',
  'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
  'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink',
  'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
  'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow',
  'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
  'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
  'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue',
  'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
  'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
  'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
  'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
  'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
  'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
  'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
  'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
  'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
  'whitesmoke', 'yellow', 'yellowgreen',
]
const NAMED_RE = new RegExp(`(?<![\\w-])(?:${NAMED.join('|')})(?![\\w-])`, 'gi')
// A declaration value ends at ; or }, never at { (that would be a selector like a:hover {).
const DECLARATION = /[\w-]+\s*:\s*([^;{}]+)(?=[;}])/g

/** Blanks out a match but keeps its newlines, so line numbers stay correct. */
const blank = (text) => text.replace(/[^\n]/g, ' ')

function stripComments(source, isCss) {
  const block = source.replace(/\/\*[\s\S]*?\*\//g, blank)
  // `//` starts a comment in TS only when it is not part of a URL like http://
  return isCss ? block : block.replace(/(^|[^:\\])\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(lead.length)))
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (EXTENSIONS.test(entry.name)) yield path
  }
}

function lineOf(text, index) {
  let line = 1
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++
  return line
}

const hits = []

for (const path of walk(SRC)) {
  const file = relative(ROOT, path).split(sep).join('/')
  if (SKIP.has(file)) continue
  const isCss = file.endsWith('.css')
  const text = stripComments(readFileSync(path, 'utf8'), isCss)
  const report = (index, found) => hits.push(`${file}:${lineOf(text, index)}  ${found}`)

  for (const m of text.matchAll(HEX)) report(m.index, m[0])
  for (const m of text.matchAll(COLOR_FN)) report(m.index, `${m[0].replace(/\s*\($/, '')}()`)

  if (isCss) {
    for (const decl of text.matchAll(DECLARATION)) {
      // Drop custom property names (var(--red-500)) so only real keywords match.
      const value = decl[1].replace(/--[\w-]+/g, (m) => blank(m))
      const offset = decl.index + decl[0].length - decl[1].length
      for (const m of value.matchAll(NAMED_RE)) report(offset + m.index, m[0])
    }
  }
}

if (hits.length > 0) {
  hits.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  console.error(`Hardcoded colours found (use a token from src/styles/tokens.css):\n${hits.join('\n')}`)
  process.exit(1)
}
console.log('check-colors: no hardcoded colours')
