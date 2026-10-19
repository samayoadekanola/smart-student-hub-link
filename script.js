/* Smart Student Hub - script.js (logic + GSAP animation) */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && !reduce;

  /* ---------- Storage ---------- */
  var KEY = 'smartStudentHub.v1';
  var defaults = {
    level: 'Secondary school', theme: 'light', goal: 2,
    subjects: ['Mathematics', 'English', 'Biology'],
    tasks: [], exam: null, log: {}   // log: {YYYY-MM-DD: {subject: minutes}}
  };
  function load() {
    try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch (e) { return Object.assign({}, defaults); }
  }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function today() { return new Date().toISOString().slice(0, 10); }
  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function todayMins() {
    var l = S.log[today()] || {};
    return Object.keys(l).reduce(function (a, k) { return a + l[k]; }, 0);
  }

  /* ---------- Theme ---------- */
  function setTheme(t) {
    S.theme = t; document.documentElement.setAttribute('data-theme', t);
    $('#themeBtn').innerHTML = t === 'dark' ? '&#9728;' : '&#9790;'; save();
  }
  $('#themeBtn').addEventListener('click', function () { setTheme(S.theme === 'dark' ? 'light' : 'dark'); });

  /* ---------- Navigation ---------- */
  var titles = { dashboard: 'Dashboard', tasks: 'Tasks', subjects: 'Subjects', timer: 'Focus timer', about: 'About & contact' };
  function show(view) {
    $$('.view').forEach(function (v) { v.hidden = v.id !== 'view-' + view; });
    $$('.nav-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.view === view); });
    $('#pageTitle').textContent = titles[view];
    closeMenu();
    var el = $('#view-' + view);
    if (hasGsap) {
      gsap.fromTo(el.children, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .45, stagger: .07, ease: 'power2.out', clearProps: 'all' });
      if (view === 'dashboard') animateBar();
    }
  }
  $('#nav').addEventListener('click', function (e) {
    var b = e.target.closest('.nav-btn'); if (b) show(b.dataset.view);
  });

  /* Mobile menu */
  function openMenu() {
    $('#sidebar').classList.add('open'); $('#scrim').classList.add('show');
    $('#menuBtn').setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show');
    $('#menuBtn').setAttribute('aria-expanded', 'false');
  }
  $('#menuBtn').addEventListener('click', openMenu);
  $('#scrim').addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Profile / level ---------- */
  $('#level').value = S.level;
  $('#level').addEventListener('change', function () { S.level = this.value; save(); renderDash(); });
  var levelText = {
    'Secondary school': 'Plan your timetable, assignments and WAEC, NECO or JAMB revision.',
    'University': 'Manage courses, lectures, projects and semester exams.',
    'Polytechnic': 'Track courses, practicals, assignments and projects.',
    'College / other': 'Keep your coursework, schedules and progress in one place.'
  };

  /* ---------- Subjects ---------- */
  function renderSubjects() {
    $('#subjectList').innerHTML = S.subjects.length ? S.subjects.map(function (s, i) {
      return '<div class="chip"><span>' + esc(s) + '</span><button class="del" data-i="' + i + '" aria-label="Remove ' + esc(s) + '">&times;</button></div>';
    }).join('') : '<p class="empty">No subjects yet. Add your first one above.</p>';
    var opts = S.subjects.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
    $('#taskSubject').innerHTML = opts; $('#timerSubject').innerHTML = opts;
  }
  $('#subjectForm').addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('#subjectName').value.trim();
    if (v && S.subjects.indexOf(v) < 0) { S.subjects.push(v); save(); renderAll(); }
    this.reset();
  });
  $('#subjectList').addEventListener('click', function (e) {
    var b = e.target.closest('.del'); if (!b) return;
    S.subjects.splice(+b.dataset.i, 1); save(); renderAll();
  });

  /* ---------- Tasks ---------- */
  function daysLeft(d) { return Math.ceil((new Date(d) - new Date(today())) / 864e5); }
  function dueText(t) {
    if (!t.due) return 'No due date';
    var n = daysLeft(t.due);
    return n < 0 ? 'Overdue' : n === 0 ? 'Due today' : 'Due in ' + n + ' day' + (n > 1 ? 's' : '');
  }
  function taskLi(t, withDel) {
    return '<li class="' + (t.done ? 'done' : '') + '" data-id="' + t.id + '">' +
      '<button class="check" aria-label="Toggle complete">' + (t.done ? '&#10003;' : '') + '</button>' +
      '<div class="t">' + esc(t.title) + '<small>' + esc(t.subject || 'General') + ' &middot; ' + dueText(t) + '</small></div>' +
      '<span class="tag">' + (t.done ? 'Done' : 'Pending') + '</span>' +
      (withDel ? '<button class="del" aria-label="Delete task">&times;</button>' : '') + '</li>';
  }
  function renderTasks() {
    $('#taskList').innerHTML = S.tasks.length
      ? S.tasks.map(function (t) { return taskLi(t, true); }).join('')
      : '<li class="empty">No tasks yet. Add an assignment or study task above.</li>';
  }
  $('#taskForm').addEventListener('submit', function (e) {
    e.preventDefault();
    S.tasks.unshift({ id: Date.now(), title: $('#taskTitle').value.trim(), subject: $('#taskSubject').value, due: $('#taskDue').value, done: false });
    save(); renderAll(); this.reset();
    if (hasGsap) gsap.from('#taskList li:first-child', { y: -12, opacity: 0, duration: .4 });
  });
  function taskClick(e) {
    var li = e.target.closest('li[data-id]'); if (!li) return;
    var id = +li.dataset.id, t = S.tasks.filter(function (x) { return x.id === id; })[0];
    if (e.target.closest('.check') && t) {
      t.done = !t.done; save();
      if (hasGsap && t.done) gsap.fromTo(li, { scale: .97 }, { scale: 1, duration: .35, ease: 'back.out(3)' });
      renderAll();
    } else if (e.target.closest('.del')) {
      S.tasks = S.tasks.filter(function (x) { return x.id !== id; }); save(); renderAll();
    }
  }
  $('#taskList').addEventListener('click', taskClick);
  $('#dashTasks').addEventListener('click', taskClick);

  /* ---------- Dashboard ---------- */
  function pct() { return Math.min(100, Math.round(todayMins() / (S.goal * 60) * 100)); }
  function animateBar() {
    if (hasGsap) gsap.fromTo('#progFill', { width: '0%' }, { width: pct() + '%', duration: 1, ease: 'power2.out' });
    else $('#progFill').style.width = pct() + '%';
  }
  function renderDash() {
    $('#levelLine').textContent = levelText[S.level];
    $('#stSubjects').textContent = S.subjects.length;
    $('#stDone').textContent = S.tasks.filter(function (t) { return t.done; }).length;
    $('#stDue').textContent = S.tasks.filter(function (t) { return !t.done && t.due && daysLeft(t.due) >= 0 && daysLeft(t.due) <= 7; }).length;
    $('#stHours').textContent = (todayMins() / 60).toFixed(1).replace('.0', '') + 'h';
    $('#progPct').textContent = pct(); $('#goalTxt').textContent = S.goal + 'h'; $('#goalInput').value = S.goal;
    var next = S.tasks.filter(function (t) { return !t.done; }).slice(0, 4);
    $('#dashTasks').innerHTML = next.length ? next.map(function (t) { return taskLi(t, false); }).join('')
      : '<li class="empty">All clear. Add a task to get started.</li>';
    if (S.exam && S.exam.date) {
      var n = daysLeft(S.exam.date);
      $('#examLine').textContent = n >= 0 ? esc(S.exam.name || 'Your exam') + ' is in ' + n + ' day' + (n === 1 ? '' : 's') + '.' : (S.exam.name || 'Your exam') + ' date has passed.';
    }
    $('#progFill').style.width = pct() + '%';
  }
  $('#goalInput').addEventListener('change', function () { S.goal = Math.max(1, Math.min(12, +this.value || 2)); save(); renderDash(); animateBar(); });
  $('#examSave').addEventListener('click', function () {
    var d = $('#examDate').value; if (!d) return;
    S.exam = { name: $('#examName').value.trim() || 'Exam', date: d }; save(); renderDash();
  });

  /* ---------- Focus timer ---------- */
  var C = 2 * Math.PI * 52, total = 25 * 60, left = total, tick = null;
  var ring = $('#ringFg'); ring.style.strokeDasharray = C;
  function fmt(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function drawTimer() {
    $('#timeText').textContent = fmt(left);
    ring.style.strokeDashoffset = C * (1 - left / total);
  }
  function setLen() { total = left = (+$('#timerMins').value) * 60; drawTimer(); }
  function logMinutes(sec) {
    var m = Math.round(sec / 60); if (m < 1) return;
    var day = today(), sub = $('#timerSubject').value || 'General';
    S.log[day] = S.log[day] || {}; S.log[day][sub] = (S.log[day][sub] || 0) + m; save(); renderDash();
  }
  function stop() { clearInterval(tick); tick = null; $('#timerStart').textContent = 'Start'; }
  $('#timerStart').addEventListener('click', function () {
    if (tick) { stop(); logMinutes(total - left); total = left; return; }
    if (left <= 0) setLen();
    var startLeft = left; $('#timerStart').textContent = 'Pause';
    var counted = 0;
    tick = setInterval(function () {
      left--; counted++; drawTimer();
      if (left <= 0) {
        stop(); logMinutes(startLeft);
        $('#timerNote').textContent = 'Session complete. Well done! Take a short break.';
        if (hasGsap) gsap.fromTo('.timer', { scale: 1 }, { scale: 1.04, yoyo: true, repeat: 1, duration: .25 });
      }
    }, 1000);
  });
  $('#timerReset').addEventListener('click', function () { stop(); setLen(); });
  $('#timerMins').addEventListener('change', function () { stop(); setLen(); });

  /* ---------- Init ---------- */
  function renderAll() { renderSubjects(); renderTasks(); renderDash(); }
  setTheme(S.theme); renderAll(); drawTimer();
  if (hasGsap) {
    gsap.from('.sidebar', { x: -30, opacity: 0, duration: .6, ease: 'power2.out' });
    gsap.from('.stat', { y: 24, opacity: 0, duration: .6, stagger: .1, ease: 'power2.out', delay: .15 });
    animateBar();
  }
})();