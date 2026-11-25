/* 올팍 나우 · 데이터 계층
   출처: 한국체육산업개발(주) 개방 공공데이터
   - 실시간 주차현황 API  https://www.ksponco.or.kr/online/main/parkingorsApi.do
   - 공연정보 / 공연장안내 / 유실물정보 / 수목·생태정보  https://www.ksponco.or.kr/olympicpark
   수집일 2026-11-25 13:57 (KST) · scripts/refresh-events.mjs 로 갱신 */
(function () {
  'use strict';

  /* ── UI 문구 ───────────────────────────────────────────── */
  var I18N = {
    brandTag:   { ko: '올림픽공원 공연일 안내', en: 'Olympic Park, on show days', zh: '奥林匹克公园 演出日指南' },
    navNow:     { ko: '지금', en: 'Now', zh: '现在' },
    navShows:   { ko: '공연', en: 'Shows', zh: '演出' },
    navWalk:    { ko: '산책', en: 'Walk', zh: '散步' },
    navExit:    { ko: '귀가', en: 'Exit', zh: '离场' },

    today:      { ko: '오늘', en: 'Today', zh: '今天' },
    tomorrow:   { ko: '내일', en: 'Tomorrow', zh: '明天' },
    dayAfter:   { ko: '모레', en: 'In 2 days', zh: '后天' },
    dday:       { ko: 'D-{n}', en: 'D-{n}', zh: 'D-{n}' },

    live:       { ko: '실시간', en: 'LIVE', zh: '实时' },
    parkingTitle:{ ko: '지금 주차', en: 'Parking right now', zh: '实时停车' },
    ringUnit:   { ko: '대 주차 중', en: 'cars parked', zh: '辆停车中' },
    parkingCars:{ ko: '{n}대 주차 중', en: '{n} cars parked', zh: '已停 {n} 辆' },
    parkingCap: { ko: '동2문·남2문·북2문 {n}대 가능', en: '{n} spaces at East 2 · South 2 · North 2 gates', zh: '东2门·南2门·北2门 共 {n} 个车位' },
    updated:    { ko: '{t} 기준', en: 'as of {t}', zh: '更新于 {t}' },
    auto60:     { ko: '60초마다 자동 갱신', en: 'refreshes every 60s', zh: '每 60 秒自动更新' },
    stalled:    { ko: '연결이 잠시 끊겼어요. 마지막 확인 값이에요.', en: 'Connection lost — showing the last reading.', zh: '连接中断，显示最后一次数据。' },
    retry:      { ko: '다시 시도', en: 'Retry', zh: '重试' },
    parkView:   { ko: '공원 예상 이용률 보기', en: 'Park forecast', zh: '公园预测使用率' },

    stSmooth:   { ko: '여유', en: 'Clear', zh: '空闲' },
    stBusy:     { ko: '다소 혼잡', en: 'Getting busy', zh: '稍繁忙' },
    stHeavy:    { ko: '혼잡', en: 'Busy', zh: '繁忙' },
    stFull:     { ko: '만차', en: 'Full', zh: '已满' },
    stFullTip:  { ko: '주차장이 차면 대중교통이 훨씬 빨라요', en: 'When lots fill, the subway is faster', zh: '车位满时，地铁更快' },

    nextShow:   { ko: '다음 공연', en: 'Next show', zh: '下一场演出' },
    noShowToday:{ ko: '오늘은 공연이 없는 날이에요', en: 'No show today', zh: '今天没有演出' },
    noShowSub:  { ko: '공원은 05:00~22:00 열려 있어요. 조용한 날의 산책 코스를 골라 두었어요.', en: 'The park is open 05:00–22:00. Here is a quiet-day walk.', zh: '公园 05:00–22:00 开放。来看看安静日散步路线。' },
    seeAllShows:{ ko: '이번 주 공연 모두 보기', en: 'All shows this week', zh: '查看本周全部演出' },
    quickGo:    { ko: '바로 가기', en: 'Go', zh: '前往' },
    qEnter:     { ko: '입장 동선', en: 'Way in', zh: '入场路线' },
    qWalk:      { ko: '20분 산책', en: '20-min walk', zh: '20分钟散步' },
    qExit:      { ko: '분산 출차', en: 'Leaving', zh: '分散离场' },
    qInfo:      { ko: '관람 안내', en: 'House rules', zh: '观演须知' },

    weekendForecast: { ko: '이번 주말 예상', en: 'This weekend', zh: '本周末预测' },
    forecastBody:{ ko: '11/28(토) 17:00–21:00 예상 이용률 <b>112%</b> — 두 공연이 같은 시각에 시작해요.', en: 'Sat 11/28, 17:00–21:00 forecast <b>112%</b> — two shows start at the same time.', zh: '11/28（周六）17:00–21:00 预测使用率 <b>112%</b> — 两场演出同时开演。' },
    forecastSrc:{ ko: '공원 주차장 예상 이용률 서비스(주말 한정) · 실제와 차이 있을 수 있음', en: 'Park parking forecast service (weekends only) · may differ from actual', zh: '公园停车预测服务（仅周末）· 可能与实际有差异' },

    showsTitle: { ko: '공연 일정', en: 'Shows', zh: '演出日程' },
    filterUp:   { ko: '다가오는', en: 'Upcoming', zh: '即将上演' },
    filterWeek: { ko: '이번 주', en: 'This week', zh: '本周' },
    filterAll:  { ko: '전체', en: 'All', zh: '全部' },
    pastShow:   { ko: '지난 공연', en: 'Past', zh: '已结束' },
    noMatch:    { ko: '조건에 맞는 공연이 없어요.', en: 'No shows match.', zh: '没有符合条件的演出。' },
    sessions:   { ko: '회차', en: 'Times', zh: '场次' },
    venueLbl:   { ko: '공연장', en: 'Venue', zh: '场馆' },
    ageLbl:     { ko: '관람 연령', en: 'Age limit', zh: '观演年龄' },
    runLbl:     { ko: '소요 시간', en: 'Running time', zh: '时长' },
    priceLbl:   { ko: '티켓', en: 'Tickets', zh: '票价' },
    askLbl:     { ko: '문의', en: 'Contact', zh: '咨询' },
    timeVar:    { ko: '일자별 시간이 달라질 수 있어요 — 예매처에서 확인하세요.', en: 'Times vary by date — check with the ticketing site.', zh: '各场次时间可能不同 — 请在购票页面确认。' },

    wayIn:      { ko: '입장 동선', en: 'Way in', zh: '入场路线' },
    nearestGate:{ ko: '가까운 출입문', en: 'Nearest gate', zh: '最近出入口' },
    nearestLot: { ko: '가까운 주차장', en: 'Nearest lot', zh: '最近停车场' },
    lotWalk:    { ko: '주차장에서 1~2분', en: '1–2 min from the lot', zh: '停车场步行 1–2 分钟' },
    subwayLbl:  { ko: '지하철', en: 'Subway', zh: '地铁' },
    busLbl:     { ko: '버스', en: 'Bus', zh: '公交' },
    subway10:   { ko: '올림픽공원역 3번 출구에서 도보 10분', en: '10 min walk from Olympic Park Stn. Exit 3', zh: '奥林匹克公园站3号出口步行10分钟' },
    seats:      { ko: '객석', en: 'Seats', zh: '座席' },
    capacity:   { ko: '수용', en: 'Capacity', zh: '容纳' },

    houseTitle: { ko: '공연장 안에서', en: 'Inside the venue', zh: '场馆内' },
    hTicket:    { ko: '매표소', en: 'Box office', zh: '售票处' },
    hTicketV:   { ko: '평균 공연 1시간 30분 전 오픈', en: 'Opens about 90 min before the show', zh: '通常在开演前 90 分钟开放' },
    hLocker:    { ko: '물품보관소', en: 'Cloakroom', zh: '寄存处' },
    hLockerV:   { ko: '메인로비·객석 1층 · 공연 1시간 전 ~ 종료 30분 후', en: 'Main lobby & 1F · from 1 h before to 30 min after', zh: '主大厅·1层 · 开演前1小时至结束后30分钟' },
    hFood:      { ko: '음식물', en: 'Food & drink', zh: '饮食' },
    hFoodV:     { ko: '음료 포함 모든 음식물 반입 금지', en: 'No food or drink, including bottled water', zh: '禁止携带任何饮食（含饮料）' },
    hPhoto:     { ko: '촬영', en: 'Cameras', zh: '拍摄' },
    hPhotoV:    { ko: '사진·녹음·녹화 금지', en: 'No photo, recording or filming', zh: '禁止拍照、录音、录像' },
    hLate:      { ko: '지각 입장', en: 'Late entry', zh: '迟到入场' },
    hLateV:     { ko: '원칙적으로 입장 불가 · 안내원 안내에 따라 제한 입장', en: 'Normally not admitted; staff may seat you briefly', zh: '原则上禁止入场 · 视情况由工作人员引导' },
    hChild:     { ko: '미아·아이', en: 'Lost child', zh: '走失儿童' },
    hChildV:    { ko: '공연장 로비 안내데스크 → 공원 안내센터(09:00~19:00) → 공원서비스팀 02-410-1114', en: 'Venue lobby desk → park information centre (09:00–19:00) → park service team 02-410-1114', zh: '场馆大厅服务台 → 公园咨询中心(09:00–19:00) → 公园服务组 02-410-1114' },
    hLost:      { ko: '분실물', en: 'Lost & found', zh: '失物' },
    hLostV:     { ko: '공연장 분실물은 기획사가 직접 보관 · 종료 후 1~2일 내 문의', en: 'The promoter keeps items from the show — call within 1–2 days', zh: '场馆失物由主办方保管 · 结束后1~2天内咨询' },
    hWc:        { ko: '화장실', en: 'Restrooms', zh: '卫生间' },
    hWcV:       { ko: '공원 내 옥외 화장실 13개소 · 음수전 18개소', en: '13 outdoor restrooms and 18 drinking fountains in the park', zh: '公园内室外卫生间 13 处 · 饮水台 18 处' },
    promoter:   { ko: '이 공연 기획사', en: 'Promoter', zh: '主办方' },

    walkTitle:  { ko: '공연 20분 전, 한 바퀴', en: '20 minutes before the show', zh: '开演前 20 分钟' },
    walkIntro:  { ko: '공연장 바로 옆에서 시작하는 짧은 코스예요. 도보 시간은 공원 안내도 기준 어림값입니다.', en: 'Short loops that start next to the venue. Walking times are estimates from the park map.', zh: '从场馆旁出发的短路线。步行时间为根据公园地图的估算值。' },
    seasonNow:  { ko: '지금', en: 'Now', zh: '现在' },
    nearVenue:  { ko: '가까운 공연장', en: 'Near', zh: '临近场馆' },
    routeTitle: { ko: '추천 20분 코스', en: 'Suggested 20-min loop', zh: '推荐20分钟路线' },
    r1:         { ko: '올림픽홀·K-아트홀 → 장미광장 → 들꽃마루 → 88호수', en: 'Olympic Hall / K-Art Hall → Rose Plaza → Wildflower Mound → 88 Lake', zh: '奥林匹克厅·K艺术厅 → 玫瑰广场 → 野花坡 → 88湖' },
    r1meta:     { ko: '약 1.3km · 천천히 20분', en: '≈1.3 km · 20 min at an easy pace', zh: '约1.3公里 · 慢走20分钟' },
    r2:         { ko: 'KSPO DOME → 장미광장 → 들꽃마루', en: 'KSPO DOME → Rose Plaza → Wildflower Mound', zh: 'KSPO DOME → 玫瑰广场 → 野花坡' },
    r2meta:     { ko: '약 900m · 12~15분', en: '≈900 m · 12–15 min', zh: '约900米 · 12–15分钟' },
    r3:         { ko: '우리금융아트홀 → 야생화단지 → 몽촌해자 호반의 길', en: 'Woori Art Hall → Wildflower Garden → Mongchon Moat lakeside path', zh: '友利艺术厅 → 野生花园 → 梦村护城河湖畔路' },
    r3meta:     { ko: '약 1.3km · 18분', en: '≈1.3 km · 18 min', zh: '约1.3公里 · 18分钟' },

    exitTitle:  { ko: '공연 끝나고, 덜 막히는 쪽으로', en: 'After the show, take the quieter way', zh: '演出结束后，走不堵的一侧' },
    exitIntro:  { ko: '같은 시간에 끝난 관객이 한꺼번에 몰리지 않도록 공연장별로 나가는 문을 나눠 두었어요.', en: 'Each venue gets its own way out so the crowd does not merge at one gate.', zh: '按场馆分流出口，避免同一时间人流集中。' },
    byVenue:    { ko: '공연장별 출차', en: 'Exit by venue', zh: '按场馆离场' },
    gateHours:  { ko: '출차 가능 시간', en: 'Gate hours', zh: '出口时间' },
    gateNote:   { ko: '동2문은 24시간, 북2문·남2문은 22:30에 닫혀요.', en: 'East 2 stays open all night; North 2 and South 2 close at 22:30.', zh: '东2门24小时开放；北2门、南2门22:30关闭。' },
    gateNoteSub:{ ko: '공연이 22시를 넘기면 북2문·남2문으로는 나올 수 없어요. 동2문을 이용하세요.', en: 'If the show runs past 22:00, use East 2 — the other two are shut.', zh: '演出超过22:00时，请走东2门。' },
    payTitle:   { ko: '주차 요금', en: 'Parking fee', zh: '停车费' },
    payRate:    { ko: '소형 10분당 600원 · 1일 최대 20,000원', en: '₩600 per 10 min · max ₩20,000 a day', zh: '小型车每10分钟600韩元 · 每日上限20,000韩元' },
    payFree10:  { ko: '10분 안에 나가면 무료', en: 'Free if you leave within 10 min', zh: '10分钟内离场免费' },
    payAgain:   { ko: '나갔다 다시 들어오면 요금을 다시 내요', en: 'Re-entering starts a new fee', zh: '出场后再入场需重新计费' },
    payNoDsc:   { ko: '공연 티켓 할인은 없어요', en: 'No discount for ticket holders', zh: '演出票不享受停车优惠' },
    pay50:      { ko: '경차·장애인·저공해·국가유공자·다자녀 50%', en: '50% off: compact, disability, low-emission, veterans, multi-child', zh: '小型车·残障·低排放·国家有功者·多子女 50%' },
    transitT:   { ko: '대중교통', en: 'Public transport', zh: '公共交通' },
    tSub:       { ko: '지하철', en: 'Subway', zh: '地铁' },
    tBus:       { ko: '버스 (동2문 · 올림픽공원역)', en: 'Bus (East 2 gate · Olympic Park Stn.)', zh: '公交（东2门·奥林匹克公园站）' },
    tBusS:      { ko: '버스 (남2문)', en: 'Bus (South 2 gate)', zh: '公交（南2门）' },
    walk10:     { ko: '공연장까지 도보 10분', en: '10 min walk to the venues', zh: '到场馆步行10分钟' },
    rowRate:    { ko: '요금', en: 'Fare', zh: '费用' },
    row10:      { ko: '10분', en: '10 min', zh: '10分钟' },
    rowRe:      { ko: '재입차', en: 'Re-entry', zh: '再次入场' },
    rowDisc:    { ko: '할인', en: 'Discount', zh: '折扣' },
    rowTicket:  { ko: '티켓', en: 'Ticket', zh: '门票' },
    line59:     { ko: '5·9호선', en: 'Line 5·9', zh: '5·9号线' },
    line8:      { ko: '8호선', en: 'Line 8', zh: '8号线' },
    line9:      { ko: '9호선', en: 'Line 9', zh: '9号线' },
    nowAt:      { ko: '지금', en: 'now', zh: '现在' },
    walk5:      { ko: '평화의 광장까지 도보 5분', en: '5 min walk to Peace Plaza', zh: '到和平广场步行5分钟' },
    noCar:      { ko: '차 가져오지 않기', en: 'Leave the car', zh: '不开车' },
    noCarBody:  { ko: '이번 주말은 예상 이용률 112%예요. 지하철 5·9호선 올림픽공원역이 공연장까지 가장 가까워요.', en: 'This weekend is forecast at 112%. Olympic Park Stn. (Line 5·9) is closest to the venues.', zh: '本周末预测使用率112%。5·9号线奥林匹克公园站离场馆最近。' },

    parkTitle:  { ko: '공원 안내', en: 'Park info', zh: '公园信息' },
    pHours:     { ko: '이용 시간', en: 'Opening hours', zh: '开放时间' },
    pHoursV:    { ko: '도보·자전거 05:00~22:00 (광장 24:00) · 차량 06:00~22:00', en: 'Walk/bike 05:00–22:00 (plazas until 24:00) · cars 06:00–22:00', zh: '步行·自行车 05:00–22:00（广场至24:00）· 车辆 06:00–22:00' },
    pInfo:      { ko: '안내센터', en: 'Information', zh: '咨询中心' },
    pInfoV:     { ko: '만남의 광장 02-2180-3566 · 평화의 광장 02-2180-3564~5 · 09:00~19:00', en: 'Meeting Plaza 02-2180-3566 · Peace Plaza 02-2180-3564~5 · 09:00–19:00', zh: '相遇广场 02-2180-3566 · 和平广场 02-2180-3564~5 · 09:00–19:00' },
    pLost:      { ko: '공원 분실물', en: 'Park lost & found', zh: '公园失物' },
    pLostV:     { ko: '안내센터 1개월 보관 후 경찰서 이관', en: 'Kept 1 month at the information centre, then sent to police', zh: '咨询中心保管1个月后移交警方' },
    pSmoke:     { ko: '금연', en: 'No smoking', zh: '禁烟' },
    pSmokeV:    { ko: '올림픽공원은 금연공원 · 지정 장소만 흡연', en: 'Smoke-free park; only in marked areas', zh: '奥林匹克公园为禁烟公园 · 仅限指定区域' },
    pContact:   { ko: '공원 대표', en: 'Park line', zh: '公园总机' },
    pContactV:  { ko: '공원서비스팀 02-410-1114 · 주차 02-2180-3961', en: 'Park service 02-410-1114 · Parking 02-2180-3961', zh: '公园服务组 02-410-1114 · 停车 02-2180-3961' },

    srcLine:    { ko: '출처', en: 'Source', zh: '来源' },
    srcParking: { ko: '한국체육산업개발(주) 실시간 주차현황 공공데이터', en: 'KSPO real-time parking open data', zh: '韩国体育产业开发 实时停车公开数据' },
    srcShow:    { ko: '올림픽공원 공연/행사안내 · 공연장안내', en: 'Olympic Park show listing & venue guide', zh: '奥林匹克公园演出/活动指南 · 场馆介绍' },
    openOfficial:{ko: '공식 안내 열기', en: 'Open official page', zh: '打开官方页面' },
    close:      { ko: '닫기', en: 'Close', zh: '关闭' },

    footSrc:    { ko: '데이터 · 한국체육산업개발(주) 개방 공공데이터 (실시간 주차현황 · 공연정보 · 공연장안내 · 유실물정보 · 수목·생태정보)', en: 'Data · KSPO open data (real-time parking · shows · venue guide · lost & found · trees & ecology)', zh: '数据 · 韩国体育产业开发公开数据（实时停车·演出·场馆·失物·树木生态）' },
    footNote:   { ko: '비공식 프로토타입 · 2026년도 공공데이터 활용 경진대회 출품작', en: 'Unofficial prototype · entry for the 2026 KSPO open-data competition', zh: '非官方原型 · 2026年公共数据活用征集赛参赛作品' }
  };

  /* ── 공연장 ─────────────────────────────────────────────── */
  var VENUES = {
    kspo: {
      name: 'KSPO DOME', alias: { ko: '올림픽체조경기장', en: 'Olympic Gymnastics Arena', zh: '奥林匹克体操馆' },
      seats: { ko: '15,000석', en: '15,000 seats', zh: '15,000座' },
      lot: 'P5', lotCap: '176', gate: { ko: '동2문 · 북2문', en: 'East 2 · North 2', zh: '东2门 · 北2门' },
      doors: { ko: 'GATE 1-1~1-3, 2-1~2-3', en: 'GATE 1-1–1-3, 2-1–2-3', zh: 'GATE 1-1~1-3, 2-1~2-3' },
      subway: { ko: '5·9호선 올림픽공원역 3번 출구', en: 'Line 5·9 Olympic Park Stn. Exit 3', zh: '5·9号线 奥林匹克公园站3号出口' },
      bus: '3216 · 3412 · 3413 · 3414 · 30 · 30-5'
    },
    arena: {
      name: { ko: '티켓링크 라이브 아레나', en: 'Ticketlink Live Arena', zh: 'Ticketlink 现场竞技场' },
      alias: { ko: '핸드볼경기장', en: 'Handball Gymnasium', zh: '手球馆' },
      seats: { ko: '5,003석', en: '5,003 seats', zh: '5,003座' },
      lot: 'P6', lotCap: '167', gate: { ko: '동2문', en: 'East 2', zh: '东2门' },
      doors: { ko: '관람객 출입구 2-1~2-5', en: 'Public doors 2-1–2-5', zh: '观众入口 2-1~2-5' },
      subway: { ko: '5호선 올림픽공원역 3번 출구', en: 'Line 5 Olympic Park Stn. Exit 3', zh: '5号线 奥林匹克公园站3号出口' },
      bus: '3212 · 3214 · 3316 · 3413 · 4213 · 371'
    },
    hall: {
      name: { ko: '올림픽홀', en: 'Olympic Hall', zh: '奥林匹克厅' },
      alias: { ko: '올림픽홀', en: 'Olympic Hall', zh: '奥林匹克厅' },
      seats: { ko: '2,432석 (+플로어 500~600)', en: '2,432 + floor 500–600', zh: '2,432座（含站区500~600）' },
      lot: 'P2', lotCap: '365', gate: { ko: '동2문', en: 'East 2', zh: '东2门' },
      doors: { ko: 'GATE 1~4 · 2F GATE 5~8', en: 'GATE 1–4 · 2F GATE 5–8', zh: 'GATE 1~4 · 2层 GATE 5~8' },
      subway: { ko: '5·9호선 올림픽공원역 3번 출구', en: 'Line 5·9 Olympic Park Stn. Exit 3', zh: '5·9号线 奥林匹克公园站3号出口' },
      bus: '3216 · 3412 · 3413 · 3414 · 30 · 30-5'
    },
    woori: {
      name: { ko: '우리금융아트홀', en: 'Woori Art Hall', zh: '友利艺术厅' },
      alias: { ko: '올림픽역도경기장', en: 'Olympic Weightlifting Arena', zh: '奥林匹克举重馆' },
      seats: { ko: '1,184석', en: '1,184 seats', zh: '1,184座' },
      lot: 'P7', lotCap: '137', gate: { ko: '남2문', en: 'South 2', zh: '南2门' },
      doors: { ko: '1층 A·B·C · 2층 D·E·F', en: '1F A·B·C · 2F D·E·F', zh: '1层 A·B·C · 2层 D·E·F' },
      subway: { ko: '5호선 올림픽공원역 3번 출구', en: 'Line 5 Olympic Park Stn. Exit 3', zh: '5号线 奥林匹克公园站3号出口' },
      bus: '3216 · 3412 · 3413 · 3414 · 30 · 30-5'
    },
    kart: {
      name: { ko: 'K-아트홀', en: 'K-Art Hall', zh: 'K艺术厅' },
      alias: { ko: '태권도공연장', en: 'Taekwondo theatre', zh: '跆拳道剧场' },
      seats: { ko: '—', en: '—', zh: '—' },
      lot: 'P1', lotCap: '562', gate: { ko: '남2문 · 동2문', en: 'South 2 · East 2', zh: '南2门 · 东2门' },
      doors: { ko: '정문 로비', en: 'Main lobby', zh: '正门大厅' },
      subway: { ko: '5·9호선 올림픽공원역 3번 출구', en: 'Line 5·9 Olympic Park Stn. Exit 3', zh: '5·9号线 奥林匹克公园站3号出口' },
      bus: '3216 · 3412 · 3413 · 3414'
    }
  };

  /* ── 공연 ───────────────────────────────────────────────── */
  function s(date, time) { return { d: date, t: time }; }
  var EVENTS = [
    {
      id: 5159, venue: 'kspo', genre: 'concert',
      title: { ko: '[서울] 2026 조용필 & 위대한탄생 콘서트', en: 'Cho Yong-pil & Great Birth Concert 2026', zh: '赵容弼 & 伟大诞生 演唱会 2026' },
      sub: { ko: '조용필', en: 'Cho Yong-pil', zh: '赵容弼' },
      from: '2026-11-27', to: '2026-11-29',
      sessions: [s('2026-11-27', '19:00'), s('2026-11-28', '18:00'), s('2026-11-29', '17:00')],
      age: { ko: '8세 이상', en: '8+', zh: '8岁以上' },
      run: { ko: '130분', en: '130 min', zh: '130分钟' },
      price: 'VIP 176,000 · R 165,000 · S 143,000 · A 110,000',
      organizer: { ko: '위즈덤엔터테인먼트 · 피앤비엔터테인먼트', en: 'Wisdom Ent. · P&B Ent.', zh: 'Wisdom娱乐·P&B娱乐' },
      contact: '1544-6399', poster: 'assets/img/p-5159.jpg'
    },
    {
      id: 5168, venue: 'hall', genre: 'concert',
      title: { ko: '다이나믹 듀오 단독 콘서트 〈가끔씩 오래 보자〉', en: 'Dynamic Duo — “Sometimes, For a Long Time”', zh: 'Dynamic Duo 单独演唱会《偶尔长久相伴》' },
      sub: { ko: '다이나믹 듀오', en: 'Dynamic Duo', zh: 'Dynamic Duo' },
      from: '2026-11-27', to: '2026-11-29',
      sessions: [s('2026-11-27', '20:00'), s('2026-11-28', '18:00'), s('2026-11-29', '17:00')],
      age: { ko: '만 7세 이상', en: '7+', zh: '7岁以上' },
      run: { ko: '—', en: '—', zh: '—' },
      price: '지정석 143,000',
      organizer: { ko: '씨제이이엔엠', en: 'CJ ENM', zh: 'CJ ENM' },
      contact: '1544-1555', poster: 'assets/img/p-5168.jpg'
    },
    {
      id: 5136, venue: 'woori', genre: 'magic',
      title: { ko: '최현우 30주년 기념 공연 — LEGACY', en: 'Choi Hyun-woo 30th Anniversary — LEGACY', zh: '崔贤宇30周年纪念演出 — LEGACY' },
      sub: { ko: '매직 콘서트', en: 'Magic show', zh: '魔术秀' },
      from: '2026-11-28', to: '2027-01-03',
      weekly: { 3: ['19:30'], 4: ['19:30'], 5: ['19:30'], 6: ['15:00', '19:00'], 0: ['14:00'] },
      sessions: [],
      timeNote: true,
      age: { ko: '8세 이상', en: '8+', zh: '8岁以上' },
      run: { ko: '120분', en: '120 min', zh: '120分钟' },
      price: 'VIP 110,000 · R 99,000 · S 77,000',
      organizer: { ko: '하늘이엔티', en: 'Haneul ENT', zh: 'Haneul ENT' },
      contact: '1688-6675', poster: 'assets/img/p-5136.jpg'
    },
    {
      id: 5158, venue: 'kspo', genre: 'concert',
      title: { ko: '2026-27 로이킴 LIVE TOUR [R:O:Y] in SEOUL', en: 'Roy Kim Live Tour [R:O:Y] in Seoul', zh: 'Roy Kim 巡演 [R:O:Y] 首尔' },
      sub: { ko: '로이킴', en: 'Roy Kim', zh: 'Roy Kim' },
      from: '2026-11-21', to: '2026-11-22',
      sessions: [s('2026-11-21', '18:00'), s('2026-11-22', '17:00')],
      age: { ko: '만 7세 이상', en: '7+', zh: '7岁以上' }, run: { ko: '—', en: '—', zh: '—' },
      price: 'VIP 165,000 · R 154,000', organizer: { ko: '씨제이이엔엠', en: 'CJ ENM', zh: 'CJ ENM' },
      contact: '1544-1555', poster: 'assets/img/p-5158.jpg'
    },
    {
      id: 5167, venue: 'hall', genre: 'concert',
      title: { ko: '2026 CRAVITY CONCERT 〈SONOROUS〉 in Seoul', en: 'CRAVITY Concert “SONOROUS” in Seoul', zh: 'CRAVITY 演唱会《SONOROUS》首尔' },
      sub: { ko: 'CRAVITY', en: 'CRAVITY', zh: 'CRAVITY' },
      from: '2026-11-14', to: '2026-11-15',
      sessions: [s('2026-11-14', '18:00'), s('2026-11-15', '16:00')],
      age: { ko: '7세 이상', en: '7+', zh: '7岁以上' }, run: { ko: '—', en: '—', zh: '—' },
      price: 'VIP 198,000 · 일반 154,000', organizer: { ko: '스타쉽 · 쇼노트', en: 'Starship · Show Note', zh: 'Starship·Show Note' },
      contact: '1899-0042', poster: 'assets/img/p-5167.jpg'
    },
    {
      id: 5166, venue: 'hall', genre: 'concert',
      title: { ko: '2026 박재정 콘서트 — 기록', en: 'Park Jae-jung Concert — Record', zh: '朴宰正演唱会 — 记录' },
      sub: { ko: '박재정', en: 'Park Jae-jung', zh: '朴宰正' },
      from: '2026-11-07', to: '2026-11-08',
      sessions: [s('2026-11-07', '18:00'), s('2026-11-08', '17:00')],
      age: { ko: '만 8세 이상', en: '8+', zh: '8岁以上' }, run: { ko: '150분', en: '150 min', zh: '150分钟' },
      price: 'R 154,000 · S 143,000 · A 132,000', organizer: { ko: '리짐인터내셔널', en: 'Rezim International', zh: 'Rezim International' },
      contact: '070-8838-9937', poster: 'assets/img/p-5166.jpg'
    },
    {
      id: 5169, venue: 'woori', genre: 'ballet',
      title: { ko: '코리아발레스타즈 〈호두까기인형〉', en: 'Korea Ballet Stars — The Nutcracker', zh: '韩国芭蕾明星《胡桃夹子》' },
      sub: { ko: '발레', en: 'Ballet', zh: '芭蕾' },
      from: '2026-11-07', to: '2026-11-08',
      sessions: [s('2026-11-07', '16:00'), s('2026-11-08', '16:00')],
      age: { ko: '48개월 이상', en: '48 months+', zh: '48个月以上' }, run: { ko: '120분 (인터미션 20분)', en: '120 min (20 min interval)', zh: '120分钟（中场20分钟）' },
      price: 'R 70,000 · S 50,000', organizer: { ko: '코리아발레스타즈', en: 'Korea Ballet Stars', zh: '韩国芭蕾明星' },
      contact: '', poster: 'assets/img/p-5169.jpg'
    },
    {
      id: 5157, venue: 'kspo', genre: 'concert',
      title: { ko: 'EXO PLANET #6 — EXhOrizon [dot]', en: 'EXO PLANET #6 — EXhOrizon [dot]', zh: 'EXO PLANET #6 — EXhOrizon [dot]' },
      sub: { ko: 'EXO', en: 'EXO', zh: 'EXO' },
      from: '2026-11-06', to: '2026-11-08',
      sessions: [s('2026-11-06', '19:00'), s('2026-11-07', '18:00'), s('2026-11-08', '17:00')],
      age: { ko: '8세 이상', en: '8+', zh: '8岁以上' }, run: { ko: '—', en: '—', zh: '—' },
      price: 'VIP 198,000 · 일반 165,000', organizer: { ko: 'SM · 드림메이커', en: 'SM · Dream Maker', zh: 'SM·Dream Maker' },
      contact: '1899-0042', poster: 'assets/img/p-5157.jpg'
    },
    {
      id: 5164, venue: 'kspo', genre: 'concert',
      title: { ko: '2026 WOODZ WORLD TOUR 〈Archive. 1 : Completed〉', en: 'WOODZ World Tour “Archive. 1 : Completed”', zh: 'WOODZ 世界巡演《Archive. 1 : Completed》' },
      sub: { ko: 'WOODZ', en: 'WOODZ', zh: 'WOODZ' },
      from: '2026-10-31', to: '2026-11-01',
      sessions: [s('2026-10-31', '18:00'), s('2026-11-01', '17:00')],
      age: { ko: '8세 이상', en: '8+', zh: '8岁以上' }, run: { ko: '120분', en: '120 min', zh: '120分钟' },
      price: 'R 154,000 · S 132,000', organizer: { ko: 'EDAM 엔터테인먼트', en: 'EDAM Ent.', zh: 'EDAM娱乐' },
      contact: '1899-0042', poster: 'assets/img/p-5164.jpg'
    },
    {
      id: 5156, venue: 'hall', genre: 'concert',
      title: { ko: '2026 ONEW CONCERT [ONEW THE LIVE : Q]', en: 'ONEW Concert [ONEW THE LIVE : Q]', zh: 'ONEW 演唱会 [ONEW THE LIVE : Q]' },
      sub: { ko: 'ONEW', en: 'ONEW', zh: 'ONEW' },
      from: '2026-10-30', to: '2026-11-01',
      sessions: [s('2026-10-30', '19:28'), s('2026-10-31', '17:00'), s('2026-11-01', '16:00')],
      age: { ko: '미취학아동 입장불가', en: 'No pre-school children', zh: '学龄前儿童禁止入场' }, run: { ko: '—', en: '—', zh: '—' },
      price: 'VIP 209,000 · ON 154,000 · NEW 121,000', organizer: { ko: '그리핀 · 노머스', en: 'Griffin · NOMUS', zh: 'Griffin·NOMUS' },
      contact: '1899-0042', poster: 'assets/img/p-5156.jpg'
    },
    {
      id: 5155, venue: 'woori', genre: 'concert',
      title: { ko: '2026 심규선 단독 콘서트 ［SANCTUARY］', en: 'Sim Kyu-seon Solo Concert [SANCTUARY]', zh: '沈圭善单独演唱会 [SANCTUARY]' },
      sub: { ko: '심규선', en: 'Sim Kyu-seon', zh: '沈圭善' },
      from: '2026-10-24', to: '2026-11-01',
      sessions: [s('2026-10-24', '18:00'), s('2026-10-25', '17:00'), s('2026-10-31', '18:00'), s('2026-11-01', '17:00')],
      age: { ko: '8세 이상', en: '8+', zh: '8岁以上' }, run: { ko: '150분 (인터미션 15분)', en: '150 min (15 min interval)', zh: '150分钟（中场15分钟）' },
      price: 'R 143,000 · S 132,000', organizer: { ko: '놀유니버스', en: 'NOL Universe', zh: 'NOL Universe' },
      contact: '1544-1555', poster: 'assets/img/p-5155.jpg'
    }
  ];

  /* ── 산책 스팟 (올림픽공원 9경·생태 데이터) ─────────────── */
  var SPOTS = [
    {
      id: 'rose', no: 9,
      name: { ko: '장미광장', en: 'Rose Plaza', zh: '玫瑰广场' },
      meta: { ko: '13,260㎡ · 165종 18,500주 · K-아트홀과 올림픽홀 사이', en: '13,260 ㎡ · 165 species, 18,500 roses · between K-Art Hall and Olympic Hall', zh: '13,260㎡ · 165种 18,500株 · 位于K艺术厅与奥林匹克厅之间' },
      desc: { ko: '고대·근대 올림픽의 만남을 주제로 제우스 등 올림푸스 12신의 이름을 붙인 12개 화단. 열주와 그리스 벽화가 이어집니다.', en: 'Twelve beds named after the twelve Olympian gods, linked by colonnades and Greek murals.', zh: '以宙斯等奥林匹斯十二神命名的12个花坛，配有柱廊与希腊壁画。' },
      season: { ko: '11월 하순 — 꽃은 없어요. 개화는 5~6월, 9~10월 (8월 초~9월 중순은 준비 기간)', en: 'Late Nov — no blooms. Flowers May–Jun and Sep–Oct (early Aug–mid Sep is a rest period)', zh: '11月下旬 — 无花。花期为5~6月、9~10月（8月初至9月中为休整期）' },
      bloom: false, near: 'hall'
    },
    {
      id: 'deulkkot', no: 8,
      name: { ko: '들꽃마루', en: 'Wildflower Mound', zh: '野花坡' },
      meta: { ko: '2,800㎡ 야생화단지 · 장미광장 옆 · 언덕 위 원두막', en: '2,800 ㎡ wildflower garden · next to Rose Plaza · pergola on the hill', zh: '2,800㎡野生花园 · 毗邻玫瑰广场 · 山坡上有凉亭' },
      desc: { ko: '봄에는 꽃양귀비·유채, 가을에는 노랑코스모스가 양쪽 경사로를 따라 핍니다. 지금은 다음 계절을 기다리는 흙과 줄기만 남아 조용해요.', en: 'Poppies and rapeseed in spring, yellow cosmos in autumn. Right now only stems and soil remain — quiet and empty.', zh: '春天是虞美人与油菜花，秋天是黄色波斯菊。现在只剩茎秆与泥土，格外安静。' },
      season: { ko: '11월 — 비수기. 봄꽃 5~6월, 가을꽃 9~10월', en: 'Nov — off season. Spring May–Jun, autumn Sep–Oct', zh: '11月 — 淡季。春花5~6月，秋花9~10月' },
      bloom: false, near: 'hall'
    },
    {
      id: 'tree', no: 6,
      name: { ko: '나홀로나무', en: 'Lone Tree', zh: '孤独之树' },
      meta: { ko: '측백나무 높이 약 10m · 6경 · 서2문 방면', en: 'A ~10 m arborvitae · 6th of nine scenic spots · near West 2 gate', zh: '侧柏 高约10米 · 第九景之一 · 西2门方向' },
      desc: { ko: '1985년 아시안게임과 88올림픽을 앞두고 몽촌토성 안 민가를 철거할 때, 키가 크고 모양이 예쁜 나무만 남겨 홀로 서게 됐어요. 영화·드라마 배경으로도 유명합니다.', en: 'Left standing when the houses inside Mongchon Fortress were cleared for the 1986 Asian Games and 1988 Olympics. A favourite film location.', zh: '1985年为亚运会与奥运会清理梦村土城内民宅时，只留下这棵高大挺拔的树。也是著名影视取景地。' },
      season: { ko: '11월 — 상록수라 사계절 같은 자리. 지금이 하늘이 가장 비어 보여요', en: 'Nov — evergreen, so it looks the same all year; the sky is emptiest now', zh: '11月 — 常绿树，四季如常；此刻天空最空旷' },
      bloom: true, near: 'woori'
    },
    {
      id: 'lake88', no: 7,
      name: { ko: '88호수 · 오륜정', en: '88 Lake & Oryun Pavilion', zh: '88湖 · 五环亭' },
      meta: { ko: '12,700㎡ · 15,000톤 · 조각품 13점 · ‘날갯짓’', en: '12,700 ㎡ · 15,000 t · 13 sculptures · “Wingbeat”', zh: '12,700㎡ · 15,000吨 · 13件雕塑 ·《振翅》' },
      desc: { ko: '성내천 유수지로 만든 인공호수. 호수 위 17개의 날개가 바람에 움직이는 스스무 싱구의 ‘날갯짓’이 떠 있어요. 해 질 무렵이 가장 좋습니다.', en: 'An artificial lake on Seongnae stream, with Susumu Shingu’s “Wingbeat” — 17 wings moving on the water. Best at dusk.', zh: '由城內川蓄水池改建的人工湖，湖上有新宫晋《振翅》——17片随风摆动的翼。黄昏最美。' },
      season: { ko: '11월 — 해가 일찍 져서 17시 공연 전이면 이미 노을', en: 'Nov — sunset comes early; before a 17:00 show it is already dusk', zh: '11月 — 日落很早，17点开演前已是黄昏' },
      bloom: true, near: 'hall'
    },
    {
      id: 'moat', no: 3,
      name: { ko: '몽촌해자 · 호반의 길', en: 'Mongchon Moat · Lakeside Path', zh: '梦村护城河 · 湖畔路' },
      meta: { ko: '둘레 1,800m · 호반의 길 1,302m · 약 18분', en: '1,800 m around · lakeside path 1,302 m · about 18 min', zh: '周长1,800米 · 湖畔路1,302米 · 约18分钟' },
      desc: { ko: '평화의광장 → 곰말다리 → 소마미술관 → 평화의광장으로 도는 가장 짧은 코스. 겨울엔 갈대가 장관이에요.', en: 'The shortest loop: Peace Plaza → Gommal Bridge → Soma Museum → back. Reeds are at their best in winter.', zh: '最短环线：和平广场 → 熊马桥 → 昭玛美术馆 → 返回。冬季芦苇最美。' },
      season: { ko: '11월 — 갈대가 가장 좋은 때', en: 'Nov — peak reed season', zh: '11月 — 芦苇最佳时节' },
      bloom: true, near: 'woori'
    },
    {
      id: 'peace', no: 1,
      name: { ko: '세계평화의문', en: 'World Peace Gate', zh: '世界和平之门' },
      meta: { ko: '62.0 × 37.0 × 24.0m · 김중업 설계 · 남4문 방면', en: '62 × 37 × 24 m · by Kim Joong-up · near South 4 gate', zh: '62×37×24米 · 金重业设计 · 南4门方向' },
      desc: { ko: '88서울올림픽을 기념해 세운 조형물. 천장 날개 아래 사신도 단청과 좌우 30개씩의 열주탈이 있어요. 야간 조명이 켜지면 가장 웅장합니다.', en: 'Built for the 1988 Seoul Olympics: four guardian-animal murals under the wings and 30 masks on each side. Most striking when lit at night.', zh: '为纪念1988年首尔奥运会而建。檐下有四神图彩绘，两侧各30个柱头面具。夜间亮灯时最壮观。' },
      season: { ko: '11월 — 17시면 조명이 들어와요', en: 'Nov — lights come on around 17:00', zh: '11月 — 17点左右亮灯' },
      bloom: true, near: 'woori'
    }
  ];

  /* ── 주말 예상 이용률 (공원 자체 서비스, 주말 한정) ─────── */
  var FORECAST = [
    { date: '2026-11-28', label: { ko: '11/28 (토)', en: 'Sat 11/28', zh: '11/28（周六）' }, windows: '17:00–21:00', pct: 112 },
    { date: '2026-11-29', label: { ko: '11/29 (일)', en: 'Sun 11/29', zh: '11/29（周日）' }, windows: '16:00–20:00', pct: 112 }
  ];

  window.OLPARK = {
    I18N: I18N, VENUES: VENUES, EVENTS: EVENTS, SPOTS: SPOTS, FORECAST: FORECAST,
    META: {
      parkingApi: 'https://www.ksponco.or.kr/online/main/parkingorsApi.do?apiKey=PARKING21803504',
      parkingCap: 2200,
      parkingCapNote: '동2문·남2문·북2문',
      forecastUrl: 'https://www.ksponco.or.kr/online/main/parking.do',
      parkUrl: 'https://www.ksponco.or.kr/olympicpark/menu.es?mid=a20301010200',
      collected: '2026-11-25T13:57:00+09:00'
    }
  };
})();
