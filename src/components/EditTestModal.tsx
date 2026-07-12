import React, { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { testSchema } from '../schemas/test'
import type { TestFormValues } from '../schemas/test'
import { testService, subjectService, topicService } from '../services/api'
import { MultiSelect } from './MultiSelect'
import { 
  Loader2,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

interface EditTestModalProps {
  testId: string
  isOpen: boolean
  onClose: () => void
  onSaveSuccess: () => void
}

export const EditTestModal: React.FC<EditTestModalProps> = ({
  testId,
  isOpen,
  onClose,
  onSaveSuccess
}) => {
  const queryClient = useQueryClient()
  const [isDataMapped, setIsDataMapped] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
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

  // 1. Fetch Subjects
  const { data: subjectsResponse, isLoading: isSubjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectService.getAll,
    enabled: isOpen,
  })
  const subjects = subjectsResponse?.data || []

  // 2. Fetch Topics
  const { data: topicsResponse, isLoading: isTopicsLoading } = useQuery({
    queryKey: ['topics', watchSubject],
    queryFn: () => topicService.getBySubject(watchSubject),
    enabled: isOpen && !!watchSubject,
  })
  const topics = topicsResponse?.data || []

  // 3. Fetch Sub-topics
  const { data: subTopicsResponse, isLoading: isSubTopicsLoading } = useQuery({
    queryKey: ['subTopics', watchTopics],
    queryFn: () => topicService.getByMultiTopics(watchTopics),
    enabled: isOpen && !!watchTopics && watchTopics.length > 0,
  })
  const subTopics = subTopicsResponse?.data || []

  // 4. Fetch Test Details
  const { data: testResponse, isLoading: isTestLoading } = useQuery({
    queryKey: ['test', testId],
    queryFn: () => testService.getById(testId),
    enabled: isOpen && !!testId,
  })

  const handleSubjectChange = (newSubjectId: string) => {
    setValue('subject', newSubjectId, { shouldDirty: true })
    setValue('topics', [], { shouldDirty: true })
    setValue('sub_topics', [], { shouldDirty: true })
  }

  const handleTopicsChange = (newTopicIds: string[]) => {
    setValue('topics', newTopicIds, { shouldDirty: true })
    setValue('sub_topics', [], { shouldDirty: true })
  }

  // Map Backend Test Data to Form
  useEffect(() => {
    if (isOpen && testResponse?.data && subjects.length > 0 && !isDataMapped) {
      const test = testResponse.data

      const matchedSubject = subjects.find(
        (s) => s.name === test.subject || s.id === test.subject
      )
      const subjectId = matchedSubject ? matchedSubject.id : ''

      if (subjectId) {
        setValue('subject', subjectId)
        
        if (topics.length > 0) {
          const resolvedTopicIds = test.topics
            .map((topicName) => {
              const matchedTopic = topics.find((t) => t.name === topicName || t.id === topicName)
              return matchedTopic ? matchedTopic.id : null
            })
            .filter(Boolean) as string[]
            
          setValue('topics', resolvedTopicIds)

          if (subTopics.length > 0 || (test.sub_topics && test.sub_topics.length === 0)) {
            const resolvedSubTopicIds = (test.sub_topics || [])
              .map((subTopicName) => {
                const matchedSub = subTopics.find((s) => s.name === subTopicName || s.id === subTopicName)
                return matchedSub ? matchedSub.id : null
              })
              .filter(Boolean) as string[]

            setValue('sub_topics', resolvedSubTopicIds)

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
  }, [isOpen, testResponse, subjects, topics, subTopics, isDataMapped, reset, setValue])

  // Reset mapper when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setIsDataMapped(false)
    }
  }, [isOpen])

  const updateMutation = useMutation({
    mutationFn: (data: TestFormValues) => testService.update(testId, data as any),
    onSuccess: () => {
      toast.success('Test details updated successfully')
      queryClient.invalidateQueries({ queryKey: ['tests'] })
      queryClient.invalidateQueries({ queryKey: ['test', testId] })
      onSaveSuccess()
      onClose()
    },
    onError: () => {
      toast.error('Failed to update test details.')
    }
  })

  const onSave = (values: TestFormValues) => {
    updateMutation.mutate(values)
  }

  // Custom Number Stepper Component
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
        <label className="text-[13px] font-semibold text-slate-500 block leading-tight">
          {label}
        </label>
        <div className="relative flex items-center">
          <input
            type="number"
            placeholder={placeholder}
            {...register(name)}
            className={`w-full bg-white border ${
              errors[name] ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
            } focus:ring-2 focus:outline-none text-slate-800 rounded-xl py-3 pl-4 pr-10 text-sm transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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

  if (!isOpen) return null

  const isFormLoading = isSubjectsLoading || isTestLoading || (!isDataMapped)

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white shadow-2xl relative flex flex-col max-h-[90vh] w-full" style={{ borderRadius: '8px', maxWidth: '1200px' }}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
          <h2 className="text-[18px] font-bold text-slate-800">Edit Test creation</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-650 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {isFormLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={36} className="text-indigo-600 animate-spin" />
              <p className="text-slate-500 text-sm font-medium animate-pulse">Loading test details...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSave)} className="space-y-6">
              {/* Type Select buttons */}
              <div className="flex bg-[#F5F8FF] p-1 rounded-xl w-fit border border-[#E8F1FF]">
                {[
                  { id: 'chapterwise', label: 'Chapter Wise' },
                  { id: 'pyq', label: 'PYQ' },
                  { id: 'mock-test', label: 'Mock Test' },
                ].map((t) => {
                  const isSelected = watchType === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setValue('type', t.id, { shouldDirty: true })}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-white text-indigo-600 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {/* ROW 1: Subject & Name of Test */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-slate-800 block">
                    Subject
                  </label>
                  <div className="relative">
                    <select
                      value={watchSubject}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      className={`w-full bg-white border ${
                        errors.subject ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                      } focus:ring-2 focus:outline-none text-slate-850 rounded-xl py-3 px-4 pr-10 text-sm transition-all appearance-none cursor-pointer`}
                    >
                      <option value="">Choose from Drop-down</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                  {errors.subject && <p className="text-xs font-medium text-red-500 pl-1">{errors.subject.message}</p>}
                </div>

                {/* Name of Test */}
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-slate-800 block">
                    Name of Test
                  </label>
                  <input
                    type="text"
                    placeholder="Enter name of Test"
                    {...register('name')}
                    className={`w-full bg-white border ${
                      errors.name ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                    } focus:ring-2 focus:outline-none text-slate-850 rounded-xl py-3 px-4 text-sm transition-all placeholder-slate-400`}
                  />
                  {errors.name && <p className="text-xs font-medium text-red-500 pl-1">{errors.name.message}</p>}
                </div>
              </div>

              {/* ROW 2: Topic & Sub Topic */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Topic */}
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

                {/* Sub Topic */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-slate-800 block">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter the time"
                    {...register('total_time')}
                    className={`w-full bg-white border ${
                      errors.total_time ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                    } focus:ring-2 focus:outline-none text-slate-850 rounded-xl py-3 px-4 text-sm transition-all`}
                  />
                  {errors.total_time && <p className="text-xs font-medium text-red-500 pl-1">{errors.total_time.message}</p>}
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-slate-800 block">
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
                              className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                              style={{ accentColor: '#6366f1' }}
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

              {/* Marking Scheme Header */}
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
                  Marking Scheme:
                </h3>
              </div>

              {/* Marking Scheme and Limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Steppers */}
                <div className="grid grid-cols-3 gap-4">
                  <CustomNumberInput label="Wrong Answer" name="wrong_marks" placeholder="-1" />
                  <CustomNumberInput label="Unattempted" name="unattempt_marks" placeholder="+0" />
                  <CustomNumberInput label="Correct Answer" name="correct_marks" placeholder="+5" />
                </div>

                {/* Question/Marks limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-slate-550 block">
                      No of Questions
                    </label>
                    <input
                      type="number"
                      placeholder="Ex:250 Marks"
                      {...register('total_questions')}
                      className={`w-full bg-white border ${
                        errors.total_questions ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                      } focus:ring-2 focus:outline-none text-slate-800 rounded-xl py-3 px-4 text-sm transition-all placeholder-slate-400`}
                    />
                    {errors.total_questions && <p className="text-xs font-medium text-red-500 pl-1">{errors.total_questions.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-slate-550 block">
                      Total Marks
                    </label>
                    <input
                      type="number"
                      placeholder="Ex:250 Marks"
                      {...register('total_marks')}
                      className={`w-full bg-white border ${
                        errors.total_marks ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                      } focus:ring-2 focus:outline-none text-slate-850 rounded-xl py-3 px-4 text-sm transition-all placeholder-slate-400`}
                    />
                    {errors.total_marks && <p className="text-xs font-medium text-red-500 pl-1">{errors.total_marks.message}</p>}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 bg-[#F5F8FF] hover:bg-[#E8F1FF] text-indigo-600 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updateMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
