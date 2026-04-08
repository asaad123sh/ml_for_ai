(() => {
  const storageKey = 'ml-course-theme';
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const links = document.querySelectorAll('.nav-link');
  const ids = ['day1','day2','day3','day4','day5','day6','day7'];

  function readTheme() {
    try {
      return localStorage.getItem(storageKey);
    } catch (err) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(storageKey, theme);
    } catch (err) {
      // Keep working even if browser storage is blocked.
    }
  }

  function systemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function applyTheme(theme) {
    const activeTheme = theme === 'light' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', activeTheme);
    if (themeToggleBtn) {
      themeToggleBtn.dataset.next = activeTheme === 'dark' ? 'light' : 'dark';
      themeToggleBtn.textContent = activeTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
      themeToggleBtn.setAttribute(
        'aria-label',
        activeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
  }

  applyTheme(readTheme() || systemTheme());

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const next = themeToggleBtn.dataset.next === 'light' ? 'light' : 'dark';
      applyTheme(next);
      saveTheme(next);
    });
  }

  function updateNav() {
    let current = '';
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 160) {
        current = id;
      }
    });
    links.forEach((l) => l.classList.toggle('on', l.getAttribute('href') === '#' + current));
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function splitCodeAndComment(line) {
    let quote = null;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (quote) {
        if (ch === '\\') {
          i += 1;
          continue;
        }
        if (ch === quote) {
          quote = null;
        }
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (ch === '#') {
        return { code: line.slice(0, i), comment: line.slice(i) };
      }
    }
    return { code: line, comment: '' };
  }

  function highlightCodePart(code, keywords, builtins, colorVariables) {
    let out = '';
    let i = 0;
    while (i < code.length) {
      const ch = code[i];

      if (ch === '$' && i + 1 < code.length && code[i + 1] === '{') {
        let j = i + 2;
        while (j < code.length && code[j] !== '}') {
          j += 1;
        }
        if (j < code.length) {
          j += 1;
        }
        out += '<span class="tok-variable">' + escapeHtml(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }

      if (ch === '$' && i + 1 < code.length && /[A-Za-z_]/.test(code[i + 1])) {
        let j = i + 2;
        while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) {
          j += 1;
        }
        out += '<span class="tok-variable">' + escapeHtml(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }

      if (ch === '"' || ch === "'") {
        const quote = ch;
        let j = i + 1;
        while (j < code.length) {
          if (code[j] === '\\') {
            j += 2;
            continue;
          }
          if (code[j] === quote) {
            j += 1;
            break;
          }
          j += 1;
        }
        out += '<span class="tok-string">' + escapeHtml(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }

      if (/[0-9]/.test(ch)) {
        let j = i + 1;
        while (j < code.length && /[0-9]/.test(code[j])) {
          j += 1;
        }
        if (j < code.length && code[j] === '.') {
          let k = j + 1;
          while (k < code.length && /[0-9]/.test(code[k])) {
            k += 1;
          }
          if (k > j + 1) {
            j = k;
          }
        }
        out += '<span class="tok-number">' + escapeHtml(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }

      if (/[A-Za-z_]/.test(ch)) {
        let j = i + 1;
        while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) {
          j += 1;
        }
        const word = code.slice(i, j);
        const cls = keywords.has(word)
          ? 'tok-keyword'
          : (builtins.has(word) ? 'tok-builtin' : (colorVariables ? 'tok-variable' : ''));
        if (cls) {
          out += '<span class="' + cls + '">' + escapeHtml(word) + '</span>';
        } else {
          out += escapeHtml(word);
        }
        i = j;
        continue;
      }

      out += escapeHtml(ch);
      i += 1;
    }
    return out;
  }

  function highlightByLine(src, keywords, builtins, colorVariables) {
    return src.split('\n').map((line) => {
      const parts = splitCodeAndComment(line);
      const codeHtml = highlightCodePart(parts.code, keywords, builtins, colorVariables);
      if (parts.comment) {
        return codeHtml + '<span class="tok-comment">' + escapeHtml(parts.comment) + '</span>';
      }
      return codeHtml;
    }).join('\n');
  }

  function colorizePython(src) {
    const keywords = new Set(['def','return','if','elif','else','for','while','in','import','from','class','try','except','with','as','True','False','None']);
    const builtins = new Set(['print','len','sum','min','max','range','input','int','float','str','type']);
    return highlightByLine(src, keywords, builtins, true);
  }

  function colorizeBash(src) {
    const keywords = new Set([]);
    const builtins = new Set(['python','pip','git','docker','cd','ls','mkdir','echo']);
    return highlightByLine(src, keywords, builtins, false);
  }

  function fallbackHighlight() {
    document.querySelectorAll('pre code').forEach((el) => {
      const cls = el.className || '';
      const src = el.textContent || '';
      if (cls.includes('language-output')) {
        el.innerHTML = escapeHtml(src);
      } else if (cls.includes('language-bash')) {
        el.innerHTML = colorizeBash(src);
      } else {
        el.innerHTML = colorizePython(src);
      }
    });
  }

  function setupMcqCards() {
    document.querySelectorAll('.mcq-card').forEach((card) => {
      const checkBtn = card.querySelector('.mcq-check');
      const resetBtn = card.querySelector('.mcq-reset');
      const scoreEl = card.querySelector('.mcq-score');

      if (checkBtn) {
        checkBtn.addEventListener('click', () => {
          const items = Array.from(card.querySelectorAll('.mcq-item'));
          let correct = 0;
          let answered = 0;

          items.forEach((item) => {
            const answer = Number(item.dataset.answer || -1);
            const selected = item.querySelector('input[type="radio"]:checked');
            const feedback = item.querySelector('.mcq-feedback');
            const why = item.querySelector('.mcq-why');
            const options = Array.from(item.querySelectorAll('.mcq-option'));

            options.forEach((opt) => opt.classList.remove('right', 'wrong'));

            if (!selected) {
              if (feedback) {
                feedback.textContent = 'Please choose one option.';
                feedback.className = 'mcq-feedback need';
              }
              if (why) {
                why.classList.remove('show');
              }
              return;
            }

            answered += 1;
            const chosen = Number(selected.value);

            options.forEach((opt) => {
              const input = opt.querySelector('input');
              if (!input) {
                return;
              }
              const value = Number(input.value);
              if (value === answer) {
                opt.classList.add('right');
              }
              if (value === chosen && chosen !== answer) {
                opt.classList.add('wrong');
              }
            });

            if (chosen === answer) {
              correct += 1;
              if (feedback) {
                feedback.textContent = 'Correct.';
                feedback.className = 'mcq-feedback right';
              }
            } else {
              if (feedback) {
                feedback.textContent = 'Not correct yet. Read explanation and try again.';
                feedback.className = 'mcq-feedback wrong';
              }
            }

            if (why) {
              why.classList.add('show');
            }
          });

          if (scoreEl) {
            scoreEl.textContent = 'Score: ' + correct + '/' + items.length + ' | Answered: ' + answered + '/' + items.length;
            scoreEl.className = 'mcq-score' + (correct === items.length ? ' perfect' : '');
          }
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          card.querySelectorAll('input[type="radio"]').forEach((radio) => {
            radio.checked = false;
          });
          card.querySelectorAll('.mcq-option').forEach((opt) => {
            opt.classList.remove('right', 'wrong');
          });
          card.querySelectorAll('.mcq-feedback').forEach((el) => {
            el.textContent = '';
            el.className = 'mcq-feedback';
          });
          card.querySelectorAll('.mcq-why').forEach((el) => {
            el.classList.remove('show');
          });
          if (scoreEl) {
            scoreEl.textContent = '';
            scoreEl.className = 'mcq-score';
          }
        });
      }
    });
  }

  window.addEventListener('scroll', updateNav);
  updateNav();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.fade-up').forEach((e) => observer.observe(e));

  const popup = document.getElementById('masteryPopup');
  const startBtn = document.getElementById('startCourseBtn');
  if (popup && startBtn) {
    startBtn.addEventListener('click', () => { popup.style.display = 'none'; });
  }

  setupMcqCards();
  fallbackHighlight();
})();
