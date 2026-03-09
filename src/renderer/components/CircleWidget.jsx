import React from 'react'

/**
 * CircleWidget — a perfectly circular widget panel.
 * size: px diameter (default 160)
 * children: content to render inside the circle
 * glow color override
 */
export default function CircleWidget({ size = 160, color = '#00c8ff', className = '', style = {}, onClick, children }) {
  return (
    <div
      className={`circle-widget ${className}`}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** Small label inside a circle */
export function CLabel({ children, color = 'rgba(0,200,255,0.6)' }) {
  return (
    <span style={{
      fontFamily: 'Orbitron',
      fontSize: '0.48rem',
      color,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      textAlign: 'center',
      marginBottom: 2,
    }}>
      {children}
    </span>
  )
}

/** Large value inside a circle */
export function CValue({ children, color = '#c8eeff', size: fs = '1.1rem' }) {
  return (
    <span style={{
      fontFamily: 'Share Tech Mono',
      fontSize: fs,
      color,
      lineHeight: 1.1,
      textAlign: 'center',
    }}>
      {children}
    </span>
  )
}

/** Divider line between two values inside a circle */
export function CDivider({ color = 'rgba(0,200,255,0.15)' }) {
  return (
    <div style={{
      width: '55%',
      height: 1,
      background: `radial-gradient(ellipse at center, ${color} 0%, transparent 70%)`,
      margin: '3px 0',
    }} />
  )
}
