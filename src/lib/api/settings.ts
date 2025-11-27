import {
  type CourierMapping,
  type DuplicateCheckSettings,
  type ExclusionPattern,
  type ExclusionSettings,
  courierMappings as mockCourierMappings,
  duplicateCheckSettings as mockDuplicateCheckSettings,
  exclusionSettings as mockExclusionSettings,
  smtpSettings as mockSmtpSettings,
  type SMTPSettings,
} from '@/lib/mock-data'

// 메모리에 데이터 복사
let smtpData = { ...mockSmtpSettings }
let exclusionData = { ...mockExclusionSettings }
let duplicateCheckData = { ...mockDuplicateCheckSettings }
let courierData = [...mockCourierMappings]

// API 지연 시뮬레이션
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function addCourierMapping(data: Omit<CourierMapping, 'id'>): Promise<CourierMapping> {
  await delay(300)
  const newMapping: CourierMapping = {
    ...data,
    id: `courier${Date.now()}`,
  }
  courierData = [...courierData, newMapping]
  return newMapping
}

export async function addExclusionPattern(pattern: Omit<ExclusionPattern, 'id'>): Promise<ExclusionPattern> {
  await delay(300)
  const newPattern: ExclusionPattern = {
    ...pattern,
    id: `exc${Date.now()}`,
  }
  exclusionData.patterns = [...exclusionData.patterns, newPattern]
  return newPattern
}

// Courier Mappings
export async function getCourierMappings(): Promise<CourierMapping[]> {
  await delay(200)
  return courierData
}

// Duplicate Check Settings
export async function getDuplicateCheckSettings(): Promise<DuplicateCheckSettings> {
  await delay(200)
  return duplicateCheckData
}

// Exclusion Settings
export async function getExclusionSettings(): Promise<ExclusionSettings> {
  await delay(200)
  return exclusionData
}

// SMTP Settings
export async function getSmtpSettings(): Promise<SMTPSettings> {
  await delay(200)
  return smtpData
}

export async function removeCourierMapping(id: string): Promise<void> {
  await delay(300)
  courierData = courierData.filter((c) => c.id !== id)
}

export async function removeExclusionPattern(id: string): Promise<void> {
  await delay(300)
  exclusionData.patterns = exclusionData.patterns.filter((p) => p.id !== id)
}

export async function updateCourierMapping(id: string, data: Partial<CourierMapping>): Promise<CourierMapping> {
  await delay(500)
  const index = courierData.findIndex((c) => c.id === id)
  if (index === -1) throw new Error('Courier mapping not found')

  courierData[index] = { ...courierData[index], ...data }
  return courierData[index]
}

export async function updateDuplicateCheckSettings(
  data: Partial<DuplicateCheckSettings>,
): Promise<DuplicateCheckSettings> {
  await delay(500)
  duplicateCheckData = { ...duplicateCheckData, ...data }
  return duplicateCheckData
}

export async function updateExclusionSettings(data: Partial<ExclusionSettings>): Promise<ExclusionSettings> {
  await delay(500)
  exclusionData = { ...exclusionData, ...data }
  return exclusionData
}

export async function updateSmtpSettings(data: Partial<SMTPSettings>): Promise<SMTPSettings> {
  await delay(500)
  smtpData = { ...smtpData, ...data }
  return smtpData
}
