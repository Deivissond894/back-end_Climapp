# Climapp Backend API

Backend da aplicação Climapp com autenticação Firebase.

## 🚀 URL Base
```
https://climapp-1hxc.onrender.com
```

## 📋 Endpoints Disponíveis

### 🏠 Rota Principal
- **GET** `/` - Informações da API
  ```json
  {
    "success": true,
    "message": "API Climapp Backend está funcionando!",
    "baseUrl": "https://climapp-1hxc.onrender.com",
    "endpoints": { ... }
  }
  ```

### 🔐 Autenticação

#### 📝 Criar Usuário (Signup)
- **POST** `/auth/signup`
- **Body:**
  ```json
  {
    "email": "usuario@exemplo.com",
    "password": "senha123",
    "displayName": "Nome do Usuário" // opcional
  }
  ```
- **Resposta de Sucesso:**
  ```json
  {
    "success": true,
    "message": "Usuário criado com sucesso",
    "data": {
      "uid": "firebase_user_id",
      "email": "usuario@exemplo.com",
      "displayName": "Nome do Usuário",
      "customToken": "firebase_custom_token",
      "emailVerified": false
    }
  }
  ```

#### 🔑 Login
- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "usuario@exemplo.com",
    "password": "senha123"
  }
  ```
- **Resposta de Sucesso:**
  ```json
  {
    "success": true,
    "message": "Usuário encontrado",
    "data": {
      "uid": "firebase_user_id",
      "email": "usuario@exemplo.com",
      "displayName": "Nome do Usuário",
      "customToken": "firebase_custom_token",
      "emailVerified": false,
      "note": "Use este customToken no cliente para fazer signInWithCustomToken"
    }
  }
  ```

#### 🔄 Redefinir Senha (Forgot Password)
- **POST** `/auth/forgot-password`
- **Body:**
  ```json
  {
    "email": "usuario@exemplo.com"
  }
  ```
- **Resposta de Sucesso:**
  ```json
  {
    "success": true,
    "message": "Link de redefinição de senha gerado com sucesso",
    "data": {
      "email": "usuario@exemplo.com",
      "resetLink": "https://firebase_reset_link",
      "note": "Em produção, este link seria enviado por email"
    }
  }
  ```

#### 👤 Perfil do Usuário (Protegida)
- **GET** `/auth/profile`
- **Headers:** `Authorization: Bearer {firebase_id_token}`
- **Resposta de Sucesso:**
  ```json
  {
    "success": true,
    "message": "Perfil do usuário",
    "data": {
      "uid": "firebase_user_id",
      "email": "usuario@exemplo.com",
      "displayName": "Nome do Usuário",
      "emailVerified": false,
      "creationTime": "2025-10-21T...",
      "lastSignInTime": "2025-10-21T..."
    }
  }
  ```

### 🏥 Saúde da API
- **GET** `/health`
  ```json
  {
    "success": true,
    "message": "API está saudável",
    "timestamp": "2025-10-21T...",
    "uptime": 3600
  }
  ```

## 🛡️ Segurança

- **Rate Limiting:** 100 requests por 15 minutos por IP (geral), 5 requests por 15 minutos para autenticação
- **CORS:** Configurado para permitir requests do frontend
- **Helmet:** Headers de segurança configurados
- **Validação:** Validação rigorosa de dados de entrada com Joi

## 🔧 Códigos de Erro Comuns

### 400 - Bad Request
- Dados inválidos ou malformados
- Email com formato inválido
- Senha muito fraca (menos de 6 caracteres)

### 401 - Unauthorized
- Token não fornecido ou inválido
- Usuário não autenticado

### 404 - Not Found
- Usuário não encontrado
- Endpoint não existe

### 409 - Conflict
- Email já está em uso

### 429 - Too Many Requests
- Limite de rate limiting excedido

### 500 - Internal Server Error
- Erro interno do servidor
- Problema de conexão com Firebase

## 🚀 Como Usar no Cliente

### Exemplo com JavaScript/Fetch:

```javascript
// Signup
const signup = async (email, password, displayName) => {
  const response = await fetch('https://climapp-1hxc.onrender.com/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, displayName })
  });
  
  return await response.json();
};

// Login
const login = async (email, password) => {
  const response = await fetch('https://climapp-1hxc.onrender.com/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  return await response.json();
};

// Forgot Password
const forgotPassword = async (email) => {
  const response = await fetch('https://climapp-1hxc.onrender.com/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
  
  return await response.json();
};

// Profile (com token)
const getProfile = async (idToken) => {
  const response = await fetch('https://climapp-1hxc.onrender.com/auth/profile', {
    headers: {
      'Authorization': `Bearer ${idToken}`
    }
  });
  
  return await response.json();
};
```

## 📱 Integração com Firebase Client SDK

Após receber o `customToken` do backend, use-o no cliente:

```javascript
import { signInWithCustomToken } from 'firebase/auth';

// Usar o customToken recebido do backend
const loginWithCustomToken = async (customToken) => {
  try {
    const userCredential = await signInWithCustomToken(auth, customToken);
    const user = userCredential.user;
    console.log('Usuário logado:', user);
    return user;
  } catch (error) {
    console.error('Erro no login:', error);
  }
};
```

## 🔄 Desenvolvimento Local

Para rodar localmente:

```bash
npm install
npm start
```

O servidor estará disponível em `http://localhost:3000`