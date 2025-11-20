# 🤖 Documentação da IA - Processamento de Áudio

## 📋 Visão Geral

Sistema de processamento de áudio para extração **LITERAL** de peças/materiais e serviços mencionados por técnicos de campo.

### ✨ Características Principais

- ✅ **Extração Literal**: Zero interpretação - extrai EXATAMENTE o que é dito
- ✅ **Sistema de Confiança**: Apenas itens com confiança >= 80% são retornados
- ✅ **Formato Estruturado**: JSON padronizado e consistente
- ✅ **Filtro Automático**: Descarta itens com baixa confiança

---

## 🎯 Regras de Extração

### Regra #1: LITERAL, não interpretação
```
❌ ERRADO: Áudio diz "compressor" → IA escreve "condensador"
✅ CORRETO: Áudio diz "compressor" → IA escreve "compressor"
```

### Regra #2: Confiança Mínima de 80%
```
✅ Confiança 95% → INCLUÍDO
✅ Confiança 80% → INCLUÍDO
❌ Confiança 75% → DESCARTADO (não aparece no resultado)
```

### Regra #3: Se não tiver certeza, não inclua
```
Se o áudio está com ruído ou não está claro, 
o item NÃO será incluído no resultado.
```

---

## 📤 Endpoint

### POST `/ai/process-audio`

**Body da Requisição:**
```json
{
  "audioData": "base64_encoded_audio_data",
  "audioFormat": "wav",
  "uid": "user_id_opcional",
  "clientId": "client_id_opcional"
}
```

**Formatos de Áudio Suportados:**
- `wav` (padrão)
- `mp3`
- `ogg`
- `webm`
- `flac`

---

## 📥 Formato de Resposta

### Exemplo de Sucesso

```json
{
  "success": true,
  "message": "Áudio processado com sucesso",
  "data": {
    "pecas_materiais": [
      {
        "material1": "compressor",
        "quantidade": "2",
        "confianca": 95
      },
      {
        "material2": "gás R22",
        "quantidade": null,
        "confianca": 88
      },
      {
        "material3": "filtro secador",
        "quantidade": "1",
        "confianca": 92
      }
    ],
    "servicos": [
      {
        "servico1": "recarga de gás",
        "confianca": 90
      },
      {
        "servico2": "limpeza de sistema",
        "confianca": 85
      }
    ],
    "metadata": {
      "modelo_ia": "mistralai/voxtral-small-24b-2507",
      "processado_em": "2025-11-19T10:30:00.000Z",
      "formato_audio": "wav",
      "confianca_minima": 80,
      "tokens_utilizados": {
        "prompt_tokens": 150,
        "completion_tokens": 85,
        "total_tokens": 235
      },
      "total_pecas": 3,
      "total_servicos": 2
    }
  }
}
```

### Quando Nada é Detectado com Confiança

```json
{
  "success": true,
  "message": "Áudio processado com sucesso",
  "data": {
    "pecas_materiais": [],
    "servicos": [],
    "metadata": {
      "modelo_ia": "mistralai/voxtral-small-24b-2507",
      "processado_em": "2025-11-19T10:30:00.000Z",
      "formato_audio": "wav",
      "confianca_minima": 80,
      "total_pecas": 0,
      "total_servicos": 0
    }
  }
}
```

---

## 🔍 Exemplos de Uso

### Exemplo 1: Técnico menciona peças claramente

**Áudio:** "Precisei trocar o compressor e o filtro secador. Usei dois compressores de 12 mil BTUs."

**Resultado:**
```json
{
  "pecas_materiais": [
    {
      "material1": "compressor",
      "quantidade": "2",
      "confianca": 95
    },
    {
      "material2": "filtro secador",
      "quantidade": null,
      "confianca": 90
    }
  ],
  "servicos": []
}
```

### Exemplo 2: Técnico menciona serviços

**Áudio:** "Fiz a recarga de gás e limpeza completa do sistema"

**Resultado:**
```json
{
  "pecas_materiais": [],
  "servicos": [
    {
      "servico1": "recarga de gás",
      "confianca": 92
    },
    {
      "servico2": "limpeza completa do sistema",
      "confianca": 88
    }
  ]
}
```

### Exemplo 3: Áudio com ruído (baixa confiança)

**Áudio:** "[ruído]...comp...[ruído]...talvez....[ruído]"

**Resultado:**
```json
{
  "pecas_materiais": [],
  "servicos": []
}
```
*Nenhum item teve confiança >= 80%, portanto nada foi incluído.*

---

## ⚙️ Configuração

### Variáveis de Ambiente Necessárias

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
SITE_URL=https://climapp-1hxc.onrender.com
SITE_NAME=Climapp
```

### Verificar Status do Serviço

**GET** `/ai/status`

```json
{
  "success": true,
  "message": "Status do serviço de IA",
  "data": {
    "api_configured": true,
    "model": "mistralai/voxtral-small-24b-2507",
    "supported_formats": ["wav", "mp3", "ogg", "webm", "flac"],
    "endpoint": "/ai/process-audio",
    "status": "ready",
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}
```

---

## 🚨 Tratamento de Erros

### Erro 400: Dados Inválidos
```json
{
  "success": false,
  "message": "Dados de áudio são obrigatórios",
  "error": "MISSING_AUDIO_DATA"
}
```

### Erro 503: Serviço Indisponível
```json
{
  "success": false,
  "message": "Serviço de IA temporariamente indisponível",
  "error": "API error details",
  "timestamp": "2025-11-19T10:30:00.000Z"
}
```

### Erro 408: Timeout
```json
{
  "success": false,
  "message": "Timeout ao processar áudio. O arquivo pode ser muito grande",
  "timestamp": "2025-11-19T10:30:00.000Z"
}
```

---

## 📊 Modelo de IA Utilizado

**Modelo:** `mistralai/voxtral-small-24b-2507`
- Especializado em processamento de áudio
- Transcrição + análise em uma única chamada
- Suporte para múltiplos idiomas (PT-BR otimizado)

---

## 🎓 Boas Práticas

### ✅ DO (Faça)
- Envie áudios claros e sem muito ruído de fundo
- Use formato WAV ou MP3 para melhor qualidade
- Mantenha arquivos com tamanho razoável (< 10MB)
- Fale de forma clara mencionando peças e serviços

### ❌ DON'T (Não Faça)
- Não envie áudios muito longos (> 5 minutos)
- Não espere que a IA "adivinhe" informações não mencionadas
- Não confie em resultados com campos vazios se algo foi mencionado (pode indicar baixa confiança)

---

## 🔧 Troubleshooting

### Problema: Nenhum item retornado, mas mencionei peças
**Solução:** Verifique a qualidade do áudio. Se estiver com muito ruído, a confiança será baixa e os itens serão filtrados.

### Problema: Quantidade sempre null
**Solução:** Mencione explicitamente as quantidades no áudio. Ex: "dois compressores" ao invés de apenas "compressor".

### Problema: Timeout ao processar
**Solução:** Reduza o tamanho do arquivo ou divida em áudios menores.

---

## 📝 Changelog

### v2.0.0 (19/11/2025)
- ✨ **BREAKING CHANGE**: Nova estrutura de resposta
- ✨ Sistema de confiança com threshold de 80%
- ✨ Extração literal (zero interpretação)
- ✨ Filtro automático de baixa confiança
- 🗑️ Removido campo `audio_transcrito`
- 🗑️ Removido campo `problema_mencionado`

### v1.0.0
- 🎉 Versão inicial com transcrição e extração básica

---

## 📞 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.

**Última atualização:** 19 de novembro de 2025
