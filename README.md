# Confirmação de Consultas — Web

Front-end React + TypeScript para a API de confirmação de consultas.

## Executar localmente

1. Inicie a API Spring Boot em `http://localhost:8080`.
2. Instale as dependências com `npm install`.
3. Inicie o front com `npm run dev`.
4. Acesse `http://localhost:5173`.

O login utiliza o e-mail e a senha cadastrados na API.

## Configuração opcional

Para utilizar outra URL da API, crie um arquivo `.env.local`:

```env
VITE_API_URL=http://localhost:8080
```

## Homologação local isolada

Use o perfil `homolog` para testar sem tocar no schema de desenvolvimento. A API usa o schema PostgreSQL `confirmacao_homolog_app`, a porta `8081` e o WhatsApp simulado.

1. No backend, inicie com o perfil `homolog`.
2. No frontend, execute `npm run dev:homolog`.
3. Acesse `http://127.0.0.1:4173`.

Na primeira inicialização são criados dados fictícios, incluindo o acesso `profissional.homolog@confirma.test` com a senha `Homologacao123`. Para iniciar sem essa massa, use `HOMOLOG_SEED=false`.

## Publicação

O frontend é compilado com a URL pública da API. Não coloque URL de produção em arquivos `.env` versionados.

```bash
docker build --build-arg VITE_API_URL=https://api.seu-dominio.com -t confirma-web .
```

Publique a imagem na porta `8080` e configure, no backend, `APP_SECURITY_CORS_ALLOWED_ORIGINS=https://seu-dominio.com`. A URL da API é incorporada no build: se ela mudar, gere uma nova imagem do frontend.

## Funcionalidades atuais

- Login com JWT.
- Sessão local e logout.
- Dashboard com resumo do tenant.
- Listagem, cadastro, ativação e desativação de pacientes.
- Listagem, cadastro, ativação e desativação de usuários.
- Interface responsiva.
