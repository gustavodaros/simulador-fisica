function resolverTrabalho(dados = {}) {
    const resultado = {
        movimento: "TRABALHO", sucesso: true, simulacaoPossivel: false,
        fornecidos: {}, assumidos: {}, calculados: {}, mensagens: []
    };
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
        resultado.sucesso = false;
        resultado.mensagens.push("Informe os dados do trabalho em um objeto.");
        return resultado;
    }
    const valores = {};
    for (const nome of ["F", "deslocamento", "angulo"]) {
        const texto = String(dados[nome] === undefined ? "" : dados[nome]).trim();
        if (!texto) continue;
        const valor = Number(texto.replace(",", "."));
        if (!Number.isFinite(valor)) {
            resultado.sucesso = false;
            resultado.mensagens.push("O campo " + nome + " deve conter um número finito.");
        } else {
            valores[nome] = valor;
            resultado.fornecidos[nome] = valor;
        }
    }
    if (!resultado.sucesso) return resultado;
    if (valores.F === undefined || valores.deslocamento === undefined) {
        resultado.mensagens.push("Informe a força e o deslocamento.");
        return resultado;
    }
    if (valores.F < 0) {
        resultado.sucesso = false;
        resultado.mensagens.push("A força não pode ser negativa.");
        return resultado;
    }
    if (valores.angulo === undefined) {
        valores.angulo = 0;
        resultado.assumidos.angulo = 0;
    }
    const trabalho = valores.F * valores.deslocamento * Math.cos(valores.angulo * Math.PI / 180);
    if (!Number.isFinite(trabalho)) {
        resultado.sucesso = false;
        resultado.mensagens.push("O cálculo excedeu o limite numérico.");
        return resultado;
    }
    resultado.calculados.trabalho = trabalho;
    resultado.simulacaoPossivel = true;
    resultado.mensagens.push("Trabalho calculado: W = F·Δx·cos(θ).");
    return resultado;
}

function estadoTrabalho(resultado, tempo, duracao) {
    if (!resultado || !resultado.simulacaoPossivel || duracao <= 0) {
        return { sucesso: false, mensagens: ["Calcule o trabalho antes de iniciar."] };
    }
    const distancia = resultado.fornecidos.deslocamento;
    return {
        movimento: "TRABALHO", sucesso: true, t: tempo,
        x: distancia * Math.min(tempo / duracao, 1), v: distancia / duracao, a: 0
    };
}
