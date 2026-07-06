# HideNihon Journey

## Banco de dados gratuito

O app usa Supabase no plano free para autenticação e progresso por usuário. Ele funciona bem no deploy da Vercel porque o frontend acessa o Supabase diretamente com a chave pública `anon`, protegido por RLS.

## Configuração

1. Crie um projeto em https://supabase.com.
2. No Supabase, abra `SQL Editor` e execute `supabase/schema.sql`.
3. Em `Authentication > Providers`, deixe `Email` habilitado.
4. Configure estas variáveis na Vercel e no `.env.local` local:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

`VITE_SUPABASE_ANON_KEY` ainda funciona, mas `VITE_SUPABASE_PUBLISHABLE_KEY` é o nome recomendado para novas chaves públicas do Supabase. Não use `SUPABASE_SERVICE_ROLE_KEY` no frontend ou em qualquer variável com prefixo `VITE_`.

## Usuário seed

O projeto não versiona credenciais de usuário de teste. Para testar localmente, crie uma conta pela tela de cadastro ou pelo painel do Supabase Auth.

Cada usuário entra ou cria conta por e-mail/senha, e o progresso é salvo na tabela `user_progress` usando o `auth.uid()` do Supabase.

## Checklist de produção

Ative a proteção contra senhas vazadas no painel do Supabase Auth antes de liberar produção. Essa opção é uma configuração hospedada do projeto (`password_hibp_enabled`) e não possui chave versionável no `supabase/config.toml` atual.
