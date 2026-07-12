import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { testSchema } from '../schemas/test'
import type { TestFormValues } from '../schemas/test'
import { testService, subjectService, topicService } from '../services/api'
import { MultiSelect } from '../components/MultiSelect'
import { 
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'

export const CreateEditTest: React.FC = () => {
  const { id } = useParams()
  const isEditMode = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // State to track if loaded draft data is fully mapped (important for editing mode)
  const [isDataMapped, setIsDataMapped] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<TestFormValues>({
    resolver: zodResolver(testSchema) as any,
    defaultValues: {
      name: '',
      type: 'chapterwise',
      subject: '',
      topics: [],
      sub_topics: [],
      difficulty: 'medium',
      correct_marks: 5,
      wrong_marks: -1,
      unattempt_marks: 0,
      total_time: 60,
      total_marks: 100,
      total_questions: 25,
    },
  })

  const watchSubject = watch('subject')
  const watchTopics = watch('topics')
  const watchType = watch('type')

  // Warn user on unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // 1. Fetch Subjects
  const { data: subjectsResponse, isLoading: isSubjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectService.getAll,
  })
  const subjects = subjectsResponse?.data || []

  // 2. Fetch Topics (dependent on selected subject)
  const { data: topicsResponse, isLoading: isTopicsLoading } = useQuery({
    queryKey: ['topics', watchSubject],
    queryFn: () => topicService.getBySubject(watchSubject),
    enabled: !!watchSubject,
  })
  const topics = topicsResponse?.data || []

  // 3. Fetch Sub-topics (dependent on selected topics)
  const { data: subTopicsResponse, isLoading: isSubTopicsLoading } = useQuery({
    queryKey: ['subTopics', watchTopics],
    queryFn: () => topicService.getByMultiTopics(watchTopics),
    enabled: !!watchTopics && watchTopics.length > 0,
  })
  const subTopics = subTopicsResponse?.data || []

  // 4. Fetch Test details (if in Edit Mode)
  const { data: testResponse, isLoading: isTestLoading } = useQuery({
    queryKey: ['test', id],
    queryFn: () => testService.getById(id!),
    enabled: isEditMode,
  })

  // Dynamic values cleanups on parent selection change
  const handleSubjectChange = (newSubjectId: string) => {
    setValue('subject', newSubjectId, { shouldDirty: true })
    setValue('topics', [], { shouldDirty: true })
    setValue('sub_topics', [], { shouldDirty: true })
  }

  const handleTopicsChange = (newTopicIds: string[]) => {
    setValue('topics', newTopicIds, { shouldDirty: true })
    setValue('sub_topics', [], { shouldDirty: true })
  }

  // Map backend test details (names) to local form values (UUIDs)
  useEffect(() => {
    if (isEditMode && testResponse?.data && subjects.length > 0 && !isDataMapped) {
      const test = testResponse.data

      // Look up subject ID
      const matchedSubject = subjects.find(
        (s) => s.name === test.subject || s.id === test.subject
      )
      const subjectId = matchedSubject ? matchedSubject.id : ''

      if (subjectId) {
        setValue('subject', subjectId)
        
        // Wait for topics to load to resolve their IDs
        if (topics.length > 0) {
          const resolvedTopicIds = test.topics
            .map((topicName) => {
              const matchedTopic = topics.find((t) => t.name === topicName || t.id === topicName)
              return matchedTopic ? matchedTopic.id : null
            })
            .filter(Boolean) as string[]
            
          setValue('topics', resolvedTopicIds)

          // Wait for sub-topics to load to resolve their IDs
          if (subTopics.length > 0 || (test.sub_topics && test.sub_topics.length === 0)) {
            const resolvedSubTopicIds = (test.sub_topics || [])
              .map((subTopicName) => {
                const matchedSub = subTopics.find((s) => s.name === subTopicName || s.id === subTopicName)
                return matchedSub ? matchedSub.id : null
              })
              .filter(Boolean) as string[]

            setValue('sub_topics', resolvedSubTopicIds)

            // Populate all other details
            reset({
              name: test.name,
              type: test.type || 'chapterwise',
              subject: subjectId,
              topics: resolvedTopicIds,
              sub_topics: resolvedSubTopicIds,
              difficulty: test.difficulty || 'medium',
              correct_marks: test.correct_marks ?? 5,
              wrong_marks: test.wrong_marks ?? -1,
              unattempt_marks: test.unattempt_marks ?? 0,
              total_time: test.total_time ?? 60,
              total_marks: test.total_marks ?? 100,
              total_questions: test.total_questions ?? 25,
            })
            setIsDataMapped(true)
          }
        }
      }
    }
  }, [isEditMode, testResponse, subjects, topics, subTopics, isDataMapped, reset, setValue])

  // Save Mutations
  const createMutation = useMutation({
    mutationFn: testService.create,
    onSuccess: (response) => {
      toast.success('Test created successfully as draft')
      queryClient.invalidateQueries({ queryKey: ['tests'] })
      // Navigate to questions editing page for this test
      navigate(`/tests/${response.data.id}/questions`)
    },
    onError: () => {
      toast.error('Failed to create test details.')
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: TestFormValues) => testService.update(id!, data as any),
    onSuccess: () => {
      toast.success('Test details updated successfully')
      queryClient.invalidateQueries({ queryKey: ['tests'] })
      queryClient.invalidateQueries({ queryKey: ['test', id] })
      navigate(`/tests/${id}/questions`)
    },
    onError: () => {
      toast.error('Failed to update test details.')
    }
  })

  const onSave = (values: TestFormValues) => {
    if (isEditMode) {
      updateMutation.mutate(values)
    } else {
      createMutation.mutate(values as any)
    }
  }

  // Custom Number Input Component with clickable up/down chevrons
  const CustomNumberInput = ({
    label,
    name,
    placeholder
  }: {
    label: string
    name: 'wrong_marks' | 'unattempt_marks' | 'correct_marks'
    placeholder?: string
  }) => {
    const value = watch(name)
    
    const handleIncrement = () => {
      const current = Number(value ?? 0)
      setValue(name, current + 1, { shouldDirty: true })
    }
    const handleDecrement = () => {
      const current = Number(value ?? 0)
      setValue(name, current - 1, { shouldDirty: true })
    }

    return (
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-500 block leading-tight">
          {label}
        </label>
        <div className="relative flex items-center">
          <input
            type="number"
            placeholder={placeholder}
            {...register(name)}
            className={`w-full bg-white border ${
              errors[name] ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary focus:ring-blue-100'
            } focus:ring-4 focus:outline-none text-slate-800 rounded-xl py-3 pl-4 pr-10 text-sm transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          />
          <div className="absolute right-3 flex flex-col items-center text-slate-400 select-none">
            <button 
              type="button" 
              onClick={handleIncrement}
              className="hover:text-slate-700 cursor-pointer focus:outline-none"
            >
              <ChevronUp size={11} className="stroke-[3.5]" />
            </button>
            <button 
              type="button" 
              onClick={handleDecrement}
              className="hover:text-slate-700 cursor-pointer focus:outline-none"
            >
              <ChevronDown size={11} className="stroke-[3.5]" />
            </button>
          </div>
        </div>
        {errors[name] && <p className="text-[10px] text-red-500 pl-1">{(errors[name] as any).message}</p>}
      </div>
    )
  }

  const isLoading = isSubjectsLoading || isTestLoading || (isEditMode && !isDataMapped)

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Loader2 size={36} className="text-primary animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Loading test form configuration...</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white min-h-[calc(100vh-10rem)]">
      {/* Tab Controller / Segmented Control */}
      <div className="flex bg-[#F5F8FF] p-1 rounded-xl w-fit border border-[#E8F1FF] mb-10">
        {[
          { id: 'chapterwise', label: 'Chapterwise' },
          { id: 'pyq', label: 'PYQ' },
          { id: 'mock-test', label: 'Mock Test' },
        ].map((t) => {
          const isSelected = watchType === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setValue('type', t.id, { shouldDirty: true })}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit((values) => onSave(values))} className="space-y-8">
        
        {/* ROW 1: Subject & Name of Test */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Subject Select */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 block">
              Subject
            </label>
            <div className="relative">
              <select
                value={watchSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className={`w-full bg-white border ${
                  errors.subject ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary focus:ring-blue-100'
                } focus:ring-4 focus:outline-none text-slate-850 rounded-xl py-3 px-4 pr-10 text-sm transition-all appearance-none cursor-pointer`}
              >
                <option value="">Choose from Drop-down</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-450">
                <ChevronDown size={16} />
              </div>
            </div>
            {errors.subject && <p className="text-xs font-medium text-red-500 pl-1">{errors.subject.message}</p>}
          </div>

          {/* Name of Test */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 block">
              Name of Test
            </label>
            <input
              type="text"
              placeholder="Enter name of Test"
              {...register('name')}
              className={`w-full bg-white border ${
                errors.name ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary focus:ring-blue-100'
              } focus:ring-4 focus:outline-none text-slate-850 rounded-xl py-3 px-4 text-sm transition-all placeholder-slate-400`}
            />
            {errors.name && <p className="text-xs font-medium text-red-500 pl-1">{errors.name.message}</p>}
          </div>
        </div>

        {/* ROW 2: Topic & Sub Topic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Topic Select */}
          <div className="space-y-2">
            <Controller
              name="topics"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  label="Topic"
                  options={topics.map((t) => ({ value: t.id, label: t.name }))}
                  selectedValues={field.value}
                  onChange={handleTopicsChange}
                  placeholder={watchSubject ? 'Choose from Drop-down' : 'First select a subject'}
                  disabled={!watchSubject || isTopicsLoading}
                  error={errors.topics?.message}
                />
              )}
            />
          </div>

          {/* Sub Topic Select */}
          <div className="space-y-2">
            <Controller
              name="sub_topics"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  label="Sub Topic"
                  options={subTopics.map((s) => ({ value: s.id, label: s.name }))}
                  selectedValues={field.value || []}
                  onChange={(vals) => field.onChange(vals)}
                  placeholder={watchTopics.length > 0 ? 'Choose from Drop-down' : 'First select topics'}
                  disabled={watchTopics.length === 0 || isSubTopicsLoading}
                  error={errors.sub_topics?.message}
                />
              )}
            />
          </div>
        </div>

        {/* ROW 3: Duration & Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Duration (Minutes) */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 block">
              Duration (Minutes)
            </label>
            <input
              type="number"
              placeholder="Enter the time"
              {...register('total_time')}
              className={`w-full bg-white border ${
                errors.total_time ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary focus:ring-blue-100'
              } focus:ring-4 focus:outline-none text-slate-855 rounded-xl py-3 px-4 text-sm transition-all`}
            />
            {errors.total_time && <p className="text-xs font-medium text-red-500 pl-1">{errors.total_time.message}</p>}
          </div>

          {/* Test Difficulty Level */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 block">
              Test Difficulty Level
            </label>
            <Controller
              name="difficulty"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-8 h-[46px]">
                  {[
                    { value: 'easy', label: 'Easy' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'hard', label: 'Difficult' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2.5 text-sm text-slate-700 font-medium cursor-pointer select-none group">
                      <input
                        type="radio"
                        name="difficulty"
                        value={opt.value}
                        checked={field.value === opt.value}
                        onChange={() => field.onChange(opt.value)}
                        className="w-5 h-5 text-primary border-slate-305 focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.difficulty && <p className="text-xs font-medium text-red-500 pl-1">{errors.difficulty.message}</p>}
          </div>
        </div>

        {/* ROW 4: Marking Scheme Section Header */}
        <div className="pt-2">
          <h3 className="text-sm font-semibold text-slate-855 uppercase tracking-wider">
            Marking Scheme:
          </h3>
        </div>

        {/* ROW 5: Steppers & Question limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          
          {/* Left Side: Three Stepper inputs */}
          <div className="grid grid-cols-3 gap-4">
            <CustomNumberInput label="Wrong Answer" name="wrong_marks" placeholder="-1" />
            <CustomNumberInput label="Unattempted" name="unattempt_marks" placeholder="+0" />
            <CustomNumberInput label="Correct Answer" name="correct_marks" placeholder="+5" />
          </div>

          {/* Right Side: No of Questions & Total Marks */}
          <div className="grid grid-cols-2 gap-4">
            {/* No of Questions */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-550 block">
                No of Questions
              </label>
              <input
                type="number"
                placeholder="Ex:250 Marks"
                {...register('total_questions')}
                className={`w-full bg-white border ${
                  errors.total_questions ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary focus:ring-blue-100'
                } focus:ring-4 focus:outline-none text-slate-855 rounded-xl py-3 px-4 text-sm transition-all placeholder-slate-400`}
              />
              {errors.total_questions && <p className="text-xs font-medium text-red-500 pl-1">{errors.total_questions.message}</p>}
            </div>

            {/* Total Marks */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-550 block">
                Total Marks
              </label>
              <input
                type="number"
                placeholder="Ex:250 Marks"
                {...register('total_marks')}
                className={`w-full bg-white border ${
                  errors.total_marks ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary focus:ring-blue-100'
                } focus:ring-4 focus:outline-none text-slate-855 rounded-xl py-3 px-4 text-sm transition-all placeholder-slate-400`}
              />
              {errors.total_marks && <p className="text-xs font-medium text-red-500 pl-1">{errors.total_marks.message}</p>}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100 mt-10">
          <button
            type="button"
            onClick={() => {
              if (isDirty && !window.confirm('You have unsaved changes. Discard and go back?')) return
              navigate('/')
            }}
            className="px-8 py-3 bg-[#F5F8FF] hover:bg-[#E8F1FF] text-primary rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-sm"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-10 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {(createMutation.isPending || updateMutation.isPending) ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Next'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
