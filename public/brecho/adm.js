/* Painel da equipe do Brechó Solidário — página separada do site público. */

const SUPABASE_URL = "https://wwdrvysclsmxsldybafu.supabase.co";
const SUPABASE_KEY = "sb_publishable_9WYUQNJKGCjXwyYKpexOfg_P_NdGbKX";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let produtos = [];
let reservas = [];
let avaliacoes = [];

const STATUS_PRODUTO = {
    available: { texto: "Disponível", cor: "#19723a", fundo: "#e6f4ea" },
    reserved: { texto: "Reservado", cor: "#a84912", fundo: "#fdeee3" },
    exchanged: { texto: "Trocado", cor: "#334155", fundo: "#e8eef5" }
};

const STATUS_RESERVA = ["Pendente", "Em análise", "Confirmada", "Vendido", "Cancelada"];

function esc(valor) {
    return String(valor === null || valor === undefined ? "" : valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function texto(valor, padrao) {
    const limpo = typeof valor === "string" ? valor.trim() : "";
    return limpo || padrao;
}

function lista(valor) {
    return Array.isArray(valor) ? valor : [];
}

function dataBonita(valor) {
    if (!valor) return "—";

    const d = new Date(valor);

    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function aviso(mensagem, cor) {
    const alvo = document.getElementById("panel-message");

    if (!alvo) return;

    alvo.textContent = mensagem || "";
    alvo.style.color = cor || "#19723a";

    if (mensagem) {
        window.clearTimeout(aviso._t);
        aviso._t = window.setTimeout(() => { alvo.textContent = ""; }, 5000);
    }
}

function erroAmigavel(error) {
    const msg = String(error?.message || "");

    if (msg.includes("duplicate key")) return "Já existe uma peça com esse código.";
    if (msg.includes("violates check constraint")) return "Algum campo está fora do formato aceito. Revise e tente de novo.";
    if (msg.toLowerCase().includes("row-level security")) return "Sua conta não tem permissão para esta ação.";

    return "Não foi possível concluir agora. Tente novamente.";
}

/* ---------------- LOGIN ---------------- */

function mensagemLogin(txt, cor) {
    const alvo = document.getElementById("login-message");

    if (alvo) {
        alvo.textContent = txt || "";
        alvo.style.color = cor || "#a84912";
    }
}

async function souAdmin() {
    const { data: sessao } = await sb.auth.getSession();

    if (!sessao?.session) return false;

    const { data, error } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", sessao.session.user.id)
        .eq("role", "admin")
        .maybeSingle();

    if (error) return false;

    return Boolean(data);
}

async function entrar(evento) {
    evento.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-password").value;

    mensagemLogin("Entrando...", "#334155");

    const { error } = await sb.auth.signInWithPassword({ email: email, password: senha });

    if (error) {
        const m = String(error.message || "").toLowerCase();

        mensagemLogin(
            m.includes("invalid login")
                ? "E-mail ou senha incorretos."
                : m.includes("not confirmed")
                    ? "Confirme o e-mail pelo link enviado antes de entrar."
                    : "Não foi possível entrar agora. Tente novamente.",
            "#b23b16"
        );

        return;
    }

    if (!(await souAdmin())) {
        await sb.auth.signOut();
        mensagemLogin("Esta conta não faz parte da equipe.", "#b23b16");
        return;
    }

    mensagemLogin("");
    await abrirPainel();
}

async function sair() {
    await sb.auth.signOut();

    produtos = [];
    reservas = [];
    avaliacoes = [];

    document.getElementById("panel-view").hidden = true;
    document.getElementById("login-view").hidden = false;
    document.getElementById("logout-btn").hidden = true;
}

/* ---------------- CARREGAR DADOS ---------------- */

async function carregarTudo() {
    const [p, r, a] = await Promise.all([
        sb.from("produtos").select("*").order("createdAt", { ascending: false }).limit(500),
        sb.from("reservas").select("*").order("createdAt", { ascending: false }).limit(500),
        sb.from("avaliacoes").select("*").order("createdAt", { ascending: false }).limit(500)
    ]);

    produtos = lista(p.data);
    reservas = lista(r.data);
    avaliacoes = lista(a.data);

    renderEstatisticas();
    renderProdutos();
    renderReservas();
    renderAvaliacoes();
}

async function abrirPainel() {
    document.getElementById("login-view").hidden = true;
    document.getElementById("panel-view").hidden = false;
    document.getElementById("logout-btn").hidden = false;

    await carregarTudo();
}

/* ---------------- ESTATÍSTICAS ---------------- */

function cartaoEstatistica(rotulo, valor, detalhe) {
    return (
        '<div class="card">' +
        '<p class="text-xs font-extrabold tracking-[.14em]" style="color:#ef6b2e">' + esc(rotulo) + "</p>" +
        '<p class="brand-font mt-1 text-3xl font-bold" style="color:#092a46">' + esc(valor) + "</p>" +
        '<p class="mt-1 text-sm text-slate-600">' + esc(detalhe) + "</p>" +
        "</div>"
    );
}

function renderEstatisticas() {
    const alvo = document.getElementById("stats");

    if (!alvo) return;

    const disponiveis = produtos.filter((p) => p.status === "available").length;
    const reservados = produtos.filter((p) => p.status === "reserved").length;
    const trocados = produtos.filter((p) => p.status === "exchanged").length;
    const pendentes = reservas.filter((r) => r.status === "Pendente").length;

    const notas = avaliacoes.map((a) => Number(a.nota)).filter((n) => n >= 1 && n <= 5);
    const media = notas.length ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1) : "—";

    alvo.innerHTML =
        cartaoEstatistica("PEÇAS", produtos.length, disponiveis + " disponíveis") +
        cartaoEstatistica("EM MOVIMENTO", reservados + trocados, reservados + " reservadas · " + trocados + " trocadas") +
        cartaoEstatistica("RESERVAS", reservas.length, pendentes + " aguardando resposta") +
        cartaoEstatistica("NOTA MÉDIA", media, avaliacoes.length + " avaliações recebidas");
}

/* ---------------- PRODUTOS ---------------- */

function produtosFiltrados() {
    const busca = (document.getElementById("product-search")?.value || "").trim().toLowerCase();
    const status = document.getElementById("product-status-filter")?.value || "";
    const categoria = document.getElementById("product-category-filter")?.value || "";

    return produtos.filter((p) => {
        if (status && p.status !== status) return false;
        if (categoria && p.categoria !== categoria) return false;

        if (busca) {
            const alvo = (String(p.codigo || "") + " " + String(p.nome || "")).toLowerCase();
            if (!alvo.includes(busca)) return false;
        }

        return true;
    });
}

function renderProdutos() {
    const alvo = document.getElementById("product-list");

    if (!alvo) return;

    const itens = produtosFiltrados();

    if (!itens.length) {
        alvo.innerHTML = '<div class="card text-slate-600">Nenhuma peça encontrada com esses filtros.</div>';
        return;
    }

    alvo.innerHTML = itens
        .map((p) => {
            const st = STATUS_PRODUTO[p.status] || STATUS_PRODUTO.available;
            const imagem = texto(p.imagem, "");

            return (
                '<article class="card flex flex-wrap gap-4">' +
                (imagem
                    ? '<img src="' + esc(imagem) + '" alt="" style="width:88px;height:88px;object-fit:cover;border-radius:.75rem">'
                    : '<div style="width:88px;height:88px;border-radius:.75rem;background:#eef2f7;display:flex;align-items:center;justify-content:center;font-size:.7rem;color:#64748b">Sem foto</div>') +
                '<div style="flex:1 1 240px;min-width:0">' +
                '<p class="text-xs font-bold text-slate-500">#' + esc(p.codigo) + " · " + esc(dataBonita(p.createdAt)) + "</p>" +
                '<h3 class="brand-font text-lg font-bold" style="color:#092a46">' + esc(texto(p.nome, "Peça sem nome")) + "</h3>" +
                '<p class="text-sm text-slate-600">' + esc(texto(p.tamanho, "Tamanho não informado")) + " · " + esc(texto(p.estado, "Estado não informado")) + "</p>" +
                '<p class="mt-1 text-sm text-slate-600">Troca: ' + esc(texto(p.troca, "não informada")) + "</p>" +
                '<span class="pill mt-2" style="color:' + st.cor + ";background:" + st.fundo + '">' + st.texto + "</span>" +
                "</div>" +
                '<div class="flex flex-wrap items-start gap-2">' +
                '<select class="field" data-produto-status="' + esc(p.id) + '" style="width:auto">' +
                Object.keys(STATUS_PRODUTO)
                    .map((k) => '<option value="' + k + '"' + (p.status === k ? " selected" : "") + ">" + STATUS_PRODUTO[k].texto + "</option>")
                    .join("") +
                "</select>" +
                '<button type="button" class="btn btn-soft" data-produto-editar="' + esc(p.id) + '">Editar</button>' +
                '<button type="button" class="btn btn-soft" data-produto-excluir="' + esc(p.id) + '" style="color:#b23b16">Excluir</button>' +
                "</div>" +
                "</article>"
            );
        })
        .join("");
}

function abrirFormularioProduto(produto) {
    document.getElementById("product-form-box").hidden = false;
    document.getElementById("product-form-title").textContent = produto ? "Editar peça" : "Adicionar peça";

    document.getElementById("product-id").value = produto?.id || "";
    document.getElementById("product-codigo").value = produto?.codigo || "";
    document.getElementById("product-nome").value = produto?.nome || "";
    document.getElementById("product-categoria").value = produto?.categoria || "adult";
    document.getElementById("product-status").value = produto?.status || "available";
    document.getElementById("product-tamanho").value = produto?.tamanho || "";
    document.getElementById("product-estado").value = produto?.estado || "";
    document.getElementById("product-troca").value = produto?.troca || "";
    document.getElementById("product-descricao").value = produto?.descricao || "";
    document.getElementById("product-imagem").value = produto?.imagem || "";

    atualizarPreviaFoto();

    document.getElementById("product-form-box").scrollIntoView({ behavior: "smooth", block: "start" });
}

function fecharFormularioProduto() {
    document.getElementById("product-form-box").hidden = true;
    document.getElementById("product-form").reset();
    document.getElementById("product-id").value = "";
    atualizarPreviaFoto();
}

function atualizarPreviaFoto() {
    const caixa = document.getElementById("product-preview");
    const url = document.getElementById("product-imagem")?.value.trim();

    if (!caixa) return;

    if (!url) {
        caixa.hidden = true;
        caixa.innerHTML = "";
        return;
    }

    caixa.hidden = false;
    caixa.innerHTML =
        '<p class="text-sm font-bold text-slate-700">Prévia da foto</p>' +
        '<img src="' + esc(url) + '" alt="" style="margin-top:.5rem;width:140px;height:140px;object-fit:cover;border-radius:.75rem" ' +
        "onerror=\"this.replaceWith(Object.assign(document.createElement('p'),{className:'text-sm text-slate-500',textContent:'Não conseguimos carregar essa foto.'}))\">";
}

async function salvarProduto(evento) {
    evento.preventDefault();

    const id = document.getElementById("product-id").value;

    const corpo = {
        codigo: document.getElementById("product-codigo").value.trim(),
        nome: document.getElementById("product-nome").value.trim(),
        categoria: document.getElementById("product-categoria").value,
        status: document.getElementById("product-status").value,
        tamanho: document.getElementById("product-tamanho").value.trim(),
        estado: document.getElementById("product-estado").value.trim(),
        troca: document.getElementById("product-troca").value.trim(),
        descricao: document.getElementById("product-descricao").value.trim(),
        imagem: document.getElementById("product-imagem").value.trim()
    };

    const botao = document.getElementById("product-save-btn");

    botao.disabled = true;
    botao.style.opacity = ".6";

    const { error } = id
        ? await sb.from("produtos").update(corpo).eq("id", id)
        : await sb.from("produtos").insert(corpo);

    botao.disabled = false;
    botao.style.opacity = "";

    if (error) {
        aviso(erroAmigavel(error), "#b23b16");
        return;
    }

    aviso(id ? "Peça atualizada." : "Peça adicionada ao catálogo.");
    fecharFormularioProduto();
    await carregarTudo();
}

async function excluirProduto(id) {
    if (!window.confirm("Excluir esta peça do catálogo? Essa ação não pode ser desfeita.")) return;

    const { error } = await sb.from("produtos").delete().eq("id", id);

    if (error) {
        aviso(erroAmigavel(error), "#b23b16");
        return;
    }

    aviso("Peça excluída.");
    await carregarTudo();
}

async function mudarStatusProduto(id, status) {
    const { error } = await sb.from("produtos").update({ status: status }).eq("id", id);

    if (error) {
        aviso(erroAmigavel(error), "#b23b16");
        return;
    }

    aviso("Status atualizado.");
    await carregarTudo();
}

/* ---------------- RESERVAS ---------------- */

function reservasFiltradas() {
    const busca = (document.getElementById("reserva-search")?.value || "").trim().toLowerCase();
    const status = document.getElementById("reserva-status-filter")?.value || "";

    return reservas.filter((r) => {
        if (status && r.status !== status) return false;

        if (busca) {
            const alvo = [r.nomeCompleto, r.contato, r.codigoProduto, r.nomeProduto].join(" ").toLowerCase();
            if (!alvo.includes(busca)) return false;
        }

        return true;
    });
}

function renderReservas() {
    const alvo = document.getElementById("reserva-list");

    if (!alvo) return;

    const itens = reservasFiltradas();

    if (!itens.length) {
        alvo.innerHTML = '<div class="card text-slate-600">Nenhuma reserva encontrada.</div>';
        return;
    }

    alvo.innerHTML = itens
        .map(
            (r) =>
                '<article class="card">' +
                '<div class="flex flex-wrap items-start justify-between gap-3">' +
                "<div>" +
                '<p class="text-xs font-bold text-slate-500">' + esc(dataBonita(r.createdAt)) + "</p>" +
                '<h3 class="brand-font text-lg font-bold" style="color:#092a46">' + esc(texto(r.nomeCompleto, "Sem nome")) + "</h3>" +
                '<p class="text-sm text-slate-600">Contato: ' + esc(texto(r.contato, "não informado")) + "</p>" +
                '<p class="text-sm text-slate-600">Peça: #' + esc(texto(r.codigoProduto, "—")) + " · " + esc(texto(r.nomeProduto, "—")) + "</p>" +
                '<p class="text-sm text-slate-600">Doação: ' + esc(texto(r.itemDoacao, "—")) + " (" + esc(texto(r.tipoDoacao, "—")) + ") · qtd " + esc(r.quantidade ?? "—") + "</p>" +
                "</div>" +
                '<div class="flex flex-wrap gap-2">' +
                '<select class="field" data-reserva-status="' + esc(r.id) + '" style="width:auto">' +
                STATUS_RESERVA.map((s) => '<option value="' + s + '"' + (r.status === s ? " selected" : "") + ">" + s + "</option>").join("") +
                "</select>" +
                '<button type="button" class="btn btn-soft" data-reserva-excluir="' + esc(r.id) + '" style="color:#b23b16">Excluir</button>' +
                "</div>" +
                "</div>" +
                '<label class="mt-4 block text-sm font-bold text-slate-700">Observações da equipe</label>' +
                '<textarea class="field mt-1" rows="2" data-reserva-obs="' + esc(r.id) + '">' + esc(r.observacoesEquipe || "") + "</textarea>" +
                '<button type="button" class="btn btn-soft mt-2" data-reserva-salvar="' + esc(r.id) + '">Salvar observação</button>' +
                "</article>"
        )
        .join("");
}

async function mudarStatusReserva(id, status) {
    const { error } = await sb.from("reservas").update({ status: status }).eq("id", id);

    if (error) {
        aviso(erroAmigavel(error), "#b23b16");
        return;
    }

    aviso("Reserva atualizada.");
    await carregarTudo();
}

async function salvarObservacao(id) {
    const campo = document.querySelector('[data-reserva-obs="' + id + '"]');

    const { error } = await sb
        .from("reservas")
        .update({ observacoesEquipe: (campo?.value || "").trim().slice(0, 1000) })
        .eq("id", id);

    aviso(error ? erroAmigavel(error) : "Observação salva.", error ? "#b23b16" : "#19723a");
}

async function excluirReserva(id) {
    if (!window.confirm("Excluir esta reserva?")) return;

    const { error } = await sb.from("reservas").delete().eq("id", id);

    if (error) {
        aviso(erroAmigavel(error), "#b23b16");
        return;
    }

    aviso("Reserva excluída.");
    await carregarTudo();
}

/* ---------------- AVALIAÇÕES ---------------- */

function renderAvaliacoes() {
    const alvo = document.getElementById("avaliacao-list");

    if (!alvo) return;

    if (!avaliacoes.length) {
        alvo.innerHTML = '<div class="card text-slate-600">Nenhuma avaliação recebida ainda.</div>';
        return;
    }

    alvo.innerHTML = avaliacoes
        .map(
            (a) =>
                '<article class="card">' +
                '<div class="flex flex-wrap items-start justify-between gap-3">' +
                "<div>" +
                '<p class="text-xs font-bold text-slate-500">' + esc(dataBonita(a.createdAt)) + "</p>" +
                '<p class="brand-font text-lg font-bold" style="color:#092a46">Nota ' + esc(a.nota ?? "—") + "/5</p>" +
                '<p class="text-sm text-slate-600">Facilidade: ' + esc(texto(a.facilidade, "—")) + " · Satisfação: " + esc(texto(a.satisfacao, "—")) + "</p>" +
                '<p class="text-sm text-slate-600">Participaria de novo: ' + esc(texto(a.participariaNovamente, "—")) + " · Recomendaria: " + esc(texto(a.recomendaria, "—")) + "</p>" +
                (texto(a.sugestao, "") ? '<p class="mt-2 text-slate-700">“' + esc(a.sugestao) + "”</p>" : "") +
                "</div>" +
                '<button type="button" class="btn btn-soft" data-avaliacao-excluir="' + esc(a.id) + '" style="color:#b23b16">Excluir</button>' +
                "</div>" +
                "</article>"
        )
        .join("");
}

async function excluirAvaliacao(id) {
    if (!window.confirm("Excluir esta avaliação?")) return;

    const { error } = await sb.from("avaliacoes").delete().eq("id", id);

    if (error) {
        aviso(erroAmigavel(error), "#b23b16");
        return;
    }

    aviso("Avaliação excluída.");
    await carregarTudo();
}

/* ---------------- PLANILHAS ---------------- */

function baixarCSV(nome, linhas) {
    if (!linhas.length) {
        aviso("Não há dados para baixar.", "#a84912");
        return;
    }

    const colunas = Object.keys(linhas[0]);

    const conteudo = [colunas.join(";")]
        .concat(
            linhas.map((l) =>
                colunas.map((c) => '"' + String(l[c] ?? "").replace(/"/g, '""') + '"').join(";")
            )
        )
        .join("\n");

    const url = URL.createObjectURL(new Blob(["\ufeff" + conteudo], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = nome;
    link.click();

    URL.revokeObjectURL(url);
}

/* ---------------- ABAS E EVENTOS ---------------- */

function trocarAba(aba) {
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === aba));
    document.querySelectorAll("[data-panel]").forEach((s) => { s.hidden = s.dataset.panel !== aba; });
}

function ligarEventos() {
    document.getElementById("login-form").addEventListener("submit", entrar);
    document.getElementById("logout-btn").addEventListener("click", sair);

    document.querySelectorAll("[data-tab]").forEach((b) =>
        b.addEventListener("click", () => trocarAba(b.dataset.tab))
    );

    document.getElementById("new-product-btn").addEventListener("click", () => abrirFormularioProduto(null));
    document.getElementById("product-cancel-btn").addEventListener("click", fecharFormularioProduto);
    document.getElementById("product-form").addEventListener("submit", salvarProduto);
    document.getElementById("product-imagem").addEventListener("input", atualizarPreviaFoto);

    ["product-search", "product-status-filter", "product-category-filter"].forEach((id) =>
        document.getElementById(id).addEventListener("input", renderProdutos)
    );

    ["reserva-search", "reserva-status-filter"].forEach((id) =>
        document.getElementById(id).addEventListener("input", renderReservas)
    );

    document.getElementById("export-reservas-btn").addEventListener("click", () =>
        baixarCSV(
            "reservas.csv",
            reservasFiltradas().map((r) => ({
                data: dataBonita(r.createdAt),
                nome: r.nomeCompleto,
                contato: r.contato,
                codigo: r.codigoProduto,
                peca: r.nomeProduto,
                doacao: r.itemDoacao,
                tipo: r.tipoDoacao,
                quantidade: r.quantidade,
                status: r.status,
                observacoes: r.observacoesEquipe
            }))
        )
    );

    document.getElementById("export-avaliacoes-btn").addEventListener("click", () =>
        baixarCSV(
            "avaliacoes.csv",
            avaliacoes.map((a) => ({
                data: dataBonita(a.createdAt),
                nota: a.nota,
                facilidade: a.facilidade,
                satisfacao: a.satisfacao,
                participaria: a.participariaNovamente,
                recomendaria: a.recomendaria,
                sugestao: a.sugestao
            }))
        )
    );

    document.addEventListener("click", (e) => {
        const alvo = e.target.closest("[data-produto-editar],[data-produto-excluir],[data-reserva-excluir],[data-reserva-salvar],[data-avaliacao-excluir]");

        if (!alvo) return;

        if (alvo.dataset.produtoEditar) {
            abrirFormularioProduto(produtos.find((p) => String(p.id) === alvo.dataset.produtoEditar));
        } else if (alvo.dataset.produtoExcluir) {
            excluirProduto(alvo.dataset.produtoExcluir);
        } else if (alvo.dataset.reservaExcluir) {
            excluirReserva(alvo.dataset.reservaExcluir);
        } else if (alvo.dataset.reservaSalvar) {
            salvarObservacao(alvo.dataset.reservaSalvar);
        } else if (alvo.dataset.avaliacaoExcluir) {
            excluirAvaliacao(alvo.dataset.avaliacaoExcluir);
        }
    });

    document.addEventListener("change", (e) => {
        if (e.target.dataset?.produtoStatus) {
            mudarStatusProduto(e.target.dataset.produtoStatus, e.target.value);
        } else if (e.target.dataset?.reservaStatus) {
            mudarStatusReserva(e.target.dataset.reservaStatus, e.target.value);
        }
    });
}

async function iniciar() {
    ligarEventos();

    if (await souAdmin()) {
        await abrirPainel();
    }
}

iniciar();
