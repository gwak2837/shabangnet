# PRD: 사내 관리자 도구 인증 시스템 (MFA & Passkey)

## 1. 개요 및 배경 (Overview)

기존의 단순 비밀번호 방식이나 느슨한 소셜 로그인 방식은 피싱 및 계정 탈취 위협에 취약함. 보안 강도가 높은 **패스키(Passkeys)**를 최우선 인증 수단으로 도입하고, 비밀번호, 소셜 방식에는 반드시 **TOTP**를 결합하여 보안 무결성을 확보함.

## 2. 핵심 정책 (Key Policies)

1.  **Phishing-Resistant First:** 패스키 사용을 최우선으로 유도한다.
2.  **MFA Enforce:** 모든 계정은 예외 없이 다중 요소 인증(MFA)이 설정되어야 한다. (패스키는 그 자체로 MFA로 인정)
3.  **Identifier-First:** 이메일(ID)을 먼저 입력받아 사용자의 인증 방식(패스키 vs 비밀번호)을 동적으로 분기한다.
4.  **No Self-Service Recovery:** 계정 분실(백업 코드 분실 포함) 시, 이메일 인증 등으로 스스로 복구할 수 없으며 반드시 **최고 관리자(Super Admin)**에게 요청하거나 데이터베이스를 직접 수정해야 한다.

## 3. 상세 기능 요구사항 (Functional Requirements)

### 3.1 회원가입 및 온보딩 (Registration)

- **Case A: ID/PW 가입**
  1.  이메일/비밀번호 입력.
  2.  **TOTP 등록 강제:** QR코드 스캔 및 6자리 코드 검증 후 진행 가능.
  3.  **백업 코드 발급:** 10개의 1회용 코드 표시 $\rightarrow$ [코드 복사/다운로드] 버튼 클릭 시 가입 완료 처리.
- **Case B: 패스키 가입 (권장)**
  1.  이메일 입력.
  2.  **패스키 생성:** WebAuthn API 호출 (Platform Authenticator).
      - DB의 `password_hash`는 `NULL`로 처리.
  3.  **백업 코드 발급:** 위와 동일.
- **Case C: 소셜 로그인 가입**
  1.  IdP(Google/MS 등) 인증.
  2.  **TOTP 등록 강제:** 소셜 계정 보안과 별개로 내부 TOTP 등록 필수.
  3.  **백업 코드 발급:** 위와 동일.

### 3.2 로그인 (Authentication) - 조건부 UI 적용

로그인 페이지 진입 시, 입력 필드에 포커스를 두면 브라우저가 저장된 패스키를 제안해야 함.

- **Front-end:** `<input autocomplete="username webauthn" ... />` 속성 적용.
- **Process Flow:**
  1.  **입력 단계:** 사용자가 이메일 입력 필드 클릭.
      - _패스키 있음:_ 드롭다운에서 계정 선택 $\rightarrow$ 생체 인증 $\rightarrow$ **로그인 성공**.
      - _패스키 없음:_ 이메일 직접 입력 후 [다음] 버튼 클릭.
  2.  **분기 처리 (Server-side Routing):**
      - **패스키 등록 유저:**
        - **Primary:** WebAuthn Challenge 발송 $\rightarrow$ 기기 인증.
        - **Cross-Device:** PC 등 미등록 기기 접속 시, 화면에 QR코드(FIDO2 Hybrid Transport) 표시 $\rightarrow$ 스마트폰 스캔으로 로그인 처리.
      - **비밀번호/소셜 유저:**
        - 비밀번호 입력창 노출 or 소셜 로그인 리다이렉트.
        - 1차 인증 성공 시 **TOTP 입력창** 노출 (필수).
        - TOTP 검증 후 **로그인 성공**.

### 3.3 세션 정책 (Session Management)

- **세션 유지 시간:** 12시간 (Hard Timeout).
- **로그인 연장:** '로그인 유지' 체크박스를 제공하되, 최대 12시간까지만 유효하며 이후 강제 로그아웃.
- **브라우저 신뢰:** 별도의 '30일간 2차 인증 생략' 기능 제공.

### 3.4 계정 복구 (Recovery)

- **백업 코드 사용:**
  - MFA 진행 도중 로그인 화면 하단 [로그인에 문제가 있나요?] $\rightarrow$ [백업 코드 사용] 진입.
  - 코드 검증 성공 시 로그인 처리.
  - **Action:** 로그인 직후 **[마이페이지 > 보안 설정]**으로 강제 리다이렉트 및 상단 경고바 노출 ("비상 코드로 로그인했습니다. 보안 설정을 점검하세요.").

## 4. UI/UX 시나리오 (Wireframe Logic)

### A. 조건부 UI (Conditional UI) 흐름

1.  **대기 상태:** 로그인 폼에는 "이메일" 입력창 하나만 존재.
2.  **인터랙션:** 사용자가 입력창을 클릭(Focus).
3.  **브라우저 동작:** "이 기기에 저장된 패스키로 로그인하시겠습니까?" 리스트업.
4.  **선택:** 유저가 리스트 선택 $\rightarrow$ OS 생체인증 창 $\rightarrow$ 로그인 완료 (키보드 입력 0회).

### B. Cross-Device 흐름 (PC 접속 시)

1.  사용자가 PC에서 이메일 입력 후 [다음].
2.  서버: "이 유저는 패스키 유저임" 판단.
3.  브라우저: WebAuthn 요청 시 `transport: ['hybrid']` 옵션 포함.
4.  화면: "스마트폰으로 패스키 인증" QR코드 팝업 생성.
5.  유저: 폰으로 QR 스캔 $\rightarrow$ 폰에서 생체인증 $\rightarrow$ PC 화면 로그인 완료.

## 5. 기술적 요구사항 (Technical Requirements)

- **표준:** FIDO2 / WebAuthn Level 3 이상 권장 (Passkey 동기화 지원).
- **라이브러리:**
  - Server: SimpleWebAuthn (Node.js) 라이브러리 사용.
  - Client: 브라우저 Native API 사용.
- **DB 스키마 변경 (예시):**
  - `users` 테이블: `password_hash` (Nullable), `auth_type` (Enum: PASSWORD, SOCIAL, PASSKEY)
  - `authenticators` 테이블 (신규): `credential_id`, `public_key`, `counter`, `transports` 등 FIDO2 메타데이터 저장.
  - `backup_codes` 테이블 (신규): `user_id`, `code_hash`, `is_used`
- **보안:**
  - 백업 코드는 평문 저장 금지 (반드시 해시 저장).
  - 인증이나 MFA 관련 API 엔드포인트는 Rate Limiting 적용 (Brute Force 방지).

## 6. QA 및 테스트 시나리오 (Acceptance Criteria)

1.  [ ] **패스키:** 아이폰, 안드로이드, 맥북(TouchID), 윈도우(Hello)에서 각각 등록 및 로그인이 되는가?
2.  [ ] **조건부 UI:** 입력창 클릭 시 패스키 자동완성 목록이 뜨는가?
3.  [ ] **Cross-Device:** PC 화면의 QR코드를 폰으로 찍었을 때 로그인이 되는가?
4.  [ ] **Legacy:** 비밀번호 유저가 TOTP 입력 없이 로그인을 시도하면 차단되는가?
5.  [ ] **Backup:** 사용한 백업 코드는 재사용이 불가능한가?
6.  [ ] **Enforce:** 신규 가입자가 MFA 설정을 중도 이탈하면 계정 생성이 취소(또는 로그인 불가) 되는가?
