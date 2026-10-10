/* Prof. Jong-Hyun Kim — homepage interactions (no dependencies).
 * - Entry numbers, tab counts and stats are computed from the lists,
 *   so adding/removing an <li> in index.html is all that's needed.
 */
(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var toTop = document.querySelector('.to-top');
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  /* ---------- Header: solid on scroll, back-to-top ---------- */
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    header.classList.toggle('is-solid', y > 24 || nav.classList.contains('is-open'));
    toTop.classList.toggle('is-visible', y > window.innerHeight * 0.8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    onScroll();
  }
  navToggle.addEventListener('click', function () {
    setMenu(!nav.classList.contains('is-open'));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); navToggle.focus(); }
  });

  /* ---------- Active nav link ---------- */
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (items) {
      items.forEach(function (it) {
        if (!it.isIntersecting) return;
        links.forEach(function (a, i) { a.classList.toggle('is-active', targets[i] === it.target); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(function (t) { if (t) io.observe(t); });
  }

  /* ---------- Numbering + counts ---------- */
  function items(panelId) {
    return Array.prototype.slice.call(document.querySelectorAll('#' + panelId + ' .entries > li'));
  }
  document.querySelectorAll('.entries.numbered').forEach(function (ol) {
    var lis = ol.children, n = lis.length;
    for (var i = 0; i < n; i++) lis[i].setAttribute('data-n', String(n - i)); // newest = highest
  });
  function refreshCounts(scope) {
    (scope || document).querySelectorAll('[data-count]').forEach(function (el) {
      var all = items(el.getAttribute('data-count'));
      var shown = all.filter(function (li) { return !li.hidden; }).length;
      el.textContent = shown === all.length ? all.length : shown + '/' + all.length;
    });
  }
  refreshCounts();
  document.querySelectorAll('[data-count-registered]').forEach(function (el) {
    el.textContent = items(el.getAttribute('data-count-registered'))
      .filter(function (li) { return li.classList.contains('registered'); }).length;
  });
  document.querySelectorAll('[data-years]').forEach(function (el) {
    var ys = items(el.getAttribute('data-years')).map(function (li) {
      var y = li.querySelector('.year'); return y ? parseInt(y.textContent, 10) : NaN;
    }).filter(function (y) { return !isNaN(y); });
    if (ys.length) el.textContent = Math.min.apply(null, ys) + ' – ' + Math.max.apply(null, ys);
  });

  /* ---------- Tabs + search ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function (group) {
    var tabs = Array.prototype.slice.call(group.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var input = group.querySelector('[data-search]');
    var empty = group.querySelector('.no-results');
    var active = 0;

    function show(index, focus) {
      active = index;
      tabs.forEach(function (t, i) {
        var on = i === index;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (!searching()) panels[i].hidden = !on;
      });
      if (focus) tabs[index].focus();
    }
    function searching() { return input && input.value.trim() !== ''; }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        show(i);
        if (searching() && !panels[i].hidden) {
          panels[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      tab.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length, next = null;
        if (k === 'ArrowRight') next = (i + 1) % n;
        else if (k === 'ArrowLeft') next = (i - 1 + n) % n;
        else if (k === 'Home') next = 0;
        else if (k === 'End') next = n - 1;
        if (next !== null) { e.preventDefault(); show(next, true); }
      });
    });
    show(0);

    if (!input) return;
    var original = new WeakMap();
    var all = [];
    panels.forEach(function (p) {
      p.querySelectorAll('.entries > li').forEach(function (li) { original.set(li, li.innerHTML); all.push(li); });
    });

    function highlight(node, q) {
      var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
      var texts = [], t;
      while ((t = walker.nextNode())) texts.push(t);
      texts.forEach(function (tn) {
        var s = tn.nodeValue, lower = s.toLowerCase(), idx = lower.indexOf(q);
        if (idx < 0) return;
        var frag = document.createDocumentFragment(), last = 0;
        while (idx >= 0) {
          frag.appendChild(document.createTextNode(s.slice(last, idx)));
          var m = document.createElement('mark');
          m.textContent = s.slice(idx, idx + q.length);
          frag.appendChild(m);
          last = idx + q.length;
          idx = lower.indexOf(q, last);
        }
        frag.appendChild(document.createTextNode(s.slice(last)));
        tn.parentNode.replaceChild(frag, tn);
      });
    }

    var timer;
    function runSearch() {
      var q = input.value.trim().toLowerCase();
      var total = 0;
      all.forEach(function (li) {
        li.innerHTML = original.get(li);
        var hit = !q || li.textContent.toLowerCase().indexOf(q) >= 0;
        li.hidden = !hit;
        if (hit && q) { highlight(li, q); total++; }
      });
      group.classList.toggle('is-searching', !!q);
      panels.forEach(function (p, i) {
        p.hidden = q ? !p.querySelector('.entries > li:not([hidden])') : i !== active;
      });
      if (empty) empty.hidden = !q || total > 0;
      refreshCounts(group);
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(runSearch, 120); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; runSearch(); }
    });
  });
})();
