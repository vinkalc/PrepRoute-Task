import React, { useState, useEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LogOut,
  Menu,
} from 'lucide-react'
import logo from '../assets/logo.png'
import bell from '../assets/bell.png'
import avatar from '../assets/avatar.png'
import iconDashboard from '../assets/icon_dashboard.png'
import iconCreation from '../assets/icon_creation.png'
import iconTracking from '../assets/icon_tracking.png'

export const DashboardLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mainSidebarHovered, setMainSidebarHovered] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const location = useLocation()

  const isQuestionsPage = location.pathname.includes('/questions') || location.pathname.includes('/preview')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isQuestionsPage) setMainSidebarHovered(false)
  }, [isQuestionsPage])

  const navItems = [
    { name: 'Dashboard', path: '/', icon: iconDashboard },
    { name: 'Test Creation', path: '/tests/new', icon: iconCreation },
    { name: 'Test Tracking', path: '/tests/tracking', icon: iconTracking },
  ]

  const handleMainSidebarEnter = () => {
    if (!isQuestionsPage) return
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    setMainSidebarHovered(true)
  }
  const handleMainSidebarLeave = () => {
    if (!isQuestionsPage) return
    hoverTimeout.current = setTimeout(() => setMainSidebarHovered(false), 150)
  }

  const getBreadcrumbs = () => {
    if (location.pathname === '/tests/new' || location.pathname.includes('/edit')) {
      return [
        { name: 'Test Creation', path: '#' },
        { name: 'Create Test', path: '#' },
        { name: 'Chapter Wise', path: '#' },
      ]
    }
    if (isQuestionsPage) {
      return [
        { name: 'Test Creation', path: '/tests/new' },
        { name: 'Create Test', path: '#' },
        { name: 'Chapter Wise', path: '#' },
      ]
    }
    const paths = location.pathname.split('/').filter(Boolean)
    if (paths.length === 0) return [{ name: 'Dashboard', path: '/' }]

    const crumbs = [{ name: 'Home', path: '/' }]
    let currentPath = ''
    paths.forEach((p) => {
      currentPath += `/${p}`
      let name = p.charAt(0).toUpperCase() + p.slice(1)
      if (p === 'new') name = 'Create Test'
      if (p === 'edit') name = 'Edit Test'
      if (p === 'questions') name = 'Manage Questions'
      if (p === 'preview') name = 'Preview & Publish'
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(p)) name = 'Test Details'
      crumbs.push({ name, path: currentPath })
    })
    return crumbs
  }

  // ── Nav items for the sidebar (full & compact modes) ──
  const NavItems = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex-1 flex flex-col ${compact ? 'py-4 px-2' : 'p-4'} overflow-y-auto`}>
      <nav className={`${compact ? 'space-y-2' : 'space-y-1'}`}>
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)

          if (compact) {
            return (
              <Link
                key={item.name}
                to={item.path}
                title={item.name}
                className={`relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all group cursor-pointer
                  ${isActive ? 'bg-[#F5F8FF]' : 'hover:bg-slate-100'}`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full" />
                )}
                <img
                  src={item.icon}
                  alt={item.name}
                  className={`w-5 h-5 object-contain transition-transform group-hover:scale-110 ${isActive ? 'filter-primary' : 'opacity-60 group-hover:opacity-100'
                    }`}
                />
              </Link>
            )
          }

          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setMobileSidebarOpen(false)}
              className={`
                relative flex items-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all group cursor-pointer overflow-hidden
                ${isActive
                  ? 'bg-[#F5F8FF] text-primary pl-5 pr-4'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 pl-4 pr-4'
                }
              `}
            >
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-primary" />}
              <img
                src={item.icon}
                alt={item.name}
                className={`w-5 h-5 object-contain transition-transform duration-200 group-hover:scale-110 ${isActive ? 'filter-primary' : 'opacity-70 group-hover:opacity-100'
                  }`}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>


    </div>
  )

  return (
    <div className="flex flex-col h-screen w-screen bg-white overflow-hidden font-sans">

      {/* ════════════════════════════════════════════════════════════════
          FULL-WIDTH TOP HEADER — logo always visible, never collapses
      ════════════════════════════════════════════════════════════════ */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-40">
        {/* Logo — always on left, always visible */}
        <Link to="/" className="flex items-center flex-shrink-0">
          <img src={logo} alt="Preproute" className="h-8 object-contain" />
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-4">
          {/* Mobile hamburger — only on non-questions pages */}
          {!isQuestionsPage && (
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden text-slate-500 hover:text-slate-700 p-2 rounded-md cursor-pointer"
            >
              <Menu size={22} />
            </button>
          )}

          {/* Bell */}
          <button className="w-9 h-9 border border-slate-200 rounded-full flex items-center justify-center bg-white cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none">
            <img src={bell} alt="Notifications" className="w-[18px] h-[18px] object-contain" />
          </button>

          {/* Profile */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-3 cursor-pointer focus:outline-none select-none hover:opacity-90 transition-opacity"
            >
              <img src={avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
              <div className="text-left leading-tight hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-[20px] font-bold text-slate-800">Alex Wando</span>
                  <svg
                    width="10"
                    height="5"
                    viewBox="0 0 10 5"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-transform duration-200 ${profileMenuOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M5 5L0 0H10L5 5Z" fill="#374151" />
                  </svg>
                </div>
                <p className="text-[12px] text-slate-400 font-medium mt-0.5">Admin</p>
              </div>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer font-medium border-0 bg-transparent"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          BODY ROW — sidebar + content, sits below the header
      ════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── SIDEBAR ── */}
        {isQuestionsPage ? (
          // Questions page: icon-only strip (52px) + hover-overlay
          <div className="relative flex-shrink-0" style={{ width: 52 }}>
            {/* Icon-only strip */}
            <aside
              className="absolute inset-y-0 left-0 bg-white border-r border-slate-200 flex flex-col h-full z-20"
              style={{ width: 52 }}
              onMouseEnter={handleMainSidebarEnter}
              onMouseLeave={handleMainSidebarLeave}
            >
              <NavItems compact={true} />
            </aside>

            {/* Hover-expanded overlay */}
            {mainSidebarHovered && (
              <>
                <div
                  className="fixed inset-y-0 z-[29]"
                  style={{ left: 0, width: 52 }}
                  onMouseEnter={handleMainSidebarEnter}
                  onMouseLeave={handleMainSidebarLeave}
                />
                <aside
                  className="absolute inset-y-0 left-0 bg-white border-r border-slate-200 flex flex-col h-full shadow-xl z-30 animate-slide-in-left"
                  style={{ width: 256 }}
                  onMouseEnter={handleMainSidebarEnter}
                  onMouseLeave={handleMainSidebarLeave}
                >
                  <NavItems compact={false} />
                </aside>
              </>
            )}
          </div>
        ) : (
          // Normal pages: full sidebar (slides in/out on mobile)
          <aside
            className={`
              fixed lg:static inset-y-0 left-0 z-30 bg-white border-r border-slate-200
              transform ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
              transition-transform duration-200 ease-in-out flex flex-col flex-shrink-0
            `}
            style={{ width: 256, top: 64 /* push below the 64px header on mobile */ }}
          >
            <NavItems compact={false} />
          </aside>
        )}

        {/* Mobile overlay backdrop */}
        {mobileSidebarOpen && !isQuestionsPage && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 lg:hidden"
            style={{ top: 64 }}
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {isQuestionsPage ? (
            // Questions page: QuestionManagement owns its own breadcrumb + sidebar + editor
            <main className="flex-1 overflow-hidden bg-white">
              <Outlet />
            </main>
          ) : (
            // Normal pages: padded scrollable content
            <main className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6 bg-white">
              <nav className="flex items-center gap-1.5 text-[16px] font-medium text-black/60">
                {getBreadcrumbs().map((crumb, idx) => {
                  const isLast = idx === getBreadcrumbs().length - 1
                  return (
                    <React.Fragment key={`${crumb.path}-${idx}`}>
                      {idx > 0 && <span className="text-black/30 mx-1.5">/</span>}
                      {isLast ? (
                        <span className="text-black/80 font-semibold truncate max-w-[180px] sm:max-w-none">{crumb.name}</span>
                      ) : (
                        <Link to={crumb.path} className="hover:text-primary transition-colors text-black/60">
                          {crumb.name}
                        </Link>
                      )}
                    </React.Fragment>
                  )
                })}
              </nav>
              <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
                <Outlet />
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  )
}
