// Envio de formulários públicos para os endpoints protegidos do servidor.
export async function enviarFormulario(caminho: string, corpo: Record<string, unknown>) {
  let resposta: Response;
  try {
    resposta = await fetch(caminho, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
  } catch {
    throw new Error("Sem conexão. Verifique sua internet e tente de novo.");
  }
  const dados = (await resposta.json().catch(() => ({}))) as { erro?: string; [k: string]: unknown };
  if (!resposta.ok) {
    const erro = new Error(dados.erro || "Não foi possível enviar agora. Tente novamente.") as Error & {
      status?: number;
    };
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

export function novoId() {
  return crypto.randomUUID();
}
