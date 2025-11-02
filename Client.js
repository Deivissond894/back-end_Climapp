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
router.post('/clientes', async (req, res) => {
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
