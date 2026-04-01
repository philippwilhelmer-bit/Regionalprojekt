import React from 'react'
import config from '@/../bundesland.config'
import { LoginForm } from './login-form'
import { TestSiteBanner } from '@/components/TestSiteBanner'

export default function LoginPage() {
  return (
    <>
      <TestSiteBanner />
      <div className="min-h-screen flex items-center justify-center bg-parchment">
        <div className="bg-surface-elevated p-8 rounded-sm shadow-md w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6 text-ink font-headline">{config.siteName} Admin</h1>
          <LoginForm />
        </div>
      </div>
    </>
  )
}
