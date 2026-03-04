# Dockerfile - Site Memória IFSul Venâncio Aires
# Build: Multi-stage para otimização (se necessário no futuro)
# Produção: Nginx Alpine servindo conteúdo estático

FROM nginx:alpine

# Metadados
LABEL maintainer="IFSul"
LABEL description="Site Memória IFSul Campus Venâncio Aires"
LABEL version="2.0"

# Remover configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuração customizada do Nginx para o container
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar todo o conteúdo do site para o diretório web do Nginx
COPY . /usr/share/nginx/html

# Garantir permissões corretas
RUN chmod -R 755 /usr/share/nginx/html

# Expor porta 80 (interna do container)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Comando padrão: iniciar Nginx em foreground
CMD ["nginx", "-g", "daemon off;"]
