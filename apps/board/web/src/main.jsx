// main.jsx — module entry. index.html has already loaded (classic scripts) the Helm CSS, the
// React/ReactDOM UMD globals, and _ds_bundle.js. We mount with the SAME global React.
import { App } from './app.jsx';

const ReactDOM = window.ReactDOM;
if (!ReactDOM || !ReactDOM.createRoot) {
  throw new Error('window.ReactDOM is missing — /helm/react-dom.production.min.js must load before the app module.');
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
