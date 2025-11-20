# 📊 EXEMPLOS PRÁTICOS - Sistema de Processamento de Áudio

## 🎯 Cenário 1: Extração Literal Funciona Perfeitamente

### Entrada (Áudio do Técnico):
```
"Boa tarde, cheguei no local e identifiquei que 
preciso trocar o compressor. Vou usar dois compressores 
de 12 mil BTUs e também vou trocar o filtro secador. 
Depois faço a recarga de gás R22."
```

### Saída da API:
```json
{
  "success": true,
  "data": {
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
      },
      {
        "material3": "gás R22",
        "quantidade": null,
        "confianca": 88
      }
    ],
    "servicos": [
      {
        "servico1": "recarga de gás R22",
        "confianca": 92
      }
    ],
    "metadata": {
      "total_pecas": 3,
      "total_servicos": 1,
      "confianca_minima": 80
    }
  }
}
```

### ✅ Por que funcionou?
- ✅ Técnico falou claramente
- ✅ Mencionou quantidades explicitamente
- ✅ Sem ruído no áudio
- ✅ Termos técnicos precisos

---

## 🎯 Cenário 2: Sistema Filtra Baixa Confiança

### Entrada (Áudio com Ruído):
```
"[ruído de vento] ...preciso trocar... [ruído]
...talvez o comp... [barulho de trânsito]
...ou seria o condensador... [ruído]"
```

### Processamento Interno da IA:
```json
{
  "pecas_materiais": [
    {
      "material1": "comp...",
      "quantidade": null,
      "confianca": 45  // ❌ ABAIXO DE 80%
    },
    {
      "material2": "condensador",
      "quantidade": null,
      "confianca": 60  // ❌ ABAIXO DE 80%
    }
  ],
  "servicos": []
}
```

### Saída da API (Após Filtro):
```json
{
  "success": true,
  "data": {
    "pecas_materiais": [],  // ⚠️ VAZIO - Itens filtrados
    "servicos": [],
    "metadata": {
      "total_pecas": 0,
      "total_servicos": 0,
      "confianca_minima": 80
    }
  }
}
```

### 🛡️ O que aconteceu?
- ⚠️ Áudio com muito ruído
- ⚠️ Palavras incompletas ("comp...")
- ⚠️ Confiança abaixo de 80%
- ✅ **Sistema protegeu contra dados incorretos**

### 💡 Console Logs:
```
⚠️ Material removido por baixa confiança (45%): { material1: "comp...", confianca: 45 }
⚠️ Material removido por baixa confiança (60%): { material2: "condensador", confianca: 60 }
```

---

## 🎯 Cenário 3: Extração Literal vs Interpretação

### ❌ ANTES (Sistema Antigo - Com Interpretação)

**Áudio:** "Preciso trocar o compressor"

**Saída Antiga:**
```json
{
  "pecas_mencionadas": [
    "condensador",  // ❌ ERRADO! IA "interpretou"
    "motor",        // ❌ ERRADO! IA "deduziu"
    "capacitor"     // ❌ ERRADO! IA "assumiu"
  ]
}
```

### ✅ AGORA (Sistema Novo - Literal)

**Áudio:** "Preciso trocar o compressor"

**Saída Nova:**
```json
{
  "pecas_materiais": [
    {
      "material1": "compressor",  // ✅ CORRETO! Literal
      "quantidade": null,
      "confianca": 95
    }
  ],
  "servicos": []
}
```

---

## 🎯 Cenário 4: Múltiplas Peças e Serviços

### Entrada:
```
"Cliente solicitou manutenção completa. 
Troquei três filtros secadores, 
um compressor Tecumseh de 18 mil BTUs, 
dois metros de tubulação de cobre de meia polegada.
Fiz a limpeza do sistema, 
soldagem das conexões e 
recarga com gás R410A."
```

### Saída:
```json
{
  "success": true,
  "data": {
    "pecas_materiais": [
      {
        "material1": "filtro secador",
        "quantidade": "3",
        "confianca": 96
      },
      {
        "material2": "compressor Tecumseh",
        "quantidade": "1",
        "confianca": 98
      },
      {
        "material3": "tubulação de cobre de meia polegada",
        "quantidade": "2",
        "confianca": 92
      },
      {
        "material4": "gás R410A",
        "quantidade": null,
        "confianca": 94
      }
    ],
    "servicos": [
      {
        "servico1": "limpeza do sistema",
        "confianca": 95
      },
      {
        "servico2": "soldagem das conexões",
        "confianca": 90
      },
      {
        "servico3": "recarga com gás R410A",
        "confianca": 93
      }
    ],
    "metadata": {
      "total_pecas": 4,
      "total_servicos": 3,
      "confianca_minima": 80
    }
  }
}
```

### 🎯 Destaques:
- ✅ Manteve marca "Tecumseh" (literal)
- ✅ Preservou detalhes técnicos "meia polegada"
- ✅ Identificou tipo de gás específico "R410A"
- ✅ Separou corretamente peças e serviços

---

## 🎯 Cenário 5: Áudio com Gírias/Termos Coloquiais

### Entrada:
```
"Troquei o 'comp' lá do cara. 
O negócio tava zuado mesmo. 
Botei um 'compressor novo' e 
fiz a 'recarga do gás'."
```

### Saída:
```json
{
  "pecas_materiais": [
    {
      "material1": "compressor novo",  // Literal!
      "quantidade": "1",
      "confianca": 88
    }
  ],
  "servicos": [
    {
      "servico1": "recarga do gás",  // Literal!
      "confianca": 85
    }
  ]
}
```

### ⚠️ Nota sobre "comp":
```
"comp" teve confiança de 70% (abaixo de 80%)
Foi filtrado automaticamente.
Apenas "compressor novo" (88%) passou.
```

---

## 📊 Estatísticas de Confiança

### Tabela de Exemplos Reais

| Termo Mencionado | Confiança | Status | Motivo |
|------------------|-----------|--------|--------|
| "compressor" (claro) | 95% | ✅ Incluído | Palavra clara |
| "filtro secador" | 90% | ✅ Incluído | Termo técnico conhecido |
| "comp..." (cortado) | 45% | ❌ Filtrado | Palavra incompleta |
| "gás R22" | 92% | ✅ Incluído | Código específico |
| "[ruído]..densa..[ruído]" | 30% | ❌ Filtrado | Muito ruído |
| "dois compressores" | 96% | ✅ Incluído | Quantidade + item claro |

---

## 🔍 Como Interpretar os Resultados

### Caso 1: Arrays Vazios
```json
{
  "pecas_materiais": [],
  "servicos": []
}
```

**Significado:**
- ⚠️ Nada foi detectado com confiança >= 80%
- ⚠️ Pode ser áudio com ruído
- ⚠️ Ou técnico não mencionou peças/serviços

**Ação Recomendada:**
- 🔄 Gravar áudio novamente
- 📱 Ambiente mais silencioso
- 🎤 Falar mais claramente

### Caso 2: Quantidade null
```json
{
  "material1": "compressor",
  "quantidade": null
}
```

**Significado:**
- ℹ️ Peça foi mencionada
- ℹ️ Quantidade não foi especificada

**Ação Recomendada:**
- ✍️ Solicitar quantidade manualmente
- 📝 Ou assumir quantidade = 1

### Caso 3: Alta Confiança (>90%)
```json
{
  "material1": "compressor",
  "confianca": 95
}
```

**Significado:**
- ✅ Palavra muito clara
- ✅ Pode confiar no resultado
- ✅ Usar diretamente no orçamento

---

## 🎓 Dicas para Melhores Resultados

### ✅ FAÇA:
```
✓ Fale em ambiente silencioso
✓ Use termos técnicos precisos
✓ Mencione quantidades ("dois compressores")
✓ Fale claramente e pausadamente
✓ Mencione marcas/modelos quando relevante
```

### ❌ EVITE:
```
✗ Gravar com muito ruído de fundo
✗ Falar rápido demais
✗ Usar apenas gírias ("o treco", "aquilo")
✗ Áudios muito longos (>5 minutos)
✗ Múltiplos atendimentos no mesmo áudio
```

---

## 🚀 Integração no App

### Exemplo de Código (JavaScript)

```javascript
async function processarAudioTecnico(audioFile) {
  // 1. Converter áudio para base64
  const base64Audio = await audioToBase64(audioFile);
  
  // 2. Enviar para API
  const response = await fetch('http://localhost:10000/ai/process-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioData: base64Audio,
      audioFormat: 'wav',
      uid: currentUser.id
    })
  });
  
  const result = await response.json();
  
  // 3. Verificar se há resultados
  if (result.data.pecas_materiais.length === 0 && 
      result.data.servicos.length === 0) {
    alert('⚠️ Nenhum item detectado. Por favor, grave novamente em ambiente silencioso.');
    return;
  }
  
  // 4. Exibir para o técnico confirmar
  exibirResultadosParaConfirmacao(result.data);
  
  // 5. Adicionar ao orçamento
  adicionarAoOrcamento(result.data);
}

function exibirResultadosParaConfirmacao(data) {
  console.log('🔧 Peças Detectadas:');
  data.pecas_materiais.forEach(item => {
    Object.keys(item).forEach(key => {
      if (key.startsWith('material')) {
        console.log(`  • ${item[key]} (Qtd: ${item.quantidade || 'N/A'}) - Confiança: ${item.confianca}%`);
      }
    });
  });
  
  console.log('\n⚙️ Serviços Detectados:');
  data.servicos.forEach(item => {
    Object.keys(item).forEach(key => {
      if (key.startsWith('servico')) {
        console.log(`  • ${item[key]} - Confiança: ${item.confianca}%`);
      }
    });
  });
}
```

---

**📌 Lembre-se: O sistema prioriza PRECISÃO sobre QUANTIDADE. Melhor não retornar nada do que retornar informação errada!**
