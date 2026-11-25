# 올팍 나우 · OLPARK NOW

올림픽공원 공연일, 지금 필요한 것만.
A mobile-first PWA for Olympic Park show days — in Korean, English and Simplified Chinese.

**Live** · https://rlooko.github.io/olpark-now/

---

## 무엇을 하는가

공연이 있는 날 올림픽공원에서 실제로 문제가 되는 것은 세 가지입니다.
차가 들어갈 자리가 있는지, 공연장까지 어떻게 들어가는지, 끝나고 어떻게 빠져나가는지.
올팍 나우는 그 셋만 한 화면에 놓습니다.

| 화면 | 내용 |
|---|---|
| **지금** | 실시간 주차대수(60초 자동 갱신) · 다음 공연 · 주말 예상 이용률 |
| **공연** | 다가오는 공연 카드 → 공연장별 가까운 문·주차장·게이트·지하철·버스·관람 규정 |
| **산책** | 공연 20분 전 코스 — 장미광장·들꽃마루·나홀로나무·88호수·몽촌해자 (계절 상태 표시) |
| **귀가** | 공연장별 출차 문 · 출차 가능 시간 · 주차 요금 · 지하철/버스 · 공원 안내 |

3개 언어(한국어 / English / 简体中文)를 헤더에서 즉시 전환하며, 선택은 저장됩니다.
라이트·다크 테마 자동 + 수동 전환, PWA 설치(홈 화면 추가), 오프라인 셸 캐시를 지원합니다.

## 활용한 공공데이터

한국체육산업개발(주) 개방 데이터 (기관 데이터 1종 이상 필수 요건 충족 — 5종 활용)

1. **올림픽공원 실시간 주차현황** — `GET https://www.ksponco.or.kr/online/main/parkingorsApi.do?apiKey=PARKING21803504`
   → `[{"parking_sum":2110}]`. 인증키 없이 호출되며 `Access-Control-Allow-Origin: *` 로 응답해 브라우저에서 직접 조회합니다.
2. **공연정보** — 올림픽공원 공연/행사안내(일정·회차·관람연령·소요시간·주최·문의)
3. **공연장안내** — KSPO DOME · 티켓링크 라이브 아레나 · 올림픽홀 · 우리금융아트홀 · K-아트홀의 수용인원·출입구·가까운 주차장·교통
4. **유실물정보** — 공연장 분실물(기획사 관리) / 공원 분실물(안내센터)
5. **수목·생태정보** — 올림픽공원 9경, 장미광장, 들꽃마루, 산책로

추가로 공원이 주말에만 제공하는 **주차장 예상 이용률 서비스**(`/online/main/parking.do`)의 예측값을 인용해, 같은 시각에 두 공연이 시작하는 주말의 112% 예측을 안내에 반영했습니다.

출처 · <https://www.ksponco.or.kr/olympicpark/menu.es?mid=a20301010200> · <https://www.ksponco.or.kr/olympicpark/menu.es?mid=a20111000000>

## 구조

```
index.html                앱 셸
assets/app.css            디자인 시스템 (라이트·다크, 모바일 퍼스트)
assets/app.js             화면 렌더 · i18n · 실시간 주차 폴링
assets/data.js            공연·공연장·산책 스팟·문구 (3개 언어)
assets/img/p-*.jpg        공연 포스터 (공원 공연정보 원본 축소)
manifest.webmanifest      PWA 매니페스트
sw.js                     셸 캐시 + 주차 API 네트워크 우선
icons/                    앱 아이콘
```

빌드 도구 없음. 정적 파일 그대로 GitHub Pages에서 동작합니다.

## 데이터 갱신

`assets/data.js`의 `EVENTS`는 2026-11-25 수집 스냅샷입니다. 공연정보는 아래 순서로 갱신합니다.

1. `https://www.ksponco.or.kr/olympicpark/menu.es?mid=a20301010200` (텍스트보기) 에서 회차 목록 확인
2. 각 공연의 `eventInfoView.es?...&evtSeq=` 상세에서 기간·시간·관람연령·소요시간·주최·문의 확인
3. `EVENTS` 배열에 항목 추가 (`weekly`가 있으면 요일별 시간으로 회차를 자동 생성)
4. 포스터는 `attachFiles/eventInfo/*` 원본을 폭 560px로 축소해 `assets/img/p-{evtSeq}.jpg`로 저장

실시간 주차는 별도 갱신이 필요 없습니다(브라우저가 60초마다 직접 호출).

## 접근성·배포

- 모바일 안전영역(`env(safe-area-inset-*)`), 44px 이상 터치 타깃, 스킵 링크, `aria-current`, 키보드 조작 지원
- `prefers-reduced-motion` 존중
- GitHub Pages 정적 배포 — 유지 비용 없음

## 라이선스

공연 포스터와 공원 정보의 저작권은 한국체육산업개발(주) 및 각 공연 주최사에 있습니다.
이 저장소는 2026년도 공공데이터 활용 경진대회 출품용 비공식 프로토타입입니다.
