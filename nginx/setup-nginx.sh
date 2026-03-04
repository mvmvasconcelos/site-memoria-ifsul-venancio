#!/bin/bash

# Script de configuração do Nginx para Site Memória IFSul Venâncio Aires
# Copia a configuração para o Nginx do host e recarrega o serviço

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Este script precisa ser executado como root (use sudo)${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Configurando Nginx para Site Memória IFSul Venâncio Aires${NC}"
echo -e "${BLUE}   Tipo de configuração: ${CONF_TYPE}${NC}"
echo ""

# Diretórios e arquivos
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verificar qual configuração usar
if [ "$1" = "--subpath" ] || [ ! -f "${SCRIPT_DIR}/memoria-ifsul-venancio.conf" ]; then
    SOURCE_CONF="${SCRIPT_DIR}/memoria-ifsul-venancio-subpath.conf"
    CONF_TYPE="subpath"
else
    SOURCE_CONF="${SCRIPT_DIR}/memoria-ifsul-venancio.conf"
    CONF_TYPE="domínio próprio"
fi

DEST_DIR="/etc/nginx/conf.d/apps"
DEST_CONF="${DEST_DIR}/memoria-ifsul-venancio.conf"
BACKUP_DIR="/home/ifsul/docs/configs"

# Verificar se o arquivo fonte existe
if [ ! -f "$SOURCE_CONF" ]; then
    echo -e "${RED}❌ Arquivo de configuração não encontrado: ${SOURCE_CONF}${NC}"
    exit 1
fi

# Criar diretório de destino se não existir
if [ ! -d "$DEST_DIR" ]; then
    echo -e "${YELLOW}📁 Criando diretório: ${DEST_DIR}${NC}"
    mkdir -p "$DEST_DIR"
fi

# Fazer backup da configuração existente (se houver)
if [ -f "$DEST_CONF" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/memoria-ifsul-venancio.conf.backup_${TIMESTAMP}"
    echo -e "${YELLOW}💾 Fazendo backup da configuração existente...${NC}"
    cp "$DEST_CONF" "$BACKUP_FILE"
    echo -e "${GREEN}   Backup salvo em: ${BACKUP_FILE}${NC}"
fi

# Copiar nova configuração
echo -e "${BLUE}📋 Copiando configuração para ${DEST_CONF}${NC}"
cp "$SOURCE_CONF" "$DEST_CONF"

# Copiar também para o diretório de backups
echo -e "${BLUE}📋 Copiando para diretório de backups...${NC}"
cp "$SOURCE_CONF" "${BACKUP_DIR}/memoria-ifsul-venancio.conf"

# Testar configuração do Nginx
echo -e "${BLUE}🧪 Testando configuração do Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Configuração válida!${NC}"
    
    # Recarregar Nginx
    echo -e "${BLUE}🔄 Recarregando Nginx...${NC}"
    systemctl reload nginx
    
    echo ""
    echo -e "${GREEN}✅ Configuração instalada com sucesso!${NC}"
    echo ""
    echo -e "${BLUE}📝 Próximos passos:${NC}"
    
    if [ "$CONF_TYPE" = "subpath" ]; then
        echo -e "   1. Certifique-se de que o container está rodando:"
        echo -e "      ${YELLOW}docker-compose up -d${NC}"
        echo -e "   2. Acesse o site:"
        echo -e "      ${YELLOW}https://ifva.duckdns.org/memoria/${NC}"
        echo -e "   3. Quando o DNS estiver pronto, reconfigure para domínio próprio:"
        echo -e "      ${YELLOW}sudo ./nginx/setup-nginx.sh${NC} (sem --subpath)"
    else
        echo -e "   1. Certifique-se de que o container está rodando:"
        echo -e "      ${YELLOW}docker-compose up -d${NC}"
        echo -e "   2. Configure o DNS no Registro.br:"
        echo -e "      ${YELLOW}Tipo: A${NC}"
        echo -e "      ${YELLOW}Valor: 200.132.86.251${NC}"
        echo -e "   3. Após propagação do DNS, gerar certificado SSL:"
        echo -e "      ${YELLOW}sudo certbot --nginx -d memoriaifsulvenancio.com.br -d www.memoriaifsulvenancio.com.br${NC}"
    fi
    echo ""
else
    echo -e "${RED}❌ Erro na configuração do Nginx!${NC}"
    echo -e "${YELLOW}⚠️  A configuração antiga foi mantida.${NC}"
    
    # Restaurar backup se houver erro
    if [ -f "$BACKUP_FILE" ]; then
        echo -e "${YELLOW}🔙 Restaurando backup...${NC}"
        cp "$BACKUP_FILE" "$DEST_CONF"
        nginx -t && systemctl reload nginx
    fi
    
    exit 1
fi
