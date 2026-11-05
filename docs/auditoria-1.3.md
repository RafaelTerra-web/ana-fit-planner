# Auditoria e recuperação · Anfit 1.3

Data de referência: 4 de novembro de 2026 (America/Sao_Paulo).

## Disponibilidade e causa

Durante a auditoria, `https://anfit.netlify.app` e `https://ana-fit-planner.vercel.app` responderam HTTP 200. Os arquivos JS/CSS e o manifesto offline estavam acessíveis. O projeto Supabase estava `ACTIVE_HEALTHY`, o endpoint Auth respondeu HTTP 200 com a chave pública e os registros do aplicativo estavam em objetos JSON válidos. As duas tabelas do Anfit possuem RLS habilitado.

Há um timeout recente registrado pelo PostgREST: `Warp server error: Thread killed by timeout manager`. Isso confirma uma falha na API, mas os dados disponíveis não permitem atribuir com certeza a ela a página de código vista anteriormente pela usuária. Não havia sessão administrativa ativa do Netlify para consultar o histórico completo da hospedagem.

Foram confirmadas duas falhas no cliente que transformavam indisponibilidades transitórias em bloqueio do aplicativo:

1. A abertura esperava `getSession`, a consulta dos dados e validações de `getUser`. Uma falha de rede ou um conflito impedia o acesso mesmo com uma cópia local da conta.
2. O service worker só usava o HTML em cache quando `fetch` lançava uma exceção. Respostas HTTP 5xx, conteúdo inválido e páginas de erro eram exibidas diretamente. Também não havia prazo máximo para a navegação, e o HTML em cache podia ser trocado sem seus respectivos arquivos JS/CSS.

## Correções da versão 1.3.0

- Abertura imediata pela conta e pelos dados já guardados no aparelho. A identidade local não concede acesso ao servidor: a sincronização valida o usuário no Auth e continua submetida ao RLS.
- Persistência síncrona das interações, marcador durável de envio por conta, aviso quando a gravação local falha e manutenção dos dados ao sair da conta.
- Sincronização na reconexão, ao retornar ao app, depois de alterações e em intervalos de 30 segundos enquanto visível. Requests têm timeout; a interface continua funcionando durante falhas.
- Comparação da versão remota antes de gravar, snapshot da última sincronização, combinação de alterações independentes e resolução de conflitos nos Ajustes. Edições durante um envio não são marcadas como já enviadas.
- Preservação do plano nutricional administrado, isolamento entre contas, logout explícito e preferência de expiração local.
- Fallback para cache em erros HTTP, conteúdo inválido e navegação acima de 3,5 segundos. Atualizações não substituem o HTML offline por uma versão sem seus arquivos em cache. O cache anterior é mantido para abas ainda abertas.

## Validação

- `npm run lint`, 26 testes de domínio/interação, renderização das cinco áreas e build de produção.
- Testes novos cobrem conta offline sem sessão online, logout, isolamento, fechamento/reabertura, fila pendente, reconexão automática, alterações concorrentes, conflitos, edição durante envio, falha temporária da API e proteção do plano atribuído.
- Testes do service worker cobrem HTTP 503, conteúdo inválido, página HTML de erro com status 200, falta de conexão, timeout e integridade de versões.
- Em navegador real, a rede foi desligada após o cache ficar pronto. Foi possível reabrir, marcar hidratação, iniciar treino, concluir uma série de 20 kg/10 repetições e reabrir novamente mantendo a série e o descanso. Dados fictícios foram usados somente no servidor local.
- `npm audit --omit=dev`: nenhuma vulnerabilidade reportada nas dependências de produção.

## Limites

Primeiro login no aparelho, criação/recuperação de conta e push precisam de internet. A atualização precisa ser aberta online uma vez. A sincronização depende do aplicativo aberto e pode ser suspensa pelo sistema operacional. Dados ainda não enviados dependem do armazenamento do navegador; a exportação em Ajustes oferece uma cópia adicional.

O banco é compartilhado com outros aplicativos. Avisos de performance alheios às tabelas do Anfit não foram alterados. O advisor também indicou proteção contra senhas vazadas desativada e permissões de execução amplas na função de trigger `anfit_handle_new_user`; não foi feita mudança global de autenticação nesta atualização.
