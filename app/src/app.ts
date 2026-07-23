import type { PropsWithChildren } from 'react'

import { initializeCloudBase } from '@/adapters/cloudbase'

import './app.scss'

function App({ children }: PropsWithChildren) {
  initializeCloudBase()
  return children
}

export default App
