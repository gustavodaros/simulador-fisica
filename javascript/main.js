const simulacoes = {
    mru: ["MRU", "x = x₀ + v·t", ["x0", "x", "v", "deslocamento", "t"], resolverMRU, estadoMRU],
    mruv: ["MRUV", "x = x₀ + v₀·t + a·t²/2", ["x0", "x", "v0", "v", "a", "deslocamento", "t"], resolverMRUV, estadoMRUV],
    queda_livre: ["Queda livre", "y = y₀ + v₀·t − g·t²/2", ["y0", "y", "v0", "v", "g", "deslocamento", "t", "solo", "alturaInicial"], resolverQuedaLivre, estadoQuedaLivre],
    forca: ["Segunda Lei de Newton", "F = m·a", ["m", "F", "a", "x0", "v0"], resolverNewton, estadoNewton],
    atrito: ["Atrito", "Fres = F − Fat; a = Fres/m", ["m", "F", "mue", "muc", "g", "v0", "x0"], resolverAtrito, estadoAtrito],
    trabalho: ["Trabalho", "W = F·Δx·cos(θ)", ["F", "deslocamento", "angulo"], resolverTrabalho, estadoTrabalho]
};
const rotulos = {
    x0: "Posição inicial x₀ (m)", x: "Posição final x (m)", y0: "Altura inicial y₀ (m)",
    y: "Altura final y (m)", v0: "Velocidade inicial v₀ (m/s)", v: "Velocidade final v (m/s)",
    a: "Aceleração a (m/s²)", deslocamento: "Deslocamento Δx (m)", t: "Tempo t (s)",
    m: "Massa m (kg)", F: "Força F (N)", g: "Gravidade g (m/s²)",
    solo: "Posição do solo (m)", alturaInicial: "Altura acima do solo (m)",
    mue: "Atrito estático μₑ", muc: "Atrito cinético μ꜀", angulo: "Ângulo (graus)"
};
let atual, resultado, quadro, inicio, tempo = 0, duracao = 5, limites;
const porId = id => document.getElementById(id);
const mostrar = pagina => ["inicio", "opcoes-cinematica", "opcoes-dinamica", "simulacao"]
    .forEach(id => porId(id).hidden = id !== pagina);

function abrir(id) {
    atual = simulacoes[id];
    if (!atual) return;
    parar();
    resultado = null;
    porId("titulo-simulacao").textContent = atual[0];
    porId("formula").textContent = atual[1];
    porId("resultados").textContent = "";
    porId("parametros").replaceChildren();
    atual[2].concat("duracao-simulacao").forEach(nome => {
        const label = document.createElement("label");
        label.textContent = nome === "duracao-simulacao" ? "Duração da animação (s)" : rotulos[nome];
        const input = document.createElement("input");
        input.type = "number";
        input.step = "any";
        input.id = nome === "duracao-simulacao" ? nome : "parametro-" + nome;
        input.dataset.campo = nome;
        if (nome === "duracao-simulacao") {
            input.min = "0.1";
            input.max = "60";
            input.value = "5";
        }
        label.append(input);
        porId("parametros").append(label);
    });
    limparCanvas();
    mostrar("simulacao");
}

function lerCampos() {
    const campos = {};
    document.querySelectorAll("[data-campo]").forEach(input => {
        if (input.dataset.campo !== "duracao-simulacao") campos[input.dataset.campo] = input.value;
    });
    duracao = Number(porId("duracao-simulacao").value);
    return Number.isFinite(duracao) && duracao > 0 && duracao <= 60
        ? campos : null;
}

function exibir(dados) {
    const linhas = [];
    ["fornecidos", "assumidos", "calculados"].forEach(tipo => {
        if (dados[tipo] && Object.keys(dados[tipo]).length) {
            linhas.push(tipo + ": " + Object.entries(dados[tipo])
                .map(([k, v]) => k + " = " + Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 4 })).join("; "));
        }
    });
    if (dados.desconhecidos && dados.desconhecidos.length) linhas.push("Indeterminados: " + dados.desconhecidos.join(", "));
    porId("resultados").textContent = linhas.concat(dados.mensagens || []).join("\n");
    porId("resultados").style.whiteSpace = "pre-line";
}

function estado(t) {
    return atual[4](resultado, t, duracao);
}

function desenhar(t) {
    const s = estado(t);
    if (!s.sucesso) {
        exibir({ mensagens: s.mensagens || ["Não foi possível calcular o movimento."] });
        return false;
    }
    desenharMovimentoCanvas(s, atual === simulacoes.queda_livre ? "QUEDA_LIVRE" : atual[0], limites);
    return true;
}

function animar(ms) {
    if (inicio === null) inicio = ms - tempo * 1000;
    tempo = Math.min((ms - inicio) / 1000, duracao);
    if (desenhar(tempo) && tempo < duracao) quadro = requestAnimationFrame(animar);
    else parar();
}

function parar() {
    if (quadro !== null) cancelAnimationFrame(quadro);
    quadro = inicio = null;
}

function iniciar() {
    if (quadro !== null) return;
    if (!resultado || !resultado.sucesso || !resultado.simulacaoPossivel || tempo >= duracao) {
        const campos = lerCampos();
        if (!campos) return exibir({ mensagens: ["A duração deve ser maior que zero e no máximo 60 segundos."] });
        resultado = atual[3](campos);
        exibir(resultado);
        if (!resultado.sucesso || !resultado.simulacaoPossivel) return;
        tempo = 0;
        const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
        if (atual === simulacoes.queda_livre && valores.tempoImpacto > 0) duracao = Math.min(duracao, valores.tempoImpacto);
        const a = estado(0), b = estado(duracao);
        if (!a.sucesso) return exibir({ mensagens: a.mensagens });
        limites = atual === simulacoes.queda_livre
            ? { inicio: a.y, fim: b.sucesso ? b.y : a.y, solo: valores.solo }
            : { inicio: a.x, fim: b.sucesso ? b.x : a.x };
        desenhar(0);
    }
    quadro = requestAnimationFrame(animar);
}

porId("cinematica").onclick = () => mostrar("opcoes-cinematica");
porId("dinamica").onclick = () => mostrar("opcoes-dinamica");
document.querySelectorAll("#opcoes-cinematica button[id], #opcoes-dinamica button[id]")
    .forEach(button => button.onclick = () => abrir(button.id));
document.querySelectorAll(".voltar").forEach(button => button.onclick = () => mostrar("inicio"));
porId("voltar-simulacao").onclick = () => {
    parar();
    mostrar(Object.keys(simulacoes).indexOf(Object.keys(simulacoes).find(id => simulacoes[id] === atual)) < 3
        ? "opcoes-cinematica" : "opcoes-dinamica");
};
porId("iniciar").onclick = iniciar;
porId("pausar").onclick = parar;
porId("reiniciar").onclick = () => {
    parar();
    tempo = 0;
    if (resultado && resultado.simulacaoPossivel) desenhar(0);
    else limparCanvas();
};
mostrar("inicio");
limparCanvas();
