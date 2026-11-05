function lerNumeroMRU(valor) {
    if (valor === undefined || valor === null) {
        return { ausente: true };
    }

    if (typeof valor === "string") {
        valor = valor.trim();
        if (valor === "") return { ausente: true };

        valor = Number(valor.replace(",", "."));
    }

    if (typeof valor !== "number" || !Number.isFinite(valor)) {
        return { erro: true };
    }

    return { valor: valor };
}

function resolverMRU(dados = {}) {
    const resultado = {
        movimento: "MRU", sucesso: true, situacao: "parcial",
        fornecidos: {}, assumidos: {}, calculados: { a: 0 }, desconhecidos: [],
        simulacaoPossivel: false, solucoes: [], mensagens: []
    };
    if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
        resultado.mensagens.push("Informe os dados do MRU em um objeto JavaScript.");
    } else {
        for (const nome of ["x0", "v"]) {
            const entrada = lerNumeroMRU(dados[nome]);
            if (entrada.erro) resultado.mensagens.push("O campo " + nome + " deve conter um número válido.");
            else if (!entrada.ausente) resultado.fornecidos[nome] = entrada.valor;
        }
    }
    if (resultado.mensagens.length > 0) {
        resultado.sucesso = false;
        resultado.situacao = "erro";
        return resultado;
    }
    if (resultado.fornecidos.x0 === undefined) resultado.assumidos.x0 = 0;
    resultado.desconhecidos = ["x", "deslocamento", "t"];
    const velocidade = resultado.fornecidos.v;
    if (velocidade === undefined) {
        resultado.desconhecidos.push("v");
        resultado.mensagens.push("Informe a velocidade para definir o MRU.");
    } else {
        resultado.simulacaoPossivel = true;
        if (velocidade === 0) {
            resultado.calculados.x = resultado.fornecidos.x0 ?? resultado.assumidos.x0;
            resultado.calculados.deslocamento = 0;
            resultado.desconhecidos = ["t"];
        }
    }
    return resultado;
}

function estadoMRU(resultado, tempo) {
    const estado = { movimento: "MRU", sucesso: false, mensagens: [] };
    if (!resultado || resultado.movimento !== "MRU" || resultado.sucesso !== true || resultado.simulacaoPossivel !== true) {
        estado.mensagens.push("Resolva um MRU com trajetória definida antes de consultar seu estado.");
        return estado;
    }

    const entrada = lerNumeroMRU(tempo);
    if (entrada.erro || entrada.ausente || entrada.valor < 0) {
        estado.mensagens.push("Informe um tempo finito e não negativo para a consulta.");
        return estado;
    }

    let posicaoInicial = resultado.fornecidos.x0;
    if (posicaoInicial === undefined) {
        posicaoInicial = resultado.assumidos.x0;
    }
    let velocidade = resultado.fornecidos.v;
    if (velocidade === undefined) {
        velocidade = resultado.calculados.v;
    }

    const posicao = posicaoInicial + velocidade * entrada.valor;
    if (!Number.isFinite(posicao)) {
        estado.mensagens.push("O cálculo da posição excedeu o limite numérico.");
        return estado;
    }

    estado.sucesso = true;
    estado.t = entrada.valor;
    estado.x = posicao;
    estado.v = velocidade;
    estado.a = 0;
    return estado;
}
