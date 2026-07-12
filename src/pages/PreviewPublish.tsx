import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { testService, questionService, subjectService, topicService } from '../services/api'
import { EditTestModal } from '../components/EditTestModal'
import type { Question } from '../types'
import {
  Loader2,
  AlertCircle,
  Calendar,
  ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'

// Import assets
import iconChevronRight from '../assets/icon_chevron_right.svg'
import iconDiamond from '../assets/icon_diamond.svg'
import iconBrain from '../assets/icon_brain.svg'
import iconPencilBlue from '../assets/icon_pencil_blue.svg'
import iconTimer from '../assets/icon_timer.svg'
import iconQuiz from '../assets/icon_quiz.svg'
import iconLeaderboard from '../assets/icon_leaderboard.svg'

export const PreviewPublish: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Publish controls states
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [liveUntilMode, setLiveUntilMode] = useState<'always' | '1week' | '2weeks' | '3weeks' | '1month' | 'custom'>('custom')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')

  // 1. Fetch Test details
  const { data: testResponse, isLoading: isTestLoading, error: testError } = useQuery({
    queryKey: ['test', id],
    queryFn: () => testService.getById(id!),
    enabled: !!id,
  })
  const testData = testResponse?.data

  // Fetch subjects to map names
  const { data: subjectsResponse } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectService.getAll,
    enabled: !!testData,
  })
  const subjects = subjectsResponse?.data || []

  // Fetch topics to map names
  const { data: topicsResponse } = useQuery({
    queryKey: ['topics', testData?.subject],
    queryFn: () => topicService.getBySubject(testData?.subject || ''),
    enabled: !!testData?.subject,
  })
  const topics = topicsResponse?.data || []

  // Fetch subtopics to map names
  const { data: subTopicsResponse } = useQuery({
    queryKey: ['subTopics', testData?.topics],
    queryFn: () => topicService.getByMultiTopics(testData?.topics || []),
    enabled: !!testData?.topics && testData.topics.length > 0,
  })
  const subTopics = subTopicsResponse?.data || []

  // 2. Fetch associated questions
  useEffect(() => {
    const fetchQuestions = async () => {
      if (testData?.questions && testData.questions.length > 0 && !isLoadingQuestions && questions.length === 0) {
        setIsLoadingQuestions(true)
        try {
          const response = await questionService.fetchBulk(testData.questions)
          if (response.success && response.data) {
            setQuestions(response.data)
          }
        } catch (err) {
          console.error('Failed to load preview questions:', err)
          toast.error('Failed to load test questions.')
        } finally {
          setIsLoadingQuestions(false)
        }
      }
    }
    fetchQuestions()
  }, [testData, questions.length, isLoadingQuestions])

  // Publish Test Mutation
  const publishMutation = useMutation({
    mutationFn: (details?: {
      publishMode: 'now' | 'schedule';
      scheduleDate?: string;
      scheduleTime?: string;
      liveUntilMode?: string;
      endDate?: string;
      endTime?: string;
    }) => testService.publish(id!, details),
    onSuccess: (response) => {
      const isScheduled = response.data?.status === 'scheduled'
      toast.success(isScheduled ? 'Test scheduled successfully!' : 'Test published successfully! It is now live.')
      queryClient.invalidateQueries({ queryKey: ['tests'] })
      queryClient.invalidateQueries({ queryKey: ['test', id] })
      navigate('/')
    },
    onError: () => {
      toast.error('Failed to publish the test. Please try again.')
    }
  })

  const handleConfirmPublish = () => {
    if (publishMode === 'schedule') {
      if (!scheduleDate) {
        toast.error('Please select a publish date.')
        return
      }
      if (!scheduleTime) {
        toast.error('Please select a publish time.')
        return
      }
    }

    if (liveUntilMode === 'custom') {
      if (!endDate) {
        toast.error('Please select an end date.')
        return
      }
      if (!endTime) {
        toast.error('Please select an end time.')
        return
      }
    }

    publishMutation.mutate({
      publishMode,
      scheduleDate,
      scheduleTime,
      liveUntilMode,
      endDate,
      endTime
    })
  }

  const isLoading = isTestLoading || isLoadingQuestions

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Loader2 size={36} className="text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Generating test preview...</p>
      </div>
    )
  }

  if (testError || !testData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700 max-w-xl mx-auto shadow-sm">
        <AlertCircle className="mx-auto text-red-500 mb-3" size={36} />
        <h3 className="font-bold text-lg">Test Details Not Found</h3>
        <button onClick={() => navigate('/')} className="mt-4 bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-2 px-4 rounded-xl text-xs">
          Go Back to Dashboard
        </button>
      </div>
    )
  }

  // Use dynamic target questions from the test details
  const totalTarget = testData.total_questions || testData.questions?.length || 3
  const subjectName = subjects.find(s => s.id === testData?.subject || s.name === testData?.subject)?.name || testData?.subject || '—'
  const topicNames = testData?.topics?.map(tId => {
    return topics.find(t => t.id === tId || t.name === tId)?.name || tId
  }) || []
  const subTopicNames = testData?.sub_topics?.map(sId => {
    return subTopics.find(s => s.id === sId || s.name === sId)?.name || sId
  }) || []
  const difficultyLabel =
    testData.difficulty === 'easy' ? 'Easy' : testData.difficulty === 'hard' ? 'Hard' : 'Medium'

  const sidebarSlots = Array.from({ length: totalTarget }, (_, i) => ({
    index: i,
    label: `Question ${i + 1}`,
  }))

  return (
    <div className="flex h-full w-full overflow-hidden bg-white relative">
      {/* ── LEFT SIDEBAR ───────────────────────────────────────────── */}
      <aside
        className="flex-shrink-0 bg-white flex flex-col overflow-hidden transition-all duration-200"
        style={{ width: sidebarOpen ? '240px' : '0px', borderRight: sidebarOpen ? '1px solid #e2e8f0' : 'none' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-2 flex-shrink-0">
          <span className="text-[17px] font-bold text-slate-800 whitespace-nowrap tracking-tight">
            Question creation
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex-shrink-0 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 14L8 10L12 6" stroke="#7B8CDE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 14L12 10L16 6" stroke="#7B8CDE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Total Questions */}
        <div className="px-5 pb-5 flex-shrink-0">
          <p className="text-[15px] text-slate-500 font-medium whitespace-nowrap">
            Total Questions
            <span className="text-slate-400 mx-1.5">.</span>
            <span className="font-bold text-slate-700 text-[17px]">{totalTarget}</span>
          </p>
        </div>

        {/* Question List (All completed in preview page) */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {sidebarSlots.map((slot) => (
            <div
              key={slot.index}
              className="w-full flex items-center gap-3 px-3.5 py-3.5 rounded-2xl text-left border border-emerald-400 bg-white"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="flex-shrink-0">
                <circle cx="11" cy="11" r="11" fill="#16a34a" />
                <path d="M7 11L9.8 13.8L15 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="flex-1 text-[13.5px] font-semibold truncate text-emerald-650">
                {slot.label}
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                <path d="M4.5 11.5L8 8L4.5 4.5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8.5 11.5L12 8L8.5 4.5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ))}
        </div>
      </aside>

      {/* Sidebar open button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex-shrink-0 flex items-center justify-center w-5 bg-white border-r border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
          title="Expand question list"
        >
          <img src={iconChevronRight} alt="Expand" className="w-3 h-3" />
        </button>
      )}

      {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6 w-full mx-auto">
            {/* Page title row */}
            <div className="pb-1">
              <span className="text-[16px] text-black/60 font-medium tracking-tight">Test creation</span>
            </div>
            {/* Header row with Title and completion badge */}
            <div className="flex items-center gap-4">
              <h1 className="text-[16px] font-bold text-slate-800 tracking-tight">Test created</h1>
              <span className="flex items-center gap-2 border border-[#0C9D61] bg-white px-4 py-2.5 rounded-2xl text-[12px] font-medium text-[#0C9D61]">
                <span className="w-5 h-5 rounded-full bg-[#0C9D61] flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.5 4L3.83333 6.33333L8.5 1.66667" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                All {totalTarget} Questions done
              </span>
            </div>

            {/* ── Test Info Card (Chapter Wise Card) ────────────────────── */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="bg-[#0B1229] text-white text-[14px] font-semibold px-5 py-2 rounded-full">
                  Chapter Wise
                </span>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img src={iconPencilBlue} alt="Edit" className="w-[18px] h-[18px]" />
                </button>
              </div>

              {/* Second Row: Diamond Smiley, Title & Difficulty Badge */}
              <div className="flex items-center gap-3">
                <img src={iconDiamond} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                <span className="text-[16px] font-bold text-slate-900 capitalize">
                  {testData.name}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-[#2AB7A9] text-white text-[14px] font-normal px-4 py-1.5 rounded-lg">
                  <img src={iconBrain} alt="" className="w-3.5 h-3.5 object-contain brightness-0 invert" />
                  {difficultyLabel}
                </span>
              </div>

              {/* Details Section */}
              <div className="space-y-3.5 pt-2">
                {/* Subject */}
                <div className="flex items-center text-[14px]">
                  <span className="w-24 text-slate-500 font-normal">Subject</span>
                  <span className="text-slate-400 mr-3.5">:</span>
                  <span className="text-[16px] text-slate-800 font-semibold">{subjectName}</span>
                </div>

                {/* Topic */}
                <div className="flex items-start text-[14px]">
                  <span className="w-24 text-slate-500 font-normal mt-1.5">Topic</span>
                  <span className="text-slate-400 mr-3.5 mt-1.5">:</span>
                  <div className="flex flex-wrap gap-2">
                    {topicNames.length > 0 ? (
                      topicNames.map((t, idx) => (
                        <span key={idx} className="text-[14px] font-medium text-[#FFC82C] border border-[#FFC82C] px-4 py-1.5 rounded-xl bg-white">
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic font-medium">—</span>
                    )}
                  </div>
                </div>

                {/* Sub Topic */}
                <div className="flex items-start text-[14px]">
                  <span className="w-24 text-slate-500 font-normal mt-1.5">Sub Topic</span>
                  <span className="text-slate-400 mr-3.5 mt-1.5">:</span>
                  <div className="flex flex-wrap gap-2">
                    {subTopicNames.length > 0 ? (
                      subTopicNames.map((s, idx) => (
                        <span key={idx} className="text-[14px] font-medium text-[#FFC82C] border border-[#FFC82C] px-4 py-1.5 rounded-xl bg-white">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic font-medium">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Row (Bottom Right) */}
              <div className="flex justify-end pt-2">
                <div className="inline-flex items-center border border-[#E5E7EB] rounded-xl px-0 py-2 bg-white divide-x divide-[#E5E7EB] ">
                  {/* Timer */}
                  <div className="flex items-center gap-2 px-4 text-[14px] text-slate-500 font-semibold">
                    <img src={iconTimer} alt="" className="w-[18px] h-[18px] object-contain opacity-70" />
                    {testData.total_time} Min
                  </div>
                  {/* Total Questions */}
                  <div className="flex items-center gap-2 px-4 text-[14px] text-slate-500 font-semibold">
                    <img src={iconQuiz} alt="" className="w-[18px] h-[18px] object-contain opacity-70" />
                    {totalTarget} Q's
                  </div>
                  {/* Total Marks */}
                  <div className="flex items-center gap-2 px-4 text-[14px] text-slate-500 font-semibold">
                    <img src={iconLeaderboard} alt="" className="w-[18px] h-[18px] object-contain opacity-70" />
                    {testData.total_marks} Marks
                  </div>
                </div>
              </div>
            </div>

            {/* ── Publish Mode Segmented Control ───────────────────────── */}
            <div className="flex p-1 rounded-xl w-fit border border-[#E2E8F0] bg-[#F5F7FF]">
              <button
                type="button"
                onClick={() => setPublishMode('now')}
                className={`px-6 py-2 rounded-lg text-[14.5px] transition-all cursor-pointer ${
                  publishMode === 'now'
                    ? 'bg-white border border-[#E2E8F0] shadow-xs text-[#0B1229] font-bold'
                    : 'bg-transparent text-[#9CA3AF] font-medium border border-transparent'
                }`}
              >
                Publish Now
              </button>
              <button
                type="button"
                onClick={() => setPublishMode('schedule')}
                className={`px-6 py-2 rounded-lg text-[14.5px] transition-all cursor-pointer ${
                  publishMode === 'schedule'
                    ? 'bg-white border border-[#E2E8F0] shadow-xs text-[#0B1229] font-bold'
                    : 'bg-transparent text-[#9CA3AF] font-medium border border-transparent'
                }`}
              >
                Schedule Publish
              </button>
            </div>

            {/* ── Select Date and Time Section (Schedule Mode Only) ─────── */}
            {publishMode === 'schedule' && (
              <div className="space-y-4 pt-2 animate-fade-in">
                <div>
                  <h3 className="text-[16px] font-bold text-slate-800">Select Date and Time</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Select Date */}
                  <div className="relative">
                    <input
                      type={scheduleDate ? "date" : "text"}
                      onFocus={(e) => { e.target.type = "date"; e.target.showPicker?.(); }}
                      onBlur={(e) => { if (!scheduleDate) e.target.type = "text"; }}
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className={`w-full border border-slate-200 rounded-xl py-3.5 pl-4 pr-11 text-sm bg-white outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 cursor-pointer ${
                        scheduleDate ? 'text-slate-850 font-medium' : 'text-slate-400'
                      }`}
                      placeholder="Select Date"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                      <Calendar size={17} />
                    </div>
                  </div>

                  {/* Select Time */}
                  <div className="relative">
                    <input
                      type={scheduleTime ? "time" : "text"}
                      onFocus={(e) => { e.target.type = "time"; e.target.showPicker?.(); }}
                      onBlur={(e) => { if (!scheduleTime) e.target.type = "text"; }}
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className={`w-full border border-slate-200 rounded-xl py-3.5 pl-4 pr-11 text-sm bg-white outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 cursor-pointer ${
                        scheduleTime ? 'text-slate-850 font-medium' : 'text-slate-400'
                      }`}
                      placeholder="Select Time"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown size={17} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Live Until Section ───────────────────────────────────── */}
            <div className="space-y-4 pt-2">
              <div>
                <h3 className="text-[16px] font-bold text-slate-800">Live Until</h3>
                <p className="text-slate-500 text-[14px] font-normal mt-1">
                  Choose how long this test should remain available on the platform.
                </p>
              </div>

              {/* Radio Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                {[
                  { id: 'always', label: 'Always Available' },
                  { id: '3weeks', label: '3 Weeks' },
                  { id: '1week', label: '1 Week' },
                  { id: '1month', label: '1 Month' },
                  { id: '2weeks', label: '2 Weeks' },
                  { id: 'custom', label: 'Custom Duration' },
                ].map((opt) => (
                  <label key={opt.id} className="flex items-center gap-3 text-[14px] text-slate-600 font-normal cursor-pointer select-none group">
                    <input
                      type="radio"
                      name="liveUntil"
                      checked={liveUntilMode === opt.id}
                      onChange={() => setLiveUntilMode(opt.id as any)}
                      className="w-5 h-5 text-indigo-650 border-slate-300 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                      style={{ accentColor: '#6366f1' }}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* Custom Date & Time Fields (Shows when Custom Duration is checked) */}
              {liveUntilMode === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 animate-fade-in">
                  {/* Select End Date */}
                  <div className="relative">
                    <input
                      type={endDate ? "date" : "text"}
                      onFocus={(e) => { e.target.type = "date"; e.target.showPicker?.(); }}
                      onBlur={(e) => { if (!endDate) e.target.type = "text"; }}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={`w-full border border-slate-200 rounded-xl py-3.5 pl-4 pr-11 text-sm bg-white outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 cursor-pointer ${
                        endDate ? 'text-slate-850 font-medium' : 'text-slate-400'
                      }`}
                      placeholder="Select End Date"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                      <Calendar size={17} />
                    </div>
                  </div>

                  {/* Select End Time */}
                  <div className="relative">
                    <input
                      type={endTime ? "time" : "text"}
                      onFocus={(e) => { e.target.type = "time"; e.target.showPicker?.(); }}
                      onBlur={(e) => { if (!endTime) e.target.type = "text"; }}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={`w-full border border-slate-200 rounded-xl py-3.5 pl-4 pr-11 text-sm bg-white outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 cursor-pointer ${
                        endTime ? 'text-slate-850 font-medium' : 'text-slate-400'
                      }`}
                      placeholder="Select End Time"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown size={17} />
                    </div>
                  </div>
                </div>
              )}
            </div>



            {/* ── Footer Action Buttons ────────────────────────────────── */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100 mt-8 pb-10">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-[160px] h-[48px] flex items-center justify-center bg-[#F5F7FF] hover:bg-[#EBEFFF] text-[#4F62FF] rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={publishMutation.isPending}
                className="w-[160px] h-[48px] flex items-center justify-center bg-[#637CFF] hover:bg-[#4F62FF] text-white rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 gap-2"
              >
                {publishMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <EditTestModal
        testId={id!}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaveSuccess={() => queryClient.invalidateQueries({ queryKey: ['test', id] })}
      />
    </div>
  )
}
