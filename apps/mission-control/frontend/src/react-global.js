// The ONE React binding for the whole app. Every JSX module gets
// `import React from '/src/react-global.js'` injected by vite.config.js (jsxInject), so every
// `React.createElement` resolves to the SAME global UMD instance that Helm's _ds_bundle.js uses.
// Never `import 'react'` from npm anywhere in app code — that would create a second React and hooks
// would fail across the Helm/app component boundary.
const React = window.React;
if (!React) {
  throw new Error(
    'window.React is missing — /helm/react.production.min.js must load (classic script) before the app module.',
  );
}
export default React;
