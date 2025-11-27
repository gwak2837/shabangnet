import {
  optionManufacturerMappings as mockMappings,
  type OptionManufacturerMapping,
} from '@/lib/mock-data'

// 메모리에 데이터 복사
let mappingsData = [...mockMappings]

// API 지연 시뮬레이션
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getAll(): Promise<OptionManufacturerMapping[]> {
  await delay(300)
  return mappingsData
}

export async function getById(id: string): Promise<OptionManufacturerMapping | undefined> {
  await delay(200)
  return mappingsData.find((m) => m.id === id)
}

export async function create(
  data: Omit<OptionManufacturerMapping, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<OptionManufacturerMapping> {
  await delay(500)
  const now = new Date().toISOString()
  const newMapping: OptionManufacturerMapping = {
    ...data,
    id: `om${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
  mappingsData = [newMapping, ...mappingsData]
  return newMapping
}

export async function update(
  id: string,
  data: Partial<Omit<OptionManufacturerMapping, 'id' | 'createdAt'>>,
): Promise<OptionManufacturerMapping> {
  await delay(500)
  const index = mappingsData.findIndex((m) => m.id === id)
  if (index === -1) throw new Error('Mapping not found')

  mappingsData[index] = {
    ...mappingsData[index],
    ...data,
    updatedAt: new Date().toISOString(),
  }
  return mappingsData[index]
}

export async function remove(id: string): Promise<void> {
  await delay(300)
  mappingsData = mappingsData.filter((m) => m.id !== id)
}

