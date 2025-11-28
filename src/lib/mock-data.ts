// Mock data for the Sabangnet Order Automation System

export interface DashboardStats {
  completedOrders: number
  completedOrdersChange: number
  errorOrders: number
  errorOrdersChange: number
  pendingOrders: number
  pendingOrdersChange: number
  todayOrders: number
  todayOrdersChange: number
}

export interface Manufacturer {
  ccEmail?: string
  contactName: string
  email: string
  id: string
  lastOrderDate: string
  name: string
  orderCount: number
  phone: string
}

export interface Order {
  address: string
  createdAt: string
  customerName: string
  // F열 값 (발송 제외 판단용)
  fulfillmentType?: string
  id: string
  manufacturerId: string
  manufacturerName: string
  optionName: string
  orderNumber: string
  phone: string
  price: number
  productCode: string
  productName: string
  quantity: number
  status: 'completed' | 'error' | 'pending' | 'processing'
}

export interface Upload {
  errorOrders: number
  fileName: string
  fileSize: number
  id: string
  processedOrders: number
  status: 'completed' | 'error' | 'processing'
  totalOrders: number
  uploadedAt: string
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
  // ===== 지정일 제외 대상 주문들 =====
  // 케이스 1: "지정일" 단독 - 농심식품
  {
    id: 'o30',
    orderNumber: 'SB20241126030',
    customerName: '김지정',
    phone: '010-1111-0030',
    address: '서울시 강동구 천호대로 1005',
    productCode: 'NS-001',
    productName: '신라면 멀티팩',
    optionName: '5개입',
    quantity: 3,
    price: 7900,
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    status: 'pending',
    createdAt: '2024-11-26T13:00:00',
    fulfillmentType: '지정일',
  },
  // 케이스 2: "지정일 12/25" (날짜와 함께) - CJ제일제당
  {
    id: 'o31',
    orderNumber: 'SB20241126031',
    customerName: '박크리스',
    phone: '010-2222-0031',
    address: '서울시 서초구 반포대로 45',
    productCode: 'CJ-102',
    productName: '비비고 만두',
    optionName: '1kg',
    quantity: 2,
    price: 12900,
    manufacturerId: 'm2',
    manufacturerName: 'CJ제일제당',
    status: 'pending',
    createdAt: '2024-11-26T13:15:00',
    fulfillmentType: '지정일 12/25',
  },
  // 케이스 3: "지정일배송" (연속된 텍스트) - 오뚜기
  {
    id: 'o32',
    orderNumber: 'SB20241126032',
    customerName: '이배송',
    phone: '010-3333-0032',
    address: '경기도 안양시 만안구 안양로 100',
    productCode: 'OT-202',
    productName: '오뚜기 카레',
    optionName: '100g',
    quantity: 5,
    price: 2500,
    manufacturerId: 'm3',
    manufacturerName: '오뚜기',
    status: 'pending',
    createdAt: '2024-11-26T13:30:00',
    fulfillmentType: '지정일배송',
  },
  // 케이스 4: "지정일요청" - 동원F&B
  {
    id: 'o33',
    orderNumber: 'SB20241126033',
    customerName: '최요청',
    phone: '010-4444-0033',
    address: '부산시 사하구 낙동대로 550',
    productCode: 'DW-302',
    productName: '동원 리챔',
    optionName: '200g',
    quantity: 4,
    price: 4500,
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    status: 'pending',
    createdAt: '2024-11-26T13:45:00',
    fulfillmentType: '지정일요청',
  },
  // 케이스 5: "희망지정일" - 풀무원
  {
    id: 'o34',
    orderNumber: 'SB20241126034',
    customerName: '정희망',
    phone: '010-5555-0034',
    address: '대구시 달서구 달구벌대로 1234',
    productCode: 'PM-402',
    productName: '풀무원 콩나물',
    optionName: '200g',
    quantity: 8,
    price: 1500,
    manufacturerId: 'm5',
    manufacturerName: '풀무원',
    status: 'pending',
    createdAt: '2024-11-26T14:00:00',
    fulfillmentType: '희망지정일',
  },
  // ===== 복합 케이스: 한 제조사에 여러 제외 사유 =====
  // 케이스 6: 농심식품 - CJ온스타일 센터택배 (기존 패턴)
  {
    id: 'o35',
    orderNumber: 'SB20241126035',
    customerName: '강복합',
    phone: '010-6666-0035',
    address: '서울시 광진구 능동로 120',
    productCode: 'NS-003',
    productName: '너구리',
    optionName: '5개입',
    quantity: 2,
    price: 6800,
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    status: 'pending',
    createdAt: '2024-11-26T14:15:00',
    fulfillmentType: '[30002002]주문_센터택배',
  },
  // 케이스 7: 농심식품에 지정일 추가 (같은 제조사에 여러 제외 사유)
  {
    id: 'o36',
    orderNumber: 'SB20241126036',
    customerName: '윤다중',
    phone: '010-7777-0036',
    address: '서울시 송파구 송파대로 111',
    productCode: 'NS-002',
    productName: '안성탕면',
    optionName: '5개입',
    quantity: 3,
    price: 6500,
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    status: 'pending',
    createdAt: '2024-11-26T14:30:00',
    fulfillmentType: '지정일 12/31',
  },
  // ===== 복합 케이스: 동원F&B에 지정일 + 현대홈직택배 =====
  // 케이스 8: 동원F&B - 지정일 추가
  {
    id: 'o37',
    orderNumber: 'SB20241126037',
    customerName: '임혼합',
    phone: '010-8888-0037',
    address: '인천시 부평구 부평대로 200',
    productCode: 'DW-301',
    productName: '동원참치 라이트',
    optionName: '150g 4캔',
    quantity: 2,
    price: 12900,
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    status: 'pending',
    createdAt: '2024-11-26T14:45:00',
    fulfillmentType: '지정일',
  },
  // ===== 여러 제조사에 걸친 지정일 주문들 =====
  // 케이스 9: 삼양식품 - 지정일
  {
    id: 'o38',
    orderNumber: 'SB20241126038',
    customerName: '한삼양',
    phone: '010-9999-0038',
    address: '광주시 북구 용봉로 77',
    productCode: 'SY-001',
    productName: '삼양라면',
    optionName: '5개입',
    quantity: 4,
    price: 5500,
    manufacturerId: 'm6',
    manufacturerName: '삼양식품',
    status: 'pending',
    createdAt: '2024-11-26T15:00:00',
    fulfillmentType: '지정일 01/01',
  },
  // 케이스 10: 해태제과 - 지정일
  {
    id: 'o39',
    orderNumber: 'SB20241126039',
    customerName: '오해태',
    phone: '010-0000-0039',
    address: '울산시 중구 번영로 500',
    productCode: 'HT-001',
    productName: '맛동산',
    optionName: '300g',
    quantity: 6,
    price: 3200,
    manufacturerId: 'm7',
    manufacturerName: '해태제과',
    status: 'pending',
    createdAt: '2024-11-26T15:15:00',
    fulfillmentType: '지정일배송요청',
  },
  // 케이스 11: 롯데푸드 - 지정일
  {
    id: 'o40',
    orderNumber: 'SB20241126040',
    customerName: '서롯데',
    phone: '010-1010-0040',
    address: '세종시 한누리대로 2130',
    productCode: 'LF-001',
    productName: '롯데햄 의성마늘',
    optionName: '240g',
    quantity: 3,
    price: 6900,
    manufacturerId: 'm8',
    manufacturerName: '롯데푸드',
    status: 'pending',
    createdAt: '2024-11-26T15:30:00',
    fulfillmentType: '지정일',
  },
  // 케이스 12: 청정원 - 지정일 (날짜 포함)
  {
    id: 'o41',
    orderNumber: 'SB20241126041',
    customerName: '노청정',
    phone: '010-1111-0041',
    address: '제주시 연동 292-20',
    productCode: 'CJ-001',
    productName: '청정원 순창 고추장',
    optionName: '500g',
    quantity: 2,
    price: 8900,
    manufacturerId: 'm9',
    manufacturerName: '청정원',
    status: 'pending',
    createdAt: '2024-11-26T15:45:00',
    fulfillmentType: '지정일 12/20',
  },
  // 케이스 13: 빙그레 - 지정일
  {
    id: 'o42',
    orderNumber: 'SB20241126042',
    customerName: '장빙그',
    phone: '010-1212-0042',
    address: '경기도 의정부시 호국로 1000',
    productCode: 'BG-001',
    productName: '바나나맛 우유',
    optionName: '240ml 8개',
    quantity: 5,
    price: 9600,
    manufacturerId: 'm10',
    manufacturerName: '빙그레',
    status: 'pending',
    createdAt: '2024-11-26T16:00:00',
    fulfillmentType: '지정일요청 12/24',
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
  description?: string
  displayLabel?: string // 표시용 라벨 (없으면 pattern 그대로 표시)
  enabled: boolean
  id: string
  pattern: string
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
    {
      id: 'exc5',
      pattern: '지정일',
      enabled: true,
      description: '지정일 배송 요청',
      displayLabel: '지정일',
    },
  ],
}

// Order status for batch processing
export interface OrderBatch {
  email: string
  lastSentAt?: string
  manufacturerId: string
  manufacturerName: string
  orders: Order[]
  status: 'error' | 'pending' | 'ready' | 'sent'
  totalAmount: number
  totalOrders: number
}

// 발송 대상 주문만 필터링하여 배치 생성
export function getEmailableOrders(): Order[] {
  return orders.filter((o) => !shouldExcludeFromEmail(o.fulfillmentType))
}

// 발송 제외 주문 가져오기
export function getExcludedOrders(): Order[] {
  return orders.filter((o) => shouldExcludeFromEmail(o.fulfillmentType))
}

// 제외 사유 표시용 라벨 가져오기
export function getExclusionLabel(fulfillmentType?: string): string | null {
  if (!fulfillmentType) {
    return null
  }

  const matchedPattern = exclusionSettings.patterns.find((p) => p.enabled && fulfillmentType.includes(p.pattern))

  if (!matchedPattern) {
    return null
  }

  // displayLabel이 있으면 사용, 없으면 description, 그것도 없으면 원본 fulfillmentType
  return matchedPattern.displayLabel || matchedPattern.description || fulfillmentType
}

// 발송 제외 여부 판단 헬퍼 함수
export function shouldExcludeFromEmail(fulfillmentType?: string): boolean {
  if (!exclusionSettings.enabled || !fulfillmentType) {
    return false
  }

  return exclusionSettings.patterns.some((p) => p.enabled && fulfillmentType.includes(p.pattern))
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

// 옵션-제조사 매핑 인터페이스
export interface OptionManufacturerMapping {
  createdAt: string
  id: string
  manufacturerId: string // 매핑된 제조사 ID
  manufacturerName: string // 제조사명 (표시용)
  optionName: string // 옵션명
  productCode: string // 상품코드
  updatedAt: string
}

// Product interface and mock data
export interface Product {
  cost: number // 원가
  createdAt: string
  id: string
  manufacturerId: string | null
  manufacturerName: string | null
  optionName: string
  price: number
  productCode: string
  productName: string
  updatedAt: string
}

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

export function getStatusColor(status: 'completed' | 'error' | 'pending' | 'processing' | 'ready' | 'sent'): string {
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

export function getStatusLabel(status: 'completed' | 'error' | 'pending' | 'processing' | 'ready' | 'sent'): string {
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

// 상품명 + 옵션명 조합 헬퍼 함수
// 빈 옵션이면 상품명만, 아니면 "상품명 옵션명" 형식
export function formatProductNameWithOption(productName: string, optionName: string | null | undefined): string {
  if (isEmptyOption(optionName)) {
    return productName
  }
  return `${productName} ${optionName}`
}

// 제조사 결정 함수 (우선순위: 옵션매핑 → 상품매핑 → null)
export function getManufacturerByProductAndOption(
  productCode: string,
  optionName: string | null | undefined,
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

// 빈 옵션 판별 헬퍼 함수
// "없음", "없음 [1]", "00001(없음) [1]" 등의 패턴 체크
export function isEmptyOption(optionName: string | null | undefined): boolean {
  if (!optionName) return true
  const normalized = optionName.trim().toLowerCase()
  // 빈 옵션 패턴들
  const emptyPatterns = [/^없음$/, /^없음\s*\[.*\]$/, /^\d+\(없음\)\s*\[.*\]$/, /^none$/i, /^기본$/, /^-$/, /^$/]
  return emptyPatterns.some((pattern) => pattern.test(normalized))
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
    cost: 5500,
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
    cost: 4500,
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
    cost: 11000,
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
    cost: 9000,
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
    cost: 3100,
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
    cost: 1700,
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
    cost: 9000,
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
    cost: 1900,
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
    cost: 1000,
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
    cost: 0,
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
    cost: 0,
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
    cost: 0,
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
    cost: 4700,
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
    cost: 4100,
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
    cost: 3100,
    createdAt: '2024-07-10T11:00:00',
    updatedAt: '2024-11-22T16:00:00',
  },
]

// Send Log interface and mock data
export interface SendLog {
  // 중복 발송 시 입력한 사유
  duplicateReason?: string
  email: string
  errorMessage?: string
  fileName: string
  id: string
  manufacturerId: string
  manufacturerName: string
  orderCount: number
  // 발송에 포함된 주문 상세
  orders: SendLogOrder[]
  // 중복 발주 체크를 위한 수취인 주소 정보
  recipientAddresses: string[]
  sentAt: string
  sentBy: string
  status: 'failed' | 'pending' | 'success'
  subject: string
  totalAmount: number
}

// Send Log Order (발송 로그에 포함된 주문 상세)
export interface SendLogOrder {
  address: string
  cost: number // 발주 시점 원가
  customerName: string
  optionName: string
  orderNumber: string
  price: number
  productName: string
  quantity: number
}

function formatDateForFileName(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

// 현재 날짜 기준 상대적 날짜 생성 헬퍼
function getRelativeDate(daysAgo: number, hours: number = 10, minutes: number = 0): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

// 주문 샘플 데이터 생성 헬퍼
const sampleProducts: Record<string, { name: string; options: string[]; price: number; cost: number }[]> = {
  m1: [
    // 농심식품
    { name: '신라면 멀티팩', options: ['5개입', '10개입'], price: 4500, cost: 3100 },
    { name: '안성탕면', options: ['5개입'], price: 3800, cost: 2600 },
    { name: '새우깡', options: ['대용량', '소용량'], price: 2500, cost: 1700 },
  ],
  m2: [
    // CJ제일제당
    { name: '햇반 210g', options: ['12개입', '24개입'], price: 12000, cost: 8400 },
    { name: '비비고 만두', options: ['고기만두', '김치만두'], price: 8900, cost: 6200 },
    { name: '스팸 클래식', options: ['200g', '340g'], price: 5500, cost: 3800 },
  ],
  m3: [
    // 오뚜기
    { name: '진라면', options: ['매운맛', '순한맛'], price: 3200, cost: 2200 },
    { name: '오뚜기 카레', options: ['중간맛', '순한맛'], price: 2800, cost: 1900 },
    { name: '참깨라면', options: ['5개입'], price: 3500, cost: 2400 },
  ],
  m4: [
    // 동원F&B
    { name: '동원참치', options: ['살코기', '고추참치'], price: 4200, cost: 2900 },
    { name: '리챔', options: ['200g', '340g'], price: 5800, cost: 4000 },
    { name: '양반김', options: ['도시락김', '전장김'], price: 6500, cost: 4500 },
  ],
  m5: [
    // 풀무원
    { name: '두부', options: ['찌개용', '부침용'], price: 2800, cost: 1900 },
    { name: '생면식감', options: ['짜장', '짬뽕'], price: 4500, cost: 3100 },
    { name: '콩나물', options: ['500g'], price: 1800, cost: 1200 },
  ],
  m6: [
    // 삼양식품
    { name: '불닭볶음면', options: ['5개입', '까르보'], price: 4800, cost: 3300 },
    { name: '삼양라면', options: ['5개입'], price: 3200, cost: 2200 },
  ],
  m7: [
    // 해태제과
    { name: '홈런볼', options: ['초코', '딸기'], price: 3500, cost: 2400 },
    { name: '맛동산', options: ['대용량'], price: 4200, cost: 2900 },
  ],
  m8: [
    // 롯데푸드
    { name: '의성마늘햄', options: ['200g', '450g'], price: 6800, cost: 4700 },
    { name: '롯데햄', options: ['오리지널'], price: 5500, cost: 3800 },
  ],
  m9: [
    // 청정원
    { name: '순창고추장', options: ['500g', '1kg'], price: 8500, cost: 5900 },
    { name: '카레여왕', options: ['바몬드', '자바'], price: 4200, cost: 2900 },
  ],
  m10: [
    // 빙그레
    { name: '바나나맛우유', options: ['240ml', '6개입'], price: 1800, cost: 1200 },
    { name: '요플레', options: ['딸기', '블루베리'], price: 3200, cost: 2200 },
  ],
}

const sampleCustomers = ['김철수', '이영희', '박민수', '최지현', '정대호', '강서연', '윤미래', '조성민']
const sampleAddresses = [
  '서울시 강남구 테헤란로 123',
  '경기도 성남시 분당구 판교로 456',
  '인천시 연수구 송도대로 789',
  '부산시 해운대구 해운대로 101',
  '대전시 유성구 대학로 202',
  '대구시 중구 동성로 55',
  '서울시 서초구 반포대로 200',
  '서울시 강서구 화곡로 268',
]

function generateSampleOrders(manufacturerId: string, count: number, totalAmount: number): SendLogOrder[] {
  const products = sampleProducts[manufacturerId] || sampleProducts['m1']
  const orders: SendLogOrder[] = []
  let remainingAmount = totalAmount

  for (let i = 0; i < Math.min(count, 5); i++) {
    // 최대 5개 샘플만 생성
    const product = products[i % products.length]
    const option = product.options[i % product.options.length]
    const quantity = Math.floor(Math.random() * 3) + 1
    const price = i < count - 1 ? product.price * quantity : remainingAmount
    const cost = product.cost * quantity
    remainingAmount -= price

    orders.push({
      orderNumber: `ORD-${Date.now().toString().slice(-6)}-${i + 1}`,
      productName: product.name,
      optionName: option,
      quantity,
      price: Math.max(price, product.price),
      cost,
      customerName: sampleCustomers[i % sampleCustomers.length],
      address: sampleAddresses[i % sampleAddresses.length],
    })
  }

  return orders
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
    orders: generateSampleOrders('m1', 45, 892000),
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
    orders: generateSampleOrders('m2', 38, 756000),
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
    orders: generateSampleOrders('m3', 32, 584000),
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
    orders: generateSampleOrders('m4', 25, 498000),
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
    orders: generateSampleOrders('m5', 16, 312000),
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
    orders: generateSampleOrders('m1', 52, 1024000),
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
    orders: generateSampleOrders('m2', 41, 820000),
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
    orders: generateSampleOrders('m3', 28, 456000),
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
    orders: generateSampleOrders('m4', 19, 380000),
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
    orders: generateSampleOrders('m5', 14, 280000),
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
    orders: generateSampleOrders('m6', 22, 356000),
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
    orders: generateSampleOrders('m9', 14, 198000),
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
    orders: generateSampleOrders('m8', 28, 412000),
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
    orders: generateSampleOrders('m10', 20, 324000),
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
    orders: generateSampleOrders('m7', 18, 248000),
  },
]

// SMTP Settings interface
export interface SMTPSettings {
  fromEmail: string
  fromName: string
  host: string
  password: string
  port: number
  secure: boolean
  username: string
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

// 택배사 코드 매핑 인터페이스
export interface CourierMapping {
  aliases: string[] // 별칭 (거래처에서 사용하는 다른 이름들)
  code: string // 사방넷 택배사 코드 (숫자)
  enabled: boolean
  id: string
  name: string // 기본 택배사명 (사방넷 기준)
}

// 중복 발송 이력 체크 결과
export interface DuplicateCheckResult {
  duplicateLogs: SendLog[]
  hasDuplicate: boolean
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

// 일 수 차이 계산
export function getDaysDifference(dateString: string): number {
  const now = new Date()
  const targetDate = new Date(dateString)
  const diffTime = Math.abs(now.getTime() - targetDate.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// ============================================
// 송장 변환 관련 인터페이스 및 데이터
// ============================================

// 주소 정규화 (공백, 특수문자 등 제거하여 비교)
function normalizeAddress(address: string): string {
  return address.replace(/\s+/g, '').replace(/[,.-]/g, '').toLowerCase()
}

// 택배사 코드 매핑 데이터
export const courierMappings: CourierMapping[] = [
  {
    id: 'c1',
    name: 'CJ대한통운',
    code: '04',
    aliases: ['CJ대한통운', 'CJ택배', 'CJ', '대한통운', 'CJGLS'],
    enabled: true,
  },
  {
    id: 'c2',
    name: '한진택배',
    code: '05',
    aliases: ['한진택배', '한진', 'HANJIN'],
    enabled: true,
  },
  {
    id: 'c3',
    name: '롯데택배',
    code: '08',
    aliases: ['롯데택배', '롯데', 'LOTTE', '롯데글로벌로지스'],
    enabled: true,
  },
  {
    id: 'c4',
    name: '우체국택배',
    code: '01',
    aliases: ['우체국택배', '우체국', '우편', 'EPOST', '우정사업본부'],
    enabled: true,
  },
  {
    id: 'c5',
    name: '로젠택배',
    code: '06',
    aliases: ['로젠택배', '로젠', 'LOGEN'],
    enabled: true,
  },
  {
    id: 'c6',
    name: '경동택배',
    code: '23',
    aliases: ['경동택배', '경동', 'KD택배'],
    enabled: true,
  },
  {
    id: 'c7',
    name: '대신택배',
    code: '22',
    aliases: ['대신택배', '대신'],
    enabled: true,
  },
  {
    id: 'c8',
    name: '일양로지스',
    code: '11',
    aliases: ['일양로지스', '일양택배', '일양'],
    enabled: true,
  },
  {
    id: 'c9',
    name: '합동택배',
    code: '32',
    aliases: ['합동택배', '합동'],
    enabled: true,
  },
  {
    id: 'c10',
    name: 'GS포스트박스',
    code: '24',
    aliases: ['GS포스트박스', 'GS택배', 'CVSnet', 'GS25택배'],
    enabled: true,
  },
]

// 거래처별 송장 템플릿 인터페이스
export interface InvoiceTemplate {
  courierColumn: string // 택배사 컬럼
  dataStartRow: number // 데이터 시작 행 번호
  headerRow: number // 헤더가 있는 행 번호 (1부터 시작)
  id: string
  manufacturerId: string
  manufacturerName: string
  // 컬럼 매핑 (컬럼 인덱스 또는 헤더명)
  orderNumberColumn: string // 주문번호 컬럼 (예: "A" 또는 "주문번호")
  trackingNumberColumn: string // 송장번호 컬럼
  useColumnIndex: boolean // true면 A,B,C 인덱스 사용, false면 헤더명 사용
}

// 택배사명으로 코드 찾기 (별칭 포함)
export function getCourierCode(courierName: string): string | null {
  const normalized = courierName.trim()
  for (const courier of courierMappings) {
    if (!courier.enabled) continue
    if (courier.name === normalized) return courier.code
    if (courier.aliases.some((alias) => alias.toLowerCase() === normalized.toLowerCase())) {
      return courier.code
    }
  }
  return null
}

// 기본 송장 템플릿 (대부분의 거래처에 적용)
export const defaultInvoiceTemplate: Omit<InvoiceTemplate, 'id' | 'manufacturerId' | 'manufacturerName'> = {
  orderNumberColumn: 'A',
  courierColumn: 'B',
  trackingNumberColumn: 'C',
  headerRow: 1,
  dataStartRow: 2,
  useColumnIndex: true,
}

// 거래처별 커스텀 송장 템플릿
export const invoiceTemplates: InvoiceTemplate[] = [
  {
    id: 'it1',
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    orderNumberColumn: '주문번호',
    courierColumn: '배송업체',
    trackingNumberColumn: '운송장번호',
    headerRow: 1,
    dataStartRow: 2,
    useColumnIndex: false,
  },
  {
    id: 'it2',
    manufacturerId: 'm4',
    manufacturerName: '동원F&B',
    orderNumberColumn: 'B',
    courierColumn: 'D',
    trackingNumberColumn: 'E',
    headerRow: 2,
    dataStartRow: 3,
    useColumnIndex: true,
  },
]

// 송장 변환 이력 인터페이스
export interface InvoiceConvertLog {
  convertedAt: string
  convertedBy: string
  convertedFileName: string
  errorCount: number
  id: string
  manufacturerId: string
  manufacturerName: string
  results: InvoiceConvertResult[]
  sendLogId: string // 연결된 발송 로그 ID
  successCount: number
  totalRows: number
  uploadedFileName: string
}

// 송장 변환 결과 인터페이스
export interface InvoiceConvertResult {
  courierCode: string // 변환된 택배사 코드
  errorMessage?: string
  orderNumber: string // 사방넷 주문번호
  originalCourier?: string // 원본 택배사명 (에러 시 표시용)
  status: 'courier_error' | 'order_not_found' | 'success'
  trackingNumber: string // 송장번호
}

// 제조사ID로 템플릿 가져오기 (없으면 기본 템플릿 반환)
export function getInvoiceTemplate(manufacturerId: string): InvoiceTemplate {
  const customTemplate = invoiceTemplates.find((t) => t.manufacturerId === manufacturerId)
  if (customTemplate) return customTemplate

  const manufacturer = manufacturers.find((m) => m.id === manufacturerId)
  return {
    id: 'default',
    manufacturerId,
    manufacturerName: manufacturer?.name || '알 수 없음',
    ...defaultInvoiceTemplate,
  }
}

// 송장 변환 이력 Mock 데이터
export const invoiceConvertLogs: InvoiceConvertLog[] = [
  {
    id: 'icl1',
    sendLogId: 'log1',
    manufacturerId: 'm1',
    manufacturerName: '농심식품',
    uploadedFileName: '농심_송장_20241126.xlsx',
    convertedFileName: '사방넷_송장업로드_농심식품_20241126.xlsx',
    totalRows: 45,
    successCount: 43,
    errorCount: 2,
    convertedAt: getRelativeDate(0, 14, 0),
    convertedBy: '관리자',
    results: [
      { orderNumber: 'SB20241126001', courierCode: '04', trackingNumber: '123456789012', status: 'success' },
      { orderNumber: 'SB20241126002', courierCode: '05', trackingNumber: '987654321098', status: 'success' },
      {
        orderNumber: 'SB20241126099',
        courierCode: '',
        trackingNumber: '111222333444',
        status: 'order_not_found',
        errorMessage: '주문번호를 찾을 수 없습니다',
      },
    ],
  },
]
