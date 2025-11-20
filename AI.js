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

	// Prompt especializado para transcrição de áudio
	const systemPrompt = `Você é um transcritor de áudio especializado. Transcreva EXATAMENTE o que foi dito no áudio, palavra por palavra.

**INSTRUÇÕES:**
1. Retorne APENAS a transcrição literal do áudio.
2. Não adicione, interprete ou modifique nada.
3. Mantenha a pontuação natural da fala.
4. Se não entender alguma parte, use [inaudível].

**FORMATO DE SAÍDA:**
Retorne apenas o texto transcrito, sem formatação adicional.`;		console.log('🤖 Enviando áudio para processamento com Voxtral...');

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
								text: 'Transcreva este áudio:'
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
				temperature: 0.3,
				max_tokens: 2000,
				// Desabilita cache para evitar respostas repetidas
				headers: {
					'anthropic-cache-control': 'no-cache'
				}
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

		// Extrair a transcrição
		const transcricao = response.data.choices[0].message.content;

		// Retornar apenas a transcrição
		return {
			transcricao: transcricao.trim(),
			metadata: {
				modelo_ia: 'mistralai/voxtral-small-24b-2507',
				processado_em: new Date().toISOString(),
				formato_audio: audioFormat,
				tokens_utilizados: response.data.usage || null
			}
		};

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
		console.log('✅ Áudio processado com sucesso');

		// Retornar resposta estruturada
		return res.status(200).json({
			success: true,
			message: 'Áudio processado com sucesso',
			data: {
				transcricao: processedData.transcricao,
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
