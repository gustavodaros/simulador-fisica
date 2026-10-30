/*
 * MRU — unidades: posição em m, tempo em s e velocidade em m/s.
 * Uso: resolverMRU({ v: 2, t: 3 });
 *      estadoMRU(resultado, 5);
 * Funções independentes da interface, disponíveis ao carregar este script.
 */

// Somente textos numéricos completos são aceitos; vazio não significa zero.
function lerNumeroMRU(valor) {
    if (valor === undefined || valor === null) {
        return { ausente: true };
    }

    if (typeof valor === "string") {
        valor = valor.trim();
        if (valor === "") return { ausente: true };

        const formato = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i;
        if (!formato.test(valor)) return { erro: true };
        valor = Number(valor.replace(",", "."));
    }

    if (typeof valor !== "number" || !Number.isFinite(valor)) {
        return { erro: true };
    }

    return { valor: valor };
}

function numerosProximosMRU(primeiro, segundo) {
    // Tolerância absoluta perto de zero e relativa para valores maiores.
    const escala = Math.max(1, Math.abs(primeiro), Math.abs(segundo));
    return Math.abs(primeiro - segundo) <= 1e-9 * escala;
}

function resolverMRU(dados = {}) {
    const grandezas = ["x0", "x", "v", "deslocamento", "t"];
    const resultado = {
        movimento: "MRU",
        sucesso: true,
        situacao: "parcial",
        fornecidos: {},
        assumidos: {},
        calculados: { a: 0 },
        desconhecidos: [],
        simulacaoPossivel: false,
        solucoes: [],
        mensagens: []
    };
    const valores = {};

    function registrarErro(mensagem) {
        resultado.sucesso = false;
        resultado.situacao = "erro";
        resultado.simulacaoPossivel = false;
        if (!resultado.mensagens.includes(mensagem)) {
            resultado.mensagens.push(mensagem);
        }
    }

    function atualizarDesconhecidos() {
        resultado.desconhecidos = grandezas.filter(function (nome) {
            return valores[nome] === undefined;
        });
    }

    if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
        registrarErro("Informe os dados do MRU em um objeto JavaScript.");
        atualizarDesconhecidos();
        return resultado;
    }

    for (const nome of Object.keys(dados)) {
        if (!grandezas.includes(nome)) {
            registrarErro("Campo não reconhecido no MRU: " + nome + ".");
        }
    }

    for (const nome of grandezas) {
        const entrada = lerNumeroMRU(dados[nome]);
        if (entrada.erro) {
            registrarErro("O campo " + nome + " deve conter um número finito.");
        } else if (!entrada.ausente) {
            valores[nome] = entrada.valor;
            resultado.fornecidos[nome] = entrada.valor;
        }
    }

    if (valores.t !== undefined && valores.t < 0) {
        registrarErro("O tempo não pode ser negativo.");
    }

    // Uma entrada inválida não deve ser substituída por um valor padrão.
    if (!resultado.sucesso) {
        atualizarDesconhecidos();
        return resultado;
    }

    if (valores.x0 === undefined) {
        valores.x0 = 0;
        resultado.assumidos.x0 = 0;
        resultado.mensagens.push("Posição inicial não informada: adotado x0 = 0 m.");
    }

    function calcular(nome, valor) {
        if (!Number.isFinite(valor)) {
            registrarErro("O cálculo de " + nome + " excedeu o limite numérico.");
            return;
        }
        if (nome === "t" && valor < 0) {
            registrarErro("Os dados exigem um tempo negativo e são incompatíveis com t >= 0.");
            return;
        }
        valores[nome] = valor;
        resultado.calculados[nome] = valor;
    }

    // Cada passagem pode descobrir dados utilizados pela próxima equação.
    let quantidadeAnterior;
    do {
        quantidadeAnterior = Object.keys(valores).length;

        // Relação entre posições e deslocamento: Δx = x - x0.
        if (valores.x !== undefined && valores.deslocamento === undefined) {
            calcular("deslocamento", valores.x - valores.x0);
        }
        if (valores.deslocamento !== undefined && valores.x === undefined) {
            calcular("x", valores.x0 + valores.deslocamento);
        }

        // Δx = v*t. O teste de zero é exato para não descartar valores pequenos.
        if (valores.deslocamento === undefined && valores.v !== undefined && valores.t !== undefined) {
            calcular("deslocamento", valores.v * valores.t);
        }
        if (valores.v === undefined && valores.deslocamento !== undefined && valores.t !== undefined && valores.t !== 0) {
            calcular("v", valores.deslocamento / valores.t);
        }
        if (valores.t === undefined && valores.deslocamento !== undefined && valores.v !== undefined && valores.v !== 0) {
            calcular("t", valores.deslocamento / valores.v);
        }

        // Em repouso ou no instante inicial, o deslocamento é necessariamente zero.
        if (valores.deslocamento === undefined && (valores.v === 0 || valores.t === 0)) {
            calcular("deslocamento", 0);
        }
    } while (resultado.sucesso && Object.keys(valores).length > quantidadeAnterior);

    // Conferir as relações também quando todos os valores vieram do usuário.
    function conferir(observado, esperado, equacao) {
        if (!Number.isFinite(esperado)) {
            registrarErro("A verificação de " + equacao + " excedeu o limite numérico.");
        } else if (!numerosProximosMRU(observado, esperado)) {
            registrarErro("Dados contraditórios: não satisfazem " + equacao + ".");
        }
    }

    if (valores.x !== undefined && valores.deslocamento !== undefined) {
        conferir(valores.deslocamento, valores.x - valores.x0, "deslocamento = x - x0");
    }
    if (valores.deslocamento !== undefined && valores.v !== undefined && valores.t !== undefined) {
        conferir(valores.deslocamento, valores.v * valores.t, "deslocamento = v * t");
    }
    // Mesmo sem conhecer a outra variável, um fator nulo exige Δx = 0.
    if (valores.deslocamento !== undefined && (valores.v === 0 || valores.t === 0)) {
        conferir(valores.deslocamento, 0, "deslocamento = 0 quando v = 0 ou t = 0");
    }

    atualizarDesconhecidos();
    if (!resultado.sucesso) return resultado;

    resultado.simulacaoPossivel = valores.v !== undefined;
    resultado.situacao = resultado.desconhecidos.length === 0 ? "determinado" : "parcial";

    if (resultado.desconhecidos.length > 0) {
        resultado.mensagens.push("Grandezas indeterminadas: " + resultado.desconhecidos.join(", ") + ".");
    }
    if (valores.v === 0 && valores.t === undefined) {
        resultado.mensagens.push("Em repouso, qualquer tempo não negativo mantém a mesma posição; não há um tempo único.");
    }
    if (valores.t === 0 && valores.v === undefined) {
        resultado.mensagens.push("No instante inicial, o deslocamento zero não determina a velocidade.");
    }
    resultado.mensagens.push(resultado.simulacaoPossivel
        ? "Movimento definido: é possível consultar o estado em qualquer tempo não negativo."
        : "Dados insuficientes para determinar a trajetória: falta conhecer a velocidade.");

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

    const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
    if (!Number.isFinite(valores.x0) || !Number.isFinite(valores.v)) {
        estado.mensagens.push("O resultado não contém posição inicial e velocidade válidas.");
        return estado;
    }

    const posicao = valores.x0 + valores.v * entrada.valor;
    if (!Number.isFinite(posicao)) {
        estado.mensagens.push("O cálculo da posição excedeu o limite numérico.");
        return estado;
    }

    estado.sucesso = true;
    estado.t = entrada.valor;
    estado.x = posicao;
    estado.v = valores.v;
    estado.a = 0;
    return estado;
}
