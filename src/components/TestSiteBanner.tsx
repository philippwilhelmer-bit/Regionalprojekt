import React from 'react'

export function TestSiteBanner() {
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE !== 'true') {
    return null
  }

  return (
    <div
      role="banner"
      className="w-full bg-yellow-400 text-black text-center text-sm font-bold py-1 z-50"
    >
      TESTSEITE — Diese Seite ist nicht öffentlich zugänglich
    </div>
  )
}
