/* Tesouraria — Parauapebas
   Lê TREASURY_DATA/ENTS (inline no build local ou dados/tesouraria.js no online). */
(function () {
  "use strict";

  const DATA = (typeof TREASURY_DATA !== "undefined") ? TREASURY_DATA : (window.TREASURY_DATA || {});
  const ENTIDADES = (typeof ENTS !== "undefined") ? ENTS : (window.TESOURARIA_ENTS || []);

  let sel = ENTIDADES.length ? ENTIDADES[0].slug : null;
  let filtro = "";
  let piso = Number(DATA.piso) || 0;
  let sortCred = { k: "liquidado", dir: -1 };
  let credLimite = 100;
  let empLimite = 100;
  const EMPCACHE = {};
  const ANUL = DATA.anulacoes || null;
  const ANULCACHE = {};
  let anulTipo = "todos";
  let anulPiso = 0;
  let anulUg = "todos";
  let anulLimite = 50;

  const $ = (id) => document.getElementById(id);
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function brl(v) {
    if (v == null) return "—";
    const a = Math.abs(v);
    if (a >= 1e9) return "R$ " + (v / 1e9).toFixed(2) + " bi";
    if (a >= 1e6) return "R$ " + (v / 1e6).toFixed(1) + " mi";
    if (a >= 1e3) return "R$ " + (v / 1e3).toFixed(1) + " mil";
    return "R$ " + v.toFixed(2);
  }

  function int(v) { return v == null ? "—" : v.toLocaleString("pt-BR"); }
  function dias(v) { return v == null ? "—" : v.toFixed(1) + " d"; }
  function pct(v) { return v == null ? "—" : v.toFixed(1) + "%"; }
  function sinal(v) { return v == null ? "" : (v >= 0 ? "pos" : "neg"); }
  function fmtGerado(s) {
    const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : String(s || "—").replace("T", " ");
  }
  function ent() { return DATA.entidades ? DATA.entidades[sel] : null; }

  function fmtData(iso) {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || "—");
  }

  function anulEnt() {
    return (ANUL && ANUL.por_entidade) ? (ANUL.por_entidade[sel] || null) : null;
  }

  function anulEventos() {
    if (!ANULCACHE[sel]) {
      const a = anulEnt();
      const E = a && a.eventos;
      if (!E || !E.cols) {
        ANULCACHE[sel] = [];
      } else {
        ANULCACHE[sel] = E.rows.map((r) => {
          const o = {};
          E.cols.forEach((c, i) => { o[c] = r[i]; });
          return o;
        });
      }
    }
    return ANULCACHE[sel];
  }

  function popularAnulUg() {
    const s = $("f-anul-ug");
    if (!s) return;
    const ugs = [...new Set(anulEventos().map((e) => e.ug).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    if (!ugs.includes(anulUg)) anulUg = "todos";
    s.innerHTML = '<option value="todos">Todas</option>' +
      ugs.map((u) => `<option value="${esc(u)}">${esc(u)}</option>`).join("");
    s.value = anulUg;
  }

  function casa(c) {
    if (!filtro) return true;
    const f = norm(filtro);
    return norm(c.credor).includes(f) || norm(c.cnpj).includes(f);
  }

  /* ------------------------------------------------------------------ tema */
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function prefAtual() {
    return document.documentElement.dataset.themePref || "system";
  }

  function aplicarTema(pref, persistir) {
    const p = ["light", "dark", "system"].includes(pref) ? pref : "system";
    const escuro = p === "dark" || (p === "system" && media && media.matches);
    document.documentElement.dataset.theme = escuro ? "dark" : "light";
    document.documentElement.dataset.themePref = p;
    document.querySelectorAll(".tema button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.pref === p));
    });
    if (persistir) {
      try { localStorage.setItem("tesouraria-tema", p); } catch (e) {}
    }
  }

  function initTema() {
    document.querySelectorAll(".tema button").forEach((b) => {
      b.onclick = () => aplicarTema(b.dataset.pref, true);
    });
    if (media && media.addEventListener) {
      media.addEventListener("change", () => {
        if (prefAtual() === "system") aplicarTema("system", false);
      });
    }
    aplicarTema(prefAtual(), false);
  }

  /* --------------------------------------------------------------- filtros */
  function initFiltros() {
    const s = $("f-ent");
    s.innerHTML = ENTIDADES.map((e) => `<option value="${e.slug}">${esc(e.nome)}</option>`).join("");
    s.value = sel;
    s.onchange = () => {
      sel = s.value; credLimite = 100; empLimite = 100; anulLimite = 50;
      anulUg = "todos"; popularAnulUg();
      render();
      const pa = $("painel-anulacoes");
      if (pa && !pa.hidden) renderAnulacoes();
    };

    const base = Number(DATA.piso) || 0;
    const opcoes = [...new Set([base, 50000, 100000, 250000].filter((v) => v >= base && v > 0))].sort((a, b) => a - b);
    if (!opcoes.length) opcoes.push(base);
    const sp = $("f-piso");
    sp.innerHTML = opcoes.map((v) => `<option value="${v}">${v ? brl(v) : "Todos"}</option>`).join("");
    sp.value = String(piso);
    sp.onchange = () => { piso = Number(sp.value) || 0; credLimite = 100; render(); };

    $("f-credor").oninput = (e) => {
      filtro = e.target.value; credLimite = 100; empLimite = 100; anulLimite = 50;
      render();
      const pa = $("painel-anulacoes");
      if (pa && !pa.hidden) renderAnulacoes();
    };

    const p = DATA.periodo || {};
    const ate = DATA.dados_ate ? ` · dados até ${DATA.dados_ate}` : "";
    const gerado = fmtGerado(DATA.gerado_em);
    $("hdrsub").textContent = `${p.inicio || "—"} a ${p.fim || "—"}${ate} · gerado em ${gerado}`;
    $("rodape").textContent = "Fonte: Portal da Transparência de Parauapebas (governotransparente.com.br) — empenho, liquidação, pagamento e receita arrecadada. Caixa = fluxo (receita − pagamentos do período).";

    const pub = DATA.publico || {};
    const partes = [];
    if (pub.piso) partes.push(`credores com liquidado ou empenhado ≥ ${brl(pub.piso)}`);
    if (pub.top_empenhos) partes.push(`top ${int(pub.top_empenhos)} empenhos por entidade`);
    if (pub.credores_total) partes.push(`${int(pub.credores_total)} credores e ${int(pub.empenhos_total)} empenhos na base`);
    if ($("sobre-periodo")) $("sobre-periodo").textContent = `${p.inicio || "—"} a ${p.fim || "—"}`;
    if ($("sobre-ate")) $("sobre-ate").textContent = DATA.dados_ate || "—";
    if ($("sobre-gerado")) $("sobre-gerado").textContent = gerado;
    if ($("sobre-publico")) {
      $("sobre-publico").textContent = pub.top_empenhos
        ? `Recorte público: ${partes.join(" · ")}.`
        : "Build local com a base completa de credores e empenhos.";
    }
  }

  /* ------------------------------------------------------------------ KPIs */
  function renderKPIs() {
    if (!ent()) return;
    const k = ent().kpis;
    const cards = [
      ["Empenhado", brl(k.empenhado), "", ""],
      ["Liquidado", brl(k.liquidado), "", ""],
      ["Pago", brl(k.pago), "% executado do empenho: " + pct(k.pct_exec_empenho), ""],
      ["Em aberto (RPP)", brl(k.em_aberto), "liquidado − pago", "neg"],
      ["Não liquidado", brl(k.nao_liquidado), "empenhado − liquidado", "muted"],
      ["Receita arrecadada", brl(k.receita), k.tem_receita ? "" : "sem receita própria", ""],
      ["Caixa (fluxo)", brl(k.caixa), k.tem_receita ? "receita − pagamentos" : "indisponível", sinal(k.caixa)],
    ];
    $("kpis").innerHTML = cards.map(([l, v, d, cls]) =>
      `<div class="card kpi"><div class="lbl">${l}</div><div class="val ${cls}">${v}</div><div class="det">${d}</div></div>`
    ).join("");
    const c = (DATA.consolidado && DATA.consolidado.kpis) || {};
    $("kpisnota").innerHTML = `Total 3 entidades — Empenhado <b>${brl(c.empenhado)}</b> · Liquidado <b>${brl(c.liquidado)}</b> · Pago <b>${brl(c.pago)}</b> · Receita <b>${brl(c.receita)}</b> · Caixa <b>${brl(c.caixa)}</b>.` +
      (sel === "saaep" ? " A SAAEP opera com subsídio da Prefeitura (ver fonte de recurso)." : "");
  }

  /* --------------------------------------------------------------- gráficos */
  function bars(list, keys, colors) {
    const m = list.length;
    if (!m) return "<div class='muted'>sem dados</div>";
    const W = 920, H = 250, PL = 54, PR = 12, PT = 16, PB = 34;
    const vals = list.flatMap((l) => keys.map((k) => l[k])).filter((v) => v != null);
    const max = Math.max(1, ...vals);
    const bw = (W - PL - PR) / m, group = bw * 0.72, each = group / keys.length;
    const y = (v) => H - PB - (v / max) * (H - PT - PB);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">`;
    for (let g = 0; g <= 4; g++) {
      const v = max * g / 4, yy = y(v);
      s += `<line x1="${PL}" x2="${W - PR}" y1="${yy}" y2="${yy}" stroke="var(--axis)"/>`;
      s += `<text x="${PL - 6}" y="${yy + 3}" font-size="12" fill="var(--axis-tx)" text-anchor="end">${brl(v)}</text>`;
    }
    list.forEach((l, i) => {
      const x0 = PL + i * bw + (bw - group) / 2;
      keys.forEach((k, j) => {
        const v = l[k];
        if (v == null) return;
        const xx = x0 + j * each, hh = (H - PB) - y(v);
        s += `<rect x="${xx}" y="${y(v)}" width="${each - 1.5}" height="${hh}" fill="${colors[j]}" rx="1.5"><title>${l.mes} ${k}: ${brl(v)}</title></rect>`;
      });
      s += `<text x="${PL + i * bw + bw / 2}" y="${H - PB + 15}" font-size="12" fill="var(--mut)" text-anchor="middle">${(l.mes || "").slice(5)}/${(l.mes || "").slice(2, 4)}</text>`;
    });
    s += "</svg>";
    return s;
  }

  function linhaCaixa(list) {
    const m = list.length;
    if (!m) return "<div class='muted'>sem dados</div>";
    const comCaixa = list.filter((l) => l.caixa != null);
    if (!comCaixa.length) return "<div class='muted'>caixa indisponível (entidade sem receita)</div>";
    const W = 920, H = 210, PL = 54, PR = 12, PT = 14, PB = 30;
    const vals = list.map((l) => l.caixa || 0);
    const max = Math.max(1, ...vals), min = Math.min(0, ...vals);
    const y = (v) => H - PB - ((v - min) / (max - min || 1)) * (H - PT - PB);
    const bw = (W - PL - PR) / m, zero = y(0);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">`;
    s += `<line x1="${PL}" x2="${W - PR}" y1="${zero}" y2="${zero}" stroke="var(--zero)"/>`;
    s += `<text x="${PL - 6}" y="${zero + 3}" font-size="12" fill="var(--axis-tx)" text-anchor="end">R$ 0</text>`;
    const pts = [];
    list.forEach((l, i) => {
      if (l.caixa == null) return;
      const x = PL + i * bw + bw / 2, yy = y(l.caixa);
      pts.push(x + "," + yy);
      const top = Math.min(yy, zero), hh = Math.abs(yy - zero);
      s += `<rect x="${x - bw * 0.28}" y="${top}" width="${bw * 0.56}" height="${hh}" fill="${l.caixa >= 0 ? "var(--green)" : "var(--red)"}" rx="1.5"><title>${l.mes}: ${brl(l.caixa)}</title></rect>`;
      s += `<text x="${x}" y="${H - PB + 15}" font-size="12" fill="var(--mut)" text-anchor="middle">${(l.mes || "").slice(5)}/${(l.mes || "").slice(2, 4)}</text>`;
    });
    s += `<polyline points="${pts.join(" ")}" fill="none" stroke="var(--line-pt)" stroke-width="1.6"/>`;
    s += "</svg>";
    return s;
  }

  /* --------------------------------------------------------------- rankings */
  function rankTabela(arr, valFn) {
    if (!arr.length) return "<div class='muted'>—</div>";
    return `<table><tbody>${arr.map((c) =>
      `<tr><td>${esc((c.credor || "").slice(0, 42))}</td><td class="num">${valFn(c)}</td></tr>`
    ).join("")}</tbody></table>`;
  }

  function renderRankings() {
    if (!ent()) return;
    const base = ent().credores.filter((c) => (c.liquidado || 0) >= piso && casa(c));
    const comPrazo = base.filter((c) => c.prazo_medio_dias != null);
    const porPrazo = [...comPrazo].sort((a, b) => a.prazo_medio_dias - b.prazo_medio_dias);
    const porPct = [...base].sort((a, b) => b.pct_pago_liq - a.pct_pago_liq);
    const porAberto = [...base].sort((a, b) => a.em_aberto - b.em_aberto);
    const N = 12;
    const bloco = (titulo, lista, valFn, qDoc, pDoc) => `<div class="card rank">
      <h3>${titulo}</h3><div class="two">
        <div class="q"><h4>${qDoc}</h4>${rankTabela(lista.slice(0, N), valFn)}</div>
        <div class="p"><h4>${pDoc}</h4>${rankTabela(lista.slice(-N).reverse(), valFn)}</div>
      </div></div>`;
    $("rankings").innerHTML =
      bloco("Prazo de pagamento (liq→pag)", porPrazo, (c) => dias(c.prazo_medio_dias), "Menor prazo", "Maior prazo") +
      bloco("% pago do liquidado", porPct, (c) => pct(c.pct_pago_liq), "Maior % pago", "Menor % pago") +
      bloco("Valor em aberto (liquidado − pago)", porAberto, (c) => brl(c.em_aberto), "Menor em aberto", "Maior em aberto");
  }

  /* --------------------------------------------------------------- credores */
  function renderCredores() {
    if (!ent()) return;
    const list = ent().credores.filter((c) => (c.liquidado || 0) >= piso && casa(c));
    list.sort((a, b) => {
      const A = a[sortCred.k] ?? 0, B = b[sortCred.k] ?? 0;
      return (A > B ? 1 : A < B ? -1 : 0) * sortCred.dir;
    });
    const cols = [
      ["credor", "Credor"], ["cnpj", "CNPJ/CPF"], ["empenhado", "Empenhado", 1], ["liquidado", "Liquidado", 1],
      ["pago", "Pago", 1], ["em_aberto", "Em aberto", 1], ["pct_pago_liq", "% pago/liq", 1],
      ["pct_exec_empenho", "% exec", 1], ["prazo_medio_dias", "Prazo médio", 1], ["n_empenhos", "Emps", 1],
    ];
    const head = cols.map(([k, t, n]) => `<th class="${n ? "num" : ""}" data-k="${k}">${t}</th>`).join("");
    const rows = list.slice(0, credLimite).map((c) => `<tr>
      <td class="cut" title="${esc(c.credor)}">${esc(c.credor)}</td><td>${esc(c.cnpj || "—")}</td>
      <td class="num">${brl(c.empenhado)}</td><td class="num">${brl(c.liquidado)}</td>
      <td class="num">${brl(c.pago)}</td><td class="num ${sinal(c.em_aberto)}">${brl(c.em_aberto)}</td>
      <td class="num">${pct(c.pct_pago_liq)}</td><td class="num">${pct(c.pct_exec_empenho)}</td>
      <td class="num">${dias(c.prazo_medio_dias)}</td><td class="num">${int(c.n_empenhos)}</td></tr>`).join("");
    $("tbl-credores").innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
    $("cred-count").textContent = `${int(list.length)} credores${filtro ? " (filtrado)" : ""} · mostrando ${int(Math.min(credLimite, list.length))}`;
    const btn = $("cred-mais");
    if (btn) btn.parentElement.style.display = list.length > credLimite ? "block" : "none";
    $("tbl-credores").querySelectorAll("th").forEach((th) => {
      th.onclick = () => {
        const k = th.dataset.k;
        sortCred = (sortCred.k === k) ? { k, dir: -sortCred.dir } : { k, dir: (k === "credor" ? 1 : -1) };
        renderCredores();
      };
    });
  }

  /* --------------------------------------------------------------- empenhos */
  function empenhosEnt() {
    if (!EMPCACHE[sel]) {
      const E = ent().empenhos;
      EMPCACHE[sel] = E.rows.map((r) => {
        const o = {};
        E.cols.forEach((c, i) => { o[c] = r[i]; });
        return o;
      });
    }
    return EMPCACHE[sel];
  }

  function renderEmpenhos() {
    if (!ent()) return;
    const list = empenhosEnt().filter(casa);
    list.sort((a, b) => b.empenhado - a.empenhado);
    const rows = list.slice(0, empLimite).map((e) => `<tr>
      <td>${esc(e.empenho)}</td><td>${esc(e.mes || "—")}</td><td class="cut" title="${esc(e.credor)}">${esc(e.credor)}</td>
      <td class="cut" title="${esc(e.ug || "")}">${esc(e.ug || "—")}</td>
      <td class="num">${brl(e.empenhado)}</td><td class="num">${brl(e.liquidado)}</td>
      <td class="num">${brl(e.pago)}</td><td class="num">${brl(e.a_pagar)}</td>
      <td class="num">${pct(e.pct_exec)}</td></tr>`).join("");
    $("tbl-empenhos").innerHTML = `<table><thead><tr>
      <th>Empenho</th><th>Mês</th><th>Credor</th><th>Unidade gestora</th>
      <th class="num">Empenhado</th><th class="num">Liquidado</th><th class="num">Pago</th>
      <th class="num">A pagar</th><th class="num">% exec</th></tr></thead><tbody>${rows}</tbody></table>`;
    $("emp-count").textContent = `${int(list.length)} empenhos${filtro ? " (filtrado)" : ""} · mostrando ${int(Math.min(empLimite, list.length))}`;
    const btn = $("emp-mais");
    if (btn) btn.parentElement.style.display = list.length > empLimite ? "block" : "none";
  }

  /* ------------------------------------------------------------- anulações */
  function renderAnulacoes() {
    if (!$("anul-kpis")) return;
    const a = anulEnt();
    const nota = $("anul-nota");
    if (!ANUL || !a) {
      $("anul-kpis").innerHTML = "<div class='card muted'>Histórico ainda não iniciado. Ele começa na primeira execução diária com o novo motor.</div>";
      if (nota) nota.textContent = "";
      if ($("chart-anul")) $("chart-anul").innerHTML = "";
      if ($("tbl-anulacoes")) $("tbl-anulacoes").innerHTML = "";
      if ($("anul-count")) $("anul-count").textContent = "";
      const btnVazio = $("anul-mais");
      if (btnVazio) btnVazio.parentElement.style.display = "none";
      return;
    }
    const k = a.kpis || {};
    const cards = [
      ["Anulado por exclusão", brl(k.exclusoes), int(k.n_exclusoes) + " empenho(s) sumiram", "neg"],
      ["Anulação por redução", brl(k.reducoes), int(k.n_reducoes) + " empenho(s) reduzidos/anulados", ""],
      ["Total anulado", brl(k.total), "exclusão + redução", "neg"],
      ["Reaparecidos", int(k.n_reaparecimentos), "voltaram após sumir", "muted"],
    ];
    $("anul-kpis").innerHTML = cards.map(([l, v, d, cls]) =>
      `<div class="card kpi"><div class="lbl">${l}</div><div class="val ${cls}">${v}</div><div class="det">${d}</div></div>`
    ).join("");
    const fotos = ANUL.fotos || [];
    if (nota) {
      const primeira = fotos.length ? fmtData(fotos[0].data) : "—";
      const ultima = fotos.length ? fmtData(fotos[fotos.length - 1].data) : "—";
      nota.textContent = `Diário construído comparando ${int(fotos.length)} foto(s) dos empenhos (${primeira} a ${ultima}). ` +
        "Cada execução é uma fotografia; o que estava na anterior e sumiu na atual entra como exclusão.";
    }
    $("chart-anul").innerHTML = bars(a.mensal || [], ["exclusao", "reducao"], ["var(--red)", "var(--amber)"]);
    renderTabelaAnulacoes();
  }

  function tipoAnulLabel(tipo, depois) {
    if (tipo === "reducao" && (depois || 0) <= 0.005) return "Anulação total";
    return { exclusao: "Exclusão", reducao: "Redução", reaparecimento: "Reapareceu" }[tipo] || tipo;
  }

  function renderTabelaAnulacoes() {
    if (!$("tbl-anulacoes")) return;
    const a = anulEnt();
    if (!a) return;
    const f = norm(filtro);
    const list = anulEventos().filter((e) => {
      if (anulTipo !== "todos" && e.tipo !== anulTipo) return false;
      if (anulUg !== "todos" && e.ug !== anulUg) return false;
      if ((e.valor_anulado || 0) < anulPiso) return false;
      if (!f) return true;
      return norm(e.credor).includes(f) || norm(e.cnpj).includes(f) || norm(e.empenho).includes(f);
    });
    list.sort((x, y) => {
      if (x.data_foto !== y.data_foto) return x.data_foto < y.data_foto ? 1 : -1;
      return (y.valor_anulado || 0) - (x.valor_anulado || 0);
    });
    const rows = list.slice(0, anulLimite).map((e) => `<tr>
      <td>${fmtData(e.data_foto)}</td>
      <td><span class="badge ${esc(e.tipo)}">${esc(tipoAnulLabel(e.tipo, e.valor_depois))}</span></td>
      <td>${esc(e.empenho)}</td>
      <td class="cut" title="${esc(e.credor)}">${esc(e.credor)}</td>
      <td class="cut" title="${esc(e.ug || "")}">${esc(e.ug || "—")}</td>
      <td class="num">${brl(e.valor_antes)}</td>
      <td class="num neg">${brl(e.valor_anulado)}</td>
      <td class="num">${brl(e.valor_depois)}</td>
      <td class="num">${brl(e.liquidado)}</td>
      <td class="num">${brl(e.pago)}</td></tr>`).join("");
    $("tbl-anulacoes").innerHTML = `<table><thead><tr>
      <th>Foto</th><th>Tipo</th><th>Empenho</th><th>Credor</th><th>Unidade gestora</th>
      <th class="num">Valor antes</th><th class="num">Anulado</th><th class="num">Valor depois</th>
      <th class="num">Liquidado</th><th class="num">Pago</th></tr></thead><tbody>${rows}</tbody></table>`;
    $("anul-count").textContent = `${int(list.length)} evento(s)${filtro ? " (filtrado)" : ""} · mostrando ${int(Math.min(anulLimite, list.length))}`;
    const btn = $("anul-mais");
    if (btn) btn.parentElement.style.display = list.length > anulLimite ? "block" : "none";
  }

  function trocarAba(nome) {
    const geral = $("painel-geral"), anul = $("painel-anulacoes");
    if (!geral || !anul) return;
    const ehAnul = nome === "anulacoes";
    geral.hidden = ehAnul;
    anul.hidden = !ehAnul;
    const b1 = $("aba-geral"), b2 = $("aba-anulacoes");
    if (b1) b1.setAttribute("aria-selected", String(!ehAnul));
    if (b2) b2.setAttribute("aria-selected", String(ehAnul));
    if (ehAnul) renderAnulacoes();
  }

  function initAbas() {
    const b1 = $("aba-geral"), b2 = $("aba-anulacoes");
    if (b1) b1.onclick = () => trocarAba("geral");
    if (b2) b2.onclick = () => trocarAba("anulacoes");

    const tipo = $("f-anul-tipo");
    if (tipo) tipo.onchange = () => { anulTipo = tipo.value; anulLimite = 50; renderTabelaAnulacoes(); };

    const p = $("f-anul-piso");
    if (p) {
      const opcoes = [0, 10000, 50000, 100000];
      p.innerHTML = opcoes.map((v) => `<option value="${v}">${v ? brl(v) : "Todos"}</option>`).join("");
      p.value = "0";
      p.onchange = () => { anulPiso = Number(p.value) || 0; anulLimite = 50; renderTabelaAnulacoes(); };
    }

    const ug = $("f-anul-ug");
    if (ug) ug.onchange = () => { anulUg = ug.value; anulLimite = 50; renderTabelaAnulacoes(); };
    popularAnulUg();

    const btn = $("anul-mais");
    if (btn) btn.onclick = () => { anulLimite += 50; renderTabelaAnulacoes(); };
  }

  /* ------------------------------------------------------------------ render */
  function render() {
    if (!ent()) {
      $("kpis").innerHTML = "<div class='card muted'>Sem dados para exibir.</div>";
      return;
    }
    renderKPIs();
    $("chart-desp").innerHTML = bars(ent().mensal, ["receita", "pago"], ["var(--blue)", "var(--amber)"]);
    $("chart-caixa").innerHTML = linhaCaixa(ent().mensal);
    renderRankings();
    renderCredores();
    renderEmpenhos();
  }

  function initBotoes() {
    const cm = $("cred-mais");
    if (cm) cm.onclick = () => { credLimite += 100; renderCredores(); };
    const em = $("emp-mais");
    if (em) em.onclick = () => { empLimite += 100; renderEmpenhos(); };
  }

  initTema();
  initBotoes();
  if (ENTIDADES.length) {
    initFiltros();
    initAbas();
    render();
  } else {
    $("hdrsub").textContent = "Sem dados para exibir.";
  }
})();
