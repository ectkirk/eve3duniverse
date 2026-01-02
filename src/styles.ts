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
