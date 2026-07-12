import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '../schemas/auth'
import type { LoginFormValues } from '../schemas/auth'
import { authService } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import logo from '../assets/logo.png'
import mascot from '../assets/mascot.png'

export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userId: '',
      password: '',
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    console.log('Submitting credentials:', values)
    setIsLoading(true)
    try {
      const response = await authService.login(values.userId, values.password)
      console.log('API Response:', response)
      if (response.success && response.data) {
        login(response.data.token, response.data.user)
        toast.success(`Welcome back, ${response.data.user.username || 'Admin'}!`)
        navigate('/')
      } else {
        toast.error(response.message || 'Login failed. Please check credentials.')
      }
    } catch (error: any) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const onError = (formErrors: any) => {
    Object.values(formErrors).forEach((err: any) => {
      if (err?.message) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div className="min-h-[100dvh] bg-[#F7FBFF] flex flex-col md:flex-row font-sans">
      {/* Left Column - Mascot Illustration */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center bg-[#F7FBFF] p-8">
        <img
          src={mascot}
          alt="Mascot illustration"
          className="w-full max-h-[80vh] object-contain select-none pointer-events-none"
        />
      </div>

      {/* Right Column - Login Box */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-5">
        <div className="w-full h-full border border-blue-100 rounded-xl p-8 sm:p-12 md:px-25 shadow-sm flex flex-col justify-center min-h-[550px] bg-white">
          {/* Logo */}
          <div className="mb-8">
            <img src={logo} alt="Preproute Logo" className="h-8 object-contain" />
          </div>

          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Login
          </h2>
          <p className="text-slate-500 text-sm mt-1 mb-8">
            Use your company provided Login credentials
          </p>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
            {/* User ID field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block">
                User ID
              </label>
              <input
                type="text"
                placeholder="Enter User ID"
                {...register('userId')}
                disabled={isLoading}
                className={`w-full bg-white border ${errors.userId ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary focus:ring-blue-100'
                  } focus:ring-4 focus:outline-none text-slate-800 rounded-xl py-3 px-4 text-sm transition-all placeholder-slate-400 disabled:opacity-50`}
              />
              {errors.userId && (
                <p className="text-xs font-medium text-red-500 pl-1">{errors.userId.message}</p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  {...register('password')}
                  disabled={isLoading}
                  className={`w-full bg-white border ${errors.password ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary focus:ring-blue-100'
                    } focus:ring-4 focus:outline-none text-slate-800 rounded-xl py-3 px-4 pr-10 text-sm transition-all placeholder-slate-400 disabled:opacity-50`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-red-500 pl-1">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot password link */}
            <div className="text-left mt-2">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  toast('Please contact your administrator to reset your password.', {
                    icon: 'ℹ️',
                  })
                }}
                className="text-primary hover:text-primary-hover text-sm font-medium transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-hover text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Credentials reminder for staging */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs font-mono text-slate-400">
              For staging demo use:
              <br />
              <span className="text-primary font-semibold">vedant-admin</span> / <span className="text-primary font-semibold">vedant123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

