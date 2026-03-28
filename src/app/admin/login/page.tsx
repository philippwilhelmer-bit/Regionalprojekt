import React from 'react'
import config from '@/../bundesland.config'
import { LoginForm } from './login-form'
import { TestSiteBanner } from '@/components/TestSiteBanner'

export default function LoginPage() {
  return (
    <>
      <TestSiteBanner />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">{config.siteName} Admin</h1>
          <LoginForm />
        </div>
      </div>
    </>
  )
}
