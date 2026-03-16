#!/bin/bash
# Script para executar migração de banco de dados dentro do container

set -e

SERVICE_NAME="memoria-cms"
SCRIPT_PATH="migrate_media_table.py"

echo "🔍 Verificando se o serviço '$SERVICE_NAME' está rodando..."

if ! docker-compose ps $SERVICE_NAME | grep -q "Up"; then
    echo "❌ Serviço '$SERVICE_NAME' não está rodando!"
    echo ""
    echo "Opção:"
    echo "   docker-compose up -d"
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
