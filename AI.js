const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

/**
 * Função para processar áudio com IA usando Voxtral (Mistral AI)
 * @param {string} audioData - Áudio em formato base64
 * @param {string} audioFormat - Formato do áudio (wav, mp3, etc.)
 * @returns {Promise<Object>} - Objeto com dados estruturados extraídos do áudio
 */
async function processAudioWithVoxtral(audioData, audioFormat = 'wav') {
	try {
		const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
		const SITE_URL = process.env.SITE_URL || 'https://climapp-1hxc.onrender.com';
		const SITE_NAME = process.env.SITE_NAME || 'Climapp';

		if (!OPENROUTER_API_KEY) {
			throw new Error('OPENROUTER_API_KEY não configurada no .env');
		}

	// Prompt especializado para extrair informações técnicas de manutenção
	const systemPrompt = `Você é um transcritor técnico especializado em extrair informações EXATAS de áudios de técnicos.

REGRAS FUNDAMENTAIS:
1. Extraia LITERALMENTE as palavras mencionadas no áudio - NÃO INTERPRETE, NÃO TRADUZA, NÃO SUBSTITUA
2. Se o técnico diz "compressor", você escreve "compressor" - NUNCA "condensador" ou outro termo
3. Mantenha a EXATA nomenclatura falada, incluindo marcas, modelos e termos coloquiais
4. Para cada item extraído, você DEVE incluir um score de confiança (0-100)
5. APENAS inclua itens com confiança >= 80%
6. Se não tiver certeza absoluta do que foi dito, NÃO inclua no resultado

Formato de resposta esperado (JSON):
{
  "pecas_materiais": [
    {
      "material1": "nome EXATO mencionado no áudio (literal)",
      "quantidade": "número ou null se não mencionado",
      "confianca": 95
    },
    {
      "material2": "nome EXATO mencionado no áudio (literal)",
      "quantidade": "número ou null se não mencionado",
      "confianca": 88
    }
  ],
  "servicos": [
    {
      "servico1": "descrição EXATA do serviço mencionado",
      "confianca": 92
    },
    {
      "servico2": "descrição EXATA do serviço mencionado",
      "confianca": 85
    }
  ]
}

INSTRUÇÕES CRÍTICAS:
- Use "material1", "material2", "material3" como chaves (incremental)
- Use "servico1", "servico2", "servico3" como chaves (incremental)
- Se confiança < 80%, NÃO INCLUA o item
- Se nenhuma peça for mencionada com confiança >= 80%, retorne "pecas_materiais": []
- Se nenhum serviço for mencionado com confiança >= 80%, retorne "servicos": []
- NÃO adicione texto explicativo, APENAS o JSON
- Quantidade sempre como string ou null
- Confiança sempre como número inteiro (0-100)

EXEMPLOS DO QUE NÃO FAZER:
❌ Áudio diz "compressor" → Você escreve "condensador" (ERRADO!)
❌ Áudio diz "gás R22" → Você escreve "fluido refrigerante" (ERRADO!)
❌ Incluir item com confiança 75% (ERRADO!)

EXEMPLOS DO QUE FAZER:
✅ Áudio diz "compressor" → Você escreve "compressor"
✅ Áudio diz "gás R22" → Você escreve "gás R22"
✅ Apenas itens com confiança >= 80%`;		console.log('🤖 Enviando áudio para processamento com Voxtral...');

		const response = await axios.post(
			'https://openrouter.ai/api/v1/chat/completions',
			{
				model: 'mistralai/voxtral-small-24b-2507',
				messages: [
					{
						role: 'system',
						content: systemPrompt
					},
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: 'Analise este áudio de relatório técnico e extraia as informações conforme o formato solicitado:'
							},
							{
								type: 'input_audio',
								input_audio: {
									data: audioData,
									format: audioFormat
								}
							}
						]
					}
				],
				temperature: 0.3, // Baixa temperatura para respostas mais consistentes
				max_tokens: 2000,
				response_format: { type: 'json_object' } // Forçar resposta em JSON
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

		// Adicionar metadados
		const enrichedResponse = {
			pecas_materiais: parsedResponse.pecas_materiais,
			servicos: parsedResponse.servicos,
			metadata: {
				modelo_ia: 'mistralai/voxtral-small-24b-2507',
				processado_em: new Date().toISOString(),
				formato_audio: audioFormat,
				confianca_minima: CONFIANCA_MINIMA,
				tokens_utilizados: response.data.usage || null,
				total_pecas: parsedResponse.pecas_materiais.length,
				total_servicos: parsedResponse.servicos.length
			}
		};

		return enrichedResponse;

	} catch (error) {
		console.error('❌ Erro ao processar áudio com Voxtral:', {
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

		// Processar áudio com IA
		const processedData = await processAudioWithVoxtral(audioData, audioFormat);

		// Log de sucesso
		console.log('✅ Áudio processado com sucesso:', {
			pecas_count: processedData.pecas_materiais?.length || 0,
			servicos_count: processedData.servicos?.length || 0,
			confianca_minima: processedData.metadata?.confianca_minima || 80
		});

		// Retornar resposta estruturada
		return res.status(200).json({
			success: true,
			message: 'Áudio processado com sucesso',
			data: {
				pecas_materiais: processedData.pecas_materiais,
				servicos: processedData.servicos,
				metadata: processedData.metadata
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
	const isConfigured = !!process.env.OPENROUTER_API_KEY;
	
	res.json({
		success: true,
		message: 'Status do serviço de IA',
		data: {
			api_configured: isConfigured,
			model: 'mistralai/voxtral-small-24b-2507',
			supported_formats: ['wav', 'mp3', 'ogg', 'webm', 'flac'],
			endpoint: '/ai/process-audio',
			status: isConfigured ? 'ready' : 'not_configured',
			timestamp: new Date().toISOString()
		}
	});
});

module.exports = router;
