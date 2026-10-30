//segunda lei de newton
function lerNumeroNewton(valor){
    if (valor === undefined || valor === null) return {ausente: true};
    if (typeof valor === "string"){
        valor = valor.trim();
        if (valor === "") return {ausente: true};
        const formato = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i;
        if (!formato.test(valor)) return {erro: true};
        valor = Number(valor.replace(",", "."));
    }
    if (typeof valor !== "number" || !Number.isFinite(valor)) return {erro: true};
    return {valor: valor};
}

function numerosProximosNewton(primeiro, segundo){
    //tolerância absoluta perto de zero e relativa para valores maiores.
    return Math.abs(primeiro - segundo) <= 1e-9 * Math.max(1, Math.abs(primeiro), Math.abs(segundo));
}
 
function resolverNewton(dados = {}){
    const grandezas = ["m", "F", "a", "x0", "v0"];
    const resultado = {
        movimento: "NEWTON", sucesso: true, situacao: "parcial",
        fornecidos: {}, assumidos: {}, calculados: {}, desconhecidos: [],
        simulacaoPossivel: false, solucoes: [], mensagens: []
    };
    const valores = {};
 
    function falhar(mensagem){
        resultado.sucesso = false;
        resultado.situacao = "erro";
        resultado.simulacaoPossivel = false;
        if (!resultado.mensagens.includes(mensagem)) resultado.mensagens.push(mensagem);
    }
 
    function atualizarDesconhecidos(){
        resultado.desconhecidos = grandezas.filter(function (nome){
            return valores[nome] === undefined;
        });
    }
 
    function calcular(nome, valor){
        if (!Number.isFinite(valor)) {
            falhar("O cálculo de " + nome + " excedeu o limite numérico!");
            return;
        }
        valores[nome] = valor;
        resultado.calculados[nome] = valor;
    }
 
    if (dados === null || typeof dados !== "object" || Array.isArray(dados)){
        falhar("Informe os dados da Segunda Lei de Newton em um objeto JavaScript.");
        atualizarDesconhecidos();
        return resultado;
    }
 
    for (const nome of Object.keys(dados)){
        if (!grandezas.includes(nome)) falhar("Campo não reconhecido em Newton: " + nome + ".");
    }
    for (const nome of grandezas){
        const entrada = lerNumeroNewton(dados[nome]);
        if (entrada.erro) {
            falhar("O campo " + nome + " deve conter um número finito.");
        } else if (!entrada.ausente) {
            valores[nome] = entrada.valor;
            resultado.fornecidos[nome] = entrada.valor;
        }
    }
    if (valores.m !== undefined && valores.m <= 0) falhar("Valor da massa deve ser positivo.");
 
    //entrada inválida não é substituída por valor padrão
    if (!resultado.sucesso){
        atualizarDesconhecidos();
        return resultado;
    }
    if (valores.x0 === undefined){
        valores.x0 = 0;
        resultado.assumidos.x0 = 0;
        resultado.mensagens.push("Posição inicial não informada! Adotado x0 = 0 m.");
    }
    if (valores.v0 === undefined){
        valores.v0 = 0;
        resultado.assumidos.v0 = 0;
        resultado.mensagens.push("Velocidade inicial não informada! Adotado v0 = 0 m/s.");
    }
 
    //F = m * a: com duas das três grandezas, a terceira fica determinada.
    const { m, F, a } = valores;
    if (m !== undefined && F !== undefined && a !== undefined){
        const esperado = m * a;
        if (!Number.isFinite(esperado)) {
            falhar("A verificação de F = m * a excedeu o limite numérico.");
        } else if (!numerosProximosNewton(F, esperado)) {
            falhar("Dados contraditórios! Não satisfazem F = m * a.");
        }
    } else if (m !== undefined && F !== undefined){
        calcular("a", F / m);
    } else if (m !== undefined && a !== undefined){
        calcular("F", m * a);
    } else if (F !== undefined && a !== undefined){
        if (a === 0 && F !== 0) {
            falhar("Dados contraditórios! F diferente de zero exige a diferente de zero.");
        } else if (a === 0) {
            resultado.mensagens.push("Com F = 0 e a = 0, a massa pode ter qualquer valor positivo.");
        } else if (F / a <= 0) {
            falhar("Dados incompatíveis! A massa calculada não é positiva.");
        } else {
            calcular("m", F / a);
        }
    }
 
    atualizarDesconhecidos();
    if (!resultado.sucesso) return resultado;
    resultado.simulacaoPossivel = valores.a !== undefined;
    resultado.situacao = resultado.desconhecidos.length === 0 ? "determinado" : "parcial";
 
    if (resultado.desconhecidos.length > 0) {
        resultado.mensagens.push("Grandezas indeterminadas: " + resultado.desconhecidos.join(", ") + ".");
    }
    resultado.mensagens.push(resultado.simulacaoPossivel
        ? "Movimento definido: é possível consultar o estado em qualquer tempo não negativo."
        : "Dados insuficientes para determinar o movimento: informe a aceleração, ou a massa e a força.");
    return resultado;
}
 
function estadoNewton(resultado, tempo){
    const estado = { movimento: "NEWTON", sucesso: false, mensagens: [] };
    if (!resultado || resultado.movimento !== "NEWTON" || resultado.sucesso !== true || resultado.simulacaoPossivel !== true) {
        estado.mensagens.push("Resolva um problema de Newton com movimento definido antes de consultar seu estado.");
        return estado;
    }
    const entrada = lerNumeroNewton(tempo);
    if (entrada.erro || entrada.ausente || entrada.valor < 0) {
        estado.mensagens.push("Informe um tempo finito e não negativo para a consulta.");
        return estado;
    }
    const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
    if (![valores.x0, valores.v0, valores.a].every(Number.isFinite)) {
        estado.mensagens.push("O resultado não contém condições iniciais válidas.");
        return estado;
    }
 
    //força resultante constante: aceleração constante (MRUV).
    const t = entrada.valor;
    const x = valores.x0 + valores.v0 * t + valores.a * t * t / 2;
    const v = valores.v0 + valores.a * t;
    if (![x, v].every(Number.isFinite)) {
        estado.mensagens.push("A consulta excedeu o limite numérico.");
        return estado;
    }
    return { movimento: "NEWTON", sucesso: true, t: t, x: x, v: v, a: valores.a, F: valores.F, m: valores.m, mensagens: [] };
}