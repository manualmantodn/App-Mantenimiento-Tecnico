import {
    loginUser,
    logoutUser,
    getCurrentSession,
    getPrivateImage
} from "./supabase.js";

let DATA = null;
let IMAGES = [];
const IMAGE_URL_CACHE = new Map();

const $ = s => document.querySelector(s);
const home = $("#home");
const detail = $("#detail");
const gallery = $("#gallery");

const esc = s => String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[m])
);

const show = n => {
    home.classList.toggle("hidden", n !== "home");
    detail.classList.toggle("hidden", n !== "detail");
    gallery.classList.toggle("hidden", n !== "gallery");
};

/* =========================
   IMÁGENES PRIVADAS SUPABASE
========================= */

/*
   images.json conserva rutas como:

   assets/img/image101.jpg

   Pero en Supabase las imágenes están en:

   manuales/imagenes/image101.jpg

   Esta función convierte automáticamente
   la ruta antigua en la ruta correcta.
*/

function getSupabaseImagePath(file) {

    if (!file) return null;

    const filename =
        String(file)
            .split("/")
            .pop()
            .trim();

    if (!filename) return null;

    return `imagenes/${filename}`;
}

async function getImageUrl(file) {

    if (!file) return null;

    if (IMAGE_URL_CACHE.has(file)) {
        return IMAGE_URL_CACHE.get(file);
    }

    const path = getSupabaseImagePath(file);

    if (!path) return null;

    try {

        const signedUrl =
            await getPrivateImage(path);

        if (signedUrl) {
            IMAGE_URL_CACHE.set(file, signedUrl);
            return signedUrl;
        }

    } catch (error) {

        console.warn(
            "No se pudo generar URL privada:",
            file,
            error
        );
    }

    return null;
}

async function loadPrivateImages(containerSelector) {

    const elements =
        document.querySelectorAll(
            `${containerSelector} .image-ref`
        );

    for (const el of elements) {

        const file =
            el.dataset.file;

        if (!file) continue;

        const url =
            await getImageUrl(file);

        if (!url) continue;

        const img =
            el.querySelector("img");

        if (img) {
            img.src = url;
        }

        /*
           Guardamos la URL firmada para que
           el zoom también funcione.
        */

        el.dataset.url = url;
    }
}

/* =========================
   LOGIN SUPABASE
========================= */

const overlay = $("#login-overlay");

if (overlay) {

    overlay.innerHTML = `
        <div class="login-box">

            <h2>🔐 Manuales Técnicos</h2>

            <p>
                Ingrese sus credenciales para continuar.
            </p>

            <input
                id="app-email"
                type="email"
                placeholder="Correo electrónico"
                autocomplete="username"
            >

            <input
                id="app-login-password"
                type="password"
                placeholder="Contraseña"
                autocomplete="current-password"
            >

            <button id="supabase-login-button">
                Ingresar
            </button>

            <div
                id="supabase-login-error"
                class="small"
                style="display:none;"
            >
                Correo o contraseña incorrectos.
            </div>

        </div>
    `;
}

const emailInput =
    $("#app-email");

const passwordInput =
    $("#app-login-password");

const loginButton =
    $("#supabase-login-button");

const loginError =
    $("#supabase-login-error");

async function login() {

    if (
        !emailInput ||
        !passwordInput ||
        !loginButton ||
        !loginError
    ) return;

    loginError.style.display = "none";

    loginButton.disabled = true;
    loginButton.textContent = "Ingresando...";

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    if (!email || !password) {

        loginError.textContent =
            "Complete correo y contraseña.";

        loginError.style.display =
            "block";

        loginButton.disabled =
            false;

        loginButton.textContent =
            "Ingresar";

        return;
    }

    const { error } =
        await loginUser(
            email,
            password
        );

    if (error) {

        console.error(error);

        loginError.textContent =
            "Correo o contraseña incorrectos.";

        loginError.style.display =
            "block";

        loginButton.disabled =
            false;

        loginButton.textContent =
            "Ingresar";

        return;
    }

    overlay.style.display =
        "none";

    loginButton.disabled =
        false;

    loginButton.textContent =
        "Ingresar";

    await load();
}

if (loginButton) {
    loginButton.onclick = login;
}

if (passwordInput) {

    passwordInput.onkeydown =
        e => {

            if (e.key === "Enter") {
                login();
            }

        };
}

if (emailInput) {

    emailInput.onkeydown =
        e => {

            if (e.key === "Enter") {
                login();
            }

        };
}

/* =========================
   CERRAR SESIÓN
========================= */

function addLogoutButton() {

    if (
        document.querySelector(
            "#logout-button"
        )
    ) return;

    const nav =
        document.querySelector("nav");

    if (!nav) return;

    const button =
        document.createElement("button");

    button.id =
        "logout-button";

    button.textContent =
        "🔒 Salir";

    button.className =
        "nav-button";

    button.onclick =
        async () => {

            await logoutUser();

            IMAGE_URL_CACHE.clear();

            location.reload();
        };

    nav.appendChild(button);
}

/* =========================
   PANTALLA PRINCIPAL
========================= */

function renderHome() {

    if (!DATA) return;

    show("home");

    home.innerHTML = `

        <div class="search">

            <span>⌕</span>

            <input
                id="q"
                placeholder="Buscar equipo, componente o controlador..."
                autocomplete="off"
            >

        </div>

        <div class="section">

            <h2>
                Áreas de mantenimiento
            </h2>

            ${DATA.categories.map(c => `

                <div class="category">

                    <div class="catHead">

                        <div class="catIcon">
                            ${esc(c.icon)}
                        </div>

                        <div>

                            <h3>
                                ${esc(c.name)}
                            </h3>

                            <p>
                                ${esc(c.desc)}
                            </p>

                        </div>

                    </div>

                    <div class="chips">

                        ${c.equipment.map(e => `

                            <button
                                class="chip equipment-chip"
                                data-equipment="${esc(e)}"
                            >
                                ${esc(e)}
                            </button>

                        `).join("")}

                    </div>

                </div>

            `).join("")}

        </div>

        <div class="notice">

            <b>
                ⚠ La seguridad, ante todo
            </b>

            <br>

            Desconectar, bloquear y etiquetar
            antes de intervenir componentes eléctricos.

        </div>
    `;

    const searchInput =
        $("#q");

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            e =>
                search(e.target.value)
        );
    }

    document
        .querySelectorAll(
            ".equipment-chip"
        )
        .forEach(
            b =>
                b.addEventListener(
                    "click",
                    () =>
                        openEq(
                            b.dataset.equipment
                        )
                )
        );
}

/* =========================
   BÚSQUEDA
========================= */

function search(q) {

    q =
        q.toLowerCase().trim();

    document
        .querySelectorAll(
            ".category"
        )
        .forEach(cat => {

            let n = 0;

            cat
                .querySelectorAll(
                    ".equipment-chip"
                )
                .forEach(b => {

                    const e =
                        DATA.equipment[
                            b.dataset.equipment
                        ] || {};

                    const text = [

                        b.dataset.equipment,

                        e.brand,

                        e.category,

                        e.temp,

                        ...(e.steps || []),

                        ...(e.params || []),

                        ...(e.notes || [])

                    ]
                        .join(" ")
                        .toLowerCase();

                    const ok =
                        !q ||
                        text.includes(q);

                    b.style.display =
                        ok ? "" : "none";

                    if (ok) n++;
                });

            cat.style.display =
                n ? "" : "none";
        });
}

/* =========================
   EQUIPO
========================= */

async function openEq(name) {

    const e =
        DATA?.equipment?.[name];

    if (!e) return;

    show("detail");

    let imgs =
        IMAGES
            .filter(
                x =>
                    x.category === name ||
                    (
                        name.includes("WIND") &&
                        x.category ===
                            "Hornos Polin WIND 5"
                    )
            )
            .slice(0, 12);

    detail.innerHTML = `

        <button
            class="back"
            id="backHome"
        >
            ← Volver
        </button>

        <div class="card">

            <h2>
                ${esc(name)}
            </h2>

            <div class="meta">

                <span class="pill">
                    ${esc(e.brand || "")}
                </span>

                ${
                    e.temp
                        ? `
                            <span class="pill">
                                Rango:
                                ${esc(e.temp)}
                            </span>
                        `
                        : ""
                }

            </div>

        </div>

        <div class="card">

            <h3>
                Rutina de mantenimiento
            </h3>

            ${(e.steps || []).map((s, i) => `

                <div class="step">

                    <div class="num">
                        ${i + 1}
                    </div>

                    <div>
                        ${esc(s)}
                    </div>

                </div>

            `).join("")}

        </div>

        ${
            e.params?.length
                ? `

                    <div class="card">

                        <h3>
                            Parámetros y referencias
                        </h3>

                        <table class="table">

                            ${e.params.map(p => `

                                <tr>
                                    <td>
                                        ${esc(p)}
                                    </td>
                                </tr>

                            `).join("")}

                        </table>

                    </div>

                `
                : ""
        }

        ${
            e.notes?.length
                ? `

                    <div class="card">

                        <h3>
                            Notas importantes
                        </h3>

                        ${e.notes.map(n => `

                            <p class="small">
                                • ${esc(n)}
                            </p>

                        `).join("")}

                    </div>

                `
                : ""
        }

        ${
            imgs.length
                ? `

                    <div class="card">

                        <h3>
                            Imágenes de referencia
                        </h3>

                        <div
                            class="galleryGrid"
                            id="equipment-images"
                        >

                            ${imgs.map(x => `

                                <div
                                    class="galleryItem image-ref"
                                    data-file="${esc(x.file)}"
                                    data-caption="${esc(
                                        x.caption ||
                                        "Referencia técnica"
                                    )}"
                                >

                                    <img
                                        src=""
                                        loading="lazy"
                                        alt="${esc(
                                            x.caption ||
                                            "Referencia técnica"
                                        )}"
                                    >

                                    <p>
                                        ${esc(
                                            x.caption ||
                                            "Referencia técnica"
                                        )}
                                    </p>

                                </div>

                            `).join("")}

                        </div>

                    </div>

                `
                : ""
        }
    `;

    const backHome =
        $("#backHome");

    if (backHome) {
        backHome.onclick =
            renderHome;
    }

    document
        .querySelectorAll(
            "#equipment-images .image-ref"
        )
        .forEach(
            el =>
                el.onclick =
                    async () => {

                        const url =
                            el.dataset.url ||
                            await getImageUrl(
                                el.dataset.file
                            );

                        if (url) {

                            zoom(
                                url,
                                el.dataset.caption
                            );
                        }
                    }
        );

    window.scrollTo(
        0,
        0
    );

    await loadPrivateImages(
        "#equipment-images"
    );
}

/* =========================
   GALERÍA
========================= */

async function renderGallery(
    filter = "Todas"
) {

    show("gallery");

    const cats = [

        "Todas",

        ...new Set(
            IMAGES
                .map(x => x.category)
                .filter(Boolean)
        )

    ];

    const list =
        filter === "Todas"
            ? IMAGES
            : IMAGES.filter(
                x =>
                    x.category === filter
            );

    gallery.innerHTML = `

        <div class="section">

            <h2>
                Galería técnica
            </h2>

            <p class="small">
                Imágenes organizadas para
                consulta en campo.
            </p>

        </div>

        ${
            IMAGES.length
                ? `

                    <div class="filterRow">

                        ${cats.map(c => `

                            <button
                                class="chip gallery-filter"
                                data-filter="${esc(c)}"
                            >
                                ${esc(c)}
                            </button>

                        `).join("")}

                    </div>

                    <div class="galleryGrid">

                        ${list.map(x => `

                            <div
                                class="galleryItem image-ref"
                                data-file="${esc(x.file)}"
                                data-caption="${esc(
                                    x.caption ||
                                    "Referencia técnica"
                                )}"
                            >

                                <img
                                    src=""
                                    loading="lazy"
                                    alt="${esc(
                                        x.caption ||
                                        "Referencia técnica"
                                    )}"
                                >

                                <p>
                                    ${esc(
                                        x.category ||
                                        "Referencia técnica"
                                    )}
                                </p>

                            </div>

                        `).join("")}

                    </div>

                `
                : `

                    <div class="notice">

                        La galería no está disponible todavía.

                        La información de mantenimiento
                        continúa funcionando.

                    </div>

                `
        }
    `;

    document
        .querySelectorAll(
            ".gallery-filter"
        )
        .forEach(
            b =>
                b.onclick =
                    () =>
                        renderGallery(
                            b.dataset.filter
                        )
        );

    document
        .querySelectorAll(
            ".galleryGrid .image-ref"
        )
        .forEach(
            el =>
                el.onclick =
                    async () => {

                        const url =
                            el.dataset.url ||
                            await getImageUrl(
                                el.dataset.file
                            );

                        if (url) {

                            zoom(
                                url,
                                el.dataset.caption
                            );
                        }
                    }
        );

    await loadPrivateImages(
        ".galleryGrid"
    );
}

/* =========================
   ZOOM
========================= */

function zoom(
    file,
    cap
) {

    const modalImg =
        $("#modalImg");

    const modalCap =
        $("#modalCap");

    const modal =
        $("#modal");

    if (!modal) return;

    if (modalImg) {
        modalImg.src = file;
    }

    if (modalCap) {
        modalCap.textContent =
            cap || "Referencia técnica";
    }

    modal.class
