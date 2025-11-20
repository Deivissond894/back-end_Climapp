const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

/**
 * Função para transcrever áudio usando Deepgram
 * @param {string} audioData - Áudio em formato base64
 * @param {string} audioFormat - Formato do áudio (wav, mp3, etc.)
 * @returns {Promise<string>} - Texto transcrito
 */
async function transcribeWithDeepgram(audioData, audioFormat = 'wav') {
	try {
		const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

		if (!DEEPGRAM_API_KEY) {
			throw new Error('DEEPGRAM_API_KEY não configurada no .env');
		}

		console.log('🎙️ Enviando áudio para transcrição com Deepgram...');

		// Converter base64 para buffer
		const audioBuffer = Buffer.from(audioData, 'base64');

		// Mapear formato para MIME type
		const mimeTypes = {
			'wav': 'audio/wav',
			'mp3': 'audio/mp3',
			'webm': 'audio/webm',
			'ogg': 'audio/ogg',
			'flac': 'audio/flac'
		};

		const response = await axios.post(
			'https://api.deepgram.com/v1/listen?model=nova-2&language=pt-BR&smart_format=true',
			audioBuffer,
			{
				headers: {
					'Authorization': `Token ${DEEPGRAM_API_KEY}`,
					'Content-Type': mimeTypes[audioFormat] || 'audio/wav'
				},
				timeout: 60000
			}
		);

		const transcricao = response.data.results.channels[0].alternatives[0].transcript;
		console.log('✅ Transcrição concluída com Deepgram');

		return transcricao;

	} catch (error) {
		console.error('❌ Erro ao transcrever com Deepgram:', {
			message: error.message,
			response: error.response?.data,
			status: error.response?.status
		});

		if (error.response?.status === 401) {
			throw new Error('Chave de API do Deepgram inválida ou não configurada');
		} else if (error.response?.status === 429) {
			throw new Error('Limite de requisições do Deepgram excedido');
		}

		throw error;
	}
}

/**
 * Função para extrair informações do texto usando Gemini
 * @param {string} transcricao - Texto transcrito
 * @returns {Promise<Object>} - Objeto com materiais e serviços extraídos
 */
async function extractInfoWithGemini(transcricao) {
	try {
		const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
		const SITE_URL = process.env.SITE_URL || 'https://climapp-1hxc.onrender.com';
		const SITE_NAME = process.env.SITE_NAME || 'Climapp';

		if (!OPENROUTER_API_KEY) {
			throw new Error('OPENROUTER_API_KEY não configurada no .env');
		}

	// Prompt especializado para extrair informações de texto transcrito
	const systemPrompt = `Você é um analisador técnico especializado em extrair informações LITERAIS e EXATAS de textos transcritos de técnicos de refrigeração, ar-condicionado ou manutenção industrial.

**REGRAS ABSOLUTAS (NÃO NEGOCIÁVEIS):**
1. Extraia APENAS as palavras exatas mencionadas no áudio.
2. Se o técnico diz "compressor Danfoss XYZ", retorne EXATAMENTE "compressor Danfoss XYZ" — NUNCA substitua por sinônimos ou interpretações.
3. Inclua APENAS itens com confiança ≥ 80% (use sua métrica interna de reconhecimento de fala).
4. Quantidades devem ser registradas como string (ex: "2") ou "null" se não mencionadas.
5. Use chaves incrementais no JSON: "material1", "material2", "servico1", "servico2", etc.
6. Se NADA for mencionado com clareza ≥ 80%, retorne arrays vazios: [].
7. NUNCA adicione informações não ditas no áudio.

**FORMATO DE SAÍDA (JSON):**
{
  "pecas_materiais": [
    {
      "material1": "nome EXATO mencionado",
      "quantidade": "número ou null",
      "confianca": 95
    }
  ],
  "servicos": [
    {
      "servico1": "descrição EXATA mencionada",
      "confianca": 92
    }
  ]
}

**EXEMPLO DE SAÍDA:**
Para o texto: "Trocar o compressor Embraco EGX120, dois capacitores de 40µF e fazer limpeza do sistema com gás R-410A", retorne:
{
  "pecas_materiais": [
    {
      "material1": "compressor Embraco EGX120",
      "quantidade": "1",
      "confianca": 100
    },
    {
      "material2": "capacitores de 40µF",
      "quantidade": "2",
      "confianca": 98
    }
  ],
  "servicos": [
    {
      "servico1": "troca do compressor",
      "confianca": 100
    },
    {
      "servico2": "limpeza do sistema",
      "confianca": 95
    },
    {
      "servico3": "troca do gás R-410A",
      "confianca": 90
    }
  ]
}

**INSTRUÇÕES PARA TEXTOS SEM INFORMAÇÕES CLARAS:**
- Se nenhum item atingir confiança ≥ 80%, retorne:
{
  "pecas_materiais": [],
  "servicos": []
}

**PROIBIÇÕES:**
- ❌ Não interprete termos (ex: "gás" ≠ "refrigerante").
- ❌ Não complete informações ausentes.
- ❌ Não use sinônimos ou padronizações.`;

		console.log('🤖 Analisando texto com Gemini 2.5 Flash Lite...');

		const response = await axios.post(
			'https://openrouter.ai/api/v1/chat/completions',
			{
				model: 'google/gemini-2.5-flash-lite-preview-09-2025',
				messages: [
					{
						role: 'system',
						content: systemPrompt
					},
					{
						role: 'user',
						content: `Analise este texto de relatório técnico e extraia as informações conforme o formato solicitado:\n\n"${transcricao}"`
					}
				],
				temperature: 0.3,
				max_tokens: 2000,
				response_format: { type: 'json_object' }
			},
			{
				headers: {
					'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
					'HTTP-Referer': SITE_URL,
					'X-Title': SITE_NAME,
					'Content-Type': 'application/json'
				},
				timeout: 60000 // Timeout de 60 segundos
			}
		);

		console.log('✅ Resposta recebida da API OpenRouter');

		// Extrair a resposta da IA
		const aiResponse = response.data.choices[0].message.content;
		
		// Parse do JSON retornado
		let parsedResponse;
		try {
			parsedResponse = JSON.parse(aiResponse);
		} catch (parseError) {
			console.error('❌ Erro ao fazer parse da resposta JSON:', parseError);
			// Tentar extrair JSON da resposta se estiver envolvido em texto
			const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				parsedResponse = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error('Resposta da IA não está em formato JSON válido');
			}
		}

		// FILTRAR ITENS COM BAIXA CONFIANÇA (< 80%)
		const CONFIANCA_MINIMA = 80;
		
		// Filtrar peças/materiais
		if (parsedResponse.pecas_materiais && Array.isArray(parsedResponse.pecas_materiais)) {
			parsedResponse.pecas_materiais = parsedResponse.pecas_materiais.filter(item => {
				const confianca = item.confianca || 0;
				if (confianca < CONFIANCA_MINIMA) {
					console.log(`⚠️ Material removido por baixa confiança (${confianca}%):`, item);
					return false;
				}
				return true;
			});
		} else {
			parsedResponse.pecas_materiais = [];
		}

		// Filtrar serviços
		if (parsedResponse.servicos && Array.isArray(parsedResponse.servicos)) {
			parsedResponse.servicos = parsedResponse.servicos.filter(item => {
				const confianca = item.confianca || 0;
				if (confianca < CONFIANCA_MINIMA) {
					console.log(`⚠️ Serviço removido por baixa confiança (${confianca}%):`, item);
					return false;
				}
				return true;
			});
		} else {
			parsedResponse.servicos = [];
		}

		// Retornar dados extraídos
		return {
			pecas_materiais: parsedResponse.pecas_materiais,
			servicos: parsedResponse.servicos,
			confianca_minima: CONFIANCA_MINIMA,
			tokens_utilizados: response.data.usage || null,
			total_pecas: parsedResponse.pecas_materiais.length,
			total_servicos: parsedResponse.servicos.length
		};

	} catch (error) {
		console.error('❌ Erro ao extrair informações com Gemini:', {
			message: error.message,
			response: error.response?.data,
			status: error.response?.status
		});

		// Tratar erros específicos da API
		if (error.response?.status === 401) {
			throw new Error('Chave de API do OpenRouter inválida ou não configurada');
		} else if (error.response?.status === 429) {
			throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos');
		} else if (error.response?.status === 400) {
			throw new Error('Dados de áudio inválidos ou formato não suportado');
		} else if (error.code === 'ECONNABORTED') {
			throw new Error('Timeout ao processar áudio. O arquivo pode ser muito grande');
		}

		throw error;
	}
}

/**
 * Endpoint principal para processar áudio com IA
 * POST /ai/process-audio
 * 
 * Body esperado:
 * {
 *   "audioData": "base64_encoded_audio_data",
 *   "audioFormat": "wav", // opcional, padrão: wav
 *   "uid": "user_id", // opcional
 *   "clientId": "client_id" // opcional
 * }
 */
router.post('/process-audio', async (req, res) => {
	try {
		const { audioData, audioFormat = 'wav', uid, clientId } = req.body;

		// Validação básica
		if (!audioData) {
			return res.status(400).json({
				success: false,
				message: 'Dados de áudio são obrigatórios',
				error: 'MISSING_AUDIO_DATA'
			});
		}

		// Validar formato de áudio
		const validFormats = ['wav', 'mp3', 'ogg', 'webm', 'flac'];
		if (!validFormats.includes(audioFormat.toLowerCase())) {
			return res.status(400).json({
				success: false,
				message: `Formato de áudio inválido. Use: ${validFormats.join(', ')}`,
				error: 'INVALID_AUDIO_FORMAT'
			});
		}

		console.log(`🎤 Processando áudio (formato: ${audioFormat})...`);
		if (uid) console.log(`👤 UID do usuário: ${uid}`);
		if (clientId) console.log(`👥 ID do cliente: ${clientId}`);

		// ETAPA 1: Transcrever áudio com Deepgram
		const transcricao = await transcribeWithDeepgram(audioData, audioFormat);
		console.log('📝 Transcrição:', transcricao);

		// ETAPA 2: Extrair informações do texto com Gemini
		const extractedData = await extractInfoWithGemini(transcricao);

		// Log de sucesso
		console.log('✅ Áudio processado com sucesso:', {
			pecas_count: extractedData.total_pecas,
			servicos_count: extractedData.total_servicos,
			confianca_minima: extractedData.confianca_minima
		});

		// Retornar resposta estruturada
		return res.status(200).json({
			success: true,
			message: 'Áudio processado com sucesso',
			data: {
				transcricao: transcricao,
				pecas_materiais: extractedData.pecas_materiais,
				servicos: extractedData.servicos,
				metadata: {
					modelo_transcricao: 'deepgram/nova-2',
					modelo_extracao: 'google/gemini-2.5-flash-lite-preview-09-2025',
					processado_em: new Date().toISOString(),
					formato_audio: audioFormat,
					confianca_minima: extractedData.confianca_minima,
					tokens_utilizados: extractedData.tokens_utilizados,
					total_pecas: extractedData.total_pecas,
					total_servicos: extractedData.total_servicos
				}
			}
		});

	} catch (error) {
		console.error('❌ Erro no endpoint /process-audio:', {
			message: error.message,
			stack: error.stack
		});

		// Determinar código de status apropriado
		let statusCode = 500;
		let errorMessage = 'Erro ao processar áudio com IA';

		if (error.message.includes('API')) {
			statusCode = 503;
			errorMessage = 'Serviço de IA temporariamente indisponível';
		} else if (error.message.includes('inválid')) {
			statusCode = 400;
		} else if (error.message.includes('Timeout')) {
			statusCode = 408;
		}

		return res.status(statusCode).json({
			success: false,
			message: errorMessage,
			error: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

/**
 * Endpoint de teste para verificar configuração da API
 * GET /ai/status
 */
router.get('/status', (req, res) => {
	const deepgramConfigured = !!process.env.DEEPGRAM_API_KEY;
	const openrouterConfigured = !!process.env.OPENROUTER_API_KEY;
	
	res.json({
		success: true,
		message: 'Status do serviço de IA',
		data: {
			deepgram_configured: deepgramConfigured,
			openrouter_configured: openrouterConfigured,
			transcription_model: 'deepgram/nova-2',
			extraction_model: 'google/gemini-2.5-flash-lite-preview-09-2025',
			supported_formats: ['wav', 'mp3', 'ogg', 'webm', 'flac'],
			endpoint: '/ai/process-audio',
			status: (deepgramConfigured && openrouterConfigured) ? 'ready' : 'not_configured',
			timestamp: new Date().toISOString()
		}
	});
});

module.exports = router;
