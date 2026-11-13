/* Интерактив: шапка, меню, анимации, каталог, заявка в Telegram */
(() => {
  const doc = document.documentElement;
  doc.classList.add("js");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- шапка: стекло при прокрутке, скрытие при скролле вниз ---------- */
  const header = document.querySelector("[data-header]");
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    if (!header) return;
    header.classList.toggle("is-scrolled", y > 24);
    const locked = document.body.classList.contains("menu-open");
    if (!locked && y > 500 && y > lastY + 6) header.classList.add("is-hidden");
    else if (y < lastY - 6 || y < 500) header.classList.remove("is-hidden");
    lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- мобильное меню ---------- */
  const burger = document.querySelector("[data-burger]");
  const menu = document.querySelector("[data-mmenu]");
  const setMenu = (open) => {
    if (!burger || !menu) return;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    document.body.classList.toggle("menu-open", open);
    header?.classList.remove("is-hidden");
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("is-open")));
    } else {
      menu.classList.remove("is-open");
      setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 450);
    }
  };
  burger?.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  menu?.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  window.matchMedia("(min-width: 1201px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  /* ---------- заголовок первого экрана: буквы появляются по очереди ---------- */
  document.querySelectorAll("[data-split]").forEach((el) => {
    const text = el.textContent;
    el.setAttribute("aria-label", text);
    el.textContent = "";
    [...text].forEach((ch, i) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--i", i);
      s.textContent = ch === " " ? " " : ch;
      el.appendChild(s);
    });
  });

  /* ---------- появление при прокрутке ---------- */
  const revealEls = document.querySelectorAll(".reveal, .reveal-img");
  if (!("IntersectionObserver" in window) || reduced) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    revealEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) setTimeout(() => el.classList.add("is-in"), 60);
      else io.observe(el);
    });
  }

  /* ---------- лёгкий параллакс ---------- */
  const px = [...document.querySelectorAll("[data-parallax]")];
  if (px.length && !reduced) {
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      px.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const k = parseFloat(el.dataset.parallax) || 0.08;
        const center = r.top + r.height / 2 - vh / 2;
        el.style.setProperty("--py", `${(-center * k).toFixed(1)}px`);
      });
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- каталог: фильтр по категориям ---------- */
  const tabs = document.querySelector("[data-tabs]");
  const grid = document.querySelector("[data-products]");
  if (tabs && grid) {
    const cards = [...grid.querySelectorAll(".product")];
    const valid = new Set([...tabs.querySelectorAll("[data-filter]")].map((b) => b.dataset.filter));
    const apply = (cat, push = true) => {
      if (!valid.has(cat)) cat = "all";
      tabs.querySelectorAll("[data-filter]").forEach((b) => {
        const on = b.dataset.filter === cat;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
        if (on) b.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced ? "auto" : "smooth" });
      });
      grid.querySelectorAll("[data-group]").forEach((g) => { g.hidden = !(cat === "all" || g.dataset.group === cat); });
      let i = 0;
      cards.forEach((c) => {
        const show = cat === "all" || c.dataset.cat === cat;
        c.classList.toggle("is-hidden", !show);
        c.classList.remove("is-entering");
        if (show) {
          c.classList.add("is-in");
          c.style.setProperty("--d", `${(i++ % 3) * 70}ms`);
          void c.offsetWidth;
          c.classList.add("is-entering");
        }
      });
      grid.querySelectorAll(".cat-group__head").forEach((h) => h.classList.add("is-in"));
      if (push) {
        const url = new URL(location.href);
        cat === "all" ? url.searchParams.delete("cat") : url.searchParams.set("cat", cat);
        url.hash = "";
        history.replaceState(null, "", url);
      }
    };
    tabs.addEventListener("click", (e) => {
      const b = e.target.closest("[data-filter]");
      if (!b) return;
      apply(b.dataset.filter);
      const top = grid.getBoundingClientRect().top + window.scrollY - 160;
      if (window.scrollY > top) window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    });
    const initial = new URLSearchParams(location.search).get("cat");
    if (initial) apply(initial, false);
  }

  /* ---------- карточка изделия и заявка (есть на всех страницах) ---------- */
  const dataEl = document.getElementById("catalog-data");
  if (!dataEl) return;
  const payload = JSON.parse(dataEl.textContent);
  const items = payload.items;
  const lockScroll = (on) => document.body.classList.toggle("modal-open", on);
  const showDialog = (d) => { if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); lockScroll(true); };
  const hideDialog = (d) => { if (d.open && typeof d.close === "function") d.close(); else d.removeAttribute("open"); };

  const modal = document.querySelector("[data-modal]");
  const order = document.querySelector("[data-order-modal]");
  const $m = (s) => modal.querySelector(s);
  const $o = (s) => order.querySelector(s);
  let current = null;
  let lastFocus = null;

  /* --- карточка изделия --- */
  const openItem = (id, updateHash = true) => {
    const it = items[id];
    if (!it || !modal) return;
    current = id;
    lastFocus = document.activeElement;
    const im = $m("[data-m-img]");
    im.src = it.imgLg;
    im.alt = it.name;
    $m("[data-m-cat]").textContent = it.cat;
    $m("[data-m-name]").textContent = it.name;
    $m("[data-m-weight]").textContent = it.weight;
    $m("[data-m-details]").textContent = it.details;
    $m("[data-m-price]").innerHTML = it.price;
    const btn = $m("[data-m-order]");
    btn.href = it.tg;
    btn.dataset.order = id;
    showDialog(modal);
    if (updateHash) history.replaceState(null, "", `${location.pathname}${location.search}#${id}`);
  };
  modal?.addEventListener("close", () => {
    if (!order?.open) { lockScroll(false); lastFocus?.focus?.({ preventScroll: true }); }
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  });
  modal?.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest("[data-close]")) hideDialog(modal);
  });

  /* --- заявка --- */
  const fields = order ? [...order.querySelectorAll("[data-o-field]")] : [];
  const val = (k) => {
    const list = fields.filter((f) => f.dataset.oField === k);
    const f = list.find((x) => x.type !== "radio" || x.checked);
    return (f?.value || "").trim();
  };
  let orderItem = null;
  let picked = [];
  const sizesBox = order?.querySelector("[data-o-sizes]");
  const sizesList = order?.querySelector("[data-o-sizes-list]");

  if (order) {
    const tsel = $o('[data-o-field="time"]');
    payload.slots.forEach((t) => tsel.add(new Option(t, t)));
    const d = new Date(); d.setDate(d.getDate() + 2);
    const pad = (n) => String(n).padStart(2, "0");
    $o('[data-o-field="date"]').min = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  const fmtDate = (v) => {
    if (!v) return "";
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });
  };

  const buildText = () => {
    const it = orderItem;
    const lines = [payload.intro, "", `Изделие: ${it.name}`];
    if (it.options && picked.length) lines.push(`${it.options.msg}: ${picked.map((c) => c.value).join(", ")}`);
    else if (it.weight && !it.preset) lines.push(`Формат: ${it.weight}`);
    if (!it.simple) lines.push(`Начинка: ${val("filling") || "посоветуйте, пожалуйста"}`);
    lines.push(`Дата: ${fmtDate(val("date")) || "уточню в переписке"}`);
    lines.push(`Время: ${val("time") || "любое"}`);
    lines.push(`Получение: ${val("get") || "Самовывоз"}`);
    if (val("get") === "Доставка") lines.push(`Улица: ${val("street") || "уточню в переписке"}`);
    if (!it.simple && val("text")) lines.push(`Надпись: «${val("text")}»`);
    if (val("comment")) lines.push(`Пожелания: ${val("comment")}`);
    if (payload.site && !it.preset) lines.push(`Ссылка: ${payload.site.replace(/\/$/, "")}/catalog.html#${current}`);
    return lines.join("\n");
  };

  const render = () => {
    if (!orderItem) return;
    $o("[data-o-street]").hidden = val("get") !== "Доставка";
    const text = buildText();
    $o("[data-o-preview]").textContent = text;
    $o("[data-o-send]").href = `${payload.tg}?text=${encodeURIComponent(text)}`;
  };

  const openOrder = (id, preset = {}) => {
    const it = items[id];
    if (!it || !order) return false;
    orderItem = it;
    current = id;
    if (!modal?.open) lastFocus = document.activeElement;
    fields.forEach((f) => { if (f.type === "radio") f.checked = f.value === "Самовывоз"; else f.value = ""; });
    const fsel = $o('[data-o-field="filling"]');
    fsel.length = 1;
    (it.fillings || payload.fillings).forEach((f) => fsel.add(new Option(f, f)));
    if (preset.filling) fsel.value = preset.filling;
    if (preset.comment) $o('[data-o-field="comment"]').value = preset.comment;
    picked = [];
    sizesList.innerHTML = "";
    const opt = it.options;
    sizesBox.hidden = !opt;
    order.querySelectorAll("[data-o-cake-only]").forEach((el) => { el.hidden = !!it.simple; });
    if (opt) {
      $o("[data-o-sizes-title]").textContent = opt.title;
      sizesList.setAttribute("role", opt.multi ? "group" : "radiogroup");
      sizesList.setAttribute("aria-label", opt.title);
      opt.choices.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.setAttribute("role", opt.multi ? "checkbox" : "radio");
        b.setAttribute("aria-checked", "false");
        b.append(document.createTextNode(c.label));
        const note = c.available ? c.price : "нет в наличии";
        if (note) { const sm = document.createElement("small"); sm.textContent = note; b.append(sm); }
        if (!c.available) b.disabled = true;
        b.addEventListener("click", () => {
          const on = picked.includes(c);
          if (opt.multi) picked = on ? picked.filter((x) => x !== c) : [...picked, c];
          else picked = on ? [] : [c];
          sizesList.querySelectorAll(".chip").forEach((o, m) => o.setAttribute("aria-checked", String(picked.includes(opt.choices[m]))));
          render();
        });
        sizesList.appendChild(b);
      });
    }
    const im = $o("[data-o-img]");
    im.hidden = !!it.preset;
    if (!it.preset) { im.src = it.img; im.alt = it.name; }
    $o("[data-o-name]").textContent = it.name;
    $o("[data-o-price]").innerHTML = it.price;
    $o("[data-o-copy-label]").textContent = "Скопировать заявку";
    $o(".order__preview").open = false;
    render();
    if (modal?.open) hideDialog(modal);
    showDialog(order);
    $o(".order__scroll").scrollTop = 0;
    return true;
  };

  order?.addEventListener("input", render);
  order?.addEventListener("change", render);
  order?.addEventListener("close", () => { lockScroll(false); lastFocus?.focus?.({ preventScroll: true }); });
  order?.addEventListener("click", (e) => {
    if (e.target === order || e.target.closest("[data-order-close]")) hideDialog(order);
  });

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0";
      order.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
      ta.remove(); return ok;
    }
  };
  order?.querySelector("[data-o-copy]").addEventListener("click", async () => {
    const ok = await copy(buildText());
    const label = $o("[data-o-copy-label]");
    label.textContent = ok ? "Скопировано ✓" : "Не удалось скопировать";
    setTimeout(() => { label.textContent = "Скопировать заявку"; }, 2200);
  });
  // при переходе тоже копируем — если Telegram не подставит текст, его можно вставить
  order?.querySelector("[data-o-send]").addEventListener("click", () => {
    copy(buildText());
    setTimeout(() => hideDialog(order), 400);
  });

  /* --- делегирование кликов --- */
  document.addEventListener("click", (e) => {
    const o = e.target.closest("[data-order]");
    if (o && items[o.dataset.order]) {
      e.preventDefault();
      if (document.body.classList.contains("menu-open")) setMenu(false);
      openOrder(o.dataset.order, { filling: o.dataset.filling, comment: o.dataset.comment });
      return;
    }
    const t = e.target.closest("[data-open]");
    if (t && items[t.dataset.open]) { e.preventDefault(); openItem(t.dataset.open); }
  });

  const fromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (items[id] && !items[id].preset && document.getElementById(id)) {
      document.getElementById(id).scrollIntoView({ block: "center" });
      openItem(id, false);
    }
  };
  window.addEventListener("hashchange", fromHash);
  fromHash();
})();
