/* 올팍 나우 · 앱 */
(function () {
  'use strict';

  var D = window.OLPARK;
  var TZ = 'Asia/Seoul';

  /* ── 상태 ─────────────────────────────────────────────── */
  var state = {
    lang: null,
    view: 'now',
    filter: 'up',
    park: { cars: null, at: null, stalled: false, busy: false },
    timer: null
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── 언어 ─────────────────────────────────────────────── */
  function pickLang() {
    var saved = null;
    try { saved = localStorage.getItem('olpark.lang'); } catch (e) {}
    if (saved && D.I18N.navNow[saved]) return saved;
    var n = (navigator.language || 'ko').toLowerCase();
    if (n.indexOf('zh') === 0) return 'zh';
    if (n.indexOf('ko') === 0) return 'ko';
    return 'en';
  }
  function t(key, vars) {
    var row = D.I18N[key];
    var s = row ? (row[state.lang] || row.ko) : key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }
  function L(obj) { return obj && (obj[state.lang] || obj.ko) || ''; }

  /* ── 날짜 ─────────────────────────────────────────────── */
  var WD = {
    ko: ['일', '월', '화', '수', '목', '금', '토'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  };
  function kstParts(d) {
    var f = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'short'
    });
    var o = {};
    f.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return o;
  }
  function ymd(d) { var p = kstParts(d); return p.year + '-' + p.month + '-' + p.day; }
  function hms(d) { var p = kstParts(d); return p.hour + ':' + p.minute + ':' + p.second; }
  function hm(d) { var p = kstParts(d); return p.hour + ':' + p.minute; }
  function parseKst(ymdStr, time) {
    return new Date(ymdStr + 'T' + (time || '00:00') + ':00+09:00');
  }
  function wdIndex(ymdStr) {
    var p = kstParts(parseKst(ymdStr));
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  }
  function dateLabel(ymdStr, withYear) {
    var d = parseKst(ymdStr);
    var p = kstParts(d);
    var wi = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    var w = WD[state.lang][wi];
    var md = (+p.month) + '/' + (+p.day);
    if (state.lang === 'en') return withYear ? (w + ' ' + md + ', ' + p.year) : (w + ' ' + md);
    if (state.lang === 'zh') return (withYear ? p.year + '年' : '') + md + '（' + w + '）';
    return (withYear ? p.year + '. ' : '') + md + ' (' + w + ')';
  }
  function dayWord(diff) {
    if (diff === 0) return t('today');
    if (diff === 1) return t('tomorrow');
    if (diff === 2) return t('dayAfter');
    return null;
  }
  function daysBetween(a, b) {
    var A = parseKst(typeof a === 'string' ? a : ymd(a));
    var B = parseKst(typeof b === 'string' ? b : ymd(b));
    return Math.round((B - A) / 86400000);
  }

  /* ── 회차 ─────────────────────────────────────────────── */
  function sessionsOf(ev) {
    if (ev.sessions && ev.sessions.length) return ev.sessions;
    if (!ev.weekly) return [];
    var out = [];
    var cur = parseKst(ev.from);
    var end = parseKst(ev.to);
    for (var i = 0; i < 400 && cur <= end; i++) {
      var y = ymd(cur), w = wdIndex(y);
      var times = ev.weekly[w];
      if (times) times.forEach(function (tm) { out.push({ d: y, t: tm }); });
      cur = new Date(cur.getTime() + 86400000);
    }
    return out;
  }
  function nextSession(ev, after) {
    var list = sessionsOf(ev), best = null;
    for (var i = 0; i < list.length; i++) {
      var dt = parseKst(list[i].d, list[i].t);
      if (dt.getTime() > after.getTime()) { best = { s: list[i], dt: dt }; break; }
    }
    return best;
  }

  /* ── 아이콘 ───────────────────────────────────────────── */
  var ICO = {
    gate: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V9.5L12 4l8 5.5V20"/><path d="M9.5 20v-6h5v6"/></svg>',
    walk: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s6.2-5.3 6.2-10A6.2 6.2 0 0 0 5.8 11c0 4.7 6.2 10 6.2 10z"/><circle cx="12" cy="10.6" r="2.2"/></svg>',
    out: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 8.5 13.5 12 10 15.5"/><path d="M13.5 12H4"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.2"/><path d="M12 8.2v.4"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="3.6"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/></svg>',
    train: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="13" rx="3.2"/><path d="M8.3 20l1.7-3.5M15.7 20L14 16.5"/><path d="M5.6 12.4h12.8"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13"/><path d="M12.5 6.5 19 12l-6.5 5.5"/></svg>'
  };

  /* ── 주차 ─────────────────────────────────────────────── */
  function parkLevel(pct) {
    if (pct >= 90) return { cls: 'full', key: 'stFull', color: 'var(--full)' };
    if (pct >= 70) return { cls: 'hot', key: 'stHeavy', color: 'var(--hot)' };
    if (pct >= 50) return { cls: 'warn', key: 'stBusy', color: 'var(--warn)' };
    return { cls: 'ok', key: 'stSmooth', color: 'var(--ok)' };
  }
  function loadPark() {
    if (state.park.busy) return;
    state.park.busy = true;
    var url = D.META.parkingApi;
    fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        var n = null;
        if (Array.isArray(j) && j.length) n = Number(j[0].parking_sum);
        else if (j && typeof j === 'object') n = Number(j.parking_sum);
        if (!isFinite(n)) throw new Error('shape');
        state.park.cars = n;
        state.park.at = new Date();
        state.park.stalled = false;
        paintPark();
      })
      .catch(function () {
        if (state.park.cars == null) {
          try {
            var c = JSON.parse(localStorage.getItem('olpark.cache') || 'null');
            if (c && c.cars != null) { state.park.cars = c.cars; state.park.at = new Date(c.at); }
          } catch (e) {}
        }
        state.park.stalled = true;
        paintPark();
      })
      .then(function () { state.park.busy = false; });
  }
  function paintPark() {
    var box = $('#parkBox');
    if (!box) return;
    var cars = state.park.cars;
    var cap = D.META.parkingCap;
    if (cars == null) {
      box.innerHTML = '<div class="park-side"><p class="park-cap">' + esc(t('stalled')) + '</p>' +
        '<button class="link-btn" data-act="retry">' + esc(t('retry')) + '</button></div>';
      return;
    }
    var pct = Math.max(0, Math.min(100, Math.round((cars / cap) * 100)));
    var raw = Math.round((cars / cap) * 100);
    var lv = parkLevel(raw);
    var R = 56, C = 2 * Math.PI * R;
    var off = C * (1 - pct / 100);
    var at = state.park.at ? new Date(state.park.at) : new Date();
    try { localStorage.setItem('olpark.cache', JSON.stringify({ cars: cars, at: at.toISOString() })); } catch (e) {}

    box.innerHTML =
      '<div class="park">' +
        '<div class="ring" role="img" aria-label="' + esc(t('parkingCars', { n: cars.toLocaleString() })) + '">' +
          '<svg viewBox="0 0 132 132" aria-hidden="true">' +
            '<defs><linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">' +
              '<stop offset="0%" stop-color="' + lv.color + '" stop-opacity=".55"/>' +
              '<stop offset="100%" stop-color="' + lv.color + '"/></linearGradient></defs>' +
            '<circle class="track" cx="66" cy="66" r="' + R + '" fill="none" stroke-width="9"/>' +
            '<circle class="val" cx="66" cy="66" r="' + R + '" fill="none" stroke="url(#ringG)" stroke-width="9" ' +
              'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"/>' +
          '</svg>' +
          '<div class="ring-num"><b>' + cars.toLocaleString() + '</b><span>' + esc(t('ringUnit')) + '</span></div>' +
        '</div>' +
        '<div class="park-side">' +
          '<div class="park-status"><span class="badge ' + lv.cls + '">' + esc(t(lv.key)) + '</span>' +
            (raw >= 90 ? '<span class="badge">' + Math.min(raw, 130) + '%</span>' : '') + '</div>' +
          '<p class="park-cap"><b>' + esc(t('parkingCars', { n: cars.toLocaleString() })) + '</b><br>' +
            esc(t('parkingCap', { n: cap.toLocaleString() })) + '</p>' +
          '<div class="park-meta">' +
            '<span' + (state.park.stalled ? ' class="stalled"' : '') + '>' +
              esc(state.park.stalled ? t('stalled') : t('updated', { t: hm(at) })) + '</span>' +
            '<span class="sep"></span><span>' + esc(t('auto60')) + '</span>' +
          '</div>' +
          '<div class="legend">' +
            '<span><i style="background:var(--ok)"></i>50%</span>' +
            '<span><i style="background:var(--warn)"></i>70%</span>' +
            '<span><i style="background:var(--hot)"></i>90%</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (raw >= 90 ? '<p class="park-cap" style="margin:12px 0 0;color:var(--full);font-weight:650">' + esc(t('stFullTip')) + '</p>' : '');

    var val = box.querySelector('.val');
    if (val) requestAnimationFrame(function () {
      val.style.strokeDashoffset = off.toFixed(1);
    });
  }

  /* ── 렌더: 지금 ───────────────────────────────────────── */
  function renderNow() {
    var now = new Date();
    var today = ymd(now);
    var upcoming = [];
    D.EVENTS.forEach(function (ev) {
      var nx = nextSession(ev, now);
      if (nx) upcoming.push({ ev: ev, nx: nx });
    });
    upcoming.sort(function (a, b) { return a.nx.dt - b.nx.dt; });
    var next = upcoming[0] || null;
    var todayShows = D.EVENTS.filter(function (ev) {
      return sessionsOf(ev).some(function (s) { return s.d === today; });
    });

    var head = '' +
      '<div class="view-head">' +
        '<div class="date-line">' + esc(dateLabel(today, true)) + ' · <b>' + esc(hourWord(now)) + '</b></div>' +
        '<h2 id="t-now">' + esc(state.lang === 'ko' ? '지금 올팍' : (state.lang === 'zh' ? '此刻的奥林匹克公园' : 'Olympic Park, now')) + '</h2>' +
      '</div>';

    var parkCard = '<div class="card span2">' +
      '<div class="card-h"><span class="kicker"><span class="dot"></span>' + esc(t('live')) + ' · ' + esc(t('parkingTitle')) + '</span>' +
        '<a class="link-btn" href="' + D.META.forecastUrl + '" target="_blank" rel="noopener">' + esc(t('parkView')) + '</a></div>' +
      '<div id="parkBox"><div class="park"><div class="ring"><div class="ring-num"><b>—</b></div></div>' +
        '<div class="park-side"><p class="park-cap">' + esc(t('parkingCap', { n: '2,200' })) + '</p></div></div></div>' +
      '</div>';

    var nextCard;
    if (next) {
      var diff = daysBetween(today, next.nx.s.d);
      var dw = dayWord(diff);
      var pill = dw ? dw : t('dday', { n: diff });
      nextCard = '<div class="card span2">' +
        '<div class="card-h"><h3>' + esc(t('nextShow')) + '</h3>' +
          '<span class="kicker">' + esc(dateLabel(next.nx.s.d)) + ' ' + esc(next.nx.s.t) + '</span></div>' +
        '<div class="next">' +
          '<div class="next-poster"><img src="' + next.ev.poster + '" alt=""></div>' +
          '<div class="next-body">' +
            '<div class="next-when"><span class="dpill' + (diff <= 2 ? ' soon' : '') + '">' + esc(pill) + '</span>' +
              (todayShows.length > 1 && next.nx.s.d === today ? '<span class="show-tag hot">+' + (todayShows.length - 1) + '</span>' : '') +
            '</div>' +
            '<h3 class="next-title">' + esc(L(next.ev.title)) + '</h3>' +
            '<div class="next-meta">' +
              '<span><i>' + esc(L(D.VENUES[next.ev.venue].alias)) + '</i></span>' +
              '<span>' + esc(next.nx.s.t) + '</span>' +
              '<span>' + esc(L(next.ev.age)) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<button class="btn primary ask" data-open="' + next.ev.id + '">' + esc(t('wayIn')) + ' · ' + esc(t('houseTitle')) + ' ' + ICO.arrow + '</button>' +
      '</div>';
    } else {
      nextCard = '<div class="card span2"><div class="card-h"><h3>' + esc(t('noShowToday')) + '</h3></div>' +
        '<p class="fc-body">' + esc(t('noShowSub')) + '</p></div>';
    }

    var fc = '<div class="card">' +
      '<div class="card-h"><h3>' + esc(t('weekendForecast')) + '</h3>' +
        '<span class="kicker">' + esc(t('live')) + '</span></div>' +
      '<p class="fc-body">' + t('forecastBody') + '</p>' +
      '<div class="fc">' + D.FORECAST.map(function (f) {
        return '<div class="fc-row"><span class="lbl">' + esc(L(f.label)) + '</span>' +
          '<span class="fc-bar"><i data-w="' + Math.min(100, f.pct) + '"></i></span>' +
          '<span class="pct">' + f.pct + '%</span></div>';
      }).join('') + '</div>' +
      '<p class="fc-note">' + esc(L({ ko: D.FORECAST[0].label.ko + ' ' + D.FORECAST[0].windows + ' · ' + D.FORECAST[1].label.ko + ' ' + D.FORECAST[1].windows, en: 'Sat 17:00–21:00 · Sun 16:00–20:00', zh: '周六17:00–21:00 · 周日16:00–20:00' })) + '<br>' +
        esc(t('forecastSrc')) + '</p>' +
      '</div>';

    var quick = '<div class="card">' +
      '<div class="card-h"><h3>' + esc(t('quickGo')) + '</h3></div>' +
      '<div class="quick">' +
        '<button data-nav2="shows">' + ICO.gate + '<span>' + esc(t('qEnter')) + '</span></button>' +
        '<button data-nav2="walk">' + ICO.walk + '<span>' + esc(t('qWalk')) + '</span></button>' +
        '<button data-nav2="exit">' + ICO.out + '<span>' + esc(t('qExit')) + '</span></button>' +
        '<button data-nav2="exit" data-scroll="house">' + ICO.info + '<span>' + esc(t('qInfo')) + '</span></button>' +
      '</div>' +
      '</div>';

    $('#v-now').innerHTML = head + '<div class="cards">' + parkCard + nextCard + fc + quick + '</div>';
    paintPark();
    $$('#v-now .fc-bar i').forEach(function (el, i) {
      requestAnimationFrame(function () { el.style.width = (D.FORECAST[i] ? Math.min(100, D.FORECAST[i].pct) : 0) + '%'; });
    });
  }
  function hourWord(d) {
    var p = kstParts(d);
    var h = +p.hour;
    var h12 = h % 12 === 0 ? 12 : h % 12;
    if (state.lang === 'en') return h12 + ':' + p.minute + ' ' + (h < 12 ? 'AM' : 'PM');
    if (state.lang === 'zh') return (h < 12 ? '上午 ' : (h < 18 ? '下午 ' : '晚上 ')) + h12 + ':' + p.minute;
    return (h < 12 ? '오전 ' : (h < 18 ? '오후 ' : '저녁 ')) + h12 + ':' + p.minute;
  }

  /* ── 렌더: 공연 ───────────────────────────────────────── */
  function filterList() {
    var now = new Date(), today = ymd(now);
    var out = D.EVENTS.map(function (ev) {
      var nx = nextSession(ev, now);
      return { ev: ev, nx: nx, upcoming: !!nx };
    });
    if (state.filter === 'up') out = out.filter(function (o) { return o.upcoming; });
    if (state.filter === 'week') {
      out = out.filter(function (o) { return o.nx && daysBetween(today, o.nx.s.d) <= 7; });
    }
    out.sort(function (a, b) {
      if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;
      if (a.upcoming) return a.nx.dt - b.nx.dt;
      return parseKst(b.ev.to).getTime() - parseKst(a.ev.to).getTime();
    });
    return out;
  }
  function renderShows() {
    var rows = filterList();
    var head = '<div class="view-head">' +
      '<h2 id="t-shows">' + esc(t('showsTitle')) + '</h2>' +
      '<p>' + esc(L({
        ko: '올림픽공원 다섯 공연장의 일정이에요. 카드를 누르면 입장 동선과 공연장 안내가 열립니다.',
        en: 'Every show across the park’s five venues. Tap a card for the way in and the house rules.',
        zh: '奥林匹克公园五个场馆的日程。点击卡片查看入场路线与场馆须知。'
      })) + '</p></div>';

    var chips = '<div class="filters">' + ['up', 'week', 'all'].map(function (k) {
      return '<button class="chip' + (state.filter === k ? ' on' : '') + '" data-filter="' + k + '">' + esc(t('filter' + k.charAt(0).toUpperCase() + k.slice(1))) + '</button>';
    }).join('') + '</div>';

    var body = rows.length ? '<div class="cards">' + rows.map(function (o) {
      var ev = o.ev, v = D.VENUES[ev.venue];
      var when;
      if (o.nx) {
        var diff = daysBetween(ymd(new Date()), o.nx.s.d);
        var dw = dayWord(diff);
        when = (dw ? dw : t('dday', { n: diff })) + ' · ' + dateLabel(o.nx.s.d) + ' ' + o.nx.s.t;
      } else {
        when = esc(dateLabel(ev.from)) + ' – ' + esc(dateLabel(ev.to));
      }
      return '<div class="show' + (o.upcoming ? '' : ' past') + '" data-open="' + ev.id + '" role="button" tabindex="0">' +
        '<span class="show-poster"><img src="' + ev.poster + '" alt="" loading="lazy"></span>' +
        '<span class="show-body">' +
          '<span class="show-venue">' + esc(L(v.alias)) + '</span>' +
          '<span class="show-title">' + esc(L(ev.title)) + '</span>' +
          '<span class="show-when"><b>' + when + '</b>' +
            (!o.upcoming ? '<span class="show-tag">' + esc(t('pastShow')) + '</span>' : '') +
          '</span>' +
        '</span>' +
      '</div>';
    }).join('') + '</div>' : '<p class="muted">' + esc(t('noMatch')) + '</p>';

    $('#v-shows').innerHTML = head + chips + body;
  }

  /* ── 렌더: 산책 ───────────────────────────────────────── */
  function renderWalk() {
    var head = '<div class="view-head">' +
      '<h2 id="t-walk">' + esc(t('walkTitle')) + '</h2>' +
      '<p>' + esc(t('walkIntro')) + '</p></div>';

    var routes = '<div class="card tight span2">' +
      '<div class="card-h"><h3>' + esc(t('routeTitle')) + '</h3><span class="kicker">' + esc(t('seasonNow')) + '</span></div>' +
      [['r1', 'r1meta'], ['r2', 'r2meta'], ['r3', 'r3meta']].map(function (p, i) {
        return '<div class="route"><span class="route-n">' + (i + 1) + '</span><div>' +
          '<h4>' + esc(t(p[0])) + '</h4><p>' + esc(t(p[1])) + '</p></div></div>';
      }).join('') + '</div>';

    var spots = D.SPOTS.map(function (s) {
      return '<div class="card spot">' +
        '<span class="spot-no">' + (s.no ? s.no + '경' : '') + '</span>' +
        '<h3>' + esc(L(s.name)) + '</h3>' +
        '<p class="meta">' + esc(L(s.meta)) + '</p>' +
        '<p class="desc">' + esc(L(s.desc)) + '</p>' +
        '<div class="season' + (s.bloom ? ' now' : '') + '">' + ICO.sun +
          '<span><b>' + esc(t('seasonNow')) + ' · </b>' + esc(L(s.season)) + '</span></div>' +
      '</div>';
    }).join('');

    $('#v-walk').innerHTML = head + '<div class="cards">' + routes + spots + '</div>';
  }

  /* ── 렌더: 귀가 ───────────────────────────────────────── */
  var GATE_ROWS = [
    { v: 'kspo', ko: '동2문 · P5', en: 'East 2 · P5', zh: '东2门 · P5', nm: { ko: 'KSPO DOME', en: 'KSPO DOME', zh: 'KSPO DOME' } },
    { v: 'arena', ko: '동2문 · P6', en: 'East 2 · P6', zh: '东2门 · P6', nm: { ko: '핸드볼경기장', en: 'Handball Arena', zh: '手球馆' } },
    { v: 'hall', ko: '동2문 · P2', en: 'East 2 · P2', zh: '东2门 · P2', nm: { ko: '올림픽홀', en: 'Olympic Hall', zh: '奥林匹克厅' } },
    { v: 'woori', ko: '남2문 · P7', en: 'South 2 · P7', zh: '南2门 · P7', nm: { ko: '우리금융아트홀', en: 'Woori Art Hall', zh: '友利艺术厅' } },
    { v: 'kart', ko: '남2문 · P1', en: 'South 2 · P1', zh: '南2门 · P1', nm: { ko: 'K-아트홀', en: 'K-Art Hall', zh: 'K艺术厅' } }
  ];

  function renderExit() {
    var head = '<div class="view-head">' +
      '<h2 id="t-exit">' + esc(t('exitTitle')) + '</h2>' +
      '<p>' + esc(t('exitIntro')) + '</p></div>';

    var gateCard = '<div class="card span2">' +
      '<div class="card-h"><h3>' + esc(t('byVenue')) + '</h3><span class="kicker">' + esc(t('gateHours')) + '</span></div>' +
      '<div class="rows">' + GATE_ROWS.map(function (g) {
        var v = D.VENUES[g.v];
        return '<div class="row"><div class="row-k">' + esc(L(g.nm)) + '</div>' +
          '<div class="row-v"><b>' + esc(L(g)) + '</b><small>' + esc(L(v.bus)) + '</small></div></div>';
      }).join('') + '</div>' +
      '<div class="season now" style="margin-top:12px">' + ICO.out +
        '<span><b>' + esc(t('gateNote')) + '</b><br>' + esc(t('gateNoteSub')) + '</span></div>' +
      '</div>';

    var pay = '<div class="card">' +
      '<div class="card-h"><h3>' + esc(t('payTitle')) + '</h3></div>' +
      '<div class="rows">' +
        '<div class="row"><div class="row-k">' + esc(t('rowRate')) + '</div><div class="row-v"><b>' + esc(t('payRate')) + '</b></div></div>' +
        '<div class="row"><div class="row-k">' + esc(t('row10')) + '</div><div class="row-v">' + esc(t('payFree10')) + '</div></div>' +
        '<div class="row"><div class="row-k">' + esc(t('rowRe')) + '</div><div class="row-v">' + esc(t('payAgain')) + '</div></div>' +
        '<div class="row"><div class="row-k">' + esc(t('rowDisc')) + '</div><div class="row-v">' + esc(t('pay50')) + '</div></div>' +
        '<div class="row"><div class="row-k">' + esc(t('rowTicket')) + '</div><div class="row-v">' + esc(t('payNoDsc')) + '</div></div>' +
      '</div></div>';

    var transit = '<div class="card">' +
      '<div class="card-h"><h3>' + esc(t('transitT')) + '</h3></div>' +
      '<div class="rows">' +
        '<div class="row"><div class="row-k">' + esc(t('line59')) + '</div><div class="row-v"><b>' + esc(L({ ko: '올림픽공원역 3번 출구', en: 'Olympic Park Stn. Exit 3', zh: '奥林匹克公园站3号出口' })) + '</b><small>' + esc(t('walk10')) + ' · ' + esc(L(D.VENUES.kspo.alias)) + '</small></div></div>' +
        '<div class="row"><div class="row-k">' + esc(t('line8')) + '</div><div class="row-v"><b>' + esc(L({ ko: '몽촌토성역 1번 출구', en: 'Mongchontoseong Stn. Exit 1', zh: '梦村土城站1号出口' })) + '</b><small>' + esc(t('walk5')) + '</small></div></div>' +
        '<div class="row"><div class="row-k">' + esc(t('line9')) + '</div><div class="row-v"><b>' + esc(L({ ko: '한성백제역 2번 출구', en: 'Hanseong Baekje Stn. Exit 2', zh: '汉城百济站2号出口' })) + '</b><small>' + esc(L({ ko: '남4문 방면', en: 'towards South 4 gate', zh: '南4门方向' })) + '</small></div></div>' +
        '<div class="row"><div class="row-k">' + esc(t('tBus')) + '</div><div class="row-v">3214 · 3220 · 3319 · 3412 · 3413 · 30-5 · 6300</div></div>' +
        '<div class="row"><div class="row-k">' + esc(t('tBusS')) + '</div><div class="row-v">3216 · 3412 · 3413 · 3414 · 35</div></div>' +
      '</div></div>';

    var nocar = '<div class="card span2">' +
      '<div class="card-h"><h3>' + esc(t('noCar')) + '</h3><span class="kicker">' + esc(t('weekendForecast')) + '</span></div>' +
      '<p class="fc-body" style="margin:0">' + esc(t('noCarBody')) + '</p>' +
      '</div>';

    var house = '<div class="card span2" id="houseCard">' +
      '<div class="card-h"><h3>' + esc(t('houseTitle')) + '</h3></div>' +
      '<div class="rows">' +
        houseRow('hTicket', 'hTicketV') + houseRow('hLocker', 'hLockerV') +
        houseRow('hFood', 'hFoodV') + houseRow('hPhoto', 'hPhotoV') + houseRow('hLate', 'hLateV') +
        houseRow('hChild', 'hChildV') + houseRow('hLost', 'hLostV') + houseRow('hWc', 'hWcV') +
      '</div></div>';

    var park = '<div class="card span2">' +
      '<div class="card-h"><h3>' + esc(t('parkTitle')) + '</h3></div>' +
      '<div class="rows">' +
        houseRow('pHours', 'pHoursV') + houseRow('pInfo', 'pInfoV') + houseRow('pLost', 'pLostV') +
        houseRow('pSmoke', 'pSmokeV') + houseRow('pContact', 'pContactV') +
      '</div></div>';

    $('#v-exit').innerHTML = head + '<div class="cards">' + gateCard + nocar + pay + transit + house + park + '</div>';
  }
  function houseRow(k, v) {
    return '<div class="row"><div class="row-k">' + esc(t(k)) + '</div><div class="row-v">' + esc(t(v)) + '</div></div>';
  }

  /* ── 시트 ─────────────────────────────────────────────── */
  function openShow(id) {
    var ev = D.EVENTS.filter(function (e) { return String(e.id) === String(id); })[0];
    if (!ev) return;
    var v = D.VENUES[ev.venue];
    var now = new Date();
    var list = sessionsOf(ev);
    var shown = list.filter(function (s) { return parseKst(s.d, s.t) > now; }).slice(0, 8);
    if (!shown.length) shown = list.slice(-4);

    var sameYear = ev.from.slice(0, 4) === ev.to.slice(0, 4);
    var period = dateLabel(ev.from, !sameYear) + ' – ' + dateLabel(ev.to, !sameYear);

    var html = '<div class="sheet-hero">' +
      '<img src="' + ev.poster + '" alt="">' +
      '<div class="t"><span class="show-venue">' + esc(L(v.alias)) + '</span>' +
        '<h2 id="sheetTitle">' + esc(L(ev.title)) + '</h2>' +
        '<div class="v">' + esc(period) + '</div></div></div>';

    html += '<div class="tags">' +
      '<span class="tag">' + esc(L(ev.age)) + '</span>' +
      '<span class="tag">' + esc(L(ev.run)) + '</span>' +
      (ev.price ? '<span class="tag">' + esc(ev.price) + '</span>' : '') +
      '</div>';

    html += '<div class="sect"><div class="sect-h">' + esc(t('sessions')) + '</div><div class="rows">' +
      shown.map(function (s) {
        return '<div class="row"><div class="row-k">' + esc(dateLabel(s.d)) + '</div><div class="row-v"><b>' + esc(s.t) + '</b></div></div>';
      }).join('') + '</div>' +
      (ev.timeNote ? '<p class="fc-note">' + esc(t('timeVar')) + '</p>' : '') + '</div>';

    html += '<div class="sect"><div class="sect-h">' + esc(t('wayIn')) + '</div>' +
      '<div class="seats">' +
        '<div class="seat">' + esc(t('nearestGate')) + '<b>' + esc(L(v.gate)) + '</b></div>' +
        '<div class="seat">' + esc(t('nearestLot')) + '<b>' + v.lot + ' · ' + v.lotCap + '대</b></div>' +
        '<div class="seat">' + esc(t('seats')) + '<b>' + esc(L(v.seats)) + '</b></div>' +
      '</div>' +
      '<div class="rows">' +
        '<div class="row"><div class="row-k">' + esc(t('subwayLbl')) + '</div><div class="row-v">' + esc(L(v.subway)) + '<small>' + esc(t('subway10')) + '</small></div></div>' +
        '<div class="row"><div class="row-k">' + esc(t('busLbl')) + '</div><div class="row-v">' + esc(v.bus) + '</div></div>' +
        '<div class="row"><div class="row-k">Gate</div><div class="row-v">' + esc(L(v.doors)) + '</div></div>' +
      '</div></div>';

    html += '<div class="sect"><div class="sect-h">' + esc(t('houseTitle')) + '</div><div class="rows">' +
      houseRow('hTicket', 'hTicketV') + houseRow('hLocker', 'hLockerV') +
      houseRow('hFood', 'hFoodV') + houseRow('hPhoto', 'hPhotoV') + houseRow('hLate', 'hLateV') +
      '</div></div>';

    html += '<div class="sect"><div class="sect-h">' + esc(t('promoter')) + '</div><div class="rows">' +
      '<div class="row"><div class="row-k">' + esc(t('priceLbl')) + '</div><div class="row-v">' + esc(ev.price || '—') + '</div></div>' +
      '<div class="row"><div class="row-k">' + esc(t('askLbl')) + '</div><div class="row-v"><b>' + esc(ev.contact || '—') + '</b><small>' + esc(L(ev.organizer)) + '</small></div></div>' +
      '<div class="row"><div class="row-k">' + esc(t('hLost')) + '</div><div class="row-v">' + esc(t('hLostV')) + '</div></div>' +
      '<div class="row"><div class="row-k">' + esc(t('hChild')) + '</div><div class="row-v">' + esc(t('hChildV')) + '</div></div>' +
      '</div></div>';

    html += '<div class="sect"><p class="fc-note" style="margin:0">' + esc(t('srcLine')) + ' · ' + esc(t('srcShow')) +
      ' · <a href="' + D.META.parkUrl + '" target="_blank" rel="noopener">' + esc(t('openOfficial')) + '</a></p></div>';

    $('#sheetBody').innerHTML = html;
    showSheet();
  }
  function showSheet() {
    var w = $('#sheetWrap');
    w.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#sheetX').focus(); }, 40);
  }
  function closeSheet() {
    $('#sheetWrap').hidden = true;
    document.body.style.overflow = '';
  }

  /* ── 라우팅 ───────────────────────────────────────────── */
  function go(view, scrollTo) {
    state.view = view;
    $$('.view').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== view; });
    $$('#tabs button').forEach(function (b) {
      var on = b.getAttribute('data-nav') === view;
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (view === 'now') renderNow();
    if (view === 'shows') renderShows();
    if (view === 'walk') renderWalk();
    if (view === 'exit') renderExit();
    try { history.replaceState(null, '', '#' + view); } catch (e) {}
    if (scrollTo === 'house') {
      setTimeout(function () {
        var el = $('#houseCard');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }

  function renderAll() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-Hans' : state.lang;
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('.lang button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-lang') === state.lang); });
    go(state.view);
  }

  /* ── 이벤트 ───────────────────────────────────────────── */
  function bind() {
    document.addEventListener('click', function (e) {
      var langBtn = e.target.closest('.lang button');
      if (langBtn) {
        state.lang = langBtn.getAttribute('data-lang');
        try { localStorage.setItem('olpark.lang', state.lang); } catch (err) {}
        renderAll();
        return;
      }
      var nav = e.target.closest('[data-nav]');
      if (nav) { go(nav.getAttribute('data-nav')); return; }
      var nav2 = e.target.closest('[data-nav2]');
      if (nav2) { go(nav2.getAttribute('data-nav2'), nav2.getAttribute('data-scroll')); return; }
      var open = e.target.closest('[data-open]');
      if (open) { openShow(open.getAttribute('data-open')); return; }
      var f = e.target.closest('[data-filter]');
      if (f) { state.filter = f.getAttribute('data-filter'); renderShows(); return; }
      var act = e.target.closest('[data-act="retry"]');
      if (act) { state.park.stalled = false; loadPark(); return; }
      if (e.target.closest('#sheetX') || e.target.closest('#sheetScrim')) { closeSheet(); return; }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('#sheetWrap').hidden) closeSheet();
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-open][role="button"]')) {
        e.preventDefault(); openShow(e.target.getAttribute('data-open'));
      }
    });
    $('#themeBtn').addEventListener('click', function () {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      var next = dark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('olpark.theme', next); } catch (e) {}
    });
    window.addEventListener('scroll', function () {
      $('#hdr').classList.toggle('stuck', window.scrollY > 4);
    }, { passive: true });
  }

  /* ── 시작 ─────────────────────────────────────────────── */
  function boot() {
    state.lang = pickLang();
    try {
      var th = localStorage.getItem('olpark.theme');
      if (th) document.documentElement.setAttribute('data-theme', th);
    } catch (e) {}
    var h = (location.hash || '').replace('#', '');
    if (['now', 'shows', 'walk', 'exit'].indexOf(h) >= 0) state.view = h;
    bind();
    renderAll();
    loadPark();
    state.timer = setInterval(function () { loadPark(); }, 60000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) loadPark();
    });
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () {});
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
