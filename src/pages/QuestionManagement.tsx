import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { questionSchema } from '../schemas/question'
import type { QuestionFormValues } from '../schemas/question'
import { testService, questionService, topicService, subjectService } from '../services/api'
import type { Question } from '../types'
import {
  Loader2,
  AlertCircle,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table2,
  BarChart2,
  Code,
  Subscript,
} from 'lucide-react'
import toast from 'react-hot-toast'
import iconChevronRight from '../assets/icon_chevron_right.svg'
import iconDiamond from '../assets/icon_diamond.svg'
import iconBrain from '../assets/icon_brain.svg'
import iconPencilBlue from '../assets/icon_pencil_blue.svg'
import iconTimer from '../assets/icon_timer.svg'
import iconQuiz from '../assets/icon_quiz.svg'
import iconLeaderboard from '../assets/icon_leaderboard.svg'
import iconAddMcq from '../assets/icon_add_mcq.svg'
import iconImportCsv from '../assets/icon_import_csv.svg'
import iconTrashRed from '../assets/icon_trash_red.svg'
import iconTrashGrey from '../assets/icon_trash_grey.svg'
import { EditTestModal } from '../components/EditTestModal'


export const QuestionManagement: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Current question index being edited (0-based)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [questionsList, setQuestionsList] = useState<Omit<Question, 'created_at'>[]>([])
  const [isLoadingExisting, setIsLoadingExisting] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // ─── Fetch Test Details ────────────────────────────────────────────────
  const { data: testResponse, isLoading: isTestLoading, error: testError } = useQuery({
    queryKey: ['test', id],
    queryFn: () => testService.getById(id!),
    enabled: !!id,
  })
  const testData = testResponse?.data

  // ─── Fetch Subjects → Topics → SubTopics ──────────────────────────────
  const { data: subjectsResponse } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectService.getAll,
    enabled: !!testData,
  })

  const [matchedSubjectId, setMatchedSubjectId] = useState<string>('')
  useEffect(() => {
    if (testData && subjectsResponse?.data) {
      const sub = subjectsResponse.data.find(
        (s: any) => s.name === testData.subject || s.id === testData.subject
      )
      if (sub) setMatchedSubjectId(sub.id)
    }
  }, [testData, subjectsResponse])

  const { data: topicsResponse } = useQuery({
    queryKey: ['topics', matchedSubjectId],
    queryFn: () => topicService.getBySubject(matchedSubjectId),
    enabled: !!matchedSubjectId,
  })
  const topics = topicsResponse?.data || []

  const [topicIds, setTopicIds] = useState<string[]>([])
  useEffect(() => {
    if (testData?.topics && topics.length > 0) {
      const ids = testData.topics
        .map((tName: string) => {
          const found = topics.find((t: any) => t.name === tName || t.id === tName)
          return found ? found.id : null
        })
        .filter(Boolean) as string[]
      setTopicIds(ids)
    }
  }, [testData, topics])

  const { data: subTopicsResponse } = useQuery({
    queryKey: ['subTopics', topicIds],
    queryFn: () => topicService.getByMultiTopics(topicIds),
    enabled: topicIds.length > 0,
  })
  const subTopics = subTopicsResponse?.data || []

  // ─── Load Existing Questions ───────────────────────────────────────────
  useEffect(() => {
    const fetchExistingQuestions = async () => {
      if (
        testData?.questions &&
        testData.questions.length > 0 &&
        questionsList.length === 0 &&
        !isLoadingExisting
      ) {
        setIsLoadingExisting(true)
        try {
          const response = await questionService.fetchBulk(testData.questions)
          if (response.success && response.data) {
            setQuestionsList(response.data)
          }
        } catch (err) {
          toast.error('Failed to retrieve associated questions.')
        } finally {
          setIsLoadingExisting(false)
        }
      }
    }
    fetchExistingQuestions()
  }, [testData, questionsList.length, isLoadingExisting])

  // ─── Question Form ─────────────────────────────────────────────────────
  const emptyForm: QuestionFormValues = {
    question: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct_option: 'option1',
    explanation: '',
    difficulty: 'medium',
    topic_id: '',
    sub_topic_id: '',
    media_url: '',
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema) as any,
    defaultValues: emptyForm,
  })

  const watchQuestionTopic = watch('topic_id')
  const watchCorrectOption = watch('correct_option')
  const filteredSubTopicsForQuestion = subTopics.filter(
    (s: any) => s.topic_id === watchQuestionTopic
  )

  // Sync form with current question in list
  useEffect(() => {
    const q = questionsList[currentIndex]
    if (q) {
      reset({
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correct_option: q.correct_option,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'medium',
        topic_id: q.topic_id || '',
        sub_topic_id: q.sub_topic_id || '',
        media_url: q.media_url || '',
      })
    } else {
      reset(emptyForm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questionsList.length])

  // ─── Save current form data to list ───────────────────────────────────
  const onSaveQuestion = (values: QuestionFormValues) => {
    const questionData: Omit<Question, 'created_at'> = {
      type: 'mcq',
      question: values.question,
      option1: values.option1,
      option2: values.option2,
      option3: values.option3,
      option4: values.option4,
      correct_option: values.correct_option,
      explanation: values.explanation || '',
      difficulty: values.difficulty || 'medium',
      test_id: id!,
      topic_id: values.topic_id || undefined,
      sub_topic_id: values.sub_topic_id || undefined,
      media_url: values.media_url || undefined,
    }

    const existingId = questionsList[currentIndex]?.id
    if (existingId) questionData.id = existingId

    const updated = [...questionsList]
    updated[currentIndex] = questionData
    setQuestionsList(updated)
    toast.success(`Question ${currentIndex + 1} saved`)

    // Move to next question
    const nextIndex = currentIndex + 1
    setCurrentIndex(nextIndex)
    // If moving to a new slot that doesn't exist yet, clear form
    if (!updated[nextIndex]) {
      reset(emptyForm)
    }
  }

  const handleDeleteCurrentQuestion = () => {
    if (!window.confirm('Remove this question?')) return
    const updated = questionsList.filter((_, idx) => idx !== currentIndex)
    setQuestionsList(updated)
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
    toast.success('Question removed')
  }

  const handleDeleteAllEdits = () => {
    if (!window.confirm('Delete all questions? This cannot be undone.')) return
    setQuestionsList([])
    setCurrentIndex(0)
    reset(emptyForm)
    toast.success('All questions cleared')
  }

  // ─── Bulk Save & Continue ──────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (customList?: Omit<Question, 'created_at'>[]) => {
      const listToSave = customList || questionsList
      if (listToSave.length === 0) throw new Error('Minimum of 1 question is required')
      const bulkResponse = await questionService.bulkCreate(listToSave)
      if (!bulkResponse.success || !bulkResponse.data) throw new Error('Bulk question upload failed')
      const questionIds = bulkResponse.data.map((q) => q.id!)
      const marksPerCorrect = testData?.correct_marks || 4
      await testService.update(id!, {
        name: testData?.name,
        questions: questionIds,
        total_questions: questionIds.length,
        total_marks: questionIds.length * marksPerCorrect,
      })
      return id
    },
    onSuccess: (testId: any) => {
      toast.success('Questions saved successfully')
      queryClient.invalidateQueries({ queryKey: ['test', testId] })
      queryClient.invalidateQueries({ queryKey: ['tests'] })
      navigate(`/tests/${testId}/preview`)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error saving questions.')
    },
  })

  const handleNext = () => {
    // Get current form values
    const currentValues = watch()
    const hasAnyContent = !!(
      currentValues.question?.trim() ||
      currentValues.option1?.trim() ||
      currentValues.option2?.trim() ||
      currentValues.option3?.trim() ||
      currentValues.option4?.trim() ||
      currentValues.explanation?.trim()
    );

    const isLastQuestion = currentIndex === totalTarget - 1

    if (hasAnyContent) {
      // User has typed some content in the current form, try to validate and save it first
      handleSubmit((values) => {
        const questionData: Omit<Question, 'created_at'> = {
          type: 'mcq',
          question: values.question,
          option1: values.option1,
          option2: values.option2,
          option3: values.option3,
          option4: values.option4,
          correct_option: values.correct_option,
          explanation: values.explanation || '',
          difficulty: values.difficulty || 'medium',
          test_id: id!,
          topic_id: values.topic_id || undefined,
          sub_topic_id: values.sub_topic_id || undefined,
          media_url: values.media_url || undefined,
        }

        const existingId = questionsList[currentIndex]?.id
        if (existingId) questionData.id = existingId

        const updated = [...questionsList]
        updated[currentIndex] = questionData
        setQuestionsList(updated)
        toast.success(`Question ${currentIndex + 1} saved`)

        if (isLastQuestion) {
          // Verify all questions are filled
          const missingSlots: number[] = []
          for (let i = 0; i < totalTarget; i++) {
            if (!updated[i]) {
              missingSlots.push(i + 1)
            }
          }

          if (missingSlots.length > 0) {
            toast.error(`Please add all questions before publishing. Missing: ${missingSlots.join(', ')}`)
            return
          }

          saveMutation.mutate(updated)
        } else {
          // Go to next question slot
          const nextIndex = currentIndex + 1
          setCurrentIndex(nextIndex)
          if (!updated[nextIndex]) {
            reset(emptyForm)
          }
        }
      })()
    } else {
      // No content in current form, check if we are on the last question to publish
      if (isLastQuestion) {
        // Verify all questions are filled
        const missingSlots: number[] = []
        for (let i = 0; i < totalTarget; i++) {
          if (!questionsList[i]) {
            missingSlots.push(i + 1)
          }
        }

        if (missingSlots.length > 0) {
          toast.error(`Please add all questions before publishing. Missing: ${missingSlots.join(', ')}`)
          return
        }

        saveMutation.mutate(questionsList)
      } else {
        // Just go to the next question slot
        const nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
        if (!questionsList[nextIndex]) {
          reset(emptyForm)
        }
      }
    }
  }

  const handleHeaderPublish = () => {
    const currentValues = watch()
    const hasAnyContent = !!(
      currentValues.question?.trim() ||
      currentValues.option1?.trim() ||
      currentValues.option2?.trim() ||
      currentValues.option3?.trim() ||
      currentValues.option4?.trim() ||
      currentValues.explanation?.trim()
    );

    if (hasAnyContent) {
      handleSubmit((values) => {
        const questionData: Omit<Question, 'created_at'> = {
          type: 'mcq',
          question: values.question,
          option1: values.option1,
          option2: values.option2,
          option3: values.option3,
          option4: values.option4,
          correct_option: values.correct_option,
          explanation: values.explanation || '',
          difficulty: values.difficulty || 'medium',
          test_id: id!,
          topic_id: values.topic_id || undefined,
          sub_topic_id: values.sub_topic_id || undefined,
          media_url: values.media_url || undefined,
        }

        const existingId = questionsList[currentIndex]?.id
        if (existingId) questionData.id = existingId

        const updated = [...questionsList]
        updated[currentIndex] = questionData
        setQuestionsList(updated)
        toast.success(`Question ${currentIndex + 1} saved`)

        const validQuestions = updated.filter(Boolean)
        if (validQuestions.length === 0) {
          toast.error('Minimum of 1 question is required')
          return
        }

        saveMutation.mutate(updated)
      })()
    } else {
      const validQuestions = questionsList.filter(Boolean)
      if (validQuestions.length === 0) {
        toast.error('Minimum of 1 question is required')
        return
      }

      saveMutation.mutate(questionsList)
    }
  }

  // Use dynamic target questions from the test details
  const totalTarget = testData?.total_questions || 3
  const subjectName = subjectsResponse?.data?.find(s => s.id === testData?.subject || s.name === testData?.subject)?.name || testData?.subject || '—'
  const topicNames = testData?.topics?.map(tId => {
    return topics.find(t => t.id === tId || t.name === tId)?.name || tId
  }) || []
  const subTopicNames = testData?.sub_topics?.map(sId => {
    return subTopics.find(s => s.id === sId || s.name === sId)?.name || sId
  }) || []
  const difficultyLabel =
    testData?.difficulty === 'easy' ? 'Easy' : testData?.difficulty === 'hard' ? 'Hard' : 'Medium'

  // Build dynamic sidebar question slots based on totalTarget
  const sidebarSlots = Array.from({ length: totalTarget }, (_, i) => ({
    index: i,
    label: `Question ${i + 1}`,
    completed: !!questionsList[i],
  }))

  const isLoading = isTestLoading || isLoadingExisting
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Loader2 size={36} className="text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Retrieving test template and questions...</p>
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

        {/* Question List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {sidebarSlots.map((slot) => {
            const isActive = slot.index === currentIndex
            const isCompleted = slot.completed

            return (
              <button
                key={slot.index}
                onClick={() => setCurrentIndex(slot.index)}
                className={`w-full flex items-center gap-3 px-3.5 py-3.5 rounded-2xl text-left transition-all cursor-pointer border
                  ${isCompleted
                    ? isActive
                      ? 'bg-emerald-50/80 border-emerald-400'
                      : 'bg-white border-emerald-400 hover:bg-emerald-50/50'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {/* Status icon */}
                {isCompleted ? (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="flex-shrink-0">
                    <circle cx="11" cy="11" r="11" fill="#16a34a" />
                    <path d="M7 11L9.8 13.8L15 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="flex-shrink-0">
                    <circle cx="11" cy="11" r="11" fill="#cbd5e1" />
                    <path d="M7 11H15" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                )}

                {/* Label */}
                <span
                  className={`flex-1 text-[13.5px] font-semibold truncate
                    ${isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}
                >
                  {slot.label}
                </span>

                {/* Double chevron >> */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                  <path d="M4.5 11.5L8 8L4.5 4.5" stroke={isCompleted ? '#16a34a' : '#cbd5e1'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8.5 11.5L12 8L8.5 4.5" stroke={isCompleted ? '#16a34a' : '#cbd5e1'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Sidebar open button — only shows when question sidebar is collapsed */}
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

        {/* Breadcrumb bar — spans only this right content column, next to question sidebar */}
        <nav className="flex items-center gap-1.5 text-[14px] font-medium text-black/60 px-6 py-3 border-b border-slate-200 flex-shrink-0">
          <Link to="/tests/new" className="hover:text-primary transition-colors text-black/60">Test Creation</Link>
          <span className="text-black/30 mx-1">/</span>
          <span className="text-black/60">Create Test</span>
          <span className="text-black/30 mx-1">/</span>
          <span className="text-black/80 font-semibold">Chapter Wise</span>
          <div className="ml-auto">
            <button
              onClick={handleHeaderPublish}
              disabled={saveMutation.isPending}
              className="w-[200px] h-[48px] flex items-center justify-center bg-[#7489FF] hover:bg-[#5f74eb] text-white text-[16px] font-medium rounded-xl transition-colors cursor-pointer shadow-sm tracking-wide disabled:opacity-50"
            >
              Publish
            </button>
          </div>
        </nav>

        {/* Scrollable editor area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5 w-full mx-auto">

            {/* ── Test Info Card ─────────────────────────────────────── */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-5">
              {/* Top Row: Chapter Wise Badge & Edit button */}
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
                {topicNames.length > 0 && (
                  <div className="flex items-start text-[14px]">
                    <span className="w-24 text-slate-500 font-normal mt-1.5">Topic</span>
                    <span className="text-slate-400 mr-3.5 mt-1.5">:</span>
                    <div className="flex flex-wrap gap-2">
                      {topicNames.map((t, idx) => (
                        <span key={idx} className="text-[14px] font-medium text-[#FFC82C] border border-[#FFC82C] px-4 py-1.5 rounded-xl bg-white">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Topic */}
                {subTopicNames.length > 0 && (
                  <div className="flex items-start text-[14px]">
                    <span className="w-24 text-slate-500 font-normal mt-1.5">Sub Topic</span>
                    <span className="text-slate-400 mr-3.5 mt-1.5">:</span>
                    <div className="flex flex-wrap gap-2">
                      {subTopicNames.map((s, idx) => (
                        <span key={idx} className="text-[14px] font-medium text-[#FFC82C] border border-[#FFC82C] px-4 py-1.5 rounded-xl bg-white">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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

            {/* ── Question Editor ────────────────────────────────────── */}
            <form onSubmit={handleSubmit(onSaveQuestion)} className="space-y-5">

              {/* Question Header row */}
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-slate-800">
                  Question {currentIndex + 1}
                  <span className="text-indigo-300 font-medium">/{totalTarget}</span>
                </h3>
                <div className="flex items-center gap-2.5">
                  <button
                    type="submit"
                    className="flex items-center gap-2 text-[14px] font-semibold text-[#9CA3AF] border border-slate-200 bg-[#F9FAFB] hover:bg-slate-100 px-4.5 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    <img src={iconAddMcq} alt="" className="w-[20px] h-[20px] object-contain" />
                    MCQ
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-[14px] font-semibold text-[#9CA3AF] border border-slate-200 bg-[#F9FAFB] hover:bg-slate-100 px-4.5 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    <img src={iconImportCsv} alt="" className="w-[20px] h-[20px] object-contain" />
                    CSV
                  </button>
                </div>
              </div>

              {/* Delete All Edits */}
              <button
                type="button"
                onClick={handleDeleteAllEdits}
                className="flex items-center gap-2 text-[14px] font-semibold text-[#f87171] hover:text-[#ef4444] transition-colors cursor-pointer"
              >
                <img src={iconTrashRed} alt="" style={{ width: '14px', height: '16px' }} className="object-contain" />
                Delete All Edits
              </button>

              {/* ── Rich Text Toolbar + Question textarea ── */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-0.5 flex-wrap px-3 py-2 border-b border-slate-100 bg-slate-50">
                  {[
                    { icon: <Bold size={13} />, title: 'Bold' },
                    { icon: <Italic size={13} />, title: 'Italic' },
                    { icon: <Underline size={13} />, title: 'Underline' },
                    { icon: <Strikethrough size={13} />, title: 'Strikethrough' },
                    { icon: <Subscript size={13} />, title: 'Subscript' },
                    { icon: <Link2 size={13} />, title: 'Link' },
                    { icon: <Bold size={13} className="rotate-90" />, title: 'Separator1', divider: true },
                    { icon: <AlignLeft size={13} />, title: 'Align Left' },
                    { icon: <AlignCenter size={13} />, title: 'Align Center' },
                    { icon: <AlignRight size={13} />, title: 'Align Right' },
                    { icon: <AlignJustify size={13} />, title: 'Justify' },
                    { icon: <List size={13} />, title: 'Bullet List' },
                    { icon: <ListOrdered size={13} />, title: 'Numbered List' },
                    { icon: <Table2 size={13} />, title: 'Table' },
                    { icon: <BarChart2 size={13} />, title: 'Chart' },
                    { icon: <Code size={13} />, title: 'Code' },
                  ].map((btn, i) =>
                    btn.divider ? (
                      <div key={i} className="w-px h-4 bg-slate-300 mx-1" />
                    ) : (
                      <button
                        key={btn.title}
                        type="button"
                        title={btn.title}
                        className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        {btn.icon}
                      </button>
                    )
                  )}
                </div>

                {/* Question text area */}
                <div className="relative">
                  <textarea
                    rows={5}
                    placeholder="Type here"
                    {...register('question')}
                    className={`w-full px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none resize-none bg-white
                    ${errors.question ? 'ring-1 ring-red-400' : ''}`}
                  />
                  {/* Delete icon */}
                  <button
                    type="button"
                    onClick={handleDeleteCurrentQuestion}
                    className="absolute top-3.5 right-3.5 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img src={iconTrashGrey} alt="Delete" style={{ width: '16.5px', height: '19.5px' }} className="object-contain" />
                  </button>
                </div>
                {errors.question && (
                  <p className="text-[10px] text-red-500 px-4 pb-2">{errors.question.message}</p>
                )}
              </div>

              {/* ── Options ─────────────────────────────────────────── */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Type the options below</h4>

                {(['option1', 'option2', 'option3', 'option4'] as const).map((optKey) => {
                  const isCorrect = watchCorrectOption === optKey
                  return (
                    <div key={optKey} className="flex items-center gap-3 w-full">
                      {/* Radio */}
                      <input
                        type="radio"
                        value={optKey}
                        {...register('correct_option')}
                        className="w-5 h-5 text-indigo-600 border-slate-300 flex-shrink-0 cursor-pointer"
                        style={{ accentColor: isCorrect ? '#6366f1' : undefined }}
                      />

                      {/* Input container */}
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Type Option here"
                          {...register(optKey)}
                          className={`w-full border rounded-xl py-3 pl-4 pr-11 text-[14px] text-slate-800 placeholder-slate-400 outline-none transition-all
                          ${isCorrect
                              ? 'border-indigo-300 ring-1 ring-indigo-200 bg-indigo-50/30'
                              : 'border-slate-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 bg-white'
                            }
                          ${errors[optKey] ? 'border-red-400' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => setValue(optKey, '', { shouldDirty: true })}
                          className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <img src={iconTrashGrey} alt="Delete" style={{ width: '16.5px', height: '19.5px' }} className="object-contain" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Inline option errors */}
                {(errors.option1 || errors.option2 || errors.option3 || errors.option4) && (
                  <p className="text-[10px] text-red-500 pl-7">All 4 options are required</p>
                )}
              </div>

              {/* ── Add Solution (Explanation) ───────────────────────── */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700">Add Solution</h4>
                <div className="relative border border-slate-200 rounded-xl overflow-hidden">
                  <textarea
                    rows={4}
                    placeholder="Type here"
                    {...register('explanation')}
                    className="w-full px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none resize-none bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setValue('explanation', '', { shouldDirty: true })}
                    className="absolute top-3.5 right-3.5 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img src={iconTrashGrey} alt="Delete" style={{ width: '16.5px', height: '19.5px' }} className="object-contain" />
                  </button>
                </div>
              </div>

              {/* ── Navigation arrows ───────────────────────────────── */}
              <div className="flex items-center justify-center gap-[250px] py-1">
                <button
                  type="button"
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 10.5L5 7L8.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentIndex(Math.min(totalTarget - 1, currentIndex + 1))}
                  disabled={currentIndex >= totalTarget - 1}
                  className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 3.5L9 7L5.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>

              {/* ── Question Settings ────────────────────────────────── */}
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-semibold text-slate-800">Question settings</h4>

                {/* Level of Difficulty */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Level of Difficulty</label>
                  <div className="relative">
                    <select
                      {...register('difficulty')}
                      className="w-full border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-700 bg-white outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 appearance-none cursor-pointer"
                    >
                      <option value="">Select from Drop-down</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                {/* Topic */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Topic</label>
                  <div className="relative">
                    <select
                      {...register('topic_id')}
                      className="w-full border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-700 bg-white outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 appearance-none cursor-pointer"
                    >
                      <option value="">Select from Drop-down</option>
                      {topics.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                {/* Sub-topic */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Sub-topic</label>
                  <div className="relative">
                    <select
                      {...register('sub_topic_id')}
                      disabled={!watchQuestionTopic}
                      className="w-full border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-700 bg-white outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select from Drop-down</option>
                      {filteredSubTopicsForQuestion.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Footer Buttons ───────────────────────────────────── */}
              <div className="flex items-center justify-between pt-4 pb-6">
                <button
                  type="button"
                  onClick={() => navigate(`/tests/${id}/edit`)}
                  className="w-[160px] h-[48px] flex items-center justify-center rounded-xl text-sm font-semibold text-white bg-[#FF7F7F] hover:bg-[#e06868] transition-colors cursor-pointer"
                >
                  Exit Test Creation
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={saveMutation.isPending}
                  className="w-[200px] h-[48px] flex items-center justify-center rounded-xl text-sm font-semibold text-white bg-[#7489FF] hover:bg-[#5f74eb] transition-all cursor-pointer disabled:opacity-50 gap-2 shadow-sm"
                >
                  {saveMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                  {currentIndex === totalTarget - 1 ? 'Publish' : 'Next'}
                </button>
              </div>
            </form>
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
