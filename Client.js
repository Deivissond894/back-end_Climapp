const express = require('express');
const router = express.Router();
const { admin } = require('./firebase-config');

// Função utilitária para garantir campos obrigatórios
function sanitizeClientData(data) {
	return {
		nome: data.nome || "",
		documento: data.documento || "",
		telefone: data.telefone || "",
		email: data.email || "",
		cep: data.cep || "",
		rua: data.rua || "",
		numero: data.numero || "",
		referencia: data.referencia || "",
		observacoes: data.observacoes || ""
	};
}

// Endpoint para cadastrar cliente
// Montado em index.js via app.use('/clientes', clientRoutes)
// então aqui o caminho deve ser '/' para que o endpoint final seja POST /clientes
router.post('/', async (req, res) => {
	try {
		const { uid, ...clientData } = req.body;
		if (!uid) {
			return res.status(400).json({ success: false, message: 'UID do usuário não informado.' });
		}
		// Sanitiza os dados recebidos
		const sanitizedData = sanitizeClientData(clientData);

		// Referência para coleção de clientes do usuário
		const clientsRef = admin.firestore().collection('Usuarios').doc(uid).collection('Clientes');
		// Busca todos os clientes para contar e gerar o próximo código
		const snapshot = await clientsRef.get();
		const nextNumber = snapshot.size + 1;
		const clientCode = `Cli-${String(nextNumber).padStart(3, '0')}`;

		// Salva o cliente
		await clientsRef.doc(clientCode).set({
			codigo: clientCode,
			...sanitizedData,
			criadoEm: admin.firestore.FieldValue.serverTimestamp()
		});

		return res.status(201).json({ success: true, message: 'Cliente cadastrado com sucesso!', codigo: clientCode });
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Dados faltando para completar cadastro, Campos obrigatórios sem preenchimento.', error: error.message });
	}
});

module.exports = router;

// Rota para listar clientes do usuário (GET /clientes/:uid)
// Observação: essa versão exige o UID na URL e não verifica token (modo simples/teste).
router.get('/:uid', async (req, res) => {
	try {
		const uid = req.params.uid;
		if (!uid) {
			return res.status(400).json({ success: false, message: 'UID não informado.' });
		}

		const clientsRef = admin.firestore().collection('Usuarios').doc(uid).collection('Clientes');

		// Tenta ordenar por criadoEm, mas faz fallback caso campo não exista
		let snapshot;
		try {
			snapshot = await clientsRef.orderBy('criadoEm', 'asc').get();
		} catch (err) {
			snapshot = await clientsRef.get();
		}

		const clients = [];
		snapshot.forEach(doc => clients.push({ id: doc.id, ...doc.data() }));

		return res.status(200).json({ success: true, count: clients.length, data: clients });
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Erro ao buscar clientes.', error: error.message });
	}
});
