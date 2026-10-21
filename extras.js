/* Доработки практики: прогресс, генератор, ошибки, статистика. Подключается после practice.js и words.js */
(function () {
    const $ = (id) => document.getElementById(id);
    const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
    const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
    const fill = (w) => w.w.replace('_', '<b>' + w.l + '</b>');
    const shuffle = (a) => a.slice().sort(() => Math.random() - 0.5);
    let current = null, lastFocus = null, timerId = null;

    // --- Серия дней
    function touchStreak() {
        const st = jget('ege_streak', {}), d = new Date().toDateString();
        if (st.last === d) return;
        const y = new Date(Date.now() - 864e5).toDateString();
        jset('ege_streak', { last: d, count: st.last === y ? (st.count || 0) + 1 : 1 });
        renderBar();
    }
    const _mark = markSolved;
    markSolved = function (n) { _mark(n); touchStreak(); renderBar(); };

    // --- Карточка дня: стабильна в течение суток, предпочитает нерешённое
    getDailyTaskNumber = function () {
        const d = new Date().toDateString(), s = jget('ege_daily', {});
        if (s.d === d && TASKS[s.n]) return s.n;
        const all = getTrainerNumbers(), un = all.filter((n) => !getSolved().includes(n)), pool = un.length ? un : all;
        const n = pool[Math.floor(Math.random() * pool.length)];
        jset('ege_daily', { d: d, n: n });
        return n;
    };

    // --- Окно: доступность, фокус, кнопка «Следующее»
    const _show = showModal, _close = closePractice, _open = openTask;
    openTask = function (n) { current = n; _open(n); };
    showModal = function (html) {
        lastFocus = document.activeElement;
        _show(html);
        const body = $('practice-modal-body'), mc = body.closest('.modal-content');
        body.querySelectorAll('.letters-input').forEach((el, i) => { el.maxLength = 1; el.setAttribute('aria-label', 'Буква ' + (i + 1)); });
        if (html.indexOf('data-own') === -1 && html.indexOf('task-title') !== -1) {
            const b = document.createElement('div');
            b.style.cssText = 'margin-top:18px;text-align:right';
            b.innerHTML = '<button type="button" class="tool-btn" onclick="nextTask()">Следующее задание →</button>';
            body.appendChild(b);
        }
        if (mc) { mc.setAttribute('tabindex', '-1'); mc.focus(); }
    };
    closePractice = function (e) {
        clearInterval(timerId);
        _close(e);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    window.nextTask = function () {
        const pool = getAllTaskNumbers().filter((n) => n !== current && !getSolved().includes(n));
        if (!pool.length) { closePractice(); return; }
        openTask(pool[Math.floor(Math.random() * pool.length)]);
    };

    // --- Статистика и ошибки по словам
    function record(words, ok) {
        const st = jget('ege_stats', {}), er = jget('ege_word_errors', {});
        words.forEach((w) => {
            const s = st[w.t] || (st[w.t] = [0, 0]);
            s[ok ? 0 : 1]++;
            if (!ok) er[w.w] = { b: 0, d: 0 };
        });
        jset('ege_stats', st); jset('ege_word_errors', er);
    }

    // --- Генератор заданий: 5 рядов по 3 слова
    function buildRows(src) {
        const by = {};
        (src || WORDS).forEach((w) => (by[w.l] = by[w.l] || []).push(w));
        const L = Object.keys(by).filter((k) => by[k].length >= 3), used = {}, rows = [];
        const take = (arr, n) => shuffle(arr.filter((w) => !used[w.w])).slice(0, n).map((w) => (used[w.w] = 1, w));
        while (rows.length < 5) {
            const a = L[Math.floor(Math.random() * L.length)], good = Math.random() < 0.5;
            let ws;
            if (good) ws = take(by[a], 3);
            else {
                const b = shuffle(L.filter((x) => x !== a))[0];
                ws = take(by[a], 2).concat(take(by[b], 1));
            }
            if (ws.length === 3) rows.push({ ws: shuffle(ws), good: good });
            if (Object.keys(used).length > (src || WORDS).length - 4) break;
        }
        return rows;
    }
    window.openGenerated = function (timed, topic) {
        clearInterval(timerId);
        window._gt = topic || null;
        const rows = buildRows(topic ? WORDS.filter((w) => w.t === topic) : null);
        let h = '<div data-own></div><h3 class="task-title">' + (timed ? 'Вариант на время' : topic ? 'Слабое место: ' + TOPICS[topic] : 'Тренировка') + '</h3>';
        if (timed) h += '<div class="gen-timer" id="gen-timer">05:00</div>';
        h += '<p class="task-text">Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов.</p><form id="gen-form">';
        rows.forEach((r, i) => {
            h += '<div class="quiz-row"><label class="quiz-option"><input type="checkbox" value="' + i + '"><span class="quiz-num">' + (i + 1) + ')</span><span class="quiz-text">' + r.ws.map((w) => w.w).join(', ') + '</span></label></div>';
        });
        h += '<div class="quiz-actions"><button type="submit" class="quiz-btn">Ответить</button><button type="button" class="quiz-btn quiz-btn--reset" onclick="openGenerated(' + !!timed + ', window._gt)">Другие слова</button></div><div id="gen-result"></div></form>';
        showModal(h);
        const form = $('gen-form');
        let done = false, left = 300;
        function finish(e) {
            if (e) e.preventDefault();
            if (done) return; done = true; clearInterval(timerId);
            if (timed) {
                const s = 300 - left;
                $('gen-timer').textContent = left <= 0 ? 'Время вышло' : 'Время: ' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
            }
            let right = 0, bad = {}, tb = '';
            rows.forEach((r, i) => {
                const mark = form.querySelector('input[value="' + i + '"]').checked, ok = mark === r.good;
                if (ok) right++; else r.ws.forEach((w) => (bad[w.t] = 1));
                record(r.ws, ok);
                tb += '<tr class="' + (ok ? '' : 'gen-bad') + '"><td>' + (i + 1) + ')</td><td>' + r.ws.map(fill).join(', ') + '</td><td>' + (r.good ? 'одна буква' : 'разные') + '</td><td>' + r.ws.map((w) => w.c).join('; ') + '</td></tr>';
            });
            form.querySelectorAll('input').forEach((x) => (x.disabled = true));
            let links = Object.keys(bad).map((t) => '<a class="tool-btn" href="teor.html#' + THEORY_LINK[t] + '">Повторить: ' + TOPICS[t] + '</a>').join(' ');
            $('gen-result').innerHTML = '<div class="quiz-result quiz-result--' + (right === 5 ? 'ok' : 'warn') + '">Верно рядов: <b>' + right + ' из 5</b></div>'
                + '<table class="gen-review"><tr><th></th><th>Слова</th><th>Ответ</th><th>Пояснение</th></tr>' + tb + '</table><p style="margin-top:14px">' + links + '</p>';
            if (timed) { const v = jget('ege_variants', []); v.push({ d: new Date().toLocaleDateString('ru-RU'), s: right, t: 300 - Math.max(left, 0) }); jset('ege_variants', v.slice(-10)); }
            touchStreak();
        }
        form.addEventListener('submit', finish);
        if (timed) {
            timerId = setInterval(() => {
                left--; $('gen-timer').textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
                if (left <= 0) finish();
            }, 1000);
        }
    };

    // --- Работа над ошибками: слово исчезает после двух верных ответов подряд
    const DAYS = [0, 1, 3, 7];
    const ent = (v) => (v && typeof v === 'object' ? v : { b: 0, d: 0 });
    window.openMistakes = function () {
        const er = jget('ege_word_errors', {}), now = Date.now();
        const all = WORDS.filter((w) => w.w in er), due = all.filter((w) => ent(er[w.w]).d <= now);
        if (!due.length) {
            showModal('<div data-own></div><h3 class="task-title">Мои ошибки</h3><p class="task-text">' + (all.length ? 'На сегодня всё повторено. Слов в повторении: ' + all.length + '. Возвращайтесь завтра.' : 'Ошибок пока нет. Решите «Тренировку», и слова с ошибками появятся здесь.') + '</p>');
            return;
        }
        const w = due[Math.floor(Math.random() * due.length)];
        showModal('<div data-own></div><h3 class="task-title">Мои ошибки (к повторению: ' + due.length + ')</h3><div class="flash-word">' + w.w.replace('_', '<input id="fl-in" class="letters-input" maxlength="1" aria-label="Буква">') + '</div>'
            + '<div class="quiz-actions" style="justify-content:center"><button class="quiz-btn" id="fl-ok">Проверить</button><button class="quiz-btn quiz-btn--reset" id="fl-hint">Почему так?</button></div><div id="fl-res"></div>');
        $('fl-hint').onclick = () => { $('fl-res').innerHTML = '<div class="quiz-result quiz-result--warn">' + TOPICS[w.t] + '. ' + RULE_HINT[w.t] + '</div>'; };
        $('fl-ok').onclick = function () {
            const ok = $('fl-in').value.trim().toLowerCase() === w.l, e2 = jget('ege_word_errors', {}), x = ent(e2[w.w]);
            if (ok) { x.b++; if (x.b >= DAYS.length) delete e2[w.w]; else { x.d = Date.now() + DAYS[x.b] * 864e5; e2[w.w] = x; } } else e2[w.w] = { b: 0, d: 0 };
            jset('ege_word_errors', e2);
            $('fl-res').innerHTML = '<div class="quiz-result quiz-result--' + (ok ? 'ok' : 'fail') + '">' + (ok ? 'Верно! ' : 'Нет. ') + fill(w) + ' — ' + w.c
                + '</div><div class="quiz-actions" style="justify-content:center"><button class="quiz-btn" onclick="openMistakes()">Дальше</button></div>';
        };
    };

    function pct(t) { const s = jget('ege_stats', {})[t]; return s && s[0] + s[1] ? s[0] / (s[0] + s[1]) : null; }
    window.openWeak = function () {
        const ts = Object.keys(TOPICS).filter((t) => pct(t) !== null).sort((a, b) => pct(a) - pct(b));
        openGenerated(false, ts.length ? ts[0] : null);
    };

    window.openStats = function () {
        const st = jget('ege_stats', {}), vs = jget('ege_variants', []);
        let h = '<div data-own></div><h3 class="task-title">Моя статистика</h3>';
        Object.keys(TOPICS).forEach((t) => {
            const s = st[t] || [0, 0], n = s[0] + s[1], p = n ? Math.round(100 * s[0] / n) : 0;
            h += '<div class="stat-row"><span style="width:240px">' + TOPICS[t] + '</span><div class="stat-bar"><i style="width:' + p + '%"></i></div><span>' + (n ? p + '% (' + n + ')' : '—') + '</span></div>';
        });
        h += '<h3 class="task-title" style="margin-top:26px">Варианты на время</h3>';
        h += vs.length ? '<table class="gen-review"><tr><th>Дата</th><th>Рядов верно</th><th>Время</th></tr>' + vs.slice().reverse().map((v) => '<tr><td>' + v.d + '</td><td>' + v.s + ' из 5</td><td>' + Math.floor(v.t / 60) + ':' + String(v.t % 60).padStart(2, '0') + '</td></tr>').join('') + '</table>' : '<p class="task-text">Пока нет ни одного варианта.</p>';
        showModal(h + '<p class="task-text">Считаются слова из «Тренировки», «Слабых мест» и «Варианта на время».</p>');
    };

    window.openDict = function () {
        showModal('<div data-own></div><h3 class="task-title">Словарь</h3><input id="dict-q" class="tool-input" placeholder="Введите слово или часть слова" aria-label="Поиск"><div id="dict-res"></div>');
        const run = () => {
            const q = $('dict-q').value.trim().toLowerCase();
            const r = q ? WORDS.filter((w) => w.w.replace('_', w.l).indexOf(q) !== -1) : [];
            $('dict-res').innerHTML = !q ? '' : r.length ? '<table class="gen-review"><tr><th>Слово</th><th>Тема</th><th>Пояснение</th></tr>' + r.map((w) => '<tr><td>' + fill(w) + '</td><td>' + TOPICS[w.t] + '</td><td>' + w.c + '</td></tr>').join('') + '</table>' : '<p class="task-text">Такого слова пока нет в базе.</p>';
        };
        $('dict-q').addEventListener('input', run); $('dict-q').focus();
    };

    // --- Перенос прогресса между устройствами
    window.exportProgress = function () {
        const o = {};
        Object.keys(localStorage).filter((k) => k.indexOf('ege_') === 0).forEach((k) => (o[k] = localStorage.getItem(k)));
        prompt('Скопируйте код и сохраните его:', btoa(unescape(encodeURIComponent(JSON.stringify(o)))));
    };
    window.importProgress = function () {
        const c = prompt('Вставьте код прогресса:');
        if (!c) return;
        try {
            const o = JSON.parse(decodeURIComponent(escape(atob(c.trim()))));
            Object.keys(o).forEach((k) => k.indexOf('ege_') === 0 && localStorage.setItem(k, o[k]));
            location.reload();
        } catch (e) { alert('Не удалось прочитать код.'); }
    };

    function renderBar() {
        const el = $('progress-bar'); if (!el) return;
        const st = jget('ege_streak', {}), d = new Date().toDateString(), y = new Date(Date.now() - 864e5).toDateString();
        el.querySelector('.pb-text').innerHTML = 'Решено: <b>' + getSolved().length + '</b> из ' + getAllTaskNumbers().length + ' · Серия: <b>' + ((st.last === d || st.last === y) ? st.count : 0) + '</b> дн.';
    }
    document.addEventListener('DOMContentLoaded', function () {
        const m = $('practice-modal'); m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
        const bar = document.createElement('div');
        bar.id = 'progress-bar'; bar.className = 'home-progress';
        bar.innerHTML = '<span class="pb-text"></span>'
            + '<button class="tool-btn" onclick="openGenerated(false)">Тренировка</button><button class="tool-btn" onclick="openWeak()">Слабые места</button><button class="tool-btn" onclick="openGenerated(true)">Вариант на время</button>'
            + '<button class="tool-btn" onclick="openMistakes()">Мои ошибки</button><button class="tool-btn" onclick="openDict()">Словарь</button><button class="tool-btn" onclick="openStats()">Статистика</button>';
        document.querySelector('.practice-cards').before(bar);
        renderBar(); updateCardTimers();

        // Меню в шапке: экспорт и импорт прогресса
        const hr = document.querySelector('.header-right');
        if (hr) {
            hr.setAttribute('role', 'button'); hr.setAttribute('tabindex', '0'); hr.setAttribute('aria-haspopup', 'true');
            const menu = document.createElement('div');
            menu.className = 'hdr-menu'; menu.hidden = true;
            menu.innerHTML = '<a href="isklyucheniya.html">Список исключений</a><button type="button" onclick="exportProgress()">Экспорт прогресса</button><button type="button" onclick="importProgress()">Импорт прогресса</button>';
            hr.appendChild(menu);
            const toggle = () => { menu.hidden = !menu.hidden; };
            hr.addEventListener('click', (ev) => { if (!menu.contains(ev.target)) toggle(); else menu.hidden = true; });
            hr.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } if (ev.key === 'Escape') menu.hidden = true; });
            document.addEventListener('click', (ev) => { if (!hr.contains(ev.target)) menu.hidden = true; });
        }
    });
})();
