import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

export const useSql = () => {
    return useMutation({
        mutationFn: async (query: string) => {
            return api.executeQuery(query);
        }
    })
}
