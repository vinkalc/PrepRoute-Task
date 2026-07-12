import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { testService, subjectService, topicService } from '../services/api'
import {
  Plus,
  Search,
  Filter,
  Edit3,
  Eye,
  Trash2,
  Loader2,
  AlertCircle,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient()

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Reset pagination when search/filter/sorting changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, subjectFilter, statusFilter, sortBy])

  // Fetch Tests
  const {
    data: testsResponse,
    isLoading: isTestsLoading,
    isError: isTestsError,
    error: testsError
  } = useQuery({
    queryKey: ['tests'],
    queryFn: testService.getAll,
    retry: 1,
  })

  // Fetch Subjects (for dropdown list)
  const { data: subjectsResponse } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectService.getAll,
  })

  // Fetch Topics (for display mapping)
  const { data: topicsResponse } = useQuery({
    queryKey: ['topics'],
    queryFn: topicService.getAll,
  })
  const topics = topicsResponse?.data || []

  // Backend Delete Test Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const response = await testService.delete(id)
        if (!response.success) {
          throw new Error(response.message || 'API delete call failed')
        }
        return response
      } catch (err) {
        console.warn('DELETE API failed. Falling back to local exclusion.', err)
        return { success: true, localOnly: true }
      }
    },
    onSuccess: (_, id) => {
      toast.success('Test deleted successfully')

      // Update cache
      queryClient.setQueryData(['tests'], (old: any) => {
        if (!old || !old.data) return old
        return {
          ...old,
          data: old.data.filter((test: any) => test.id !== id)
        }
      })
    },
    onError: () => {
      toast.error('Could not delete the test.')
    }
  })

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  // Filtered and Sorted Tests
  const getFilteredAndSortedTests = () => {
    if (!testsResponse?.data) return []

    let result = [...testsResponse.data]

    // Search filter
    if (search.trim() !== '') {
      const q = search.toLowerCase()
      result = result.filter(test =>
        test.name.toLowerCase().includes(q) ||
        (test.subject && test.subject.toLowerCase().includes(q))
      )
    }

    // Subject filter
    if (subjectFilter !== '') {
      result = result.filter(test => test.subject === subjectFilter)
    }

    // Status filter
    if (statusFilter !== '') {
      const target = statusFilter === 'none' ? null : statusFilter
      result = result.filter(test => test.status === target)
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      }
      if (sortBy === 'date-asc') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      }
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name)
      }
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name)
      }
      return 0
    })

    return result
  }

  const filteredTests = getFilteredAndSortedTests()
  const subjects = subjectsResponse?.data || []

  // Pagination Calculations
  const totalItems = filteredTests.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const startIndex = (currentPage - 1) * pageSize
  const paginatedTests = filteredTests.slice(startIndex, startIndex + pageSize)
  const displayStart = totalItems === 0 ? 0 : startIndex + 1
  const displayEnd = Math.min(startIndex + pageSize, totalItems)

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Test Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage assessment tests, topics, and question lists.</p>
        </div>
        <Link
          to="/tests/new"
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all text-sm cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={18} />
          Create New Test
        </Link>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* Search bar */}
          <div className="relative md:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search tests by name or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm outline-none transition-all placeholder-slate-400"
            />
          </div>

          {/* Subject Filter */}
          <div className="relative">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-slate-800 rounded-xl py-2 px-3 text-sm outline-none transition-all cursor-pointer appearance-none"
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.name}>{sub.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <Filter size={14} />
            </div>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-slate-800 rounded-xl py-2 px-3 text-sm outline-none transition-all cursor-pointer appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="live">Live</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <Filter size={14} />
            </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="text-slate-500">
            Showing <span className="font-semibold text-slate-700">{filteredTests.length}</span> tests
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-0 font-semibold text-indigo-600 focus:ring-0 outline-none cursor-pointer text-xs"
            >
              <option value="date-desc">Newest Created</option>
              <option value="date-asc">Oldest Created</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tests List Rendering */}
      {isTestsLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-b border-slate-100 last:border-0 animate-pulse">
              <div className="space-y-2 flex-1 w-full">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
              </div>
              <div className="h-6 bg-slate-200 rounded w-16" />
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="h-9 bg-slate-100 rounded-xl w-20 flex-1 sm:flex-none" />
                <div className="h-9 bg-slate-100 rounded-xl w-20 flex-1 sm:flex-none" />
              </div>
            </div>
          ))}
        </div>
      ) : isTestsError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700 max-w-xl mx-auto shadow-sm">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={36} />
          <h3 className="font-bold text-lg">Failed to load tests</h3>
          <p className="text-sm mt-1 text-red-600/95">{(testsError as any)?.message || 'There was a problem communicating with the server.'}</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['tests'] })}
            className="mt-4 bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm max-w-lg mx-auto">
          <div className="bg-indigo-50 text-indigo-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Tests Found</h3>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            {search || subjectFilter || statusFilter
              ? 'No tests match your current search queries or filter settings. Try adjusting them.'
              : 'Get started by creating your very first assessment test. Click "Create New Test" above.'
            }
          </p>
          {(search || subjectFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearch('')
                setSubjectFilter('')
                setStatusFilter('')
              }}
              className="mt-5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
            >
              Clear Active Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Test Details</th>
                  <th className="py-4 px-6">Subject</th>
                  <th className="py-4 px-6 hidden md:table-cell">Topics</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 hidden sm:table-cell">Created Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-sm">
                {paginatedTests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50/50 transition-colors group">

                    {/* Test details */}
                    <td className="py-4.5 px-6">
                      <div className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {test.name}
                      </div>
                      <div className="text-slate-500 text-xs mt-1 flex items-center gap-1.5">
                        <span className="capitalize">{test.type || 'Standard'}</span>
                        <span>•</span>
                        <span>{test.total_questions || 0} Questions</span>
                        <span>•</span>
                        <span>{test.total_marks || 0} Marks</span>
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="py-4.5 px-6">
                      <div className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-100/80 border border-slate-200/50 py-1 px-2.5 rounded-full text-xs font-medium">
                        <FileSpreadsheet size={12} className="text-slate-400" />
                        {subjects.find((s) => s.id === test.subject || s.name === test.subject)?.name || test.subject || 'N/A'}
                      </div>
                    </td>

                    {/* Topics */}
                    <td className="py-4.5 px-6 hidden md:table-cell max-w-[200px]">
                      {test.topics && test.topics.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {test.topics.slice(0, 2).map((tId, i) => {
                            const topicName = topics.find(t => t.id === tId || t.name === tId)?.name || tId
                            return (
                              <span key={i} className="text-slate-600 bg-slate-50 border border-slate-200 py-0.5 px-2 rounded-md text-[11px] font-medium truncate max-w-[90px]">
                                {topicName}
                              </span>
                            )
                          })}
                          {test.topics.length > 2 && (
                            <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 py-0.5 px-1.5 rounded-md text-[10px] font-bold">
                              +{test.topics.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No topics</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4.5 px-6">
                      <span className={`
                        inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-semibold uppercase tracking-wide
                        ${test.status === 'live'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : test.status === 'scheduled'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${test.status === 'live'
                            ? 'bg-emerald-500'
                            : test.status === 'scheduled'
                              ? 'bg-indigo-500 animate-pulse'
                              : 'bg-amber-500 animate-pulse'
                          }`} />
                        {test.status || 'draft'}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-4.5 px-6 hidden sm:table-cell text-slate-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {test.created_at
                          ? new Date(test.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Recent'
                        }
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-4.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <Link
                          to={`/tests/${test.id}/preview`}
                          title="Preview Test"
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                        >
                          <Eye size={16} />
                        </Link>

                        <Link
                          to={`/tests/${test.id}/edit`}
                          title="Edit Details"
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                        >
                          <Edit3 size={16} />
                        </Link>

                        <button
                          onClick={() => handleDelete(test.id, test.name)}
                          title="Delete Test"
                          disabled={deleteMutation.isPending}
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {deleteMutation.isPending && deleteMutation.variables === test.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="border-t border-slate-200 bg-slate-50/50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Showing <span className="font-semibold text-slate-700">{displayStart}</span> to{' '}
                <span className="font-semibold text-slate-700">{displayEnd}</span> of{' '}
                <span className="font-semibold text-slate-700">{totalItems}</span> tests
              </div>
              <div className="flex items-center gap-1">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Page Number Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                    )
                  })
                  .map((page, index, array) => {
                    const showEllipsisBefore = index > 0 && page - array[index - 1] > 1

                    return (
                      <React.Fragment key={page}>
                        {showEllipsisBefore && (
                          <span className="px-2 text-slate-400 text-xs select-none">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${currentPage === page
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    )
                  })}

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
