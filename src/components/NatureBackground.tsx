'use client'

import React from 'react'
import { GrainGradient } from '@paper-design/shaders-react'
import { useTheme } from '@/lib/theme'

interface Props { children: React.ReactNode }

export default function NatureBackground({ children }: Props) {
  const { isDark } = useTheme()

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Paper Design Shader Background */}
      <div className="fixed inset-0 -z-10">
        <GrainGradient
          style={{ height: '100%', width: '100%' }}
          colorBack={isDark ? 'hsl(0, 0%, 0%)' : 'hsl(40, 30%, 96%)'}
          softness={0.76}
          intensity={0.45}
          noise={0}
          shape="corners"
          offsetX={0}
          offsetY={0}
          scale={1}
          rotation={0}
          speed={1}
          colors={
            isDark
              ? ['hsl(14, 100%, 57%)', 'hsl(45, 100%, 51%)', 'hsl(340, 82%, 52%)']
              : ['hsl(140, 60%, 35%)', 'hsl(80, 55%, 45%)', 'hsl(200, 70%, 50%)']
          }
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
