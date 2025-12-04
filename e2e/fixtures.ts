import path from 'path'

// 테스트 데이터 경로
export const TEST_DATA_DIR = path.join(__dirname, '../public/data/real-data')

// 테스트에서 사용할 파일들
export const TEST_FILES = {
  sabangnet: path.join(TEST_DATA_DIR, '사방넷 원본파일 수정본.xlsx'),
  skOriginal: path.join(TEST_DATA_DIR, 'sk원본1203.xlsx'),
  samsungWelfare: path.join(TEST_DATA_DIR, '삼성복지원본 1203.xlsx'),
  samsungCard: path.join(TEST_DATA_DIR, '삼성카드 원본 1203.xlsx'),
  // 예상 결과 파일
  expectedGochang: path.join(TEST_DATA_DIR, '다온발주양식_고창베리.xlsx'),
  expectedRodem: path.join(TEST_DATA_DIR, '다온발주양식_로뎀푸드.xlsx'),
}

// 테스트용 제조사
export const TEST_MANUFACTURERS = {
  gochang: {
    name: '고창베리세상',
    expectedOrderCount: 12,
  },
  rodem: {
    name: '로뎀푸드',
    expectedOrderCount: 18,
  },
  hanul: {
    name: '하늘명인',
    expectedOrderCount: 24,
  },
}

// 테스트 계정 정보
export const TEST_USER = {
  email: 'test@e2e.local',
  password: 'Test1234!',
}
