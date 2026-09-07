import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const { url, key } = window.SUPABASE_CONFIG;

export const supabase = createClient(url, key, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

export async function loginUser(email, password) {
    return await supabase.auth.signInWithPassword({
        email,
        password
    });
}

export async function logoutUser() {
    return await supabase.auth.signOut();
}

export async function getCurrentSession() {
    return await supabase.auth.getSession();
}

export async function getPrivateImage(path) {
    const { data, error } = await supabase.storage
        .from("manuales")
        .createSignedUrl(path, 3600);

    if (error) {
        console.error("Error creando URL:", error);
        return null;
    }

    return data.signedUrl;
}

export async function listEquipmentImages(folder) {
    const { data, error } = await supabase.storage
        .from("manuales")
        .list(folder, {
            limit: 1000,
            sortBy: {
                column: "name",
                order: "asc"
            }
        });

    if (error) {
        console.error("Error listando imágenes:", error);
        return [];
    }

    return data || [];
}
