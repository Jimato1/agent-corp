// state/uiStore.ts — selection, keyboard focus, active operation, layout, toasts.

import { create } from 'zustand';
import type { ReactNode } from 'react';

export type OpId = 'pages' | 'merge' | 'split' | 'rotate' | 'compress' | 'export';
export type SheetSize = 'compact' | 'comfortable' | 'large';

export interface ToastItem {
  id: string;
  status: 'neutral' | 'ok' | 'err' | 'proc';
  title: string;
  message?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

let toastSeq = 0;

interface UiState {
  activeOp: OpId;
  railCollapsed: boolean;
  sheetSize: SheetSize;
  selected: Set<string>;
  focusIndex: number;
  toasts: ToastItem[];

  setActiveOp: (op: OpId) => void;
  toggleRail: () => void;
  setSheetSize: (s: SheetSize) => void;

  setSelected: (ids: Set<string>) => void;
  clearSelection: () => void;
  setFocusIndex: (i: number) => void;

  pushToast: (t: Omit<ToastItem, 'id'>, ttlMs?: number) => string;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeOp: 'pages',
  railCollapsed: false,
  sheetSize: 'comfortable',
  selected: new Set<string>(),
  focusIndex: 0,
  toasts: [],

  setActiveOp: (op) => set({ activeOp: op }),
  toggleRail: () => set((s) => ({ railCollapsed: !s.railCollapsed })),
  setSheetSize: (sheetSize) => set({ sheetSize }),

  setSelected: (selected) => set({ selected }),
  clearSelection: () => set({ selected: new Set<string>() }),
  setFocusIndex: (focusIndex) => set({ focusIndex }),

  pushToast: (t, ttlMs = 4200) => {
    const id = `to${Date.now()}_${toastSeq++}`;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    if (ttlMs > 0) {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), ttlMs);
    }
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
