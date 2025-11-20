# 🚀 QUICK START - Sistema de Processamento de Áudio

## ⚡ INÍCIO RÁPIDO (5 Minutos)

### 1️⃣ Configurar API Key (1 min)

Crie/edite o arquivo `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
```

**Onde obter a chave?**
- Acesse: https://openrouter.ai/
- Faça login/cadastro
- Gere uma API Key
- Adicione créditos ($5 USD é suficiente para começar)

---

### 2️⃣ Iniciar o Servidor (1 min)

```powershell
# Se já estiver rodando, pule esta etapa
npm start
# ou
node index.js
```

**Verificar se está rodando:**
```powershell
curl http://localhost:10000/
```

Deve retornar: `"success": true`

---

### 3️⃣ Testar o Sistema (2 min)

#### Opção A: Teste Rápido (Status)
```powershell
curl http://localhost:10000/ai/status
```

**Resposta Esperada:**
```json
{
  "success": true,
  "data": {
    "api_configured": true,
    "status": "ready"
  }
}
```

#### Opção B: Teste Completo (PowerShell)
```powershell
.\test-audio-api.ps1
```

---

### 4️⃣ Processar Primeiro Áudio (1 min)

#### Passo 1: Grave um áudio de teste
Grave um áudio simples dizendo:
> "Preciso trocar dois compressores e fazer recarga de gás"

Salve como: `C:\teste.wav`

#### Passo 2: Processe no PowerShell
```powershell
# Abra o PowerShell no diretório do projeto
cd "C:\Users\Deivsson\Desktop\Workspace\App - Climapy\Back-end"

# Carregue as funções
. .\test-audio-api.ps1

# Processe o áudio
Process-Audio -AudioFilePath "C:\teste.wav"
```

#### Passo 3: Veja o resultado
```
✅ Resposta recebida:

📊 RESUMO DOS RESULTADOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 PEÇAS/MATERIAIS:
  • compressor (Qtd: 2, Confiança: 95%)

⚙️ SERVIÇOS:
  • recarga de gás (Confiança: 92%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 CASOS DE USO PRINCIPAIS

### Caso 1: Criar Orçamento de Áudio

```javascript
// No seu app
async function criarOrcamentoDeAudio(audioFile) {
  const base64 = await convertToBase64(audioFile);
  
  const response = await fetch('http://localhost:10000/ai/process-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioData: base64,
      audioFormat: 'wav',
      uid: currentUser.id
    })
  });
  
  const { data } = await response.json();
  
  // Adicionar ao orçamento
  data.pecas_materiais.forEach(item => {
    adicionarPecaAoOrcamento(item);
  });
  
  data.servicos.forEach(item => {
    adicionarServicoAoOrcamento(item);
  });
}
```

### Caso 2: Validar Áudio Antes de Processar

```javascript
function validarQualidadeAudio(data) {
  if (data.pecas_materiais.length === 0 && 
      data.servicos.length === 0) {
    alert('⚠️ Áudio não detectou itens. Por favor:' +
          '\n• Grave em ambiente silencioso' +
          '\n• Fale claramente' +
          '\n• Mencione peças e serviços');
    return false;
  }
  
  // Verificar confiança média
  const todasConfiancas = [
    ...data.pecas_materiais.map(p => p.confianca),
    ...data.servicos.map(s => s.confianca)
  ];
  
  const mediaConfianca = todasConfiancas.reduce((a,b) => a+b, 0) / todasConfiancas.length;
  
  if (mediaConfianca < 85) {
    if (!confirm(`⚠️ Confiança média: ${mediaConfianca}%\nDeseja revisar os itens?`)) {
      return false;
    }
  }
  
  return true;
}
```

---

## 📱 INTEGRAÇÃO COM FRONTEND

### React/React Native

```jsx
import React, { useState } from 'react';

function AudioProcessor() {
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  const processarAudio = async (audioBlob) => {
    setLoading(true);
    
    try {
      const base64 = await blobToBase64(audioBlob);
      
      const response = await fetch('http://localhost:10000/ai/process-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64.split(',')[1], // Remove "data:audio/wav;base64,"
          audioFormat: 'wav'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResultado(data.data);
      } else {
        alert('Erro ao processar áudio');
      }
    } catch (error) {
      console.error(error);
      alert('Erro na comunicação com a API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AudioRecorder onStop={processarAudio} />
      
      {loading && <p>Processando áudio...</p>}
      
      {resultado && (
        <div>
          <h3>🔧 Peças Detectadas:</h3>
          <ul>
            {resultado.pecas_materiais.map((item, idx) => (
              <li key={idx}>
                {Object.keys(item)
                  .filter(k => k.startsWith('material'))
                  .map(k => `${item[k]} (Qtd: ${item.quantidade || 'N/A'})`)
                }
                <span> - Confiança: {item.confianca}%</span>
              </li>
            ))}
          </ul>
          
          <h3>⚙️ Serviços Detectados:</h3>
          <ul>
            {resultado.servicos.map((item, idx) => (
              <li key={idx}>
                {Object.keys(item)
                  .filter(k => k.startsWith('servico'))
                  .map(k => item[k])
                }
                <span> - Confiança: {item.confianca}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Função auxiliar
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

---

## ⚠️ TROUBLESHOOTING RÁPIDO

### Problema: API retorna 401 Unauthorized
**Solução:** Verifique a `OPENROUTER_API_KEY` no `.env`

### Problema: Arrays vazios mesmo mencionando peças
**Solução:** Áudio com ruído. Grave novamente em local silencioso.

### Problema: Quantidade sempre null
**Solução:** Mencione quantidades explicitamente ("dois compressores")

### Problema: Timeout ao processar
**Solução:** Arquivo muito grande. Limite: ~5 minutos ou 10MB

---

## 📊 MONITORAMENTO

### Verificar Logs do Servidor

```powershell
# No terminal onde o servidor está rodando
# Você verá logs como:

🤖 Enviando áudio para processamento com Voxtral...
✅ Resposta recebida da API OpenRouter
✅ Áudio processado com sucesso: {
  pecas_count: 2,
  servicos_count: 1,
  confianca_minima: 80
}

# Se houver filtros:
⚠️ Material removido por baixa confiança (65%): { material1: "...", confianca: 65 }
```

---

## 🎓 DICAS PRO

### 1. Otimizar Custos
```javascript
// Só processar áudios > 3 segundos
if (audioDuration < 3) {
  alert('Áudio muito curto. Fale por pelo menos 3 segundos.');
  return;
}
```

### 2. Cache de Resultados
```javascript
// Evitar reprocessar o mesmo áudio
const audioHash = await hashAudio(audioData);
const cached = localStorage.getItem(audioHash);
if (cached) {
  return JSON.parse(cached);
}
```

### 3. Confirmação do Usuário
```javascript
// Sempre mostrar resultados antes de salvar
const confirmar = confirm(
  `Detectado:\n` +
  `${pecas.length} peças\n` +
  `${servicos.length} serviços\n\n` +
  `Deseja adicionar ao orçamento?`
);
```

---

## 📚 LINKS ÚTEIS

- **Documentação Completa**: `DOCUMENTACAO_IA.md`
- **Exemplos Práticos**: `EXEMPLOS_PRATICOS.md`
- **Implementação**: `IMPLEMENTACAO_COMPLETA.md`
- **README Principal**: `README_IA.md`

---

## ✅ CHECKLIST DE VALIDAÇÃO

Antes de usar em produção, confirme:

- [ ] API Key configurada no `.env`
- [ ] Servidor rodando (port 10000)
- [ ] Teste de status retorna "ready"
- [ ] Processou pelo menos 1 áudio de teste
- [ ] Validou extração literal funciona
- [ ] Verificou filtro de confiança ativo
- [ ] Testou cenário de áudio com ruído
- [ ] Integrou no frontend
- [ ] Adicionou validações de UX
- [ ] Logs funcionando corretamente

---

## 🚀 PRONTO PARA USAR!

Agora você tem:
✅ Sistema configurado  
✅ Testes funcionando  
✅ Documentação completa  
✅ Exemplos de integração  

**Próximo passo:** Integrar no seu aplicativo! 🎉

---

**Última atualização:** 19/11/2025  
**Tempo para começar:** ~5 minutos  
**Dificuldade:** ⭐⭐☆☆☆ (Fácil)
