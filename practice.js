        const STORAGE_KEY = 'ege_practice_solved';
        const WEEKLY_STORAGE_KEY = 'ege_practice_weekly';

        // Перенос прогресса на новую нумерацию (тренажёры 1–21, задания ЕГЭ 22–52)
        (function migrateNumbering() {
            try {
                if (localStorage.getItem('ege_numbering_v2')) return;
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const arr = JSON.parse(raw).map(function(n) { return n >= 32 ? n - 31 : n + 21; });
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
                }
                localStorage.removeItem(WEEKLY_STORAGE_KEY);
                localStorage.setItem('ege_numbering_v2', '1');
            } catch (e) {}
        })();

        function getSolved() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) { return []; }
        }

        function setSolved(arr) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        }

        function markSolved(number) {
            const solved = getSolved();
            if (!solved.includes(number)) {
                solved.push(number);
                setSolved(solved);
            }
        }

        function resetProgress() {
            localStorage.removeItem(STORAGE_KEY);
        }

        function getAllTaskNumbers() {
            return Object.keys(TASKS).map(Number);
        }

        // Задания в формате ЕГЭ — те, у которых нет поля type (выбор номеров ответов).
        function isEgeTask(n) {
            return !!TASKS[n] && !TASKS[n].type;
        }

        // Тренажёры — все интерактивные задания (соединить, выбрать букву, распределить и т.д.).
        function getTrainerNumbers() {
            return getAllTaskNumbers().filter(function(n) { return !isEgeTask(n); });
        }

        function getEgeNumbers() {
            return getAllTaskNumbers().filter(isEgeTask);
        }

        // Нумерация для школьника: в каждой группе с единицы.
        // (Внутри кода у заданий сквозные номера: тренажёры 1–21, ЕГЭ 22–52 — на них завязан прогресс.)
        function displayNumber(n) {
            const group = isEgeTask(n) ? getEgeNumbers() : getTrainerNumbers();
            return group.indexOf(n) + 1;
        }

        function taskLabel(n) {
            return (isEgeTask(n) ? 'Задание ЕГЭ ' : 'Тренажёр ') + displayNumber(n);
        }

        function getUnsolved() {
            const solved = getSolved();
            return getAllTaskNumbers().filter(n => !solved.includes(n));
        }

        function getDailyTaskNumber() {
            const day = new Date().getDate();
            const all = getTrainerNumbers();
            return all[(day - 1) % all.length];
        }

        function getWeekKey() {
            const now = new Date();
            const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            return sunday.getFullYear() + '-' + (sunday.getMonth() + 1) + '-' + sunday.getDate();
        }

        // Задание недели: меняется, когда наступает новая неделя (с воскресенья)
        function getWeeklyTaskNumber() {
            const all = getTrainerNumbers();
            const weekKey = getWeekKey();

            let saved = null;
            try {
                const raw = localStorage.getItem(WEEKLY_STORAGE_KEY);
                if (raw) saved = JSON.parse(raw);
            } catch (e) { saved = null; }

            if (saved && typeof saved === 'object' && saved.week === weekKey && TASKS[saved.num] && !isEgeTask(saved.num)) {
                return saved.num;
            }

            const prev = saved && typeof saved === 'object' ? saved.num : null;
            let num;
            let attempts = 0;
            do {
                num = all[Math.floor(Math.random() * all.length)];
                attempts++;
            } while (all.length > 1 && num === prev && attempts < 100);

            try {
                localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify({ week: weekKey, num: num }));
            } catch (e) {}
            return num;
        }

        function msUntilMidnight() {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
            return tomorrow - now;
        }

        function msUntilSundayMidnight() {
            const now = new Date();
            const day = now.getDay();
            const daysUntilSunday = (7 - day) % 7;
            let target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 0, 0, 0, 0);
            if (day === 0 && now.getHours() >= 0) {
                target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 0, 0, 0, 0);
            }
            return target - now;
        }

        function formatTime(ms) {
            if (!ms || isNaN(ms) || ms < 0) ms = 0;
            const totalSec = Math.floor(ms / 1000);
            const h = Math.floor(totalSec / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            const s = totalSec % 60;
            return String(h).padStart(2, '0') + ':' +
                   String(m).padStart(2, '0') + ':' +
                   String(s).padStart(2, '0');
        }

        function updateCardTimers() {
            const dailyNum = getDailyTaskNumber();
            const dailyEl = document.getElementById('daily-number');
            const dailyTimer = document.getElementById('daily-timer');
            if (dailyEl) dailyEl.textContent = displayNumber(dailyNum);
            if (dailyTimer) dailyTimer.textContent = 'обновится через ' + formatTime(msUntilMidnight());

            const weeklyNum = getWeeklyTaskNumber();

            const weeklyEl = document.getElementById('weekly-number');
            const weeklyTimer = document.getElementById('weekly-timer');
            if (weeklyEl) weeklyEl.textContent = displayNumber(weeklyNum);
            if (weeklyTimer) weeklyTimer.textContent = 'обновится через ' + formatTime(msUntilSundayMidnight());
        }

        function openDailyTask() {
            openTask(getDailyTaskNumber());
        }

        function openWeeklyTask() {
            openTask(getWeeklyTaskNumber());
        }

        function openTask(number) {
            const task = TASKS[number];
            if (!task) {
                alert('Задание не найдено (' + number + ').');
                return;
            }

            if (getUnsolved().length === 0) {
                showAllDoneMessage();
                return;
            }

            if (task.type === 'letters') {
                openLettersTask(number, task);
            } else if (task.type === 'pairs') {
                openPairsTask(number, task);
            } else if (task.type === 'pick') {
                openPickTask(number, task);
            } else if (task.type === 'sort') {
                openSortTask(number, task);
            } else if (task.type === 'find') {
                openFindTask(number, task);
            } else {
                openChoicesTask(number, task);
            }
        }

        function openChoicesTask(number, task) {
            let html = '<h3 class="task-title">' + taskLabel(number) + '</h3>';
            html += '<p class="task-text">' + task.question + '</p>';
            html += '<form id="quiz-form" onsubmit="checkChoices(event, ' + number + ')">';

            task.options.forEach(function(option, index) {
                const num = index + 1;
                html += ''
                    + '<div class="quiz-row">'
                    +   '<label class="quiz-option">'
                    +     '<input type="checkbox" name="answer" value="' + num + '">'
                    +     '<span class="quiz-num">' + num + ')</span>'
                    +     '<span class="quiz-text">' + option + '</span>'
                    +   '</label>'
                    + '</div>';
            });

            html += ''
                + '<div class="quiz-actions">'
                +   '<button type="submit" class="quiz-btn">Ответить</button>'
                +   '<button type="button" class="quiz-btn quiz-btn--reset" onclick="resetChoices()">Сбросить</button>'
                + '</div>'
                + '<div id="quiz-result" class="quiz-result"></div>'
                + '</form>';

            showModal(html);
        }

        function openLettersTask(number, task) {
            let html = '<h3 class="task-title">' + taskLabel(number) + '</h3>';
            html += '<p class="task-text">' + task.question + '</p>';
            html += '<form id="letters-form" onsubmit="checkLetters(event, ' + number + ')">';

            task.rows.forEach(function(row, rowIndex) {
                html += '<div class="letters-row" data-row="' + rowIndex + '">';
                html += '<span class="letters-row__num">' + (rowIndex + 1) + ')</span>';
                html += '<span class="letters-row__words">';

                row.words.forEach(function(word, wordIndex) {
                    html += '<span class="letters-word">';
                    html += escapeHtml(word.before);
                    html += '<input type="text" '
                          + 'class="letters-input" '
                          + 'maxlength="1" '
                          + 'autocomplete="off" '
                          + 'data-row="' + rowIndex + '" '
                          + 'data-word="' + wordIndex + '" '
                          + 'aria-label="буква">';
                    html += escapeHtml(word.after);
                    html += '</span>';
                    if (wordIndex < row.words.length - 1) {
                        html += '<span class="letters-comma">, </span>';
                    }
                });

                html += '</span>';
                html += '</div>';
            });

            html += ''
                + '<div class="quiz-actions">'
                +   '<button type="submit" class="quiz-btn">Проверить</button>'
                +   '<button type="button" class="quiz-btn quiz-btn--reset" onclick="resetLetters()">Сбросить</button>'
                + '</div>'
                + '<div id="letters-result" class="quiz-result"></div>'
                + '</form>';

            showModal(html);

            const inputs = document.querySelectorAll('.letters-input');
            inputs.forEach(function(inp, i) {
                inp.addEventListener('input', function() {
                    let v = inp.value.replace(/[^а-яёa-z]/gi, '').slice(0, 1).toLowerCase();
                    inp.value = v;
                    if (v && i < inputs.length - 1) {
                        inputs[i + 1].focus();
                    }
                });
                inp.addEventListener('keydown', function(e) {
                    if (e.key === 'Backspace' && !inp.value && i > 0) {
                        inputs[i - 1].focus();
                    }
                });
            });

            if (inputs.length) inputs[0].focus();
        }

        /* ---------- Задание «Соедини пары» ---------- */
        let pairsState = null;

        function shuffleArray(arr) {
            const a = arr.slice();
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const t = a[i]; a[i] = a[j]; a[j] = t;
            }
            return a;
        }

        function openPairsTask(number, task) {
            const rights = shuffleArray(task.pairs.map(function(p, i) { return { id: i, text: p.right }; }));
            pairsState = { number: number, selectedEl: null, matched: 0, total: task.pairs.length, locked: false };

            let html = '<h3 class="task-title">' + taskLabel(number) + '</h3>';
            html += '<p class="task-text">' + task.question + '</p>';
            html += '<div class="pairs">';

            html += '<div class="pairs__col">';
            task.pairs.forEach(function(p, i) {
                html += '<button type="button" class="pair-item pair-item--left" data-id="' + i + '" onclick="pairsPick(this, \'left\')">'
                      + escapeHtml(p.left) + '</button>';
            });
            html += '</div>';

            html += '<div class="pairs__col">';
            rights.forEach(function(r) {
                html += '<button type="button" class="pair-item pair-item--right" data-id="' + r.id + '" onclick="pairsPick(this, \'right\')">'
                      + escapeHtml(r.text) + '</button>';
            });
            html += '</div>';
            html += '</div>';

            html += '<div class="quiz-actions">'
                  +   '<button type="button" class="quiz-btn quiz-btn--reset" onclick="openPairsTask(' + number + ', TASKS[' + number + '])">Начать заново</button>'
                  + '</div>'
                  + '<div id="pairs-result" class="quiz-result"></div>';

            showModal(html);
        }

        function pairsPick(el, side) {
            if (!pairsState || pairsState.locked) return;
            if (el.classList.contains('pair-item--matched')) return;
            const result = document.getElementById('pairs-result');

            if (side === 'left') {
                document.querySelectorAll('.pair-item--left').forEach(function(b) { b.classList.remove('pair-item--selected'); });
                el.classList.add('pair-item--selected');
                pairsState.selectedEl = el;
                result.className = 'quiz-result';
                result.innerHTML = '';
                return;
            }

            const sel = pairsState.selectedEl;
            if (!sel) {
                result.className = 'quiz-result quiz-result--warn';
                result.innerHTML = '⚠️ Сначала выбери слово слева.';
                return;
            }

            if (sel.dataset.id === el.dataset.id) {
                sel.classList.remove('pair-item--selected');
                sel.classList.add('pair-item--matched');
                el.classList.add('pair-item--matched');
                pairsState.selectedEl = null;
                pairsState.matched++;
                result.className = 'quiz-result';
                result.innerHTML = '';

                if (pairsState.matched === pairsState.total) {
                    markSolved(pairsState.number);
                    updateHistoryPanel();
                    showToast(pairsState.number);
                    result.className = 'quiz-result quiz-result--ok';
                    result.innerHTML = '✅ Верно! Все пары найдены.';
                }
            } else {
                pairsState.locked = true;
                sel.classList.add('pair-item--wrong');
                el.classList.add('pair-item--wrong');
                result.className = 'quiz-result quiz-result--fail';
                result.innerHTML = '❌ Это не пара. Попробуй ещё раз.';
                setTimeout(function() {
                    sel.classList.remove('pair-item--wrong', 'pair-item--selected');
                    el.classList.remove('pair-item--wrong');
                    if (pairsState) {
                        pairsState.selectedEl = null;
                        pairsState.locked = false;
                    }
                }, 700);
            }
        }

        /* ---------- Задание «Выбери букву» ---------- */
        function openPickTask(number, task) {
            let html = '<h3 class="task-title">' + taskLabel(number) + '</h3>';
            html += '<p class="task-text">' + task.question + '</p>';
            html += '<div id="pick-form">';

            task.rows.forEach(function(row, i) {
                html += '<div class="pick-row" data-row="' + i + '">'
                      +   '<span class="pick-row__num">' + (i + 1) + ')</span>'
                      +   '<span class="pick-word">' + escapeHtml(row.before)
                      +     '<button type="button" class="pick-pill" data-row="' + i + '" onclick="pickToggle(this)">..</button>'
                      +     escapeHtml(row.after)
                      +   '</span>'
                      +   '<span class="pick-options" hidden>';
                row.options.forEach(function(opt) {
                    html += '<button type="button" class="pick-option" data-value="' + escapeHtml(opt) + '" onclick="pickChoose(this)">'
                          + escapeHtml(opt) + '</button>';
                });
                html += '</span></div>';
            });

            html += '</div>';
            html += '<div class="pick-extra">'
                  +   '<button type="button" class="pick-link" onclick="pickShowRule()">👁 Правило</button>'
                  + '</div>'
                  + '<div id="pick-rule" class="pick-box" hidden>' + task.rule + '</div>'
                  + '<div class="quiz-actions">'
                  +   '<button type="button" class="quiz-btn" onclick="checkPick(' + number + ')">Проверить</button>'
                  +   '<button type="button" class="quiz-btn quiz-btn--reset" onclick="openPickTask(' + number + ', TASKS[' + number + '])">Сбросить</button>'
                  + '</div>'
                  + '<div id="pick-result" class="quiz-result"></div>'
                  + '<div id="pick-steps" class="pick-box" hidden></div>';

            showModal(html);
        }

        function pickToggle(pill) {
            const row = pill.closest('.pick-row');
            const opts = row.querySelector('.pick-options');
            document.querySelectorAll('.pick-options').forEach(function(o) { if (o !== opts) o.hidden = true; });
            opts.hidden = !opts.hidden;
        }

        function pickChoose(btn) {
            const row = btn.closest('.pick-row');
            const pill = row.querySelector('.pick-pill');
            pill.textContent = btn.dataset.value;
            pill.dataset.value = btn.dataset.value;
            pill.classList.add('pick-pill--filled');
            pill.classList.remove('pick-pill--ok', 'pick-pill--wrong');
            row.querySelector('.pick-options').hidden = true;
        }

        function pickShowRule() {
            const box = document.getElementById('pick-rule');
            if (box) box.hidden = !box.hidden;
        }

        function checkPick(number) {
            const task = TASKS[number];
            const result = document.getElementById('pick-result');
            const steps = document.getElementById('pick-steps');
            const pills = document.querySelectorAll('.pick-pill');
            steps.hidden = true;
            steps.innerHTML = '';

            let empty = false;
            pills.forEach(function(p) { if (!p.dataset.value) empty = true; });
            if (empty) {
                result.className = 'quiz-result quiz-result--warn';
                result.innerHTML = '⚠️ Выбери букву в каждом слове.';
                return;
            }

            const wrong = [];
            pills.forEach(function(p) {
                const i = Number(p.dataset.row);
                const ok = p.dataset.value === task.rows[i].answer;
                p.classList.toggle('pick-pill--ok', ok);
                p.classList.toggle('pick-pill--wrong', !ok);
                if (!ok) wrong.push(i);
            });

            if (wrong.length === 0) {
                markSolved(number);
                updateHistoryPanel();
                showToast(number);
                result.className = 'quiz-result quiz-result--ok';
                result.innerHTML = '✅ Верно! Все буквы выбраны правильно.';
            } else {
                result.className = 'quiz-result quiz-result--fail';
                result.innerHTML = '❌ <b>Неверно.</b> Давай сделаем вместе по шагам.'
                    + '<div class="pick-together"><button type="button" class="quiz-btn" onclick="pickTogether(' + number + ', [' + wrong.join(',') + '])">Сделать вместе</button></div>';
            }
        }

        function pickTogether(number, wrongRows) {
            const task = TASKS[number];
            const steps = document.getElementById('pick-steps');
            let html = '<b>Разбираем ошибки:</b><ol class="pick-steps-list">';
            wrongRows.forEach(function(i) {
                const row = task.rows[i];
                html += '<li><b>' + escapeHtml(row.before + row.answer + row.after) + '</b> — ' + escapeHtml(row.hint) + '</li>';
            });
            html += '</ol>';
            steps.innerHTML = html;
            steps.hidden = false;
            const rule = document.getElementById('pick-rule');
            if (rule) rule.hidden = false;
        }

        /* ---------- Задание «Распредели по группам» ---------- */
        let sortState = null;

        function openSortTask(number, task) {
            const chips = [];
            task.groups.forEach(function(g, gi) {
                g.words.forEach(function(w) { chips.push({ w: w, g: gi }); });
            });
            const shuffled = shuffleArray(chips);
            sortState = { number: number, selected: null, dragged: null };

            let html = '<h3 class="task-title">' + taskLabel(number) + '</h3>';
            html += '<p class="task-text">' + task.question + '</p>';

            html += '<div class="sort-pool sort-zone sort-target" id="sort-pool">';
            shuffled.forEach(function(c) {
                html += '<button type="button" class="sort-chip" draggable="true" data-g="' + c.g + '">' + escapeHtml(c.w) + '</button>';
            });
            html += '</div>';

            html += '<div class="sort-groups">';
            task.groups.forEach(function(g, gi) {
                html += '<div class="sort-group sort-target" data-g="' + gi + '">'
                      +   '<div class="sort-group__title">' + escapeHtml(g.title) + '</div>'
                      +   '<div class="sort-zone"></div>'
                      + '</div>';
            });
            html += '</div>';

            html += '<div class="pick-extra"><button type="button" class="pick-link" onclick="sortShowRule()">👁 Правило</button></div>'
                  + '<div id="sort-rule" class="pick-box" hidden>' + task.rule + '</div>'
                  + '<div class="quiz-actions">'
                  +   '<button type="button" class="quiz-btn" onclick="checkSort(' + number + ')">Проверить</button>'
                  +   '<button type="button" class="quiz-btn quiz-btn--reset" onclick="openSortTask(' + number + ', TASKS[' + number + '])">Сбросить</button>'
                  + '</div>'
                  + '<div id="sort-result" class="quiz-result"></div>'
                  + '<div id="sort-steps" class="pick-box" hidden></div>';

            showModal(html);

            document.querySelectorAll('.sort-chip').forEach(function(chip) {
                chip.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const was = chip.classList.contains('sort-chip--selected');
                    document.querySelectorAll('.sort-chip').forEach(function(c) { c.classList.remove('sort-chip--selected'); });
                    if (was) { sortState.selected = null; }
                    else { chip.classList.add('sort-chip--selected'); sortState.selected = chip; }
                });
                chip.addEventListener('dragstart', function(e) {
                    sortState.dragged = chip;
                    try { e.dataTransfer.setData('text/plain', chip.textContent); } catch (err) {}
                });
            });

            document.querySelectorAll('.sort-target').forEach(function(target) {
                const zone = target.classList.contains('sort-zone') ? target : target.querySelector('.sort-zone');
                target.addEventListener('click', function() {
                    if (sortState.selected) sortMove(sortState.selected, zone);
                });
                target.addEventListener('dragover', function(e) { e.preventDefault(); });
                target.addEventListener('drop', function(e) {
                    e.preventDefault();
                    if (sortState.dragged) sortMove(sortState.dragged, zone);
                });
            });
        }

        function sortMove(chip, zone) {
            zone.appendChild(chip);
            chip.classList.remove('sort-chip--selected', 'sort-chip--ok', 'sort-chip--wrong');
            sortState.selected = null;
            sortState.dragged = null;
        }

        function sortShowRule() {
            const box = document.getElementById('sort-rule');
            if (box) box.hidden = !box.hidden;
        }

        function checkSort(number) {
            const task = TASKS[number];
            const result = document.getElementById('sort-result');
            const steps = document.getElementById('sort-steps');
            steps.hidden = true;
            steps.innerHTML = '';

            const pool = document.getElementById('sort-pool');
            if (pool.querySelector('.sort-chip')) {
                result.className = 'quiz-result quiz-result--warn';
                result.innerHTML = '⚠️ Распредели все слова по группам.';
                return;
            }

            const wrongChips = [];
            document.querySelectorAll('.sort-group').forEach(function(group) {
                const gi = group.dataset.g;
                group.querySelectorAll('.sort-chip').forEach(function(chip) {
                    const ok = chip.dataset.g === gi;
                    chip.classList.toggle('sort-chip--ok', ok);
                    chip.classList.toggle('sort-chip--wrong', !ok);
                    if (!ok) wrongChips.push({ word: chip.textContent, g: Number(chip.dataset.g) });
                });
            });

            if (wrongChips.length === 0) {
                markSolved(number);
                updateHistoryPanel();
                showToast(number);
                result.className = 'quiz-result quiz-result--ok';
                result.innerHTML = '✅ Верно! Все слова на своих местах.';
            } else {
                sortState.wrong = wrongChips;
                result.className = 'quiz-result quiz-result--fail';
                result.innerHTML = '❌ <b>Неверно.</b> Красные слова лежат не в своей группе. Давай сделаем вместе по шагам.'
                    + '<div class="pick-together"><button type="button" class="quiz-btn" onclick="sortTogether(' + number + ')">Сделать вместе</button></div>';
            }
        }

        function sortTogether(number) {
            const task = TASKS[number];
            const steps = document.getElementById('sort-steps');
            let html = '<b>Разбираем ошибки:</b><ol class="pick-steps-list">';
            (sortState.wrong || []).forEach(function(c) {
                const g = task.groups[c.g];
                html += '<li><b>' + escapeHtml(c.word) + '</b> → «' + escapeHtml(g.title) + '». ' + escapeHtml(g.hint) + '</li>';
            });
            html += '</ol>';
            steps.innerHTML = html;
            steps.hidden = false;
            const rule = document.getElementById('sort-rule');
            if (rule) rule.hidden = false;
        }

        /* ---------- Задание «Найди ошибку» ---------- */
        function openFindTask(number, task) {
            let html = '<h3 class="task-title">' + taskLabel(number) + '</h3>';
            html += '<p class="task-text">' + task.question + '</p>';
            html += '<div class="find-list">';
            task.items.forEach(function(it, i) {
                html += '<button type="button" class="find-chip" data-i="' + i + '" onclick="this.classList.toggle(\'find-chip--selected\')">'
                      + escapeHtml(it.text) + '</button>';
            });
            html += '</div>';
            html += '<div class="pick-extra"><button type="button" class="pick-link" onclick="findShowRule()">👁 Правило</button></div>'
                  + '<div id="find-rule" class="pick-box" hidden>' + task.rule + '</div>'
                  + '<div class="quiz-actions">'
                  +   '<button type="button" class="quiz-btn" onclick="checkFind(' + number + ')">Проверить</button>'
                  +   '<button type="button" class="quiz-btn quiz-btn--reset" onclick="openFindTask(' + number + ', TASKS[' + number + '])">Сбросить</button>'
                  + '</div>'
                  + '<div id="find-result" class="quiz-result"></div>'
                  + '<div id="find-steps" class="pick-box" hidden></div>';
            showModal(html);
        }

        function findShowRule() {
            const box = document.getElementById('find-rule');
            if (box) box.hidden = !box.hidden;
        }

        function checkFind(number) {
            const task = TASKS[number];
            const result = document.getElementById('find-result');
            const steps = document.getElementById('find-steps');
            steps.hidden = true;
            steps.innerHTML = '';

            const chips = document.querySelectorAll('.find-chip');
            let anySelected = false;
            chips.forEach(function(c) { if (c.classList.contains('find-chip--selected')) anySelected = true; });
            if (!anySelected) {
                result.className = 'quiz-result quiz-result--warn';
                result.innerHTML = '⚠️ Выбери хотя бы одно слово.';
                return;
            }

            let allCorrect = true;
            chips.forEach(function(c) {
                const it = task.items[Number(c.dataset.i)];
                const selected = c.classList.contains('find-chip--selected');
                c.classList.remove('find-chip--ok', 'find-chip--wrong', 'find-chip--missed');
                if (selected && !it.ok) c.classList.add('find-chip--ok');
                else if (selected && it.ok) { c.classList.add('find-chip--wrong'); allCorrect = false; }
                else if (!selected && !it.ok) { c.classList.add('find-chip--missed'); allCorrect = false; }
            });

            if (allCorrect) {
                markSolved(number);
                updateHistoryPanel();
                showToast(number);
                result.className = 'quiz-result quiz-result--ok';
                result.innerHTML = '✅ Верно! Все ошибки найдены.';
            } else {
                result.className = 'quiz-result quiz-result--fail';
                result.innerHTML = '❌ <b>Неверно.</b> Красным отмечены слова без ошибки, жёлтым — пропущенные ошибки. Давай сделаем вместе по шагам.'
                    + '<div class="pick-together"><button type="button" class="quiz-btn" onclick="findTogether(' + number + ')">Сделать вместе</button></div>';
            }
        }

        function findTogether(number) {
            const task = TASKS[number];
            const steps = document.getElementById('find-steps');
            let html = '<b>Слова с ошибкой и как правильно:</b><ol class="pick-steps-list">';
            task.items.forEach(function(it) {
                if (!it.ok) {
                    html += '<li><s>' + escapeHtml(it.text) + '</s> → <b>' + escapeHtml(it.fix) + '</b>. ' + escapeHtml(it.hint) + '</li>';
                }
            });
            html += '</ol>';
            steps.innerHTML = html;
            steps.hidden = false;
            const rule = document.getElementById('find-rule');
            if (rule) rule.hidden = false;
        }

        function showModal(html) {
            document.getElementById('practice-modal-body').innerHTML = html;
            const modal = document.getElementById('practice-modal');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) modalContent.scrollTop = 0;
        }

        function escapeHtml(s) {
            return String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function showAllDoneMessage() {
            const html = ''
                + '<div class="all-done">'
                +   '<div class="all-done__emoji">🎉</div>'
                +   '<h3 class="all-done__title">Вы решили все задания!</h3>'
                +   '<p class="all-done__text">Начать цикл заново?</p>'
                +   '<div class="all-done__actions">'
                +     '<button type="button" class="quiz-btn" onclick="confirmReset(true)">Да</button>'
                +     '<button type="button" class="quiz-btn quiz-btn--reset" onclick="confirmReset(false)">Нет</button>'
                +   '</div>'
                + '</div>';

            document.getElementById('practice-modal-body').innerHTML = html;

            const modal = document.getElementById('practice-modal');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function confirmReset(yes) {
            if (yes) {
                resetProgress();
                updateHistoryPanel();
                closePractice();
            } else {
                closePractice();
            }
        }

        function closePractice(event) {
            if (event) event.stopPropagation();
            const modal = document.getElementById('practice-modal');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closePractice();
        });

        function checkChoices(event, number) {
            event.preventDefault();

            const correct = TASKS[number].correct;
            const form = document.getElementById('quiz-form');
            const checked = Array.from(form.querySelectorAll('input[name="answer"]:checked'))
                                 .map(cb => cb.value)
                                 .sort();
            const result = document.getElementById('quiz-result');

            if (checked.length === 0) {
                result.className = 'quiz-result quiz-result--warn';
                result.innerHTML = '⚠️ Выберите хотя бы один вариант ответа.';
                return;
            }

            const correctSorted = [...correct].sort();
            const isCorrect = checked.length === correctSorted.length &&
                              checked.every((v, i) => v === correctSorted[i]);

            form.querySelectorAll('.quiz-row').forEach(row => {
                row.classList.remove('quiz-row--correct', 'quiz-row--wrong', 'quiz-row--missed');
                const val = row.querySelector('input').value;
                const isRight = correct.includes(val);
                const isChecked = row.querySelector('input').checked;

                if (isRight && isChecked) row.classList.add('quiz-row--correct');
                else if (!isRight && isChecked) row.classList.add('quiz-row--wrong');
                else if (isRight && !isChecked) row.classList.add('quiz-row--missed');
            });

            if (isCorrect) {
                markSolved(number);
                updateHistoryPanel();
                showToast(number);
                result.className = 'quiz-result quiz-result--ok';
                result.innerHTML = '✅ Верно! Правильные ответы: <b>' + correct.join(', ') + '</b>.';
            } else {
                result.className = 'quiz-result quiz-result--fail';
                result.innerHTML = '❌ Неверно. Попробуйте ещё раз.<br>'
                    + '<span class="quiz-hint">Правильные ответы: <b>' + correct.join(', ') + '</b>.</span>';
            }
        }

        function resetChoices() {
            const form = document.getElementById('quiz-form');
            if (!form) return;
            form.reset();
            const res = document.getElementById('quiz-result');
            res.className = 'quiz-result';
            res.innerHTML = '';
            form.querySelectorAll('.quiz-row').forEach(row => {
                row.classList.remove('quiz-row--correct', 'quiz-row--wrong', 'quiz-row--missed');
            });
        }

        function checkLetters(event, number) {
            event.preventDefault();

            const task = TASKS[number];
            const form = document.getElementById('letters-form');
            const result = document.getElementById('letters-result');
            const inputs = form.querySelectorAll('.letters-input');

            let empty = false;
            inputs.forEach(inp => {
                inp.classList.remove('letters-input--ok', 'letters-input--wrong');
                if (!inp.value.trim()) empty = true;
            });

            if (empty) {
                result.className = 'quiz-result quiz-result--warn';
                result.innerHTML = '⚠️ Заполните все окошки.';
                return;
            }

            let allCorrect = true;

            task.rows.forEach(function(row, rowIndex) {
                row.words.forEach(function(word, wordIndex) {
                    const inp = form.querySelector(
                        '.letters-input[data-row="' + rowIndex + '"][data-word="' + wordIndex + '"]'
                    );
                    if (!inp) return;
                    const val = inp.value.trim().toLowerCase();
                    const ok = val === word.answer.toLowerCase();
                    inp.classList.toggle('letters-input--ok', ok);
                    inp.classList.toggle('letters-input--wrong', !ok);
                    if (!ok) allCorrect = false;
                });
            });

            if (allCorrect) {
                markSolved(number);
                updateHistoryPanel();
                showToast(number);
                result.className = 'quiz-result quiz-result--ok';
                result.innerHTML = '✅ Верно! Все буквы на месте.';
            } else {
                result.className = 'quiz-result quiz-result--fail';
                result.innerHTML = '❌ Есть ошибки. Неверные окошки подсвечены красным.';
            }
        }

        function resetLetters() {
            const form = document.getElementById('letters-form');
            if (!form) return;
            form.querySelectorAll('.letters-input').forEach(inp => {
                inp.value = '';
                inp.classList.remove('letters-input--ok', 'letters-input--wrong');
            });
            const res = document.getElementById('letters-result');
            res.className = 'quiz-result';
            res.innerHTML = '';
            const first = form.querySelector('.letters-input');
            if (first) first.focus();
        }

        function showToast(number) {
            const container = document.getElementById('toast-container');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = 'Выполнено: ' + taskLabel(number);
            container.appendChild(toast);

            void toast.offsetWidth;

            toast.classList.add('toast--visible');

            setTimeout(() => {
                toast.classList.remove('toast--visible');
                toast.classList.add('toast--hiding');
                setTimeout(() => {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 1500);
            }, 1200);
        }

        function updateHistoryPanel() {
            const solved = getSolved().slice().sort((a, b) => a - b);
            const itemsEl = document.getElementById('history-items');
            if (!itemsEl) return;

            if (solved.length === 0) {
                itemsEl.innerHTML = '<div class="history-panel__empty">Пока ничего</div>';
                return;
            }

            let html = '';
            solved.forEach(num => {
                html += '<div class="history-panel__item" onclick="openTaskFromHistory(' + num + ')">'
                     +    'Выполнено: ' + taskLabel(num)
                     +  '</div>';
            });
            itemsEl.innerHTML = html;
        }

        function openTaskFromHistory(num) {
            closeHistoryDropdown();
            closePractice();
            openTask(num);
        }

        function toggleHistoryDropdown() {
            const panel = document.getElementById('history-panel');
            if (!panel) return;
            panel.classList.toggle('history-panel--open');
        }

        function closeHistoryDropdown() {
            const panel = document.getElementById('history-panel');
            if (!panel) return;
            panel.classList.remove('history-panel--open');
        }

        document.addEventListener('DOMContentLoaded', function() {
            function buildGrid(id, numbers) {
                const grid = document.getElementById(id);
                if (!grid) return;
                numbers.forEach(num => {
                    const btn = document.createElement('button');
                    btn.className = 'more-tasks__btn';
                    btn.dataset.num = num;
                    btn.textContent = displayNumber(num);
                    btn.addEventListener('click', () => openTask(num));
                    grid.appendChild(btn);
                });
            }
            buildGrid('trainers-grid', getTrainerNumbers());
            buildGrid('ege-grid', getEgeNumbers());

            const arrow = document.getElementById('history-arrow');
            if (arrow) {
                arrow.addEventListener('click', function(e) {
                    e.stopPropagation();
                    toggleHistoryDropdown();
                });
            }

            document.addEventListener('click', function(e) {
                const panel = document.getElementById('history-panel');
                if (!panel) return;
                if (!panel.contains(e.target)) {
                    closeHistoryDropdown();
                }
            });

            updateHistoryPanel();
            updateCardTimers();
            setInterval(updateCardTimers, 1000);
        });
    