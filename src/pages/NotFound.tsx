import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Home } from 'lucide-react'

export const NotFound: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full text-center space-y-6 bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm">
        <div className="bg-indigo-50 text-indigo-600 p-5 rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-inner shadow-indigo-100/50">
          <AlertCircle size={40} className="animate-bounce" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">404 Error</h1>
          <h2 className="text-lg font-bold text-slate-800">Page Not Found</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            The page you are looking for does not exist or has been moved. Use the controls below to navigate.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm hover:shadow-indigo-100 cursor-pointer"
          >
            <Home size={14} />
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
