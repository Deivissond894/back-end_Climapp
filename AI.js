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
		const systemPrompt = `Você é um assistente especializado em análise de relatórios técnicos de manutenção de ar-condicionado e refrigeração.

Sua tarefa é:
1. Transcrever o áudio com precisão
2. Listar todas as peças/componentes mencionados no audio
3. Extrair ações ou serviços mencionados no audio
Observação: Foque apenas nas informações técnicas mencionadas no áudio.
Formato de resposta esperado (JSON):
IMPORTANTE: Retorne APENAS um objeto JSON válido no seguinte formato, sem texto adicional:
{
  "audio_transcrito": "transcrição completa do áudio aqui",
  "resultado": {
    "problema_mencionado": "descrição clara do problema ou problemas mencionados no áudio ou 'Nenhum problema específico identificado' se não houver",
    "pecas_mencionadas": ["peça1", "peça2", "peça3"],
    "acao_necessaria": ["ação1", "ação2", "ação3"]
  }
}

Regras:
- Se não houver problemas identificados, use: "Nenhum problema específico mencionado"
- Se não houver peças mencionadas, retorne array vazio: []
- Se não houver ações mencionadas, retorne array vazio: []
- Seja específico e profissional
- Use termos técnicos apropriados da área de refrigeração, climatização ou linha branca
- Não adicione explicações ou texto fora do JSON solicitado`;

		console.log('🤖 Enviando áudio para processamento com Voxtral...');

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

		// Validar estrutura da resposta
		if (!parsedResponse.resultado) {
			throw new Error('Resposta da IA não contém campo "resultado"');
		}

		// Garantir que arrays existam
		if (!Array.isArray(parsedResponse.resultado.pecas_mencionadas)) {
			parsedResponse.resultado.pecas_mencionadas = [];
		}
		if (!Array.isArray(parsedResponse.resultado.acao_necessaria)) {
			parsedResponse.resultado.acao_necessaria = [];
		}

		// Adicionar metadados
		const enrichedResponse = {
			...parsedResponse,
			metadata: {
				modelo_ia: 'mistralai/voxtral-small-24b-2507',
				processado_em: new Date().toISOString(),
				formato_audio: audioFormat,
				tokens_utilizados: response.data.usage || null
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
			audio_transcrito_length: processedData.audio_transcrito?.length || 0,
			problemas_encontrados: processedData.resultado?.problema_identificado || 'N/A',
			pecas_count: processedData.resultado?.pecas_mencionadas?.length || 0,
			acoes_count: processedData.resultado?.acao_necessaria?.length || 0
		});

		// Retornar resposta estruturada
		return res.status(200).json({
			success: true,
			message: 'Áudio processado com sucesso',
			data: {
				audio_transcrito: processedData.audio_transcrito,
				resultado: processedData.resultado,
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
