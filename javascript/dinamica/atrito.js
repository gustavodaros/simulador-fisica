//atrito: bloco sobre superfície horizontal e puxado por força horizontal

function lerNumeroAtrito(valor){
    if (valor === undefined || valor === null) return {ausente: true};
    if (typeof valor === "string"){
        valor = valor.trim();
        if (valor === "") return {ausente: true};
        const formato = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i;
        if (!formato.test(valor)) return {erro: true};
        valor = Number(valor.replace(",", "."));
    }
    if (typeof valor != "number" || !Number.isFinite(valor)) return {erro: true};
    return {valor: valor};
}

function numerosProximosAtrito(primeiro, segundo){
    return Math.abs(primeiro - segundo) <= 1e-9 * Math.max(1, Math.abs(primeiro), Math.abs(segundo));
}

function resolverAtrito(dados = {}){
    const grandezas = ["m", "F", "mue", "muc", "g", "v0", "x0"];
    const resultado = {
        movimento: "ATRITO", sucesso: true, situacao: "parcial", regime: null, fornecidos: {},
        assumidos: {}, calculados: {}, desconhecidos: [], simulacaoPossivel: false, solucoes: [], mensagens: []
    };
    const valores = {};

    function falhar(mensagem){
        resultado.sucesso = false;
        resultado.situacao = "erro";
        resultado.simulacaoPossivel = false;
        if (!resultado.mensagens.includes(mensagem)) resultado.mensagens.push(mensagem);
    }

    function atualizarDesconhecidos(){
        resultado.desconhecidos = grandezas.filter(function(nome){
            return valores[nome] === undefined;
        });
    }

    function calcular(nome, valor){
        if (!Number.isFinite(valor)){
            falhar("O cálculo de " + nome + " excedeu o limite numérico.");
            return;
        }
        resultado.calculados[nome] = valor;
    }
    if (dados === null || typeof dados !== "object" || Array.isArray(dados)){
        falhar("Informe os dados do atrito em um objeto JavaScript.");
        atualizarDesconhecidos();
        return resultado;
    }
    for (const nome of Object.keys(dados)) {
        if (!grandezas.includes(nome)) falhar("Campo não reconhecido no atrito: " + nome + ".");
    }
    for (const nome of grandezas) {
        const entrada = lerNumeroAtrito(dados[nome]);
        if (entrada.erro) {
            falhar("O campo " + nome + " deve conter um número finito.");
        } else if (!entrada.ausente) {
            valores[nome] = entrada.valor;
            resultado.fornecidos[nome] = entrada.valor;
        }
    }
 
    if (valores.m !== undefined && valores.m <= 0) falhar("Valor da massa deve ser positivo.");
    if (valores.g !== undefined && valores.g <= 0) falhar("A gravidade g deve ser positiva.");
    if (valores.F !== undefined && valores.F < 0) falhar("A força aplicada F não pode ser negativa, o modelo usa o sentido +x.");
    if (valores.v0 !== undefined && valores.v0 < 0) falhar("A velocidade inicial não pode ser negativa, o modelo usa o sentido +x.");
    for (const nome of ["mue", "muc"]) {
        if (valores[nome] !== undefined && valores[nome] < 0) falhar("Os coeficientes de atrito não podem ser negativos.");
    }
    if (valores.mue !== undefined && valores.muc !== undefined && valores.muc > valores.mue) {
        falhar("O coeficiente cinético (muc) não pode ser maior que o estático (mue).");
    }
 
    //entrada inválida não deve ser substituída por um valor padrão.
    if (!resultado.sucesso) {
        atualizarDesconhecidos();
        return resultado;
    }
    if (valores.g === undefined) {
        valores.g = 9.81;
        resultado.assumidos.g = 9.81;
        resultado.mensagens.push("Gravidade não informada: adotado g = 9.81 m/s².");
    }
    if (valores.v0 === undefined) {
        valores.v0 = 0;
        resultado.assumidos.v0 = 0;
        resultado.mensagens.push("Velocidade inicial não informada: adotado v0 = 0 m/s.");
    }
    if (valores.x0 === undefined) {
        valores.x0 = 0;
        resultado.assumidos.x0 = 0;
        resultado.mensagens.push("Posição inicial não informada: adotado x0 = 0 m.");
    }
 
    //sem m, F e os dois coeficientes não há como decidir entre repouso e deslizamento.
    atualizarDesconhecidos();
    if (resultado.desconhecidos.length > 0) {
        resultado.mensagens.push("Dados insuficientes para simular: informe " + resultado.desconhecidos.join(", ") + ".");
        return resultado;
    }
 
    const { m, F, mue, muc, g, v0 } = valores;
    const normal = m * g;                 //N = m*g em superfície horizontal
    const fatMax = mue * normal;          //atrito estático máximo
    const fatCinetico = muc * normal;
 
    //bloco só permanece parado se já estava parado e F não vence o atrito estático máximo.
    const repouso = v0 === 0 && (F <= fatMax || numerosProximosAtrito(F, fatMax));
    const fat = repouso ? F : fatCinetico;
    const fres = (repouso || numerosProximosAtrito(F, fatCinetico)) ? 0 : F - fatCinetico;
    const a = fres / m;
 
    calcular("N", normal);
    calcular("fatMax", fatMax);
    calcular("Fat", fat);
    calcular("Fres", fres);
    calcular("a", a);
 
    //a < 0 só ocorre com v0 > 0: o bloco desacelera até parar e depois fica em repouso, pois F < muc*N <= mue*N.
    if (!repouso && a < 0) {
        calcular("tempoParada", -v0 / a);
        calcular("distanciaParada", v0 * v0 / (-2 * a));
    }
    if (!resultado.sucesso) return resultado;
    resultado.regime = repouso ? "repouso" : "deslizando";
    resultado.simulacaoPossivel = true;
    resultado.situacao = "determinado";
 
    if (repouso) {
        resultado.mensagens.push("A força aplicada não supera o atrito estático máximo: o bloco permanece em repouso.");
    } else if (v0 === 0) {
        resultado.mensagens.push("A força aplicada supera o atrito estático máximo: o bloco começa a deslizar.");
    } else if (a < 0) {
        resultado.mensagens.push("O atrito cinético supera F: o bloco desacelera e para em tempoParada.");
    } else {
        resultado.mensagens.push("O bloco desliza com aceleração a = (F - atrito cinético) / m.");
    }
    return resultado;
}
 
function estadoAtrito(resultado, tempo) {
    const estado = { movimento: "ATRITO", sucesso: false, mensagens: [] };
    if (!resultado || resultado.movimento !== "ATRITO" || resultado.sucesso !== true || resultado.simulacaoPossivel !== true) {
        estado.mensagens.push("Resolva um problema de atrito com dados completos antes de consultar seu estado.");
        return estado;
    }
    const entrada = lerNumeroAtrito(tempo);
    if (entrada.erro || entrada.ausente || entrada.valor < 0) {
        estado.mensagens.push("Informe um tempo finito e não negativo para a consulta.");
        return estado;
    }
    const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
    if (![valores.x0, valores.v0, valores.F, valores.a, valores.Fat].every(Number.isFinite)) {
        estado.mensagens.push("O resultado não contém condições iniciais válidas.");
        return estado;
    }
    const t = entrada.valor;
    const parou = valores.tempoParada !== undefined && t >= valores.tempoParada;
    let x, v, a, fat, fres, regime;
 
    if (resultado.regime === "repouso") {
        x = valores.x0; v = 0; a = 0; fat = valores.F; fres = 0; regime = "repouso";
    } else if (parou) {
        // Depois de parar, o atrito estático equilibra exatamente a força aplicada.
        x = valores.x0 + valores.distanciaParada; v = 0; a = 0; fat = valores.F; fres = 0; regime = "repouso";
    } else {
        x = valores.x0 + valores.v0 * t + valores.a * t * t / 2;
        v = valores.v0 + valores.a * t;
        a = valores.a; fat = valores.Fat; fres = valores.Fres; regime = "deslizando";
    }
 
    if (![x, v].every(Number.isFinite)) {
        estado.mensagens.push("A consulta excedeu o limite numérico.");
        return estado;
    }
 
    return {
        movimento: "ATRITO", sucesso: true, t: t, x: x, v: v, a: a,
        F: valores.F, Fat: fat, Fres: fres, regime: regime, mensagens: []
    };
}
