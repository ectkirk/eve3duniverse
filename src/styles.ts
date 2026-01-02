import type { CSSProperties } from 'react'

export const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
}

export const centered: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
}

export const panelBackground: CSSProperties = {
  background: 'rgba(0,0,0,0.8)',
  borderRadius: '8px',
  padding: '20px',
}

export const hudPanel: CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  background: 'rgba(0,0,0,0.6)',
  padding: '10px 15px',
  borderRadius: '4px',
}

export const button: CSSProperties = {
  padding: '12px 40px',
  fontSize: '16px',
  cursor: 'pointer',
  color: '#fff',
  border: '1px solid #555',
  borderRadius: '4px',
}

export const systemControlPanel: CSSProperties = {
  position: 'absolute',
  top: '20px',
  right: '20px',
  background: 'rgba(0,0,0,0.7)',
  padding: '16px 20px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '14px',
  color: '#fff',
  minWidth: '160px',
}

export const toggleRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  cursor: 'pointer',
  padding: '6px 0',
}

export const checkbox: CSSProperties = {
  width: '16px',
  height: '16px',
  cursor: 'pointer',
  accentColor: '#6cf',
}

export const bodyList: CSSProperties = {
  maxHeight: '300px',
  overflowY: 'auto',
}

export const bodyListItem: CSSProperties = {
  padding: '6px 8px',
  cursor: 'pointer',
  borderRadius: '3px',
  transition: 'background 0.15s',
}

export const bodyListItemActive: CSSProperties = {
  background: 'rgba(100, 200, 255, 0.2)',
  color: '#6cf',
}
