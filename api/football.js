// Vercel Serverless Function — faz proxy pra football-data.org escondendo o token.
// O front-end chama /api/football?path=/competitions/PL/teams em vez de bater
// direto na API (o que causava erro de CORS no navegador).
//
// IMPORTANTE: configure a variável de ambiente FOOTBALL_DATA_TOKEN no painel
// da Vercel (Project Settings > Environment Variables). Não coloque o token
// aqui no código.

export default async function handler(req, res) {
  // Libera chamadas vindas do seu site no GitHub Pages (ajuste se mudar de domínio)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  if (!path || !path.startsWith('/')) {
    return res.status(400).json({ error: 'parâmetro "path" ausente ou inválido' });
  }

  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'FOOTBALL_DATA_TOKEN não configurado no servidor' });
  }

  try {
    const apiRes = await fetch('https://api.football-data.org/v4' + path, {
      headers: { 'X-Auth-Token': token }
    });
    const data = await apiRes.json();
    return res.status(apiRes.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'falha ao consultar football-data.org: ' + e.message });
  }
}
