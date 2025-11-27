// Mock data for the Shabangnet Order Automation System

export interface Manufacturer {
  id: string
  name: string
  contactName: string
  email: string
  ccEmail?: string
  phone: string
  orderCount: number
  lastOrderDate: string
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  address: string
  productCode: string
  productName: string
  optionName: string
  quantity: number
  price: number
  manufacturerId: string
  manufacturerName: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  createdAt: string
  // F열 값 (발송 제외 판단용)
  fulfillmentType?: string
}

export interface Upload {
  id: string
  fileName: string
  fileSize: number
  totalOrders: number
  processedOrders: number
  errorOrders: number
  uploadedAt: string
  status: 'processing' | 'completed' | 'error'
}

export interface DashboardStats {
  todayOrders: number
  pendingOrders: number
  completedOrders: number
  errorOrders: number
  todayOrdersChange: number
  pendingOrdersChange: number
  completedOrdersChange: number
  errorOrdersChange: number
}

// Mock manufacturers
export const manufacturers: Manufacturer[] = [
  {
    id: 'm1',
    name: '농심식품',
    contactName: '김영희',
    email: 'kim@nongshim.com',
    ccEmail: 'order@nongshim.com',
    phone: '02-1234-5678',
    orderCount: 156,
    lastOrderDate: '2024-11-26',
  },
  {
    id: 'm2',
    name: 'CJ제일제당',
    contactName: '박철수',
    email: 'park@cj.net',
    phone: '02-2345-6789',
    orderCount: 234,
    lastOrderDate: '2024-11-26',
  },
  {
    id: 'm3',
    name: '오뚜기',
    contactName: '이미영',
    email: 'lee@ottogi.co.kr',
    ccEmail: 'supply@ottogi.co.kr',
    phone: '02-3456-7890',
    orderCount: 189,
    lastOrderDate: '2024-11-25',
  },
  {
    id: 'm4',
    name: '동원F&B',
    contactName: '정대현',
    email: 'jung@dongwon.com',
    phone: '02-4567-8901',
    orderCount: 98,
    lastOrderDate: '2024-11-26',
  },
  {
    id: 'm5',
    name: '풀무원',
    contactName: '최수진',
    email: 'choi@pulmuone.co.kr',
    phone: '02-5678-9012',
    orderCount: 145,
    lastOrderDate: '2024-11-24',
  },
  // 추가 제조사들
  {
    id: 'm6',
    name: '삼양식품',
    contactName: '김태호',
    email: 'kim@samyang.com',
    phone: '02-6789-0123',
    orderCount: 87,
    lastOrderDate: '2024-11-26',
  },
  {
    id: 'm7',
    name: '해태제과',
    contactName: '박지영',
    email: 'park@haitai.co.kr',
    ccEmail: 'order@haitai.co.kr',
    phone: '02-7890-1234',
    orderCount: 112,
    lastOrderDate: '2024-11-25',
  },
  {
    id: 'm8',
    name: '롯데푸드',
    contactName: '이상민',
    email: 'lee@lottefood.com',
    phone: '02-8901-2345',
    orderCount: 203,
    lastOrderDate: '2024-11-26',
  },
  {
    id: 'm9',
    name: '청정원',
    contactName: '최현우',
    email: 'choi@chungjungone.com',
    ccEmail: 'supply@chungjungone.com',
    phone: '02-9012-3456',
    orderCount: 67,
    lastOrderDate: '2024-11-24',
  },
  {
    id: 'm10',
    name: '빙그레',
    contactName: '정민서',
    email: 'jung@binggrae.com',
    phone: '02-0123-4567',
    orderCount: 134,
    lastOrderDate: '2024-11-26',
  },
]

// Mock orders
export const orders: Order[] = [
  // 일반 발송 대상 주문들
  {
    id: 'o1',
    orderNumber: 'SB20241126001',
    customerName: '홍길동',
    phone: '010-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    productCode: 'NS-001',
    productName: '신라면 멀티팩',
    optionName: '5개입',
    quantity: 2,
    price: 7900,
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    status: 'pending',
    createdAt: '2024-11-26T09:30:00',
    fulfillmentType: '일반택배',
  },
  {
    id: 'o2',
    orderNumber: 'SB20241126002',
    customerName: '김철수',
    phone: '010-2345-6789',
    address: '경기도 성남시 분당구 판교로 456',
    productCode: 'CJ-101',
    productName: '햇반 210g',
    optionName: '12개입',
    quantity: 1,
    price: 15800,
    manufacturerId: 'm2',
    manufacturerName: 'CJ제일제당',
    status: 'pending',
    createdAt: '2024-11-26T09:45:00',
    fulfillmentType: '제조사직송',
  },
  {
    id: 'o3',
    orderNumber: 'SB20241126003',
    customerName: '이영희',
    phone: '010-3456-7890',
    address: '인천시 연수구 송도대로 789',
    productCode: 'OT-201',
    productName: '진라면 순한맛',
    optionName: '5개입',
    quantity: 3,
    price: 4500,
    manufacturerId: 'm3',
    manufacturerName: '오뚜기',
    status: 'completed',
    createdAt: '2024-11-26T10:00:00',
    fulfillmentType: '일반택배',
  },
  {
    id: 'o4',
    orderNumber: 'SB20241126004',
    customerName: '박민수',
    phone: '010-4567-8901',
    address: '부산시 해운대구 해운대로 101',
    productCode: 'DW-301',
    productName: '동원참치 라이트',
    optionName: '150g 4캔',
    quantity: 2,
    price: 12900,
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    status: 'processing',
    createdAt: '2024-11-26T10:15:00',
    fulfillmentType: '제조사직송',
  },
  {
    id: 'o5',
    orderNumber: 'SB20241126005',
    customerName: '정수연',
    phone: '010-5678-9012',
    address: '대전시 유성구 대학로 202',
    productCode: 'PM-401',
    productName: '풀무원 두부',
    optionName: '300g',
    quantity: 4,
    price: 2800,
    manufacturerId: 'm5',
    manufacturerName: '풀무원',
    status: 'error',
    createdAt: '2024-11-26T10:30:00',
    fulfillmentType: '일반택배',
  },
  // 발송 제외 대상 주문들 (CJ온스타일, 현대홈쇼핑 등)
  {
    id: 'o6',
    orderNumber: 'SB20241126006',
    customerName: '배문경',
    phone: '0503-6449-5921',
    address: '경기도 시흥시 장현순환로 58 (장현동, 장현호반써밋)',
    productCode: 'OL-001',
    productName: '[엄마새PICK]엑스트라버진 유기농 올리브오일500mlx2병+발사믹1',
    optionName: '없음 [1]',
    quantity: 1,
    price: 69900,
    manufacturerId: 'm3',
    manufacturerName: '오뚜기',
    status: 'pending',
    createdAt: '2024-11-26T07:27:24',
    fulfillmentType: '[30002002]주문_센터택배',
  },
  {
    id: 'o7',
    orderNumber: 'SB20241126007',
    customerName: '한희숙',
    phone: '0503-6351-6315',
    address: '경기도 화성시 향남읍 상신하길로273번길 57 (모아미래도에듀파크서봉마을4단지)',
    productCode: 'OL-002',
    productName: '[카페]마스뚜르조 유기농 엑스트라버진 올리브오일 4병',
    optionName: '없음 [1]',
    quantity: 1,
    price: 149500,
    manufacturerId: 'm3',
    manufacturerName: '오뚜기',
    status: 'pending',
    createdAt: '2024-11-26T07:27:24',
    fulfillmentType: '[30002002]주문_직택배',
  },
  {
    id: 'o8',
    orderNumber: 'SB20241126008',
    customerName: '김현대',
    phone: '010-1111-2222',
    address: '서울시 중구 을지로 100',
    productCode: 'HW-001',
    productName: '농협안심한우 1++등급 냉장 한우 세트 1kg',
    optionName: '00001(없음) [1]',
    quantity: 1,
    price: 99000,
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    status: 'pending',
    createdAt: '2024-11-26T07:48:02',
    fulfillmentType: '현대홈직택배[제휴몰]현대이지웰',
  },
  {
    id: 'o9',
    orderNumber: 'SB20241126009',
    customerName: '박현대',
    phone: '010-3333-4444',
    address: '서울시 송파구 올림픽로 300',
    productCode: 'HW-002',
    productName: '농협안심한우 1++한우 실속 세트 1kg',
    optionName: '00001(없음) [1]',
    quantity: 1,
    price: 89900,
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    status: 'pending',
    createdAt: '2024-11-26T07:48:02',
    fulfillmentType: '현대홈직택배',
  },
  {
    id: 'o10',
    orderNumber: 'SB20241126010',
    customerName: '최영수',
    phone: '010-5555-6666',
    address: '경기도 수원시 팔달구 권광로 100',
    productCode: 'NS-002',
    productName: '안성탕면',
    optionName: '5개입',
    quantity: 2,
    price: 6500,
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    status: 'pending',
    createdAt: '2024-11-26T08:00:00',
    fulfillmentType: '[30002002]주문_센터택배',
  },
  // ===== 정상 발송 대상 (중복 아님) =====
  // 농심식품 - 새로운 주소 (중복 아님)
  {
    id: 'o11',
    orderNumber: 'SB20241126011',
    customerName: '강민호',
    phone: '010-7777-8888',
    address: '서울시 마포구 월드컵북로 396',
    productCode: 'NS-003',
    productName: '너구리',
    optionName: '5개입',
    quantity: 3,
    price: 6800,
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    status: 'pending',
    createdAt: '2024-11-26T11:00:00',
    fulfillmentType: '일반택배',
  },
  {
    id: 'o12',
    orderNumber: 'SB20241126012',
    customerName: '윤서준',
    phone: '010-8888-9999',
    address: '경기도 고양시 일산동구 중앙로 1261',
    productCode: 'NS-001',
    productName: '신라면 멀티팩',
    optionName: '5개입',
    quantity: 5,
    price: 7900,
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    status: 'pending',
    createdAt: '2024-11-26T11:15:00',
    fulfillmentType: '일반택배',
  },
  // CJ제일제당 - 새로운 주소 (중복 아님)
  {
    id: 'o13',
    orderNumber: 'SB20241126013',
    customerName: '임지현',
    phone: '010-1111-3333',
    address: '서울시 영등포구 여의대로 108',
    productCode: 'CJ-102',
    productName: '비비고 만두',
    optionName: '1kg',
    quantity: 2,
    price: 12900,
    manufacturerId: 'm2',
    manufacturerName: 'CJ제일제당',
    status: 'pending',
    createdAt: '2024-11-26T11:30:00',
    fulfillmentType: '일반택배',
  },
  {
    id: 'o14',
    orderNumber: 'SB20241126014',
    customerName: '송하은',
    phone: '010-2222-4444',
    address: '경기도 용인시 수지구 성복로 87',
    productCode: 'CJ-103',
    productName: '스팸 클래식',
    optionName: '200g',
    quantity: 4,
    price: 5900,
    manufacturerId: 'm2',
    manufacturerName: 'CJ제일제당',
    status: 'pending',
    createdAt: '2024-11-26T11:45:00',
    fulfillmentType: '일반택배',
  },
  // 오뚜기 - 새로운 주소 (중복 아님)
  {
    id: 'o15',
    orderNumber: 'SB20241126015',
    customerName: '장우진',
    phone: '010-3333-5555',
    address: '대구시 수성구 달구벌대로 2503',
    productCode: 'OT-202',
    productName: '오뚜기 카레',
    optionName: '100g',
    quantity: 6,
    price: 2500,
    manufacturerId: 'm3',
    manufacturerName: '오뚜기',
    status: 'pending',
    createdAt: '2024-11-26T12:00:00',
    fulfillmentType: '일반택배',
  },
  // 동원F&B - 새로운 주소 (중복 아님)
  {
    id: 'o16',
    orderNumber: 'SB20241126016',
    customerName: '한예은',
    phone: '010-4444-6666',
    address: '광주시 서구 상무중앙로 110',
    productCode: 'DW-302',
    productName: '동원 리챔',
    optionName: '200g',
    quantity: 3,
    price: 4500,
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    status: 'pending',
    createdAt: '2024-11-26T12:15:00',
    fulfillmentType: '일반택배',
  },
  {
    id: 'o17',
    orderNumber: 'SB20241126017',
    customerName: '노시우',
    phone: '010-5555-7777',
    address: '울산시 남구 삼산로 274',
    productCode: 'DW-301',
    productName: '동원참치 라이트',
    optionName: '150g 4캔',
    quantity: 2,
    price: 12900,
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    status: 'pending',
    createdAt: '2024-11-26T12:30:00',
    fulfillmentType: '일반택배',
  },
  // 풀무원 - 새로운 주소 (중복 아님)
  {
    id: 'o18',
    orderNumber: 'SB20241126018',
    customerName: '배수아',
    phone: '010-6666-8888',
    address: '세종시 한누리대로 2130',
    productCode: 'PM-402',
    productName: '풀무원 콩나물',
    optionName: '200g',
    quantity: 10,
    price: 1500,
    manufacturerId: 'm5',
    manufacturerName: '풀무원',
    status: 'pending',
    createdAt: '2024-11-26T12:45:00',
    fulfillmentType: '일반택배',
  },
  {
    id: 'o19',
    orderNumber: 'SB20241126019',
    customerName: '유도윤',
    phone: '010-7777-9999',
    address: '제주시 연동 292-10',
    productCode: 'PM-401',
    productName: '풀무원 두부',
    optionName: '300g',
    quantity: 5,
    price: 2800,
    manufacturerId: 'm5',
    manufacturerName: '풀무원',
    status: 'pending',
    createdAt: '2024-11-26T13:00:00',
    fulfillmentType: '일반택배',
  },
  // ===== 삼양식품 (m6) - 발송완료 상태 =====
  {
    id: 'o20',
    orderNumber: 'SB20241126020',
    customerName: '고은채',
    phone: '010-1234-0001',
    address: '서울시 강서구 화곡로 268',
    productCode: 'SY-001',
    productName: '삼양라면',
    optionName: '5개입',
    quantity: 3,
    price: 5500,
    manufacturerId: 'm6',
    manufacturerName: '삼양식품',
    status: 'completed',
    createdAt: '2024-11-26T08:30:00',
    fulfillmentType: '일반택배',
  },
  {
    id: 'o21',
    orderNumber: 'SB20241126021',
    customerName: '문서진',
    phone: '010-1234-0002',
    address: '서울시 노원구 동일로 1414',
    productCode: 'SY-002',
    productName: '불닭볶음면',
    optionName: '5개입',
    quantity: 2,
    price: 6800,
    manufacturerId: 'm6',
    manufacturerName: '삼양식품',
    status: 'completed',
    createdAt: '2024-11-26T08:45:00',
    fulfillmentType: '일반택배',
  },
  // ===== 해태제과 (m7) - 오류 상태 =====
  {
    id: 'o22',
    orderNumber: 'SB20241126022',
    customerName: '신유나',
    phone: '010-2345-0001',
    address: '경기도 안양시 동안구 시민대로 235',
    productCode: 'HT-001',
    productName: '맛동산',
    optionName: '300g',
    quantity: 4,
    price: 3200,
    manufacturerId: 'm7',
    manufacturerName: '해태제과',
    status: 'error',
    createdAt: '2024-11-26T09:00:00',
    fulfillmentType: '일반택배',
  },
  {
    id: 'o23',
    orderNumber: 'SB20241126023',
    customerName: '권도현',
    phone: '010-2345-0002',
    address: '경기도 부천시 원미구 길주로 1',
    productCode: 'HT-002',
    productName: '오예스',
    optionName: '12개입',
    quantity: 2,
    price: 5800,
    manufacturerId: 'm7',
    manufacturerName: '해태제과',
    status: 'pending',
    createdAt: '2024-11-26T09:15:00',
    fulfillmentType: '일반택배',
  },
  // ===== 롯데푸드 (m8) - 대기중 상태 =====
  {
    id: 'o24',
    orderNumber: 'SB20241126024',
    customerName: '오시아',
    phone: '010-3456-0001',
    address: '인천시 남동구 인하로 100',
    productCode: 'LF-001',
    productName: '롯데햄 의성마늘',
    optionName: '240g',
    quantity: 3,
    price: 6900,
    manufacturerId: 'm8',
    manufacturerName: '롯데푸드',
    status: 'pending',
    createdAt: '2024-11-26T10:30:00',
    fulfillmentType: '일반택배',
  },
  {
    id: 'o25',
    orderNumber: 'SB20241126025',
    customerName: '황지안',
    phone: '010-3456-0002',
    address: '인천시 계양구 계양대로 145',
    productCode: 'LF-002',
    productName: '초코파이',
    optionName: '18개입',
    quantity: 2,
    price: 7200,
    manufacturerId: 'm8',
    manufacturerName: '롯데푸드',
    status: 'pending',
    createdAt: '2024-11-26T10:45:00',
    fulfillmentType: '일반택배',
  },
  // ===== 청정원 (m9) - 발송완료 상태 =====
  {
    id: 'o26',
    orderNumber: 'SB20241126026',
    customerName: '백서연',
    phone: '010-4567-0001',
    address: '대전시 서구 둔산로 100',
    productCode: 'CJ-001',
    productName: '청정원 순창 고추장',
    optionName: '500g',
    quantity: 2,
    price: 8900,
    manufacturerId: 'm9',
    manufacturerName: '청정원',
    status: 'completed',
    createdAt: '2024-11-26T07:00:00',
    fulfillmentType: '일반택배',
  },
  {
    id: 'o27',
    orderNumber: 'SB20241126027',
    customerName: '남지호',
    phone: '010-4567-0002',
    address: '대전시 중구 대종로 480',
    productCode: 'CJ-002',
    productName: '청정원 카레여왕',
    optionName: '160g',
    quantity: 5,
    price: 4500,
    manufacturerId: 'm9',
    manufacturerName: '청정원',
    status: 'completed',
    createdAt: '2024-11-26T07:15:00',
    fulfillmentType: '일반택배',
  },
  // ===== 빙그레 (m10) - 처리중 상태 =====
  {
    id: 'o28',
    orderNumber: 'SB20241126028',
    customerName: '조하린',
    phone: '010-5678-0001',
    address: '경기도 파주시 문산읍 통일로 1680',
    productCode: 'BG-001',
    productName: '바나나맛 우유',
    optionName: '240ml 8개',
    quantity: 3,
    price: 9600,
    manufacturerId: 'm10',
    manufacturerName: '빙그레',
    status: 'processing',
    createdAt: '2024-11-26T11:00:00',
    fulfillmentType: '일반택배',
  },
  {
    id: 'o29',
    orderNumber: 'SB20241126029',
    customerName: '양서준',
    phone: '010-5678-0002',
    address: '경기도 김포시 고촌읍 아라육로 170',
    productCode: 'BG-002',
    productName: '메로나',
    optionName: '8개입',
    quantity: 4,
    price: 6400,
    manufacturerId: 'm10',
    manufacturerName: '빙그레',
    status: 'pending',
    createdAt: '2024-11-26T11:30:00',
    fulfillmentType: '일반택배',
  },
]

// Mock recent uploads
export const recentUploads: Upload[] = [
  {
    id: 'u1',
    fileName: '사방넷_주문내역_20241126.xlsx',
    fileSize: 245760,
    totalOrders: 156,
    processedOrders: 152,
    errorOrders: 4,
    uploadedAt: '2024-11-26T09:00:00',
    status: 'completed',
  },
  {
    id: 'u2',
    fileName: '사방넷_주문내역_20241125.xlsx',
    fileSize: 198540,
    totalOrders: 128,
    processedOrders: 128,
    errorOrders: 0,
    uploadedAt: '2024-11-25T09:15:00',
    status: 'completed',
  },
  {
    id: 'u3',
    fileName: '사방넷_주문내역_20241124.xlsx',
    fileSize: 312890,
    totalOrders: 203,
    processedOrders: 198,
    errorOrders: 5,
    uploadedAt: '2024-11-24T08:45:00',
    status: 'completed',
  },
]

// Dashboard stats
export const dashboardStats: DashboardStats = {
  todayOrders: 156,
  pendingOrders: 42,
  completedOrders: 110,
  errorOrders: 4,
  todayOrdersChange: 12.5,
  pendingOrdersChange: -8.2,
  completedOrdersChange: 23.1,
  errorOrdersChange: -33.3,
}

// Chart data for manufacturer orders
export const manufacturerChartData = [
  { name: '농심식품', orders: 45, amount: 892000 },
  { name: 'CJ제일제당', orders: 38, amount: 756000 },
  { name: '오뚜기', orders: 32, amount: 584000 },
  { name: '동원F&B', orders: 25, amount: 498000 },
  { name: '풀무원', orders: 16, amount: 312000 },
  { name: '삼양식품', orders: 22, amount: 356000 },
  { name: '해태제과', orders: 18, amount: 248000 },
  { name: '롯데푸드', orders: 28, amount: 412000 },
  { name: '청정원', orders: 14, amount: 198000 },
  { name: '빙그레', orders: 20, amount: 324000 },
]

// 발송 제외 패턴 설정
export interface ExclusionPattern {
  id: string
  pattern: string
  enabled: boolean
  description?: string
}

export interface ExclusionSettings {
  enabled: boolean
  patterns: ExclusionPattern[]
}

export const exclusionSettings: ExclusionSettings = {
  enabled: true,
  patterns: [
    {
      id: 'exc1',
      pattern: '[30002002]주문_센터택배',
      enabled: true,
      description: 'CJ온스타일 센터택배',
    },
    {
      id: 'exc2',
      pattern: '[30002002]주문_직택배',
      enabled: true,
      description: 'CJ온스타일 직택배',
    },
    {
      id: 'exc3',
      pattern: '현대홈직택배[제휴몰]현대이지웰',
      enabled: true,
      description: '현대홈쇼핑 제휴몰',
    },
    {
      id: 'exc4',
      pattern: '현대홈직택배',
      enabled: true,
      description: '현대홈쇼핑 직택배',
    },
  ],
}

// 발송 제외 여부 판단 헬퍼 함수
export function shouldExcludeFromEmail(fulfillmentType?: string): boolean {
  if (!exclusionSettings.enabled || !fulfillmentType) {
    return false
  }

  return exclusionSettings.patterns.some((p) => p.enabled && fulfillmentType.includes(p.pattern))
}

// Order status for batch processing
export interface OrderBatch {
  manufacturerId: string
  manufacturerName: string
  orders: Order[]
  totalOrders: number
  totalAmount: number
  status: 'pending' | 'ready' | 'sent' | 'error'
  email: string
  lastSentAt?: string
}

// 발송 대상 주문만 필터링하여 배치 생성
export function getEmailableOrders(): Order[] {
  return orders.filter((o) => !shouldExcludeFromEmail(o.fulfillmentType))
}

// 발송 제외 주문 가져오기
export function getExcludedOrders(): Order[] {
  return orders.filter((o) => shouldExcludeFromEmail(o.fulfillmentType))
}

// 발송 대상 주문으로 배치 생성
export const orderBatches: OrderBatch[] = manufacturers.map((m) => {
  // 발송 제외 주문은 배치에서 제외
  const mOrders = orders.filter((o) => o.manufacturerId === m.id && !shouldExcludeFromEmail(o.fulfillmentType))
  return {
    manufacturerId: m.id,
    manufacturerName: m.name,
    orders: mOrders,
    totalOrders: mOrders.length,
    totalAmount: mOrders.reduce((sum, o) => sum + o.price * o.quantity, 0),
    status: mOrders.some((o) => o.status === 'error')
      ? 'error'
      : mOrders.every((o) => o.status === 'completed')
        ? 'sent'
        : 'pending',
    email: m.email,
    lastSentAt: mOrders.every((o) => o.status === 'completed') ? '2024-11-26T11:30:00' : undefined,
  }
})

// 발송 제외 주문 배치 (제조사별 그룹화)
export const excludedOrderBatches: OrderBatch[] = manufacturers
  .map((m) => {
    const mOrders = orders.filter((o) => o.manufacturerId === m.id && shouldExcludeFromEmail(o.fulfillmentType))
    return {
      manufacturerId: m.id,
      manufacturerName: m.name,
      orders: mOrders,
      totalOrders: mOrders.length,
      totalAmount: mOrders.reduce((sum, o) => sum + o.price * o.quantity, 0),
      status: 'pending' as const,
      email: m.email,
    }
  })
  .filter((batch) => batch.totalOrders > 0)

// Utility functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getStatusColor(status: 'pending' | 'processing' | 'completed' | 'error' | 'ready' | 'sent'): string {
  const colors = {
    pending: 'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    ready: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-emerald-100 text-emerald-800',
    sent: 'bg-emerald-100 text-emerald-800',
    error: 'bg-rose-100 text-rose-800',
  }
  return colors[status] || colors.pending
}

export function getStatusLabel(status: 'pending' | 'processing' | 'completed' | 'error' | 'ready' | 'sent'): string {
  const labels = {
    pending: '대기중',
    processing: '처리중',
    ready: '발송대기',
    completed: '완료',
    sent: '발송완료',
    error: '오류',
  }
  return labels[status] || status
}

// Product interface and mock data
export interface Product {
  id: string
  productCode: string
  productName: string
  optionName: string
  manufacturerId: string | null
  manufacturerName: string | null
  price: number
  createdAt: string
  updatedAt: string
}

// 옵션-제조사 매핑 인터페이스
export interface OptionManufacturerMapping {
  id: string
  productCode: string // 상품코드
  optionName: string // 옵션명
  manufacturerId: string // 매핑된 제조사 ID
  manufacturerName: string // 제조사명 (표시용)
  createdAt: string
  updatedAt: string
}

// 옵션-제조사 매핑 Mock 데이터
export const optionManufacturerMappings: OptionManufacturerMapping[] = [
  {
    id: 'om1',
    productCode: 'OL-001',
    optionName: '500ml x 2병',
    manufacturerId: 'm3',
    manufacturerName: '오뚜기',
    createdAt: '2024-11-01T10:00:00',
    updatedAt: '2024-11-20T14:30:00',
  },
  {
    id: 'om2',
    productCode: 'OL-001',
    optionName: '1L x 1병',
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    createdAt: '2024-11-01T10:00:00',
    updatedAt: '2024-11-20T14:30:00',
  },
  {
    id: 'om3',
    productCode: 'HW-001',
    optionName: '등심 + 채끝',
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    createdAt: '2024-11-05T09:00:00',
    updatedAt: '2024-11-22T11:00:00',
  },
  {
    id: 'om4',
    productCode: 'HW-001',
    optionName: '불고기 세트',
    manufacturerId: 'm5',
    manufacturerName: '풀무원',
    createdAt: '2024-11-05T09:00:00',
    updatedAt: '2024-11-22T11:00:00',
  },
  {
    id: 'om5',
    productCode: 'NS-001',
    optionName: '10개입',
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    createdAt: '2024-11-10T14:00:00',
    updatedAt: '2024-11-25T09:00:00',
  },
  {
    id: 'om6',
    productCode: 'CJ-101',
    optionName: '24개입',
    manufacturerId: 'm2',
    manufacturerName: 'CJ제일제당',
    createdAt: '2024-11-12T11:00:00',
    updatedAt: '2024-11-24T16:00:00',
  },
]

// 빈 옵션 판별 헬퍼 함수
// "없음", "없음 [1]", "00001(없음) [1]" 등의 패턴 체크
export function isEmptyOption(optionName: string | undefined | null): boolean {
  if (!optionName) return true
  const normalized = optionName.trim().toLowerCase()
  // 빈 옵션 패턴들
  const emptyPatterns = [/^없음$/, /^없음\s*\[.*\]$/, /^\d+\(없음\)\s*\[.*\]$/, /^none$/i, /^기본$/, /^-$/, /^$/]
  return emptyPatterns.some((pattern) => pattern.test(normalized))
}

// 상품명 + 옵션명 조합 헬퍼 함수
// 빈 옵션이면 상품명만, 아니면 "상품명 옵션명" 형식
export function formatProductNameWithOption(productName: string, optionName: string | undefined | null): string {
  if (isEmptyOption(optionName)) {
    return productName
  }
  return `${productName} ${optionName}`
}

// 제조사 결정 함수 (우선순위: 옵션매핑 → 상품매핑 → null)
export function getManufacturerByProductAndOption(
  productCode: string,
  optionName: string | undefined | null,
): { manufacturerId: string | null; manufacturerName: string | null } {
  // 1. 옵션 매핑 테이블에서 (상품코드 + 옵션) 조합 검색
  if (optionName && !isEmptyOption(optionName)) {
    const optionMapping = optionManufacturerMappings.find(
      (m) => m.productCode === productCode && m.optionName === optionName,
    )
    if (optionMapping) {
      return {
        manufacturerId: optionMapping.manufacturerId,
        manufacturerName: optionMapping.manufacturerName,
      }
    }
  }

  // 2. 기존 상품-제조사 매핑 사용
  const product = products.find((p) => p.productCode === productCode)
  if (product && product.manufacturerId) {
    return {
      manufacturerId: product.manufacturerId,
      manufacturerName: product.manufacturerName,
    }
  }

  // 3. 매핑 없음
  return {
    manufacturerId: null,
    manufacturerName: null,
  }
}

export const products: Product[] = [
  {
    id: 'p1',
    productCode: 'NS-001',
    productName: '신라면 멀티팩',
    optionName: '5개입',
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    price: 7900,
    createdAt: '2024-01-15T10:00:00',
    updatedAt: '2024-11-20T14:30:00',
  },
  {
    id: 'p2',
    productCode: 'NS-002',
    productName: '안성탕면',
    optionName: '5개입',
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    price: 6500,
    createdAt: '2024-01-15T10:00:00',
    updatedAt: '2024-11-20T14:30:00',
  },
  {
    id: 'p3',
    productCode: 'CJ-101',
    productName: '햇반 210g',
    optionName: '12개입',
    manufacturerId: 'm2',
    manufacturerName: 'CJ제일제당',
    price: 15800,
    createdAt: '2024-02-10T09:00:00',
    updatedAt: '2024-11-18T11:00:00',
  },
  {
    id: 'p4',
    productCode: 'CJ-102',
    productName: '비비고 만두',
    optionName: '1kg',
    manufacturerId: 'm2',
    manufacturerName: 'CJ제일제당',
    price: 12900,
    createdAt: '2024-02-10T09:00:00',
    updatedAt: '2024-11-18T11:00:00',
  },
  {
    id: 'p5',
    productCode: 'OT-201',
    productName: '진라면 순한맛',
    optionName: '5개입',
    manufacturerId: 'm3',
    manufacturerName: '오뚜기',
    price: 4500,
    createdAt: '2024-03-05T14:00:00',
    updatedAt: '2024-11-15T09:00:00',
  },
  {
    id: 'p6',
    productCode: 'OT-202',
    productName: '오뚜기 카레',
    optionName: '100g',
    manufacturerId: 'm3',
    manufacturerName: '오뚜기',
    price: 2500,
    createdAt: '2024-03-05T14:00:00',
    updatedAt: '2024-11-15T09:00:00',
  },
  {
    id: 'p7',
    productCode: 'DW-301',
    productName: '동원참치 라이트',
    optionName: '150g 4캔',
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    price: 12900,
    createdAt: '2024-04-20T11:00:00',
    updatedAt: '2024-11-22T16:00:00',
  },
  {
    id: 'p8',
    productCode: 'PM-401',
    productName: '풀무원 두부',
    optionName: '300g',
    manufacturerId: 'm5',
    manufacturerName: '풀무원',
    price: 2800,
    createdAt: '2024-05-12T08:00:00',
    updatedAt: '2024-11-10T13:00:00',
  },
  {
    id: 'p9',
    productCode: 'PM-402',
    productName: '풀무원 콩나물',
    optionName: '200g',
    manufacturerId: 'm5',
    manufacturerName: '풀무원',
    price: 1500,
    createdAt: '2024-05-12T08:00:00',
    updatedAt: '2024-11-10T13:00:00',
  },
  {
    id: 'p10',
    productCode: 'UNKNOWN-001',
    productName: '미등록 상품 A',
    optionName: '기본',
    manufacturerId: null,
    manufacturerName: null,
    price: 5000,
    createdAt: '2024-11-25T10:00:00',
    updatedAt: '2024-11-25T10:00:00',
  },
  {
    id: 'p11',
    productCode: 'UNKNOWN-002',
    productName: '미등록 상품 B',
    optionName: '기본',
    manufacturerId: null,
    manufacturerName: null,
    price: 8000,
    createdAt: '2024-11-25T11:00:00',
    updatedAt: '2024-11-25T11:00:00',
  },
  {
    id: 'p12',
    productCode: 'UNKNOWN-003',
    productName: '미등록 상품 C',
    optionName: '대용량',
    manufacturerId: null,
    manufacturerName: null,
    price: 15000,
    createdAt: '2024-11-26T09:00:00',
    updatedAt: '2024-11-26T09:00:00',
  },
  {
    id: 'p13',
    productCode: 'NS-003',
    productName: '너구리',
    optionName: '5개입',
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    price: 6800,
    createdAt: '2024-06-01T10:00:00',
    updatedAt: '2024-11-20T14:30:00',
  },
  {
    id: 'p14',
    productCode: 'CJ-103',
    productName: '스팸 클래식',
    optionName: '200g',
    manufacturerId: 'm2',
    manufacturerName: 'CJ제일제당',
    price: 5900,
    createdAt: '2024-06-15T09:00:00',
    updatedAt: '2024-11-18T11:00:00',
  },
  {
    id: 'p15',
    productCode: 'DW-302',
    productName: '동원 리챔',
    optionName: '200g',
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    price: 4500,
    createdAt: '2024-07-10T11:00:00',
    updatedAt: '2024-11-22T16:00:00',
  },
]

// Send Log interface and mock data
export interface SendLog {
  id: string
  manufacturerId: string
  manufacturerName: string
  email: string
  subject: string
  fileName: string
  orderCount: number
  totalAmount: number
  status: 'success' | 'failed' | 'pending'
  errorMessage?: string
  sentAt: string
  sentBy: string
  // 중복 발주 체크를 위한 수취인 주소 정보
  recipientAddresses: string[]
  // 중복 발송 시 입력한 사유
  duplicateReason?: string
}

// 현재 날짜 기준 상대적 날짜 생성 헬퍼
function getRelativeDate(daysAgo: number, hours: number = 10, minutes: number = 0): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

function formatDateForFileName(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

export const sendLogs: SendLog[] = [
  {
    id: 'log1',
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    email: 'kim@nongshim.com',
    subject: `[다온에프앤씨 발주서]_농심식품_${formatDateForFileName(0)}`,
    fileName: `[다온에프앤씨 발주서]_농심식품_${formatDateForFileName(0)}.xlsx`,
    orderCount: 45,
    totalAmount: 892000,
    status: 'success',
    sentAt: getRelativeDate(0, 11, 30), // 오늘
    sentBy: '관리자',
    recipientAddresses: ['서울시 강남구 테헤란로 123', '경기도 성남시 분당구 판교로 456'],
  },
  {
    id: 'log2',
    manufacturerId: 'm2',
    manufacturerName: 'CJ제일제당',
    email: 'park@cj.net',
    subject: `[다온에프앤씨 발주서]_CJ제일제당_${formatDateForFileName(0)}`,
    fileName: `[다온에프앤씨 발주서]_CJ제일제당_${formatDateForFileName(0)}.xlsx`,
    orderCount: 38,
    totalAmount: 756000,
    status: 'success',
    sentAt: getRelativeDate(0, 11, 32), // 오늘
    sentBy: '관리자',
    recipientAddresses: ['경기도 성남시 분당구 판교로 456', '인천시 연수구 송도대로 789'],
  },
  {
    id: 'log3',
    manufacturerId: 'm3',
    manufacturerName: '오뚜기',
    email: 'lee@ottogi.co.kr',
    subject: `[다온에프앤씨 발주서]_오뚜기_${formatDateForFileName(0)}`,
    fileName: `[다온에프앤씨 발주서]_오뚜기_${formatDateForFileName(0)}.xlsx`,
    orderCount: 32,
    totalAmount: 584000,
    status: 'success',
    sentAt: getRelativeDate(0, 11, 35), // 오늘
    sentBy: '관리자',
    recipientAddresses: ['인천시 연수구 송도대로 789', '부산시 해운대구 해운대로 101'],
  },
  {
    id: 'log4',
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    email: 'jung@dongwon.com',
    subject: `[다온에프앤씨 발주서]_동원F&B_${formatDateForFileName(1)}`,
    fileName: `[다온에프앤씨 발주서]_동원F&B_${formatDateForFileName(1)}.xlsx`,
    orderCount: 25,
    totalAmount: 498000,
    status: 'failed',
    errorMessage: 'SMTP 연결 실패: 서버 응답 없음',
    sentAt: getRelativeDate(1, 10, 15), // 1일 전
    sentBy: '관리자',
    recipientAddresses: ['부산시 해운대구 해운대로 101'],
  },
  {
    id: 'log5',
    manufacturerId: 'm5',
    manufacturerName: '풀무원',
    email: 'choi@pulmuone.co.kr',
    subject: `[다온에프앤씨 발주서]_풀무원_${formatDateForFileName(1)}`,
    fileName: `[다온에프앤씨 발주서]_풀무원_${formatDateForFileName(1)}.xlsx`,
    orderCount: 16,
    totalAmount: 312000,
    status: 'success',
    sentAt: getRelativeDate(1, 10, 20), // 1일 전
    sentBy: '관리자',
    recipientAddresses: ['대전시 유성구 대학로 202'],
  },
  {
    id: 'log6',
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    email: 'kim@nongshim.com',
    subject: `[다온에프앤씨 발주서]_농심식품_${formatDateForFileName(1)}`,
    fileName: `[다온에프앤씨 발주서]_농심식품_${formatDateForFileName(1)}.xlsx`,
    orderCount: 52,
    totalAmount: 1024000,
    status: 'success',
    sentAt: getRelativeDate(1, 10, 10), // 1일 전
    sentBy: '관리자',
    recipientAddresses: ['서울시 강남구 테헤란로 123', '서울시 서초구 반포대로 200'],
  },
  {
    id: 'log7',
    manufacturerId: 'm2',
    manufacturerName: 'CJ제일제당',
    email: 'park@cj.net',
    subject: `[다온에프앤씨 발주서]_CJ제일제당_${formatDateForFileName(2)}`,
    fileName: `[다온에프앤씨 발주서]_CJ제일제당_${formatDateForFileName(2)}.xlsx`,
    orderCount: 41,
    totalAmount: 820000,
    status: 'success',
    sentAt: getRelativeDate(2, 11, 0), // 2일 전
    sentBy: '관리자',
    recipientAddresses: ['경기도 성남시 분당구 판교로 456'],
  },
  {
    id: 'log8',
    manufacturerId: 'm3',
    manufacturerName: '오뚜기',
    email: 'invalid-email',
    subject: `[다온에프앤씨 발주서]_오뚜기_${formatDateForFileName(2)}`,
    fileName: `[다온에프앤씨 발주서]_오뚜기_${formatDateForFileName(2)}.xlsx`,
    orderCount: 28,
    totalAmount: 456000,
    status: 'failed',
    errorMessage: '잘못된 이메일 주소 형식',
    sentAt: getRelativeDate(2, 10, 45), // 2일 전
    sentBy: '관리자',
    recipientAddresses: ['인천시 연수구 송도대로 789'],
  },
  {
    id: 'log9',
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    email: 'jung@dongwon.com',
    subject: `[다온에프앤씨 발주서]_동원F&B_${formatDateForFileName(2)}`,
    fileName: `[다온에프앤씨 발주서]_동원F&B_${formatDateForFileName(2)}.xlsx`,
    orderCount: 19,
    totalAmount: 380000,
    status: 'success',
    sentAt: getRelativeDate(2, 10, 30), // 2일 전
    sentBy: '관리자',
    recipientAddresses: ['부산시 해운대구 해운대로 101', '대구시 중구 동성로 55'],
  },
  {
    id: 'log10',
    manufacturerId: 'm5',
    manufacturerName: '풀무원',
    email: 'choi@pulmuone.co.kr',
    subject: `[다온에프앤씨 발주서]_풀무원_${formatDateForFileName(3)}`,
    fileName: `[다온에프앤씨 발주서]_풀무원_${formatDateForFileName(3)}.xlsx`,
    orderCount: 14,
    totalAmount: 280000,
    status: 'success',
    sentAt: getRelativeDate(3, 9, 45), // 3일 전
    sentBy: '관리자',
    recipientAddresses: ['대전시 유성구 대학로 202'],
  },
  // 삼양식품 발송 이력 (발송완료 상태용)
  {
    id: 'log11',
    manufacturerId: 'm6',
    manufacturerName: '삼양식품',
    email: 'kim@samyang.com',
    subject: `[다온에프앤씨 발주서]_삼양식품_${formatDateForFileName(0)}`,
    fileName: `[다온에프앤씨 발주서]_삼양식품_${formatDateForFileName(0)}.xlsx`,
    orderCount: 22,
    totalAmount: 356000,
    status: 'success',
    sentAt: getRelativeDate(0, 9, 0), // 오늘
    sentBy: '관리자',
    recipientAddresses: ['서울시 강서구 화곡로 268', '서울시 노원구 동일로 1414'],
  },
  // 청정원 발송 이력 (발송완료 상태용)
  {
    id: 'log12',
    manufacturerId: 'm9',
    manufacturerName: '청정원',
    email: 'choi@chungjungone.com',
    subject: `[다온에프앤씨 발주서]_청정원_${formatDateForFileName(0)}`,
    fileName: `[다온에프앤씨 발주서]_청정원_${formatDateForFileName(0)}.xlsx`,
    orderCount: 14,
    totalAmount: 198000,
    status: 'success',
    sentAt: getRelativeDate(0, 8, 30), // 오늘
    sentBy: '관리자',
    recipientAddresses: ['대전시 서구 둔산로 100', '대전시 중구 대종로 480'],
  },
  // 롯데푸드 발송 이력
  {
    id: 'log13',
    manufacturerId: 'm8',
    manufacturerName: '롯데푸드',
    email: 'lee@lottefood.com',
    subject: `[다온에프앤씨 발주서]_롯데푸드_${formatDateForFileName(1)}`,
    fileName: `[다온에프앤씨 발주서]_롯데푸드_${formatDateForFileName(1)}.xlsx`,
    orderCount: 28,
    totalAmount: 412000,
    status: 'success',
    sentAt: getRelativeDate(1, 14, 0), // 1일 전
    sentBy: '관리자',
    recipientAddresses: ['인천시 부평구 부평대로 283'],
  },
  // 빙그레 발송 이력
  {
    id: 'log14',
    manufacturerId: 'm10',
    manufacturerName: '빙그레',
    email: 'jung@binggrae.com',
    subject: `[다온에프앤씨 발주서]_빙그레_${formatDateForFileName(2)}`,
    fileName: `[다온에프앤씨 발주서]_빙그레_${formatDateForFileName(2)}.xlsx`,
    orderCount: 20,
    totalAmount: 324000,
    status: 'success',
    sentAt: getRelativeDate(2, 15, 30), // 2일 전
    sentBy: '관리자',
    recipientAddresses: ['경기도 파주시 문산읍 통일로 1680'],
  },
  // 해태제과 발송 실패 이력
  {
    id: 'log15',
    manufacturerId: 'm7',
    manufacturerName: '해태제과',
    email: 'park@haitai.co.kr',
    subject: `[다온에프앤씨 발주서]_해태제과_${formatDateForFileName(1)}`,
    fileName: `[다온에프앤씨 발주서]_해태제과_${formatDateForFileName(1)}.xlsx`,
    orderCount: 18,
    totalAmount: 248000,
    status: 'failed',
    errorMessage: '첨부 파일 생성 오류',
    sentAt: getRelativeDate(1, 11, 0), // 1일 전
    sentBy: '관리자',
    recipientAddresses: ['경기도 안양시 동안구 시민대로 235'],
  },
]

// SMTP Settings interface
export interface SMTPSettings {
  host: string
  port: number
  username: string
  password: string
  secure: boolean
  fromName: string
  fromEmail: string
}

export const smtpSettings: SMTPSettings = {
  host: 'smtp.gmail.com',
  port: 587,
  username: 'daonfnc@gmail.com',
  password: '',
  secure: true,
  fromName: '(주)다온에프앤씨',
  fromEmail: 'daonfnc@gmail.com',
}

// 중복 발주 체크 설정
export type DuplicateCheckPeriod = 10 | 15 | 20 | 30

export interface DuplicateCheckSettings {
  enabled: boolean
  periodDays: DuplicateCheckPeriod
}

export const duplicateCheckSettings: DuplicateCheckSettings = {
  enabled: true,
  periodDays: 10,
}

// 중복 발송 이력 체크 결과
export interface DuplicateCheckResult {
  hasDuplicate: boolean
  duplicateLogs: SendLog[]
  matchedAddresses: string[]
}

// 중복 발송 체크 헬퍼 함수
export function checkDuplicateSend(
  manufacturerId: string,
  recipientAddresses: string[],
  periodDays: DuplicateCheckPeriod = 10,
): DuplicateCheckResult {
  const now = new Date()
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

  // 해당 제조사의 성공한 발송 로그 중 기간 내 로그 필터링
  const recentLogs = sendLogs.filter((log) => {
    if (log.manufacturerId !== manufacturerId) return false
    if (log.status !== 'success') return false
    const sentDate = new Date(log.sentAt)
    return sentDate >= periodStart
  })

  // 중복 주소 찾기
  const matchedAddresses: string[] = []
  const duplicateLogs: SendLog[] = []

  for (const log of recentLogs) {
    const matches = recipientAddresses.filter((addr) =>
      log.recipientAddresses.some((logAddr) => normalizeAddress(logAddr) === normalizeAddress(addr)),
    )
    if (matches.length > 0) {
      matchedAddresses.push(...matches)
      if (!duplicateLogs.includes(log)) {
        duplicateLogs.push(log)
      }
    }
  }

  // 중복 제거
  const uniqueMatchedAddresses = [...new Set(matchedAddresses)]

  return {
    hasDuplicate: uniqueMatchedAddresses.length > 0,
    duplicateLogs,
    matchedAddresses: uniqueMatchedAddresses,
  }
}

// 주소 정규화 (공백, 특수문자 등 제거하여 비교)
function normalizeAddress(address: string): string {
  return address.replace(/\s+/g, '').replace(/[,.-]/g, '').toLowerCase()
}

// 일 수 차이 계산
export function getDaysDifference(dateString: string): number {
  const now = new Date()
  const targetDate = new Date(dateString)
  const diffTime = Math.abs(now.getTime() - targetDate.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
