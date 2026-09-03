/**
 * Osnovni URL Fornect backend API-ja (server/, Fastify).
 *
 * Podrazumijevano je relativna putanja — pretpostavlja da je frontend
 * deployan iza reverse proxy-ja (Dokploy/Traefik) koji `/api` prosljeđuje
 * backend servisu na istom originu. Ako se frontend i backend deployuju
 * na različitim domenama, promijeni ovo u punu URL adresu backend-a
 * (npr. 'https://api.fornect.example.com/api/v1').
 */
export const API_BASE_URL = '/api/v1';
