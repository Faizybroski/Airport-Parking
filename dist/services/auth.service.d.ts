import { IAdmin } from "../models/Admin";
declare class AuthService {
    /**
     * Admin login
     */
    login(email: string, password: string): Promise<{
        token: string;
        admin: Partial<IAdmin>;
    }>;
    /**
     * Get admin by ID
     */
    getAdminById(id: string): Promise<IAdmin | null>;
}
export declare const authService: AuthService;
export {};
//# sourceMappingURL=auth.service.d.ts.map