# Barbearia Premium - Sistema de Agendamento

Sistema completo de gestão para barbearia com PWA, CRM integrado e múltiplos perfis de usuário.

**URL do Projeto**: https://lovable.dev/projects/6e59a979-fc3a-4361-bb43-48c5eefd7df1

## 🚀 Funcionalidades

### Para Clientes
- Cadastro e login seguro com senha criptografada (bcrypt)
- Visualização de barbeiros disponíveis
- Agendamento online de serviços
- Histórico de atendimentos
- Notificações de lembretes

### Para Barbeiros
- Painel personalizado
- Visualização de agenda
- Gerenciamento de atendimentos
- Edição de perfil e especialidades
- Login com credenciais criadas pelo admin

### Para Administradores
- Painel completo de administração
- Gestão de barbeiros e serviços
- Gerenciamento de valores
- Relatórios e métricas
- CRM integrado
- Autenticação via Supabase Auth

## 📱 PWA (Progressive Web App)

O app pode ser instalado em qualquer dispositivo:
- Android
- iOS
- Desktop

Ao acessar pelo navegador, o usuário verá um prompt oferecendo:
- **Instalar o App** - Instala como app nativo
- **Continuar pelo Navegador** - Usa diretamente no navegador

## 🗄️ Configuração do Banco de Dados

### Setup Inicial (Apenas uma vez ou ao clonar do GitHub)

1. Acesse seu projeto Supabase em: https://grneqgrgxusigsgskoxn.supabase.co
2. Vá em **SQL Editor**
3. Execute **PRIMEIRO** o script `database-schema.sql` (na raiz do projeto)
4. Execute **DEPOIS** o script `storage-setup.sql` (opcional, para upload de imagens)

> ⚠️ **IMPORTANTE**: Estes scripts são **IDEMPOTENTES** - podem ser executados múltiplas vezes sem erro. Sempre que clonar o projeto do GitHub, basta executá-los novamente.

### Criar Seu Primeiro Admin

1. Após executar os scripts SQL, crie manualmente um usuário no Supabase:
   - Vá em **Authentication** → **Users** → **Add User**
   - Email: seu-email@exemplo.com
   - Senha: sua-senha-segura
   - ✅ Auto Confirm User
   
2. Pronto! Todos os usuários em `auth.users` são **automaticamente ADMIN**

3. Faça login na rota `/admin/auth` com suas credenciais

### Estrutura de Autenticação

```
┌─────────────────────────────────────────────┐
│ ADMINISTRADORES (auth.users)                │
│ - Login: /admin/auth                        │
│ - Autenticação: Supabase Auth               │
│ - Permissões: TODAS                         │
└─────────────────────────────────────────────┘
           │
           ├─► Cria BARBEIROS (tabela própria)
           │   - Login: /barbeiro/auth (em desenvolvimento)
           │   - Senha: hash bcrypt
           │   - Permissões: ver agenda, confirmar serviços
           │
           └─► Gerencia sistema completo
           
┌─────────────────────────────────────────────┐
│ CLIENTES (tabela própria)                   │
│ - Login/Cadastro: /cliente/auth             │
│ - Autenticação: Custom (bcrypt)             │
│ - Permissões: agendar, ver histórico        │
└─────────────────────────────────────────────┘
```

## 🔒 Segurança

- ✅ Row Level Security (RLS) habilitado em todas as tabelas
- ✅ Autenticação via Supabase (admins)
- ✅ Senhas criptografadas com bcrypt (barbeiros/clientes)
- ✅ Funções SECURITY DEFINER para operações sensíveis
- ✅ Validação de input com constraints SQL
- ✅ Separação de roles em tabelas dedicadas

## 🎨 Design

- Tema escuro elegante com detalhes dourados
- Totalmente responsivo
- Animações suaves
- Design system consistente (HSL color tokens)

## 📦 Tecnologias

- **Frontend**: React + TypeScript + Vite
- **Estilização**: Tailwind CSS (semantic tokens)
- **UI Components**: shadcn/ui
- **Backend**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth + Custom (bcrypt)
- **PWA**: vite-plugin-pwa
- **Criptografia**: pgcrypto (bcrypt)

## 🚦 Como Rodar

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📝 Fluxo de Trabalho

### 1. Setup Inicial
1. Clone o projeto do GitHub
2. Execute `database-schema.sql` no Supabase SQL Editor
3. Execute `storage-setup.sql` (opcional)
4. Crie seu primeiro admin no Supabase Authentication

### 2. Configurar Sistema
1. Faça login como admin em `/admin/auth`
2. Configure os serviços e valores em "Gerenciar Serviços"
3. Adicione barbeiros à equipe em "Gerenciar Barbeiros"

### 3. Usar Sistema
- **Admins**: Login em `/admin/auth`
- **Barbeiros**: Login em `/barbeiro/auth` (em desenvolvimento)
- **Clientes**: Cadastro/Login em `/cliente/auth` (em desenvolvimento)

## 🔐 Scripts SQL

### database-schema.sql
- ✅ Drop e recria tudo (idempotente)
- ✅ Tabelas: profiles, clientes, barbeiros, servicos, agendamentos, interacoes
- ✅ Funções: create_barbeiro, create_cliente, authenticate_*
- ✅ RLS Policies completas
- ✅ Triggers de updated_at
- ✅ Dados iniciais (serviços)

### storage-setup.sql
- ✅ Bucket 'barbearia' com limite 5MB
- ✅ Pastas: avatars/, servicos/, temp/
- ✅ Policies para upload/download
- ✅ Aceita: JPEG, PNG, WebP, GIF

## 📱 Testando o PWA

1. Acesse o app pelo navegador do celular
2. Aceite instalar quando o prompt aparecer
3. O app será adicionado à tela inicial
4. Funciona offline após a primeira visita

## 🌐 Deploy

O app está pronto para deploy. Simplesmente abra [Lovable](https://lovable.dev/projects/6e59a979-fc3a-4361-bb43-48c5eefd7df1) e clique em Share → Publish.

**Não esqueça de configurar as URLs de redirect no Supabase após o deploy!**

## 🔧 Troubleshooting

### Erro "could not query the database for the schema cache"
- Aguarde 1-2 minutos após executar os scripts SQL
- O Supabase precisa atualizar o cache do schema
- Recarregue a página

### Erro ao criar barbeiro
- Verifique se você está logado como admin
- Confirme que os scripts SQL foram executados
- Senha deve ter mínimo 6 caracteres

### Storage não funciona
- Execute o `storage-setup.sql`
- Verifique se o bucket 'barbearia' existe
- Confirme que as policies foram criadas

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique se os scripts SQL foram executados corretamente
2. Confirme que está logado com o perfil correto
3. Veja o console do navegador para erros detalhados
