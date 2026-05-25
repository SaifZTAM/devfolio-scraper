'use client'

import { useTheme } from '@/lib/theme'

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme()

  return (
    <div className="flex items-center">
      <label className="relative inline-block cursor-pointer" style={{ width: 90, height: 40, border: '1px solid #444', borderRadius: 22 }}>
        <input
          type="checkbox"
          className="opacity-0 w-0 h-0 absolute"
          checked={isDark}
          onChange={toggle}
        />
        <span
          className="absolute inset-0 rounded-[20px] overflow-hidden z-10 transition-all duration-400"
          style={{ background: '#000' }}
        >
          {/* Stars (light/day mode — right side) */}
          <span className={`absolute right-[6px] top-0 bottom-0 transition-all duration-700 ${isDark ? '-translate-y-[40px] opacity-0' : 'translate-y-0 opacity-100'}`}>
            <svg className="dn-star absolute top-[5px] right-[29px] w-[20px] fill-white" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"/></svg>
            <svg className="dn-star-d300 absolute top-[18px] right-[9px] w-[15px] fill-white" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"/></svg>
            <svg className="dn-star-d600 absolute top-[5px] right-[15px] w-[10px] fill-white" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"/></svg>
            <svg className="dn-star-d900 absolute top-[26px] right-[28px] w-[12px] fill-white" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"/></svg>
            <svg className="dn-star-d1200 absolute top-[2px] right-[50px] w-[8px] fill-white" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"/></svg>
          </span>

          {/* Dots (light mode — left) */}
          <span className={`absolute transition-all duration-700 ${isDark ? 'translate-x-[52px] opacity-0' : ''}`}>
            <span className="absolute bg-gray-500 rounded-full" style={{ width: 5, height: 5, top: 26, left: 20 }} />
            <span className="absolute bg-gray-500 rounded-full" style={{ width: 10, height: 10, top: 16, left: 7 }} />
            <span className="absolute bg-gray-500 rounded-full" style={{ width: 4, height: 4, top: 12, left: 21 }} />
          </span>

          {/* Dark clouds (grey) */}
          <span
            className={`absolute top-0 bottom-0 transition-all duration-700 ${isDark ? 'opacity-60' : 'opacity-0 -translate-x-[55px]'}`}
            style={{ left: 6, width: 20 }}
          >
            <span className="dn-cloud absolute bg-gray-600 rounded-full" style={{ width: 20, height: 20, top: 1, right: 3 }} />
            <span className="dn-cloud absolute bg-gray-600 rounded-full" style={{ width: 20, height: 20, top: 15, left: 9 }} />
            <span className="dn-cloud absolute bg-gray-600 rounded-full" style={{ width: 20, height: 20, top: 20, left: 27 }} />
          </span>

          {/* White clouds */}
          <span
            className={`absolute top-0 bottom-0 z-[1] transition-all duration-700 ${isDark ? 'opacity-100' : 'opacity-0 -translate-x-[55px]'}`}
            style={{ left: 6, width: 20 }}
          >
            {[
              { w: 21, h: 21, t: 0, r: 14 },
              { w: 25, h: 25, t: 14, r: 6 },
              { w: 23, h: 23, t: 28, l: 4 },
              { w: 20, h: 20, t: 26, l: 20 },
              { w: 20, h: 20, t: 30, l: 30 },
              { w: 20, h: 20, t: 27, l: 46 },
              { w: 20, h: 20, t: 31, l: 58 },
            ].map((s, i) => (
              <span key={i} className="dn-cloud absolute bg-white rounded-full" style={{ width: s.w, height: s.h, top: s.t, right: s.r, left: s.l }} />
            ))}
          </span>

          {/* Knob — sun (light) → moon/orange (dark) */}
          <span
            className="absolute rounded-full transition-all duration-700"
            style={{
              width: 30, height: 30,
              left: isDark ? 56 : 4,
              bottom: 5,
              background: isDark ? '#FB923C' : '#FFFFFF',
            }}
          />
        </span>
      </label>
    </div>
  )
}
