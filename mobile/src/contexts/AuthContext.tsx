import { createContext, ReactNode, useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { api } from '../services/api';

WebBrowser.maybeCompleteAuthSession();

interface UserProps {
    name: string;
    avatarUrl: string;
}

export interface AuthContextDataProps {
    user: UserProps;
    isUserLoading: boolean;
    signIn: () => Promise<void>;
}

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthContext = createContext({} as AuthContextDataProps);

export function AuthContextProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<UserProps>({} as UserProps);
    const [isUserLoading, setIsUserLoading ] = useState(false);

    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: process.env.CLIENT_ID,
        redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
        scopes: ['profile', 'email']
    })

    // console.log(AuthSession.makeRedirectUri({ useProxy: true }));

    async function signIn() {
        try {
            setIsUserLoading(true);
            await promptAsync();
        } catch (error) {
            console.log(error, '(AuthContextProvider)', '(signIn)');
            throw error;
        } finally {
            setIsUserLoading(false);
        }

        // console.log('Vamos logar!', '(AuthContextProvider)', '(signIn)');
    }

    async function signInWithGoogle(access_token: string) {
        try {
            setIsUserLoading(true);

            const tokenResponse = await api.post('/users', { access_token });
            api.defaults.headers.common['Authorization'] = `Bearer ${tokenResponse.data.token}`;
            // console.log(tokenResponse.data);

            const userInfoResponse = await api.get('/me');
            setUser(userInfoResponse.data.user);
            // console.log(userInfoResponse.data);

        } catch (error) {
            console.log(error, '(AuthContextProvider)', '(signInWithGoogle)');
            throw error;
            
        } finally {
            setIsUserLoading(false);
        }

        // console.log("TOKEN DE AUTENTICAÇÃO ===>", access_token, '(AuthContextProvider)', '(signInWithGoogle)');
    }

    useEffect(() => {
        if (response?.type === 'success' && response.authentication?.accessToken) {
            signInWithGoogle(response.authentication.accessToken)
        }
    },[response]);

    return (
        <AuthContext.Provider value={{
            signIn,
            isUserLoading,
            user,
        }}>
            {children}
        </AuthContext.Provider>
    )
}