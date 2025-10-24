import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import './style/globalStyles.scss'

createRoot(document.getElementById('root')!).render(<App />)
