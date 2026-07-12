import type { ApiResponse, Subject, Topic, SubTopic, Test, Question, LoginData } from '../types'
import { apiClient } from '../api/client'

// Thin response mapping helper
const mapResponse = <T>(axiosResponse: any): ApiResponse<T> => {
  const data = axiosResponse.data
  if (!data) {
    return {
      success: false,
      data: null as any,
      message: 'No response data received'
    }
  }
  return {
    success: data.status === 'success' || data.success === true,
    data: data.data !== undefined ? data.data : data,
    message: data.message || ''
  }
}

// In-memory cache for subjects, topics, and subtopics lookup data
let cachedLookups: { subjects: Subject[]; topics: Topic[]; subTopics: SubTopic[] } | null = null

const getLookupData = async (): Promise<{ subjects: Subject[]; topics: Topic[]; subTopics: SubTopic[] }> => {
  if (cachedLookups) return cachedLookups

  const [subsRes, topicsRes] = await Promise.all([
    subjectService.getAll(),
    topicService.getAll()
  ])
  const subjects = subsRes.data || []
  const topics = topicsRes.data || []

  // Fetch all sub-topics by passing all topic IDs to multi-topics endpoint
  let subTopics: SubTopic[] = []
  if (topics.length > 0) {
    const topicIds = topics.map(t => t.id)
    const subTopicsRes = await topicService.getByMultiTopics(topicIds)
    subTopics = subTopicsRes.data || []
  }

  cachedLookups = { subjects, topics, subTopics }
  return cachedLookups
}

// Incoming test mapping (display names -> UUIDs)
const mapIncomingTest = (test: any, subjects: Subject[], topics: Topic[], subTopics: SubTopic[]): Test => {
  if (!test) return test
  
  const matchedSubject = subjects.find(s => s.name === test.subject || s.id === test.subject)
  const resolvedTopicIds = (test.topics || []).map((tName: string) => {
    return topics.find(t => t.name === tName || t.id === tName)?.id || tName
  })
  const resolvedSubTopicIds = (test.sub_topics || []).map((sName: string) => {
    return subTopics.find(s => s.name === sName || s.id === sName)?.id || sName
  })

  return {
    ...test,
    subject: matchedSubject ? matchedSubject.id : test.subject,
    topics: resolvedTopicIds,
    sub_topics: resolvedSubTopicIds,
    status: test.status === 'draft' ? null : test.status // map 'draft' back to null for UI compatibility
  }
}

// Incoming question mapping (names -> UUIDs)
const mapIncomingQuestion = (q: any, topics: Topic[], subTopics: SubTopic[]): Question => {
  if (!q) return q
  
  const matchedTopic = topics.find(t => t.name === q.topic || t.id === q.topic)
  const matchedSubTopic = subTopics.find(s => s.name === q.sub_topic || s.id === q.sub_topic)

  return {
    id: q.id,
    type: q.type || 'mcq',
    question: q.question,
    option1: q.option1,
    option2: q.option2,
    option3: q.option3,
    option4: q.option4,
    correct_option: q.correct_option,
    explanation: q.explanation || '',
    difficulty: q.difficulty || 'medium',
    test_id: q.test_id,
    topic_id: matchedTopic ? matchedTopic.id : (q.topic || ''),
    sub_topic_id: matchedSubTopic ? matchedSubTopic.id : (q.sub_topic || ''),
    media_url: q.media_url || '',
    created_at: q.created_at
  }
}

// Authentication Service
export const authService = {
  login: async (userId: string, password: string): Promise<ApiResponse<LoginData>> => {
    const response = await apiClient.post('/auth/login', { userId, password })
    return mapResponse(response)
  },
}

// Subjects Service
export const subjectService = {
  getAll: async (): Promise<ApiResponse<Subject[]>> => {
    const response = await apiClient.get('/subjects')
    return mapResponse(response)
  },
}

// Topics & Sub-topics Service
export const topicService = {
  getAll: async (): Promise<ApiResponse<Topic[]>> => {
    // Note: The backend doesn't have a direct /topics endpoint.
    // Instead, we fetch all subjects first, then fetch topics for all subjects in parallel!
    const response = await apiClient.get<ApiResponse<Subject[]>>('/subjects')
    const subjects = response.data.data || []
    
    const topicsPromises = subjects.map(s => apiClient.get(`/topics/subject/${s.id}`))
    const topicsResponses = await Promise.all(topicsPromises)
    
    const allTopics: Topic[] = []
    topicsResponses.forEach(res => {
      if (res.data && res.data.data) {
        allTopics.push(...res.data.data)
      }
    })
    
    return {
      success: true,
      message: 'Topics fetched successfully',
      data: allTopics
    }
  },

  getBySubject: async (subjectId: string): Promise<ApiResponse<Topic[]>> => {
    const response = await apiClient.get(`/topics/subject/${subjectId}`)
    return mapResponse(response)
  },
  
  getByTopic: async (topicId: string): Promise<ApiResponse<SubTopic[]>> => {
    const response = await apiClient.get(`/sub-topics/topic/${topicId}`)
    return mapResponse(response)
  },

  getByMultiTopics: async (topicIds: string[]): Promise<ApiResponse<SubTopic[]>> => {
    const response = await apiClient.post('/sub-topics/multi-topics', { topicIds })
    return mapResponse(response)
  },
}

// Tests Service
export const testService = {
  getAll: async (): Promise<ApiResponse<Test[]>> => {
    const [lookups, response] = await Promise.all([
      getLookupData(),
      apiClient.get('/tests')
    ])
    const rawTests = response.data.data || []
    const mappedTests = rawTests.map((t: any) => mapIncomingTest(t, lookups.subjects, lookups.topics, lookups.subTopics))
    
    return {
      success: response.data.status === 'success' || response.data.success === true,
      message: response.data.message || '',
      data: mappedTests
    }
  },

  getById: async (id: string): Promise<ApiResponse<Test>> => {
    const [lookups, response] = await Promise.all([
      getLookupData(),
      apiClient.get(`/tests/${id}`)
    ])
    const rawTest = response.data.data
    const mappedTest = mapIncomingTest(rawTest, lookups.subjects, lookups.topics, lookups.subTopics)
    
    return {
      success: response.data.status === 'success' || response.data.success === true,
      message: response.data.message || '',
      data: mappedTest
    }
  },

  create: async (testData: Omit<Test, 'id' | 'created_at' | 'status' | 'questions'>): Promise<ApiResponse<Test>> => {
    // Send status: 'draft' initially
    const response = await apiClient.post('/tests', {
      ...testData,
      status: 'draft'
    })
    const lookup = await getLookupData()
    const mappedTest = mapIncomingTest(response.data.data, lookup.subjects, lookup.topics, lookup.subTopics)
    
    return {
      success: response.data.status === 'success' || response.data.success === true,
      message: response.data.message || '',
      data: mappedTest
    }
  },

  update: async (
    id: string, 
    testData: Partial<Omit<Test, 'id' | 'created_at'>>
  ): Promise<ApiResponse<Test>> => {
    // If status is null (which is draft in UI), map it to 'draft' for the backend!
    const backendData = {
      ...testData,
      status: testData.status === null ? 'draft' : testData.status
    }
    const response = await apiClient.put(`/tests/${id}`, backendData)
    const lookup = await getLookupData()
    const mappedTest = mapIncomingTest(response.data.data, lookup.subjects, lookup.topics, lookup.subTopics)
    
    return {
      success: response.data.status === 'success' || response.data.success === true,
      message: response.data.message || '',
      data: mappedTest
    }
  },

  publish: async (
    id: string, 
    scheduleDetails?: {
      publishMode: 'now' | 'schedule';
      scheduleDate?: string;
      scheduleTime?: string;
      liveUntilMode?: string;
      endDate?: string;
      endTime?: string;
    }
  ): Promise<ApiResponse<Test>> => {
    const payload: any = {}
    if (scheduleDetails?.publishMode === 'schedule') {
      payload.status = 'scheduled'
      payload.scheduled_date = `${scheduleDetails.scheduleDate}T${scheduleDetails.scheduleTime}:00`
    } else {
      payload.status = 'live'
    }

    if (scheduleDetails?.liveUntilMode === 'custom') {
      payload.expiry_date = `${scheduleDetails.endDate}T${scheduleDetails.endTime}:00`
    } else if (scheduleDetails?.liveUntilMode && scheduleDetails.liveUntilMode !== 'always') {
      // e.g. 1week, 2weeks, 3weeks, 1month -> let's compute expiration offset date!
      const weeksMatch = scheduleDetails.liveUntilMode.match(/^(\d+)week(s)?$/)
      const monthsMatch = scheduleDetails.liveUntilMode.match(/^(\d+)month(s)?$/)
      const now = new Date()
      if (weeksMatch) {
        now.setDate(now.getDate() + 7 * parseInt(weeksMatch[1]))
        payload.expiry_date = now.toISOString()
      } else if (monthsMatch) {
        now.setMonth(now.getMonth() + parseInt(monthsMatch[1]))
        payload.expiry_date = now.toISOString()
      }
    }

    const response = await apiClient.put(`/tests/${id}`, payload)
    const lookup = await getLookupData()
    const mappedTest = mapIncomingTest(response.data.data, lookup.subjects, lookup.topics, lookup.subTopics)
    
    return {
      success: response.data.status === 'success' || response.data.success === true,
      message: response.data.message || '',
      data: mappedTest
    }
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/tests/${id}`)
    return mapResponse(response)
  }
}

// Questions Service
export const questionService = {
  bulkCreate: async (questions: Omit<Question, 'id'>[]): Promise<ApiResponse<Question[]>> => {
    if (questions.length === 0) {
      return { success: true, message: 'No questions to save', data: [] }
    }

    const [lookups, testRes] = await Promise.all([
      getLookupData(),
      testService.getById(questions[0].test_id)
    ])
    
    const test = testRes.data
    // Lookup the subject UUID of the test
    const matchedSub = lookups.subjects.find(s => s.name === test.subject || s.id === test.subject)
    const subjectUuid = matchedSub ? matchedSub.id : test.subject

    const payloadQuestions = questions.map(q => {
      const matchedTopic = lookups.topics.find(t => t.id === q.topic_id || t.name === q.topic_id)
      const matchedSubTopic = lookups.subTopics.find(s => s.id === q.sub_topic_id || s.name === q.sub_topic_id)

      const payload: any = {
        type: q.type || 'mcq',
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correct_option: q.correct_option,
        difficulty: q.difficulty || 'medium',
        test_id: q.test_id,
      }

      if (q.explanation && q.explanation.trim() !== '') {
        payload.explanation = q.explanation
      }
      if (q.media_url && q.media_url.trim() !== '') {
        payload.media_url = q.media_url
      }
      if (subjectUuid) {
        payload.subject = subjectUuid
      }
      if (matchedTopic) {
        payload.topic = matchedTopic.name
      }
      if (matchedSubTopic) {
        payload.sub_topic = matchedSubTopic.name
      }

      return payload
    })

    const response = await apiClient.post('/questions/bulk', { questions: payloadQuestions })
    const createdQuestions = response.data.data || []
    const mappedQuestions = createdQuestions.map((q: any) => mapIncomingQuestion(q, lookups.topics, lookups.subTopics))

    // Update the test metadata (number of questions and total marks) in parallel
    const questionIds = mappedQuestions.map((q: Question) => q.id!)
    const marksPerCorrect = test.correct_marks || 4
    await testService.update(test.id, {
      questions: questionIds,
      total_questions: questionIds.length,
      total_marks: questionIds.length * marksPerCorrect,
    })

    return {
      success: response.data.status === 'success' || response.data.success === true,
      message: response.data.message || '',
      data: mappedQuestions
    }
  },

  fetchBulk: async (questionIds: string[]): Promise<ApiResponse<Question[]>> => {
    if (questionIds.length === 0) {
      return { success: true, message: 'No questions fetched', data: [] }
    }

    const [lookups, response] = await Promise.all([
      getLookupData(),
      apiClient.post('/questions/fetchBulk', { question_ids: questionIds })
    ])
    
    const rawQuestions = response.data.data || []
    const mappedQuestions = rawQuestions.map((q: any) => mapIncomingQuestion(q, lookups.topics, lookups.subTopics))
    
    return {
      success: response.data.status === 'success' || response.data.success === true,
      message: response.data.message || '',
      data: mappedQuestions
    }
  },
}
