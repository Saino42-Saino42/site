/* Задания на запоминание: «Вспомни исключения», «Собери алгоритм», «Проверочное слово или ловушка», «Моя запоминалка». Подключается после extras.js */
(function () {
    const $ = (id) => document.getElementById(id);
    const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
    const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
    const shuffle = (a) => a.slice().sort(() => Math.random() - 0.5);
    const norm = (s) => s.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
    const esc = (s) => escapeHtml(s);
    const OWN = '<div data-own></div>';

    const EXC = [
        { r: 'ГАР / ГОР (в исключениях пишем А)', w: ['выгарки', 'изгарь', 'пригарь'] },
        { r: 'РАСТ (РАЩ) / РОС (в исключениях пишем О)', w: ['росток', 'ростовщик', 'Ростов', 'Ростислав', 'подростковый', 'отрасль', 'на вырост'] },
        { r: 'ПЛАВ / ПЛОВ / ПЛЫВ (исключения: О и Ы)', w: ['пловец', 'пловчиха', 'плывун'] },
        { r: 'ТВАР / ТВОР (в исключении пишем А)', w: ['утварь'] },
        { r: 'ЛАГ / ЛОЖ: слова с корнем ЛОГ', w: ['слог', 'слоговой', 'полог'] },
        { r: 'Ы после Ц', w: ['цыган', 'цыплёнок', 'на цыпочках', 'цыц', 'цыкнуть'] }
    ];
    const mnemo = () => jget('ege_mnemo', {});

    // ---------- Меню ----------
    window.openMemo = function () {
        showModal(OWN + '<h3 class="task-title">Запоминание</h3>'
            + '<p class="task-text">Здесь нужно вспоминать и рассуждать самому, а не просто узнавать готовый ответ.</p>'
            + [['openRecall()', 'Вспомни исключения', 'Впишите все исключения к корню по памяти.'],
               ['openAlgo()', 'Собери алгоритм', 'Разберите слово по шагам: тип гласной, действие, буква.'],
               ['openTrap()', 'Проверочное слово или ловушка?', 'Отметьте только те слова, которыми можно проверить.'],
               ['openMnemoTask()', 'Моя запоминалка', 'Придумайте свою фразу для исключения.']]
              .map((a) => '<div class="rule-card-modal"><div class="rule-card-modal__title">' + a[1] + '</div><p>' + a[2] + '</p><button class="quiz-btn" onclick="' + a[0] + '">Начать</button></div>').join(''));
    };

    // ---------- 1. Вспомни исключения ----------
    window.openRecall = function (last) {
        const miss = jget('ege_exc_miss', {});
        let idx = 0, best = -1;
        EXC.forEach((x, i) => { const s = (miss[x.r] || 0) + Math.random() * 1.5 - (i === last ? 5 : 0); if (s > best) { best = s; idx = i; } });
        const ex = EXC[idx], typed = [];
        showModal(OWN + '<h3 class="task-title">Вспомни исключения</h3><p class="task-text">Корень: <b>' + ex.r + '</b>.<br>Сколько исключений: <b>' + ex.w.length + '</b>. Впишите слово и нажмите Enter.</p>'
            + '<input id="rc-in" class="tool-input" aria-label="Слово"><div class="find-list" id="rc-chips"></div>'
            + '<div class="quiz-actions"><button class="quiz-btn" id="rc-ok">Проверить</button></div><div id="rc-res"></div>');
        const draw = () => { $('rc-chips').innerHTML = typed.map((t) => '<span class="find-chip">' + esc(t) + '</span>').join(''); };
        const add = () => { const v = $('rc-in').value; if (v.trim() && typed.indexOf(v.trim()) === -1) typed.push(v.trim()); $('rc-in').value = ''; draw(); };
        $('rc-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
        $('rc-in').focus();
        $('rc-ok').onclick = function () {
            add();
            const t = typed.map(norm), want = ex.w.map(norm), mn = mnemo();
            const found = ex.w.filter((w, i) => t.indexOf(want[i]) !== -1), lost = ex.w.filter((w) => found.indexOf(w) === -1);
            const wrong = typed.filter((w) => want.indexOf(norm(w)) === -1);
            const chip = (w, c) => '<span class="find-chip find-chip--' + c + '">' + esc(w) + (mn[w] ? ' <small>— ' + esc(mn[w]) + '</small>' : '') + '</span>';
            miss[ex.r] = lost.length ? (miss[ex.r] || 0) + lost.length : Math.max(0, (miss[ex.r] || 0) - 1);
            jset('ege_exc_miss', miss);
            $('rc-ok').disabled = true;
            $('rc-res').innerHTML = '<div class="quiz-result quiz-result--' + (lost.length || wrong.length ? 'warn' : 'ok') + '">Вспомнено: <b>' + found.length + ' из ' + ex.w.length + '</b></div>'
                + '<div class="find-list">' + found.map((w) => chip(w, 'ok')).join('') + lost.map((w) => chip(w, 'missed')).join('') + wrong.map((w) => '<span class="find-chip find-chip--wrong">' + esc(w) + ' (не исключение)</span>').join('') + '</div>'
                + (lost.length ? '<p class="task-text">Жёлтые слова вы пропустили. Придумайте для них запоминалку в разделе «Моя запоминалка». Этот корень будет выпадать чаще.</p>' : '')
                + '<div class="quiz-actions"><button class="quiz-btn" onclick="openRecall(' + idx + ')">Другой корень</button></div>';
        };
    };

    // ---------- 2. Собери алгоритм ----------
    const ACT = { check: 'Подобрать проверочное слово, где гласная под ударением', vocab: 'Вспомнить слово или проверить по словарю: оно словарное', alt: 'Вспомнить условие чередования и исключения', cish: 'Применить правило о Ц и шипящих' };
    const PAIR = { а: 'о', о: 'а', е: 'и', и: 'е', я: 'е', ё: 'о', ы: 'и' };
    window.openAlgo = function () {
        const w = WORDS[Math.floor(Math.random() * WORDS.length)], letters = shuffle([w.l, PAIR[w.l], shuffle(['а', 'о', 'е', 'и'].filter((x) => x !== w.l && x !== PAIR[w.l]))[0]]);
        const steps = [
            { q: 'Шаг 1. Какого типа гласная в слове «' + esc(w.w.replace('_', '…')) + '»?', o: Object.keys(TOPICS).map((k) => TOPICS[k]), a: TOPICS[w.t] },
            { q: 'Шаг 2. Что нужно сделать, чтобы выбрать букву?', o: Object.keys(ACT).map((k) => ACT[k]), a: ACT[w.t] },
            { q: 'Шаг 3. Какая буква пропущена?', o: letters, a: w.l }
        ];
        let n = 0, errs = 0;
        showModal(OWN + '<h3 class="task-title">Собери алгоритм</h3><div id="al-box"></div>');
        const draw = () => {
            if (n === steps.length) {
                $('al-box').innerHTML = '<div class="quiz-result quiz-result--' + (errs ? 'warn' : 'ok') + '">Готово! Ошибок по пути: <b>' + errs + '</b></div><div class="rule-card-modal"><b>' + esc(w.w.replace('_', w.l)) + '</b> — ' + esc(w.c) + '</div><div class="quiz-actions"><button class="quiz-btn" onclick="openAlgo()">Следующее слово</button></div>';
                return;
            }
            const s = steps[n];
            $('al-box').innerHTML = '<p class="task-text">' + s.q + '</p>' + s.o.map((x, i) => '<div class="quiz-row"><label class="quiz-option" data-i="' + i + '"><span class="quiz-text">' + esc(x) + '</span></label></div>').join('') + '<div id="al-msg"></div>';
            $('al-box').querySelectorAll('.quiz-option').forEach((el) => el.addEventListener('click', () => {
                if (s.o[el.dataset.i] === s.a) { n++; draw(); } else { errs++; el.parentNode.className = 'quiz-row quiz-row--wrong'; $('al-msg').innerHTML = '<div class="quiz-result quiz-result--fail">Не совсем. Подумайте ещё.</div>'; }
            }));
        };
        draw();
    };

    // ---------- 3. Проверочное слово или ловушка ----------
    const TRAPS = [
        ['оп_здать', 'о', ['поздно', 'поздний'], [['опаздывать', 'другой вид глагола: опоздать — совершенный, опаздывать — несовершенный'], ['поздравить', 'другой корень']]],
        ['пров_рять', 'е', ['ве́рный', 'ве́ра'], [['проверка', 'гласная тоже безударная'], ['вирус', 'другой корень']]],
        ['возвр_щение', 'а', ['возвра́т', 'возвра́тный'], [['возвращённый', 'гласная тоже безударная'], ['врач', 'другой корень']]],
        ['просл_дить', 'е', ['след', 'сле́довать'], [['выследить', 'гласная тоже безударная'], ['слизь', 'другой корень']]],
        ['исп_лнение', 'о', ['по́лный'], [['полнота́', 'гласная безударная'], ['пилот', 'другой корень']]],
        ['ч_стоплотный', 'и', ['чи́стый', 'чи́стка'], [['чистота́', 'гласная безударная'], ['чёрный', 'другой корень']]]
    ];
    window.openTrap = function () {
        const t = TRAPS[Math.floor(Math.random() * TRAPS.length)], all = shuffle(t[2].map((w) => [w, 1]).concat(t[3].map((b) => [b[0], 0, b[1]])));
        showModal(OWN + '<h3 class="task-title">Проверочное слово или ловушка?</h3><p class="task-text">Слово: <b>' + t[0] + '</b>. Отметьте слова, которыми <b>можно</b> проверить гласную.</p><form id="tr-form">'
            + all.map((x, i) => '<div class="quiz-row"><label class="quiz-option"><input type="checkbox" value="' + i + '"><span class="quiz-text">' + x[0] + '</span></label></div>').join('')
            + '<div class="quiz-actions"><button class="quiz-btn" type="submit">Ответить</button></div><div id="tr-res"></div></form>');
        $('tr-form').addEventListener('submit', function (e) {
            e.preventDefault();
            let ok = true;
            this.querySelectorAll('.quiz-row').forEach((row, i) => {
                const on = row.querySelector('input').checked, good = all[i][1] === 1;
                if (on !== good) ok = false;
                row.className = 'quiz-row ' + (good && on ? 'quiz-row--correct' : !good && on ? 'quiz-row--wrong' : good ? 'quiz-row--missed' : '');
                if (!good) row.querySelector('.quiz-text').insertAdjacentHTML('beforeend', ' <small>— ' + all[i][2] + '</small>');
            });
            $('tr-res').innerHTML = '<div class="quiz-result quiz-result--' + (ok ? 'ok' : 'fail') + '">' + (ok ? 'Верно!' : 'Есть ошибки.') + ' Пишем: <b>' + t[0].replace('_', t[1]) + '</b>.</div><div class="quiz-actions"><button type="button" class="quiz-btn" onclick="openTrap()">Другое слово</button></div>';
        });
    };

    // ---------- 4. Моя запоминалка ----------
    window.openMnemoTask = function () {
        const flat = []; EXC.forEach((x) => x.w.forEach((w) => flat.push({ w: w, r: x.r })));
        const mn = mnemo(), free = flat.filter((f) => !mn[f.w]), pool = free.length ? free : flat, f = pool[Math.floor(Math.random() * pool.length)];
        const saved = Object.keys(mn);
        showModal(OWN + '<h3 class="task-title">Моя запоминалка</h3><p class="task-text">Исключение: <b>' + esc(f.w) + '</b> (' + f.r + ').<br>Придумайте короткую фразу или образ, который поможет его запомнить.</p>'
            + '<input id="mn-in" class="tool-input" maxlength="120" value="' + esc(mn[f.w] || '') + '" aria-label="Запоминалка"><div class="quiz-actions"><button class="quiz-btn" id="mn-save">Сохранить</button><button class="quiz-btn quiz-btn--reset" onclick="openMnemoTask()">Другое слово</button></div>'
            + '<h3 class="task-title" style="margin-top:24px">Мои запоминалки (' + saved.length + ')</h3>'
            + (saved.length ? '<table class="gen-review">' + saved.map((k, i) => '<tr><td><b>' + esc(k) + '</b></td><td>' + esc(mn[k]) + '</td><td><button class="tool-btn" data-k="' + i + '" aria-label="Удалить">×</button></td></tr>').join('') + '</table>' : '<p class="task-text">Пока пусто.</p>'));
        $('mn-save').onclick = function () { const v = $('mn-in').value.trim(), m = mnemo(); if (v) m[f.w] = v; else delete m[f.w]; jset('ege_mnemo', m); openMnemoTask(); };
        document.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { const m = mnemo(); delete m[saved[b.dataset.k]]; jset('ege_mnemo', m); openMnemoTask(); }));
    };

    document.addEventListener('DOMContentLoaded', function () {
        const bar = $('progress-bar');
        if (!bar) return;
        const b = document.createElement('button');
        b.className = 'tool-btn'; b.textContent = 'Запоминание'; b.onclick = openMemo;
        bar.insertBefore(b, bar.children[1]);
    });
})();
