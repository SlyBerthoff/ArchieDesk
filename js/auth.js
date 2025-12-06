/**
 * js/auth.js
 * Gestion Authentification + Persistance (Cookie/Storage)
 */
import { Config } from './config.js';

const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const TOKEN_STORAGE_KEY = 'archiedesk_auth_token';

let tokenClient;
let gapiInited = false;
let gisInited = false;

export const AuthState = {
    isAuthenticated: false,
    expirationTime: 0
};

export const Auth = {
    async init(callback) {
        const config = Config.get();
        if (!config || !config.apiKey || !config.clientId) return;

        // 1. GAPI
        gapi.load('client', async () => {
            await gapi.client.init({
                apiKey: config.apiKey,
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            this._checkInit(callback);
        });

        // 2. GIS (Google Identity Services)
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: config.clientId,
            scope: SCOPES,
            callback: '', // Défini lors du signIn
        });
        gisInited = true;
        this._checkInit(callback);
    },

    /**
     * Vérifie l'init et tente de restaurer la session
     */
    _checkInit(callback) {
        if (gapiInited && gisInited) {
            // Tentative de restauration du token
            this._restoreSession();
            if (callback) callback(true);
        }
    },

    /**
     * Sauvegarde le token en local
     */
    _saveSession(tokenResponse) {
        const now = Date.now();
        // Le token expire dans 'expires_in' secondes. On prend une marge de sécurité de 60s.
        const expiresInMs = (tokenResponse.expires_in - 60) * 1000;
        
        const session = {
            token: tokenResponse.access_token,
            expiry: now + expiresInMs
        };

        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(session));
        AuthState.isAuthenticated = true;
        AuthState.expirationTime = session.expiry;
    },

    /**
     * Restaure le token s'il est encore valide
     */
    _restoreSession() {
        const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!stored) return;

        try {
            const session = JSON.parse(stored);
            const now = Date.now();

            if (now < session.expiry) {
                // Token valide ! On le réinjecte dans GAPI
                gapi.client.setToken({ access_token: session.token });
                AuthState.isAuthenticated = true;
                AuthState.expirationTime = session.expiry;
                console.log("🔄 Session restaurée (Valide encore " + Math.round((session.expiry - now)/60000) + " min)");
            } else {
                // Token expiré
                console.log("⚠️ Session expirée, nettoyage.");
                this.signOut(); // Nettoyage propre
            }
        } catch (e) {
            console.error("Erreur lecture session", e);
            this.signOut();
        }
    },

    signIn(onSuccess) {
        if (!tokenClient) return;

        tokenClient.callback = (resp) => {
            if (resp.error) throw resp;
            
            // SAUVEGARDE DU TOKEN
            this._saveSession(resp);
            
            if (onSuccess) onSuccess();
        };

        // Si on a déjà une session expirée, on peut essayer de skip le prompt
        // mais 'consent' est plus sûr pour éviter les erreurs de permissions.
        tokenClient.requestAccessToken({ prompt: '' }); // '' laisse Google décider (souvent auto si déjà connecté)
    },

    signOut(callback) {
        const token = gapi.client.getToken();
        if (token !== null) {
            // On révoque côté Google (optionnel, parfois on veut juste "oublier" en local)
            // google.accounts.oauth2.revoke(token.access_token, () => {}); 
            gapi.client.setToken('');
        }
        
        // Nettoyage local
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        AuthState.isAuthenticated = false;
        
        if (callback) callback();
    },

    isReady() {
        // On vérifie aussi si le token n'a pas expiré entre temps
        if (AuthState.isAuthenticated && Date.now() > AuthState.expirationTime) {
            this.signOut();
            return false;
        }
        return gapiInited && gisInited && AuthState.isAuthenticated;
    }
};