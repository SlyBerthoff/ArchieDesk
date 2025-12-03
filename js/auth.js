/**
 * js/auth.js
 * Gestion de l'authentification Google (Identity Services + GAPI)
 */
import { Config } from './config.js';

// Scopes : drive.file permet de gérer uniquement les fichiers créés par l'app (Sécurité max)
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// État de l'utilisateur
export const AuthState = {
    isAuthenticated: false,
    user: null
};

export const Auth = {
    /**
     * Initialise les clients Google (GAPI et GIS)
     * Doit être appelé après que la Config soit validée
     */
    async init(callback) {
        const config = Config.get();
        if (!config) return;

        // 1. Charger GAPI (Client API pour faire les requêtes Drive)
        gapi.load('client', async () => {
            await gapi.client.init({
                apiKey: config.apiKey,
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            this._checkInit(callback);
        });

        // 2. Charger GIS (Identity Services pour le Login)
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: config.clientId,
            scope: SCOPES,
            callback: '', // Sera défini lors du login
        });
        gisInited = true;
        this._checkInit(callback);
    },

    /**
     * Vérifie si tout est chargé pour activer l'UI
     */
    _checkInit(callback) {
        if (gapiInited && gisInited) {
            // Tenter de restaurer une session (si le token est encore valide en mémoire/sessionStorage)
            // Note: Google Identity Services v2 ne persiste pas le token automatiquement comme v1.
            // On considère l'utilisateur déconnecté au refresh par sécurité, ou on gère le token stocké.
            // Pour ce MVP, on demande la connexion explicite.
            if (callback) callback(true);
        }
    },

    /**
     * Lance la pop-up de connexion Google
     */
    signIn(onSuccess) {
        if (!tokenClient) return;

        // Callback temporaire pour cette demande de token
        tokenClient.callback = async (resp) => {
            if (resp.error) {
                throw resp;
            }
            AuthState.isAuthenticated = true;
            if (onSuccess) onSuccess();
        };

        // Demander un token ou forcer le prompt si expiré
        tokenClient.requestAccessToken({ prompt: 'consent' });
    },

    /**
     * Déconnexion (Révoque le token et nettoie l'état)
     */
    signOut(callback) {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                gapi.client.setToken('');
                AuthState.isAuthenticated = false;
                if (callback) callback();
            });
        } else {
            AuthState.isAuthenticated = false;
            if (callback) callback();
        }
    },

    /**
     * Helper pour savoir si on peut faire des requêtes
     */
    isReady() {
        return gapiInited && gisInited && AuthState.isAuthenticated;
    }
};