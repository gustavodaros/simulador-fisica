//trabalho de uma força constante: W = F * deslocamento * cos(angulo)

function lerNumeroTrabalho(valor) {
    if (valor === undefined || valor === null) return { ausente: true };
    if (typeof valor === "string") {
        valor = valor.trim();
        if (valor === "") return { ausente: true };
        const formato = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i;
        if (!formato.test(valor)) return { erro: true };
        valor = Number(valor.replace(",", "."));
    }
    if (typeof valor !== "number" || !Number.isFinite(valor)) return { erro: true };
    return { valor: valor };
}

function resolverTrabalho(dados = {}) {
    const grandezas = ["F", "deslocamento", "angulo"];
    const resultado = {
        movimento: "TRABALHO", sucesso: true, situacao: "parcial",
        fornecidos: {}, assumidos: {}, calculados: {}, desconhecidos: [],
        simulacaoPossivel: false, solucoes: [], mensagens: []
    };
    const valores = {};

    function falhar(mensagem) {
        resultado.sucesso = false;
        resultado.situacao = "erro";
        resultado.simulacaoPossivel = false;
        if (!resultado.mensagens.includes(mensagem)) resultado.mensagens.push(mensagem);
    }

    //o ângulo é opcional (padrão 0°), por isso só F e deslocamento podem ficar indeterminados.
    function atualizarDesconhecidos() {
        resultado.desconhecidos = ["F", "deslocamento"].filter(function (nome) {
            return valores[nome] === undefined;
        });
    }

    if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
        falhar("Informe os dados do trabalho em um objeto.");
        atualizarDesconhecidos();
        return resultado;
    }

    for (const nome of grandezas) {
        const entrada = lerNumeroTrabalho(dados[nome]);
        if (entrada.erro) {
            falhar("O campo " + nome + " deve conter um número finito.");
        } else if (!entrada.ausente) {
            valores[nome] = entrada.valor;
            resultado.fornecidos[nome] = entrada.valor;
        }
    }
    if (valores.F !== undefined && valores.F < 0) falhar("A força não pode ser negativa.");

    //entrada inválida não deve ser substituída por um valor padrão.
    if (!resultado.sucesso) {
        atualizarDesconhecidos();
        return resultado;
    }

    atualizarDesconhecidos();
    if (valores.F === undefined || valores.deslocamento === undefined) {
        resultado.mensagens.push("Informe a força e o deslocamento.");
        return resultado;
    }

    if (valores.angulo === undefined) {
        valores.angulo = 0;
        resultado.assumidos.angulo = 0;
    }

    const produto = valores.F * valores.deslocamento;
    const trabalho0 = produto * Math.cos(valores.angulo * Math.PI / 180);
    if (!Number.isFinite(produto) || !Number.isFinite(trabalho0)) {
        falhar("O cálculo excedeu o limite numérico.");
        return resultado;
    }

    //cos(90°) em ponto flutuante vale ~6e-17 e não zero: resultados desprezíveis perto de F*|Δx| viram 0
    //(isso também evita "-0" na tela).
    const trabalho = Math.abs(trabalho0) <= 1e-12 * Math.abs(produto) ? 0 : trabalho0;

    resultado.calculados.trabalho = trabalho;
    resultado.simulacaoPossivel = true;
    resultado.situacao = "determinado";
    resultado.mensagens.push("Trabalho calculado: W = F·Δx·cos(θ).");
    return resultado;
}

function estadoTrabalho(resultado, tempo, duracao) {
    if (!resultado || resultado.movimento !== "TRABALHO" || resultado.sucesso !== true
        || resultado.simulacaoPossivel !== true || !(duracao > 0)) {
        return { movimento: "TRABALHO", sucesso: false, mensagens: ["Calcule o trabalho antes de iniciar."] };
    }
    const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
    const fracao = Math.min(Math.max(tempo / duracao, 0), 1);
    return {
        movimento: "TRABALHO", sucesso: true, t: tempo,
        x: valores.deslocamento * fracao, v: valores.deslocamento / duracao, a: 0,
        F: valores.F, angulo: valores.angulo,
        W: valores.trabalho * fracao,     //trabalho acumulado até o instante t
        mensagens: []
    };
}
