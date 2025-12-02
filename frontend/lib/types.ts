interface User {
    id: string;
    email: string;
    role: string;
}

interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
    updated_at: string;
}

export type { User, Profile };