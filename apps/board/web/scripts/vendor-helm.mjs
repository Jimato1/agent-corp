// vendor-helm.mjs — copy the Helm design-system assets + the React UMD builds into public/helm/
// so index.html can load them as CLASSIC scripts before the app module (BUILD_SPEC "WEB UI").
//
// The copied files ARE committed (see public/helm/*), so a fresh `vite build` works even if this
// script is skipped; it runs on predev/prebuild to keep the vendored copies in sync with the
// source-of-truth handoff dir and the installed React. Idempotent.
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, '..');
const repoRoot = resolve(webRoot, '..', '..', '..');
const handoff = join(repoRoot, 'context', 'design', 'handoff', 'helm-design-system', 'project');
const dest = join(webRoot, 'public', 'helm');

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}
function copyInto(src, dstDir, rename) {
  if (!existsSync(src)) {
    console.warn(`[vendor-helm] missing source (skipped): ${src}`);
    return false;
  }
  ensureDir(dstDir);
  copyFileSync(src, join(dstDir, rename || src.split(/[\\/]/).pop()));
  return true;
}
function copyDir(src, dstDir) {
  ensureDir(dstDir);
  for (const name of readdirSync(src)) {
    const s = join(src, name);
    if (statSync(s).isDirectory()) copyDir(s, join(dstDir, name));
    else copyFileSync(s, join(dstDir, name));
  }
}

ensureDir(dest);

// 1. Helm design system: the bundle, the CSS entry, and the whole tokens/ dir (verbatim).
copyInto(join(handoff, '_ds_bundle.js'), dest);
copyInto(join(handoff, 'styles.css'), dest);
if (existsSync(join(handoff, 'tokens'))) copyDir(join(handoff, 'tokens'), join(dest, 'tokens'));

// 2. React UMD — the single global instance. Prefer the production min builds from node_modules.
const reactUmd = join(webRoot, 'node_modules', 'react', 'umd', 'react.production.min.js');
const reactDomUmd = join(webRoot, 'node_modules', 'react-dom', 'umd', 'react-dom.production.min.js');
const gotReact = copyInto(reactUmd, dest, 'react.production.min.js');
const gotReactDom = copyInto(reactDomUmd, dest, 'react-dom.production.min.js');
if (!gotReact || !gotReactDom) {
  console.warn(
    '[vendor-helm] React UMD not found in node_modules yet — run `npm install` first, then `npm run vendor`. ' +
      '(If the committed copies in public/helm already exist, the app still builds.)',
  );
}

console.log('[vendor-helm] vendored Helm + React UMD into', dest);
