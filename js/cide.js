/* ============================================================
   CIDE DESIGN SYSTEM · cide.js — comportamiento único y centralizado
   Uso: script src=".../design-system/js/cide.js" (ver README)
   El comportamiento de TODOS los presets vive aquí, hablado con el
   markup canónico del design system (mismas clases / data-* que los
   componentes en components/P*.html). Los cursos SOLO escriben markup
   canónico y lo inicializan con CIDE.init(); aquí no se duplica nada.
   Si GSAP está cargado antes, las animaciones usan GSAP; si no, fallback CSS.
   ============================================================ */
window.CIDE = (function () {
  const $  = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => [...c.querySelectorAll(s)];
  const hasGSAP = typeof gsap !== 'undefined';

  /* Marca el documento si no hay motion disponible (degradado) */
  function noMotion() {
    document.documentElement.classList.toggle('no-motion', !hasGSAP);
  }

  /* Animación de entrada de un elemento (GSAP o clase CSS) */
  function animate(el) {
    if (!el) return;
    if (hasGSAP) gsap.fromTo(el, {opacity:0, y:24}, {opacity:1, y:0, duration:.45, ease:'power2.out'});
    else el.classList.add('revealed');
  }

  /* ---- TABS (P02) · markup canónico:
       <div class="tabs"> <button class="tab" data-t="f-1">… </div>
       <div class="panel" data-p="f-1">… </div>
       Soporta dos formatos:
         1. data-t="grupo-numero" (uso avanzado, múltiples grupos de tabs)
         2. data-t="valor-simple" (uso básico, todas las tabs son un grupo) */
  function initTabs(root=document) {
    $$('.tab[data-t]', root).forEach(b => b.addEventListener('click', () => {
      const hasDash = b.dataset.t.includes('-');
      const g = hasDash ? b.dataset.t.split('-')[0] : null;
      const parentTabs = b.closest('.tabs');
      // Determinar tabs del mismo grupo
      $$('.tab[data-t]', root).forEach(x => {
        const xHasDash = x.dataset.t.includes('-');
        if (hasDash) {
          // Modo grupo: solo ocultar tabs del mismo grupo
          if (xHasDash && x.dataset.t.split('-')[0]===g) x.classList.remove('active');
        } else {
          // Modo simple: ocultar todas las tabs hermanas (mismo padre .tabs)
          if (parentTabs && x.closest('.tabs')===parentTabs) x.classList.remove('active');
        }
      });
      // Determinar panels a ocultar
      $$('.panel', root).forEach(p => {
        if (!p.dataset.p) return;
        const pHasDash = p.dataset.p.includes('-');
        if (hasDash) {
          if (pHasDash && p.dataset.p.split('-')[0]===g) p.classList.remove('show');
        } else {
          // Modo simple: ocultar todos los panels que correspondan a tabs hermanas
          if (parentTabs) {
            const siblingTabs = $$('.tab[data-t]', parentTabs);
            const tabValues = siblingTabs.map(t => t.dataset.t);
            if (tabValues.includes(p.dataset.p)) p.classList.remove('show');
          }
        }
      });
      b.classList.add('active');
      const panel = $(`.panel[data-p="${b.dataset.t}"]`, root);
      if (panel) panel.classList.add('show');
      animate(panel);
    }));
  }

  /* ---- ACORDEÓN (P08) · markup canónico:
       <div class="acc-item"><button class="acc-head">… <span class="chev">▾ …
       <div class="acc-body"><div class="acc-body-inner">…                    */
  function initAccordions(root=document) {
    $$('.acc-head', root).forEach(h => h.addEventListener('click', () => {
      const body = h.nextElementSibling;
      const open = h.parentElement.classList.toggle('open');
      body.style.maxHeight = open ? body.scrollHeight + 'px' : null;
    }));
  }

  /* ---- CARRUSEL (P07) · markup canónico:
       <div class="carousel"> <div class="c-card">… </div>… </div>
       (dots/puntitos deshabilitados: no se generan indicadores) */
  function initCarousels(root=document) {
    // Puntitos deshabilitados por petición — el carrusel funciona con scroll nativo
    // sin generar .c-dots. Se mantiene el hook por compatibilidad.
    return;
  }

  /* ---- FLIP-CARD (P03) · markup canónico:
       <div class="flip"><div class="flip-inner">
         <div class="flip-face flip-front">… <div class="flip-face flip-back">… */
  function initFlips(root=document) {
    $$('.flip', root).forEach(f => f.addEventListener('click', () => f.classList.toggle('flipped')));
  }

  /* ---- FLIPPINGBOOK (P22) · markup canónico:
       <div class="book">
         <div class="book-container">
           <div class="page-left" id="book-page-left">… </div>
           <div class="page-right" id="book-page-right">… </div>
           <div class="flip-sheet" id="flip-sheet">
             <div class="flip-sheet-face flip-sheet-front">… </div>
             <div class="flip-sheet-face flip-sheet-back">… </div>
           </div>
         </div>
       </div>
       <div class="book-controls">
         <button class="btn book-prev">… </button>
         <button class="btn book-next">… </button>
       </div>
       Páginas:
         left  = página par (2,4,6,8...)
         right = página impar (1,3,5,7...)
         flip-sheet-front = copia de right (se ve antes de voltear)
         flip-sheet-back  = siguiente left (se revela al voltear)
       next: flip-sheet rota 180° → se revela back (nueva left)
             luego actualiza right con nueva right, y resetea flip-sheet
       prev: actualiza primero (back = left actual, front = right anterior)
             luego rota en reversa                              */
  function initFlippingbook(root=document) {
    $$('.book', root).forEach(book => {
      /* Si otro script ya inicializó este libro (el preset P22 trae sus propias páginas y
         cablea sus controles), no lo pisamos con el demo de la librería. */
      if (book.dataset.fbInit) return;
      book.dataset.fbInit = '1';
      const leftEl = $('#book-page-left', book);
      const rightEl = $('#book-page-right', book);
      const sheet = $('#flip-sheet', book);
      const frontEl = sheet ? $('.flip-sheet-front', sheet) : null;
      const backEl = sheet ? $('.flip-sheet-back', sheet) : null;
      /* Los controles son HERMANOS de .book en el markup canónico de arriba, no hijos:
         $('.book-next', book) devolvía siempre null, así que los botones nunca recibían el
         listener y el libro quedaba clavado en la portada — sin error, porque los engancha
         detrás de un if(nextBtn). Se buscan en el .book-controls hermano. */
      const controls = (book.nextElementSibling && book.nextElementSibling.classList.contains('book-controls'))
        ? book.nextElementSibling
        : (book.parentElement ? $('.book-controls', book.parentElement) : null);
      const prevBtn = controls ? $('.book-prev', controls) : $('.book-prev', book);
      const nextBtn = controls ? $('.book-next', controls) : $('.book-next', book);
      const ANIM_MS = 700;

      // Contenido de páginas — [{left:{title,body,num}, right:{title,body,num}}]
      const pages = [
        { left: { title: 'Portada', body: 'Título del libro interactivo. Contenido literal de la diseñadora.', num: 1 }, right: { title: 'Interior portada', body: 'Texto literal de la diseñadora para el interior de la portada.', num: 2 } },
        { left: { title: 'Capítulo 1', body: 'Contenido literal de la diseñadora para la página 3.', num: 3 }, right: { title: 'Capítulo 1 (cont.)', body: 'Continuación del capítulo 1. Texto literal de la diseñadora.', num: 4 } },
        { left: { title: 'Capítulo 2', body: 'Contenido literal de la diseñadora para la página 5.', num: 5 }, right: { title: 'Capítulo 2 (cont.)', body: 'Continuación del capítulo 2. Texto literal de la diseñadora.', num: 6 } },
        { left: { title: 'Capítulo 3', body: 'Contenido literal de la diseñadora para la página 7.', num: 7 }, right: { title: 'Contraportada', body: 'Texto literal de la diseñadora para la contraportada del libro.', num: 8 } }
      ];

      let current = 0;       // índice de página actual (0-based)
      let isAnimating = false;

      const renderLeft = (page) => {
        if (!leftEl) return;
        leftEl.innerHTML = `<h3 style="margin-bottom:8px">${page.left.title}</h3><p class="muted">${page.left.body}</p><div class="page-num">${page.left.num}</div>`;
      };
      const renderRight = (page) => {
        if (!rightEl) return;
        rightEl.innerHTML = `<h3 style="margin-bottom:8px">${page.right.title}</h3><p class="muted">${page.right.body}</p><div class="page-num">${page.right.num}</div>`;
      };
      const renderFront = (page) => {
        if (!frontEl) return;
        frontEl.innerHTML = `<h3 style="margin-bottom:8px">${page.right.title}</h3><p class="muted">${page.right.body}</p><div class="page-num">${page.right.num}</div>`;
      };
      const renderBack = (page) => {
        if (!backEl) return;
        backEl.innerHTML = `<h3 style="margin-bottom:8px">${page.left.title}</h3><p class="muted">${page.left.body}</p><div class="page-num">${page.left.num}</div>`;
      };
      const updateButtons = () => {
        if (prevBtn) prevBtn.disabled = current <= 0;
        if (nextBtn) nextBtn.disabled = current >= pages.length - 1;
      };

      // Inicial
      renderLeft(pages[0]);
      renderRight(pages[0]);
      renderFront(pages[0]);
      renderBack(pages[1] || pages[0]);
      updateButtons();

      // Siguiente página
      const nextPage = () => {
        if (isAnimating) return;
        if (current >= pages.length - 1) return;
        isAnimating = true;
        // Preparar back con contenido de la página siguiente
        renderBack(pages[current + 1]);
        // Iniciar volteo
        sheet.classList.add('flipped');
        // Al terminar la animación, actualizar vistas y resetear
        setTimeout(() => {
          current++;
          renderLeft(pages[current]);
          renderRight(pages[current]);
          renderFront(pages[current]);
          renderBack(pages[current + 1] || pages[current]);
          sheet.classList.remove('flipped');
          updateButtons();
          isAnimating = false;
        }, ANIM_MS);
      };

      // Página anterior
      const prevPage = () => {
        if (isAnimating) return;
        if (current <= 0) return;
        isAnimating = true;
        // Preparar: back = página actual, front = página anterior
        renderBack(pages[current]);
        renderFront(pages[current - 1]);
        // Poner sheet en estado flipped SIN animación (empieza volteado)
        sheet.style.transition = 'none';
        sheet.classList.add('flipped');
        // Forzar reflow para aplicar el estado sin transición
        void sheet.offsetWidth;
        // Restaurar transición y voltear a 0° (con animación)
        sheet.style.transition = '';
        sheet.classList.remove('flipped');
        setTimeout(() => {
          current--;
          renderLeft(pages[current]);
          renderRight(pages[current]);
          renderFront(pages[current]);
          renderBack(pages[current + 1] || pages[current]);
          updateButtons();
          isAnimating = false;
        }, ANIM_MS);
      };

      if (nextBtn) nextBtn.addEventListener('click', nextPage);
      if (prevBtn) prevBtn.addEventListener('click', prevPage);
    });
  }

  /* ---- P23 rise-scroll · markup canónico:
       <div class="rise-progress" data-rise-progress>
         <div class="rise-progress-fill"></div>
       </div>
       <section class="rise-section" data-rise-block="1">… </section>
       <section class="rise-section" data-rise-block="2">… </section>
       …
       <div data-rise-quiz></div>  ← monta CIDE.quiz() con config literal

       DIFERENCIA vs P12 scroll-panel:
         - P23 = scroll DEL DOCUMENTO con bloques auto-contenidos + progreso por bloque.
         - P12 = panel con scroll INTERNO a una diapositiva (overflow-y fijo).
       Progreso: cada bloque marca data-complete="1" al entrar en viewport (ScrollTrigger).
       La barra .rise-progress-fill crece en consecuencia.
       Hook LMS/H5P: cada bloque completado dispara evento 'rise:block' en document
         { detail: { block: Number, total: Number } }
         y al completarse todos, 'rise:complete' en document.
       Fallback sin GSAP: marca todos completos de una vez. */
  function initRiseScroll(root=document) {
    const blocks = $$('[data-rise-block]', root);
    const total = blocks.length;
    const progressBar = $('[data-rise-progress]');
    const progressFill = $('.rise-progress-fill', progressBar || document);
    if (!total) return;

    let completed = 0;

    const updateProgress = () => {
      const pct = Math.round((completed / total) * 100);
      if (progressFill) progressFill.style.width = pct + '%';
      if (progressBar) {
        progressBar.setAttribute('aria-valuenow', pct);
        progressBar.setAttribute('aria-label', `Progreso: ${pct}%`);
      }
    };

    const markComplete = (block) => {
      if (block.dataset.complete === '1') return;
      block.dataset.complete = '1';
      completed++;
      updateProgress();
      document.dispatchEvent(new CustomEvent('rise:block', { detail: { block: Number(block.dataset.riseBlock), total } }));
      if (completed === total) {
        document.dispatchEvent(new CustomEvent('rise:complete', { detail: { total } }));
      }
    };

    if (hasGSAP && typeof ScrollTrigger !== 'undefined') {
      blocks.forEach(block => {
        ScrollTrigger.create({
          trigger: block,
          start: 'top 85%',
          onEnter: () => markComplete(block),
        });
      });
      gsap.ticker.add(() => {}); // keep ScrollTrigger active
    } else {
      // Fallback sin GSAP: todos completos
      blocks.forEach(markComplete);
    }

    /* La comprobación del bloque la monta la PÁGINA con CIDE.quiz(mount, config): la pregunta es
       contenido de la diseñadora, no de la librería. Acá había un quiz de demo con una pregunta
       sobre el propio design system, y como quiz() arranca con mount.innerHTML=…, le pisaba la
       pregunta a quien montaba la suya. */
  }

  /* ---- P05 hotspots-modal — puntos calientes que abren un modal ---- */
  function initHotspots(root=document) {
    let overlay = $('#cide-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cide-modal';
      overlay.innerHTML = `<div class="card" role="dialog" aria-modal="true">
        <h3 id="cm-title"></h3><p class="muted" id="cm-text"></p>
        <button class="btn primary" style="margin-top:14px">Cerrar</button></div>`;
      Object.assign(overlay.style, {position:'fixed', inset:0, display:'none',
        alignItems:'center', justifyContent:'center', background:'rgba(24,29,21,.82)',
        zIndex:'var(--z-overlay, 300)'});
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay || e.target.textContent === 'Cerrar') hide(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
    }
    const show = h => {
      $('#cm-title', overlay).textContent = h.dataset.title || '';
      $('#cm-text', overlay).textContent = h.dataset.text || '';
      overlay.style.display = 'flex';
    };
    const hide = () => overlay.style.display = 'none';
    $$('.hotspot', root).forEach(h => h.addEventListener('click', () => show(h)));
  }


  /* ---- P28 crucigrama — grilla con celdas numeradas, pistas y Comprobar ----
     Markup canónico (components/P28-crucigrama.html):
       [data-cw]                      contenedor
       .cw-grid[style*=--cw-cols]     la grilla (columnas por CSS var)
       .cw-cell / .cw-cell.is-black   celda / celda vacía
       .cw-num                        número de casillero
       .cw-input[data-letra][data-words]  letra correcta y palabra(s) a las que
                                          pertenece (una celda de cruce tiene dos)
       .cw-clue[data-word]            pista que resalta su palabra
       [data-cw-check] / [data-cw-clear]
     Al completar todo bien: marca .cw-done, muestra `.cierre-actividad` del contenedor
     y dispara 'cide:crucigrama' (bubbles) para el progreso de la unidad.            */
  function initCrucigrama(root=document) {
    $$('[data-cw]', root).forEach(cw => {
      if (cw.dataset.cwInit) return;
      cw.dataset.cwInit = '1';

      const cont = cw.closest('.card') || cw.parentElement;
      const inputs = $$('.cw-input', cw);
      const pistas = $$('.cw-clue', cw);
      const fb = $('.feedback', cont);
      const check = $('[data-cw-check]', cont) || $('[data-cw-check]', cw);
      const clear = $('[data-cw-clear]', cont) || $('[data-cw-clear]', cw);
      // El cierre se busca PRIMERO en el alcance propio (cont) y recién después en el
      // contenedor padre. Al revés (padre primero) el alcance ancho ganaba: con dos
      // actividades que tienen cierre dentro del MISMO padre, el crucigrama mostraba el
      // cierre de la OTRA actividad (medido en Chrome headless).
      const cierre = $('.cierre-actividad', cont) || $('.cierre-actividad', cont.parentElement);
      // El cierre de la actividad se muestra con la clase .show (convención de las
      // unidades) Y con `hidden` apagado: sólo `hidden` no alcanza cuando la hoja
      // tiene .cierre-actividad{display:none} y lo abre .show.
      const mostrarCierre = (v) => {
        if (!cierre) return;
        cierre.classList.toggle('show', v);
        cierre.hidden = !v;
      };
      mostrarCierre(false);

      // Una celda de cruce pertenece a DOS palabras: data-words = 'h3 v7'.
      const dePalabra = (id) => inputs.filter(i =>
        (i.dataset.words || '').split(' ').indexOf(id) > -1);

      function marcar(id) {
        inputs.forEach(i => i.closest('.cw-cell').classList.toggle('sel',
          (i.dataset.words || '').split(' ').indexOf(id) > -1));
        pistas.forEach(p => p.classList.toggle('on', p.dataset.word === id));
      }

      function foco(actual, paso) {
        const grupo = dePalabra(actual.dataset.words.split(' ')[0]) || [];
        const i = grupo.indexOf(actual);
        const sig = grupo[i + paso];
        if (sig) { sig.focus(); sig.select(); }
      }

      inputs.forEach(inp => {
        inp.addEventListener('focus', () => marcar(inp.dataset.words.split(' ')[0]));
        inp.addEventListener('input', () => {
          inp.value = inp.value.replace(/[^a-zA-ZÁÉÍÓÚÑáéíóúñ]/g, '').slice(-1).toUpperCase();
          inp.classList.remove('ok', 'bad');
          inp.closest('.cw-cell').classList.remove('ok', 'bad');
          if (inp.value) foco(inp, +1);
        });
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !inp.value) { e.preventDefault(); foco(inp, -1); }
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); foco(inp, +1); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); foco(inp, -1); }
        });
        inp.addEventListener('click', () => marcar(inp.dataset.words.split(' ')[0]));
      });

      pistas.forEach(p => p.addEventListener('click', () => {
        // la pista apunta a UNA palabra: data-word="h3" (si viniera data-words, se toma la 1ª)
        const objetivo = p.dataset.word || (p.dataset.words || '').split(' ')[0];
        const grupo = dePalabra(objetivo);
        const vacio = grupo.filter(i => !i.value)[0] || grupo[0];
        if (vacio) { vacio.focus(); vacio.select(); marcar(objetivo); }
      }));

      if (check) check.addEventListener('click', () => {
        let bien = 0;
        inputs.forEach(inp => {
          const ok = (inp.value || '').toUpperCase() === (inp.dataset.letra || '');
          inp.classList.toggle('ok', ok);
          inp.classList.toggle('bad', !ok && !!inp.value);
          inp.closest('.cw-cell').classList.toggle('ok', ok);
          inp.closest('.cw-cell').classList.toggle('bad', !ok && !!inp.value);
          if (ok) bien++;
        });
        const total = inputs.length;
        if (fb) {
          fb.className = 'feedback ' + (bien === total ? 'ok' : 'no');
          fb.textContent = bien === total
            ? '¡Muy bien! ' + total + ' de ' + total + ' letras correctas.'
            : 'Vas ' + bien + ' de ' + total + ' letras. Revisá las que quedaron en rojo.';
        }
        if (bien === total) {
          cw.classList.add('cw-done');
          mostrarCierre(true);
          cw.dispatchEvent(new CustomEvent('cide:crucigrama', { detail: { total }, bubbles: true }));
        }
      });

      if (clear) clear.addEventListener('click', () => {
        inputs.forEach(i => {
          i.value = '';
          i.classList.remove('ok', 'bad');
          i.closest('.cw-cell').classList.remove('ok', 'bad', 'sel');
        });
        pistas.forEach(p => p.classList.remove('on'));
        if (fb) { fb.className = 'feedback'; fb.textContent = ''; }
        mostrarCierre(false);
        cw.classList.remove('cw-done');
        if (inputs[0]) inputs[0].focus();
      });
    });
  }

  /* ---- P09 quiz-mcq — config: [{prompt, options:[{text, ok, msg}]}] ---- */
  function quiz(mount, config, onDone) {
    let answered = 0;
    const total = config.length;
    mount.innerHTML = config.map((q, qi) => `
      <div class="q" data-q="${qi}">
        <p class="prompt"><strong>${qi+1}. ${q.prompt}</strong></p>
        ${q.options.map((o, oi) =>
          `<button class="btn opt" data-ok="${o.ok?1:0}" data-msg="${o.msg.replace(/"/g,'&quot;')}">${o.text}</button>`).join('')}
        <div class="feedback"></div>
      </div>`).join('') + `<div class="score card" style="display:none"></div>`;
    $$('.q', mount).forEach(q => {
      $$('.opt', q).forEach(btn => btn.addEventListener('click', () => {
        if (q.dataset.done) return;
        q.dataset.done = '1';
        const ok = btn.dataset.ok === '1';
        /* El CSS de todo el repo estiliza `.correct`/`.wrong` —incluido el que genera el propio
           design system—, pero quiz() marcaba `selected`/`disabled`, que no estiliza nadie: la
           opción respondida quedaba sin ningún cambio visible. Se agregan las dos clases;
           `selected` se mantiene porque el puntaje de más abajo cuenta esa clase. */
        btn.classList.add(ok ? 'correct' : 'wrong');
        btn.classList.add(ok ? 'selected' : 'disabled');
        if (!ok) {
          const b = $('.opt[data-ok="1"]', q);
          b.classList.add('selected');
          b.classList.add('correct');
        }
        const fb = $('.feedback', q);
        fb.textContent = btn.dataset.msg;
        fb.className = 'feedback ' + (ok ? 'ok' : 'no');
        if (++answered === total && onDone) {
          const score = $$('.q .opt.selected[data-ok="1"]').length;
          onDone(score, total, $('.score', mount));
        }
      }));
    });
  }

  /* Inicializa todo el comportamiento del design system en el documento */
  function init(root=document) {
    noMotion();
    initTabs(root);
    initAccordions(root);
    initCarousels(root);
    initFlips(root);
    initFlippingbook(root);
    initHotspots(root);
    initRiseScroll(root);
    initNav(root);
    initHamburger(root);
    initTimeline(root);
    initCards(root);
    initLayers(root);
    initMcq(root);
    initWordsearch(root);
    initCrucigrama(root);
    $$('[data-preset] [role="button"]').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  }

  /* ---- NAV (HUD) · botones .navtab que hacen scroll a #nav-* ---- */
  function initNav(root=document) {
    $$('.navtab', root).forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.target || b.getAttribute('data-target');
      const t = id ? document.getElementById(id) : null;
      if (t && t.scrollIntoView) {
        try { t.scrollIntoView({behavior:'smooth', block:'start'}); } catch(e) { t.scrollIntoView(); }
      }
      $$('.navtab', root).forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    }));
  }

  /* ---- HAMBURGER P19 ---- */
  function initHamburger(root=document) {
    const hamb = $('.hamb', root) || document.querySelector('.hamb');
    const menu = document.getElementById('mnu');
    const backdrop = document.getElementById('mb');
    if (!hamb || !menu) return;
    const toggle = () => { menu.classList.toggle('open'); if (backdrop) backdrop.classList.toggle('show'); };
    hamb.addEventListener('click', toggle);
    if (backdrop) backdrop.addEventListener('click', toggle);
    $$('.menu a', root).forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.dataset.target || a.getAttribute('href')?.slice(1);
      const t = id ? document.getElementById(id) : null;
      if (t && t.scrollIntoView) { try { t.scrollIntoView({behavior:'smooth', block:'start'}); } catch(_){ t.scrollIntoView(); } }
      if (menu.classList.contains('open')) toggle();
      $$('.menu a', root).forEach(x => x.classList.remove('on'));
      a.classList.add('on');
    }));
  }

  /* ---- TIMELINE P06 interactivo: click revela ---- */
  function initTimeline(root=document) {
    $$('.tl-card', root).forEach(card => {
      const body = card.querySelector('.tl-body');
      if (!body) return;
      card.addEventListener('click', () => {
        const open = card.classList.toggle('open');
        card.setAttribute('aria-expanded', open ? 'true' : 'false');
        body.style.maxHeight = open ? body.scrollHeight + 'px' : null;
      });
      card.addEventListener('keydown', (e) => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); card.click(); }});
    });
  }

  /* ---- CARDS P07 clicables: centra + highlight coherente con CTA ---- */
  function initCards(root=document) {
    $$('.c-card', root).forEach(card => {
      card.style.cursor = 'pointer';
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      const activate = () => {
        $$('.c-card', root).forEach(x => x.classList.remove('active'));
        card.classList.add('active');
        card.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
      };
      card.addEventListener('click', activate);
      card.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); activate(); }});
    });
  }

  /* ---- CAPAS (P04) · markup canónico:
       <div class="layers">
         <button class="layer-btn" data-l="1">…</button>
         <div class="layer" data-layer="1">…</div>
       </div>
       Un grupo = un .layers (igual que .tabs agrupa sus botones y sus paneles): con dos
       grupos en la misma página, el clic de uno no cierra el otro. La guarda
       data-layersInit evita handlers duplicados si el bloque se inicializa dos veces. */
  function initLayers(root=document) {
    $$('.layers', root).forEach(group => {
      if (group.dataset.layersInit) return;
      group.dataset.layersInit = '1';
      const btns = $$('.layer-btn', group), layers = $$('.layer', group);
      btns.forEach(btn => btn.addEventListener('click', () => {
        const on = btn.classList.contains('on');
        btns.forEach(x => x.classList.remove('on'));
        layers.forEach(x => x.classList.remove('show'));
        if (on) return;
        btn.classList.add('on');
        const panel = $(`.layer[data-layer="${btn.dataset.l}"]`, group);
        if (panel) panel.classList.add('show');
      }));
    });
  }

  /* ---- PREGUNTA DE MARKUP (P09) · markup canónico:
       <div class="q">
         <button class="q-opt" data-ok="1" data-msg="Retroalimentación literal">…</button>
         <div class="feedback"></div>
       </div>
       Es el mismo contenedor .q y los mismos data-ok/data-msg que usa quiz(): la diferencia
       es que acá la pregunta y las opciones las escribe la diseñadora en el markup, en vez
       de venir de una config. Cada .q se cablea dentro de sí misma. */
  function initMcq(root=document) {
    $$('.q', root).forEach(q => {
      const opts = $$('.q-opt', q);
      if (!opts.length) return;               // no es una pregunta de markup estático
      if (q.dataset.mcqInit) return;
      q.dataset.mcqInit = '1';
      opts.forEach(o => o.addEventListener('click', () => {
        opts.forEach(x => { x.disabled = true; x.style.cursor = 'default'; });
        const ok = o.dataset.ok === '1';
        o.classList.add(ok ? 'correct' : 'wrong');
        const fb = $('.feedback', q);
        if (fb) { fb.textContent = o.dataset.msg || ''; fb.className = 'feedback ' + (ok ? 'ok' : 'no'); }
      }));
    });
  }

  /* ---- P24 Wordsearch: sopa de letras ---- */
  function initWordsearch(root=document) {
    $$('.wordsearch-grid', root).forEach(grid => {
      if (grid.dataset.initialized) return;
      grid.dataset.initialized = '1';
      
      const wordsAttr = grid.dataset.words;
      const defaultWords = ['EJEMPLO','PALABRA','SISTEMA','DISENO','CURSO'];
      const WORDS = wordsAttr ? wordsAttr.split(',').map(w => w.trim().toUpperCase()) : defaultWords;
      const GRID_SIZE = grid.dataset.size ? parseInt(grid.dataset.size) : Math.max(10, Math.max(...WORDS.map(w => w.length)) + 2);
      
      const DIRECTIONS = {
        'horizontal': [0, 1],
        'vertical': [1, 0],
        'diagonal-down-right': [1, 1],
        'diagonal-down-left': [1, -1]
      };
      
      let gridData = [];
      let foundCells = new Set();
      let foundWords = new Set();
      let wordPositions = {};
      
      function initGrid() {
        gridData = Array.from({length: GRID_SIZE}, () => Array(GRID_SIZE).fill('_'));
        wordPositions = {};
        foundCells.clear();
        foundWords.clear();
        const dirKeys = Object.keys(DIRECTIONS);
        
        WORDS.forEach(word => {
          let placed = false;
          let attempts = 0;
          while (!placed && attempts < 500) {
            attempts++;
            const dir = dirKeys[Math.floor(Math.random() * dirKeys.length)];
            const [dr, dc] = DIRECTIONS[dir];
            const len = word.length;
            let row, col;
            
            if (dr === 0) {
              row = Math.floor(Math.random() * GRID_SIZE);
              col = Math.floor(Math.random() * (GRID_SIZE - len));
            } else if (dc === 0) {
              row = Math.floor(Math.random() * (GRID_SIZE - len));
              col = Math.floor(Math.random() * GRID_SIZE);
            } else {
              row = Math.floor(Math.random() * (GRID_SIZE - len));
              col = dc > 0 ? Math.floor(Math.random() * (GRID_SIZE - len)) : Math.floor(Math.random() * (GRID_SIZE - len)) + len - 1;
            }
            
            let canPlace = true;
            const positions = [];
            for (let k = 0; k < len; k++) {
              const r = row + dr * k;
              const c = col + dc * k;
              if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) { canPlace = false; break; }
              if (gridData[r][c] !== '_' && gridData[r][c] !== word[k]) { canPlace = false; break; }
              positions.push({r, c});
            }
            
            if (canPlace) {
              positions.forEach((p, k) => { gridData[p.r][p.c] = word[k]; });
              wordPositions[word] = positions;
              placed = true;
            }
          }
        });
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < GRID_SIZE; i++)
          for (let j = 0; j < GRID_SIZE; j++)
            if (gridData[i][j] === '_') gridData[i][j] = letters[Math.floor(Math.random() * 26)];
      }
      
      function renderGrid() {
        grid.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
        grid.innerHTML = '';
        for (let i = 0; i < GRID_SIZE; i++) {
          for (let j = 0; j < GRID_SIZE; j++) {
            const cell = document.createElement('div');
            cell.className = 'wordsearch-cell' + (foundCells.has(i + '-' + j) ? ' found' : '');
            cell.textContent = gridData[i][j];
            cell.dataset.r = i;
            cell.dataset.c = j;
            cell.addEventListener('click', () => toggleCell(i, j));
            grid.appendChild(cell);
          }
        }
      }
      
      function toggleCell(r, c) {
        const idx = r + '-' + c;
        if (foundCells.has(idx)) foundCells.delete(idx);
        else foundCells.add(idx);
        renderGrid();
        updateFoundWords();
      }
      
      function updateFoundWords() {
        foundWords.clear();
        Object.entries(wordPositions).forEach(([word, positions]) => {
          if (positions.every(p => foundCells.has(p.r + '-' + p.c))) {
            foundWords.add(word);
          }
        });
        renderWordsList();
      }
      
      function renderWordsList() {
        const list = grid.parentElement.querySelector('.wordsearch-words');
        if (!list) return;
        list.innerHTML = '';
        WORDS.forEach(w => {
          const chip = document.createElement('span');
          chip.className = 'wordsearch-chip' + (foundWords.has(w) ? ' found' : '');
          chip.textContent = w;
          list.appendChild(chip);
        });
        const countEl = grid.parentElement.querySelector('#found-count');
        const totalEl = grid.parentElement.querySelector('#total-words');
        if (countEl) countEl.textContent = foundWords.size;
        if (totalEl) totalEl.textContent = WORDS.length;
      }
      
      function showSolution() {
        foundCells.clear();
        Object.values(wordPositions).forEach(positions => {
          positions.forEach(p => foundCells.add(p.r + '-' + p.c));
        });
        renderGrid();
        updateFoundWords();
      }
      
      const resetBtn = grid.parentElement.querySelector('#reset-btn');
      const solutionBtn = grid.parentElement.querySelector('#solution-btn');
      if (resetBtn) resetBtn.addEventListener('click', () => { initGrid(); renderGrid(); renderWordsList(); });
      if (solutionBtn) solutionBtn.addEventListener('click', showSolution);
      
      initGrid();
      renderGrid();
      renderWordsList();
    });
  }

  return { $, $$, init, initTabs, initAccordions, initCarousels, initFlips, initFlippingbook,
           initHotspots, initRiseScroll, initNav, initHamburger, initTimeline, initCards, initLayers, initMcq,
           initWordsearch, initCrucigrama, quiz, animate, hasGSAP };
})();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CIDE.init());
} else {
  CIDE.init();
}