import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Icon } from '../components/ds/Icon';

export interface DropzoneProps {
  onFile: (file: File) => void;
  error?: { message: string; code: string } | null;
}

/** Empty board with the drop target (idle / drop-active) and calm local error. */
export function Dropzone({ onFile, error }: DropzoneProps) {
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  if (error) {
    return (
      <div className="wb-drop">
        <div className="wb-drop__err">
          <div style={{
            maxWidth: 460, display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px',
            borderRadius: 'var(--r-panel)', background: 'var(--sub-800)', border: '1px solid var(--sub-600)', borderLeft: '3px solid var(--err-500)',
          }}>
            <span style={{ color: 'var(--err-500)', display: 'inline-flex', marginTop: 1, flex: 'none' }}><Icon name="alert" size={18} /></span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>{error.message}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-700)' }}>It never left your device.</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{error.code}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="wb-drop"
      onDragOver={(e) => { e.preventDefault(); setActive(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setActive(false); }}
      onDrop={handleDrop}
    >
      <button
        type="button"
        className={`wb-drop__target${active ? ' is-active' : ''}`}
        onClick={() => inputRef.current?.click()}
      >
        <span className="wb-drop__icon"><Icon name="file" size={34} strokeWidth={1.6} /></span>
        <h1 className="wb-drop__h1">Drop a PDF to open it</h1>
        <span className="wb-drop__sub">Stays on this device — nothing uploaded</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
    </div>
  );
}

export default Dropzone;
