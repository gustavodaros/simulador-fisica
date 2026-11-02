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

function numerosProximosMRU(primeiro, segundo) {
    if (!Number.isFinite(primeiro) || !Number.isFinite(segundo)) return false;
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
        if (!resultado.sucesso) return;
        resultado.sucesso = false;
        resultado.situacao = "erro";
        resultado.mensagens.push(mensagem);
    }

    function atualizarDesconhecidos() {
        resultado.desconhecidos = [];
        for (const nome of grandezas) {
            if (valores[nome] === undefined) {
                resultado.desconhecidos.push(nome);
            }
        }
    }

    if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
        registrarErro("Informe os dados do MRU em um objeto JavaScript.");
        atualizarDesconhecidos();
        return resultado;
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

    if (!resultado.sucesso) {
        atualizarDesconhecidos();
        return resultado;
    }

    if (valores.x0 === undefined) {
        valores.x0 = 0;
        resultado.assumidos.x0 = 0;
    }

    let houveCalculo;

    function calcular(nome, valor) {
        if (!Number.isFinite(valor) || (nome === "t" && valor < 0)) {
            registrarErro("Resultado inválido: verifique os dados e use tempo não negativo.");
            return;
        }
        valores[nome] = valor;
        resultado.calculados[nome] = valor;
        houveCalculo = true;
    }

    do {
        houveCalculo = false;

        if (valores.x !== undefined && valores.deslocamento === undefined) {
            calcular("deslocamento", valores.x - valores.x0);
        }
        if (valores.deslocamento !== undefined && valores.x === undefined) {
            calcular("x", valores.x0 + valores.deslocamento);
        }

        if (valores.deslocamento === undefined && valores.v !== undefined && valores.t !== undefined) {
            calcular("deslocamento", valores.v * valores.t);
        }
        if (valores.v === undefined && valores.deslocamento !== undefined && valores.t !== undefined && valores.t !== 0) {
            calcular("v", valores.deslocamento / valores.t);
        }
        if (valores.t === undefined && valores.deslocamento !== undefined && valores.v !== undefined && valores.v !== 0) {
            calcular("t", valores.deslocamento / valores.v);
        }

        if (valores.deslocamento === undefined && (valores.v === 0 || valores.t === 0)) {
            calcular("deslocamento", 0);
        }
    } while (resultado.sucesso && houveCalculo);

    if (valores.x !== undefined && valores.deslocamento !== undefined) {
        if (!numerosProximosMRU(valores.deslocamento, valores.x - valores.x0)) {
            registrarErro("Dados contraditórios: verifique as posições e o deslocamento.");
        }
    }
    if (valores.deslocamento !== undefined) {
        if (valores.v === 0 || valores.t === 0) {
            if (!numerosProximosMRU(valores.deslocamento, 0)) {
                registrarErro("Dados contraditórios: com velocidade ou tempo zero, o deslocamento deve ser zero.");
            }
        } else if (valores.v !== undefined && valores.t !== undefined) {
            if (!numerosProximosMRU(valores.deslocamento, valores.v * valores.t)) {
                registrarErro("Dados contraditórios: o deslocamento deve ser igual a v * t.");
            }
        }
    }

    atualizarDesconhecidos();
    if (!resultado.sucesso) return resultado;

    resultado.simulacaoPossivel = valores.v !== undefined;
    if (resultado.desconhecidos.length === 0) {
        resultado.situacao = "determinado";
    }

    if (valores.v === 0 && valores.t === undefined) {
        resultado.mensagens.push("Em repouso, qualquer tempo não negativo mantém a mesma posição; não há um tempo único.");
    }
    if (valores.t === 0 && valores.v === undefined) {
        resultado.mensagens.push("No instante inicial, o deslocamento zero não determina a velocidade.");
    }
    if (!resultado.simulacaoPossivel) {
        resultado.mensagens.push("Dados insuficientes para simular: falta determinar a velocidade.");
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
