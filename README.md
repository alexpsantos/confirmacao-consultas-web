# Confirmação de Consultas — Web

Front-end React + TypeScript para a API de confirmação de consultas.

## Executar localmente

1. Inicie a API Spring Boot em `http://localhost:8080`.
2. Instale as dependências com `npm install`.
3. Inicie o front com `npm run dev`.
4. Acesse `http://localhost:5173`.

O login utiliza o `tenantId`, e-mail e senha já cadastrados na API.

## Configuração opcional

Para utilizar outra URL da API, crie um arquivo `.env.local`:

```env
VITE_API_URL=http://localhost:8080
```

## Funcionalidades atuais

- Login com JWT.
- Sessão local e logout.
- Dashboard com resumo do tenant.
- Listagem, cadastro, ativação e desativação de pacientes.
- Listagem, cadastro, ativação e desativação de usuários.
- Interface responsiva.
