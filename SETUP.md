# 🚀 Setup Barbearia Premium

## 📋 Instalação do Back-end

Este projeto possui um sistema de setup SQL **universal** que funciona em qualquer conta Supabase (limpa ou existente).

### 1️⃣ Configurar Supabase

Edite o arquivo `src/lib/supabase.ts` e atualize com suas credenciais:

```typescript
const supabaseUrl = 'SUA_URL_AQUI';
const supabaseAnonKey = 'SUA_CHAVE_ANON_AQUI';
```

### 2️⃣ Executar Scripts SQL

Execute os scripts **nesta ordem** no SQL Editor do Supabase:

1. **`database-schema.sql`** - Cria todas as tabelas, funções e policies
2. **`storage-setup.sql`** - Configura o bucket de storage (limite 2MB)

**⚠️ IMPORTANTE:**
Execute os scripts via **SQL Editor** do Supabase Dashboard para evitar erros de permissão.

### 3️⃣ Estrutura do Sistema

#### 🔐 Tipos de Contas

O sistema possui 3 tipos de usuários:

1. **Administradores** (`auth.users`)
   - Login via Supabase Auth (email/senha)
   - Acesso total ao sistema
   - Gerenciar barbeiros, serviços, relatórios

2. **Barbeiros** (tabela `barbeiros`)
   - Criados pelo administrador
   - Autenticação própria (tabela separada)
   - Gerenciar agenda e atendimentos

3. **Clientes** (tabela `clientes`)
   - Cadastro livre pelo site
   - Autenticação própria (tabela separada)
   - Fazer agendamentos

#### 📊 Tabelas Principais

- `profiles` - Perfis dos administradores
- `user_roles` - Roles de segurança (admin, user)
- `barbeiros` - Dados dos barbeiros
- `clientes` - Dados dos clientes
- `servicos` - Serviços oferecidos
- `agendamentos` - Agendamentos dos clientes

#### 🔧 Funções Disponíveis

- `create_barbeiro(nome, email, senha, telefone)` - Criar barbeiro
- `create_cliente(nome, email, senha, telefone)` - Criar cliente
- `authenticate_barbeiro(email, senha)` - Login barbeiro
- `authenticate_cliente(email, senha)` - Login cliente
- `is_admin(user_id)` - Verificar se é admin
- `has_role(user_id, role)` - Verificar role específica

#### 📁 Storage

**Bucket:** `barbearia`
- **Limite:** 2MB por arquivo
- **Tipos:** JPEG, PNG, WEBP
- **Pasta:** `avatars/` - Fotos de perfil

### 4️⃣ Criar Primeiro Admin

Após executar os scripts, crie seu primeiro administrador:

1. Acesse: Authentication > Users no Supabase
2. Clique em "Add User" > "Create new user"
3. Preencha email e senha
4. O trigger criará automaticamente o perfil e role admin

### ✅ Pronto!

Seu sistema está configurado e pronto para uso. Acesse:
- `/admin/auth` - Login administrativo
- `/cliente/auth` - Login/Cadastro cliente
- `/barbeiro/auth` - Login barbeiro

## 🛠️ Características

✅ SQL universal (funciona em conta limpa ou existente)  
✅ Limpeza automática de dados antigos  
✅ RLS configurado corretamente  
✅ Funções de segurança com SECURITY DEFINER  
✅ Senhas criptografadas com bcrypt  
✅ Storage com limite de 2MB  
✅ Dados iniciais de serviços  

## 📝 Notas

- Execute sempre `database-schema.sql` **ANTES** de `storage-setup.sql`
- Os scripts são idempotentes (podem ser executados múltiplas vezes)
- Todos os administradores em `auth.users` têm acesso total
- Barbeiros e clientes não têm acesso ao painel admin
