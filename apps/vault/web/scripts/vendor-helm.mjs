// vendor-helm.mjs — copy the Helm design-system assets + the React UMD builds into public/helm/
// so index.html can load them as CLASSIC scripts before the app module (PROCESS Stage-4 "WEB UI").
//
// The copied files ARE committed (see public/helm/*), so a fresh `vite build` works even if this
// script is skipped; it runs on predev/prebuild to keep the vendored copies in sync with the
// source-of-truth handoff dir and the installed React. Idempotent.
//
// Vault-specific note: this worktree has no npm install, so the React UMD may not be in
// node_modules. When that is the case we fall back to copying the UMD from a sibling app's
// already-vendored public/helm (notes / mission-control) so the committed copies stay present.
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

// 2. React UMD — the single global instance. Prefer the production min builds from node_modules;
//    fall back to a sibling app's vendored copy, then to the copy already committed here.
const reactUmd = join(webRoot, 'node_modules', 'react', 'umd', 'react.production.min.js');
const reactDomUmd = join(webRoot, 'node_modules', 'react-dom', 'umd', 'react-dom.production.min.js');
const siblings = ['notes', 'mission-control', 'board', 'chat', 'drive'];
// Prefer node_modules UMD; else copy from a sibling app's already-vendored public/helm;
// else keep whatever is already committed here (both `web/` and `frontend/` shapes exist).
function vendorReact(destName, nodeSrc) {
  if (copyInto(nodeSrc, dest, destName)) return true;
  for (const s of siblings) {
    for (const sub of ['web', 'frontend']) {
      const cand = join(repoRoot, 'apps', s, sub, 'public', 'helm', destName);
      if (existsSync(cand) && copyInto(cand, dest, destName)) {
        console.warn(`[vendor-helm] used sibling ${s}'s ${destName} (no node_modules UMD present)`);
        return true;
      }
    }
  }
  return existsSync(join(dest, destName)); // already committed → fine
}
const gotReact = vendorReact('react.production.min.js', reactUmd);
const gotReactDom = vendorReact('react-dom.production.min.js', reactDomUmd);
if (!gotReact || !gotReactDom) {
  console.warn(
    '[vendor-helm] React UMD not found in node_modules or any sibling app — run `npm install` first, ' +
      'then `npm run vendor`. (If the committed copies in public/helm already exist, the app still builds.)',
  );
}

console.log('[vendor-helm] vendored Helm + React UMD into', dest);
