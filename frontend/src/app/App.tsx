import { useState } from 'react'
import reactLogo from '../assets/react.svg'
import viteLogo from '/logo.svg'
import '../App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    // Main container: centers content and sets full height
    <div className="flex flex-col items-center justify-center min-h-screen py-10 text-center">
      
      {/* Logos section */}
      <div className="flex justify-center gap-8 mb-8">
        <a href="https://vite.dev" target="_blank">
          <img 
            src={viteLogo} 
            className="h-24 w-24 object-contain transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa]" 
            alt="Vite logo" 
          />
        </a>
        <a href="https://react.dev" target="_blank">
          <img 
            src={reactLogo} 
            className="h-24 w-24 object-contain transition-all duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] animate-spin-slow" 
            alt="React logo" 
          />
        </a>
      </div>

      <h1 className="text-5xl font-bold mb-8">Vite + React</h1>

      {/* Card section */}
      <div className="p-8">
        <button 
          className="px-6 py-2 rounded-lg border border-transparent bg-slate-100 text-slate-900 font-medium cursor-pointer transition-colors hover:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/50 dark:bg-slate-800 dark:text-white"
          onClick={() => setCount((count) => count + 1)}
        >
          count is {count}
        </button>
        <p className="mt-6 text-slate-600 dark:text-slate-400">
          Edit <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-sm">src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <p className="text-slate-500 text-sm">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  )
}

export default App