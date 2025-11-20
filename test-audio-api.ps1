# Script de teste para API de Processamento de Áudio
# PowerShell - Windows

$baseUrl = "http://localhost:10000"
# $baseUrl = "https://climapp-1hxc.onrender.com"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "🧪 TESTES DA API DE PROCESSAMENTO DE ÁUDIO" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Teste 1: Verificar status do serviço
Write-Host "📊 Teste 1: Verificando status do serviço..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/ai/status" -Method Get -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
    Write-Host "✅ Status: OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao verificar status: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Teste 2: Processar áudio (exemplo)
Write-Host "🎤 Teste 2: Exemplo de processamento de áudio..." -ForegroundColor Yellow
Write-Host "⚠️ NOTA: Você precisa substituir 'AUDIO_BASE64_AQUI' pelo seu áudio real" -ForegroundColor Yellow
Write-Host ""

# Exemplo de como converter um arquivo de áudio para base64
Write-Host "💡 Para converter um arquivo de áudio para base64, use:" -ForegroundColor Cyan
Write-Host '$audioPath = "C:\caminho\para\seu\audio.wav"' -ForegroundColor Gray
Write-Host '$audioBytes = [System.IO.File]::ReadAllBytes($audioPath)' -ForegroundColor Gray
Write-Host '$audioBase64 = [System.Convert]::ToBase64String($audioBytes)' -ForegroundColor Gray
Write-Host ""

# Payload de exemplo
$examplePayload = @{
    audioData = "AUDIO_BASE64_AQUI"
    audioFormat = "wav"
    uid = "test_user_123"
    clientId = "test_client_456"
} | ConvertTo-Json

Write-Host "Payload de exemplo:" -ForegroundColor Cyan
Write-Host $examplePayload -ForegroundColor Gray
Write-Host ""

# Salvar exemplo em arquivo
$examplePayload | Out-File -FilePath "test-audio-payload.json" -Encoding UTF8
Write-Host "✅ Payload de exemplo salvo em: test-audio-payload.json" -ForegroundColor Green
Write-Host ""

Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Teste 3: Testar validação - áudio faltando
Write-Host "❌ Teste 3: Testando validação (áudio faltando)..." -ForegroundColor Yellow
try {
    $payload = @{
        audioFormat = "wav"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/ai/process-audio" -Method Post -Body $payload -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    $errorBody | ConvertTo-Json -Depth 10
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Teste 4: Testar validação - formato inválido
Write-Host "❌ Teste 4: Testando validação (formato inválido)..." -ForegroundColor Yellow
try {
    $payload = @{
        audioData = "fake_base64_data"
        audioFormat = "invalid_format"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/ai/process-audio" -Method Post -Body $payload -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    $errorBody | ConvertTo-Json -Depth 10
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ Testes de validação concluídos!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Função auxiliar para processar um áudio real
function Process-Audio {
    param(
        [Parameter(Mandatory=$true)]
        [string]$AudioFilePath,
        
        [Parameter(Mandatory=$false)]
        [string]$Format = "wav",
        
        [Parameter(Mandatory=$false)]
        [string]$UserId,
        
        [Parameter(Mandatory=$false)]
        [string]$ClientId
    )

    Write-Host "🎤 Processando áudio: $AudioFilePath" -ForegroundColor Cyan

    # Verificar se o arquivo existe
    if (-not (Test-Path $AudioFilePath)) {
        Write-Host "❌ Erro: Arquivo não encontrado: $AudioFilePath" -ForegroundColor Red
        return
    }

    # Converter para base64
    Write-Host "📦 Convertendo áudio para base64..." -ForegroundColor Yellow
    $audioBytes = [System.IO.File]::ReadAllBytes($AudioFilePath)
    $audioBase64 = [System.Convert]::ToBase64String($audioBytes)
    
    Write-Host "✅ Áudio convertido (tamanho: $($audioBytes.Length) bytes)" -ForegroundColor Green

    # Preparar payload
    $payload = @{
        audioData = $audioBase64
        audioFormat = $Format
    }

    if ($UserId) { $payload.uid = $UserId }
    if ($ClientId) { $payload.clientId = $ClientId }

    $payloadJson = $payload | ConvertTo-Json

    # Enviar para API
    Write-Host "🚀 Enviando para API..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/ai/process-audio" -Method Post -Body $payloadJson -ContentType "application/json"
        
        Write-Host "✅ Resposta recebida:" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
        
        # Resumo
        Write-Host ""
        Write-Host "📊 RESUMO DOS RESULTADOS:" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        
        if ($response.data.pecas_materiais.Count -gt 0) {
            Write-Host "🔧 PEÇAS/MATERIAIS:" -ForegroundColor Yellow
            foreach ($item in $response.data.pecas_materiais) {
                $keys = $item.PSObject.Properties.Name | Where-Object { $_ -like "material*" }
                foreach ($key in $keys) {
                    $material = $item.$key
                    $qtd = if ($item.quantidade) { $item.quantidade } else { "N/A" }
                    $conf = $item.confianca
                    Write-Host "  • $material (Qtd: $qtd, Confiança: $conf%)" -ForegroundColor White
                }
            }
        } else {
            Write-Host "🔧 PEÇAS/MATERIAIS: Nenhum item detectado" -ForegroundColor Gray
        }
        
        Write-Host ""
        
        if ($response.data.servicos.Count -gt 0) {
            Write-Host "⚙️ SERVIÇOS:" -ForegroundColor Yellow
            foreach ($item in $response.data.servicos) {
                $keys = $item.PSObject.Properties.Name | Where-Object { $_ -like "servico*" }
                foreach ($key in $keys) {
                    $servico = $item.$key
                    $conf = $item.confianca
                    Write-Host "  • $servico (Confiança: $conf%)" -ForegroundColor White
                }
            }
        } else {
            Write-Host "⚙️ SERVIÇOS: Nenhum serviço detectado" -ForegroundColor Gray
        }
        
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        
    } catch {
        Write-Host "❌ Erro ao processar áudio:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        if ($_.ErrorDetails) {
            $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 10
        }
    }
}

Write-Host ""
Write-Host "💡 COMO USAR A FUNÇÃO Process-Audio:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host 'Process-Audio -AudioFilePath "C:\caminho\para\audio.wav"' -ForegroundColor Gray
Write-Host 'Process-Audio -AudioFilePath "C:\caminho\para\audio.mp3" -Format "mp3"' -ForegroundColor Gray
Write-Host 'Process-Audio -AudioFilePath "C:\caminho\para\audio.wav" -UserId "user123" -ClientId "client456"' -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Exemplo de uso (descomente para testar)
# Process-Audio -AudioFilePath "C:\Users\Deivsson\Desktop\teste_audio.wav"
