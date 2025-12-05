/**
 * js/auth.js
 * Gestion de l'authentification
 */
import { Config } from './config.js';

// Scopes : 
// - drive.file : Créer/Éditer des fichiers
// - drive.metadata.readonly : Parcourir l'arborescence des dossiers pour choisir une destination
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

let tokenClient;
let gapiInited = false;
let gisInited = false;

export const AuthState = {
    isAuthenticated: false,
    user: null
};

export const Auth = {
    async init(callback) {
        const config = Config.get();
        if (!config || !config.apiKey || !config.clientId) return;

        gapi.load('client', async () => {
            await gapi.client.init({
                apiKey: config.apiKey,
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            this._checkInit(callback);
        });

        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: config.clientId,
            scope: SCOPES,
            callback: '', 
        });
        gisInited = true;
        this._checkInit(callback);
    },

    _checkInit(callback) {
        if (gapiInited && gisInited && callback) callback(true);
    },

    signIn(onSuccess) {
        if (!tokenClient) return;
        tokenClient.callback = async (resp) => {
            if (resp.error) throw resp;
            AuthState.isAuthenticated = true;
            if (onSuccess) onSuccess();
        };
        tokenClient.requestAccessToken({ prompt: 'consent' });
    },

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

    isReady() {
        return gapiInited && gisInited && AuthState.isAuthenticated;
    }
};