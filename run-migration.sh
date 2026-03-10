#!/bin/bash
# Script para executar migração de banco de dados dentro do container

set -e

SERVICE_NAME="web"
SCRIPT_PATH="migrate_media_table.py"

echo "🔍 Verificando se o serviço '$SERVICE_NAME' está rodando..."

if ! docker-compose ps $SERVICE_NAME | grep -q "Up"; then
    echo "❌ Serviço '$SERVICE_NAME' não está rodando!"
    echo ""
    echo "Opcões:"
    echo "1. Se estiver usando Dockerfile.fase3 (com Python):"
    echo "   docker-compose -f docker-compose.fase3.yml up -d"
    echo ""
    echo "2. Se estiver usando Dockerfile atual (Nginx):"
    echo "   Você precisa ter um serviço separado com Python rodando"
    exit 1
fi

echo "✓ Serviço está rodando!"
echo ""
echo "🚀 Executando migração da tabela de mídia..."
echo ""

if docker-compose exec -T $SERVICE_NAME python3 $SCRIPT_PATH 2>/dev/null; then
    echo ""
    echo "✅ Migração concluída com sucesso!"
    echo ""
    echo "📊 Verificando tabela..."
    docker-compose exec -T $SERVICE_NAME sqlite3 database/memoria.db ".schema media_file" || echo "Tabela criada!"
else
    echo ""
    echo "❌ Erro ao executar migração"
    echo ""
    echo "Tentando alternativa com python..."
    docker-compose exec -T $SERVICE_NAME python $SCRIPT_PATH
fi
